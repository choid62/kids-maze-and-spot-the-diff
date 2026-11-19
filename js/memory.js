// 짝 맞추기 규칙. 같은 그림 카드 두 장이 한 쌍. 쌍끼리는 모두 다른 그림이고, 레벨이 오르면 카드가 는다.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const Core = isNode ? require('./core.js') : root.Core;
  const Faces = isNode ? require('./faces.js') : root.Faces;

  const MAX_LEVEL = 10;
  // pairs: 쌍 수 (카드는 그 두 배)
  const LEVELS = [null,
    { pairs: 3 }, { pairs: 4 }, { pairs: 5 }, { pairs: 6 }, { pairs: 7 },
    { pairs: 8 }, { pairs: 10 }, { pairs: 12 }, { pairs: 14 }, { pairs: 15 }];

  function generate(level, seed) {
    const rng = Core.makeRng(seed);
    const cfg = LEVELS[Core.clamp(level | 0, 1, MAX_LEVEL)];
    const kinds = rng.shuffle(Faces.KIDS);
    // 쌍마다 서로 다른 그림 (비슷한 그림으로 헷갈리게 하지 않는다)
    const faces = kinds.slice(0, cfg.pairs).map((kind) => ({ kind }));
    const cards = rng.shuffle(faces.flatMap((face, pair) => [{ pair, face }, { pair, face }])).map((c, id) => Object.assign({ id }, c));
    return { level: cfg, cards, pairs: faces.length };
  }

  // 로봇의 한 차례 (카드 두 장 고르기). memory: Map(카드 번호 → 쌍 번호), 로봇이 기억하는 것.
  // open: 이미 맞춘 카드 번호 Set. 첫 장을 뒤집으면 그 정체를 알게 되므로 두 번째는 reveal(첫 장 번호) 뒤에 고른다.
  function botFirst(cards, matched, memory, rng) {
    // 기억 속에 짝이 있으면 그 둘
    const seen = new Map();
    for (const [i, pair] of memory) {
      if (matched.has(i)) continue;
      if (seen.has(pair)) return seen.get(pair);
      seen.set(pair, i);
    }
    const unknown = cards.filter((c) => !matched.has(c.id) && !memory.has(c.id)).map((c) => c.id);
    const any = cards.filter((c) => !matched.has(c.id)).map((c) => c.id);
    return rng.pick(unknown.length ? unknown : any);
  }
  function botSecond(cards, matched, memory, first, rng) {
    const pair = cards[first].pair;
    for (const [i, p] of memory) if (i !== first && p === pair && !matched.has(i)) return i;
    const unknown = cards.filter((c) => c.id !== first && !matched.has(c.id) && !memory.has(c.id)).map((c) => c.id);
    const any = cards.filter((c) => c.id !== first && !matched.has(c.id)).map((c) => c.id);
    return rng.pick(unknown.length ? unknown : any);
  }

  const Memory = { MAX_LEVEL, LEVELS, generate, botFirst, botSecond };
  if (isNode) module.exports = Memory;
  else root.Memory = Memory;
})(typeof self !== 'undefined' ? self : this);
