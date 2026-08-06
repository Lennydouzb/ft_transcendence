const express = require('express');
const mariadb = require('mariadb');
const websocket = require('ws');
const {getActions, manageDisconnect} = require('./ws/actions');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const http = require('http');
BigInt.prototype.toJSON = function ()
{
	return Number(this);
}
const upload = multer({ dest: 'uploads/' });
const salt = 10;
const app = express();
const server = http.createServer(app);
const ws = new websocket.Server({server});
const SECRET = process.env.SECRET; 
//this is to read json
app.use(express.json());
const PORT = 8080;

const pool = mariadb.createPool({
	host: 'mariadb',
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	connectionLimit: 5
});

// (CORS)
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT , DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	if (req.method === 'OPTIONS') {
		return res.sendStatus(204);
	}
	next();
});

/*
 * -----------------------------------------------------------------------
 * -			api for retrieving infos (no need to be logged)          -
 * -----------------------------------------------------------------------
*/
app.get('/api/test', (req, res) => {
	res.json({ success: true, message: "Backend running"});
});

app.get('/api/test-db', async (req, res) => {
	let conn;
	try {
		conn = await pool.getConnection();
		const rows = await conn.query("SELECT VERSION() as version");
		res.json({ 
			success: true, 
			message: "DB Connection working", 
			version_bdd: rows[0].version 
		});
	} catch (err) {
		console.error("Database error:", err);
		res.status(500).json({ 
			success: false, 
			message: "cant connect", 
			error: err.message 
		});
	} finally {
		if (conn) conn.release();
	}
});
/*
 *this should return something like this
 {
 idMessage,
 content,
 sendDate,
 idUser,
 idUser_1
 }
 one of the two id is the user who made the request

this endpoint should be called to load messages on connection
*/


