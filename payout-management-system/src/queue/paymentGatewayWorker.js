'use strict';

const amqp = require('amqplib');
const { QUEUES, assertTopology } = require('./topology');
const { publishWithdrawalResult } = require('./publisher');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

function simulateGatewayOutcome() {
  const roll = Math.random();
  if (roll < 0.85) return 'SUCCESS';
  if (roll < 0.93) return 'FAILED';
  if (roll < 0.97) return 'CANCELLED';
  return 'REJECTED';
}

async function startPaymentGatewayWorker() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await assertTopology(channel);
  channel.prefetch(1);

  console.log(`[payment-gateway-worker] listening on ${QUEUES.WITHDRAWAL_REQUESTS}`);

  channel.consume(QUEUES.WITHDRAWAL_REQUESTS, async (msg) => {
    if (!msg) return;
    let withdrawalId;
    try {
      ({ withdrawalId } = JSON.parse(msg.content.toString()));

      await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

      const status = simulateGatewayOutcome();
      console.log(`[payment-gateway-worker] withdrawal ${withdrawalId} -> ${status}`);

      await publishWithdrawalResult({ withdrawalId, status });
      channel.ack(msg);
    } catch (err) {
      console.error(
        `[payment-gateway-worker] error processing withdrawal ${withdrawalId ?? '?'}, ` +
          're-queueing (transient-failure assumption)',
        err
      );
      channel.nack(msg, false, true);
    }
  });

  return { connection, channel };
}

module.exports = { startPaymentGatewayWorker };
