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
   scoreTotal INT,
   totalWin	INT,
   PRIMARY KEY(idUser),
   UNIQUE(mail)
);

CREATE TABLE tr_Friend(
	idUser INT,
	idUser1 INT,
	PRIMARY KEY (idUser,idUser1),
	FOREIGN KEY (idUser) REFERENCES tr_User(idUser),
	FOREIGN KEY (idUser1) REFERENCES tr_User(idUser)
);

CREATE TABLE tr_Game(
   idGame INT AUTO_INCREMENT,
   name VARCHAR(50),
   PRIMARY KEY(idGame)
);

CREATE TABLE tr_Project(
   idProject INT AUTO_INCREMENT,
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
);

insert into tr_Project (name) values ('libft'), ('ft_printf'), ('get_next_line'), ('fdf'), ('so_long'), ('fract-ol'), ('minitalk'), ('pipex'), ('push_swap'), ('minishell'), ('philosophers'), ('netpractice'), ('cub3d'), ('minirt');
insert into tr_Project (name) values ('cpp00'),('cpp01'),('cpp02'),('cpp03'),('cpp04'),('cpp05'),('cpp06'),('cpp07'),('cpp08'),('cpp09');
insert into tr_Project (name) values ('inception'), ('ft_irc'), ('webserv'), ('ft_transcendence');"
mysqladmin -u root shutdown
exec mysqld --user=mysql
