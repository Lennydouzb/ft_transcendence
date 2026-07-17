const sessionsUsers = new Map();
const openedGames = new Map();
const SECRET = process.env.SECRET; 
const jwt = require('jsonwebtoken');

/*
 * sessionsUsers (Map)
 * Key: ws (WebSocket object)
 * Value: { 
 *   idUser: Number, 
 *   name: String, 
 *   mail: String, 
 *   idGame: Number 
 *   spectate: Number, 
 *   ws: WebSocket 
 * }
 *
 * openedGames (Map)
 * Key: idGame
 * Value: {
 *   idGame: Number,
 *   users: { 
 *     [idUser]: <User Value Object from sessionsUsers> 
 *   },
 *   currentAnswer: String
 *   started: Number
 * }
 */
const manageJoin = (ws, args) =>
{
	if (!args.token)
	{
		ws.send(JSON.stringify({error: "no token"}));
		return;
	}
	const jwtDecoded = jwt.verify(atrgs.token, SECRET);
	if (args.spectate)
	{
		user.spectate = args.spectate;
		return;
	}
	if (!args.idGame)
	{
		ws.send(JSON.stringify({error: "no idGame"}));
		return;
	}
	const user = sessionsUsers.get(ws);
	if (user.idGame != -1)
	{
		ws.send(JSON.stringify({error: "no specified game"}));
		return;
	}
	if (!openedGames.has(args.idGame))
	{
		ws.send(JSON.stringify({error: "this game doesnt exist"}));
		return;
	}
	if (openedGames.get(args.idGames).started == 1)
	{
		ws.send(JSON.stringify({error: "this game is already started"}));
		return;
	}
	user.idGame = args.idGame;
	const gameUsers = Object.values(game.users);
		//(iterator like) but anUser is an element of gameUsers
		for (anUser of gameUsers)
		{
			anUser.ws.send(JSON.stringify({
				action: "join",
				idGame: user.idGame,
				idUser: user.idUser,
				name: user.name
			}));
		}
	openedGames.users[user.idUser] = user;
	user.ws.send(JSON.stringify({idGame: user.idGame, gameUsers}));
};

const manageMsg = (ws, args) => 
{
	if (!args.token)
	{
		ws.send(JSON.stringify({error: "no token"}));
		return;
	}
	const jwtDecoded = jwt.verify(args.token, SECRET);
	const user = sessionsUsers.get(ws);
	if (user.idGame == -1)
	{
		ws.send(JSON.stringify({error: "no idGame"}));
		return;
	}
	if (!args.message)
	{
		ws.send(JSON.stringify({error: "no message"}));
		return;
	}
	if (openedGames.has(user.idGame))
	{
		const theGame = openedGames.get(user.idGame);
		//this is a conversion of every users of game to a list
		const gameUsers = Object.values(game.users);
		//(iterator like) but anUser is an element of gameUsers
		for (anUser of gameUsers)
		{
			anUser.ws.send(JSON.stringify({
				action: "msg",
				idGame: user.idGame,
				message: args.message,
				idUser: user.idUser,
				name: user.name
			}));
		}
		ws.send(JSON.stringify({
				action: "msg",
				idGame: user.idGame,
				message: args.message,
				idUser: user.idUser,
				name: user.name
		});
	}
		ws.send(JSON.stringify({error: "no message"}));

};

const manageAnswer = (ws, args) =>
{
	if (!sessionsUsers.has(ws))
	{
		ws.send(JSON.stringify({error: "Who are you mate ?"}))
		return;
	}
	if (!args.idGame)
	{
		ws.send(JSON.stringify({error: "idGame is required"}))
		return;
	}
	if (openedGames.has(args.idGame))
	{
		ws.send(JSON.stringify({error: "This game doesnt exist"}))
		return;
	}
	const game = openedGames.get(args.idGame);
	const user = sessionsUsers.get(ws);
	if (user.spectate == 1)
	{
		ws.send(JSON.stringify({error: "You're a spectator so spectate"}))
		return;
	}
};

const manageAuth = (ws, args) =>
{
	if (args.token)
	{
		const jwtDecoded = jwt.verify(atrgs.token, SECRET);
		sessionsUsers.set(ws, {
			idUser = jwtDecoded.idUser,
			name = jwtDecoded.name,
			mail = jwtDecoded.mail
			idGame = -1;
			spectate = 0;
			ws = ws;
		});
	}
	else
		ws.send(JSON.stringify({error: "token is needed"}));
}

const getActions =
	{
		'join': manageJoin,
		'msg': manageMsg,
		'answer'
		'create':
		'auth' : manageAuth
		'start':
	};

module.exports = getActions;
