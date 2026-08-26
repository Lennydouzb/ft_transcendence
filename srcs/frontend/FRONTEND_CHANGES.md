# Session journal — what we did and why

This file summarizes the changes made during this work session on the frontend, with for each: the observed problem, the actual cause, the fix applied, and the general concept to remember next time you run into a similar bug.

Context: these changes come right after Lenny merged onto the backend (`testLenny` branch). We started from `srcs/backend/BACKEND_TODO.md` (the front/back contract) to see what the merge had unblocked, broken, or left aside.

---

## 1. `app/api/api.ts` — `fetchFriends` sent the wrong HTTP method

### Symptom
The friends list (`FriendsList.tsx`) showed "Loading error" instead of loading.

### Cause
```ts
// before
export async function fetchFriends(token: string)
{
	return callBackend('/friends', {
		headers: {'Authorization': `Bearer ${token}`}
	});
}
```
No `method` was specified. But `fetch()` (and therefore `callBackend`, our wrapper in this file) defaults to `GET` when `method` isn't provided. On the backend side, the route is declared with `app.post('/api/friends', ...)` in `server.js`.

**Key point to understand**: Express doesn't do any matching across HTTP methods. `app.post('/api/friends', ...)` responds **only to POST requests** on that URL. A GET request on the same URL falls into a void and Express responds `404 Not Found` — not a 500 error, not a clear message, just "this route doesn't exist" from its point of view. That's why the error didn't point to anything obvious: the bug wasn't in the logic, it was in the **contract** between front and back (which URL + which method + which format).

### Fix
```ts
// after
export async function fetchFriends(token: string)
{
	return callBackend('/friends', {
		method: 'POST',
		headers: {'Authorization': `Bearer ${token}`}
	});
}
```

### Takeaway
- The HTTP verb (`GET`/`POST`/`PUT`/`DELETE`) is part of the route's URL just as much as the path. Change one without the other and you break everything, silently.
- To debug this kind of issue: open **DevTools → Network tab**, look at the `Method` column and the request's `Status`. A `404` on a route you know exists on the backend is 9 times out of 10 a method or path problem, not business logic.
- Ideally `/api/friends` (a simple read) should be a `GET` — that's more the REST convention. But since we're not touching the backend this time, we aligned with what actually exists rather than what would be "clean".

---

## 2. `app/page.tsx` — the home page stopped compiling entirely

### Symptom
`http://localhost:3000/` showed a Next.js build error: `Export fetchCreateGame doesn't exist in target module`. And this error stayed displayed even when navigating to `/login`.

### Cause
The old `app/page.tsx` was a quickly-thrown-together API test panel (comment `//@TODO AI GENERATED FOR TESTS PURPOSES` at the top of the file). It called `api.fetchCreateGame(...)` and `api.fetchcreateQuestions(...)`, two functions that do exist in `api.ts` but are **commented out** (disabled):
```ts
/*export async function fetchCreateGame(nameA: string, token: string) { ... }*/
```
`import * as api from './api/api'` imports the entire module; since `fetchCreateGame` isn't actually exported from it, Turbopack (Next.js's compiler) refuses to build the page — this is a static error, caught at compile time, not at runtime.

**Key point to understand**: in Next.js's App Router, each `app/**/page.tsx` file corresponds to a route. But the dev server's error overlay (the full-screen red screen) is injected globally into the browser session — once shown, it can stay visible even when changing routes as long as the build stays broken somewhere, which gives the misleading impression that "everything" is broken.

### Fix
The file wasn't useful in its current state anyway (broken, and even fixed it was just a debug tool, not a real home page). Replaced with a redirect, reusing **exactly the same pattern** that `app/dashboard/page.tsx` already used:
```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';

export default function Home() {
	const { loading, isAuthenticated } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (loading)
			return;
		router.push(isAuthenticated ? '/dashboard' : '/login');
	}, [loading, isAuthenticated, router]);

	return (
		<main className="flex min-h-screen items-center justify-center">
			<p>Loading...</p>
		</main>
	);
}
```

