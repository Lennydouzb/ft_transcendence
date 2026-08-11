# Contrat front/back — état et attentes

Ce fichier documente ce que le **front** (`srcs/frontend`) suppose/attend du **back** pour chaque feature en cours (dashboard type Discord : liste d'amis, chat 1-to-1, mini-jeu du bouton). Objectif : que le dev back (ou une future session Claude) puisse voir en un coup d'œil ce qui reste à faire/corriger pour que le front fonctionne réellement, sans avoir à relire toute la conversation qui a mené à ces choix.

À mettre à jour au fur et à mesure que des points sont réglés (cocher, ou supprimer la section si totalement stabilisée).

---

## 1. WebSocket — protocole général

Le front se connecte directement à `ws://localhost:8080` (bypass du proxy nginx `/ws/`, comme le fait déjà `app/api/api.ts` pour le REST). Chaque message est un JSON `{ action: string, ...payload }`. Le front route chaque message entrant vers des abonnés selon le champ `action` — donc **toute nouvelle feature WS doit avoir un nom d'`action` unique et stable**, communiqué ici.

- [x] **Fix appliqué par le front** : `server.js` ligne ~439, `ws.on('message', (message) => { const args = JSON.parse(mesage); ... })` → `mesage` était une faute de frappe (variable non définie), corrigé en `message`. Sans ce fix, **tout** message entrant (y compris `auth`) plantait avec `{ error: "Format de message invalide" }`. C'est corrigé, mais gardez-le en tête si vous retouchez ce bloc.
- Handshake attendu par le front : à l'ouverture de la socket, il envoie immédiatement `{ action: "auth", token: "Bearer <jwt>" }`. Ça matche `manageAuth` dans `ws/actions.js` tel qu'il existe déjà. Rien à faire ici, juste une confirmation de contrat.

---

## 2. Chat (messages 1-to-1)

### Historique au chargement — `POST /api/getConvos`

Route déjà présente (`server.js`), mais **incomplète** :

- [ ] **Bug bloquant** : la route fait la requête SQL mais ne renvoie jamais les lignes — `res.status(200).json({success: true})` sans les `rows`. Le front a besoin d'un tableau de messages dans la réponse.
- [ ] **Ambiguïté à résoudre** : la requête SQL est
  ```sql
  select tr_Message.idMessage, content, sendDate, tr_Chat.idUser, tr_Chat.idUser_1
  from tr_Message join tr_Chat on tr_Message.idMessage = tr_Chat.idMessage
  where tr_Chat.idUser = ? or tr_Chat.idUser_1 = ?
  ```
  Elle sélectionne `tr_Chat.idUser`/`tr_Chat.idUser_1` (les deux participants de la conversation, constants pour tout le fil) mais **pas** `tr_Message.idUser` (l'expéditeur réel du message). Résultat : impossible pour le front de savoir qui a écrit quoi. Il faut sélectionner l'expéditeur réel, par ex. `tr_Message.idUser as senderId`.
- **Format de réponse attendu par le front** (proposition, à valider ensemble) :
  ```json
  {
    "success": true,
    "messages": [
      { "idMessage": 12, "content": "salut", "sendDate": "2026-08-10T10:00:00Z", "senderId": 3, "otherUserId": 7 }
    ]
  }
  ```
  Le front regroupera ensuite ces messages par `otherUserId` (= l'ami autre que soi-même dans `idUser`/`idUser_1`) pour peupler `ChatContext.setHistory(idUser, messages)`.

### Messages en direct — action WS `msg`

Déjà fonctionnel côté back (`manageMsg` dans `ws/actions.js`) et déjà branché côté front (`ChatContext.tsx`). Contrat actuel, **que le front exploite tel quel** :

- Émission (front → back) : `{ action: "msg", idUser: <destinataireId>, message: <contenu> }`.
- Réception (back → front) : `{ action: "msg", message, idUser: <expéditeurId>, name: <nomExpéditeur> }`, envoyé **uniquement au destinataire** (pas d'echo à l'expéditeur).
- **Le front compte là-dessus** : comme il n'y a pas d'echo, `ChatContext.sendMessage()` ajoute le message localement en "optimiste" dès l'envoi, sans attendre de confirmation serveur. **Si ce comportement change (ex: ajout d'un ACK ou d'un echo au sender), il faudra prévenir le front** pour éviter les messages en double.
- [ ] **Amélioration souhaitable, non bloquante** : le payload `msg` ne contient pas de `sendDate`. Le front horodate côté client (approximatif). Si possible, ajouter `sendDate` (généré serveur) dans le payload diffusé.

---

## 3. Amis

Confirmé par le back : `GET /api/friends` et `POST /api/addFriend`. **Le front est maintenant codé et les consomme réellement** (`FriendsList.tsx`, `FriendSearchBar.tsx`, `fetchFriends`/`fetchAddFriend` dans `api.ts`) contre le contrat suivant — pas encore implémenté côté back au moment de l'écriture de ce fichier, donc `FriendsList` affichera une erreur de chargement tant que la route n'existe pas :

- [ ] `GET /api/friends` — header `Authorization: Bearer <jwt>`, pas de body. Réponse attendue :
  ```json
  { "success": true, "friends": [{ "idUser": 7, "name": "bob", "profilePicture": "xxx.png", "scoreTotal": 300 }] }
  ```
- [ ] `POST /api/addFriend` — header `Authorization: Bearer <jwt>`, body `{ "idUser": <idDeLaCiblAAjouter> }`. Réponse attendue : `{ "success": true }` ou `{ "success": false, "message": "..." }`.
- Pour la barre de recherche, le front prévoit d'utiliser `GET /api/users` (déjà existante) pour lister tous les utilisateurs et filtrer côté client, sauf si le back préfère exposer une route de recherche dédiée — à voir selon volume d'utilisateurs.
- Remarque annexe (non bloquante) : `GET /api/getUser` lit `idUser` depuis `req.body` sur une requête **GET** — les navigateurs/`fetch()` n'envoient pas fiablement de body sur un GET. À corriger un jour (query param ou passer en POST), mais pas utilisée par le front pour l'instant donc pas urgent.

---

## 4. Photos de profil — pas de route statique

- [ ] Aucune route ne sert le contenu de `uploads/` (pas de `express.static` dessus dans `server.js`). Les endpoints d'upload/suppression écrivent bien le fichier et enregistrent son nom en DB (`tr_User.profilePicture`), mais rien ne permet de le récupérer par URL ensuite.
- Le front (`FriendListItem`) suppose pour l'instant `http://localhost:8080/uploads/<profilePicture>` et prévoit un fallback (avatar avec initiale) si l'image ne charge pas — donc pas bloquant pour développer l'UI, mais il faudra ajouter `app.use('/uploads', express.static(path.join(__dirname, 'uploads')))` (ou équivalent) pour que les avatars s'affichent vraiment.

---

## 5. Mini-jeu du bouton (clic pour marquer un point)

Règle validée avec le PO (toi) : le back décide à intervalle aléatoire de faire apparaître un bouton (le front choisit lui-même une position aléatoire à l'écran), **seul le premier clic marque le point**, puis le bouton doit disparaître pour tout le monde.

État actuel dans `ws/actions.js` : un début d'implémentation existe (`gameActive`, action `click` → `manageClick`) mais :

- [ ] **Bugs de syntaxe qui empêchent le fichier de charger** (`ws/actions.js` ligne ~119) :
  - `const manageClick = (wa, args)` : il manque `=>` après les parenthèses, et le paramètre s'appelle `wa` au lieu de `ws`.
  - `await` utilisé dans une fonction non `async`.
  - `conn` utilisé sans être déclaré (`let conn`).
  - Parenthèse manquante dans `ws.send(JSON.stringify({success: true, scoreTotal: rows[0].scoreTotal))`.

  Tant que ça reste comme ça, `require('./ws/actions')` plante probablement au démarrage du serveur (SyntaxError sur `await` hors fonction async) — donc **tout le backend est probablement down** dans l'état actuel du fichier, pas juste le mini-jeu. À vérifier/corriger en priorité.

- [ ] **Logique de spawn manquante** : rien ne met jamais `gameActive` à 1 pour l'instant. Il faut un timer (`setTimeout`/`setInterval`) avec un délai aléatoire dans une plage à définir, qui :
  1. passe `gameActive` à `1`,
  2. **broadcast** un événement à tous les clients connectés (parcourir `sessionsUsers`) pour leur dire "un bouton est disponible". Proposition de nom d'action côté front : **`"spawn"`** — payload minimal, pas de position (le front la génère lui-même) : `{ "action": "spawn" }`.

- [ ] **Garantir "premier clic gagne" de façon atomique** : dans `manageClick`, il faut consommer `gameActive` (le repasser à `0`) **avant** toute opération asynchrone (avant l'`await` sur la DB), sinon deux clics presque simultanés peuvent tous les deux passer le test `if (gameActive == 1)` avant que l'un des deux ait eu le temps de le repasser à 0.

- [ ] **Broadcast de disparition** : une fois qu'un clic a gagné, il faut prévenir tous les autres clients que le bouton n'est plus disponible (sinon les autres utilisateurs le voient toujours affiché alors qu'il n'y a plus rien à gagner). Proposition de nom d'action : **`"gone"`** — `{ "action": "gone" }`, broadcast à tous.

- [ ] **Score : +100 vs +1** : le code actuel fait `scoreTotal = scoreTotal + 100`. Le PO a dit "marque 1 point" dans les specs — à clarifier si c'est vraiment +1 ou si +100 est voulu (barème de points). Le front affichera juste `scoreTotal` tel quel donc ce n'est pas bloquant pour lui, mais autant clarifier.

- [ ] **Ajouter un champ `action` sur la réponse au clic.** `manageClick` répond `ws.send(JSON.stringify({ success, scoreTotal }))` (ou `{ success: false, message }`) **sans** champ `action`. Le front (`GameContext.tsx`, déjà codé) route tous les messages entrants uniquement selon `data.action` — un message sans ce champ n'est reçu par personne. Il faut donc que cette réponse devienne `{ action: "clickResult", success, scoreTotal }` (nom proposé, modifiable si besoin, juste le prévenir côté front).

**Contrat WS déjà codé côté front pour ce mini-jeu** (`GameContext.tsx`) — à respecter une fois les points ci-dessus réglés :
- Réception `{ action: "spawn" }` → le front affiche le bouton à une position aléatoire.
- Émission `{ action: "click", token: "Bearer <jwt>" }` au clic (le front notera si le token doit vraiment être renvoyé ici alors qu'il a déjà été fourni via `auth` à la connexion — semble redondant mais on suit ce que fait `manageClick` actuellement).
- Réception `{ action: "clickResult", success: true, scoreTotal }` (gagné) ou `{ action: "clickResult", success: false, message }` (raté) → mise à jour de `ScoreDisplay`.
- Réception `{ action: "gone" }` (broadcast) → le front cache le bouton même s'il n'a pas cliqué.

---

## 6. Résumé — priorités suggérées pour le back

1. Fixer `ws/actions.js` (`manageClick`) pour que le serveur démarre à nouveau (bloquant, probablement casse tout le WS actuellement).
2. Ajouter le timer de spawn + broadcast `spawn`/`gone`.
3. Fixer `getConvos` (renvoyer les `rows`, corriger la sélection de l'expéditeur réel).
4. Implémenter `GET /api/friends` et `POST /api/addFriend`.
5. Servir `uploads/` statiquement pour que les avatars s'affichent.

Le front peut avancer sur les composants "bêtes" (affichage) sans attendre ces fixes, mais les branchements réels (chargement d'historique, amis, mini-jeu) resteront en mode "mock" tant que ces points ne sont pas réglés.
