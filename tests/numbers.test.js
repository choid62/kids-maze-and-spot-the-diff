const test = require('node:test');
const assert = require('node:assert');
const Core = require('../js/core.js');
const N = require('../js/numbers.js');

test('버스: 버스에는 늘 1마리 이상, 최대 이하로 타고, 답은 처음 + 탄 수 - 내린 수', () => {
  for (let lv = 1; lv <= N.BUS_MAX_LEVEL; lv++) {
    const cfg = N.BUS_LEVELS[lv];
    const rng = Core.makeRng(lv * 101);
    for (let i = 0; i < 300; i++) {
      const q = N.busQuestion(lv, rng);
      assert.strictEqual(q.events.length, cfg.stops);
      let n = q.start;
      for (const e of q.events) {
        assert.ok(e !== 0 && Math.abs(e) <= cfg.step);
        if (cfg.ops === 'add') assert.ok(e > 0);
        if (cfg.ops === 'sub') assert.ok(e < 0);
        n += e;
        assert.ok(n >= 1 && n <= cfg.max, `레벨 ${lv}: ${q.start} ${q.events}`);
      }
      assert.strictEqual(q.answer, n);
    }
  }
});

test('버스: 섞기 레벨에는 덧셈과 뺄셈이 다 나온다', () => {
  const rng = Core.makeRng(7);
  let add = 0, sub = 0;
  for (let i = 0; i < 200; i++) for (const e of N.busQuestion(5, rng).events) (e > 0 ? add++ : sub++);
  assert.ok(add > 50 && sub > 50, `${add} ${sub}`);
});

test('보기: 정답을 포함한 서로 다른 수 3개, 0~10', () => {
  const rng = Core.makeRng(3);
  for (let a = 0; a <= 10; a++) for (let i = 0; i < 20; i++) {
    const c = N.choices(a, rng);
    assert.strictEqual(c.length, 3);
    assert.ok(c.includes(a));
    assert.strictEqual(new Set(c).size, 3);
    assert.ok(c.every((x) => x >= 0 && x <= 10 && Math.abs(x - a) <= 2));
  }
});

test('몬스터: 더 주기는 접시가 적고, 덜어 내기는 접시가 많으며, 10을 넘지 않는다', () => {
  for (let lv = 1; lv <= N.MONSTER_MAX_LEVEL; lv++) {
    const cfg = N.MONSTER_LEVELS[lv];
    const rng = Core.makeRng(lv * 13);
    for (let i = 0; i < 300; i++) {
      const q = N.monsterQuestion(lv, rng);
      assert.ok(q.want >= cfg.want[0] && q.want <= cfg.want[1]);
      assert.notStrictEqual(q.have, q.want);
      assert.ok(q.have >= 0 && q.have <= 10);
      if (cfg.mode === 'add') assert.ok(q.have >= 1 && q.have < q.want);
      if (cfg.mode === 'sub') assert.ok(q.have > q.want);
      assert.ok(q.food.kind && q.food.many);
    }
  }
});

test('10 만들기: 카드는 짝마다 합이 목표이고, 아무 짝이나 먼저 맞혀도 끝까지 맞출 수 있다', () => {
  for (let lv = 1; lv <= N.TEN_MAX_LEVEL; lv++) {
    const cfg = N.TEN_LEVELS[lv];
    for (let seed = 1; seed <= 50; seed++) {
      const rng = Core.makeRng(seed * 31 + lv);
      const b = N.tenBoard(lv, rng);
      assert.strictEqual(b.target, cfg.target);
      assert.strictEqual(b.cards.length, cfg.pairs * 2);
      // 무작위로 맞는 두 장을 계속 빼 본다
      const left = b.cards.slice();
      while (left.length) {
        const pairs = [];
        for (let i = 0; i < left.length; i++) for (let j = i + 1; j < left.length; j++) if (left[i] + left[j] === b.target) pairs.push([i, j]);
        assert.ok(pairs.length, `레벨 ${lv}: 남은 카드 ${left} 에 짝이 없음`);
        const [i, j] = pairs[rng.int(pairs.length)];
        left.splice(j, 1);
        left.splice(i, 1);
      }
    }
  }
});

test('10 만들기: 한 판에 서로 다른 짝이 고루 나온다', () => {
  const b = N.tenBoard(6, Core.makeRng(5));
  const lows = new Set(b.cards.map((c) => Math.min(c, 10 - c)));
  assert.strictEqual(lows.size, 5); // 1+9, 2+8, 3+7, 4+6, 5+5
});
