'use strict';

const { NotFoundError } = require('../utils/errors');

function makeUserController({ userRepo, walletRepo, withdrawalRepo, userService }) {
  return {
    create(req, res) {
      const { id, name } = req.body;
      const user = userService.createUser({ id, name });
      res.status(201).json(user);
    },

    getBalance(req, res) {
      const user = userRepo.findById(req.params.userId);
      if (!user) throw new NotFoundError(`User '${req.params.userId}' does not exist`);
      res.json({ userId: user.id, walletBalance: user.wallet_balance });
    },

    getTransactions(req, res) {
      res.json(walletRepo.findByUser(req.params.userId));
    },

    getWithdrawals(req, res) {
      res.json(withdrawalRepo.findByUser(req.params.userId));
    },
  };
}

module.exports = makeUserController;
