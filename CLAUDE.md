# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ft_transcendence (42 school project): a web app with user accounts, chat, friends, and a click-to-score mini-game. Stack: Next.js frontend, a raw Express + `ws` backend, MariaDB, all reverse-proxied through nginx over TLS. Everything runs in Docker Compose; there is no way to run backend/db services outside containers since the backend always connects to a `mariadb` hostname.

## Running the project

```bash
make          # mkdir -p data dir + docker compose up -d (uses ./docker/docker-compose.yml)
make stop     # docker compose down
make clean    # stop + rm -rf the bind-mounted data dir
make fclean   # clean + docker system prune -af
make re       # fclean + all
make back     # restart just the backend container (pick up server.js/ws changes)
```

The compose file requires `docker/.env` (not committed — copy `docker/example_env` to `docker/.env` and fill in `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SECRET`, `API_TOKEN`). The Makefile's `ORIGIN`/`LOGIN` variables point at a 42-cluster-style home directory (`/home/$(LOGIN)/data`) for the MariaDB bind mount — edit `LOGIN` at the top of the Makefile for local dev.

Services (see `docker/docker-compose.yml`):
- `nginx` — TLS termination on `:443`, routes `/` → frontend:3000, `/api/` and `/ws/` → backend:8080 (`docker/nginx/conf/nginx.conf`)
- `frontend` — Next.js dev server on `:3000`, source bind-mounted from `srcs/frontend` (live reload)
- `backend` — Express/ws server on `:8080`, source bind-mounted from `srcs/backend` (restart container — `make back` — to pick up changes; no watch script)
- `mariadb` — schema is created imperatively by `docker/mariadb/tools/start.sh` on container start (not via migration files — edit that script to change the schema, then `make clean && make` to recreate the volume)

Frontend calls the backend directly at `http://localhost:8080` — REST via `http://localhost:8080/api` (`srcs/frontend/app/api/api.ts`) and WebSocket via `ws://localhost:8080` (`srcs/frontend/app/context/WebSocketContext.tsx`) — bypassing the nginx `/api/` and `/ws/` proxies entirely. Keep this in mind when changing ports/routing.

## Frontend (`srcs/frontend`)

Next.js (App Router) + TypeScript + Tailwind v4. Standard npm scripts, run inside the `frontend` container or locally with Node:

```bash
npm run dev     # next dev
npm run build   # next build
npm run start   # next start
npm run lint    # eslint
```

No test runner is configured.

### Context/provider stack

`app/layout.tsx` nests four client-side context providers around every page, in this order (each depends on the one before it): `AuthProvider` → `WebSocketProvider` → `ChatProvider` → `GameProvider`.

- `app/context/AuthContext.tsx` (`useAuth()`) — JWT stored in `localStorage` under key `token`; decodes the JWT client-side (no server round-trip) to populate `user`/`isAuthenticated` and to check expiry on load.
- `app/context/WebSocketContext.tsx` (`useWebSocket()`) — owns the single `WebSocket` connection, opened only when `isAuthenticated`; sends `{ action: 'auth', token }` on open per the backend handshake. Exposes `sendAction(action, payload)` and `subscribe(action, listener)` — a pub/sub keyed by the incoming message's `action` field. `ChatContext` and `GameContext` are both built on top of this rather than touching the socket directly.
- `app/context/ChatContext.tsx` (`useChat()`) — per-friend message lists keyed by `idUser`. Since the backend does **not** echo a sent `msg` back to the sender, `sendMessage()` appends the outgoing message to local state optimistically at send time.
- `app/context/GameContext.tsx` (`useGame()`) — click-to-score mini-game state (button visibility/position/score). Subscribes to `spawn`/`gone`/`clickResult` — see "Known rough edges", this currently does not match what the backend emits.
- `app/api/api.ts` — single module wrapping all backend REST calls through one `callBackend()` fetch helper; add new endpoints here rather than calling `fetch` ad hoc from components. Several exported functions (`fetchGames`, `fetchProjects`, `fetchParticipants`, `fetchUserGames`, `fetchGameProjects`, `fetchCreateProject`) target backend routes that don't exist in `server.js` — leftover from an earlier concept, not called from any current page.
- `app/{page,login,register,dashboard}/page.tsx` — route pages; `dashboard/page.tsx` redirects to `/login` if not authenticated and otherwise renders `components/DashboardLayout.tsx`, which composes the friends list, chat window, and the mini-game button/score display.

