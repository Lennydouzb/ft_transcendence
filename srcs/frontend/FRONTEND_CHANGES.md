# Journal de session — ce qu'on a fait et pourquoi

Ce fichier résume les changements faits pendant cette session de travail sur le front, avec pour chacun : le problème observé, la cause réelle, le fix appliqué, et le concept général à retenir pour la prochaine fois que tu croises un bug du même genre.

Contexte : ces changements arrivent juste après un merge de Lenny sur le back (branche `testLenny`). On est parti de `srcs/backend/BACKEND_TODO.md` (le contrat front/back) pour voir ce que le merge avait débloqué, cassé, ou laissé de côté.

---

## 1. `app/api/api.ts` — `fetchFriends` envoyait la mauvaise méthode HTTP

### Symptôme
La liste d'amis (`FriendsList.tsx`) affichait "Erreur de chargement" au lieu de charger.

### Cause
```ts
// avant
export async function fetchFriends(token: string)
{
	return callBackend('/friends', {
		headers: {'Authorization': `Bearer ${token}`}
	});
}
```
Aucune `method` n'était précisée. Or `fetch()` (et donc `callBackend`, notre wrapper dans ce fichier) part en `GET` par défaut quand `method` n'est pas fourni. Côté back, la route est déclarée avec `app.post('/api/friends', ...)` dans `server.js`.

**Point clé à comprendre** : Express ne fait aucune correspondance entre méthodes HTTP. `app.post('/api/friends', ...)` ne répond **qu'aux requêtes POST** sur cette URL. Une requête GET sur la même URL tombe dans le vide et Express répond `404 Not Found` — pas une erreur 500, pas un message clair, juste "cette route n'existe pas" de son point de vue. C'est pour ça que l'erreur ne pointait vers rien d'évident : le bug n'était pas dans la logique, il était dans le **contrat** entre front et back (quelle URL + quelle méthode + quel format).

### Fix
```ts
// après
export async function fetchFriends(token: string)
{
	return callBackend('/friends', {
		method: 'POST',
		headers: {'Authorization': `Bearer ${token}`}
	});
}
```

### À retenir
- Le verbe HTTP (`GET`/`POST`/`PUT`/`DELETE`) fait partie de l'URL de la route au même titre que le chemin. Change l'un sans l'autre et tu casses tout, silencieusement.
- Pour déboguer ce genre de souci : ouvre les **DevTools → onglet Network**, regarde la colonne `Method` et le `Status` de la requête. Un `404` sur une route que tu sais exister côté back = 9 fois sur 10 un problème de méthode ou de chemin, pas de logique métier.
- Idéalement `/api/friends` (une simple lecture) devrait être un `GET` — c'est plus la convention REST. Mais comme on ne touche pas au back cette fois, on s'est aligné sur ce qui existe réellement plutôt que sur ce qui serait "propre".

---

## 2. `app/page.tsx` — la page d'accueil ne compilait plus du tout

### Symptôme
`http://localhost:3000/` affichait une erreur de build Next.js : `Export fetchCreateGame doesn't exist in target module`. Et cette erreur restait affichée même en naviguant vers `/login`.

### Cause
L'ancien `app/page.tsx` était un panneau de test d'API fait à la va-vite (commentaire `//@TODO AI GENERATED FOR TESTS PURPOSES` en tête de fichier). Il appelait `api.fetchCreateGame(...)` et `api.fetchcreateQuestions(...)`, deux fonctions qui existent bien dans `api.ts` mais **commentées** (désactivées) :
```ts
/*export async function fetchCreateGame(nameA: string, token: string) { ... }*/
```
`import * as api from './api/api'` importe le module entier ; comme `fetchCreateGame` n'y est pas réellement exporté, Turbopack (le compilateur de Next.js) refuse de builder la page — c'est une erreur statique, détectée à la compilation, pas à l'exécution.

**Point clé à comprendre** : dans l'App Router de Next.js, chaque fichier `app/**/page.tsx` correspond à une route. Mais l'overlay d'erreur du dev server (l'écran rouge plein écran) est injecté globalement dans la session du navigateur — une fois affiché, il peut rester visible même en changeant de route tant que le build reste cassé quelque part, ce qui donne l'impression trompeuse que "tout" est cassé.

