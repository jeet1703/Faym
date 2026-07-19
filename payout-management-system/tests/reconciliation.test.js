'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildContainer } = require('../src/container');

function seedUserAndBrand(c, userId = 'john_doe') {
  c.userService.createUser({ id: userId, name: 'John Doe' });
  c.brandService.createBrand({ id: 'brand_1', name: 'Brand One' });
  return userId;
}

describe('ReconciliationService', () => {
  let c;

  beforeEach(() => {
    c = buildContainer(':memory:');
  });

  test('Case 1 from the spec: approved sale pays (earning - advance)', () => {
    const userId = seedUserAndBrand(c);
    const sale = c.saleService.createSale({ userId, brandId: 'brand_1', earning: 30 });
    c.advancePayoutService.runForUser(userId);

    const { adjustment } = c.reconciliationService.reconcile(sale.id, 'approved');

    assert.equal(adjustment, 27);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 30);
  });

  test('Case 2 from the spec: rejected sale claws back the advance', () => {
    const userId = seedUserAndBrand(c);
    const sale = c.saleService.createSale({ userId, brandId: 'brand_1', earning: 50 });
    c.advancePayoutService.runForUser(userId);

    const { adjustment } = c.reconciliationService.reconcile(sale.id, 'rejected');

    assert.equal(adjustment, -5);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 0);
  });

  test('reproduces the full worked example from the spec', () => {

    const userId = seedUserAndBrand(c);
    const sales = [
      c.saleService.createSale({ userId, brandId: 'brand_1', earning: 40 }),
      c.saleService.createSale({ userId, brandId: 'brand_1', earning: 40 }),
      c.saleService.createSale({ userId, brandId: 'brand_1', earning: 40 }),
    ];

    c.advancePayoutService.runForUser(userId);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 12);

    const r1 = c.reconciliationService.reconcile(sales[0].id, 'rejected');
    const r2 = c.reconciliationService.reconcile(sales[1].id, 'approved');
    const r3 = c.reconciliationService.reconcile(sales[2].id, 'approved');

    const finalPayoutSum = r1.adjustment + r2.adjustment + r3.adjustment;
    assert.equal(finalPayoutSum, 68);

    assert.equal(c.userRepo.findById(userId).wallet_balance, 80);
  });

  test('a sale cannot be reconciled twice', () => {
    const userId = seedUserAndBrand(c);
    const sale = c.saleService.createSale({ userId, brandId: 'brand_1', earning: 40 });
    c.reconciliationService.reconcile(sale.id, 'approved');

    assert.throws(
      () => c.reconciliationService.reconcile(sale.id, 'approved'),
      /already reconciled/
    );
  });

  test('reconciliation works even without a prior advance payout', () => {
    const userId = seedUserAndBrand(c);
    const sale = c.saleService.createSale({ userId, brandId: 'brand_1', earning: 40 });

    const { adjustment } = c.reconciliationService.reconcile(sale.id, 'approved');

    assert.equal(adjustment, 40);
  });

  test('reconcileBatch reports per-item success/failure without aborting the whole batch', () => {
    const userId = seedUserAndBrand(c);
    const s1 = c.saleService.createSale({ userId, brandId: 'brand_1', earning: 40 });
    const s2 = c.saleService.createSale({ userId, brandId: 'brand_1', earning: 60 });

    const results = c.reconciliationService.reconcileBatch([
      { saleId: s1.id, status: 'approved' },
      { saleId: 999999, status: 'approved' },
      { saleId: s2.id, status: 'rejected' },
    ]);

    assert.equal(results[0].ok, true);
    assert.equal(results[1].ok, false);
    assert.equal(results[2].ok, true);
  });
});
