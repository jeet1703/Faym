'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildContainer } = require('../src/container');

function seedUserWithBalance(c, amount, userId = 'john_doe') {
  c.userService.createUser({ id: userId, name: 'John Doe' });
  c.brandService.createBrand({ id: 'brand_1', name: 'Brand One' });

  const sale = c.saleService.createSale({ userId, brandId: 'brand_1', earning: amount });
  c.reconciliationService.reconcile(sale.id, 'approved');
  return userId;
}

describe('WithdrawalService', () => {
  let c;

  beforeEach(() => {
    c = buildContainer(':memory:');
  });

  test('creates a PENDING withdrawal and immediately holds the funds', async () => {
    const userId = seedUserWithBalance(c, 100);

    const withdrawal = await c.withdrawalService.requestWithdrawal(userId, 40);

    assert.equal(withdrawal.status, 'PENDING');
    assert.equal(withdrawal.amount, 40);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 60);
  });

  test('rejects a withdrawal larger than the wallet balance', async () => {
    const userId = seedUserWithBalance(c, 50);

    await assert.rejects(
      () => c.withdrawalService.requestWithdrawal(userId, 100),
      /INSUFFICIENT_BALANCE|exceeds withdrawable balance/
    );
  });

  test('enforces one successful withdrawal per 24 hours', async () => {
    const userId = seedUserWithBalance(c, 200);

    const w1 = await c.withdrawalService.requestWithdrawal(userId, 20);
    c.payoutFailureRecoveryService.updateWithdrawalStatus(w1.id, 'SUCCESS');

    await assert.rejects(
      () => c.withdrawalService.requestWithdrawal(userId, 20),
      /WITHDRAWAL_COOLDOWN|24 hours/
    );
  });

  test('allows a new withdrawal once 24 hours have passed since the last SUCCESS', async () => {
    const userId = seedUserWithBalance(c, 200);

    const w1 = await c.withdrawalService.requestWithdrawal(userId, 20);
    c.payoutFailureRecoveryService.updateWithdrawalStatus(w1.id, 'SUCCESS');

    c.db
      .prepare("UPDATE withdrawals SET created_at = datetime('now', '-25 hours') WHERE id = ?")
      .run(w1.id);

    const w2 = await c.withdrawalService.requestWithdrawal(userId, 20);
    assert.equal(w2.status, 'PENDING');
  });

  test('rejects a non-positive withdrawal amount', async () => {
    const userId = seedUserWithBalance(c, 100);

    await assert.rejects(() => c.withdrawalService.requestWithdrawal(userId, 0));
    await assert.rejects(() => c.withdrawalService.requestWithdrawal(userId, -5));
  });
});
