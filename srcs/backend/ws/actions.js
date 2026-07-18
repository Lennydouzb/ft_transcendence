const sessionsUsers = new Map();
const openedGames = new Map();
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
 * sessionsUsers (Map)
 * Key: ws (WebSocket object)
 * Value: { 
 *   idUser: Number, 
 *   name: String, 
 *   mail: String, 
 *   idGame: Number 
 *   spectate: Number, 
 *   ws: WebSocket 
 *   score: Number,
 *   hasAnswered: Number
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
 *   currentPoint : Number
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
	const jwtDecoded = jwt.verify(args.token, SECRET);
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
		ws.send(JSON.stringify({error: "Who are you mate ?"}));
		return;
	}
	if (!args.idGame)
	{
		ws.send(JSON.stringify({error: "idGame is required"}));
		return;
	}
	if (!openedGames.has(args.idGame))
	{
		ws.send(JSON.stringify({error: "This game doesnt exist"}));
		return;
	}
	const game = openedGames.get(args.idGame);
	const user = sessionsUsers.get(ws);
	if (user.spectate == 1)
	{
		ws.send(JSON.stringify({error: "You're a spectator so spectate"}));
		return;
	}
	if (user.hasAnswered == 1)
		return;
	if (args.answer)
	{
		if (game.started == 1)
		{
			if (game.currentAnswer == args.answer)
			{
				user.score += game.currentPoint;
				user.hasAnswered = 1;
				if (game.currentPoint > 1)
					game.currentPoint -= 1;
				const gameUsers = Object.values(game.users);
				for (let anUser of gameUsers) {
					anUser.ws.send(JSON.stringify({
						action: "score_update",
						idUser: user.idUser,
						score: user.score
					}));
				}
			}
		}
	}
	else
		ws.send(JSON.stringify({error: "answer is required"}));
};

const manageAuth = (ws, args) =>
{
	if (args.token)
	{
		const jwtDecoded = jwt.verify(args.token, SECRET);
		sessionsUsers.set(ws, {
			idUser = jwtDecoded.idUser,
			name = jwtDecoded.name,
			mail = jwtDecoded.mail
			idGame = -1;
			spectate = 0;
			ws = ws;
			score = 0
			hasAnswered = 0;
		});
	}
	else
		ws.send(JSON.stringify({error: "token is needed"}));
}

const manageCreate = async (ws, args) =>
{
	if (args.token)
	{
		const jwtDecoded = jwt.verify(args.token, SECRET);
		if (args.idGame)
		{
			if (args.name)
			{
				if (sessionsUsers.has(ws))
				{
					const user = sessionsUsers.get(ws);
					if (user.idGame == -1)
					{
						let conn;
						try {
							conn = await pool.getConnection();
							const sqlQuery = "insert into tr_Game (name) values(?)";
							const rows = await conn.query(sqlQuery, [name]);
							res.status(200).json({success: true, idGame: rows.insertId});
							user.idGame = rows.insertId;
						} catch (err) {
							console.error("Database error:", err);
							res.status(500).json({ 
								success: false, 
								message: 'cant connect', 
								error: err.message 
							});
						} finally {
							if (conn) conn.release();
						}
					}catch(err)
					{
						return res.status(401).json({ success: false, message: "invalid or expired jwt" });
					}

				}
				else
					ws.send(JSON.stringify({error: "name is required"}));
			}
			else
				ws.send(JSON.stringify({error: "user already in a game"}));
		}
	}
	else
		ws.send(JSON.stringify({error: "idGame is required"}));

}
else
	ws.send(JSON.stringify({error: "token is needed"}));
}

const manageStart = (ws, args) =>
{

	if (args.token)
	{
		const jwtDecoded = jwt.verify(args.token, SECRET);
		if (sessionsUsers.has(ws))
		{
			const user = sessionsUsers.get(ws);
			if (user.idGame != -1)
			{
				if (openedGames.has(user.idGame))
				{
					const theGame = openedGames.get(user.idGame);
					if (theGame.host != user.idGame)
					{
						ws.send(JSON.stringify({error: "You're not host"}));
						return;
					}
					//this is a conversion of every users of game to a list
					const gameUsers = Object.values(game.users);
					//(iterator like) but anUser is an element of gameUsers
					for (anUser of gameUsers)
					{
						anUser.ws.send(JSON.stringify({
							action: "start",
							idGame: user.idGame,
						}));
					}
				}
				else
					ws.send(JSON.stringify({error: "this game doesnt exist"}));
			}
			else
				ws.send(JSON.stringify({error: "You are not in a game room"}));
		}
		else
			ws.send(JSON.stringify({error: "You are not registered in the server how did you get the token"}));
	}
	else
		ws.send(JSON.stringify({error: "requires token"}));
}

const getActions =
	{
		'join': manageJoin,
		'msg': manageMsg,
		'answer': manageAnswer,
		'create':
		'auth' : manageAuth,
		'start':manageStart
	};

module.exports = getActions;
