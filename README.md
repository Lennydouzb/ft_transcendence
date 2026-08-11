# ft_transcendence

Projet 42 : une web app avec comptes utilisateurs, chat 1-à-1, liste d'amis et un mini-jeu (clic pour marquer des points).

Stack : Next.js (front) + Express/`ws` (back) + MariaDB, le tout derrière nginx (TLS), orchestré par Docker Compose.

## Lancer le projet

```bash
cp docker/example_env docker/.env   # puis remplir DB_USER, DB_PASSWORD, DB_NAME, SECRET, API_TOKEN
make                                 # build + lance tous les services
```

- Front : http://localhost:3000
- API back : http://localhost:8080/api
- Via le reverse-proxy nginx (TLS, config de prod) : https://localhost

```bash
make stop     # arrête les containers
make clean    # stop + supprime les données MariaDB locales
make re       # clean complet + rebuild + relance
make back     # redémarre juste le backend (pas de live-reload sur ce service)
```

Détails d'architecture, conventions de code et bugs connus : voir [`CLAUDE.md`](./CLAUDE.md).
