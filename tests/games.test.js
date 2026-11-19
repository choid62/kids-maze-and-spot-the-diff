// 짝 맞추기, 숨은그림 찾기, 다음에 올 것
const test = require('node:test');
const assert = require('node:assert');
const Memory = require('../js/memory.js');
const Hidden = require('../js/hidden.js');
const Pattern = require('../js/pattern.js');
const Faces = require('../js/faces.js');
const Core = require('../js/core.js');

// ---------- 짝 맞추기 ----------
test('짝 맞추기: 카드는 정확히 두 장씩 짝이고, 레벨별 쌍 수가 맞다', () => {
  for (let lv = 1; lv <= 10; lv++) {
    for (let seed = 1; seed <= 30; seed++) {
      const g = Memory.generate(lv, seed);
      assert.strictEqual(g.pairs, Memory.LEVELS[lv].pairs, `레벨 ${lv}`);
      assert.strictEqual(g.cards.length, g.pairs * 2);
      const byPair = {};
      for (const c of g.cards) (byPair[c.pair] = byPair[c.pair] || []).push(c);
      for (const list of Object.values(byPair)) {
        assert.strictEqual(list.length, 2);
        assert.ok(Faces.same(list[0].face, list[1].face));
      }
      // 서로 다른 쌍은 얼굴이 달라야 한다
      const keys = new Set(Object.values(byPair).map((l) => Faces.key(l[0].face)));
      assert.strictEqual(keys.size, g.pairs);
    }
  }
});

test('짝 맞추기: 쌍끼리는 모두 다른 그림이고, 색/무늬/방향 같은 변형은 쓰지 않는다', () => {
  for (let lv = 1; lv <= 10; lv++) {
    for (let seed = 1; seed <= 20; seed++) {
      const g = Memory.generate(lv, seed);
      const kinds = new Set(g.cards.map((c) => c.face.kind));
      assert.strictEqual(kinds.size, g.pairs, `레벨 ${lv}: 같은 그림의 다른 쌍이 있음`);
      for (const c of g.cards) assert.deepStrictEqual(Object.keys(c.face), ['kind']);
    }
  }
});

test('짝 맞추기 로봇: 다 기억하면 아는 짝을 바로 맞힌다', () => {
  const g = Memory.generate(3, 1);
  const rng = Core.makeRng(1);
  const memory = new Map(g.cards.map((c) => [c.id, c.pair]));
  const matched = new Set();
  const first = Memory.botFirst(g.cards, matched, memory, rng);
  const second = Memory.botSecond(g.cards, matched, memory, first, rng);
  assert.notStrictEqual(first, second);
  assert.strictEqual(g.cards[first].pair, g.cards[second].pair);
});

// ---------- 숨은그림 찾기 ----------
test('숨은그림: 찾을 물건 수가 목록과 같고, 같은 얼굴의 방해 물건은 없다', () => {
  for (let lv = 1; lv <= 10; lv++) {
    for (let seed = 1; seed <= 20; seed++) {
      for (const aspect of [0.7, 1.33]) {
        const g = Hidden.generate(lv, seed, aspect);
        assert.strictEqual(g.objects.length, Hidden.LEVELS[lv].objects, `레벨 ${lv}`);
        assert.strictEqual(g.targets.length, Hidden.LEVELS[lv].targets);
        g.targets.forEach((t, ti) => {
          assert.strictEqual(g.objects.filter((o) => o.target === ti).length, t.count);
          const sameFace = g.objects.filter((o) => o.kind === t.face.kind && (o.hue || 0) === (t.face.hue || 0));
          assert.strictEqual(sameFace.length, t.count, '찾을 것과 똑같이 생긴 방해 물건이 있으면 안 됨');
        });
      }
    }
  }
});

test('숨은그림: 찾을 물건은 앞 물건에 가려지지 않고, 그 자리를 누르면 그 물건이 잡힌다', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = Hidden.generate(5 + (seed % 6), seed, seed % 2 ? 0.7 : 1.33);
    for (const o of g.objects.filter((x) => x.target >= 0)) {
      assert.ok(Hidden.visible(o, g.objects, g.aspect) >= 0.6);
      assert.ok(Hidden.pick(g, o.x, o.y) === o, `seed ${seed}: 찾을 물건 가운데를 눌렀는데 다른 물건이 잡힘`);
    }
  }
});

test('숨은그림: 레벨 7부터는 같은 그림의 다른 색이 섞인다', () => {
  let decoys = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = Hidden.generate(8, seed, 1.33);
    for (const o of g.objects) if (o.target < 0 && g.targets.some((t) => t.face.kind === o.kind)) decoys++;
  }
  assert.ok(decoys > 10, `헷갈리는 물건 ${decoys}개`);
});

// ---------- 다음에 올 것 ----------
test('다음에 올 것: 정답은 규칙대로이고 보기에 정확히 한 번 있다', () => {
  for (let lv = 1; lv <= 10; lv++) {
    const rng = Core.makeRng(lv * 31);
    for (let i = 0; i < 60; i++) {
      const q = Pattern.question(rng, lv);
      const cfg = Pattern.LEVELS[lv];
      assert.ok(cfg.rules.includes(q.rule));
      assert.strictEqual(q.items[q.missing], null);
      assert.ok(q.missing >= q.rule.length, '규칙을 한 바퀴 보여 준 뒤에 빈칸');
      if (!cfg.mid) assert.strictEqual(q.missing, q.items.length - 1);
      // 같은 글자 자리는 같은 얼굴
      const seen = {};
      q.items.forEach((f, idx) => {
        const ch = q.rule[idx % q.rule.length];
        const face = f || q.answer;
        if (seen[ch]) assert.ok(Faces.same(seen[ch], face));
        else seen[ch] = face;
      });
      assert.strictEqual(q.options.filter((o) => Faces.same(o, q.answer)).length, 1);
      assert.ok(Faces.same(q.options[q.answerIndex], q.answer));
      assert.ok(q.options.length >= 2 && q.options.length <= cfg.options);
      assert.strictEqual(new Set(q.options.map(Faces.key)).size, q.options.length, '보기는 서로 달라야 함');
    }
  }
});

test('다음에 올 것: 방향이나 눈만 바뀌는 문제는 없다', () => {
  for (let lv = 1; lv <= 10; lv++) {
    const rng = Core.makeRng(lv);
    for (let i = 0; i < 40; i++) {
      const q = Pattern.question(rng, lv);
      assert.ok(['kind', 'color', 'size'].includes(q.attr), q.attr);
      for (const f of [...q.items.filter(Boolean), ...q.options]) {
        assert.ok(!f.flip && !f.eyes && !f.pattern, '미묘한 변형이 들어감');
      }
    }
  }
});

test('다음에 올 것: 색 규칙은 그림이 모두 같고 색만 다르다', () => {
  const rng = Core.makeRng(5);
  for (let i = 0; i < 30; i++) {
    const q = Pattern.question(rng, 6);
    const kinds = new Set([...q.items.filter(Boolean), ...q.options].map((f) => f.kind));
    assert.strictEqual(kinds.size, 1);
  }
});

test('한 판은 5문제, 같은 시드면 같은 문제', () => {
  assert.strictEqual(Pattern.round(4, 9).length, 5);
  assert.deepStrictEqual(Pattern.round(7, 9), Pattern.round(7, 9));
  assert.deepStrictEqual(Hidden.generate(6, 3, 1), Hidden.generate(6, 3, 1));
  assert.deepStrictEqual(Memory.generate(6, 3), Memory.generate(6, 3));
});
