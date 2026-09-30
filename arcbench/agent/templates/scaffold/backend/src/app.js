const express = require('express');
const fs = require('fs');
const path = require('path');

const store = require('./store');

const app = express();
app.use(express.json({ limit: '5mb' }));

// Any successful write is mirrored to the store file so state survives a restart.
app.use((req, res, next) => {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode < 400) store.save();
  });
  return next();
});

app.get('/api/health', (req, res) => res.json({ code: 200, message: 'Ready' }));

// Generated routes are mounted here by the generating agent.

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(503).type('html').send('<!doctype html><html><body><h1>Frontend build missing</h1></body></html>');
  });
}

module.exports = app;
