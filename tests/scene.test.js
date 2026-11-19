const test = require('node:test');
const assert = require('node:assert');
const Scene = require('../js/scene.js');
const EMOJI = require('../js/emoji-data.js');

const THEMES = Scene.THEME_IDS;
const strip = (o) => JSON.stringify(Object.assign({}, o, { id: 0 }));

test('장면에 쓰는 그림은 모두 그림 데이터에 있다', () => {
  for (const t of THEMES) {
    const th = Scene.THEMES[t];
    for (const z of th.zones) for (const k of z.kinds) assert.ok(EMOJI[k], `${t}: ${k} 없음`);
  }
});

test('레벨별 차이 개수: 3개(레벨 1)부터 9개(레벨 14~15)까지', () => {
  const expected = { 1: 3, 2: 3, 3: 4, 4: 4, 5: 5, 6: 5, 7: 6, 8: 6, 9: 7, 10: 7, 11: 7, 12: 8, 13: 8, 14: 9, 15: 9, 20: 9 };
  for (const [lv, n] of Object.entries(expected)) {
    for (let seed = 1; seed <= 30; seed++) assert.strictEqual(Scene.generate(Number(lv), seed).diffs.length, n, `레벨 ${lv} seed ${seed}`);
  }
});

test('일곱 장면 모두 만들어지고, 높은 레벨은 물건이 더 많고 작다', () => {
  assert.strictEqual(THEMES.length, 7);
  for (const t of THEMES) {
    const easy = Scene.generate(1, 5, t), hard = Scene.generate(10, 5, t), top = Scene.generate(15, 5, t);
    assert.strictEqual(easy.theme, t);
    assert.ok(hard.a.length > easy.a.length);
    const avg = (s) => s.a.reduce((n, o) => n + o.size, 0) / s.a.length;
    assert.ok(avg(hard) < avg(easy));
    assert.ok(top.a.length >= 18, `${t} 레벨 15 물건 수`);
  }
});

test('모든 차이는 실제로 두 그림에서 다르고, 차이 아닌 곳은 똑같다', () => {
  for (let seed = 1; seed <= 600; seed++) {
    const s = Scene.generate(1 + (seed % 15), seed);
    const diffIds = new Set(s.diffs.map((d) => d.id));
    assert.strictEqual(diffIds.size, s.diffs.length, '차이마다 다른 물건');
    const bById = new Map(s.b.map((o) => [o.id, o]));
    for (const o of s.a) {
      const p = bById.get(o.id);
      if (diffIds.has(o.id)) assert.ok(!p || strip(o) !== strip(p), `seed ${seed}: 차이 ${o.kind}가 그대로임`);
      else assert.strictEqual(strip(p), strip(o), `seed ${seed}: 차이 아닌 ${o.kind}가 바뀜`);
    }
    for (const p of s.b) if (!s.a.some((o) => o.id === p.id)) assert.ok(diffIds.has(p.id), '추가된 물건은 차이여야 함');
  }
});

test('차이 종류는 정해진 레벨부터만 나온다', () => {
  const seen = {};
  for (let seed = 1; seed <= 800; seed++) {
    const lv = 1 + (seed % 10);
    for (const d of Scene.generate(lv, seed).diffs) {
      if (d.type === 'add') continue;
      const from = Scene.TYPES[d.type].from;
      assert.ok(lv >= from, `${d.type}가 레벨 ${lv}에 나옴`);
      seen[d.type] = (seen[d.type] || 0) + 1;
    }
  }
  for (const t of Object.keys(Scene.TYPES)) assert.ok(seen[t] > 5, `${t}가 거의 안 나옴 (${seen[t] || 0})`);
});

test('무늬 모양 바꾸기는 무늬 종류만 다르고 색은 같다', () => {
  let n = 0;
  for (let seed = 1; seed <= 600; seed++) {
    const s = Scene.generate(5 + (seed % 6), seed);
    for (const d of s.diffs.filter((x) => x.type === 'patternShape')) {
      const a = s.a.find((o) => o.id === d.id), b = s.b.find((o) => o.id === d.id);
      assert.ok(a.pattern && b.pattern);
      assert.notStrictEqual(a.pattern.type, b.pattern.type);
      assert.strictEqual(a.pattern.color, b.pattern.color);
      n++;
    }
  }
  assert.ok(n > 10);
});

