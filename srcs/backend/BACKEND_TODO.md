# Contrat front/back — état et attentes

Ce fichier documente ce que le **front** (`srcs/frontend`) suppose/attend du **back** pour chaque feature en cours (dashboard type Discord : liste d'amis, chat 1-to-1, mini-jeu du bouton). Objectif : que le dev back (ou une future session Claude) puisse voir en un coup d'œil ce qui reste à faire/corriger pour que le front fonctionne réellement, sans avoir à relire toute la conversation qui a mené à ces choix.

À mettre à jour au fur et à mesure que des points sont réglés (cocher, ou supprimer la section si totalement stabilisée).

Pour le détail narratif (symptôme → cause → fix → à retenir) de chaque bug back listé ici, voir `BACKEND_CHANGES.md`. Ce fichier-ci reste le contrat à jour et rapide à parcourir ; l'autre explique le pourquoi.

---

## 1. WebSocket — protocole général

Le front se connecte directement à `ws://localhost:8080` (bypass du proxy nginx `/ws/`, comme le fait déjà `app/api/api.ts` pour le REST). Chaque message est un JSON `{ action: string, ...payload }`. Le front route chaque message entrant vers des abonnés selon le champ `action` — donc **toute nouvelle feature WS doit avoir un nom d'`action` unique et stable**, communiqué ici.

- [x] **Fix appliqué par le front** : `server.js` ligne ~439, `ws.on('message', (message) => { const args = JSON.parse(mesage); ... })` → `mesage` était une faute de frappe (variable non définie), corrigé en `message`. C'est corrigé, mais gardez-le en tête si vous retouchez ce bloc.
- [x] **Bug bien plus grave découvert et corrigé** : `ws.on('message', ...)` et `ws.on('close', ...)` étaient déclarés **en dehors** du bloc `ws.on('connection', (ws) => {...})`, donc attachés à l'objet `WebSocketServer` (le serveur) et non à une connexion client précise. Or la librairie `ws` n'émet **jamais** d'évènement `'message'` sur l'objet serveur — seulement sur chaque connexion individuelle. Conséquence : `getActions[args.action](ws, args)` n'était **jamais appelé, pour personne, depuis toujours** — `auth`, `msg`, `ppChange`, `click`, `disconnect` ne faisaient jamais rien en pratique, silencieusement (aucune erreur, juste zéro effet). `sessionsUsers` est resté vide en permanence. C'est ce qui a fait croire que le mini-jeu était juste "pas encore branché", alors qu'en réalité **aucune action WebSocket ne fonctionnait**, y compris `auth` lui-même. Vérifié avec un script Node isolé (connexion + `auth` + écoute 20s : zéro réponse avant le fix, réponses immédiates après). Fix : les listeners `message`/`close` sont maintenant attachés à la connexion individuelle (`socket`), à l'intérieur de `ws.on('connection', (socket) => {...})`.
- Handshake attendu par le front : à l'ouverture de la socket, il envoie immédiatement `{ action: "auth", token: "Bearer <jwt>" }`. Ça matche `manageAuth` dans `ws/actions.js` tel qu'il existe déjà. Rien à faire ici, juste une confirmation de contrat.

---

## 2. Chat (messages 1-to-1)

### Historique au chargement — `POST /api/getConvos`

- [x] **Bug bloquant résolu** : la route renvoie maintenant bien les lignes (`res.status(200).json({success: true, convos: rows})`).
- [x] **Ambiguïté résolue** : la requête sélectionne maintenant aussi `tr_Message.idUser as senderId` (l'expéditeur réel), en plus de `tr_Chat.idUser`/`idUser_1` (les deux participants constants du fil, utiles pour calculer `otherUserId` côté front) :
  ```sql
  select tr_Message.idMessage, content, sendDate, tr_Message.idUser as senderId, tr_Chat.idUser, tr_Chat.idUser_1
  from tr_Message join tr_Chat on tr_Message.idMessage = tr_Chat.idMessage
  where tr_Chat.idUser = ? or tr_Chat.idUser_1 = ?
  ```
- **Format de réponse réel** : `{ "success": true, "convos": [{ "idMessage", "content", "sendDate", "senderId", "idUser", "idUser_1" }] }` — clé `convos` (pas `messages` comme proposé initialement, pour rester alignés sur ce que le code renvoyait déjà).
- [x] **Câblage front fait** : `fetchGetConvos` (`api.ts`) + regroupement par conversation dans `ChatContext.tsx` (voir `srcs/frontend/FRONTEND_CHANGES.md` §18). L'historique se charge à la connexion.

### Messages en direct — action WS `msg`

Déjà fonctionnel côté back (`manageMsg` dans `ws/actions.js`) et déjà branché côté front (`ChatContext.tsx`). Contrat actuel, **que le front exploite tel quel** :

- Émission (front → back) : `{ action: "msg", idUser: <destinataireId>, message: <contenu> }`.
- Réception (back → front) : `{ action: "msg", message, idUser: <expéditeurId>, name: <nomExpéditeur> }`, envoyé **uniquement au destinataire** (pas d'echo à l'expéditeur).
- **Le front compte là-dessus** : comme il n'y a pas d'echo, `ChatContext.sendMessage()` ajoute le message localement en "optimiste" dès l'envoi, sans attendre de confirmation serveur. **Si ce comportement change (ex: ajout d'un ACK ou d'un echo au sender), il faudra prévenir le front** pour éviter les messages en double.
- [ ] **Amélioration souhaitable, non bloquante** : le payload `msg` ne contient pas de `sendDate`. Le front horodate côté client (approximatif). Si possible, ajouter `sendDate` (généré serveur) dans le payload diffusé.

---

## 3. Amis

- [x] **`/api/friends` implémentée et branchée**, mais en `POST` (pas `GET` comme proposé initialement) — le front (`fetchFriends` dans `api.ts`) a été aligné dessus. Réponse : `{ "success": true, "friends": [{ "idUser", "name", "mail", "profilePicture", "scoreTotal" }] } }`.
- [x] **`POST /api/addFriend`** implémentée et branchée (`FriendSearchBar.tsx`), conforme au contrat proposé.
- [x] **`DELETE /api/removeFriend`** implémentée et branchée (`FriendsList.tsx`/`FriendListItem.tsx`) — n'était même pas dans la liste initiale, ajoutée en cours de route.
- [x] La recherche utilise bien `GET /api/users` côté front, avec filtrage client (soi-même + amis déjà ajoutés exclus des résultats).
- [ ] **Broadcast temps réel manquant** : si "A" retire "B" de sa liste, "B" ne l'apprend pas en direct (pas de broadcast WS sur suppression d'amitié, contrairement à `ppChange`). Le front gère le cas dégradé (404 silencieux si l'action arrive après coup), mais un vrai broadcast serait plus propre — **à faire par le back**.
- [x] Remarque annexe précédente inexacte : `/api/getUser` est en fait déjà déclarée en `POST` dans `server.js` (pas en `GET` comme noté ici avant) — pas de souci de body sur GET. Le front l'utilise maintenant (`fetchGetUser` dans `api.ts`) pour la page de profil et le classement des scores.

---

## 4. Photos de profil — résolu

- [x] `app.use('/uploads', express.static(path.join(__dirname, 'uploads')))` ajouté dans `server.js`. Les avatars s'affichent bien via `http://localhost:8080/uploads/<profilePicture>`, y compris depuis la nouvelle page de profil front (`app/profile/page.tsx`) qui pilote maintenant upload/suppression.

---

## 5. Mini-jeu du bouton (clic pour marquer un point) — résolu

Règle validée avec le PO : le back décide à intervalle aléatoire de faire apparaître un bouton (le front choisit lui-même une position aléatoire à l'écran), **seul le premier clic marque le point**, puis le bouton doit disparaître pour tout le monde.

- [x] Bugs de syntaxe déjà corrigés dans un commit précédent (le fichier chargeait normalement).
- [x] **Bug de référence corrigé** : `manageClick` était déclaré `async (wa, args)` mais utilisait `ws` (non défini) dans son corps → `ReferenceError` à chaque clic. Paramètre renommé en `ws`, cohérent avec les autres handlers du fichier.
- [x] **Logique de spawn ajoutée** : `startRandomRenderLoop` passe maintenant `gameActive` à `1` et diffuse `{ action: "spawn" }` à chaque cycle (au lieu de renvoyer `render` sans jamais toucher `gameActive`).
- [x] **"Premier clic gagne" rendu atomique** : `manageClick` repasse `gameActive` à `0` **avant** l'`await` sur la base de données, dès que le clic est accepté.
- [x] **Broadcast de disparition** : renommé `unrender` → `gone`, envoyé à la fois par la boucle de spawn (bouton expiré) et par `manageClick` (bouton gagné), pour matcher exactement ce que `GameContext.tsx` écoute déjà côté front.
- [x] **Score** : gardé à `+100` (décision confirmée, le "1 point" du brief n'était pas à prendre littéralement).
- [x] **Bug supplémentaire trouvé en testant** : la requête `update tr_User set scoreTotal = scoreTotal + 100 where idUser = ? returning scoreTotal` plantait systématiquement — **MariaDB ne supporte pas `UPDATE ... RETURNING`** (contrairement à PostgreSQL ; MariaDB ne l'a que pour `INSERT`/`DELETE`). Le clic gagnant tombait donc toujours dans le `catch`, renvoyait `"The database didn't want you to win"`, et le score n'était **jamais** incrémenté en base — invisible dans l'UI puisque le bouton disparaissait quand même (`gone` est indépendant du résultat). Remplacé par un `UPDATE` suivi d'un `SELECT` séparé. Vérifié : `scoreTotal` s'incrémente bien en base désormais.
- [x] **Champ `action` ajouté** sur toutes les réponses de `manageClick` (`{ action: "clickResult", success, scoreTotal }` ou `{ action: "clickResult", success: false, message }`) — sans lui, le front ne pouvait router aucune réponse.

Le contrat WS déjà codé côté front (`GameContext.tsx`) est maintenant respecté de bout en bout : `spawn` → affichage, `click` → `clickResult` (+ mise à jour `ScoreDisplay`), `gone` → disparition pour tout le monde.

---

## 6. Résumé — état actuel

Tout ce qui était listé dans ce fichier est réglé et vérifié en conditions réelles (mini-jeu, chat en direct, amis, avatars, page de profil, page de score). Le schéma `tr_Message` (colonne `idUser` manquante malgré la `FOREIGN KEY`, dans `docker/mariadb/tools/start.sh`) a aussi été corrigé au passage — sans lien direct avec ce contrat mais bloquant tout le reste tant qu'il n'était pas réglé.

Il ne reste qu'un seul point, non bloquant pour l'usage normal de l'app :

1. **Broadcast WS sur suppression d'amitié** (section 3) — à faire côté back.
