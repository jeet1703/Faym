'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildContainer } = require('../src/container');

function seedUserAndBrand(c, userId = 'john_doe') {
  c.userService.createUser({ id: userId, name: 'John Doe' });
  c.brandService.createBrand({ id: 'brand_1', name: 'Brand One' });
  return userId;
}

describe('AdvancePayoutService', () => {
  let c;

  beforeEach(() => {
    c = buildContainer(':memory:');
  });

  test('pays 10% advance on a pending sale', () => {
    const userId = seedUserAndBrand(c);
    c.saleService.createSale({ userId, brandId: 'brand_1', earning: 40 });

    const results = c.advancePayoutService.runForUser(userId);

    assert.equal(results.length, 1);
    assert.equal(results[0].advanceAmount, 4);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 4);
  });

  test('matches the assignment example: 3 sales of ₹40 -> ₹12 total advance', () => {
    const userId = seedUserAndBrand(c);
    for (let i = 0; i < 3; i++) {
      c.saleService.createSale({ userId, brandId: 'brand_1', earning: 40 });
    }

    c.advancePayoutService.runForUser(userId);

    assert.equal(c.userRepo.findById(userId).wallet_balance, 12);
  });

  test('is idempotent: re-running the job never pays the same sale twice', () => {
    const userId = seedUserAndBrand(c);
    c.saleService.createSale({ userId, brandId: 'brand_1', earning: 100 });

    const first = c.advancePayoutService.runForUser(userId);
    const second = c.advancePayoutService.runForUser(userId);
    const third = c.advancePayoutService.runForUser(userId);

    assert.equal(first.length, 1);
    assert.equal(second.length, 0);
    assert.equal(third.length, 0);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 10);
  });

  test('skips sales with zero earnings', () => {
    const userId = seedUserAndBrand(c);
    c.saleService.createSale({ userId, brandId: 'brand_1', earning: 0 });

    const results = c.advancePayoutService.runForUser(userId);

    assert.equal(results.length, 0);
    assert.equal(c.userRepo.findById(userId).wallet_balance, 0);
  });

  test('does not advance sales that are already approved/rejected', () => {
    const userId = seedUserAndBrand(c);
    const sale = c.saleService.createSale({ userId, brandId: 'brand_1', earning: 50 });
    c.reconciliationService.reconcile(sale.id, 'approved');

    const results = c.advancePayoutService.runForUser(userId);

    assert.equal(results.length, 0);
  });

  test('runForAllUsers pays every eligible user in one call', () => {
    c.userService.createUser({ id: 'alice', name: 'Alice' });
    c.userService.createUser({ id: 'bob', name: 'Bob' });
    c.brandService.createBrand({ id: 'brand_1', name: 'Brand One' });
    c.saleService.createSale({ userId: 'alice', brandId: 'brand_1', earning: 100 });
    c.saleService.createSale({ userId: 'bob', brandId: 'brand_1', earning: 200 });

    const summary = c.advancePayoutService.runForAllUsers();

    assert.equal(summary.alice.length, 1);
    assert.equal(summary.bob.length, 1);
    assert.equal(c.userRepo.findById('alice').wallet_balance, 10);
    assert.equal(c.userRepo.findById('bob').wallet_balance, 20);
  });
});
