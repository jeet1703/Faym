'use strict';

function makeAdminController({ advancePayoutService, reconciliationService }) {
  return {
    runAdvancePayout(req, res) {
      const { userId } = req.body;
      const result = userId
        ? { [userId]: advancePayoutService.runForUser(userId) }
        : advancePayoutService.runForAllUsers();
      res.json({ result });
    },

    reconcileSale(req, res) {
      const saleId = Number(req.params.saleId);
      const { status } = req.body;
      const result = reconciliationService.reconcile(saleId, status);
      res.json(result);
    },

    reconcileBatch(req, res) {
      const { items } = req.body;
      const results = reconciliationService.reconcileBatch(items);
      res.json({ results });
    },
  };
}

module.exports = makeAdminController;
