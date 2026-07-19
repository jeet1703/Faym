'use strict';

const { withTransaction } = require('../db/connection');
const { round2, ADVANCE_PAYOUT_RATE } = require('../utils/money');
const { NotFoundError } = require('../utils/errors');

class AdvancePayoutService {
  constructor({ db, saleRepo, payoutRepo, userRepo, walletRepo }) {
    this.db = db;
    this.saleRepo = saleRepo;
    this.payoutRepo = payoutRepo;
    this.userRepo = userRepo;
    this.walletRepo = walletRepo;
  }

  runForUser(userId) {
    if (!this.userRepo.findById(userId)) {
      throw new NotFoundError(`User '${userId}' does not exist`);
    }

    return withTransaction(this.db, () => {
      const candidates = this.saleRepo.findPendingWithoutAdvance(userId);
      const results = [];

      for (const sale of candidates) {
        const advanceAmount = round2(sale.earning * ADVANCE_PAYOUT_RATE);
        if (advanceAmount <= 0) continue;

        const payout = this.payoutRepo.create({
          userId,
          saleId: sale.id,
          type: 'ADVANCE',
          amount: advanceAmount,
          status: 'SUCCESS',
        });

        this.saleRepo.markAdvancePaid(sale.id, advanceAmount, payout.id);

        const balanceAfter = this.userRepo.adjustBalance(userId, advanceAmount);
        this.walletRepo.recordEntry({
          userId,
          amount: advanceAmount,
          reason: 'ADVANCE_PAYOUT',
          refType: 'sale',
          refId: sale.id,
          balanceAfter,
        });

        results.push({ saleId: sale.id, advanceAmount, payoutId: payout.id });
      }

      return results;
    });
  }

  runForAllUsers() {
    const userIds = this.db
      .prepare(
        `SELECT DISTINCT user_id FROM sales
         WHERE status = 'pending' AND advance_payout_id IS NULL`
      )
      .all()
      .map((row) => row.user_id);

    const summary = {};
    for (const userId of userIds) {
      summary[userId] = this.runForUser(userId);
    }
    return summary;
  }
}

module.exports = AdvancePayoutService;
