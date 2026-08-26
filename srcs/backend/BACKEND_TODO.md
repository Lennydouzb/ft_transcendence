# Front/back contract — status and expectations

This file documents what the **frontend** (`srcs/frontend`) assumes/expects from the **backend** for each in-progress feature (Discord-style dashboard: friends list, 1-to-1 chat, button mini-game). Goal: so the backend dev (or a future Claude session) can see at a glance what's left to do/fix for the frontend to actually work, without having to reread the whole conversation that led to these choices.

To be updated as items get resolved (check them off, or delete the section once fully stabilized).

For the narrative detail (symptom → cause → fix → takeaway) of each backend bug listed here, see `BACKEND_CHANGES.md`. This file stays the up-to-date, quick-to-scan contract; the other one explains the why.

---

## 1. WebSocket — general protocol

The frontend connects directly to `ws://localhost:8080` (bypassing the nginx `/ws/` proxy, just like `app/api/api.ts` already does for REST). Each message is JSON `{ action: string, ...payload }`. The frontend routes each incoming message to subscribers based on the `action` field — so **any new WS feature must have a unique, stable `action` name**, documented here.

- [x] **Fix applied by the frontend**: `server.js` line ~439, `ws.on('message', (message) => { const args = JSON.parse(mesage); ... })` → `mesage` was a typo (undefined variable), fixed to `message`. This is fixed, but keep it in mind if you touch this block again.
- [x] **Much more serious bug found and fixed**: `ws.on('message', ...)` and `ws.on('close', ...)` were declared **outside** the `ws.on('connection', (ws) => {...})` block, so attached to the `WebSocketServer` object (the server) rather than a specific client connection. But the `ws` library **never** emits a `'message'` event on the server object — only on each individual connection. Consequence: `getActions[args.action](ws, args)` was **never called, for anyone, ever** — `auth`, `msg`, `ppChange`, `click`, `disconnect` never did anything in practice, silently (no error, just zero effect). `sessionsUsers` stayed permanently empty. This is what made it look like the mini-game was just "not wired up yet", when in reality **no WebSocket action worked at all**, including `auth` itself. Verified with an isolated Node script (connection + `auth` + listening for 20s: zero response before the fix, immediate responses after). Fix: the `message`/`close` listeners are now attached to the individual connection (`socket`), inside `ws.on('connection', (socket) => {...})`.
- Handshake expected by the frontend: when the socket opens, it immediately sends `{ action: "auth", token: "Bearer <jwt>" }`. This matches `manageAuth` in `ws/actions.js` as it already exists. Nothing to do here, just a contract confirmation.

---

## 2. Chat (1-to-1 messages)

### History on load — `POST /api/getConvos`

- [x] **Blocking bug resolved**: the route now correctly returns the rows (`res.status(200).json({success: true, convos: rows})`).
- [x] **Ambiguity resolved**: the query now also selects `tr_Message.idUser as senderId` (the actual sender), in addition to `tr_Chat.idUser`/`idUser_1` (the two constant participants of the thread, useful for computing `otherUserId` on the frontend):
  ```sql
  select tr_Message.idMessage, content, sendDate, tr_Message.idUser as senderId, tr_Chat.idUser, tr_Chat.idUser_1
  from tr_Message join tr_Chat on tr_Message.idMessage = tr_Chat.idMessage
  where tr_Chat.idUser = ? or tr_Chat.idUser_1 = ?
  ```
- **Actual response format**: `{ "success": true, "convos": [{ "idMessage", "content", "sendDate", "senderId", "idUser", "idUser_1" }] }` — key `convos` (not `messages` as initially proposed, to stay aligned with what the code was already returning).
- [x] **Frontend wiring done**: `fetchGetConvos` (`api.ts`) + grouping by conversation in `ChatContext.tsx` (see `srcs/frontend/FRONTEND_CHANGES.md` §18). History loads on connect.

### Live messages — WS action `msg`

Already working on the backend side (`manageMsg` in `ws/actions.js`) and already wired on the frontend (`ChatContext.tsx`). Current contract, **which the frontend relies on as-is**:

- Emission (frontend → backend): `{ action: "msg", idUser: <recipientId>, message: <content> }`.
- Reception (backend → frontend): `{ action: "msg", message, idUser: <senderId>, name: <senderName> }`, sent **only to the recipient** (no echo to the sender).
- **The frontend relies on this**: since there's no echo, `ChatContext.sendMessage()` appends the message locally "optimistically" as soon as it's sent, without waiting for server confirmation. **If this behavior changes (e.g. adding an ACK or an echo to the sender), the frontend will need to be notified** to avoid duplicate messages.
- [ ] **Desirable improvement, non-blocking**: the `msg` payload doesn't contain a `sendDate`. The frontend timestamps client-side (approximate). If possible, add `sendDate` (server-generated) to the broadcast payload.

