const test = require('node:test');
const assert = require('node:assert');
const T = require('../js/tictactoe.js');

test('가로, 세로, 대각선 한 줄을 알아본다', () => {
  assert.deepStrictEqual(T.winner([1, 1, 1, 0, 2, 2, 0, 0, 0]), { who: 1, line: [0, 1, 2] });
  assert.deepStrictEqual(T.winner([2, 1, 0, 2, 1, 0, 2, 0, 0]), { who: 2, line: [0, 3, 6] });
  assert.deepStrictEqual(T.winner([1, 2, 0, 2, 1, 0, 0, 0, 1]), { who: 1, line: [0, 4, 8] });
  assert.strictEqual(T.winner([1, 2, 1, 1, 2, 2, 2, 1, 1]), null);
  assert.ok(T.full([1, 2, 1, 1, 2, 2, 2, 1, 1]));
});

test('보통과 어려움은 바로 이길 수 있으면 이기고, 아니면 막는다', () => {
  // 2가 둘 차례: 2는 [3,4]를 갖고 5에 두면 이김
  const b = [1, 1, 0, 2, 2, 0, 1, 0, 0];
  for (const lv of [2, 3]) assert.strictEqual(T.cpuMove(b, 2, lv), 5);
  // 막기: 1이 [0,1]을 가져 2에 두면 이김 → 2는 2를 막아야 함
  const c = [1, 1, 0, 0, 2, 0, 0, 0, 0];
  for (const lv of [2, 3]) assert.strictEqual(T.cpuMove(c, 2, lv), 2);
});

function game(levelA, levelB, seed) {
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const b = Array(9).fill(0);
  let turn = 1;
  while (!T.winner(b) && !T.full(b)) {
    const lv = turn === 1 ? levelA : levelB;
    const i = lv === 0 ? T.empty(b)[Math.floor(rand() * T.empty(b).length)] : T.cpuMove(b, turn, lv, rand);
    b[i] = turn;
    turn = 3 - turn;
  }
  const w = T.winner(b);
  return w ? w.who : 0;
}

test('어려움은 아무렇게나 두는 상대에게 지지 않는다 (먼저 두든 나중에 두든)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    assert.notStrictEqual(game(3, 0, seed), 2, `seed ${seed}: 먼저 두고 짐`);
    assert.notStrictEqual(game(0, 3, seed), 1, `seed ${seed}: 나중에 두고 짐`);
  }
});

test('어려움끼리 두면 늘 비긴다', () => {
  for (let seed = 1; seed <= 30; seed++) assert.strictEqual(game(3, 3, seed), 0);
});

test('난이도가 높을수록 이기기 어렵다 (아무렇게나 두는 쪽이 먼저 둘 때)', () => {
  const rate = (lv) => { let w = 0; for (let seed = 1; seed <= 600; seed++) if (game(0, lv, seed) === 1) w++; return w / 600; };
  const easy = rate(1), normal = rate(2), hard = rate(3);
  assert.ok(easy > normal && normal > hard, `쉬움 ${easy} 보통 ${normal} 어려움 ${hard}`);
  assert.strictEqual(hard, 0);
  assert.ok(easy > 0.3, '쉬움은 아이가 자주 이길 수 있어야 함');
});
