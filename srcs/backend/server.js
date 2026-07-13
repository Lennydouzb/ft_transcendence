const express = require('express');
const mariadb = require('mariadb');
const websocket = require('ws');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
const salt = 10;
const app = express();
const SECRET = "SKIBIDIDOPOPDOPDOP"; //@TODO a voir comment recup le env
//this is to read json
app.use(express.json);
const PORT = 8080;

const pool = mariadb.createPool({
	host: 'mariadb'
	user: process.env.DB_USER || 'ldesboui',
	password: process.env.DB_PASSWORD || '1234',
	connectionLimit: 5
});

// (CORS)
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
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

// Route 2 : Test de la connexion à MariaDB
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

app.get('/api/users', async (req, res)) => {
	let conn;
	try {
		conn = pool.getConnection();
		const rows = await conn.query("SELECT idUser, name from tr_User");
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
}

app.get('/api/games', async (req, res)) => {
	let conn;
	try {
		conn = pool.getConnection();
		const rows = await conn.query("SELECT * from tr_Games");
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
}

app.get('/api/projects', async (req, res)) => {
	let conn;
	try {
		conn = pool.getConnection();
		const rows = await conn.query("SELECT * from tr_Projects");
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
}

app.post('/api/gameParticipants', async (req, res) => {
	const { idGame } = req.body;

	if (!idGame) {
		return res.status(400).json({ success: false, message: "idGame is required" });
	}
	let conn;
	try {
		conn = await pool.getConnection();
		const sqlQuery = "SELECT * FROM tr_Participate WHERE idGame = ?";
		const rows = await conn.query(sqlQuery, [idGame]);
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

app.post('/api/userGames', async (req, res) => {
	const { idUser } = req.body;

	if (!idUser) {
		return res.status(400).json({ success: false, message: "idUser is required" });
	}
	let conn;
	try {
		conn = await pool.getConnection();
		const sqlQuery = "SELECT * FROM tr_Participate WHERE idUser = ?";
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

app.post('/api/gameProjects', async (req, res) => {
	const { idUser } = req.body;

	if (!idGame) {
		return res.status(400).json({ success: false, message: "idGame is required" });
	}
	let conn;
	try {
		conn = await pool.getConnection();
		const sqlQuery = "SELECT * FROM tr_Question WHERE idUser = ?";
		const rows = await conn.query(sqlQuery, [idGame]);
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
	const { name, password, mail} = req.body;

	if (!name) {
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
		const sqlQuery = "insert into tr_User values (?, ?, ?)";
		const rows = await conn.query(sqlQuery, [mail, hashedPass, name]);
		const token = jwt.sign(
			{ idUser = rows.insertId},
			SECRET,
			{expiresIn : "24h"}
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
		const sqlQuery = "select password, idUser from tr_User where mail = ?";
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
			{ idUser = idUser},
			SECRET,
			{expiresIn : "24h"}
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

app.put('/api/updateUserName', async (req, res) => {
	const { name , token} = req.body;

	if (!name) {
		return res.status(400).json({ success: false, message: "name is required" });
	}
	if (!token) {
		return res.status(400).json({ success: false, message: "token is required" });
	}
	try{
		const jwtDecoded = jwt.verify(token, SECRET);
		let conn;
		try {
			conn = await pool.getConnection();
			const sqlQuery = "update set name = ? where idUser = ?";
			const rows = await conn.query(sqlQuery, [name, jwtDecoded.idUser]);
			res.status(500).json({success: true});
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
});

/*
 * ------------------------------------------------------
 * -                     Modfying                       -
 * ------------------------------------------------------
*/

app.put('/api/updateUserImage/', upload.single('img'), async (req, res) => {
	const {token} = req.body;
    let conn;

	if (!token)
	{
		return res.status(400).json({ success: false, message: "token is required" });
	}
	if (!req.file)
	{
		return res.status(400).json({ success: false, message: "file is required" });
	}
	try{
		const jwtDecoded = jwt.verify(token, SECRET);
		let conn;
		try {
			conn = await pool.getConnection();
			const sqlQuery = "select profile_picture where idUser = ?";
			const rows = await conn.query(sqlQuery, [jwtDecoded.idUser]);
			if (rows.length != 0)
			{
				const path = path.join(__dirname, "uploads", rows.profile_picture);
				try{
					fs.unlink(path);
				}catch (err)
				{
					return res.status(401).json({success: false, error: "Seems like there was a problem"});
				}
			}
			const updateQuery = "UPDATE tr_User SET profile_picture = ? WHERE idUser = ?";
			await conn.query(updateQuery, [req.file, jwtDecoded.idUser);
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
		return res.status(401).json({ success: false, message: "invalid or expired jwt" });
	}
});

/*
 * ------------------------------------------------------
 * -                     Deleting                       -
 * ------------------------------------------------------
*/
app.delete('/api/deleteUserImage/', async (req, res) => {
	const {token} = req.body;
    let conn;

	if (!token)
	{
		return res.status(400).json({ success: false, message: "token is required" });
	}
	try{
		const jwtDecoded = jwt.verify(token, SECRET);
		let conn;
		try {
			conn = await pool.getConnection();
			const sqlQuery = "select profile_picture where idUser = ?";
			const rows = await conn.query(sqlQuery, [jwtDecoded.idUser]);
			if (rows.length != 0)
			{
				res.json({success: true, message: "Profile pic is unset"});
			}
			const updateQuery = "UPDATE tr_User SET profile_picture = NULL WHERE idUser = ?";
			await conn.query(updateQuery, [req.file, jwtDecoded.idUser);
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
		return res.status(401).json({ success: false, message: "invalid or expired jwt" });
	}
});

//start the server
app.listen(PORT, () => {
	console.log(`Serveur Express en écoute sur le port ${PORT}...`);
});
