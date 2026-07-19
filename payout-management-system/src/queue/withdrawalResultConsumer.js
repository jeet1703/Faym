'use strict';

const amqp = require('amqplib');
const { QUEUES, assertTopology } = require('./topology');
const { InvalidStateTransitionError, NotFoundError } = require('../utils/errors');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function startWithdrawalResultConsumer(container) {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await assertTopology(channel);
  channel.prefetch(1);

  console.log(`[withdrawal-result-consumer] listening on ${QUEUES.WITHDRAWAL_RESULTS}`);

  channel.consume(QUEUES.WITHDRAWAL_RESULTS, (msg) => {
    if (!msg) return;
    let withdrawalId, status;
    try {
      ({ withdrawalId, status } = JSON.parse(msg.content.toString()));

      try {
        const result = container.payoutFailureRecoveryService.updateWithdrawalStatus(
          withdrawalId,
          status
        );
        console.log(
          `[withdrawal-result-consumer] withdrawal ${withdrawalId} settled as ${status}` +
            (result.refunded ? ' (refunded to wallet)' : '')
        );
      } catch (err) {
        if (err instanceof InvalidStateTransitionError) {
          console.warn(
            `[withdrawal-result-consumer] duplicate/late result for withdrawal ${withdrawalId}, ignoring`
          );
        } else if (err instanceof NotFoundError) {

          console.error(
            `[withdrawal-result-consumer] unknown withdrawal ${withdrawalId}, routing to DLQ`
          );
          channel.reject(msg, false);
          return;
        } else {
          throw err;
        }
      }

      channel.ack(msg);
    } catch (err) {
      console.error(
        `[withdrawal-result-consumer] unexpected error for withdrawal ${withdrawalId ?? '?'}`,
        err
      );
      channel.nack(msg, false, true);
    }
  });

  return { connection, channel };
}

module.exports = { startWithdrawalResultConsumer };
