CREATE TABLE tr_User(
   id INT,
   email VARCHAR(50),
   password VARCHAR(50),
   name VARCHAR(50),
   profile_picture VARCHAR(50),
   PRIMARY KEY(id),
   UNIQUE(email)
);

CREATE TABLE tr_Game(
   id INT,
   date_ DATE,
   name VARCHAR(50),
   settings VARCHAR(200),
   PRIMARY KEY(id)
);

CREATE TABLE tr_Participate(
   id INT,
   id_1 INT,
   score VARCHAR(50),
   spectator LOGICAL,
   PRIMARY KEY(id, id_1),
   FOREIGN KEY(id) REFERENCES tr_User(id),
   FOREIGN KEY(id_1) REFERENCES tr_Game(id)
);
