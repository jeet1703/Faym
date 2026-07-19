'use strict';

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const buildRouter = require('./routes');
const { AppError } = require('./utils/errors');

function buildApp(container) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/status', (req, res) => res.json({ status: 'ok' }));

  app.use('/', buildRouter(container));

  app.use((req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
  });

  app.use((err, req, res, next) => {
    if (err instanceof AppError) {
      const body = { error: err.code, message: err.message };
      if (err.retryAt) body.retryAt = err.retryAt;
      return res.status(err.statusCode).json(body);
    }
    console.error(err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
  });

  return app;
}

module.exports = buildApp;