---

## 3. Friends

- [x] **`/api/friends` implemented and wired**, but as `POST` (not `GET` as initially proposed) — the frontend (`fetchFriends` in `api.ts`) was aligned to match. Response: `{ "success": true, "friends": [{ "idUser", "name", "mail", "profilePicture", "scoreTotal" }] } }`.
- [x] **`POST /api/addFriend`** implemented and wired (`FriendSearchBar.tsx`), matching the proposed contract.
- [x] **`DELETE /api/removeFriend`** implemented and wired (`FriendsList.tsx`/`FriendListItem.tsx`) — wasn't even in the initial list, added along the way.
- [x] Search correctly uses `GET /api/users` on the frontend, with client-side filtering (self + already-added friends excluded from results).
- [ ] **Missing real-time broadcast**: if "A" removes "B" from their list, "B" doesn't learn about it live (no WS broadcast on friendship removal, unlike `ppChange`). The frontend handles the degraded case (silent 404 if the action arrives after the fact), but a real broadcast would be cleaner — **to be done on the backend**.
- [x] Previous side note was inaccurate: `/api/getUser` is actually already declared as `POST` in `server.js` (not `GET` as noted here before) — no body concern on GET. The frontend now uses it (`fetchGetUser` in `api.ts`) for the profile page and the score ranking.

---

## 4. Profile pictures — resolved

- [x] `app.use('/uploads', express.static(path.join(__dirname, 'uploads')))` added in `server.js`. Avatars display correctly via `http://localhost:8080/uploads/<profilePicture>`, including from the new frontend profile page (`app/profile/page.tsx`) which now drives upload/deletion.

---

## 5. Button mini-game (click to score a point) — resolved

Rule validated with the PO: the backend decides at random intervals to spawn a button (the frontend itself picks a random position on screen), **only the first click scores the point**, then the button must disappear for everyone.

- [x] Syntax bugs already fixed in a previous commit (the file loaded normally).
- [x] **Reference bug fixed**: `manageClick` was declared `async (wa, args)` but used `ws` (undefined) in its body → `ReferenceError` on every click. Parameter renamed to `ws`, consistent with the other handlers in the file.
- [x] **Spawn logic added**: `startRandomRenderLoop` now sets `gameActive` to `1` and broadcasts `{ action: "spawn" }` on each cycle (instead of returning `render` without ever touching `gameActive`).
- [x] **"First click wins" made atomic**: `manageClick` sets `gameActive` back to `0` **before** the `await` on the database, as soon as the click is accepted.
- [x] **Disappearance broadcast**: renamed `unrender` → `gone`, sent both by the spawn loop (button expired) and by `manageClick` (button won), to exactly match what `GameContext.tsx` already listens for on the frontend.
- [x] **Score**: kept at `+100` (confirmed decision, the "1 point" from the brief wasn't meant literally).
- [x] **Additional bug found while testing**: the query `update tr_User set scoreTotal = scoreTotal + 100 where idUser = ? returning scoreTotal` consistently failed — **MariaDB doesn't support `UPDATE ... RETURNING`** (unlike PostgreSQL; MariaDB only has it for `INSERT`/`DELETE`). The winning click therefore always fell into the `catch`, returned `"The database didn't want you to win"`, and the score was **never** incremented in the database — invisible in the UI since the button disappeared anyway (`gone` is independent of the result). Replaced with an `UPDATE` followed by a separate `SELECT`. Verified: `scoreTotal` now increments correctly in the database.
- [x] **`action` field added** to all `manageClick` responses (`{ action: "clickResult", success, scoreTotal }` or `{ action: "clickResult", success: false, message }`) — without it, the frontend couldn't route any response.

The WS contract already coded on the frontend (`GameContext.tsx`) is now respected end-to-end: `spawn` → display, `click` → `clickResult` (+ `ScoreDisplay` update), `gone` → disappearance for everyone.

---

## 6. Summary — current state

Everything listed in this file is resolved and verified under real conditions (mini-game, live chat, friends, avatars, profile page, score page). The `tr_Message` schema (missing `idUser` column despite the `FOREIGN KEY`, in `docker/mariadb/tools/start.sh`) was also fixed along the way — not directly related to this contract but blocking everything else until it was resolved.

Only one item remains, non-blocking for normal app usage:

1. **WS broadcast on friendship removal** (section 3) — to be done on the backend.
