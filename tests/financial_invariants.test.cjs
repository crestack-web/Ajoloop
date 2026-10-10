/**
 * Offline unit checks for financial invariant helpers (no live Supabase).
 * Run: node tests/financial_invariants.test.cjs
 */
const assert = require('assert');

function buildContributionRef(circleId, cycle, userId) {
  return `ajo_${String(circleId).replace(/-/g, '')}_c${cycle}_${String(userId).replace(/-/g, '')}`;
}

function potAfterFee(pot, feePct, cycle) {
  const fee = cycle === 0 ? Math.round(pot * feePct * 100) / 100 : 0;
  return { fee, pay: Math.max(0, pot - fee) };
}

// Idempotent reference stability
const r1 = buildContributionRef('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 0, '11111111-2222-3333-4444-555555555555');
const r2 = buildContributionRef('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 0, '11111111-2222-3333-4444-555555555555');
assert.strictEqual(r1, r2, 'same inputs → same ref');
assert.notStrictEqual(
  buildContributionRef('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 1, '11111111-2222-3333-4444-555555555555'),
  r1,
  'different cycle → different ref'
);

// Fee only on cycle 0
assert.deepStrictEqual(potAfterFee(10000, 0.05, 0), { fee: 500, pay: 9500 });
assert.deepStrictEqual(potAfterFee(10000, 0.05, 1), { fee: 0, pay: 10000 });

// Payout cannot exceed pot
function safePayout(pot, fee) {
  return Math.max(0, pot - fee);
}
assert.ok(safePayout(100, 500) === 0);

console.log('financial_invariants.test.cjs: PASS');
