const test = require('node:test');
const assert = require('node:assert');
const Chop = require('../js/chop.js');

test('치면 내 손가락 수만큼 더해지고, 5개 이상이면 죽는다', () => {
  assert.deepStrictEqual(Chop.hit([2, 1], [1, 1], 0, 1), [1, 3]);
  assert.deepStrictEqual(Chop.hit([3, 1], [1, 2], 0, 1), [1, 0]); // 2+3=5 → 죽음
  assert.deepStrictEqual(Chop.hit([4, 4], [3, 1], 1, 0), [0, 1]); // 3+4=7 → 죽음
});

test('나누기: 한 손이 죽고 다른 손이 짝수(2, 4)일 때만 반씩', () => {
  assert.deepStrictEqual(Chop.splits([0, 2]), [[1, 1]]);
  assert.deepStrictEqual(Chop.splits([4, 0]), [[2, 2]]);
  // 그 밖에는 나눌 수 없다
  for (const h of [[0, 1], [0, 3], [1, 1], [2, 2], [1, 3], [2, 4], [4, 4], [0, 0]]) {
    assert.deepStrictEqual(Chop.splits(h), [], h.join(','));
  }
});

test('죽은 손으로는 칠 수 없고, 죽은 손은 맞지 않는다', () => {
  const ms = Chop.moves([0, 2], [3, 0]).filter((m) => m.type === 'hit');
  assert.deepStrictEqual(ms, [{ type: 'hit', from: 1, to: 0 }]);
});

test('양손이 다 죽은 사람은 진 상태', () => {
  assert.strictEqual(Chop.value([0, 0], [1, 2]).v, Chop.LOSS);
  assert.strictEqual(Chop.value([1, 2], [0, 0]).v, Chop.WIN);
});

test('바로 이길 수 있으면 컴퓨터(어려움)는 그 수를 둔다', () => {
  // 상대 손 [0, 4]: 1개짜리 손으로 4를 치면 5 → 상대 양손 죽음
  const m = Chop.chooseMove([1, 1], [0, 4], 1);
  const n = Chop.play([1, 1], [0, 4], m);
  assert.ok(!Chop.alive(n.me), '상대가 져야 함');
});

function randomGame(skillA, skillB, seed) {
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  let me = [1, 1], op = [1, 1], turn = 0;
  for (let i = 0; i < 200; i++) {
    const m = Chop.chooseMove(me, op, turn === 0 ? skillA : skillB, rand);
    const n = Chop.play(me, op, m);
    if (!Chop.alive(n.me)) return turn; // 수를 둔 사람이 이김
    me = n.me; op = n.op; turn = 1 - turn;
  }
  return -1; // 비김
}

test('어려움 컴퓨터는 아무렇게나 두는 상대에게 지지 않는다 (먼저 두든 나중에 두든)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    assert.notStrictEqual(randomGame(1, 0, seed), 1, `seed ${seed}: 먼저 두고 짐`);
    assert.notStrictEqual(randomGame(0, 1, seed), 0, `seed ${seed}: 나중에 두고 짐`);
  }
});

test('쉬움 컴퓨터는 아무렇게나 두는 상대에게 가끔 진다 (아이가 이길 수 있게)', () => {
  let losses = 0;
  for (let seed = 1; seed <= 300; seed++) if (randomGame(0.3, 0.3, seed) === 0) losses++;
  assert.ok(losses > 30, `쉬움이 너무 잘함: ${losses}`);
});
