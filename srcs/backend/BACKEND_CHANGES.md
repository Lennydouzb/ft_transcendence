# Session journal — backend

Following on from `srcs/frontend/FRONTEND_CHANGES.md`, same principle: for each change, the observed symptom, the actual cause, the fix, and the general concept to remember. These changes were made after the frontend session (see the other file for what came before), once the frontend bugs were resolved and the decision was made to tackle the backend directly.

Also see `BACKEND_TODO.md` — the front/back contract, kept up to date as things progress. This file tells the "why", `BACKEND_TODO.md` gives the current state item by item.

---

## 1. The most important bug: no WebSocket action was ever processed

### Symptom
The mini-game never triggered (no button, ever). Tested by isolating the WebSocket with a Node script (without going through the browser): a connection + an `auth` message sent, **no response within 20 seconds**, not even an error.

### Cause
In `server.js`:
```js
ws.on('connection', (ws) => {          // this local `ws` only lives inside this block
	ws.send(JSON.stringify({message:"Connected successfully"}));
});
ws.on('message', (message) => {        // attached to the outer `ws`: the SERVER, not a client
	...
	getActions[args.action](ws, args);
	...
})
```
`const ws = new websocket.Server({server})`, at the very top of the file, refers to **the WebSocket server** (the one that accepts connections), not a specific connection. Inside `ws.on('connection', (ws) => {...})`, the `ws` parameter deliberately shadows the outer one to refer to **a given client connection** — but only within that block's braces.

`ws.on('message', ...)` and `ws.on('close', ...)` were declared **outside** this block, so attached to the server. But the `ws` library **never** emits a `'message'` event on the server object — only on each individual connection. Verified with a minimal isolated test (a toy `ws` server, a client sending a message): the `wss.on('message', ...)` listener never fires, only `socket.on('message', ...)` (inside `connection`) receives anything.

Consequence: `getActions[args.action](ws, args)` — the line that routes to `manageAuth`, `manageMsg`, `manageClick`, `managePpChange` — was **never called, for anyone**, silently, without the slightest error. `sessionsUsers` stayed permanently empty. The chat "seemed" to work during earlier testing only because `ChatContext` displays the message optimistically on the sender's side, without waiting for server confirmation — actual reception on a second account had never been verified.

### Fix
```js
ws.on('connection', (socket) => {
	socket.send(JSON.stringify({message:"Connected successfully"}));

	socket.on('message', (message) => {
		try {
			const args = JSON.parse(message);
			if (args.action && getActions[args.action])
				getActions[args.action](socket, args);
			else
				socket.send(JSON.stringify({ error: "action doesn't exist" }));
		} catch (err) {
			socket.send(JSON.stringify({ error: "Invalid message format" }));
		}
	});

	socket.on('close', () => {
		manageDisconnect(socket);
	});
});

server.listen(PORT, () => {
	console.log("Server is launched");
	startRandomRenderLoop();
});
```
Everything moved inside `connection`, with the parameter renamed to `socket` (instead of reusing `ws`) to make the scope explicit and avoid any confusing shadowing. In passing, removed `const args = server.listen(...)` — a dead assignment that was lingering there (the return value of `.listen()` was never used), already flagged as a confusing point during the first pass over this file.

### Takeaway
- **A variable declared as a callback parameter only exists inside that callback.** `ws.on('connection', (ws) => {...})` only redefines `ws` for that specific block — outside it, `ws` still refers to whatever it referred to before.
- **An event listener attached to the wrong object produces no error at all.** It registers successfully, it just never fires. This is the worst kind of bug to detect by reading the code alone — it has to be tested by isolating the suspect part (here, a minimal WS client, no browser or React) to objectively observe what happens.
- **Before suspecting a function's business logic, verify it's actually being called.** The mini-game was first suspected to be broken because of `gameActive`/`manageClick` (real bugs, also fixed, see below) — but as long as this routing bug wasn't fixed, none of those fixes would have had any visible effect, since `manageClick` was never reached.

