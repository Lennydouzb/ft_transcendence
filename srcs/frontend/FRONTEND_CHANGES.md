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

## Ce qui reste à faire côté front (rappel)

- **Limite de caractères sur le chat** : le back rejette silencieusement les messages de plus de 100 caractères (`ws/actions.js`, `manageMsg`). Ajouter `maxLength={100}` sur l'`<input>` de `ChatInput.tsx` + un compteur visuel.
- **`FriendSearchBar`** : ne filtre pas les gens déjà amis dans les résultats de recherche, et n'affiche pas d'erreur si `fetchAddFriend` échoue.
- **Historique de chat au chargement** : volontairement mis de côté — `getConvos` côté back ne renvoie pas encore le véritable expéditeur de chaque message (bug connu, signalé à Lenny), donc câbler ça maintenant afficherait des messages attribués à la mauvaise personne.
- **Mini-jeu** : bloqué côté back (variable `gameActive` jamais activée, désalignement des noms d'action `render`/`unrender` vs `spawn`/`gone`/`clickResult`) — rien à faire côté front tant que ce n'est pas corrigé côté back.
