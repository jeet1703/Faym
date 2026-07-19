'use strict';

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const ADVANCE_PAYOUT_RATE = 0.10;

module.exports = { round2, ADVANCE_PAYOUT_RATE };
