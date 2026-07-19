'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const buildApp = require('../src/app');
const { buildContainer } = require('../src/container');

describe('HTTP API (end-to-end)', () => {
  let server;
  let baseUrl;

  before(() => {
    const container = buildContainer(':memory:');
    const { db } = container;
    db.prepare("INSERT INTO users (id, name, wallet_balance) VALUES ('john_doe', 'John Doe', 0)").run();
    db.prepare("INSERT INTO users (id, name, wallet_balance) VALUES ('alice', 'Alice', 0)").run();
    db.prepare("INSERT INTO brands (id, name) VALUES ('brand_1', 'Brand One')").run();
    db.prepare("INSERT INTO brands (id, name) VALUES ('brand_2', 'Brand Two')").run();

    const app = buildApp(container);
    server = app.listen(0);
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
  });

  async function api(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  }

  test('full lifecycle: create -> advance -> reconcile -> balance -> withdraw', async () => {
    const s1 = await api('POST', '/sales', { userId: 'john_doe', brandId: 'brand_1', earning: 40 });
    const s2 = await api('POST', '/sales', { userId: 'john_doe', brandId: 'brand_1', earning: 40 });
    const s3 = await api('POST', '/sales', { userId: 'john_doe', brandId: 'brand_1', earning: 40 });
    assert.equal(s1.status, 201);

    await api('POST', '/admin/advance-payout/run', { userId: 'john_doe' });

    let balance = await api('GET', '/users/john_doe/balance');
    assert.equal(balance.body.walletBalance, 12);

    await api('POST', `/admin/sales/${s1.body.id}/reconcile`, { status: 'rejected' });
    await api('POST', `/admin/sales/${s2.body.id}/reconcile`, { status: 'approved' });
    await api('POST', `/admin/sales/${s3.body.id}/reconcile`, { status: 'approved' });

    balance = await api('GET', '/users/john_doe/balance');
    assert.equal(balance.body.walletBalance, 80);

    const withdrawal = await api('POST', '/users/john_doe/withdrawals', { amount: 80 });
    assert.equal(withdrawal.status, 201);
    assert.equal(withdrawal.body.status, 'PENDING');

    balance = await api('GET', '/users/john_doe/balance');
    assert.equal(balance.body.walletBalance, 0);

    const settled = await api('POST', `/withdrawals/${withdrawal.body.id}/status`, {
      status: 'FAILED',
    });
    assert.equal(settled.body.refunded, true);

    balance = await api('GET', '/users/john_doe/balance');
    assert.equal(balance.body.walletBalance, 80);
  });

  test('returns 404 for an unknown user', async () => {
    const res = await api('GET', '/users/does_not_exist/balance');
    assert.equal(res.status, 404);
  });

  test('double reconciliation returns 409', async () => {
    const sale = await api('POST', '/sales', { userId: 'alice', brandId: 'brand_2', earning: 10 });

    const first = await api('POST', `/admin/sales/${sale.body.id}/reconcile`, { status: 'approved' });
    assert.equal(first.status, 200);

    const second = await api('POST', `/admin/sales/${sale.body.id}/reconcile`, { status: 'approved' });
    assert.equal(second.status, 409);
  });
});
