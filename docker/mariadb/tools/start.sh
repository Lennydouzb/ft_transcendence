#!/bin/bash

service mariadb start

while ! mysqladmin ping --silent; do
    sleep 1
done
mariadb -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
mariadb -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';"
mariadb -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%' WITH GRANT OPTION;"
mariadb -e "FLUSH PRIVILEGES;"
mariadb -u $DB_USER -p${DB_PASSWORD} ${DB_NAME} -e "
CREATE TABLE tr_User(
   idUser INT AUTO_INCREMENT,
   mail VARCHAR(50),
   password CHAR(60),
   name VARCHAR(50),
   profile_picture VARCHAR(50),
   PRIMARY KEY(idUser),
   UNIQUE(mail)
);

CREATE TABLE tr_Game(
   idGame INT AUTO_INCREMENT,
   name VARCHAR(50),
   PRIMARY KEY(idGame)
);

CREATE TABLE tr_Project(
   idProject INT AUTO_INCREMENT,
   github_link VARCHAR(150) NOT NULL,
   name VARCHAR(50),
   PRIMARY KEY(idProject)
);

CREATE TABLE tr_Participate(
   idUser INT,
   idGame INT,
   PRIMARY KEY(idUser, idGame),
   FOREIGN KEY(idUser) REFERENCES tr_User(idUser),
   FOREIGN KEY(idGame) REFERENCES tr_Game(idGame)
);

CREATE TABLE tr_Question(
   idGame INT,
   idProject INT,
   PRIMARY KEY(idGame, idProject),
   FOREIGN KEY(idGame) REFERENCES tr_Game(idGame),
   FOREIGN KEY(idProject) REFERENCES tr_Project(idProject)
);"
mysqladmin -u root shutdown
exec mysqld --user=mysql
