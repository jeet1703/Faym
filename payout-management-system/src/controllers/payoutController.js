'use strict';

function makePayoutController({ withdrawalService, payoutFailureRecoveryService }) {
  return {
    async requestWithdrawal(req, res) {
      const { userId } = req.params;
      const { amount } = req.body;
      const withdrawal = await withdrawalService.requestWithdrawal(userId, amount);
      res.status(201).json(withdrawal);
    },

    updateWithdrawalStatus(req, res) {
      const withdrawalId = Number(req.params.withdrawalId);
      const { status } = req.body;
      const result = payoutFailureRecoveryService.updateWithdrawalStatus(withdrawalId, status);
      res.json(result);
    },
  };
}

module.exports = makePayoutController;
