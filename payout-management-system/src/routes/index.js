'use strict';

const express = require('express');

const makeSalesController = require('../controllers/salesController');
const makeAdminController = require('../controllers/adminController');
const makeUserController = require('../controllers/userController');
const makeBrandController = require('../controllers/brandController');
const makePayoutController = require('../controllers/payoutController');

function buildRouter(container) {
  const router = express.Router();

  const salesController = makeSalesController(container);
  const adminController = makeAdminController(container);
  const userController = makeUserController(container);
  const brandController = makeBrandController(container);
  const payoutController = makePayoutController(container);

  const wrap = (fn) => (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req, res))
      .catch(next);
  };

  // --- Setup / reference data ---
  router.get('/brands', wrap((req, res) => {
    res.json(container.db.prepare('SELECT * FROM brands ORDER BY id').all());
  }));
  router.get('/users', wrap((req, res) => {
    res.json(container.db.prepare('SELECT * FROM users ORDER BY id').all());
  }));

  // --- Sales ---
  router.post('/sales', wrap(salesController.create));
  router.get('/sales', wrap((req, res) => {
    res.json(container.db.prepare('SELECT * FROM sales ORDER BY id DESC').all());
  }));
  router.get('/users/:userId/sales', wrap(salesController.listForUser));

  router.post('/admin/advance-payout/run', wrap(adminController.runAdvancePayout));
  router.post('/admin/sales/:saleId/reconcile', wrap(adminController.reconcileSale));
  router.post('/admin/sales/reconcile-batch', wrap(adminController.reconcileBatch));

  router.get('/users/:userId/balance', wrap(userController.getBalance));
  router.get('/users/:userId/transactions', wrap(userController.getTransactions));
  router.get('/users/:userId/withdrawals', wrap(userController.getWithdrawals));
  router.get('/withdrawals', wrap((req, res) => {
    res.json(container.db.prepare('SELECT * FROM withdrawals ORDER BY id DESC').all());
  }));

  router.post('/users/:userId/withdrawals', wrap(payoutController.requestWithdrawal));
  router.post(
    '/withdrawals/:withdrawalId/status',
    wrap(payoutController.updateWithdrawalStatus)
  );

  return router;
}

module.exports = buildRouter;
