'use strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  console.log(`POST ${path} -> ${res.status}`, json);
  return json;
}

async function main() {
  await post('/brands', { id: 'brand_1', name: 'Brand One' });
  await post('/brands', { id: 'brand_2', name: 'Brand Two' });
  await post('/brands', { id: 'brand_3', name: 'Brand Three' });

  await post('/users', { id: 'john_doe', name: 'John Doe' });

  await post('/sales', { userId: 'john_doe', brandId: 'brand_1', earning: 40 });
  await post('/sales', { userId: 'john_doe', brandId: 'brand_1', earning: 40 });
  await post('/sales', { userId: 'john_doe', brandId: 'brand_1', earning: 40 });

  console.log('\nSeed complete. Try:');
  console.log(`  curl -X POST ${BASE_URL}/admin/advance-payout/run -H 'Content-Type: application/json' -d '{"userId":"john_doe"}'`);
  console.log(`  curl ${BASE_URL}/users/john_doe/balance`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
