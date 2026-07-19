'use strict';

const { withTransaction } = require('../db/connection');
const { round2 } = require('../utils/money');
const { NotFoundError, AlreadyReconciledError, AppError } = require('../utils/errors');

const VALID_TARGET_STATUSES = new Set(['approved', 'rejected']);

class ReconciliationService {
  constructor({ db, saleRepo, payoutRepo, userRepo, walletRepo }) {
    this.db = db;
    this.saleRepo = saleRepo;
    this.payoutRepo = payoutRepo;
    this.userRepo = userRepo;
    this.walletRepo = walletRepo;
  }

  reconcile(saleId, newStatus) {
    if (!VALID_TARGET_STATUSES.has(newStatus)) {
      throw new AppError(`status must be one of: ${[...VALID_TARGET_STATUSES].join(', ')}`);
    }

    return withTransaction(this.db, () => {
      const sale = this.saleRepo.findById(saleId);
      if (!sale) throw new NotFoundError(`Sale '${saleId}' does not exist`);

      if (sale.status !== 'pending') {
        throw new AlreadyReconciledError(
          `Sale '${saleId}' was already reconciled as '${sale.status}'`
        );
      }

      const adjustment =
        newStatus === 'approved'
          ? round2(sale.earning - sale.advance_paid)
          : round2(-sale.advance_paid);

      const payout = this.payoutRepo.create({
        userId: sale.user_id,
        saleId: sale.id,
        type: 'FINAL_ADJUSTMENT',
        amount: adjustment,
        status: 'SUCCESS',
      });

      const updatedSale = this.saleRepo.reconcile(saleId, newStatus);

      const balanceAfter = this.userRepo.adjustBalance(sale.user_id, adjustment);
      this.walletRepo.recordEntry({
        userId: sale.user_id,
        amount: adjustment,
        reason: newStatus === 'approved' ? 'SALE_APPROVED' : 'SALE_REJECTED_CLAWBACK',
        refType: 'sale',
        refId: sale.id,
        balanceAfter,
      });

      return { sale: updatedSale, adjustment, payoutId: payout.id, balanceAfter };
    });
  }

  reconcileBatch(items) {

    return items.map((item) => {
      try {
        return { ...this.reconcile(item.saleId, item.status), saleId: item.saleId, ok: true };
      } catch (err) {
        return { saleId: item.saleId, ok: false, error: err.message };
      }
    });
  }
}

module.exports = ReconciliationService;
