const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple request logger to help trace incoming requests
app.use((req, res, next) => {
  console.log('[request]', req.method, req.originalUrl);
  next();
});

// Route pour l'API de notification de paiement (removed for mail system reset)
// TODO: re-add API routes for payments after mail system is reimplemented
const notifyRouter = require('./api/payments/notify-success');
app.use('/api/payments', notifyRouter);

// Servir les fichiers statiques (site) après les routes API
app.use(express.static(path.join(__dirname)));

// Servir les fichiers HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} déjà utilisé — réessai sur le port ${port + 1}...`);
      setTimeout(() => startServer(port + 1), 500);
    } else {
      console.error('Erreur serveur:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);
