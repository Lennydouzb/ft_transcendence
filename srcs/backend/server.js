//@TODO genere par ia :(
const express = require('express');
const mariadb = require('mariadb');

const app = express();
const PORT = 8080;

// Configuration de la connexion à MariaDB
// Il utilise vos variables d'environnement ou des valeurs par défaut
const pool = mariadb.createPool({
  host: 'mariadb', // C'est le nom de votre conteneur de base de données dans le docker-compose
  user: process.env.DB_USER || 'ldesboui',
  password: process.env.DB_PASSWORD || '1234',
  connectionLimit: 5
});

// Middleware pour autoriser les requêtes (CORS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Route 1 : Test de l'API classique
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Le backend Express fonctionne !' });
});

// Route 2 : Test de la connexion à MariaDB
app.get('/api/test-db', async (req, res) => {
  let conn;
  try {
    // Tente de récupérer une connexion depuis le pool
    conn = await pool.getConnection();
    
    // Exécute une requête simple pour tester
    const rows = await conn.query("SELECT VERSION() as version");
    
    res.json({ 
      success: true, 
      message: 'Connexion à MariaDB réussie !', 
      version_bdd: rows[0].version 
    });
  } catch (err) {
    console.error("Erreur BDD:", err);
    res.status(500).json({ 
      success: false, 
      message: 'Impossible de se connecter à la base de données', 
      error: err.message 
    });
  } finally {
    // Libère la connexion pour ne pas saturer la BDD
    if (conn) conn.release();
  }
});

app.listen(PORT, () => {
  console.log(`Serveur Express en écoute sur le port ${PORT}...`);
});
