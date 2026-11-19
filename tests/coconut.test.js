const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/coconut.js');

const who = (path) => path.map((x) => `${x.p}${x.u}`);

test('7박자: 시작한 코코넛부터 시계 방향으로 7번째가 걸린다', () => {
  const g = C.newGame(3); // 코코넛 3개: 00, 10, 20
  assert.deepStrictEqual(who(C.countPath(g, 0)), ['00', '10', '20', '00', '10', '20', '00']);
  assert.strictEqual(C.target(g, 1).p, 1);
});

test('시작점: 내 코코넛, 또는 그 바로 다음 코코넛', () => {
  const g = C.newGame(3);
  assert.deepStrictEqual(C.starts(g, 0), [0, 1]); // 내 것(0), 옆 사람 것(1)
  assert.deepStrictEqual(C.starts(g, 2), [0, 2]); // 마지막 자리의 다음은 처음으로 돌아간다
});

test('갈라진 두 반쪽은 각각 시작점이 되고, 둘 중 어느 쪽에서든 시작할 수 있다', () => {
  const g = C.newGame(3);
  C.hit(g, { p: 0, u: 0 }); // 0번: 반쪽 두 개 → 순서 00, 01, 10, 20
  assert.deepStrictEqual(C.starts(g, 0), [0, 1, 2]); // 첫 반쪽, 둘째 반쪽, 옆 사람
  assert.deepStrictEqual(who(C.countPath(g, 1)), ['01', '10', '20', '00', '01', '10', '20']);
});

test('코코넛 단계: 통 → 반쪽 두 개 → 우유 쏟아짐 → 사라짐, 다 사라지면 탈락', () => {
  const g = C.newGame(2);
  assert.strictEqual(C.hit(g, { p: 1, u: 0 }), 'crack');
  assert.deepStrictEqual(g.players[1].units, ['half', 'half']);
  assert.strictEqual(C.hit(g, { p: 1, u: 1 }), 'spill');
  assert.deepStrictEqual(g.players[1].units, ['half', 'spilled']);
  assert.strictEqual(C.hit(g, { p: 1, u: 1 }), 'gone');
  assert.deepStrictEqual(g.players[1].units, ['half']);
  assert.strictEqual(C.hit(g, { p: 1, u: 0 }), 'spill');
  assert.strictEqual(C.hit(g, { p: 1, u: 0 }), 'out');
  assert.strictEqual(C.winner(g), 0);
});

test('우유 쏟은 반쪽 두 개는 다시 통 코코넛 하나로 합칠 수 있다', () => {
  const g = C.newGame(2);
  g.players[0].units = ['spilled', 'spilled'];
  assert.ok(C.canMerge(g, 0));
  assert.ok(C.merge(g, 0));
  assert.deepStrictEqual(g.players[0].units, ['whole']);
  // 한 사람당 한 판에 한 번만
  g.players[0].units = ['spilled', 'spilled'];
  assert.ok(!C.canMerge(g, 0), '두 번째 합치기는 안 됨');
  assert.ok(!C.merge(g, 0));
  for (const u of [['spilled', 'half'], ['spilled'], ['half', 'half'], ['whole']]) {
    g.players[1].units = u;
    assert.ok(!C.canMerge(g, 1), u.join(','));
  }
});

test('1:1은 둘 다 완벽하면 처음 세는 사람이 이기고, 어려움 컴퓨터는 아무렇게나 하는 아이에게 거의 지지 않는다', () => {
  const g = C.newGame(2);
  assert.strictEqual(C.value2(g), 1);
  let losses = 0;
  for (let seed = 1; seed <= 400; seed++) if (play(2, 3, 1, seed).winner === 0) losses++;
  assert.ok(losses < 20, `어려움이 400판 중 ${losses}판 짐`);
});

test('다음에 세는 사람은 걸린 사람, 탈락했으면 시계 방향 다음 사람', () => {
  const g = C.newGame(3);
  C.hit(g, { p: 2, u: 0 });
  assert.strictEqual(g.counter, 2);
  g.players[1].units = ['spilled'];
  C.hit(g, { p: 1, u: 0 });
  assert.strictEqual(g.counter, 2);
});

test('보통과 어려움 컴퓨터는 가능하면 자기 코코넛이 안 걸리는 시작점을 고른다', () => {
  const g = C.newGame(3);
  for (let i = 0; i < 30; i++) {
    for (const lv of [2, 3]) assert.notStrictEqual(C.target(g, C.cpuChoice(g, 1, lv, 0)).p, 1);
  }
});

test('어려움 컴퓨터는 고를 수 있으면 아이 코코넛을 노린다', () => {
  // 3명, 2번이 셀 때: 시작 2 → [20,00,10,20,00,10,20] 자기 / 시작 0 → [00,10,20,00,10,20,00] 아이
  const g = C.newGame(3);
  g.counter = 2;
  for (let i = 0; i < 20; i++) assert.strictEqual(C.target(g, C.cpuChoice(g, 2, 3, 0)).p, 0);
});

// 한 판 시뮬레이션: 아이(0번)는 kidLevel처럼, 컴퓨터는 level로 고른다. 세는 사람은 합칠 수 있으면 합친다.
// 80번 넘게 걸리면 비김(winner -1)
function play(n, level, kidLevel, seed) {
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const g = C.newGame(n);
  g.counter = seed % n;
  let rounds = 0;
  while (C.winner(g) < 0 && g.players[0].units.length && rounds < 80) {
    const c = g.counter;
    C.merge(g, c);
    C.hit(g, C.target(g, C.cpuChoice(g, c, c === 0 ? kidLevel : level, 0, rand)));
    rounds++;
  }
  return { winner: C.winner(g), rounds, kidOut: !g.players[0].units.length };
}
function kidWinRate(n, level, kidLevel, games) {
  let wins = 0;
  for (let seed = 1; seed <= games; seed++) if (play(n, level, kidLevel, seed).winner === 0) wins++;
  return wins / games;
}

test('난이도가 높을수록 아이가 이기기 어렵고, 어려움도 가끔은 이길 수 있다 (1:1, 3명)', () => {
  for (const n of [2, 3]) {
    const easy = kidWinRate(n, 1, 2, 400), normal = kidWinRate(n, 2, 2, 400), hard = kidWinRate(n, 3, 2, 400);
    assert.ok(easy > normal && normal >= hard, `${n}명: 쉬움 ${easy} 보통 ${normal} 어려움 ${hard}`);
    assert.ok(hard > 0, `${n}명 어려움도 가끔은 이길 수 있어야 함`);
  }
});

test('합치기가 있어도 판은 80번 안에 끝나고, 이긴 사람은 한 명', () => {
  for (const n of [2, 3]) {
    let ended = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = play(n, 1, 1, seed);
      if (r.winner >= 0 || r.kidOut) ended++;
      assert.ok(r.rounds >= 4 || r.kidOut, `한 사람이 탈락하려면 최소 4번은 걸려야 함`);
    }
    assert.strictEqual(ended, 200, `${n}명: 200판 중 ${ended}판만 끝남`);
  }
});
