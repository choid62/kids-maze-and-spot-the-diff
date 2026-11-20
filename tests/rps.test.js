const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/rps.js');

test('가위바위보: 바위는 가위를, 보는 바위를, 가위는 보를 이긴다', () => {
  assert.strictEqual(R.result('rock', 'scissors'), 1);
  assert.strictEqual(R.result('paper', 'rock'), 1);
  assert.strictEqual(R.result('scissors', 'paper'), 1);
  assert.strictEqual(R.result('scissors', 'rock'), -1);
  for (const h of R.HANDS) assert.strictEqual(R.result(h, h), 0);
});

test('가위바위보: 두 사람의 결과는 늘 반대이고, 이유는 이긴 손으로 말한다', () => {
  for (const a of R.HANDS) for (const b of R.HANDS) {
    assert.strictEqual(R.result(a, b) + R.result(b, a), 0);
    if (a === b) assert.strictEqual(R.reason(a, b), null);
    else assert.strictEqual(R.reason(a, b), R.reason(b, a));
  }
  assert.strictEqual(R.reason('scissors', 'rock'), 'Rock breaks scissors!');
});

test('가위바위보: 로봇은 세 가지를 고루 낸다', () => {
  const n = { rock: 0, paper: 0, scissors: 0 };
  let s = 7;
  const rand = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  for (let i = 0; i < 3000; i++) n[R.cpuHand(rand)]++;
  for (const h of R.HANDS) assert.ok(n[h] > 850, `${h} ${n[h]}`);
});
