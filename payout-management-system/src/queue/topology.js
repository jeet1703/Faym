'use strict';

const QUEUES = {
  WITHDRAWAL_REQUESTS: 'withdrawal.requests',
  WITHDRAWAL_RESULTS: 'withdrawal.results',
  WITHDRAWAL_RESULTS_DLQ: 'withdrawal.results.dlq',
};

async function assertTopology(channel) {
  await channel.assertQueue(QUEUES.WITHDRAWAL_RESULTS_DLQ, { durable: true });

  await channel.assertQueue(QUEUES.WITHDRAWAL_REQUESTS, { durable: true });

  await channel.assertQueue(QUEUES.WITHDRAWAL_RESULTS, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': QUEUES.WITHDRAWAL_RESULTS_DLQ,
    },
  });
}

module.exports = { QUEUES, assertTopology };
