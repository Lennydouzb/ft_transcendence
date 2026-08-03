const sessionsUsers = new Map();
const openedGames = new Map();
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

async function verifyProjectsExist (projectsArray){
	if (!Array.isArray(projectsArray) || projectsArray.length === 0) {
		return false;
	}

	let conn;
	try {
		conn = await pool.getConnection();

		const placeholders = projectsArray.map(() => '?').join(',');

		// gotta put ` instead of '  for the ${placeholders}
		const sqlQuery = `select idProject from tr_Project where idProject in (${placeholders})`;
		const rows = await conn.query(sqlQuery, projectsArray);

		return rows.length === projectsArray.length;

	} catch (err) {
		console.error("database error", err);
		return false;
	} finally {
		if (conn) conn.release();
	}
};

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
 *	 projects:
 *	 {
 *		[idProject]: link
 *	 },
 *   currentAnswer: String,
 *   started: Number,
 *   Qduration: Number,
 *   canAnswer,
 *   host: String,
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
	const user = sessionsUsers.get(ws);
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
	if (openedGames.get(args.idGame).started == 1)
	{
		ws.send(JSON.stringify({error: "this game is already started"}));
		return;
	}
	const game = openedGames.get(args.idGame);
	user.idGame = args.idGame;
	const gameUsers = Object.values(game.users);
	//(iterator like) but anUser is an element of gameUsers
	for (let anUser of gameUsers)
	{
		anUser.ws.send(JSON.stringify({
			action: "join",
			idGame: user.idGame,
			idUser: user.idUser,
			spectate : user.spectate,
			name: user.name
		}));
	}
	game.users[user.idUser] = user;
	user.ws.send(JSON.stringify({action: 'selfjoin', idGame: user.idGame, gameUsers}));
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
		const game = openedGames.get(user.idGame);
		//this is a conversion of every users of game to a list
		const gameUsers = Object.values(game.users);
		//(iterator like) but anUser is an element of gameUsers
		for (let anUser of gameUsers)
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
		}));
	}
	else
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
				let scoreCalc = 15 - game.Qduration;
				scoreCalc = Math.round(scoreCalc);
				user.score += scoreCalc;
				user.hasAnswered = 1;
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
			idUser: jwtDecoded.idUser,
			name: jwtDecoded.name,
			mail: jwtDecoded.mail,
			idGame: -1,
			spectate: 0,
			ws: ws,
			score: 0,
			hasAnswered: 0
		});
	}
	else
		ws.send(JSON.stringify({error: "token is needed"}));
}

const manageCreate = async (ws, args) =>
{
	if (args.token)
	{
		if (args.idGame)
		{
			if (args.name)
			{
				if (args.projects)
				{
					if (!Array.isArray(args.projects) || args.projects.length === 0)
					{
						ws.send(JSON.stringify({ success: false, message: "projects are required" }));
					}
					if (!( await verifyProjectsExist(args.projects)))
					{
						ws.send(JSON.stringify({ success: false, message: "there is an inexistant project" }));
					}
					const jwtDecoded = jwt.verify(args.token, SECRET);
					if (sessionsUsers.has(ws))
					{
						const user = sessionsUsers.get(ws);
						if (user.idGame == -1)
						{
							let conn;
							try {
								conn = await pool.getConnection();
								const sqlQuery = "insert into tr_Game (name) values(?)";
								const rows = await conn.query(sqlQuery, [args.name]);
								user.idGame = rows.insertId;
								openedGames.set(user.idGame, {
									idGame: user.idGame,
									users: {
										[user.idUser]: user
									},
									projects: args.projects,
									currentAnswer: null,
									started: 0,
									Qduration: 15,
									host : user.idUser,
								})
								manageJoin(ws, {idGame: user.idGame, token: args.token });
							} catch (err) {
								console.error("Database error:", err);
							} finally {
								if (conn) conn.release();
							}
						}
						else
							ws.send(JSON.stringify({error: "user not in a game"}));
					}
					else
						ws.send(JSON.stringify({error: "User doesnt exist"}));
				}
				else
					ws.send(JSON.stringify({error: "projects are required"}));
			}
			else
				ws.send(JSON.stringify({error: "name is required"}));
		}
		else
			ws.send(JSON.stringify({error: "idGame is required"}));
	}
	else
		ws.send(JSON.stringify({error: "token is needed"}));
}


function shuffleProjects(game) {
	for (let i = game.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[game[i], game[j]] = [game[j], game[i]];
	}
	return game;
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
					const game = openedGames.get(user.idGame);
					if (game.host != user.idUser)
					{
						ws.send(JSON.stringify({error: "You're not host"}));
						return;
					}
					//this is a conversion of every users of game to a list
					const gameUsers = Object.values(game.users);
					//(iterator like) but anUser is an element of gameUsers
					for (let anUser of gameUsers)
					{
						anUser.ws.send(JSON.stringify({
							action: "start",
							idGame: user.idGame,
						}));
					}
					shuffleProjects(game);
					startQuestion(game);
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
		'create': manageCreate,
		'auth' : manageAuth,
		'start':manageStart
	};


function	allAnswered(game)
{
	const gameUsers = Object.values(game.users);
	//(iterator like) but anUser is an element of gameUsers
	for (let anUser of gameUsers)
	{
		if (anUser.hasAnswered == 0)
			return false;
	}
	return true;
}

async function startQuestion(game)
{
	if (game.projects.length != 0)
	{
		const file = path.join(__dirname, game.projects[game.projects.length - 1].link);
		const code = await fs.readFile(file, 'utf-8').split('\n');
		let	index = code.length/2;
		let line = code[index];
		game.currentAnswer = game.projects[0].link;
		game.Qduration = 0;
		const gameUsers = Object.values(game.users);
		for (let anUser of gameUsers)
		{
			anUser.hasAnswered = 0;
		}
		const interval = setInterval(() => {
			const gameUsers = Object.values(game.users);
			//(iterator like) but anUser is an element of gameUsers
			for (let anUser of gameUsers)
			{
				anUser.ws.send(JSON.stringify({
					action: "timerUpdate", // client should -1 the timer for this one
					idGame: user.idGame,
					question: line,
					index: index
				}));
			}
			game.Qduration += 1;
			let	index = Math.floor(Math.random() * (code.length));
			let line = code[index];
			if (allAnswered(game) || Qduration == 15)
			{
				game.started = 0;
				clearInterval(interval);
				setTimeout(() => {

					for (let anUser of gameUsers)
					{
						anUser.ws.send(JSON.stringify({
							action: "answer", 
							idGame: user.idGame,
							answer: game.currentAnswer,
						}));
					}, 2000);
				game.projects.pop();
				startQuestion(game);
			}
			}, 1000);
		}
	}
	else
	{
		const gameUsers = Object.values(game.users);
		let winner = null;
		for (let anUser of gameUsers)
		{
			if (winner)
			{
				if (winner.score < anUser.score)
					winner = anUser;
			}
			else
				winner = anUser;
		}
		for (let anUser of gameUsers)
		{
			anUser.ws.send(JSON.stringify({
				action: "winner",
				idGame: user.idGame,
				winner: winner
			}));

		}
	}
}
module.exports = getActions;