### Takeaway
- `useAuth()` exposes `loading` (the time it takes to check the `token` in `localStorage` on first render) and `isAuthenticated`. The `useEffect` waits for `loading` to be `false` before deciding where to redirect — otherwise we'd redirect to `/login` by mistake, a fraction of a second before the stored token is read.
- `router.push(...)` (from `next/navigation`) does a **client-side** navigation, without reloading the whole page — unlike changing `window.location`.
- Reuse a pattern already present elsewhere in the code (here copied from `dashboard/page.tsx`) rather than inventing a new one: it keeps the code consistent, and if the auth logic ever changes, we know there's only one pattern to fix everywhere.
- The old content can be recovered via git if ever needed: `git show HEAD:srcs/frontend/app/page.tsx` (before this commit).

---

## 3. `docker/mariadb/tools/start.sh` — outside the frontend, but worth knowing about

This file isn't in `srcs/frontend`, but it was blocking **every** frontend feature related to friends or chat, so it's worth understanding what happened.

### Symptom
After fixing item 1, the `POST /api/friends` request finally responded (no more 404) but returned a database error:
```
Table 'ft_transcendence.tr_Friend' doesn't exist
```

### Cause
The script that creates the SQL schema on the MariaDB container's first startup runs all the `CREATE TABLE` statements in **a single command** (`mariadb -e "..."`). The `tr_Message` table had a `FOREIGN KEY(idUser)` constraint even though the `idUser` column was **never declared** in that table:
```sql
CREATE TABLE tr_Message(
   idMessage INT AUTO_INCREMENT,
   content VARCHAR(100) NOT NULL,
   sendDate DATETIME DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY(idMessage),
   FOREIGN KEY(idUser) REFERENCES tr_User(idUser)  -- idUser doesn't exist above!
);
```
The `mariadb` client stops at the first statement that fails and doesn't run the following ones in the same script. `tr_User` (before `tr_Message` in the file) was therefore created normally — which is why login/registration worked — but `tr_Message`, then `tr_Friend`, then `tr_Chat` (every statement after the failure) were **never created**.

### Fix
Added the missing column:
```sql
CREATE TABLE tr_Message(
   idMessage INT AUTO_INCREMENT,
   content VARCHAR(100) NOT NULL,
   sendDate DATETIME DEFAULT CURRENT_TIMESTAMP,
   idUser INT,
   PRIMARY KEY(idMessage),
   FOREIGN KEY(idUser) REFERENCES tr_User(idUser)
);
```

### Takeaway
- A `FOREIGN KEY` references a column — if that column doesn't exist in the table itself, table creation fails (an FK doesn't "create" the column, it constrains a column that must already be declared just above).
- This script (`start.sh`) only runs **once**, on the very first startup on an empty MariaDB volume. Modifying it isn't enough by itself: the volume has to be recreated with `make clean && make` for the new schema to be applied (`make clean` removes the local data folder, `make` restarts the containers and replays `start.sh` on an empty database).
- A "table doesn't exist" error doesn't necessarily mean "we forgot a table" — always check whether an earlier statement in the same script may have failed and blocked everything after it.

---

## 4. `CLAUDE.md` (project root)

Updated to reflect the actual state of the code after the merge: the frontend context stack (`Auth → WebSocket → Chat → Game`), the fact that the frontend also bypasses the nginx proxy for the WebSocket, and known backend bugs (`manageClick`, mini-game action name mismatch, etc.). This is a context file for future work sessions with Claude Code, not code — no need to master it, just good to know it exists and that it reflects actual state (not a goal).

---

## 5. `app/components/FriendsList.tsx` — same friend twice in the list

### Symptom
`Encountered two children with the same key, '1'` — React error when rendering the friends list.

