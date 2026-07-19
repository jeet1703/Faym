'use strict';

const amqp = require('amqplib');
const { QUEUES, assertTopology } = require('./topology');

const QUEUE_ENABLED = process.env.QUEUE_ENABLED === 'true';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

let channelPromise = null;

async function getPublishChannel() {
  if (!channelPromise) {
    channelPromise = amqp.connect(RABBITMQ_URL).then(async (connection) => {
      connection.on('error', (err) => console.error('[queue] connection error', err));
      const channel = await connection.createChannel();
      await assertTopology(channel);
      return channel;
    });
  }
  return channelPromise;
}

async function publishWithdrawalRequested({ withdrawalId, userId, amount }) {
  const payload = { withdrawalId, userId, amount, publishedAt: new Date().toISOString() };
  if (!QUEUE_ENABLED) {
    console.log('[queue:disabled] would publish to withdrawal.requests', payload);
    return;
  }
  const channel = await getPublishChannel();
  channel.sendToQueue(QUEUES.WITHDRAWAL_REQUESTS, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}

async function publishWithdrawalResult({ withdrawalId, status }) {
  const payload = { withdrawalId, status, publishedAt: new Date().toISOString() };
  if (!QUEUE_ENABLED) {
    console.log('[queue:disabled] would publish to withdrawal.results', payload);
    return;
  }
  const channel = await getPublishChannel();
  channel.sendToQueue(QUEUES.WITHDRAWAL_RESULTS, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}

module.exports = { publishWithdrawalRequested, publishWithdrawalResult, QUEUE_ENABLED };