### Fix
Le fichier ne servait de toute façon à rien en l'état (cassé, et même corrigé ce n'était qu'un outil de debug, pas une vraie page d'accueil). Remplacé par une redirection, en réutilisant **exactement le même pattern** que `app/dashboard/page.tsx` utilisait déjà :
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
			<p>Chargement...</p>
		</main>
	);
}
```

### À retenir
- `useAuth()` expose `loading` (le temps de vérifier le `token` dans `localStorage` au premier rendu) et `isAuthenticated`. Le `useEffect` attend que `loading` soit `false` avant de décider où rediriger — sinon on redirigerait vers `/login` par erreur, une fraction de seconde avant que le token stocké soit lu.
- `router.push(...)` (de `next/navigation`) fait une navigation **côté client**, sans recharger toute la page — contrairement à changer `window.location`.
- Réutiliser un pattern déjà présent ailleurs dans le code (ici copié de `dashboard/page.tsx`) plutôt que d'en inventer un nouveau : ça garde le code cohérent, et si un jour on change la logique d'auth, on sait qu'il n'y a qu'un seul pattern à corriger partout.
- L'ancien contenu est récupérable via git si besoin un jour : `git show HEAD:srcs/frontend/app/page.tsx` (avant ce commit).

---

## 3. `docker/mariadb/tools/start.sh` — hors du front, mais il fallait le savoir

Ce fichier n'est pas dans `srcs/frontend`, mais il bloquait **toute** feature front liée aux amis ou au chat, donc autant comprendre ce qui s'est passé.

### Symptôme
Après avoir corrigé le point 1, la requête `POST /api/friends` répondait enfin (fini le 404) mais renvoyait une erreur base de données :
```
Table 'ft_transcendence.tr_Friend' doesn't exist
```

### Cause
Le script qui crée le schéma SQL au premier démarrage du container MariaDB exécute toutes les `CREATE TABLE` dans **une seule commande** (`mariadb -e "..."`). La table `tr_Message` avait une contrainte `FOREIGN KEY(idUser)` alors que la colonne `idUser` n'était **jamais déclarée** dans cette table :
```sql
CREATE TABLE tr_Message(
   idMessage INT AUTO_INCREMENT,
   content VARCHAR(100) NOT NULL,
   sendDate DATETIME DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY(idMessage),
   FOREIGN KEY(idUser) REFERENCES tr_User(idUser)  -- idUser n'existe pas plus haut !
);
```
Le client `mariadb` s'arrête à la première instruction qui échoue et n'exécute pas les suivantes du même script. `tr_User` (avant `tr_Message` dans le fichier) se créait donc normalement — d'où le fait que login/inscription marchaient — mais `tr_Message`, puis `tr_Friend`, puis `tr_Chat` (toutes les instructions après l'échec) n'étaient **jamais créées**.

### Fix
Ajout de la colonne manquante :
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

### À retenir
- Une `FOREIGN KEY` référence une colonne — si cette colonne n'existe pas dans la table elle-même, la création de la table échoue (une FK ne "crée" pas la colonne, elle contraint une colonne qui doit déjà être déclarée juste au-dessus).
- Ce script (`start.sh`) ne s'exécute **qu'une fois**, au tout premier démarrage sur un volume MariaDB vide. Le modifier ne suffit donc pas : il faut recréer le volume avec `make clean && make` pour que le nouveau schéma soit appliqué (`make clean` supprime le dossier de données local, `make` relance les containers et rejoue `start.sh` sur une base vide).
- Une erreur "table doesn't exist" ne veut pas forcément dire "on a oublié une table" — regarde toujours si une instruction *avant* dans le même script a pu échouer et bloquer tout le reste.

---

## 4. `CLAUDE.md` (racine du projet)

Mis à jour pour refléter l'état réel du code après le merge : la pile de contexts front (`Auth → WebSocket → Chat → Game`), le fait que le front bypass aussi le proxy nginx pour le WebSocket, et les bugs connus du back (`manageClick`, désalignement des noms d'action du mini-jeu, etc.). C'est un fichier de contexte pour les futures sessions de travail avec Claude Code, pas du code — pas besoin de le maîtriser, juste bon à savoir qu'il existe et qu'il reflète l'état réel (pas un objectif).

---

## 5. `app/components/FriendsList.tsx` — deux fois le même ami dans la liste

### Symptôme
`Encountered two children with the same key, '1'` — erreur React au rendu de la liste d'amis.

### Cause
`tr_Friend` a pour clé primaire le **couple** `(idUser, idUser_1)`, pas une paire non-ordonnée. Si "mini" ajoute "user" en ami (`INSERT (1, 2)`) et que "user" ajoute aussi "mini" (`INSERT (2, 1)`), ce sont deux lignes distinctes en base pour la même relation — rien côté back ne vérifie l'existence de la paire inverse avant d'insérer. La requête SQL de `/api/friends` fait un `JOIN ... ON (f.idUser = u.idUser OR f.idUser_1 = u.idUser)`, qui renvoie l'ami correspondant **une fois par ligne** de `tr_Friend` : avec les deux lignes, le même ami sort deux fois dans la réponse JSON.

React exige une `key` unique par élément de liste (`key={friend.idUser}`) pour savoir lequel a changé entre deux rendus — deux amis avec le même `idUser` cassent cette garantie et déclenchent l'avertissement/crash.

### Fix
Dédoublonnage côté client, dans `FriendsList.tsx` :
```ts
fetchFriends(token)
	.then((data) => {
		const raw: Friend[] = data.friends ?? [];
		const deduped = Array.from(new Map(raw.map((f) => [f.idUser, f])).values());
		setFriends(deduped);
	})
