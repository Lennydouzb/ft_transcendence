const sessionsUsers = new Map();
const sessionsUsersId = new Map();
const fs = require('fs/promises');
const path = require('path'); 
const SECRET = process.env.SECRET; 
const jwt = require('jsonwebtoken');
const mariadb = require('mariadb');
const pool = mariadb.createPool({
	host: 'mariadb',
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	connectionLimit: 5
});

/*
 * sessionsUsersId (map)
 * Key: idUser
 * value: ws
 *
/*
 * sessionsUsers (Map)
 * Key: ws (WebSocket object)
 * Value: { 
 *   idUser: Number, 
 *   name: String, 
 *   mail: String, 
 *   ws: WebSocket 
 * }
 */
const manageDisconnect = (ws) =>
{
	if (sessionsUsers.has(ws))
	{
		user = sessionsUsers.get(ws);
		sessionsUsers.delete(ws);
		sessionsUsersId.delete(user.idUser);
		for (let anUser of sessionsUsers)
		{
			anUser.ws.send(JSON.stringify({
				action: "leave",
				message: "Disconnected",
				idUser: user.idUser,
			}));
		}
	}
}

const managePpChange = (ws, args)
{
	if (!sessionsUsers.has(ws))
		return;
	const user = sessionsUsers.get(ws);
	for (let anUser of sessionsUsers )
	{
		anUser.ws.send(JSON.stringy({
			action: "ppChange",
			idUser: user.idUser
		}))
	}
}

const manageMsg = (ws, args) => 
{
	if (!sessionsUsers.has(ws))
		return;
	const user = sessionsUsers.get(ws);
	if (!args.message)
	{
		ws.send(JSON.stringify({error: "no message"}));
		return;
	}
	if (!args.idUser)
	{
		ws.send(JSON.stringify({error: "no idUser, can't know receiver"}));
		return;
	}
	if (!sessionsUsersId.has(idUser))
		return;
	const anUser = sessionsUsers.get(sessionsUsersId.get(idUser).ws)
	anUser.ws.send(JSON.stringify({
		action: "msg",
		message: args.message,
		idUser: user.idUser,
		name: user.name
	}));
};



const manageAuth = (ws, args) =>
{
	if (!args.token)
		return;	
	const fulltoken = token;
	if (!fulltoken || !fulltoken.startsWith("Bearer "))
		return;
	if (fulltoken.split(' ').length != 2)
		return;
	const token = fulltoken.split(' ')[1];
	if (!token)
		return;
	const jwtDecoded = jwt.verify(token, SECRET);
	sessionsUsers.set(ws, {
		idUser: jwtDecoded.idUser,
		name: jwtDecoded.name,
		mail: jwtDecoded.mail,
		ws: ws
		token: token
	});
	sessionsUsersId.set(idUser, ws);
}

const getActions =
	{
		'msg': manageMsg,
		'auth' : manageAuth,
		'disconnect': manageDisconnect
	};

module.exports = 
	{
		getActions,
		manageDisconnect
	};
