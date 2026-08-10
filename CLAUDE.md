# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ft_transcendence (42 school project): a Pong web app with user accounts, chat, and friends. Stack: Next.js frontend, a raw Express + `ws` backend, MariaDB, all reverse-proxied through nginx over TLS. Everything runs in Docker Compose; there is no way to run backend/db services outside containers since the backend always connects to a `mariadb` hostname.

## Running the project

```bash
make          # mkdir -p data dir + docker compose up -d (uses ./docker/docker-compose.yml)
make stop     # docker compose down
make clean    # stop + rm -rf the bind-mounted data dir
make fclean   # clean + docker system prune -af
make re       # fclean + all
```

The compose file requires `docker/.env` (not committed — copy `docker/example_env` to `docker/.env` and fill in `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SECRET`, `API_TOKEN`). The Makefile's `ORIGIN`/`LOGIN` variables point at a 42-cluster-style home directory (`/home/$(LOGIN)/data`) for the MariaDB bind mount — edit `LOGIN` at the top of the Makefile for local dev.

Services (see `docker/docker-compose.yml`):
- `nginx` — TLS termination on `:443`, routes `/` → frontend:3000, `/api/` and `/ws/` → backend:8080 (`docker/nginx/conf/nginx.conf`)
- `frontend` — Next.js dev server on `:3000`, source bind-mounted from `srcs/frontend` (live reload)
- `backend` — Express/ws server on `:8080`, source bind-mounted from `srcs/backend` (restart container to pick up changes; no watch script)
- `mariadb` — schema is created imperatively by `docker/mariadb/tools/start.sh` on container start (not via migration files — edit that script to change the schema)

Frontend currently calls the backend directly at `http://localhost:8080/api` (`srcs/frontend/app/api/api.ts`), bypassing the nginx `/api/` proxy — keep this in mind when changing ports/routing.

## Frontend (`srcs/frontend`)

Next.js (App Router) + TypeScript + Tailwind v4. Standard npm scripts, run inside the `frontend` container or locally with Node:

```bash
npm run dev     # next dev
npm run build   # next build
npm run start   # next start
npm run lint    # eslint
```

No test runner is configured.

Structure:
- `app/api/api.ts` — single module wrapping all backend calls through one `callBackend()` fetch helper; add new endpoints here rather than calling `fetch` ad hoc from components
- `app/context/AuthContext.tsx` — client-side auth state (`useAuth()`), JWT stored in `localStorage` under key `token`
- `app/{page,login,register,dashboard}/page.tsx` — route pages

`srcs/frontend/CLAUDE.md` pulls in `AGENTS.md`, which warns that this repo's Next.js version may diverge from training data — check `node_modules/next/dist/docs/` for API/convention changes before relying on prior Next.js knowledge.

## Backend (`srcs/backend`)

Single-file Express app (`server.js`) plus a WebSocket server sharing the same HTTP server, and `ws/actions.js` for WS message handlers. No router modules, no ORM — all SQL is written inline with the `mariadb` pool (`pool.getConnection()` / `conn.query()` with `?` placeholders, always released in `finally`).

Auth pattern used by every protected route: read `Authorization: Bearer <token>` header, verify with `jwt.verify(token, process.env.SECRET)`, distinguish `TokenExpiredError` (401) from other failures (403). New protected endpoints should follow this exact pattern for consistency (there is no shared middleware for it yet — it's duplicated per-route).

WebSocket protocol: clients send JSON `{ action, ...args }`; `getActions` in `ws/actions.js` maps action names (`msg`, `auth`, `disconnect`) to handlers. Per-connection identity is tracked in two in-memory `Map`s (`sessionsUsers: ws -> user`, `sessionsUsersId: idUser -> ws`) populated by the `auth` action — a client must send `auth` with its JWT before other actions resolve to a user. State is process-local (no pub/sub), so this won't work if the backend is ever scaled to multiple instances.

Database schema (MariaDB, created by `docker/mariadb/tools/start.sh`, prefix `tr_`):
- `tr_User(idUser, name, mail, password, profilePicture, scoreTotal)`
- `tr_Message(idMessage, content, sendDate, idUser)`
- `tr_Friend(idUser, idUser_1)`
- `tr_Chat(idUser, idUser_1, idMessage)` — links a message to the two participants of a conversation

To change the schema, edit `start.sh` and recreate the DB container/volume (`make clean && make`) — there is no migration tooling.

Known rough edges to be aware of when touching this file: `ws.on('message', ...)` currently references an undefined `mesage` variable (typo) and there's a dangling `const args =` after the WS handlers — both are pre-existing bugs, not intentional patterns to copy.
