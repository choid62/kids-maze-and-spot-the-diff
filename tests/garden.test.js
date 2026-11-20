const test = require('node:test');
const assert = require('node:assert');
const Core = require('../js/core.js');
const G = require('../js/garden.js');

test('식물 키우기: 씨앗은 서로 다른 3가지', () => {
  const rng = Core.makeRng(1);
  for (let i = 0; i < 50; i++) {
    const s = G.seedChoices(rng);
    assert.strictEqual(s.length, 3);
    assert.strictEqual(new Set(s).size, 3);
    assert.ok(s.every((id) => G.PLANTS[id]));
  }
});

test('식물 키우기: 돌보기 사건은 서로 다른 3가지이고, 소나기 바로 뒤에 목말라요가 오지 않는다', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const rng = Core.makeRng(seed);
    const id = G.IDS[seed % G.IDS.length];
    const p = G.plan(id, rng);
    const types = p.needs.map((n) => n.type);
    assert.strictEqual(types.length, 3);
    assert.strictEqual(new Set(types).size, 3);
    const ri = types.indexOf('rain');
    if (ri >= 0) assert.notStrictEqual(types[ri + 1], 'thirsty');
    assert.ok(p.drops >= 2 && p.drops <= 4);
    for (const n of p.needs) {
      if (n.type === 'thirsty') assert.ok(n.drops >= 2 && n.drops <= 4);
      if (n.type === 'bugs') assert.ok(n.n >= 3 && n.n <= 6);
    }
  }
});

test('식물 키우기: 식물마다 거두는 방법과 개수', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = Core.makeRng(seed * 7);
    const s = G.plan('strawberry', rng);
    assert.ok(s.flowers >= 3 && s.flowers <= 5);
    assert.ok(s.ripeFirst >= 1 && s.ripeFirst < s.flowers, '처음엔 익은 것과 덜 익은 것이 다 있어야 함');
    assert.strictEqual(G.harvestCount(s), s.flowers);
    const f = G.plan('sunflower', rng);
    assert.ok(f.seeds >= 5 && f.seeds <= 8);
    const c = G.plan('carrot', rng);
    assert.ok(c.carrots >= 3 && c.carrots <= 5);
  }
});

test('식물 키우기: 판마다 이야기가 다르다', () => {
  const stories = new Set();
  for (let seed = 1; seed <= 60; seed++) stories.add(JSON.stringify(G.plan('tomato', Core.makeRng(seed)).needs.map((n) => n.type)));
  assert.ok(stories.size >= 12, `사건 순서 ${stories.size}가지`);
});