---

## 2. `manageClick`: wrong parameter name

### Symptom
Once the routing bug was fixed (section 1), the first click test revealed a second bug right underneath it.

### Cause
```js
const manageClick = async (wa, args) =>
{
	...
	if (sessionsUsers.has(ws))   // `ws` doesn't exist anywhere in this function — only `wa` is declared
	{
		...
```
The parameter was named `wa` (probably a typo for `ws`), but the function body used `ws` — undefined in this scope. Result: `ReferenceError` at runtime, on every click attempt.

### Fix
Parameter renamed `wa` → `ws`, consistent with all the other handlers in the file (`manageAuth`, `manageMsg`, etc., which all take `(ws, args)`).

### Takeaway
- A parameter name that doesn't match anything in the function body doesn't break anything at declaration time (JavaScript doesn't check this statically) — the error only appears at runtime, on the first actual call.

---

## 3. The mini-game had no coherent "spawn"/"disappear" logic

### Symptom
Even with the two bugs above fixed, nothing actually made the button clickable.

### Cause
- `gameActive` was never set to `1`: `startRandomRenderLoop` broadcast `unrender` then `render` at random intervals, but never touched this variable — so `if (gameActive == 1)` in `manageClick` was never true.
- No atomic "first click wins" lock: nothing set `gameActive` back to `0` inside `manageClick`, so even once the variable was activated, several near-simultaneous clicks could all pass the check before any of them closed it.
- Action name mismatch: the backend sent `render`/`unrender`, the frontend (`GameContext.tsx`, already written) listened for `spawn`/`gone`/`clickResult`.
- `manageClick`'s responses had no `action` field — without it, the frontend's routing system (`WebSocketContext.tsx`, which only dispatches messages with a recognized `action`) silently ignored them.

### Fix
```js
// startRandomRenderLoop
setTimeout(() => {
	gameActive = 0;
	for (const anUser of sessionsUsers.values())
		anUser.ws.send(JSON.stringify({ action: "gone" }));

	gameActive = 1;
	for (const anUser of sessionsUsers.values())
		anUser.ws.send(JSON.stringify({ action: "spawn" }));

	startRandomRenderLoop();
}, randomDelay);

// manageClick
if (gameActive != 1) {
	ws.send(JSON.stringify({action: "clickResult", success: false, message: "Missed"}));
	return;
}
gameActive = 0;   // consumed before any `await`: the first click to arrive here wins
for (const anUser of sessionsUsers.values())
	anUser.ws.send(JSON.stringify({ action: "gone" }));
// ... then the score update, with `action: "clickResult"` on every response
```

### Takeaway
- **"First click wins" is a concurrency question, not just a logic one.** The lock (`gameActive = 0`) must be set synchronously, before the first asynchronous operation (`await`) — otherwise two requests that arrive nearly at the same time could both read `gameActive == 1` before either has had time to set it back to `0`.
- **The WS action naming contract is bidirectional and must match exactly, character for character, on both sides** — `render` and `spawn` are functionally the same idea, but a frontend listening for one will never hear the other.
- Tested with two simulated WS clients (a Node script, not the browser) clicking one after the other: the first gets `clickResult success:true`, the second `success:false, message:"Missed"` — confirms the lock works under real contention, not just in theory.

---

## 4. `UPDATE ... RETURNING` doesn't exist in MariaDB

### Symptom
The mini-game seemed to work (button, click, disappearance) but **the score never incremented**, neither in the UI nor in the database.

### Cause
```js
const sqlQuery = "update tr_User set scoreTotal = scoreTotal + 100 where idUser = ? returning scoreTotal";
const rows = await conn.query(sqlQuery, [jwtDecoded.idUser]);
```
`RETURNING` after an `UPDATE` is **PostgreSQL** syntax. MariaDB only supports it for `INSERT` and `DELETE`, not for `UPDATE` — every attempt failed with a SQL syntax error (`ER_PARSE_ERROR`), silently swallowed by `manageClick`'s `catch`, which returned `"The database didn't want you to win"`. The button disappeared anyway (the `gone` broadcast is independent of the query result), giving the misleading illusion that "it works".

Confirmed by reading the container logs (`docker logs backend`) then querying the table directly (`scoreTotal` at `0` for everyone despite several apparent winning clicks).

### Fix
Two separate queries instead of one with `RETURNING`:
```js
await conn.query("update tr_User set scoreTotal = scoreTotal + 100 where idUser = ?", [jwtDecoded.idUser]);
const rows = await conn.query("select scoreTotal from tr_User where idUser = ?", [jwtDecoded.idUser]);
```

### Takeaway
- **SQL syntax valid on one engine isn't necessarily valid on another**, even for features that seem "standard" (`RETURNING` exists on PostgreSQL, SQLite ≥ 3.35, MariaDB ≥ 10.5 for `INSERT`/`DELETE` — but not `UPDATE` on MariaDB as of today).
- **A `catch` that swallows the error without surfacing it clearly can hide a bug for a long time** if the rest of the flow (here, the button disappearing) keeps giving the illusion that everything's fine. The reflex that caught this: comparing the actual state in the database (`SELECT scoreTotal FROM tr_User`) to what the UI displayed, rather than trusting the appearance of success.
- `docker logs <container>` remains the first reflex when facing silently incorrect backend behavior — the full SQL error was there, with the faulty query quoted verbatim.

---

## 5. `getConvos`: wrong sender selected

### Symptom
Flagged in `BACKEND_TODO.md`: impossible for the frontend to know who wrote what in a conversation's history.

### Cause
```sql
select tr_Message.idMessage, content, sendDate, tr_Chat.idUser, tr_Chat.idUser_1
from tr_Message join tr_Chat on tr_Message.idMessage = tr_Chat.idMessage
where tr_Chat.idUser = ? or tr_Chat.idUser_1 = ?
```
This query selects `tr_Chat.idUser`/`idUser_1` — the two **constant** participants of the entire conversation — but never `tr_Message.idUser`, the **actual** sender of this specific message.

### Fix
```sql
select tr_Message.idMessage, content, sendDate, tr_Message.idUser as senderId, tr_Chat.idUser, tr_Chat.idUser_1
from tr_Message join tr_Chat on tr_Message.idMessage = tr_Chat.idMessage
where tr_Chat.idUser = ? or tr_Chat.idUser_1 = ?
```
Response: `{ success: true, convos: [...] }` with a `senderId` per message in addition to the thread's two participants (useful for computing `otherUserId` on the frontend = the key used to group by conversation).

**Still to do, on the frontend side this time**: nothing calls this route yet (`fetchGetConvos` doesn't exist in `api.ts`, `ChatContext.setHistory` is never invoked) — the data is now correct, only the wiring is missing.

### Takeaway
- In a junction table (`tr_Chat`) that links two fixed entities, don't confuse the columns that identify **the relationship** (the two participants, constant) with those that identify **a specific event** of that relationship (the sender of a given message, variable).

---

## 6. Chat message too long: returned nothing at all

### Symptom
A message longer than 100 characters sent via the WebSocket vanished with no response at all, neither success nor error.

### Cause
```js
if (args.message.length > 100)
	return;
```
Silent exit, without ever informing the client.

### Fix
```js
if (args.message.length > 100) {
	ws.send(JSON.stringify({error: "message too long"}));
	return;
}
```
(The frontend already limits input to 100 characters on `ChatInput.tsx` — `maxLength` — so this case shouldn't be reachable from the normal UI anymore; this fix guards against a client that would send directly to the WebSocket without going through the form.)

### Takeaway
- Always respond on a validation `return`, even one that seems silent — otherwise there's no way for the client to distinguish "it worked" from "it was rejected".
