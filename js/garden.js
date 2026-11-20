// 식물 키우기(Grow It!) 이야기 만들기. 한 판 = 씨앗 하나를 심어 거둘 때까지 (바로 하는 형식).
// 판마다 고를 수 있는 씨앗, 돌보기 사건의 종류·순서·개수가 달라진다.
(function (root) {
  // type: fruit(꽃 → 벌 → 열매 따기) | sunflower(해 따라 돌기 → 벌 → 씨앗 모으기) | root(땅속 당근 뽑기)
  const PLANTS = {
    strawberry: { id: 'strawberry', name: 'Strawberry', type: 'fruit', fruit: 'strawberry', one: 'strawberry', many: 'strawberries', height: 0.3, spread: 1.5 },
    tomato: { id: 'tomato', name: 'Tomato', type: 'fruit', fruit: 'tomato', one: 'tomato', many: 'tomatoes', height: 0.56, spread: 1 },
    sunflower: { id: 'sunflower', name: 'Sunflower', type: 'sunflower', fruit: 'sunflower', one: 'seed', many: 'seeds', height: 0.42, spread: 1 },
    carrot: { id: 'carrot', name: 'Carrot', type: 'root', fruit: 'carrot', one: 'carrot', many: 'carrots', height: 0.22, spread: 1 },
  };
  const IDS = Object.keys(PLANTS);
  // 돌보기 사건: thirsty(목말라요, 물방울 세기) | cloud(구름 치우기) | bugs(애벌레 쫓기) | rain(소나기, 물 안 줘도 됨)
  const NEEDS = ['thirsty', 'cloud', 'bugs', 'rain'];
  const STAGES = ['plant', 'sprout', 'grow', 'bloom', 'harvest'];

  const between = (rng, a, b) => a + rng.int(b - a + 1);

  // 고를 씨앗 3가지
  function seedChoices(rng) {
    return rng.shuffle(IDS.slice()).slice(0, 3);
  }

  // 한 판의 이야기
  function plan(plantId, rng) {
    const p = PLANTS[plantId];
    const types = rng.shuffle(NEEDS.slice()).slice(0, 3);
    // 소나기 바로 뒤에 목말라요는 어색하다
    const ri = types.indexOf('rain');
    if (ri >= 0 && types[ri + 1] === 'thirsty') [types[ri], types[ri + 1]] = [types[ri + 1], types[ri]];
    const needs = types.map((type) => {
      if (type === 'thirsty') return { type, drops: between(rng, 2, 4) };
      if (type === 'bugs') return { type, n: between(rng, 3, 6) };
      return { type };
    });
    const out = { plant: plantId, drops: between(rng, 2, 4), needs };
    if (p.type === 'fruit') {
      out.flowers = between(rng, 3, 5);
      out.ripeFirst = between(rng, 1, out.flowers - 1); // 처음에 익은 것 (나머지는 초록 → 나중에 익음)
    } else if (p.type === 'sunflower') {
      out.seeds = between(rng, 5, 8);
    } else {
      out.carrots = between(rng, 3, 5);
    }
    return out;
  }

  // 몇 개를 거두는지
  function harvestCount(pl) {
    return pl.flowers || pl.seeds || pl.carrots || 0;
  }

  const Garden = { PLANTS, IDS, NEEDS, STAGES, seedChoices, plan, harvestCount };
  if (typeof module !== 'undefined' && module.exports) module.exports = Garden;
  else root.Garden = Garden;
})(typeof self !== 'undefined' ? self : this);