`srcs/frontend/CLAUDE.md` pulls in `AGENTS.md`, which warns that this repo's Next.js version may diverge from training data — check `node_modules/next/dist/docs/` for API/convention changes before relying on prior Next.js knowledge.

## Backend (`srcs/backend`)

Single-file Express app (`server.js`) plus a WebSocket server sharing the same HTTP server, and `ws/actions.js` for WS message handlers. No router modules, no ORM — all SQL is written inline with the `mariadb` pool (`pool.getConnection()` / `conn.query()` with `?` placeholders, always released in `finally`). `server.js` and `ws/actions.js` each create their own `mariadb.createPool(...)` independently.

Auth pattern used by every protected REST route: read `Authorization: Bearer <token>` header, verify with `jwt.verify(token, process.env.SECRET)`, distinguish `TokenExpiredError` (401) from other failures (403). New protected endpoints should follow this exact pattern for consistency (there is no shared middleware for it yet — it's duplicated per-route).

WebSocket protocol: clients send JSON `{ action, ...args }`; `getActions` in `ws/actions.js` maps action names to handlers: `auth`, `msg`, `ppChange`, `click`, `disconnect`. A client must send `auth` with its JWT (`{ action: 'auth', token: 'Bearer <jwt>' }`) before other actions resolve to a user — identity is tracked in two in-memory `Map`s (`sessionsUsers: ws -> user`, `sessionsUsersId: idUser -> ws`) populated by `manageAuth`. State is process-local (no pub/sub), so this won't work if the backend is ever scaled to multiple instances. The server also pushes actions the client never explicitly requested: `leave` (broadcast on disconnect), `ppChange` (broadcast on profile-picture change), and `render`/`unrender` (broadcast on a random interval by `startRandomRenderLoop`, meant to drive the mini-game).

Database schema (MariaDB, created by `docker/mariadb/tools/start.sh`, prefix `tr_`):
- `tr_User(idUser, name, mail, password, profilePicture, scoreTotal)`
- `tr_Message(idMessage, content, sendDate, idUser)` — **note:** `start.sh`'s `CREATE TABLE tr_Message` declares a `FOREIGN KEY(idUser)` but never declares an `idUser` column, which will make table creation fail on a fresh volume. Verify against `make clean && make` before assuming the DB comes up clean.
- `tr_Friend(idUser, idUser_1)`
- `tr_Chat(idUser, idUser_1, idMessage)` — links a message to the two participants of a conversation

To change the schema, edit `start.sh` and recreate the DB container/volume (`make clean && make`) — there is no migration tooling.

### Contract doc

`srcs/backend/BACKEND_TODO.md` (French) is a living checklist of frontend/backend contract gaps — which REST/WS payloads the frontend already assumes vs. what the backend currently returns. Check it before changing any endpoint or WS action shape; update it once a listed gap is closed.

### Known rough edges to be aware of when touching this code

- `ws/actions.js`'s `manageClick` is declared `async (wa, args) => {...}` but its body references a bare `ws` (undefined in that module's scope) instead of its own `wa` parameter — sending a `click` action throws a `ReferenceError` on the backend today.
- Mini-game action-name mismatch: the backend's `startRandomRenderLoop` broadcasts `render`/`unrender`, and `manageClick`'s success response has no `action` field at all, but the frontend's `GameContext.tsx` listens for `spawn`, `gone`, and `clickResult`. The mini-game is not wired end-to-end in either direction right now (see `BACKEND_TODO.md` §5 for the full list of fixes needed).
- `GET /api/getUser` reads `idUser` from `req.body` on a GET request — not reliably sent by `fetch()`/browsers. Not currently called by the frontend, but fix before relying on it.
- `server.js` has a dangling top-level `const args = server.listen(...)` — the return value is bound to an unused `args`, shadowing nothing important but easy to misread as related to the WS `args` variable in the message handler.
