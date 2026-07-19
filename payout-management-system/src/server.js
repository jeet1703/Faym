'use strict';

const path = require('node:path');
const buildApp = require('./app');
const { buildContainer } = require('./container');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'payouts.db');

const container = buildContainer(DB_PATH);

const { db } = container;
db.prepare("INSERT OR IGNORE INTO users (id, name, wallet_balance) VALUES ('john_doe', 'John Doe', 0)").run();
db.prepare("INSERT OR IGNORE INTO brands (id, name) VALUES ('brand_1', 'Brand One')").run();
db.prepare("INSERT OR IGNORE INTO brands (id, name) VALUES ('brand_2', 'Brand Two')").run();
db.prepare("INSERT OR IGNORE INTO brands (id, name) VALUES ('brand_3', 'Brand Three')").run();

const app = buildApp(container);

app.listen(PORT, () => {
  console.log(`Payout Management System listening on http://localhost:${PORT}`);
  console.log(`Database file: ${DB_PATH}`);
});
