const test = require('node:test');
const assert = require('node:assert');
const Core = require('../js/core.js');
const G = require('../js/gmath.js');

test('정원 수학: 한 판은 씨앗 → 물 → 벌레 → 꽃 → 거두기 5장면', () => {
  const r = G.round(1, Core.makeRng(1));
  assert.deepStrictEqual(r.scenes.map((s) => s.type), G.SCENES);
  assert.strictEqual(r.scenes.length, G.ROUND);
});

test('정원 수학: 모든 수는 1 이상, 레벨 최대 이하이고 답이 식과 맞다', () => {
  for (let lv = 1; lv <= G.MAX_LEVEL; lv++) {
    const max = G.LEVELS[lv].max;
    const rng = Core.makeRng(lv * 31);
    for (let i = 0; i < 300; i++) {
      for (const s of G.round(lv, rng).scenes) {
        const e = G.equation(s);
        assert.ok([e.l, e.m, e.r].every((x) => x >= 1 && x <= max), `레벨 ${lv}: ${JSON.stringify(s)}`);
        if (e.op === '+') assert.strictEqual(e.l + e.m, e.r);
        else assert.strictEqual(e.l - e.m, e.r);
        assert.strictEqual(s.answer, e[e.q]);
        assert.ok(G.VARIANTS[s.type].includes(s.variant));
      }
    }
  }
});

test('정원 수학: "몇 개 땄나?" 문제는 마지막 레벨에서만 나온다', () => {
  const count = (lv) => {
    const rng = Core.makeRng(5);
    let n = 0;
    for (let i = 0; i < 200; i++) n += G.round(lv, rng).scenes.filter((s) => s.kind === 'gone').length;
    return n;
  };
  for (let lv = 1; lv < G.MAX_LEVEL; lv++) assert.strictEqual(count(lv), 0);
  assert.ok(count(G.MAX_LEVEL) > 50);
});

test('정원 수학: 이웃한 장면의 답이 같지 않고, 식물을 정할 수 있다', () => {
  const rng = Core.makeRng(9);
  for (let i = 0; i < 300; i++) {
    const s = G.round(2, rng).scenes;
    for (let k = 1; k < s.length; k++) assert.notStrictEqual(s[k].answer, s[k - 1].answer);
  }
  assert.strictEqual(G.round(1, Core.makeRng(2), 'lemon').plant.id, 'lemon');
});
