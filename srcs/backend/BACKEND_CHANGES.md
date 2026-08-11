# Journal de session — back

Pendant de `srcs/frontend/FRONTEND_CHANGES.md`, même principe : pour chaque changement, le symptôme observé, la cause réelle, le fix, et le concept général à retenir. Ces changements ont été faits après la session front (voir l'autre fichier pour ce qui précède), une fois les bugs frontend réglés et la décision prise de s'attaquer directement au back.

Voir aussi `BACKEND_TODO.md` — le contrat front/back, tenu à jour au fur et à mesure. Ce fichier-ci raconte le "pourquoi", `BACKEND_TODO.md` donne l'état actuel case par case.

---

## 1. Le bug le plus important : aucune action WebSocket n'a jamais été traitée

### Symptôme
Le mini-jeu ne se déclenchait jamais (pas de bouton, jamais). Testé en isolant le WebSocket avec un script Node (sans passer par le navigateur) : une connexion + un message `auth` envoyés, **aucune réponse en 20 secondes**, même pas une erreur.

### Cause
Dans `server.js` :
```js
ws.on('connection', (ws) => {          // ce `ws` local ne vit que dans ce bloc
	ws.send(JSON.stringify({message:"Connected successfully"}));
});
ws.on('message', (message) => {        // attaché au `ws` extérieur : le SERVEUR, pas un client
	...
	getActions[args.action](ws, args);
	...
})
```
`const ws = new websocket.Server({server})`, tout en haut du fichier, désigne **le serveur WebSocket** (celui qui accepte les connexions), pas une connexion précise. À l'intérieur de `ws.on('connection', (ws) => {...})`, le paramètre `ws` masque volontairement l'extérieur pour désigner **une connexion client donnée** — mais seulement entre les accolades de ce bloc.

`ws.on('message', ...)` et `ws.on('close', ...)` étaient déclarés **en dehors** de ce bloc, donc attachés au serveur. Or la librairie `ws` n'émet **jamais** d'évènement `'message'` sur l'objet serveur — seulement sur chaque connexion individuelle. Vérifié avec un test minimal isolé (un serveur `ws` jouet, un client qui envoie un message) : le listener `wss.on('message', ...)` ne se déclenche jamais, seul `socket.on('message', ...)` (à l'intérieur de `connection`) reçoit quelque chose.

Conséquence : `getActions[args.action](ws, args)` — la ligne qui route vers `manageAuth`, `manageMsg`, `manageClick`, `managePpChange` — n'a **jamais été appelée, pour personne**, silencieusement, sans la moindre erreur. `sessionsUsers` est resté vide en permanence. Le chat "avait l'air" de marcher pendant les tests précédents uniquement parce que `ChatContext` affiche le message optimistiquement côté expéditeur, sans attendre de confirmation serveur — la réception réelle sur un second compte n'avait jamais été vérifiée.

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
			socket.send(JSON.stringify({ error: "Format de message invalide" }));
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
Tout déplacé à l'intérieur de `connection`, avec le paramètre renommé `socket` (au lieu de réutiliser `ws`) pour rendre la portée explicite et éviter tout masquage confus. Au passage, suppression de `const args = server.listen(...)` — une affectation morte qui traînait là (le retour de `.listen()` n'était jamais utilisé), déjà signalée comme point confus dans le premier passage sur ce fichier.

### À retenir
- **Une variable déclarée comme paramètre de callback n'existe que dans ce callback.** `ws.on('connection', (ws) => {...})` ne redéfinit `ws` que pour ce bloc précis — en dehors, `ws` redésigne toujours ce qu'il désignait avant.
- **Un event listener attaché au mauvais objet ne produit aucune erreur.** Il s'enregistre avec succès, ne se déclenche simplement jamais. C'est le pire type de bug à détecter en lisant le code seul — il faut le tester en isolant la partie suspecte (ici, un client WS minimal, sans navigateur ni React) pour observer objectivement ce qui se passe.
- **Avant de soupçonner la logique métier d'une fonction, vérifier qu'elle est bien appelée.** On a d'abord cru le mini-jeu cassé à cause de `gameActive`/`manageClick` (vrais bugs, corrigés aussi, voir plus bas) — mais tant que ce bug de routage n'était pas réglé, aucun de ces fixes n'aurait eu le moindre effet visible, puisque `manageClick` n'était jamais atteint.

