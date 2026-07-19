'use strict';

const { createConnection } = require('./db/connection');

const UserRepository = require('./repositories/userRepository');
const BrandRepository = require('./repositories/brandRepository');
const SaleRepository = require('./repositories/saleRepository');
const PayoutRepository = require('./repositories/payoutRepository');
const WalletRepository = require('./repositories/walletRepository');
const WithdrawalRepository = require('./repositories/withdrawalRepository');

const UserService = require('./services/userService');
const BrandService = require('./services/brandService');
const SaleService = require('./services/saleService');
const AdvancePayoutService = require('./services/advancePayoutService');
const ReconciliationService = require('./services/reconciliationService');
const WithdrawalService = require('./services/withdrawalService');
const PayoutFailureRecoveryService = require('./services/payoutFailureRecoveryService');

function buildContainer(dbPath = ':memory:') {
  const db = createConnection(dbPath);

  const userRepo = new UserRepository(db);
  const brandRepo = new BrandRepository(db);
  const saleRepo = new SaleRepository(db);
  const payoutRepo = new PayoutRepository(db);
  const walletRepo = new WalletRepository(db);
  const withdrawalRepo = new WithdrawalRepository(db);

  const userService = new UserService({ userRepo });
  const brandService = new BrandService({ brandRepo });
  const saleService = new SaleService({ saleRepo, userRepo, brandRepo });
  const advancePayoutService = new AdvancePayoutService({
    db,
    saleRepo,
    payoutRepo,
    userRepo,
    walletRepo,
  });
  const reconciliationService = new ReconciliationService({
    db,
    saleRepo,
    payoutRepo,
    userRepo,
    walletRepo,
  });
  const withdrawalService = new WithdrawalService({ db, userRepo, withdrawalRepo, walletRepo });
  const payoutFailureRecoveryService = new PayoutFailureRecoveryService({
    db,
    userRepo,
    withdrawalRepo,
    walletRepo,
  });

  return {
    db,
    userRepo,
    brandRepo,
    saleRepo,
    payoutRepo,
    walletRepo,
    withdrawalRepo,
    userService,
    brandService,
    saleService,
    advancePayoutService,
    reconciliationService,
    withdrawalService,
    payoutFailureRecoveryService,
  };
}

module.exports = { buildContainer };
