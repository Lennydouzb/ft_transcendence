#!/bin/bash

service mariadb start

while ! mysqladmin ping --silent; do
    sleep 1
done
mariadb -e "CREATE DATABASE IF NOT EXISTS ft_transcendence;"
mariadb -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';"
mariadb -e "GRANT ALL PRIVILEGES ON ft_transcendence.* TO '${DB_USER}'@'%' WITH GRANT OPTION;"
mariadb -e "FLUSH PRIVILEGES;"
mariadb -u $DB_USER -p ft_transcendence -e "
CREATE TABLE tr_User(
   idUser INT,
   email VARCHAR(50),
   password VARCHAR(50),
   name VARCHAR(50),
   profile_picture VARCHAR(50),
   PRIMARY KEY(idUser),
   UNIQUE(email)
);

CREATE TABLE tr_Game(
   idGame INT,
   date_ DATE,
   name VARCHAR(50),
   settings VARCHAR(200),
   PRIMARY KEY(idGame)
);

CREATE TABLE tr_Project(
   idProject INT,
   lien_github VARCHAR(150) NOT NULL,
   PRIMARY KEY(idProject)
);

CREATE TABLE tr_Participate(
   idUser INT,
   idGame INT,
   score VARCHAR(50),
   spectator LOGICAL,
   PRIMARY KEY(idUser, idGame),
   FOREIGN KEY(idUser) REFERENCES tr_User(idUser),
   FOREIGN KEY(idGame) REFERENCES tr_Game(idGame)
);

CREATE TABLE tr_questions(
   idGame INT,
   idProject INT,
   PRIMARY KEY(idGame, idProject),
   FOREIGN KEY(idGame) REFERENCES tr_Game(idGame),
   FOREIGN KEY(idProject) REFERENCES tr_Project(idProject)
);"
mysqladmin -u root shutdown
exec mysqld --user=mysql