/*every next api return object properties are based on the request entries*/ 
app.post('/api/getConvos', async (req, res) => {
	const fulltoken = req.headers.authorization;
	if (!fulltoken || !fulltoken.startsWith("Bearer "))
	{
		return res.status(400).json({ success: false, message: "token is required and should start with 'Bearer '" });
	}
	if (fulltoken.split(' ').length != 2)
	{
		return res.status(400).json({ success: false, message: "token should start with 'Bearer '" });
	}
	const token = fulltoken.split(' ')[1];
	try{
		const jwtDecoded = jwt.verify(token, SECRET);
		let conn;
		try {
			conn = await pool.getConnection();
			const sqlQuery = "select tr_Message.idMessage, content, sendDate, tr_Chat.idUser, tr_Chat.idUser_1 from tr_Message join tr_Chat on tr_Message.idMessage = tr_Chat.idMessage where tr_Chat.idUser = ? or tr_Chat.idUser_1 = ?";
			const rows = await conn.query(sqlQuery, [jwtDecoded.idUser, jwtDecoded.idUser]);
			res.status(200).json({success: true});
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
		if (err.name === "TokenExpiredError")
			return res.status(401).json({ success: false, message: "expired jwt" });
		else
			return res.status(403).json({ success: false, message: "invalid jwt" });
	}

});


app.get('/api/getUser', async (req, res) => {
	const { idUser} = req.body;
	if (!idUser)
		return res.status(400).json({ success: false, message: "idUser is required" });
	let conn;
	try {
		conn = await pool.getConnection();
		const sqlQuery = "SELECT idUser, name, mail, profilePicture, scoreTotal from tr_User where idUser = ?";
		const rows = await conn.query(sqlQuery, [idUser]);
		res.json(rows);	
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
});

app.get('/api/users', async (req, res) => {
	let conn;
	try {
		conn = await pool.getConnection();
		const rows = await conn.query("SELECT idUser, name, mail, profilePicture, scoreTotal from tr_User");
		res.json(rows);	
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
});

/*
 * -----------------------------------------------------------------------
 * -			Api to log update and create infos                       -
 * -----------------------------------------------------------------------
*/


app.post('/api/createUser', async (req, res) => {
	const { nameA, password, mail} = req.body;

	if (!nameA) {
		return res.status(400).json({ success: false, message: "name is required" });
	}
	if (!password) {
		return res.status(400).json({ success: false, message: "password is required" });
	}
	if (!mail) {
		return res.status(400).json({ success: false, message: "mail is required" });
	}
	let conn;
	try {
		conn = await pool.getConnection();
		const hashedPass = await bcrypt.hash(password, salt);
		const sqlQuery = "insert into tr_User (mail, password, name, scoreTotal)values (?, ?, ?, 0)";
		const rows = await conn.query(sqlQuery, [mail, hashedPass, nameA]);
		const token = jwt.sign(
			{ 
				idUser: rows.insertId,
				name : nameA
			},
			SECRET,
			{expiresIn: "24h"}
		);
		res.json({success: true, token: token});    
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
});

app.post('/api/login', async (req, res) => {
	const {mail, password} = req.body;
	if (!password) {
		return res.status(400).json({ success: false, message: "password is required" });
	}
	if (!mail) {
		return res.status(400).json({ success: false, message: "mail is required" });
	}
	let conn;
	try {
		conn = await pool.getConnection();
		const sqlQuery = "select password, idUser, name from tr_User where mail = ?";
		const rows = await conn.query(sqlQuery, [mail]);
		if (rows.length === 0)
		{
			return res.status(401).json({error: "Incorrect mail or password"});
		}
		const isCorrect = await bcrypt.compare(password, rows[0].password);
		if (!isCorrect)
		{
			return res.status(401).json({error: "Incorrect mail or password"});
		}	
		const token = jwt.sign(
			{
				idUser: rows[0].idUser,
				name : rows[0].name
			},
			SECRET,
			{expiresIn: "24h"}
		);
		res.json({success: true, token: token});    
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
});

/*
 * ------------------------------------------------------
 * -                     Modfying                       -
 * ------------------------------------------------------
*/

app.put('/api/updateUserName', async (req, res) => {
	const { name } = req.body;
	const fulltoken = req.headers.authorization;
	if (!fulltoken || !fulltoken.startsWith("Bearer "))
	{
		return res.status(400).json({ success: false, message: "token is required and should start with 'Bearer '" });
	}
	if (fulltoken.split(' ').length != 2)
	{
		return res.status(400).json({ success: false, message: "token should start with 'Bearer '" });
	}
	const token = fulltoken.split(' ')[1];

	if (!name) {
		return res.status(400).json({ success: false, message: "name is required" });
	}
	try{
		const jwtDecoded = jwt.verify(token, SECRET);
		let conn;
		try {
			conn = await pool.getConnection();
			const sqlQuery = "update tr_User set name = ? where idUser = ?";
			const rows = await conn.query(sqlQuery, [name, jwtDecoded.idUser]);
			res.status(200).json({success: true});
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
		if (err.name === "TokenExpiredError")
			return res.status(401).json({ success: false, message: "expired jwt" });
		else
			return res.status(403).json({ success: false, message: "invalid jwt" });
	}
});


app.put('/api/updateUserImage/', upload.single('img'), async (req, res) => {
	const fulltoken = req.headers.authorization;
	if (!fulltoken || !fulltoken.startsWith("Bearer "))
	{
		return res.status(400).json({ success: false, message: "token is required and should start with 'Bearer '" });
	}
	if (fulltoken.split(' ').length != 2)
	{
		return res.status(400).json({ success: false, message: "token should start with 'Bearer '" });
	}
	const token = fulltoken.split(' ')[1];
	if (!req.file)
	{
		return res.status(400).json({ success: false, message: "file is required" });
	}
	try{
		const jwtDecoded = jwt.verify(token, SECRET);
		let conn;
		try {
			conn = await pool.getConnection();
			const sqlQuery = "select profilePicture from tr_User where idUser = ?";
			const rows = await conn.query(sqlQuery, [jwtDecoded.idUser]);
			if (rows.length != 0 && rows[0].profilePicture)
			{
				const imgPath = path.join(__dirname, "uploads/", rows[0].profilePicture);
				try{
					fs.unlinkSync(imgPath);
				}catch (err){}
			}
			const updateQuery = "UPDATE tr_User SET profilePicture = ? WHERE idUser = ?";
			await conn.query(updateQuery, [req.file.filename, jwtDecoded.idUser]);
			res.json({success: true, message: "Profile pic was changed"});
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
		if (err.name === "TokenExpiredError")
			return res.status(401).json({ success: false, message: "expired jwt" });
		else
			return res.status(403).json({ success: false, message: "invalid jwt" });
	}
});

/*
 * ------------------------------------------------------
 * -                     Deleting                       -
 * ------------------------------------------------------
*/
app.delete('/api/deleteUserImage/', async (req, res) => {
	const fulltoken = req.headers.authorization;
	if (!fulltoken || !fulltoken.startsWith("Bearer "))
	{
		return res.status(400).json({ success: false, message: "token is required and should start with 'Bearer '" });
	}
	if (fulltoken.split(' ').length != 2)
	{
		return res.status(400).json({ success: false, message: "token should start with 'Bearer '" });
	}
	const token = fulltoken.split(' ')[1];

	if (!token)
	{
		return res.status(400).json({ success: false, message: "token is required" });
	}
	try{
		const jwtDecoded = jwt.verify(token, SECRET);
		let conn;
		try {
			conn = await pool.getConnection();
			const sqlQuery = "select profilePicture from tr_User where idUser = ?";
			const rows = await conn.query(sqlQuery, [jwtDecoded.idUser]);
			if (rows.length == 0 || !rows[0].profilePicture)
			{
				return res.json({success: true, message: "Profile pic is unset"});
			}
			const updateQuery = "UPDATE tr_User SET profilePicture = NULL WHERE idUser = ?";
			await conn.query(updateQuery, [jwtDecoded.idUser]);
			const imgPath = path.join(__dirname, "uploads", rows[0].profilePicture);
			if (fs.existsSync(imgPath)) {
				fs.unlinkSync(imgPath);
			}
			res.json({success: true, message: "Profile pic was removed"});
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
		if (err.name === "TokenExpiredError")
			return res.status(401).json({ success: false, message: "expired jwt" });
		else
			return res.status(403).json({ success: false, message: "invalid jwt" })
	}
});
/*---------------------------------
 *							       
 *		WEBSOCKET
 *---------------------------------
*/

ws.on('upgrade', (request, ws, head) =>{

});
ws.on('close', () => {
	manageDisconnect(ws);
})

ws.on('connection', (ws) => {
	ws.send(JSON.stringify({message:"Connected successfully"}));
});
ws.on('message', (message) => {
	try
	{
		const args = JSON.parse(mesage);
		if (args.action && getActions[args.action])
		{
			getActions[args.action](ws, args);
			}
			else
			{
				ws.send(JSON.stringify({ error: "action doesn't exist" }));
			}
		}catch(err)
		{
			ws.send(JSON.stringify({ error: "Format de message invalide" }));
		}
	})
	const args = 
//start the server
server.listen(PORT, () => {
	console.log("Server is launched");
});



