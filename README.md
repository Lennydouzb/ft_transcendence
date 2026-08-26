# ft_transcendence

42 school project: a web app with user accounts, 1-to-1 chat, a friends list, and a click-to-score mini-game.

Stack: Next.js (front) + Express/`ws` (back) + MariaDB, all behind nginx (TLS), orchestrated by Docker Compose.

## Running the project

```bash
cp docker/example_env docker/.env   # then fill in DB_USER, DB_PASSWORD, DB_NAME, SECRET, API_TOKEN
make                                 # build + start all services
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- Via the nginx reverse proxy (TLS, prod config): https://localhost

```bash
make stop     # stop the containers
make clean    # stop + remove local MariaDB data
make re       # full clean + rebuild + restart
make back     # restart just the backend (no live-reload for this service)
```

Architecture details, code conventions, and known bugs: see [`CLAUDE.md`](./CLAUDE.md).
