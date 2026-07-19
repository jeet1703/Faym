'use strict';

const { buildContainer } = require('../src/container');

const c = buildContainer(':memory:');

function line() {
  console.log('-'.repeat(60));
}

console.log('Payout Management System — worked example walkthrough');
line();

c.userService.createUser({ id: 'john_doe', name: 'John Doe' });
c.brandService.createBrand({ id: 'brand_1', name: 'Brand One' });

const sales = [
  c.saleService.createSale({ userId: 'john_doe', brandId: 'brand_1', earning: 40 }),
  c.saleService.createSale({ userId: 'john_doe', brandId: 'brand_1', earning: 40 }),
  c.saleService.createSale({ userId: 'john_doe', brandId: 'brand_1', earning: 40 }),
];
console.log(`Created 3 pending sales of ₹40 each for john_doe (total earnings ₹120).`);

const advanceResults = c.advancePayoutService.runForUser('john_doe');
console.log(`\nRan the advance payout job:`);
for (const r of advanceResults) {
  console.log(`  sale #${r.saleId}: advance paid = ₹${r.advanceAmount}`);
}
console.log(
  `Wallet balance after advances: ₹${c.userRepo.findById('john_doe').wallet_balance} ` +
    `(expected ₹12)`
);
line();

console.log(`Re-running the advance payout job (should be a no-op — idempotency check):`);
const rerun = c.advancePayoutService.runForUser('john_doe');
console.log(`  sales advanced this time: ${rerun.length} (expected 0)`);
line();

console.log('Reconciling: sale #1 -> rejected, sale #2 -> approved, sale #3 -> approved');
const r1 = c.reconciliationService.reconcile(sales[0].id, 'rejected');
const r2 = c.reconciliationService.reconcile(sales[1].id, 'approved');
const r3 = c.reconciliationService.reconcile(sales[2].id, 'approved');
console.log(`  sale #1 (rejected) adjustment: ₹${r1.adjustment} (expected -₹4)`);
console.log(`  sale #2 (approved) adjustment: ₹${r2.adjustment} (expected ₹36)`);
console.log(`  sale #3 (approved) adjustment: ₹${r3.adjustment} (expected ₹36)`);
const finalPayoutSum = r1.adjustment + r2.adjustment + r3.adjustment;
console.log(`  sum of adjustments ("Final Payout" per the spec): ₹${finalPayoutSum} (expected ₹68)`);
console.log(
  `  total wallet balance now (advance + final): ₹${c.userRepo.findById('john_doe').wallet_balance} ` +
    `(expected ₹80)`
);
line();

console.log('Requesting a withdrawal of the full balance:');
c.withdrawalService.requestWithdrawal('john_doe', 80).then((withdrawal) => {
  console.log(`  withdrawal #${withdrawal.id} created, status = ${withdrawal.status}`);
  console.log(`  wallet balance now: ₹${c.userRepo.findById('john_doe').wallet_balance} (expected ₹0)`);
  line();

  console.log('Simulating the payment gateway reporting this withdrawal as FAILED:');
  const recovery = c.payoutFailureRecoveryService.updateWithdrawalStatus(withdrawal.id, 'FAILED');
  console.log(`  refunded: ${recovery.refunded}`);
  console.log(
    `  wallet balance now: ₹${c.userRepo.findById('john_doe').wallet_balance} (expected ₹80 again)`
  );
  line();

  console.log('Requesting another withdrawal immediately (should succeed — no cooldown, since');
  console.log('the failed withdrawal never counted as a SUCCESS):');
  return c.withdrawalService.requestWithdrawal('john_doe', 80).then((w2) => {
    console.log(`  withdrawal #${w2.id} created, status = ${w2.status}`);
    line();
    console.log('Done. Full ledger for john_doe:');
    console.table(c.walletRepo.findByUser('john_doe'));
  });
});