```

### À retenir
- `new Map(tableau.map((x) => [x.cléUnique, x]))` est le pattern standard en JS pour dédupliquer un tableau d'objets par une propriété : une `Map` ne peut pas avoir deux fois la même clé, donc la seconde entrée écrase la première. `Array.from(map.values())` reconvertit en tableau propre.
- C'est un correctif d'**affichage**, pas de fond : la base contient toujours les deux lignes dupliquées. La vraie correction (empêcher l'insertion en double, ou `DISTINCT` côté SQL) doit se faire côté back — à signaler à Lenny.
- Un message d'erreur React qui parle de `key` pointe presque toujours vers des données dupliquées en amont, pas vers un bug de rendu React lui-même.

---

## 6. Bouton "retirer un ami" — nouvelle feature complète

La route back `DELETE /api/removeFriend` existait déjà (voir `server.js`) mais rien côté front ne l'appelait. Trois fichiers touchés :

**`api.ts`** — nouvelle fonction, même forme que `fetchAddFriend` :
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

**`FriendListItem.tsx`** — un bouton "Retirer" ajouté à côté du nom. Point technique important : avant, toute la ligne était un `<button>` (pour capter le clic de sélection). Le HTML **interdit d'imbriquer un `<button>` dans un autre `<button>`** — le navigateur "casse" silencieusement la structure si tu essaies. J'ai donc changé l'élément englobant en `<div role="button" tabIndex={0}>` (avec un `onKeyDown` pour garder Entrée/Espace utilisables au clavier, ce qu'un vrai `<button>` fait nativement), ce qui laisse la place à un vrai `<button>` "Retirer" à l'intérieur. Sur ce bouton, `e.stopPropagation()` empêche le clic de "remonter" jusqu'au `onClick` du parent (sinon cliquer sur "Retirer" sélectionnerait aussi l'ami en même temps).

**`FriendsList.tsx`** — `handleRemove(idUser)` appelle `fetchRemoveFriend`, puis met à jour l'état local avec `setFriends((prev) => prev.filter((f) => f.idUser !== idUser))` plutôt que de refaire un appel réseau complet : la suppression est déjà confirmée par le serveur (on attend la réponse avant de filtrer), donc pas besoin de recharger toute la liste — c'est le même principe que `FriendSearchBar.handleAdd` utilise déjà pour retirer un résultat de recherche après ajout. Une erreur de suppression a son propre état (`removeError`), séparé de l'état `error` du chargement initial, pour ne pas faire disparaître toute la liste si une seule suppression échoue.

### À retenir
- **Pas de `<button>` dans un `<button>`** : règle HTML à connaître, sinon le DOM rendu ne correspond pas à ce que tu as écrit en JSX et le comportement devient imprévisible.
- **Mettre à jour l'état local après une confirmation serveur** plutôt que de tout recharger : plus rapide, moins de requêtes, et le pattern est déjà utilisé ailleurs dans ce code — le repérer et le réutiliser rend le code plus cohérent que d'inventer une nouvelle façon de faire à chaque feature.

---

## 7. `api.ts` — `callBackend` faisait passer *toutes* les erreurs pour des crashs

### Symptôme
Chaque erreur "normale" renvoyée par le back (login raté, "Friendship not found", etc.) déclenchait l'overlay rouge plein écran de Next.js — la même apparence qu'un vrai crash — alors même que le composant appelant (`LoginPage`, `FriendsList`...) avait un `try/catch` qui gérait l'erreur proprement.

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
`console.error(...)` était appelé **avant** de relancer l'erreur vers l'appelant. Or Next.js en mode développement intercepte **tout** appel à `console.error`, où qu'il soit dans l'app, et affiche son overlay — indépendamment du fait que l'erreur soit ensuite catchée et affichée proprement plus haut dans l'arbre de composants. Ce `try/catch` ne changeait rien au comportement (il relançait la même erreur telle quelle), il ne servait qu'à générer ce bruit.

### Fix
Suppression pure et simple du `try/catch` — si `fetch()` échoue, l'erreur remonte naturellement vers l'appelant sans avoir besoin d'un bloc qui se contente de la relancer :
```ts
const response = await fetch(URL, {...options, headers});
const data = await response.json().catch(() => null);
if (!response.ok) {
	throw new Error(data?.error || data?.message || "This endpoint couldn't be called");
}
return data;
```

### À retenir
- **`console.error` n'est pas neutre en dev sous Next.js** : ça déclenche l'overlay, même pour une erreur que ton code gère très bien par ailleurs. Ne logge en erreur que ce qui est *vraiment* inattendu (un bug), pas une réponse HTTP d'erreur normale (400/401/404/409) que l'UI est censée afficher à l'utilisateur.
- Un `try { ... } catch (e) { throw e; }` qui ne fait rien d'autre que relancer l'erreur telle quelle est toujours inutile — une erreur non interceptée remonte déjà toute seule.

## 8. Bouton "Retirer" — deux causes possibles pour "Friendship not found"

### Cause A — double-clic (même onglet)
Un double-clic (ou deux clics rapprochés) envoie deux requêtes `DELETE` : la première réussit et supprime la ligne en base, la seconde arrive trop tard et ne trouve plus rien à supprimer.

**Fix** : `FriendsList.tsx` retient l'`idUser` en cours de suppression (`removingId`) ; `handleRemove` ignore un appel si cet ami est déjà en cours de suppression, et `FriendListItem.tsx` désactive visuellement le bouton (`disabled={removing}`, texte "...") pendant la requête.

### Cause B — désynchronisation entre deux sessions (le vrai cas rencontré)
Scénario réel : "mini" retire "user" de sa liste. "user", dans un autre onglet/navigateur, avait déjà chargé sa propre liste **avant** cette suppression — son état React garde "mini" comme ami jusqu'à un rechargement. Rien ne le prévient en temps réel du changement (il n'y a pas de broadcast WebSocket sur la suppression d'amitié, contrairement à `ppChange` par exemple). Quand "user" clique ensuite sur "Retirer" pour "mini", la requête vise une amitié qui n'existe déjà plus côté serveur → 404 légitime.

Le vrai fix (prévenir "user" en direct) demande un broadcast WS côté back — hors périmètre front. Côté front, on peut seulement rendre l'action **idempotente à l'affichage** : si le serveur répond "déjà supprimé", le résultat voulu par l'utilisateur (ne plus être ami) est de toute façon atteint, donc pas la peine de lui montrer une erreur.

**Fix** : `api.ts` a maintenant une classe `ApiError extends Error` qui transporte le code HTTP (`err.status`) en plus du message. `callBackend` lève une `ApiError` au lieu d'une `Error` simple. Dans `handleRemove` :
```ts
} catch (err) {
	if (err instanceof ApiError && err.status === 404) {
		// déjà retiré côté serveur : on aligne juste l'affichage, pas d'erreur affichée
		setFriends((prev) => prev.filter((f) => f.idUser !== idUser));
	} else {
		setRemoveError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
	}
}
```

### À retenir
- **Le message d'erreur seul ne suffit pas toujours à décider quoi faire** — il faut souvent le code HTTP. `data?.error || data?.message` donnait un texte, mais pas de moyen fiable de savoir "est-ce un 404 ou un 500 ?" sans étendre `Error`. Une classe d'erreur personnalisée (`ApiError`) qui porte des données structurées (ici `status`) est le pattern standard pour ça en JS/TS.
- **Toute action réseau déclenchée par un clic devrait se protéger contre le double-clic** (désactiver le déclencheur pendant la requête).
- **Une erreur "ressource introuvable" sur une action de suppression n'est pas toujours une vraie erreur pour l'utilisateur** — si son intention (ne plus être ami) est de toute façon atteinte, mieux vaut aligner silencieusement l'affichage que de l'inquiéter avec un message rouge.
- Cas plus large à garder en tête : **sans notification temps réel, deux sessions ouvertes en parallèle peuvent diverger.** Ça vaut pour les amis, mais potentiellement pour d'autres écrans partagés plus tard — un rechargement manuel (ou un futur broadcast WS) reste le seul moyen de resynchroniser tant que ce n'est pas géré nativement.

---

## 9. `FriendSearchBar.tsx` — deux trous qui se combinaient pour crasher

### Symptôme
`Runtime ApiError: Cannot add yourself as a friend` — une erreur **non catchée**, affichée comme un vrai crash par Next.js (contrairement aux erreurs gérées ailleurs qui s'affichent en texte rouge dans l'UI).

### Cause (deux bugs distincts, l'un révélant l'autre)

**Bug 1 : `GET /api/users` renvoie tout le monde, toi y compris**, et `handleSearch` ne filtrait jamais son propre compte hors des résultats :
```ts
setResults(users.filter((user) => user.name.toLowerCase().includes(lowerQuery)));
```
Si ta recherche matchait aussi ton propre nom, tu te retrouvais dans tes propres résultats de recherche, avec un bouton "Ajouter" bien réel dessus.

**Bug 2 : `handleAdd` n'avait aucun `try/catch`** :
```ts
async function handleAdd(idUser: number) {
	if (!token) return;
	await fetchAddFriend(idUser, token);   // si ça throw, personne ne l'attrape
	...
}
```
Cliquer "Ajouter" sur soi-même déclenche bien la vérification côté back (`server.js` : `if (jwtDecoded.idUser === idUser) return res.status(400).json({message: "Cannot add yourself as a friend"})`), qui est correcte — mais comme rien ne catchait l'erreur renvoyée, elle remontait jusqu'à React sous forme d'exception non gérée, d'où le "Runtime Error" plein écran au lieu d'un simple message.

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
		setError(err instanceof Error ? err.message : "Impossible d'ajouter cet ami");
	}
}
```
(le nom de variable dans les `.map`/`.filter` locaux a été renommé de `user` à `u` pour ne pas masquer le `user` importé de `useAuth()` — un problème classique de scope en JS : une variable locale du même nom qu'une variable englobante la rend inaccessible dans ce bloc)

### À retenir
- **Un bug d'affichage anodin (soi-même dans une liste de recherche) peut devenir un crash** dès qu'il croise un endroit sans gestion d'erreur. Corriger uniquement le filtrage aurait suffi ici, mais le vrai problème de fond — `handleAdd` sans `try/catch` — restait un risque pour n'importe quelle autre erreur possible de `/api/addFriend` (déjà ami, jwt expiré, etc.), pas seulement celle-ci.
- **Toute fonction `async` déclenchée par un clic doit avoir son propre `try/catch`** si tu veux contrôler comment l'erreur s'affiche à l'utilisateur — sinon c'est Next.js/React qui décide à ta place (et ça décide "crash plein écran").

---

## 10. Synchronisation temps réel — pris en charge côté back

Le coéquipier va ajouter un broadcast WebSocket quand une amitié est supprimée (le point "Cause B" de la section 8). Une fois ça fait, plus besoin de compter sur le rattrapage silencieux du 404 pour masquer le décalage — les deux côtés seront notifiés en direct. On garde quand même la gestion du 404 en place : elle ne coûte rien et protège contre d'autres cas de désynchronisation (latence réseau, onglet resté ouvert plusieurs jours, etc.).

## 11. Chat : texte trop long qui déborde de la bulle

### Symptôme
Un message sans espaces (ex: une longue suite de la même lettre) dépasse horizontalement de la bulle bleue au lieu de passer à la ligne.

### Cause
`ChatMessageItem.tsx` limitait la largeur de la bulle (`max-w-xs`) mais ne disait rien sur *comment* casser le texte à l'intérieur. Par défaut en CSS, le texte ne se coupe qu'aux espaces (`overflow-wrap: normal`) — un mot sans espace, aussi long soit-il, est traité comme une seule unité insécable et pousse en dehors de son conteneur plutôt que de se couper.

### Fix
Ajout de la classe Tailwind `break-words` (= `overflow-wrap: break-word` en CSS) sur la bulle, qui autorise la coupure à l'intérieur d'un mot quand c'est la seule façon de tenir dans la largeur disponible.

### À retenir
- `max-width` seul ne protège pas d'un débordement de texte — il faut aussi une règle de coupure (`overflow-wrap`/`word-break`) pour le contenu que l'utilisateur ne contrôle pas (ici, n'importe qui peut taper une suite de caractères sans espace).

## 12. Chat : limite de 100 caractères ajoutée côté front

Le back rejette déjà les messages de plus de 100 caractères (`ws/actions.js`, `manageMsg`) — silencieusement, sans réponse claire. Côté front (`ChatInput.tsx`), ajout de `maxLength={100}` sur l'`<input>` (empêche physiquement de taper plus) et d'un petit compteur `content.length/100` sous le champ, pour que l'utilisateur comprenne la limite avant d'atteindre un message qui partirait dans le vide.

**Pourquoi dupliquer une règle déjà présente côté back ?** Ce n'est pas de la redondance inutile : le back reste la seule source de vérité pour la sécurité/l'intégrité des données (il doit re-vérifier même si le front a déjà limité, un client malveillant peut envoyer n'importe quoi directement au WebSocket). La limite côté front, elle, sert uniquement l'expérience utilisateur — éviter de taper un message qui semble parti mais qui n'arrivera jamais.

## 13. Barre de recherche qui chevauchait la fenêtre de chat

### Symptôme
Le bouton "Chercher" et le champ de recherche débordaient de la colonne de gauche et venaient se superposer visuellement au nom de l'ami affiché dans la fenêtre de chat à droite.

### Cause
Un piège classique de flexbox, à connaître une bonne fois pour toutes : **un `<input>` dans un conteneur flex a une largeur minimale implicite** (`min-width: auto`), qui l'empêche de rétrécir en dessous de sa taille "naturelle" même avec la classe `flex-1`. Dans `FriendSearchBar.tsx`, la ligne `<input className="flex-1 ...">` + le bouton "Chercher" avaient donc besoin de plus de largeur que les `256px` (`w-64`) alloués à la colonne de gauche (`<aside>` dans `DashboardLayout.tsx`). Comme `<aside>` n'avait pas de `overflow-hidden`, ce débordement n'était pas coupé — il continuait de s'afficher par-dessus le contenu voisin (`<main>`) au lieu de disparaître ou de forcer un retour à la ligne.

### Fix
- `FriendSearchBar.tsx` : `min-w-0` ajouté sur l'`<input>` — autorise explicitement l'élément à rétrécir en dessous de sa taille naturelle, pour que `flex-1` fonctionne comme prévu.
- `ChatInput.tsx` : même `min-w-0` ajouté par précaution (même structure flex + input).
- `DashboardLayout.tsx` : `<aside>` a maintenant `shrink-0` (ne rétrécit jamais lui-même, garde ses 256px pile) et `overflow-hidden` (si jamais quelque chose déborde quand même à l'intérieur, ça se découpe proprement au lieu de chevaucher `<main>`).

### À retenir
- **`flex-1` ne suffit pas à rendre un élément rétractable** — les éléments avec du contenu intrinsèque (texte, `<input>`, `<img>`) ont une taille minimale par défaut qui prime sur `flex-1`/`flex-shrink`. Le réflexe : ajouter `min-w-0` (ou `min-width: 0` en CSS brut) sur l'élément flex concerné dès qu'il doit pouvoir rétrécir.
- **Un conteneur à largeur fixe devrait avoir `overflow-hidden`** s'il contient des enfants dont la taille n'est pas garantie — ça transforme un bug visuel "qui déborde sur le voisin" en un bug beaucoup plus repérable "qui est juste coupé", et surtout ça évite le chevauchement trompeur qu'on a vu ici.

---

## 14. Page de profil — nouvelle feature (nom + photo)

Trois fichiers touchés, dans cet ordre logique :

**`api.ts`** — ajout de `fetchGetUser(idUser)`, qui manquait complètement alors que la route back `POST /api/getUser` existait déjà. C'est elle qui permet d'aller chercher `mail`, `profilePicture` et `scoreTotal` — des infos que le JWT ne contient pas (le token ne porte que `idUser` et `name`, vu à la création dans `server.js`).

**`AuthContext.tsx`** — nouvelle fonction `updateName(name)`, qui appelle `fetchUpdateUserName` (déjà existante) puis met à jour `user.name` dans le state local :
```ts
async function updateName(name: string) {
	if (!token) return;
	await fetchUpdateUserName(name, token);
	setUser((prev) => (prev ? { ...prev, name } : prev));
}
```
**Pourquoi pas juste appeler `fetchUpdateUserName` directement depuis la page de profil ?** Parce que le nom affiché dans le header du dashboard (`DashboardLayout.tsx`) vient de `user.name`, qui est décodé une seule fois depuis le JWT au login (`AuthContext`). Le back ne renvoie pas de nouveau token après un changement de nom — sans ce patch local, le header resterait affiché avec l'ancien nom jusqu'à la prochaine reconnexion. En centralisant la mise à jour dans `AuthContext` (comme `login`/`register` le font déjà), un seul endroit gère l'état d'auth, et tous les composants qui lisent `user.name` se mettent à jour ensemble.

**`app/profile/page.tsx`** (nouveau) — la page elle-même : garde d'authentification identique à `dashboard/page.tsx` (`loading`/`isAuthenticated` + redirection), chargement du profil complet via `fetchGetUser`, formulaire de nom (via `updateName`), upload/suppression de photo (via `fetchUpdateUserImage`/`fetchDeleteUserImage` — déjà écrites dans `api.ts` depuis un moment mais jamais utilisées par aucun composant jusqu'ici).

**`DashboardLayout.tsx`** — le nom dans le header est maintenant un lien vers `/profile`.

### À retenir
- **Le JWT n'est pas une base de données** : il ne contient que ce qui a été mis dedans à sa création (`idUser`, `name`), et il ne se met pas à jour tout seul quand les données changent en base. Toute info qui peut changer en cours de session (photo, score...) doit être re-demandée au serveur, pas déduite du token.
- **Centraliser les mutations d'état d'auth dans `AuthContext`** plutôt que de laisser chaque page appeler l'API directement et gérer elle-même la synchronisation — sinon chaque nouvelle page qui touche au profil réinvente sa propre façon (souvent bancale) de garder le header à jour.

---

## 15. Page de score — nouvelle feature (score initial + classement)

**`GameContext.tsx`** — avant, `score` restait `null` tant qu'aucun évènement WS `clickResult` n'était reçu, donc `ScoreDisplay` n'affichait jamais rien pour quelqu'un qui n'avait pas encore joué au mini-jeu (actuellement cassé côté back, donc : jamais). Ajout d'un chargement initial au montage, avec la même fonction `fetchGetUser` qu'on vient d'ajouter pour la page de profil :
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
Le score affiché vient maintenant soit de ce chargement initial, soit d'un futur `clickResult` en direct — les deux mettent à jour le même state `score`, donc `ScoreDisplay` n'a rien à changer de son côté.

**`ScoreDisplay.tsx`** — le badge de score dans le header est maintenant un lien vers `/score` (même principe que le nom d'utilisateur → `/profile`).

**`app/score/page.tsx`** (nouveau) — page de classement : réutilise `fetchUsers()` (déjà existante, `GET /api/users`, qui renvoie déjà `scoreTotal` pour chaque utilisateur), triée côté client par score décroissant. La ligne du joueur connecté est mise en évidence (comparaison `u.idUser === user?.idUser`).

### À retenir
- **Pas besoin d'une nouvelle route back pour un classement** : `/api/users` exposait déjà tout ce qu'il fallait (`scoreTotal` inclus). Avant d'ajouter une fonction dans `api.ts`, vérifie si une route existante ne couvre pas déjà le besoin, même si elle a été écrite pour autre chose à l'origine (ici, la recherche d'amis).
- **Un seul state, plusieurs sources qui l'alimentent** : `score` dans `GameContext` est maintenant mis à jour à la fois par un chargement initial (HTTP) et par un évènement temps réel (WebSocket) — tant que les deux écrivent dans le même state avec `setScore`, les composants qui le lisent (`ScoreDisplay`) n'ont pas besoin de savoir d'où vient la valeur.

## 16. `FriendSearchBar.tsx` — exclure les amis déjà ajoutés des résultats

### Cause
La recherche filtrait déjà son propre compte (section 9) mais pas les amis existants — chercher quelqu'un qu'on avait déjà ajouté le faisait quand même apparaître avec un bouton "Ajouter", qui aurait échoué avec "You are already friends" (`409`, géré proprement depuis la section 9, mais autant ne jamais montrer le bouton).

### Fix
`FriendSearchBar` n'avait pas accès à la liste d'amis actuelle (elle vit dans l'état de `FriendsList`, un composant voisin, pas un parent). Plutôt que de remonter cet état dans `DashboardLayout` pour le partager entre les deux (un refactor plus large, pas nécessaire pour ce besoin), `handleSearch` va chercher sa propre copie de la liste d'amis en parallèle de la recherche d'utilisateurs :
```ts
const [users, friendsData]: [Friend[], { friends?: Friend[] }] = await Promise.all([
	fetchUsers(),
	token ? fetchFriends(token) : Promise.resolve({ friends: [] }),
]);
const friendIds = new Set((friendsData.friends ?? []).map((f) => f.idUser));
...
users.filter((u) => u.idUser !== user?.idUser && !friendIds.has(u.idUser) && ...)
```

### À retenir
- **`Promise.all([...])` lance plusieurs requêtes en parallèle** plutôt que l'une après l'autre (`await` séquentiel) — deux fois plus rapide ici puisque `fetchUsers()` et `fetchFriends()` ne dépendent pas l'une de l'autre.
- **Un `Set` est le bon outil pour tester "est-ce que X est dans cette liste ?" beaucoup de fois** (`friendIds.has(u.idUser)` est en O(1), contre O(n) pour `array.includes()` répété dans un `.filter()`) — un réflexe utile dès que la liste peut grandir.
- **Duplication délibérée** : ça refait un appel réseau à `/api/friends` que `FriendsList` a peut-être déjà fait juste à côté. Un vrai partage d'état entre les deux composants (remonté dans `DashboardLayout`) éviterait la duplication, mais aurait demandé de restructurer trois fichiers pour un gain surtout esthétique — pas justifié pour une recherche ponctuelle et peu fréquente.

---

## 17. Suite de la session : passage côté back

À partir d'ici, la session a continué directement sur `srcs/backend` plutôt que de rester cantonnée au front (décision explicite, pas juste un dépannage ponctuel). Le détail — dont un bug de routage WebSocket qui faisait qu'aucune action WS (`auth`, `msg`, `click`...) n'avait jamais été traitée depuis le début du projet, et pas seulement le mini-jeu — est dans `srcs/backend/BACKEND_CHANGES.md`. Le contrat front/back à jour est dans `srcs/backend/BACKEND_TODO.md`.

Conséquence pour le front : le mini-jeu fonctionne maintenant de bout en bout (plus rien à faire ici), et `getConvos` renvoie enfin le bon expéditeur — seul l'historique de chat au chargement reste à câbler côté front (voir ci-dessous), le blocage back ayant disparu.

## 18. Historique de chat au chargement — dernière tâche connue, terminée

**`api.ts`** — `fetchGetConvos(token)` ajouté (`POST /api/getConvos`, header seulement, l'`idUser` vient du JWT côté back).

**`ChatContext.tsx`** — nouveau `useEffect` qui se déclenche une fois que `user`/`token` sont disponibles (donc juste après connexion) :
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
Deux points techniques qui méritent explication :

- **Regroupement par conversation** : `getConvos` renvoie un tableau plat de *tous* les messages de toutes les conversations de l'utilisateur, pas déjà groupé par ami. Chaque ligne porte `idUser`/`idUser_1` (les deux participants constants du fil) — celui des deux qui n'est pas moi devient la clé `otherUserId` du regroupement, exactement le même identifiant que celui utilisé partout ailleurs dans `ChatContext` (`getMessages(idUser)`, `sendMessage(idUser, ...)`).
- **Tri par `idMessage`, pas par `sendDate`** : la requête SQL de `getConvos` n'a pas de `ORDER BY`, donc l'ordre renvoyé par MariaDB n'est pas garanti chronologique. `sendDate` est un `DATETIME` (précision à la seconde) — deux messages envoyés dans la même seconde seraient à égalité et pourraient se retrouver dans le mauvais ordre. `idMessage` (`AUTO_INCREMENT`) garantit, lui, l'ordre d'insertion réel sans ambiguïté.

### À retenir
- **Une donnée plate en base doit souvent être regroupée côté client** — le back n'a aucune raison de renvoyer une structure imbriquée par conversation s'il ne la construit pas déjà lui-même ; c'est au front de faire ce travail avec les identifiants qu'il a déjà (ici, "qui n'est pas moi dans cette paire").
- **Ne jamais trier par un timestamp à faible précision quand une clé auto-incrémentée est disponible** — l'ordre d'insertion réel (`idMessage`) est une garantie plus forte que l'horodatage (`sendDate`) pour départager des évènements proches.
- `setConversations((prev) => ({ ...grouped, ...prev }))` : l'historique chargé sert de **base**, tout ce qui est déjà arrivé en direct via WebSocket avant que cet appel ne se termine (fenêtre de quelques centaines de ms au pire, à la connexion) prend le dessus. Compromis délibéré plutôt que de fusionner les deux tableaux message par message — la fenêtre de risque est minime et la fusion fine aurait ajouté de la complexité pour un cas limite très rare.

C'était la dernière tâche connue côté front. Tout ce qui restait dans `BACKEND_TODO.md`/`FRONTEND_CHANGES.md` est maintenant réglé, à l'exception du broadcast WS sur suppression d'amitié (côté back, confié au coéquipier).