---

## 2. `manageClick` : mauvais nom de paramètre

### Symptôme
Une fois le bug de routage réglé (section 1), le premier test de clic a révélé un second bug immédiatement dessous.

### Cause
```js
const manageClick = async (wa, args) =>
{
	...
	if (sessionsUsers.has(ws))   // `ws` n'existe nulle part dans cette fonction — seul `wa` est déclaré
	{
		...
```
Le paramètre s'appelait `wa` (probablement une faute de frappe pour `ws`), mais le corps de la fonction utilisait `ws` — undefined dans ce scope. Résultat : `ReferenceError` à l'exécution, à chaque tentative de clic.

### Fix
Paramètre renommé `wa` → `ws`, cohérent avec tous les autres handlers du fichier (`manageAuth`, `manageMsg`, etc., qui prennent tous `(ws, args)`).

### À retenir
- Un nom de paramètre qui ne correspond à rien dans le corps de la fonction ne casse rien à la déclaration (JavaScript ne vérifie pas ça statiquement) — l'erreur n'apparaît qu'à l'exécution, sur le premier appel réel.

---

## 3. Le mini-jeu n'avait pas de logique de "spawn"/"disparition" cohérente

### Symptôme
Même avec les deux bugs ci-dessus réglés, rien ne rendait le bouton réellement cliquable.

### Cause
- `gameActive` n'était jamais mis à `1` : `startRandomRenderLoop` diffusait `unrender` puis `render` à intervalle aléatoire, mais ne touchait jamais à cette variable — donc `if (gameActive == 1)` dans `manageClick` n'était jamais vrai.
- Pas de verrou atomique "premier clic gagne" : rien ne repassait `gameActive` à `0` à l'intérieur de `manageClick`, donc même une fois la variable activée, plusieurs clics quasi-simultanés auraient pu tous passer le test avant qu'aucun ne le referme.
- Désalignement des noms d'action : le back envoyait `render`/`unrender`, le front (`GameContext.tsx`, déjà écrit) écoutait `spawn`/`gone`/`clickResult`.
- Les réponses de `manageClick` n'avaient pas de champ `action` — sans lui, le système de routage du front (`WebSocketContext.tsx`, qui ne dispatche que les messages avec un `action` reconnu) les ignorait silencieusement.

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
gameActive = 0;   // consommé avant tout `await` : le premier clic à passer ici gagne
for (const anUser of sessionsUsers.values())
	anUser.ws.send(JSON.stringify({ action: "gone" }));
