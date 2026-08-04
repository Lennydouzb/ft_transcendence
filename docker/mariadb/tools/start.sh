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
   idUser INT,
   name VARCHAR(50),
   mail VARCHAR(50) NOT NULL,
   password VARCHAR(60) NOT NULL,
   profilePicture VARCHAR(50),
   scoreTotal INT,
   PRIMARY KEY(idUser),
   UNIQUE(mail)
);

CREATE TABLE tr_Message(
   idMessage VARCHAR(50),
   content VARCHAR(100) NOT NULL,
   sendDate DATETIME DEFAULT CURRENT_TIMESTAMP,
   idUser INT NOT NULL,
   PRIMARY KEY(idMessage),
   FOREIGN KEY(idUser) REFERENCES tr_User(idUser)
);

CREATE TABLE tr_Friend(
   idUser INT,
   idUser_1 INT,
   PRIMARY KEY(idUser, idUser_1),
   FOREIGN KEY(idUser) REFERENCES tr_User(idUser),
   FOREIGN KEY(idUser_1) REFERENCES tr_User(idUser)
);

CREATE TABLE tr_Chat(
   idUser INT,
   idUser_1 INT,
   idMessage VARCHAR(50),
   PRIMARY KEY(idUser, idUser_1, idMessage),
   FOREIGN KEY(idUser) REFERENCES tr_User(idUser),
   FOREIGN KEY(idUser_1) REFERENCES tr_User(idUser),
   FOREIGN KEY(idMessage) REFERENCES tr_Message(idMessage)
);"
mysqladmin -u root shutdown
exec mysqld --user=mysql
