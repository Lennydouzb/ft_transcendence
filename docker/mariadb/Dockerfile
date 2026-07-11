FROM debian:bookworm

RUN apt update -y && apt upgrade -y && apt install -y mariadb-server mariadb-client gettext-base

EXPOSE 3306
COPY ./conf/50-server.cnf /etc/mysql/mariadb.conf.d/50-server.cnf

COPY ./tools/start.sh ./
RUN chmod +x start.sh

ENTRYPOINT ["./start.sh"]
