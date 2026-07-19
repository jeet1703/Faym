'use strict';

const { withTransaction } = require('../db/connection');
const { NotFoundError, InvalidStateTransitionError, AppError } = require('../utils/errors');

const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED', 'CANCELLED', 'REJECTED']);
const RECOVERABLE_STATUSES = new Set(['FAILED', 'CANCELLED', 'REJECTED']);

class PayoutFailureRecoveryService {
  constructor({ db, userRepo, withdrawalRepo, walletRepo }) {
    this.db = db;
    this.userRepo = userRepo;
    this.withdrawalRepo = withdrawalRepo;
    this.walletRepo = walletRepo;
  }

  updateWithdrawalStatus(withdrawalId, newStatus) {
    if (!TERMINAL_STATUSES.has(newStatus)) {
      throw new AppError(`status must be one of: ${[...TERMINAL_STATUSES].join(', ')}`);
    }

    return withTransaction(this.db, () => {
      const withdrawal = this.withdrawalRepo.findById(withdrawalId);
      if (!withdrawal) throw new NotFoundError(`Withdrawal '${withdrawalId}' does not exist`);

      if (withdrawal.status !== 'PENDING') {
        throw new InvalidStateTransitionError(
          `Withdrawal '${withdrawalId}' is already '${withdrawal.status}' and cannot be updated ` +
            `(this protects against duplicate gateway callbacks double-crediting the wallet)`
        );
      }

      const updated = this.withdrawalRepo.updateStatus(withdrawalId, newStatus);

      if (RECOVERABLE_STATUSES.has(newStatus)) {
        const balanceAfter = this.userRepo.adjustBalance(withdrawal.user_id, withdrawal.amount);
        this.walletRepo.recordEntry({
          userId: withdrawal.user_id,
          amount: withdrawal.amount,
          reason: 'WITHDRAWAL_REVERSAL',
          refType: 'withdrawal',
          refId: withdrawal.id,
          balanceAfter,
        });
        return { withdrawal: updated, refunded: true, balanceAfter };
      }

      return { withdrawal: updated, refunded: false };
    });
  }
}

module.exports = PayoutFailureRecoveryService;
