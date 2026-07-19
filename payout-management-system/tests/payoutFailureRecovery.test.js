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

describe('PayoutFailureRecoveryService (Question 2)', () => {
  let c;

  beforeEach(() => {
    c = buildContainer(':memory:');
  });

  for (const status of ['FAILED', 'CANCELLED', 'REJECTED']) {
    test(`${status} withdrawal credits the amount back into the wallet`, async () => {
      const userId = seedUserWithBalance(c, 100);
      const withdrawal = await c.withdrawalService.requestWithdrawal(userId, 40);
      assert.equal(c.userRepo.findById(userId).wallet_balance, 60);

      const result = c.payoutFailureRecoveryService.updateWithdrawalStatus(withdrawal.id, status);

      assert.equal(result.refunded, true);
      assert.equal(c.userRepo.findById(userId).wallet_balance, 100);
      assert.equal(c.withdrawalRepo.findById(withdrawal.id).status, status);
    });
  }

  test('a credited-back amount can immediately be withdrawn again (no cooldown penalty)', async () => {
    const userId = seedUserWithBalance(c, 100);
    const withdrawal = await c.withdrawalService.requestWithdrawal(userId, 40);
    c.payoutFailureRecoveryService.updateWithdrawalStatus(withdrawal.id, 'FAILED');

    const retry = await c.withdrawalService.requestWithdrawal(userId, 40);
    assert.equal(retry.status, 'PENDING');
  });

  test('SUCCESS does not double-move money (funds were already held at request time)', async () => {
    const userId = seedUserWithBalance(c, 100);
    const withdrawal = await c.withdrawalService.requestWithdrawal(userId, 40);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 60);

    const result = c.payoutFailureRecoveryService.updateWithdrawalStatus(withdrawal.id, 'SUCCESS');

    assert.equal(result.refunded, false);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 60);
  });

  test('a withdrawal cannot be settled twice (protects against duplicate gateway callbacks)', async () => {
    const userId = seedUserWithBalance(c, 100);
    const withdrawal = await c.withdrawalService.requestWithdrawal(userId, 40);

    c.payoutFailureRecoveryService.updateWithdrawalStatus(withdrawal.id, 'FAILED');

    assert.throws(
      () => c.payoutFailureRecoveryService.updateWithdrawalStatus(withdrawal.id, 'FAILED'),
      /already 'FAILED'/
    );

    assert.equal(c.userRepo.findById(userId).wallet_balance, 100);
  });
});