test('레벨 10까지는 물건끼리 크게 겹치지 않고, 11부터는 겹치되 하나가 다른 하나를 덮지는 않는다', () => {
  let overlaps = 0;
  for (let seed = 1; seed <= 600; seed++) {
    const lv = 1 + (seed % 15);
    const s = Scene.generate(lv, seed);
    for (const list of [s.a, s.b]) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const o = list[i], p = list[j];
        const d = Math.hypot((o.x - p.x) * s.aspect, o.y - p.y), sum = (o.size + p.size) / 2;
        if (lv <= 10) assert.ok(d > sum * 0.7, `seed ${seed}: ${o.kind}와 ${p.kind}가 겹침`);
        else {
          assert.ok(d > sum * 0.3, `seed ${seed}: ${o.kind}와 ${p.kind}가 거의 포개짐`);
          if (d < sum * 0.8) overlaps++;
        }
      }
    }
  }
  assert.ok(overlaps > 500, `높은 레벨에서 겹침이 너무 적음: ${overlaps}`);
});

test('바뀐 곳은 앞에 놓인 물건에 가려지지 않는다', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const s = Scene.generate(11 + (seed % 5), seed);
    for (const d of s.diffs) {
      if (d.type === 'add' || d.type.startsWith('bg')) continue;
      const o = s.a.find((x) => x.id === d.id);
      const pts = Scene.discPoints(d.x, d.y, Math.min(d.r, o.size * 0.4) * 0.6);
      assert.ok(Scene.uncovered(pts, o, s.a) >= 0.5, `seed ${seed}: ${d.type} ${o.kind}가 가려짐`);
    }
  }
});

test('한 장면에 하나만 있어야 하는 것(해, 달, 집, 생일 케이크)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const s = Scene.generate(1 + (seed % 10), seed);
    for (const list of [s.a, s.b]) {
      for (const k of ['sun', 'sun_with_face', 'crescent_moon', 'full_moon_face', 'house', 'birthday_cake']) {
        assert.ok(list.filter((o) => o.kind === k).length <= 1, k);
      }
    }
  }
});

test('차이 위치를 누르면 맞고, 이미 찾은 것은 다시 안 잡힌다', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const s = Scene.generate(1 + (seed % 10), seed);
    s.diffs.forEach((d, i) => assert.strictEqual(Scene.hitTest(s, d.x, d.y, new Set()), i));
    assert.notStrictEqual(Scene.hitTest(s, s.diffs[0].x, s.diffs[0].y, new Set([0])), 0);
  }
});

test('같은 시드는 같은 장면', () => {
  assert.deepStrictEqual(Scene.generate(7, 1234), Scene.generate(7, 1234));
});

test('야외 장면(공원, 농장, 동물원, 눈 마을)에는 배경 소품이 있고, 배경 차이는 소품에서만 생긴다', () => {
  const BG_SIZES = require('../js/bg-data.js');
  for (let seed = 1; seed <= 400; seed++) {
    const t = THEMES[seed % THEMES.length];
    const s = Scene.generate(1 + (seed % 10), seed, t);
    const outdoor = ['park', 'farm', 'zoo', 'snow'].includes(t);
    assert.strictEqual(s.propsA.length > 0, outdoor, `${t} 소품 유무`);
    for (const p of [...s.propsA, ...s.propsB]) assert.ok(BG_SIZES[p.name], `${p.name} 그림 없음`);
    const bgDiffs = s.diffs.filter((d) => d.type.startsWith('bg'));
    assert.ok(bgDiffs.length <= (s.level <= 3 ? 1 : 2), '배경 차이는 1~2개까지');
    const ids = new Set(bgDiffs.map((d) => d.id));
    const bById = new Map(s.propsB.map((p) => [p.id, p]));
    for (const p of s.propsA) {
      const q = bById.get(p.id);
      if (ids.has(p.id)) assert.ok(!q || strip(p) !== strip(q), `seed ${seed}: 배경 차이 ${p.name}가 그대로임`);
      else assert.strictEqual(strip(q), strip(p), `seed ${seed}: 차이 아닌 소품 ${p.name}가 바뀜`);
    }
  }
});

test('배경 소품끼리는 겹치지 않는다', () => {
  const BG_SIZES = require('../js/bg-data.js');
  const width = (p) => (p.h * BG_SIZES[p.name][0] / BG_SIZES[p.name][1]) / Scene.ASPECT;
  for (let seed = 1; seed <= 300; seed++) {
    const s = Scene.generate(1 + (seed % 10), seed, ['park', 'farm', 'zoo', 'snow'][seed % 4]);
    for (const list of [s.propsA, s.propsB]) {
      const sorted = list.slice().sort((p, q) => p.x - q.x);
      for (let i = 1; i < sorted.length; i++) {
        const gap = (sorted[i].x - width(sorted[i]) / 2) - (sorted[i - 1].x + width(sorted[i - 1]) / 2);
        assert.ok(gap > -0.01, `seed ${seed}: ${sorted[i - 1].name}와 ${sorted[i].name}가 겹침`);
      }
    }
  }
});
