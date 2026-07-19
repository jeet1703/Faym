'use strict';

const { withTransaction } = require('../db/connection');
const { round2 } = require('../utils/money');
const { publishWithdrawalRequested } = require('../queue/publisher');
const {
  NotFoundError,
  AppError,
  InsufficientBalanceError,
  WithdrawalCooldownError,
} = require('../utils/errors');

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

class WithdrawalService {
  constructor({ db, userRepo, withdrawalRepo, walletRepo }) {
    this.db = db;
    this.userRepo = userRepo;
    this.withdrawalRepo = withdrawalRepo;
    this.walletRepo = walletRepo;
  }

  async requestWithdrawal(userId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      throw new AppError('amount must be a positive number');
    }
    amount = round2(amount);

    const withdrawal = withTransaction(this.db, () => {
      const user = this.userRepo.findById(userId);
      if (!user) throw new NotFoundError(`User '${userId}' does not exist`);

      if (user.wallet_balance < amount) {
        throw new InsufficientBalanceError(
          `Requested ₹${amount} exceeds withdrawable balance ₹${user.wallet_balance}`
        );
      }

      const lastSuccessful = this.withdrawalRepo.findLastSuccessful(userId);
      if (lastSuccessful) {
        const elapsedMs = Date.now() - new Date(`${lastSuccessful.created_at}Z`).getTime();
        if (elapsedMs < COOLDOWN_MS) {
          const retryAt = new Date(
            new Date(`${lastSuccessful.created_at}Z`).getTime() + COOLDOWN_MS
          ).toISOString();
          throw new WithdrawalCooldownError(
            'Only one withdrawal is allowed every 24 hours',
            retryAt
          );
        }
      }

      const withdrawal = this.withdrawalRepo.create({ userId, amount, status: 'PENDING' });

      const balanceAfter = this.userRepo.adjustBalance(userId, -amount);
      this.walletRepo.recordEntry({
        userId,
        amount: -amount,
        reason: 'WITHDRAWAL_HOLD',
        refType: 'withdrawal',
        refId: withdrawal.id,
        balanceAfter,
      });

      return withdrawal;
    });

    try {
      await publishWithdrawalRequested({ withdrawalId: withdrawal.id, userId, amount });
    } catch (err) {
      console.error(
        `Failed to publish withdrawal.requests for withdrawal ${withdrawal.id} — funds remain ` +
          'held; the message can be replayed from an ops tool once the broker is back',
        err
      );
    }

    return withdrawal;
  }
}

module.exports = WithdrawalService;
