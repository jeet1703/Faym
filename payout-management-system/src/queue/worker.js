'use strict';

const path = require('node:path');
const { buildContainer } = require('../container');
const { startPaymentGatewayWorker } = require('./paymentGatewayWorker');
const { startWithdrawalResultConsumer } = require('./withdrawalResultConsumer');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'payouts.db');

async function main() {
  const container = buildContainer(DB_PATH);

  await startPaymentGatewayWorker();
  await startWithdrawalResultConsumer(container);

  console.log('Workers started. DB:', DB_PATH);
}

main().catch((err) => {
  console.error('Worker process crashed:', err);
  process.exit(1);
});
