const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const W = require('../js/words.js');

function rng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

test('모든 단어에 그림 파일이 있고, 단어도 그림도 겹치지 않는다', () => {
  for (const x of W.WORDS) assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'words', x.file + '.svg')), x.w);
  assert.strictEqual(new Set(W.WORDS.map((x) => x.w)).size, W.WORDS.length);
  assert.strictEqual(new Set(W.WORDS.map((x) => x.e)).size, W.WORDS.length);
  assert.ok(W.WORDS.length >= 250);
});

test('레벨마다 단어 길이가 맞고, 단어가 충분하다', () => {
  for (let lv = 1; lv <= W.MAX_LEVEL; lv++) {
    const pool = W.poolFor(lv);
    assert.ok(pool.length >= 35, `레벨 ${lv}: ${pool.length}개`);
  }
  assert.ok(W.poolFor(1).every((x) => x.len === 3));
  assert.ok(W.poolFor(5).every((x) => x.len >= 7));
});

test('한 문제의 단어 3개는 서로 다르고 헷갈리는 그림 묶음이 겹치지 않는다', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const lv = 1 + (seed % W.MAX_LEVEL);
    const r = W.pickRound(lv, {}, rng(seed));
    assert.strictEqual(r.length, 3);
    assert.strictEqual(new Set(r.map((x) => x.w)).size, 3);
    const groups = r.map((x) => x.g).filter(Boolean);
    assert.strictEqual(new Set(groups).size, groups.length, r.map((x) => x.w).join(','));
  }
});

test('안 나온 단어부터 나와서, 단어를 다 쓰기 전에는 같은 단어가 다시 안 나온다', () => {
  for (let lv = 1; lv <= W.MAX_LEVEL; lv++) {
    const pool = W.poolFor(lv);
    const seen = {};
    let tick = 0;
    const shown = [];
    const rand = rng(lv * 7);
    // 판(5문제)을 여러 번: 판 안에서는 skip, 판 사이에는 seen 으로 이어진다
    while (shown.length < pool.length - 6) {
      const skip = new Set();
      for (let q = 0; q < W.ROUNDS; q++) {
        const r = W.pickRound(lv, seen, rand, skip);
        for (const x of r) { skip.add(x.w); seen[x.w] = tick++; shown.push(x.w); }
      }
    }
    const first = shown.slice(0, pool.length - 6);
    assert.strictEqual(new Set(first).size, first.length, `레벨 ${lv}에서 단어가 너무 일찍 반복됨`);
  }
});

test('같은 판 안에서는 이미 나온 단어를 다시 고르지 않는다', () => {
  const skip = new Set(W.poolFor(1).slice(0, 30).map((x) => x.w));
  const r = W.pickRound(1, {}, rng(3), skip);
  assert.ok(r.every((x) => !skip.has(x.w)));
});
