// 정원 수학(Garden Math) 문제 만들기 (화면과 무관한 순수 함수).
// 한 판 = 식물 하나를 키우는 이야기 5장면. 장면마다 덧셈 또는 뺄셈 문제 하나.
//   1. 씨앗 심기(seeds)  : 씨앗 5개가 필요한데 3개 심었다 → 몇 개 더?   (3 + ? = 5)
//   2. 물 주기(water)    : 새싹에 물 5방울이 필요한데 3방울 있다 → 몇 방울 더? (3 + ? = 5)
//   3. 벌레(bugs)        : 애벌레 6마리, 새가 2마리 먹었다 → 몇 마리 남았나?  (6 − 2 = ?)
//   4. 꽃 피기(bloom)    : 꽃 2송이 + 3송이 더 → 모두 몇?                       (2 + 3 = ?)
//   5. 거두기(harvest)   : 열매 8개, 3개 땄다 → 나무에 몇 개 남았나?           (8 − 3 = ?)
//      높은 레벨에서는 "8개였는데 5개 남았다 → 몇 개 땄나?" (8 − ? = 5) 도 나온다.
(function (root) {
  const ROUND = 5;

  // type: tree(나무) | bush(포기) | low(땅에 낮게 퍼짐)
  const PLANTS = [
    { id: 'apple', name: 'Apple', type: 'tree', img: 'apple', one: 'apple', many: 'apples' },
    { id: 'peach', name: 'Peach', type: 'tree', img: 'peach', one: 'peach', many: 'peaches' },
    { id: 'lemon', name: 'Lemon', type: 'tree', img: 'lemon', one: 'lemon', many: 'lemons' },
    { id: 'cherry', name: 'Cherry', type: 'tree', img: 'cherry', one: 'cherry', many: 'cherries' },
    { id: 'pear', name: 'Pear', type: 'tree', img: 'pear', one: 'pear', many: 'pears' },
    { id: 'tomato', name: 'Tomato', type: 'bush', img: 'tomato', one: 'tomato', many: 'tomatoes' },
    { id: 'strawberry', name: 'Strawberry', type: 'low', img: 'strawberry', one: 'strawberry', many: 'strawberries' },
  ];

  // max 가장 큰 수, hint 모자란 자리(빈 구멍·빈 물방울 칸)를 보여 주기, missing "몇 개 땄나?" 문제 섞기
  const LEVELS = [null,
    { max: 5, hint: true },
    { max: 7, hint: true },
    { max: 10, hint: true },
    { max: 10, hint: false },
    { max: 10, hint: false, missing: true },
  ];
  const MAX_LEVEL = LEVELS.length - 1;

  // 장면마다 고를 수 있는 이야기
  const VARIANTS = {
    seeds: ['row'],
    water: ['can', 'rain'],
    bugs: ['bird', 'snail'],          // 새가 애벌레를 먹는다 | 달팽이를 풀밭으로 옮겨 준다
    bloom: ['flower', 'bee', 'butterfly'],
    harvest: ['pick', 'bird'],        // 우리가 딴다 | 새가 먹는다
  };
  const SCENES = ['seeds', 'water', 'bugs', 'bloom', 'harvest'];

  const between = (rng, a, b) => a + rng.int(b - a + 1);

  // 문제 하나. kind: 'need'(a + ? = total) | 'sum'(a + b = ?) | 'take'(a − b = ?) | 'gone'(a − ? = left)
  // 늘 a >= 1, 답 >= 1, 모든 수 <= max
  function scene(type, cfg, rng) {
    const max = cfg.max;
    const variant = rng.pick(VARIANTS[type]);
    if (type === 'seeds' || type === 'water') {
      const total = between(rng, 3, max);
      const a = between(rng, 1, total - 1);
      return { type, variant, kind: 'need', a, total, answer: total - a };
    }
    if (type === 'bloom') {
      const total = between(rng, 3, max);
      const a = between(rng, 1, total - 1);
      return { type, variant, kind: 'sum', a, b: total - a, total, answer: total };
    }
    // bugs, harvest: 빼기
    const a = between(rng, 3, max);
    const b = between(rng, 1, a - 1);
    const kind = type === 'harvest' && cfg.missing && rng.next() < 0.5 ? 'gone' : 'take';
    return { type, variant, kind, a, b, left: a - b, answer: kind === 'gone' ? b : a - b };
  }

  // 한 판: 식물 + 장면 5개 (같은 답이 연달아 나오지 않게)
  function round(level, rng, plantId) {
    const cfg = LEVELS[Math.max(1, Math.min(MAX_LEVEL, level))];
    const plant = PLANTS.find((p) => p.id === plantId) || rng.pick(PLANTS);
    const scenes = [];
    for (const type of SCENES) {
      let s;
      for (let t = 0; t < 20; t++) {
        s = scene(type, cfg, rng);
        const prev = scenes[scenes.length - 1];
        if (!prev || prev.answer !== s.answer) break;
      }
      scenes.push(s);
    }
    return { plant, hint: cfg.hint, scenes };
  }

  // 식 [왼쪽, 연산, 가운데, 오른쪽] 과 물음표 자리 (0 | 2 | 3 중 어디가 ? 인지)
  function equation(s) {
    if (s.kind === 'need') return { l: s.a, op: '+', m: s.answer, r: s.total, q: 'm' };
    if (s.kind === 'sum') return { l: s.a, op: '+', m: s.b, r: s.total, q: 'r' };
    if (s.kind === 'take') return { l: s.a, op: '−', m: s.b, r: s.left, q: 'r' };
    return { l: s.a, op: '−', m: s.b, r: s.left, q: 'm' };
  }

  const GardenMath = { ROUND, PLANTS, LEVELS, MAX_LEVEL, VARIANTS, SCENES, scene, round, equation };
  if (typeof module !== 'undefined' && module.exports) module.exports = GardenMath;
  else root.GardenMath = GardenMath;
})(typeof self !== 'undefined' ? self : this);