### Cause
`tr_Friend`'s primary key is the **ordered pair** `(idUser, idUser_1)`, not an unordered pair. If "mini" adds "user" as a friend (`INSERT (1, 2)`) and "user" also adds "mini" (`INSERT (2, 1)`), these are two distinct rows in the database for the same relationship — nothing on the backend checks for the existence of the reverse pair before inserting. The SQL query for `/api/friends` does a `JOIN ... ON (f.idUser = u.idUser OR f.idUser_1 = u.idUser)`, which returns the matching friend **once per row** of `tr_Friend`: with both rows, the same friend comes out twice in the JSON response.

React requires a unique `key` per list element (`key={friend.idUser}`) to know which one changed between two renders — two friends with the same `idUser` break this guarantee and trigger the warning/crash.

### Fix
Client-side deduplication, in `FriendsList.tsx`:
```ts
fetchFriends(token)
	.then((data) => {
		const raw: Friend[] = data.friends ?? [];
		const deduped = Array.from(new Map(raw.map((f) => [f.idUser, f])).values());
		setFriends(deduped);
	})
```

### Takeaway
- `new Map(array.map((x) => [x.uniqueKey, x]))` is the standard JS pattern to deduplicate an array of objects by a property: a `Map` can't have the same key twice, so the second entry overwrites the first. `Array.from(map.values())` converts it back into a clean array.
- This is a **display** fix, not a root fix: the database still contains both duplicate rows. The real fix (preventing duplicate insertion, or `DISTINCT` on the SQL side) should be done on the backend — flagged to Lenny.
- A React error message mentioning `key` almost always points to duplicated data upstream, not to a bug in React's rendering itself.

---

## 6. "Remove friend" button — complete new feature

The backend route `DELETE /api/removeFriend` already existed (see `server.js`) but nothing on the frontend called it. Three files touched:

**`api.ts`** — new function, same shape as `fetchAddFriend`:
```ts
export async function fetchRemoveFriend(idUser: number, token: string)
{
	return callBackend('/removeFriend', {
		method: 'DELETE',
		body: JSON.stringify({ idUser }),
		headers: {'Authorization': `Bearer ${token}`}
	});
}
```

**`FriendListItem.tsx`** — a "Remove" button added next to the name. Important technical point: previously, the whole row was a `<button>` (to capture the selection click). HTML **forbids nesting a `<button>` inside another `<button>`** — the browser silently "breaks" the structure if you try. So I changed the wrapping element to `<div role="button" tabIndex={0}>` (with an `onKeyDown` to keep Enter/Space usable from the keyboard, which a real `<button>` does natively), which leaves room for a real "Remove" `<button>` inside. On this button, `e.stopPropagation()` prevents the click from "bubbling up" to the parent's `onClick` (otherwise clicking "Remove" would also select the friend at the same time).

**`FriendsList.tsx`** — `handleRemove(idUser)` calls `fetchRemoveFriend`, then updates local state with `setFriends((prev) => prev.filter((f) => f.idUser !== idUser))` rather than doing a full network refetch: the removal is already confirmed by the server (we wait for the response before filtering), so there's no need to reload the whole list — same principle already used by `FriendSearchBar.handleAdd` to remove a search result after adding. A removal error has its own state (`removeError`), separate from the initial-load `error` state, so a single failed removal doesn't make the whole list disappear.

### Takeaway
- **No `<button>` inside a `<button>`**: an HTML rule worth knowing, otherwise the rendered DOM doesn't match what you wrote in JSX and behavior becomes unpredictable.
- **Update local state after server confirmation** rather than reloading everything: faster, fewer requests, and the pattern is already used elsewhere in this code — spotting it and reusing it keeps the code more consistent than inventing a new way for every feature.

---

## 7. `api.ts` — `callBackend` was turning *every* error into a crash

