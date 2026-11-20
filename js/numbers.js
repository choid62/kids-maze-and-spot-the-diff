// 덧셈·뺄셈 놀이 3가지의 문제 만들기 (화면과 무관한 순수 함수).
//   버스 정류장(Bus Stop): 버스에 동물이 타고 내린 뒤 몇 마리가 남았는지
//   몬스터 밥 주기(Feed Me!): 몬스터가 원하는 수만큼 접시에 더 놓거나 덜어 내기
//   10 만들기(Make 10): 더해서 목표 수가 되는 카드 두 장 찾기
(function (root) {
  const ROUND = 5; // 버스, 몬스터: 한 판 문제 수

  // ---------- 버스 정류장 ----------
  // start 처음 탄 수 범위, stops 정류장 수, ops 'add' | 'sub' | 'mix', max 버스에 탈 수 있는 최대, step 한 번에 타고 내리는 최대
  const BUS_LEVELS = [null,
    { start: [1, 3], stops: 1, ops: 'add', max: 5, step: 2 },
    { start: [2, 4], stops: 1, ops: 'add', max: 7, step: 3 },
    { start: [3, 5], stops: 1, ops: 'sub', max: 5, step: 2 },
    { start: [2, 5], stops: 1, ops: 'mix', max: 8, step: 3 },
    { start: [2, 5], stops: 2, ops: 'mix', max: 9, step: 3 },
    { start: [3, 6], stops: 2, ops: 'mix', max: 10, step: 4 },
  ];
  const BUS_MAX_LEVEL = BUS_LEVELS.length - 1;

  // { start, events: [+2, -1, ...], answer }. 버스에는 늘 1마리 이상, max 이하.
  function busQuestion(level, rng) {
    const cfg = BUS_LEVELS[Math.max(1, Math.min(BUS_MAX_LEVEL, level))];
    for (;;) {
      const start = cfg.start[0] + rng.int(cfg.start[1] - cfg.start[0] + 1);
      let n = start;
      const events = [];
      let ok = true;
      for (let i = 0; i < cfg.stops; i++) {
        const add = cfg.ops === 'add' || (cfg.ops === 'mix' && rng.next() < 0.5);
        const room = add ? cfg.max - n : n - 1;
        if (room < 1) { ok = false; break; }
        const k = 1 + rng.int(Math.min(cfg.step, room));
        events.push(add ? k : -k);
        n += add ? k : -k;
      }
      // 섞기 레벨은 두 정류장이 모두 같은 방향이 아니면 좋다 (덧셈, 뺄셈 둘 다 나오게)
      if (ok && cfg.stops > 1 && events.every((e) => Math.sign(e) === Math.sign(events[0])) && rng.next() < 0.7) ok = false;
      if (ok) return { start, events, answer: n };
    }
  }

  // 정답을 포함한 보기 3개 (정답 가까운 수, 0~10)
  function choices(answer, rng, lo, hi) {
    lo = lo == null ? 0 : lo;
    hi = hi == null ? 10 : hi;
    const set = new Set([answer]);
    const near = [answer - 1, answer + 1, answer - 2, answer + 2].filter((x) => x >= lo && x <= hi);
    for (const x of rng.shuffle(near.slice(0, 2)).concat(rng.shuffle(near.slice(2)))) {
      if (set.size >= 3) break;
      set.add(x);
    }
    return Array.from(set).sort((a, b) => a - b);
  }

  // ---------- 몬스터 밥 주기 ----------
  // want 원하는 수 범위, mode 'add'(접시에 적게) | 'sub'(접시에 많이) | 'mix', dots 말풍선에 점 그림도 보여 주기, count 접시 수 표시
  const MONSTER_LEVELS = [null,
    { want: [2, 5], mode: 'add', dots: true, count: true },
    { want: [4, 7], mode: 'add', dots: true, count: true },
    { want: [5, 10], mode: 'add', dots: false, count: true },
    { want: [2, 7], mode: 'sub', dots: true, count: true },
    { want: [3, 10], mode: 'mix', dots: false, count: true },
    { want: [3, 10], mode: 'mix', dots: false, count: false },
  ];
  const MONSTER_MAX_LEVEL = MONSTER_LEVELS.length - 1;
  const FOODS = [
    { kind: 'cookie', one: 'cookie', many: 'cookies' },
    { kind: 'strawberry', one: 'strawberry', many: 'strawberries' },
    { kind: 'red_apple', one: 'apple', many: 'apples' },
    { kind: 'doughnut', one: 'donut', many: 'donuts' },
    { kind: 'cupcake', one: 'cupcake', many: 'cupcakes' },
    { kind: 'banana', one: 'banana', many: 'bananas' },
  ];

  // { want, have, food }. add: 1 <= have < want, sub: want < have <= 10
  function monsterQuestion(level, rng) {
    const cfg = MONSTER_LEVELS[Math.max(1, Math.min(MONSTER_MAX_LEVEL, level))];
    const want = cfg.want[0] + rng.int(cfg.want[1] - cfg.want[0] + 1);
    const sub = cfg.mode === 'sub' || (cfg.mode === 'mix' && want < 10 && rng.next() < 0.5);
    let have;
    if (sub) have = want + 1 + rng.int(Math.min(4, 10 - want));
    else have = 1 + rng.int(want - 1); // 1 ~ want-1 (접시가 비어 있으면 답이 원하는 수 그대로라 너무 쉽다)
    return { want, have, food: rng.pick(FOODS) };
  }

  // ---------- 10 만들기 ----------
  // target 만들 수, pairs 짝 수, zero 0 카드 쓰기
  const TEN_LEVELS = [null,
    { target: 5, pairs: 3 },
    { target: 6, pairs: 4 },
    { target: 7, pairs: 4 },
    { target: 8, pairs: 5 },
    { target: 9, pairs: 5 },
    { target: 10, pairs: 5 },
    { target: 10, pairs: 6, zero: true },
  ];
  const TEN_MAX_LEVEL = TEN_LEVELS.length - 1;

  // { target, cards: [수...] }. 어떤 두 장을 먼저 맞혀도 남은 카드는 늘 짝이 맞는다.
  function tenBoard(level, rng) {
    const cfg = TEN_LEVELS[Math.max(1, Math.min(TEN_MAX_LEVEL, level))];
    const t = cfg.target;
    const lows = [];
    for (let a = cfg.zero ? 0 : 1; a <= t / 2; a++) lows.push(a);
    // 서로 다른 짝을 먼저 쓰고, 모자라면 다시
    const pick = [];
    while (pick.length < cfg.pairs) pick.push(...rng.shuffle(lows.slice()));
    const cards = [];
    for (const a of pick.slice(0, cfg.pairs)) cards.push(a, t - a);
    return { target: t, cards: rng.shuffle(cards) };
  }

  const Numbers = {
    ROUND, BUS_LEVELS, BUS_MAX_LEVEL, busQuestion, choices,
    MONSTER_LEVELS, MONSTER_MAX_LEVEL, FOODS, monsterQuestion,
    TEN_LEVELS, TEN_MAX_LEVEL, tenBoard,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Numbers;
  else root.Numbers = Numbers;
})(typeof self !== 'undefined' ? self : this);
