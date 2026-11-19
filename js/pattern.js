// 다음에 올 것 (규칙 찾기). 🍎🍌🍎🍌❓ 처럼 반복되는 규칙에서 빈칸에 들어갈 것을 고른다.
// 레벨이 오르면 규칙이 길어지고(AB → AAB → ABC → AABB → ABCD), 빈칸이 중간으로 가고,
// 그림은 같고 색/크기만 바뀌는 규칙이 나온다. (방향이나 눈처럼 미묘한 차이는 쓰지 않는다)
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const Core = isNode ? require('./core.js') : root.Core;
  const Faces = isNode ? require('./faces.js') : root.Faces;

  const MAX_LEVEL = 10;
  const QUESTIONS = 5; // 한 판 문제 수
  // rules 쓸 규칙, len 보여 줄 칸 수, mid 빈칸이 중간에도, options 보기 수, attrs 바뀌는 것(kind 그림/color 색/size 크기)
  const LEVELS = [null,
    { rules: ['AB'], len: 4, mid: false, options: 2, attrs: ['kind'] },
    { rules: ['AB', 'AAB'], len: 6, mid: false, options: 3, attrs: ['kind'] },
    { rules: ['AAB', 'ABB', 'ABC'], len: 6, mid: false, options: 3, attrs: ['kind'] },
    { rules: ['ABB', 'ABC', 'AABB'], len: 7, mid: true, options: 3, attrs: ['kind'] },
    { rules: ['ABC', 'AABB', 'ABCD', 'ABB'], len: 8, mid: true, options: 4, attrs: ['kind'] },
    { rules: ['AB', 'AAB', 'ABB'], len: 6, mid: true, options: 3, attrs: ['color'] },
    { rules: ['AB', 'AAB', 'ABB'], len: 6, mid: true, options: 3, attrs: ['size', 'color'] },
    { rules: ['ABC', 'AABB', 'ABB'], len: 8, mid: true, options: 4, attrs: ['kind', 'color'] },
    { rules: ['ABCD', 'AABB', 'ABBC', 'ABC'], len: 8, mid: true, options: 4, attrs: ['kind', 'color', 'size'] },
    { rules: ['ABCD', 'AABBC', 'ABBC', 'AABC'], len: 9, mid: true, options: 4, attrs: ['kind', 'color', 'size'] },
  ];

  // 규칙 글자(A, B, C...) 하나마다 얼굴 하나. attr에 따라 같은 그림의 다른 색/크기/방향
  function symbolFaces(rng, attr, count) {
    if (attr === 'kind') return rng.shuffle(Faces.KIDS).slice(0, count).map((kind) => ({ kind }));
    if (attr === 'color') {
      const kind = rng.pick(Faces.KIDS.filter(Faces.colorful));
      return rng.shuffle([0, 110, 180, 250, 300]).slice(0, count).map((hue) => ({ kind, hue }));
    }
    // size: 크기 차이가 한눈에 보이도록 세 가지만 (큼, 중간, 작음)
    const kind = rng.pick(Faces.KIDS);
    return rng.shuffle([1, 0.66, 0.38]).slice(0, count).map((scale) => ({ kind, scale }));
  }

  function question(rng, level) {
    const cfg = LEVELS[Core.clamp(level | 0, 1, MAX_LEVEL)];
    for (let tries = 0; ; tries++) {
      const rule = rng.pick(cfg.rules);
      const letters = Array.from(new Set(rule.split('')));
      const attr = rng.pick(cfg.attrs);
      // 크기는 세 가지뿐이라 글자가 그보다 많으면 다른 규칙으로
      const faces = symbolFaces(rng, attr, Math.max(letters.length, cfg.options));
      if (faces.length < letters.length) continue;
      const faceOf = (ch) => faces[letters.indexOf(ch)];
      const n = Math.max(cfg.len, rule.length + 2);
      const seq = Array.from({ length: n }, (_, i) => faceOf(rule[i % rule.length]));
      // 빈칸: 규칙을 한 바퀴 다 보여 준 뒤에
      const missing = cfg.mid ? rule.length + rng.int(n - rule.length) : n - 1;
      const answer = seq[missing];
      // 보기: 정답 + 규칙에 나온 다른 것 + 모자라면 같은 종류의 새 얼굴
      const opts = [answer];
      for (const f of faces) {
        if (opts.length >= cfg.options) break;
        if (!opts.some((o) => Faces.same(o, f))) opts.push(f);
      }
      if (opts.length < Math.min(cfg.options, 2)) continue;
      const options = rng.shuffle(opts);
      return { rule, attr, items: seq.map((f, i) => (i === missing ? null : f)), missing, answer, options, answerIndex: options.findIndex((o) => Faces.same(o, answer)) };
    }
  }

  // 한 판: 문제 5개
  function round(level, seed) {
    const rng = Core.makeRng(seed);
    return Array.from({ length: QUESTIONS }, () => question(rng, level));
  }

  const Pattern = { MAX_LEVEL, LEVELS, QUESTIONS, question, round };
  if (isNode) module.exports = Pattern;
  else root.Pattern = Pattern;
})(typeof self !== 'undefined' ? self : this);