### Symptom
Every "normal" error returned by the backend (failed login, "Friendship not found", etc.) triggered Next.js's full-screen red overlay — the same appearance as a real crash — even though the calling component (`LoginPage`, `FriendsList`...) had a `try/catch` that handled the error cleanly.

### Cause
```ts
try {
	const response = await fetch(URL, {...options, headers});
	...
	if (!response.ok) throw new Error(...);
	return data;
} catch (error) {
	console.error("Error:", error);   // ⚠️
	throw error;
}
```
`console.error(...)` was called **before** re-throwing the error to the caller. But Next.js in dev mode intercepts **every** call to `console.error`, wherever it is in the app, and shows its overlay — regardless of whether the error is then caught and displayed cleanly further up the component tree. This `try/catch` changed nothing about the behavior (it re-threw the same error as-is), it only served to generate this noise.

### Fix
Plain and simple removal of the `try/catch` — if `fetch()` fails, the error naturally bubbles up to the caller without needing a block that just re-throws it:
```ts
const response = await fetch(URL, {...options, headers});
const data = await response.json().catch(() => null);
if (!response.ok) {
	throw new Error(data?.error || data?.message || "This endpoint couldn't be called");
}
return data;
```

### Takeaway
- **`console.error` is not neutral in dev under Next.js**: it triggers the overlay, even for an error your code otherwise handles just fine. Only log as an error what's *actually* unexpected (a bug), not a normal error HTTP response (400/401/404/409) that the UI is meant to display to the user.
- A `try { ... } catch (e) { throw e; }` that does nothing but re-throw the error as-is is always useless — an uncaught error already bubbles up on its own.

## 8. "Remove" button — two possible causes for "Friendship not found"

### Cause A — double-click (same tab)
A double-click (or two clicks close together) sends two `DELETE` requests: the first succeeds and removes the row from the database, the second arrives too late and finds nothing left to delete.

**Fix**: `FriendsList.tsx` tracks the `idUser` currently being removed (`removingId`); `handleRemove` ignores a call if this friend is already being removed, and `FriendListItem.tsx` visually disables the button (`disabled={removing}`, text "...") during the request.

