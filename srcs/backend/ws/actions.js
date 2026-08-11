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

let gameActive = 0;
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
		const user = sessionsUsers.get(ws);
		sessionsUsers.delete(ws);
		sessionsUsersId.delete(user.idUser);
		for (const anUser of sessionsUsers.values())
		{
			anUser.ws.send(JSON.stringify({
				action: "leave",
				message: "Disconnected",
				idUser: user.idUser,
			}));
		}
	}
}

const managePpChange = (ws, args) =>
{
	if (!sessionsUsers.has(ws))
		return;
	const user = sessionsUsers.get(ws);
	for (const anUser of sessionsUsers.values() )
	{
		anUser.ws.send(JSON.stringify({
			action: "ppChange",
			idUser: user.idUser
		}))
	}
}

const manageMsg = async (ws, args) => {
    if (!sessionsUsers.has(ws))
        return;
    const user = sessionsUsers.get(ws);
    
    if (!args.message) {
        ws.send(JSON.stringify({error: "no message"}));
        return;
    }
    if (args.message.length > 100) {
        ws.send(JSON.stringify({error: "message too long"}));
        return;
    }
    if (!args.idUser) {
        ws.send(JSON.stringify({error: "no idUser, can't know receiver"}));
        return;
    }
    
    let conn;
    try {
        conn = await pool.getConnection();
        let sqlQuery = "insert into tr_Message (content, idUser) values (?, ?)";
        let rows = await conn.query(sqlQuery, [args.message, user.idUser]);
        
        sqlQuery = "insert into tr_Chat (idUser, idUser_1, idMessage) values (?, ?, ?)";
        await conn.query(sqlQuery, [user.idUser, args.idUser, rows.insertId]);
        if (sessionsUsersId.has(args.idUser)) {
            const anUser = sessionsUsers.get(sessionsUsersId.get(args.idUser));  
            anUser.ws.send(JSON.stringify({
                action: "msg",
                message: args.message,
                idUser: user.idUser,
                name: user.name
            }));
        }
    } catch (err) {
        console.error("Database error:", err);
        ws.send(JSON.stringify({success: false, message: "The database doesn't work"}));
    } finally {
        if (conn) conn.release();
    }
};

const manageAuth = (ws, args) =>
{
	if (!args.token)
		return;	
	const fulltoken = args.token;
	if (!fulltoken || !fulltoken.startsWith("Bearer "))
		return;
	const parts = fulltoken.split(' ');
	if (parts.length !== 2)
		return;
	const token = parts[1];
	if (!token)
		return;
	try {
		const jwtDecoded = jwt.verify(token, SECRET);
		sessionsUsers.set(ws, {
			idUser: jwtDecoded.idUser,
			name: jwtDecoded.name,
			mail: jwtDecoded.mail,
			ws,
			token
		});
		sessionsUsersId.set(jwtDecoded.idUser, ws);
	} catch (err) {
		ws.close(4001, "Invalid token");
	}

}

const manageClick = async (ws, args) =>
{
	if (!args.token)
		return;
	const fulltoken = args.token;
	if (!fulltoken || !fulltoken.startsWith("Bearer "))
		return;
	const parts = fulltoken.split(' ');
	if (parts.length !== 2)
		return;
	const token = parts[1];
	if (!token)
		return;
	if (sessionsUsers.has(ws))
	{
		try {
			const jwtDecoded = jwt.verify(token, SECRET);
			if (gameActive != 1)
			{
				ws.send(JSON.stringify({action: "clickResult", success: false, message: "Missed"}));
				return;
			}
			// consomme le bouton avant tout `await` : le premier clic à passer ici gagne
			gameActive = 0;
			for (const anUser of sessionsUsers.values())
			{
				anUser.ws.send(JSON.stringify({ action: "gone" }));
			}
			let conn;
			try {
				conn = await pool.getConnection();
				await conn.query("update tr_User set scoreTotal = scoreTotal + 100 where idUser = ?", [jwtDecoded.idUser]);
				const rows = await conn.query("select scoreTotal from tr_User where idUser = ?", [jwtDecoded.idUser]);
				ws.send(JSON.stringify({action: "clickResult", success: true, scoreTotal: rows[0].scoreTotal}));
			} catch (err) {
				console.error("Database error:", err);
				ws.send(JSON.stringify({action: "clickResult", success: false, message: "The database didn't want you to win"}));
			} finally {
				if (conn) conn.release();
			}
		} catch (err) {
			ws.close(4001, "Invalid token");
		}
	}
}

const startRandomRenderLoop = () => {
	const min = 5000;
	const max = 15000;
	const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;

	setTimeout(() => {
		gameActive = 0;
		for (const anUser of sessionsUsers.values()) {
			anUser.ws.send(JSON.stringify({
				action: "gone"
			}));
		}

		gameActive = 1;
		for (const anUser of sessionsUsers.values()) {
			anUser.ws.send(JSON.stringify({
				action: "spawn"
			}));
		}

		startRandomRenderLoop();
	}, randomDelay);
};

const notifyUser = (idUser, payload) => 
{
	if (sessionsUsersId.has(idUser));
	{
		const anUser = sessionsUsersId.get(idUser);
        anUser.ws.send(JSON.stringify(payload));
	}
};

const getActions =
	{
		'msg': manageMsg,
		'auth' : manageAuth,
		'disconnect': manageDisconnect,
		'ppChange' : managePpChange,
		'click' : manageClick
	};

module.exports = 
	{
		getActions,
		manageDisconnect,
		startRandomRenderLoop,
		notifyUser
	};