// ... puis la mise à jour du score, avec `action: "clickResult"` sur chaque réponse
```

### À retenir
- **"Premier clic gagne" est une question de concurrence, pas juste de logique.** Le verrou (`gameActive = 0`) doit être posé de façon synchrone, avant la première opération asynchrone (`await`) — sinon deux requêtes qui arrivent presque en même temps peuvent toutes les deux lire `gameActive == 1` avant qu'aucune n'ait eu le temps de le repasser à `0`.
- **Le contrat de nommage des actions WS est bidirectionnel et doit être identique des deux côtés au caractère près** — `render` et `spawn` sont fonctionnellement la même idée, mais le front qui écoute l'un n'entendra jamais l'autre.
- Testé avec deux clients WS simulés (un script Node, pas le navigateur) cliquant l'un après l'autre : le premier récupère `clickResult success:true`, le second `success:false, message:"Missed"` — confirme que le verrou fonctionne sous contention réelle, pas juste en théorie.

---

## 4. `UPDATE ... RETURNING` n'existe pas en MariaDB

### Symptôme
Le mini-jeu semblait fonctionner (bouton, clic, disparition) mais **le score ne s'incrémentait jamais**, ni dans l'UI ni en base.

### Cause
```js
const sqlQuery = "update tr_User set scoreTotal = scoreTotal + 100 where idUser = ? returning scoreTotal";
const rows = await conn.query(sqlQuery, [jwtDecoded.idUser]);
```
`RETURNING` après un `UPDATE` est une syntaxe **PostgreSQL**. MariaDB ne la supporte que pour `INSERT` et `DELETE`, pas pour `UPDATE` — chaque tentative plantait avec une erreur de syntaxe SQL (`ER_PARSE_ERROR`), silencieusement absorbée par le `catch` de `manageClick`, qui renvoyait `"The database didn't want you to win"`. Le bouton disparaissait quand même (le broadcast `gone` est indépendant du résultat de la requête), donnant l'illusion trompeuse que "ça marche".

Confirmé en lisant les logs du container (`docker logs backend`) puis en interrogeant directement la table (`scoreTotal` à `0` pour tout le monde malgré plusieurs clics gagnants apparents).

### Fix
Deux requêtes séparées au lieu d'une seule avec `RETURNING` :
```js
await conn.query("update tr_User set scoreTotal = scoreTotal + 100 where idUser = ?", [jwtDecoded.idUser]);
const rows = await conn.query("select scoreTotal from tr_User where idUser = ?", [jwtDecoded.idUser]);
```

### À retenir
- **Une syntaxe SQL valide sur un moteur ne l'est pas forcément sur un autre**, même pour des fonctionnalités qui semblent "standard" (`RETURNING` existe sur PostgreSQL, SQLite ≥ 3.35, MariaDB ≥ 10.5 pour `INSERT`/`DELETE` — mais pas `UPDATE` sur MariaDB à ce jour).
- **Un `catch` qui absorbe l'erreur sans la faire remonter clairement peut masquer un bug pendant longtemps** si le reste du flux (ici, la disparition du bouton) continue à donner l'illusion que tout va bien. Le réflexe qui a permis de trouver ça : comparer l'état réel en base (`SELECT scoreTotal FROM tr_User`) à ce que l'UI affichait, plutôt que de faire confiance à l'apparence de succès.
- `docker logs <container>` reste le premier réflexe face à un comportement silencieusement incorrect côté back — l'erreur SQL complète y était, avec la requête fautive citée telle quelle.

---

## 5. `getConvos` : mauvais expéditeur sélectionné

### Symptôme
Signalé dans `BACKEND_TODO.md` : impossible pour le front de savoir qui a écrit quoi dans l'historique d'une conversation.

### Cause
```sql
select tr_Message.idMessage, content, sendDate, tr_Chat.idUser, tr_Chat.idUser_1
from tr_Message join tr_Chat on tr_Message.idMessage = tr_Chat.idMessage
where tr_Chat.idUser = ? or tr_Chat.idUser_1 = ?
```
Cette requête sélectionne `tr_Chat.idUser`/`idUser_1` — les deux participants **constants** de toute la conversation — mais jamais `tr_Message.idUser`, l'expéditeur **réel** de ce message précis.

### Fix
```sql
select tr_Message.idMessage, content, sendDate, tr_Message.idUser as senderId, tr_Chat.idUser, tr_Chat.idUser_1
from tr_Message join tr_Chat on tr_Message.idMessage = tr_Chat.idMessage
where tr_Chat.idUser = ? or tr_Chat.idUser_1 = ?
```
Réponse : `{ success: true, convos: [...] }` avec un `senderId` par message en plus des deux participants du fil (utile pour calculer `otherUserId` côté front = la clé de regroupement par conversation).

**Reste à faire, côté front cette fois** : rien n'appelle encore cette route (`fetchGetConvos` n'existe pas dans `api.ts`, `ChatContext.setHistory` n'est jamais invoqué) — la donnée est maintenant correcte, il ne manque que le câblage.

### À retenir
- Dans une table de jonction (`tr_Chat`) qui relie deux entités fixes, ne pas confondre les colonnes qui identifient **la relation** (les deux participants, constants) avec celles qui identifient **un évènement précis** de cette relation (l'expéditeur d'un message donné, variable).

---

## 6. Message de chat trop long : ne renvoyait rien du tout

### Symptôme
Un message de plus de 100 caractères envoyé via le WebSocket disparaissait sans aucune réponse, ni succès ni erreur.

### Cause
```js
if (args.message.length > 100)
	return;
```
Sortie silencieuse, sans jamais informer le client.

### Fix
```js
if (args.message.length > 100) {
	ws.send(JSON.stringify({error: "message too long"}));
	return;
}
```
(Le front limite déjà la saisie à 100 caractères côté `ChatInput.tsx` — `maxLength` — donc ce cas ne devrait plus être atteignable depuis l'UI normale ; ce fix protège contre un client qui enverrait directement au WebSocket sans passer par le formulaire.)

### À retenir
- Toujours répondre sur un `return` de validation, même silencieux en apparence — sinon rien ne permet de distinguer "ça a marché" de "ça a été rejeté" côté client.