### Cause B — desync between two sessions (the actual case encountered)
Real scenario: "mini" removes "user" from their list. "user", in another tab/browser, had already loaded their own list **before** this removal — their React state keeps "mini" as a friend until a reload. Nothing warns them of the change in real time (there's no WebSocket broadcast on friendship removal, unlike `ppChange` for instance). When "user" then clicks "Remove" for "mini", the request targets a friendship that no longer exists on the server → legitimate 404.

The real fix (notifying "user" live) requires a WS broadcast on the backend — out of frontend scope. On the frontend, we can only make the action **idempotent from a display standpoint**: if the server responds "already removed", the outcome the user wanted (no longer being friends) is achieved either way, so there's no point showing them an error.

**Fix**: `api.ts` now has an `ApiError extends Error` class that carries the HTTP code (`err.status`) in addition to the message. `callBackend` throws an `ApiError` instead of a plain `Error`. In `handleRemove`:
```ts
} catch (err) {
	if (err instanceof ApiError && err.status === 404) {
		// already removed server-side: we just align the display, no error shown
		setFriends((prev) => prev.filter((f) => f.idUser !== idUser));
	} else {
		setRemoveError(err instanceof Error ? err.message : 'Error while removing');
	}
}
```

### Takeaway
- **The error message alone isn't always enough to decide what to do** — the HTTP code is often needed too. `data?.error || data?.message` gave text, but no reliable way to know "is this a 404 or a 500?" without extending `Error`. A custom error class (`ApiError`) carrying structured data (here `status`) is the standard pattern for this in JS/TS.
- **Any network action triggered by a click should guard against double-clicking** (disable the trigger during the request).
- **A "resource not found" error on a deletion action isn't always a real error for the user** — if their intent (no longer being friends) is achieved either way, it's better to silently align the display than to alarm them with a red message.
- Broader case to keep in mind: **without real-time notification, two sessions open in parallel can drift apart.** This applies to friends, but potentially to other shared screens later — a manual reload (or a future WS broadcast) remains the only way to resync until it's handled natively.

---

## 9. `FriendSearchBar.tsx` — two holes that combined to crash

### Symptom
`Runtime ApiError: Cannot add yourself as a friend` — an **uncaught** error, displayed as a real crash by Next.js (unlike errors handled elsewhere that show up as red text in the UI).

### Cause (two distinct bugs, one revealing the other)

**Bug 1: `GET /api/users` returns everyone, including yourself**, and `handleSearch` never filtered your own account out of the results:
```ts
setResults(users.filter((user) => user.name.toLowerCase().includes(lowerQuery)));
```
If your search also matched your own name, you'd end up in your own search results, with a very real "Add" button on it.

**Bug 2: `handleAdd` had no `try/catch`**:
```ts
async function handleAdd(idUser: number) {
	if (!token) return;
	await fetchAddFriend(idUser, token);   // if this throws, nobody catches it
	...
}
```
Clicking "Add" on yourself does correctly trigger the backend check (`server.js`: `if (jwtDecoded.idUser === idUser) return res.status(400).json({message: "Cannot add yourself as a friend"})`), which is correct — but since nothing caught the returned error, it bubbled up to React as an unhandled exception, hence the full-screen "Runtime Error" instead of a simple message.

### Fix
```ts
const { token, user } = useAuth();
...
setResults(
	users.filter((u) => u.idUser !== user?.idUser && u.name.toLowerCase().includes(lowerQuery))
);
...
async function handleAdd(idUser: number) {
	if (!token) return;
	setError(null);
	try {
		await fetchAddFriend(idUser, token);
		setResults((prev) => prev.filter((u) => u.idUser !== idUser));
		onFriendAdded();
	} catch (err) {
		setError(err instanceof Error ? err.message : 'Unable to add this friend');
	}
}
```
(the variable name in the local `.map`/`.filter` calls was renamed from `user` to `u` to avoid shadowing the `user` imported from `useAuth()` — a classic JS scoping issue: a local variable with the same name as an enclosing variable makes it inaccessible within that block)

### Takeaway
- **An innocuous display bug (yourself in a search list) can become a crash** as soon as it crosses paths with a spot lacking error handling. Fixing only the filtering would have been enough here, but the actual underlying problem — `handleAdd` without a `try/catch` — remained a risk for any other possible error from `/api/addFriend` (already friends, expired jwt, etc.), not just this one.
- **Any `async` function triggered by a click should have its own `try/catch`** if you want to control how the error is displayed to the user — otherwise Next.js/React decides for you (and it decides "full-screen crash").

---

## 10. Real-time synchronization — handled on the backend side

The teammate is going to add a WebSocket broadcast when a friendship is removed ("Cause B" in section 8). Once that's done, there's no more need to rely on silently catching the 404 to mask the drift — both sides will be notified live. We still keep the 404 handling in place: it costs nothing and protects against other desync cases (network latency, a tab left open for several days, etc.).

## 11. Chat: overly long text overflowing the bubble

### Symptom
A message with no spaces (e.g. a long run of the same letter) overflows horizontally out of the blue bubble instead of wrapping.

### Cause
`ChatMessageItem.tsx` limited the bubble's width (`max-w-xs`) but said nothing about *how* to break the text inside it. By default in CSS, text only breaks at spaces (`overflow-wrap: normal`) — a word with no space, however long, is treated as a single unbreakable unit and pushes outside its container instead of wrapping.

### Fix
Added the Tailwind class `break-words` (= `overflow-wrap: break-word` in CSS) on the bubble, which allows breaking inside a word when that's the only way to fit within the available width.

### Takeaway
- `max-width` alone doesn't protect against text overflow — a wrapping rule (`overflow-wrap`/`word-break`) is also needed for content the user doesn't control (here, anyone can type a run of characters with no spaces).

## 12. Chat: 100-character limit added on the frontend

The backend already rejects messages over 100 characters (`ws/actions.js`, `manageMsg`) — silently, with no clear response. On the frontend (`ChatInput.tsx`), added `maxLength={100}` on the `<input>` (physically prevents typing more) and a small `content.length/100` counter below the field, so the user understands the limit before reaching a message that would go nowhere.

**Why duplicate a rule already present on the backend?** This isn't unnecessary redundancy: the backend remains the sole source of truth for data security/integrity (it must re-check even if the frontend already limited it, since a malicious client can send anything directly to the WebSocket). The frontend-side limit only serves the user experience — avoiding typing a message that seems sent but will never arrive.

## 13. Search bar overlapping the chat window

### Symptom
The "Search" button and search field overflowed the left column and visually overlapped the friend's name displayed in the chat window on the right.

### Cause
A classic flexbox trap, worth knowing once and for all: **an `<input>` in a flex container has an implicit minimum width** (`min-width: auto`), which prevents it from shrinking below its "natural" size even with the `flex-1` class. In `FriendSearchBar.tsx`, the `<input className="flex-1 ...">` line + the "Search" button therefore needed more width than the `256px` (`w-64`) allocated to the left column (`<aside>` in `DashboardLayout.tsx`). Since `<aside>` had no `overflow-hidden`, this overflow wasn't clipped — it kept displaying over the neighboring content (`<main>`) instead of disappearing or forcing a line wrap.

### Fix
- `FriendSearchBar.tsx`: `min-w-0` added on the `<input>` — explicitly allows the element to shrink below its natural size, so `flex-1` works as intended.
- `ChatInput.tsx`: same `min-w-0` added as a precaution (same flex + input structure).
- `DashboardLayout.tsx`: `<aside>` now has `shrink-0` (never shrinks itself, keeps its 256px exactly) and `overflow-hidden` (if anything still overflows inside it, it gets cleanly clipped instead of overlapping `<main>`).

### Takeaway
- **`flex-1` alone doesn't make an element shrinkable** — elements with intrinsic content (text, `<input>`, `<img>`) have a default minimum size that overrides `flex-1`/`flex-shrink`. The reflex: add `min-w-0` (or `min-width: 0` in raw CSS) on the flex element in question as soon as it needs to be able to shrink.
- **A fixed-width container should have `overflow-hidden`** if it contains children whose size isn't guaranteed — it turns a visual "overflows onto the neighbor" bug into a much more noticeable "just gets clipped" bug, and above all it avoids the misleading overlap we saw here.

---

## 14. Profile page — new feature (name + photo)

Three files touched, in this logical order:

**`api.ts`** — added `fetchGetUser(idUser)`, which was completely missing even though the backend route `POST /api/getUser` already existed. It's the one that lets us fetch `mail`, `profilePicture` and `scoreTotal` — info the JWT doesn't contain (the token only carries `idUser` and `name`, as seen at creation time in `server.js`).

**`AuthContext.tsx`** — new `updateName(name)` function, which calls `fetchUpdateUserName` (already existing) then updates `user.name` in local state:
```ts
async function updateName(name: string) {
	if (!token) return;
	await fetchUpdateUserName(name, token);
	setUser((prev) => (prev ? { ...prev, name } : prev));
}
```
**Why not just call `fetchUpdateUserName` directly from the profile page?** Because the name displayed in the dashboard header (`DashboardLayout.tsx`) comes from `user.name`, which is decoded once from the JWT at login (`AuthContext`). The backend doesn't return a new token after a name change — without this local patch, the header would keep showing the old name until the next reconnection. By centralizing the update in `AuthContext` (as `login`/`register` already do), a single place manages auth state, and every component that reads `user.name` updates together.

**`app/profile/page.tsx`** (new) — the page itself: same auth guard as `dashboard/page.tsx` (`loading`/`isAuthenticated` + redirect), loading of the full profile via `fetchGetUser`, name form (via `updateName`), photo upload/deletion (via `fetchUpdateUserImage`/`fetchDeleteUserImage` — already written in `api.ts` for a while but never used by any component until now).

**`DashboardLayout.tsx`** — the name in the header is now a link to `/profile`.

### Takeaway
- **The JWT isn't a database**: it only contains what was put in it at creation time (`idUser`, `name`), and it doesn't update itself when the underlying data changes. Any info that can change during a session (photo, score...) must be re-fetched from the server, not inferred from the token.
- **Centralize auth-state mutations in `AuthContext`** rather than letting each page call the API directly and handle its own synchronization — otherwise every new page that touches the profile reinvents its own (often shaky) way of keeping the header up to date.

---

## 15. Score page — new feature (initial score + leaderboard)

**`GameContext.tsx`** — before, `score` stayed `null` until a `clickResult` WS event was received, so `ScoreDisplay` never showed anything for someone who hadn't played the mini-game yet (currently broken on the backend, so: never). Added an initial load on mount, with the same `fetchGetUser` function just added for the profile page:
```ts
useEffect(() => {
	if (!user) return;
	fetchGetUser(user.idUser)
		.then((data) => {
			const found = data?.[0];
			if (found && typeof found.scoreTotal === 'number')
				setScore(found.scoreTotal);
		})
		.catch(() => {});
}, [user]);
```
The displayed score now comes either from this initial load, or from a future live `clickResult` — both update the same `score` state, so `ScoreDisplay` doesn't need to change anything on its side.

**`ScoreDisplay.tsx`** — the score badge in the header is now a link to `/score` (same principle as the username → `/profile`).

**`app/score/page.tsx`** (new) — leaderboard page: reuses `fetchUsers()` (already existing, `GET /api/users`, which already returns `scoreTotal` for each user), sorted client-side by descending score. The logged-in player's row is highlighted (`u.idUser === user?.idUser` comparison).

### Takeaway
- **No need for a new backend route for a leaderboard**: `/api/users` already exposed everything needed (`scoreTotal` included). Before adding a function in `api.ts`, check whether an existing route doesn't already cover the need, even if it was originally written for something else (here, friend search).
- **A single state, several sources feeding it**: `score` in `GameContext` is now updated both by an initial load (HTTP) and by a real-time event (WebSocket) — as long as both write into the same state via `setScore`, the components reading it (`ScoreDisplay`) don't need to know where the value came from.

## 16. `FriendSearchBar.tsx` — exclude already-added friends from results

### Cause
The search already filtered out your own account (section 9) but not existing friends — searching for someone already added would still show them with an "Add" button, which would fail with "You are already friends" (`409`, handled cleanly since section 9, but better to never show the button at all).

### Fix
`FriendSearchBar` didn't have access to the current friends list (it lives in `FriendsList`'s state, a sibling component, not a parent). Rather than lifting this state up into `DashboardLayout` to share it between the two (a bigger refactor, not necessary for this need), `handleSearch` fetches its own copy of the friends list in parallel with the user search:
```ts
const [users, friendsData]: [Friend[], { friends?: Friend[] }] = await Promise.all([
	fetchUsers(),
	token ? fetchFriends(token) : Promise.resolve({ friends: [] }),
]);
const friendIds = new Set((friendsData.friends ?? []).map((f) => f.idUser));
...
users.filter((u) => u.idUser !== user?.idUser && !friendIds.has(u.idUser) && ...)
```

### Takeaway
- **`Promise.all([...])` fires several requests in parallel** rather than one after another (sequential `await`) — twice as fast here since `fetchUsers()` and `fetchFriends()` don't depend on each other.
- **A `Set` is the right tool for testing "is X in this list?" many times** (`friendIds.has(u.idUser)` is O(1), versus O(n) for repeated `array.includes()` inside a `.filter()`) — a useful reflex as soon as the list can grow.
- **Deliberate duplication**: this makes another network call to `/api/friends` that `FriendsList` may have already made right next to it. Truly sharing state between the two components (lifted into `DashboardLayout`) would avoid the duplication, but would have required restructuring three files for a mostly cosmetic gain — not justified for an occasional, infrequent search.

---

## 17. Continuing the session: moving to the backend side

From here, the session continued directly on `srcs/backend` rather than staying confined to the frontend (an explicit decision, not just a one-off patch). The detail — including a WebSocket routing bug that meant no WS action (`auth`, `msg`, `click`...) had ever been processed since the start of the project, and not just the mini-game — is in `srcs/backend/BACKEND_CHANGES.md`. The up-to-date front/back contract is in `srcs/backend/BACKEND_TODO.md`.

Consequence for the frontend: the mini-game now works end-to-end (nothing left to do here), and `getConvos` finally returns the right sender — only the chat history on load remains to be wired on the frontend (see below), the backend blocker having disappeared.

## 18. Chat history on load — last known task, completed

**`api.ts`** — `fetchGetConvos(token)` added (`POST /api/getConvos`, header only, `idUser` comes from the JWT on the backend).

**`ChatContext.tsx`** — new `useEffect` that fires once `user`/`token` are available (so right after connecting):
```ts
const rows: ConvoRow[] = [...(data.convos ?? [])].sort((a, b) => a.idMessage - b.idMessage);
const grouped: Conversations = {};
for (const row of rows) {
	const otherUserId = row.idUser === user.idUser ? row.idUser_1 : row.idUser;
	if (!grouped[otherUserId]) grouped[otherUserId] = [];
	grouped[otherUserId].push({
		content: row.content,
		sendDate: row.sendDate,
		fromMe: row.senderId === user.idUser,
	});
}
setConversations((prev) => ({ ...grouped, ...prev }));
```
Two technical points worth explaining:

- **Grouping by conversation**: `getConvos` returns a flat array of *all* the user's messages across all conversations, not already grouped by friend. Each row carries `idUser`/`idUser_1` (the thread's two constant participants) — whichever of the two isn't me becomes the `otherUserId` grouping key, exactly the same identifier used everywhere else in `ChatContext` (`getMessages(idUser)`, `sendMessage(idUser, ...)`).
- **Sorted by `idMessage`, not by `sendDate`**: `getConvos`'s SQL query has no `ORDER BY`, so the order returned by MariaDB isn't guaranteed to be chronological. `sendDate` is a `DATETIME` (second-level precision) — two messages sent within the same second would tie and could end up in the wrong order. `idMessage` (`AUTO_INCREMENT`), on the other hand, guarantees the actual insertion order unambiguously.

### Takeaway
- **Flat data from the database often needs to be grouped on the client**— the backend has no reason to return a structure already nested by conversation if it doesn't already build it that way itself; it's up to the frontend to do that work with the identifiers it already has (here, "whoever isn't me in this pair").
- **Never sort by a low-precision timestamp when an auto-incrementing key is available** — the actual insertion order (`idMessage`) is a stronger guarantee than the timestamp (`sendDate`) for breaking ties between close events.
- `setConversations((prev) => ({ ...grouped, ...prev }))`: the loaded history serves as the **base**, anything that already arrived live via WebSocket before this call finishes (a window of at most a few hundred ms, at connection time) takes precedence. A deliberate tradeoff rather than merging both arrays message by message — the risk window is minimal and a fine-grained merge would have added complexity for a very rare edge case.

This was the last known task on the frontend side. Everything that remained in `BACKEND_TODO.md`/`FRONTEND_CHANGES.md` is now resolved, except for the WS broadcast on friendship removal (backend side, entrusted to the teammate).
