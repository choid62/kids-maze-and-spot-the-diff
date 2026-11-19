// 틀린그림 생성기: 그림(Fluent Emoji)을 배치해 장면을 만들고, 복사본의 몇 곳을 바꾼다.
// 좌표: x, y는 그림 안에서 0~1 비율. size는 그림 높이 대비 비율(그림의 긴 변).
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const Core = isNode ? require('./core.js') : root.Core;
  const EMOJI = isNode ? require('./emoji-data.js') : root.EMOJI;
  const BG_SIZES = isNode ? require('./bg-data.js') : root.BG_SIZES;

  const ASPECT = 4 / 3; // 그림 너비 / 높이
  const MAX_LEVEL = 15;

  // 한 장면에 하나만 있어야 자연스러운 것
  const ONLY_ONE = new Set(['sun', 'sun_with_face', 'crescent_moon', 'full_moon_face', 'house', 'birthday_cake']);

  // zones: 위쪽(하늘/물/벽) 영역과 아래쪽(땅/모래/식탁) 영역. 같은 이름이 여러 번이면 더 자주 뽑힌다.
  const THEMES = {
    park: {
      zones: [
        { kinds: ['sun', 'cloud', 'bird', 'butterfly', 'butterfly', 'balloon', 'kite', 'dove', 'honeybee'], rows: [0.2], size: [0.19, 0.22] },
        { kinds: ['deciduous_tree', 'tulip', 'sunflower', 'blossom', 'mushroom', 'lady_beetle', 'snail', 'dog', 'cat', 'rabbit',
          'hedgehog', 'chipmunk', 'soccer_ball', 'house', 'bicycle', 'automobile', 'potted_plant'], rows: [0.58, 0.84], size: [0.21, 0.25] },
      ],
    },
    sea: {
      zones: [
        { kinds: ['tropical_fish', 'tropical_fish', 'fish', 'blowfish', 'octopus', 'dolphin', 'shark', 'squid', 'jellyfish', 'spouting_whale', 'turtle'],
          rows: [0.2, 0.46], size: [0.19, 0.23] },
        { kinds: ['crab', 'crab', 'lobster', 'shrimp', 'spiral_shell', 'coral', 'rock', 'seal'], rows: [0.82], size: [0.21, 0.25] },
      ],
    },
    farm: {
      zones: [
        { kinds: ['sun', 'cloud', 'bird', 'butterfly', 'dove'], rows: [0.2], size: [0.19, 0.22] },
        { kinds: ['pig', 'cow', 'chicken', 'baby_chick', 'hatching_chick', 'ewe', 'goat', 'horse', 'duck', 'rooster', 'tractor',
          'ear_of_corn', 'carrot', 'tomato', 'eggplant', 'house'], rows: [0.6, 0.85], size: [0.21, 0.25] },
      ],
    },
    space: {
      zones: [
        { kinds: ['rocket', 'ringed_planet', 'crescent_moon', 'full_moon_face', 'star', 'glowing_star', 'comet', 'flying_saucer',
          'alien', 'alien_monster', 'satellite', 'sun_with_face'], rows: [0.18, 0.5, 0.82], size: [0.2, 0.24] },
      ],
    },
    snow: {
      zones: [
        { kinds: ['cloud_with_snow', 'snowflake', 'snowflake', 'bird', 'balloon'], rows: [0.2], size: [0.19, 0.22] },
        { kinds: ['snowman', 'snowman_without_snow', 'penguin', 'polar_bear', 'evergreen_tree', 'christmas_tree', 'wrapped_gift',
          'gloves', 'scarf', 'ice_skate', 'sled', 'house'], rows: [0.6, 0.85], size: [0.21, 0.25] },
      ],
    },
    party: {
      zones: [
        { kinds: ['balloon', 'balloon', 'party_popper', 'ribbon', 'crown', 'star', 'kite'], rows: [0.24], size: [0.18, 0.21] },
        { kinds: ['birthday_cake', 'cupcake', 'doughnut', 'lollipop', 'candy', 'ice_cream', 'soft_ice_cream', 'strawberry', 'red_apple',
          'banana', 'watermelon', 'pizza', 'cookie', 'shortcake', 'teddy_bear', 'wrapped_gift', 'robot', 'yo_yo', 'nesting_dolls',
          'game_die'], rows: [0.6, 0.85], size: [0.2, 0.24] },
      ],
    },
    zoo: {
      zones: [
        { kinds: ['sun', 'cloud', 'parrot', 'bird', 'butterfly'], rows: [0.2], size: [0.19, 0.22] },
        { kinds: ['lion', 'elephant', 'giraffe', 'zebra', 'monkey', 'panda', 'koala', 'kangaroo', 'hippopotamus', 'rhinoceros',
          'flamingo', 'peacock', 'owl', 'palm_tree', 'cactus'], rows: [0.6, 0.85], size: [0.21, 0.25] },
      ],
    },
  };
  for (const id of Object.keys(THEMES)) THEMES[id].id = id;

  // ---------- 배경 소품 (Kenney "Background Elements Redux", CC0) ----------
  // h: 그림 높이 대비 높이 범위, group: 서로 바꿀 수 있는 무리, color: 같은 모양의 다른 색 그림, flip: 좌우가 달라 뒤집기 가능
  const PROPS = {};
  const addProp = (name, h, group, extra) => { PROPS[name] = Object.assign({ h, group }, extra); };
  addProp('tree', [0.2, 0.25], 'tree', { color: 'treeOrange' });
  addProp('treeOrange', [0.2, 0.25], 'tree', { color: 'tree' });
  addProp('treeLong', [0.22, 0.27], 'tree', { color: 'treeLongOrange' });
  addProp('treeLongOrange', [0.22, 0.27], 'tree', { color: 'treeLong' });
  addProp('treePine', [0.2, 0.25], 'tree', { color: 'treePineOrange' });
  addProp('treePineOrange', [0.2, 0.25], 'tree', { color: 'treePine' });
  addProp('treeSnow', [0.2, 0.25], 'tree', { color: 'treeFrozen' });
  addProp('treeFrozen', [0.2, 0.25], 'tree', { color: 'treeSnow' });
  addProp('treePineSnow', [0.2, 0.25], 'tree', { color: 'treePineFrozen' });
  addProp('treePineFrozen', [0.2, 0.25], 'tree', { color: 'treePineSnow' });
  addProp('treeLongSnow', [0.22, 0.27], 'tree', { color: 'treeLongFrozen' });
  addProp('treeLongFrozen', [0.22, 0.27], 'tree', { color: 'treeLongSnow' });
  addProp('treePalm', [0.22, 0.27], 'tree', { flip: true });
  addProp('treeDead', [0.2, 0.25], 'tree', { flip: true });
  for (const n of [1, 2, 3]) {
    addProp('treeSmall_green' + n, [0.1, 0.13], 'small', { color: 'treeSmall_orange' + n });
    addProp('treeSmall_greenAlt' + n, [0.1, 0.13], 'small', { color: 'treeSmall_orange' + n });
    addProp('treeSmall_orange' + n, [0.1, 0.13], 'small', { color: 'treeSmall_green' + n });
    addProp('cactus' + n, [0.12, 0.15], 'cactus', { flip: true });
  }
  for (const n of [1, 2, 3, 4]) {
    addProp('bush' + n, [0.06, 0.08], 'bush', { color: 'bushOrange' + n });
    addProp('bushOrange' + n, [0.06, 0.08], 'bush', { color: 'bush' + n });
    addProp('bushAlt' + n, [0.06, 0.08], 'bush', { color: 'bushOrange' + n });
  }
  for (const n of [1, 2]) {
    addProp('house' + n, [0.17, 0.21], 'house', { color: 'houseAlt' + n, flip: true });
    addProp('houseAlt' + n, [0.17, 0.21], 'house', { color: 'house' + n, flip: true });
    addProp('houseSmall' + n, [0.12, 0.15], 'house', { color: 'houseSmallAlt' + n, flip: true });
    addProp('houseSmallAlt' + n, [0.12, 0.15], 'house', { color: 'houseSmall' + n, flip: true });
  }
  addProp('castleSmall', [0.13, 0.16], 'castle', { color: 'castleSmallAlt' });
  addProp('castleSmallAlt', [0.13, 0.16], 'castle', { color: 'castleSmall' });
  addProp('tower', [0.22, 0.26], 'castle', { color: 'towerAlt' });
  addProp('towerAlt', [0.22, 0.26], 'castle', { color: 'tower' });
  addProp('towerSmall', [0.12, 0.15], 'castle', { color: 'towerSmallAlt' });
  addProp('towerSmallAlt', [0.12, 0.15], 'castle', { color: 'towerSmall' });
  addProp('fence', [0.07, 0.09], 'fence');
  addProp('fenceIron', [0.08, 0.1], 'fence');

  // 장면별 배경: sky 하늘 그라데이션, clouds 구름층, far 먼 풍경, horizon 지평선 높이, ground 땅 두 겹 색,
  // count 소품 개수 범위, props 쓸 소품 (여러 번 = 더 자주)
  const SCENERY = {
    park: { sky: ['#9FDCFF', '#E6F7FF'], clouds: 'cloudLayer1', far: 'hills', horizon: 0.47, ground: ['#7BD08A', '#6AC37A'], count: [4, 6],
      props: ['tree', 'tree', 'treeLong', 'treeSmall_green1', 'treeSmall_green2', 'treeSmall_green3', 'treeSmall_greenAlt2',
        'bush1', 'bush2', 'bush3', 'bushAlt1', 'houseSmall1', 'houseSmall2', 'houseSmallAlt1', 'castleSmall', 'towerSmall', 'fence'] },
    farm: { sky: ['#FFD9A8', '#FFF3DC'], clouds: 'cloudLayerB1', far: 'hillsLarge', horizon: 0.47, ground: ['#BCE07A', '#A9D36A'], count: [4, 6],
      props: ['house1', 'houseAlt2', 'houseSmallAlt1', 'houseSmallAlt2', 'fence', 'fence', 'tree', 'treeOrange', 'treeLong',
        'bush1', 'bush2', 'bushOrange1', 'treeSmall_orange2'] },
    zoo: { sky: ['#9FDCFF', '#FFF1C9'], clouds: 'cloudLayer1', far: 'hills', horizon: 0.46, ground: ['#EBD58A', '#DFC675'], count: [4, 6],
      props: ['treePalm', 'treePalm', 'fenceIron', 'fenceIron', 'cactus1', 'cactus2', 'cactus3', 'bushAlt1', 'bushAlt2', 'bushAlt3',
        'treeSmall_greenAlt1', 'treeSmall_greenAlt3'] },
    snow: { sky: ['#BFD9F2', '#EEF5FD'], clouds: 'cloudLayerB1', far: 'mountains', horizon: 0.48, ground: ['#F7FBFF', '#E8F1FA'], count: [4, 6],
      props: ['treePineSnow', 'treePineSnow', 'treeSnow', 'treeLongSnow', 'treeFrozen', 'treePineFrozen', 'houseSmall1', 'houseSmall2',
        'castleSmall', 'tower'] },
  };
  const THEME_IDS = Object.keys(THEMES);

  // 레벨별 설정: objects 물건 수, diffs 차이 수, cols 한 줄 칸 수, scale 크기 비율,
  // subtle 크기 차이가 미묘해짐(레벨 8부터), dense 줄을 촘촘히 엇갈려 놓아 물건이 서로 겹침(레벨 11부터)
  const LEVELS = [
    null,
    { objects: 8, diffs: 3, cols: 4, scale: 1 },
    { objects: 9, diffs: 3, cols: 4, scale: 1 },
    { objects: 10, diffs: 4, cols: 4, scale: 1 },
    { objects: 11, diffs: 4, cols: 4, scale: 1 },
    { objects: 11, diffs: 5, cols: 4, scale: 1 },
    { objects: 12, diffs: 5, cols: 5, scale: 0.86 },
    { objects: 13, diffs: 6, cols: 5, scale: 0.84 },
    { objects: 14, diffs: 6, cols: 5, scale: 0.82, subtle: true },
    { objects: 14, diffs: 7, cols: 5, scale: 0.8, subtle: true },
    { objects: 14, diffs: 7, cols: 5, scale: 0.78, subtle: true },
    { objects: 16, diffs: 7, cols: 6, scale: 1.05, subtle: true, dense: true },
    { objects: 17, diffs: 8, cols: 6, scale: 1.08, subtle: true, dense: true },
    { objects: 18, diffs: 8, cols: 6, scale: 1.1, subtle: true, dense: true },
    { objects: 19, diffs: 9, cols: 6, scale: 1.12, subtle: true, dense: true },
    { objects: 20, diffs: 9, cols: 6, scale: 1.15, subtle: true, dense: true },
  ];

  // 차이 종류별로 처음 나오는 레벨, 그리고 큰 차이(coarse) 구분
  const TYPES = {
    remove: { from: 1, coarse: true },
    swap: { from: 1, coarse: true },
    color: { from: 1, coarse: true },
    size: { from: 1, coarse: true },
    flip: { from: 3 },
    patternToggle: { from: 3 },
    eyes: { from: 3 },
    partColor: { from: 4 },
    partGrow: { from: 4 },
    patternShape: { from: 5 },
    partHide: { from: 6 },
    partRot: { from: 7 },
    // 배경 소품 차이
    bgHide: { from: 2 },
    bgSwap: { from: 3 },
    bgColor: { from: 4 },
    bgFlip: { from: 6 },
  };

  const PATTERNS = ['dots', 'hearts', 'stars'];
  const HUES = [100, 150, 210, 260];

  function levelConfig(level) {
    return LEVELS[Core.clamp(level | 0, 1, MAX_LEVEL)];
  }

  // ---------- 그림 정보 ----------
  const area = (b) => b[2] * b[3];
  const canPattern = (e) => e.baseShare >= 0.22 && e.p.length <= 26; // baseShare = 몸통이 실제로 보이는 면적 비율
  const patternColor = (rng, e) => (e.baseLum < 0.55 ? '#FFFFFF' : rng.pick(['#FF4F8B', '#4F7BFF', '#9B4FE0', '#FF7A1A']));
  // 부분 변형에 쓸 수 있는 부분 (크게 망가져 보이지 않는 것만)
  const partsWhere = (e, ok) => e.parts.map((p, i) => i).filter((i) => ok(e.parts[i]));
  // seen = 실제로 보이는 면적 비율. 가려진 부분은 숨기거나 색을 바꿔도 티가 안 난다
  const colorParts = (e) => partsWhere(e, (p) => p.sat >= 0.25 && p.share <= 0.3 && p.seen >= 0.015);
  // 범퍼처럼 가늘고 긴 부분은 키우거나 돌리면 어색하다
  const slim = (p) => Math.max(p.box[2], p.box[3]) / Math.max(0.1, Math.min(p.box[2], p.box[3])) > 3.5;
  const growParts = (e) => partsWhere(e, (p) => p.share >= 0.03 && p.share <= 0.15 && !slim(p));
  const rotParts = (e) => partsWhere(e, (p) => p.edge && p.share >= 0.03 && p.share <= 0.2 && !slim(p));
  const hideParts = (e) => partsWhere(e, (p) => p.share <= 0.12 && p.seen >= 0.012);

  // 그림 안의 한 영역(이모지 좌표 상자)을 장면 좌표의 동그라미로
  function spot(o, b, extra) {
    const e = EMOJI[o.kind];
    const [bx, by, bw, bh] = e.box;
    const s = o.size / Math.max(bw, bh);
    const dx = (b[0] + b[2] / 2 - (bx + bw / 2)) * s * (o.flip ? -1 : 1);
    const dy = (b[1] + b[3] / 2 - (by + bh / 2)) * s;
    return { x: o.x + dx / ASPECT, y: o.y + dy, r: Math.max(0.065, (Math.max(b[2], b[3]) / 2) * s * (extra || 1) + 0.04) };
  }

  // 촘촘한 배치: 줄 사이에 줄을 더 넣는다 (줄이 하나뿐인 영역은 위아래로 나눈다)
  function denseRows(rows) {
    if (rows.length === 1) return [rows[0] - 0.065, Math.min(0.87, rows[0] + 0.065)];
    const out = [];
    rows.forEach((y, i) => { out.push(y); if (i < rows.length - 1) out.push((y + rows[i + 1]) / 2); });
    return out;
  }

  function buildSlots(theme, cols, dense) {
    const slots = [];
    theme.zones.forEach((zone, zi) => {
      (dense ? denseRows(zone.rows) : zone.rows).forEach((y, ri) => {
        // 촘촘할 때는 홀수 줄을 반 칸 밀어 엇갈리게
        const shift = dense && ri % 2 ? 0.5 : 0;
        for (let c = 0; c < cols - (shift ? 1 : 0); c++) slots.push({ zone: zi, x: (c + 0.5 + shift) / cols, y });
      });
    });
    return slots;
  }

  // ---------- 가림 검사 (촘촘한 배치에서 차이가 앞 물건에 가려지지 않게) ----------
  const drawsAfter = (p, o) => p.y > o.y || (p.y === o.y && p.id > o.id); // 아래쪽 물건이 앞에 그려진다
  function discPoints(x, y, r) {
    const pts = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const dx = ((i - 2) / 2) * r, dy = ((j - 2) / 2) * r;
      if (dx * dx + dy * dy <= r * r * 1.01) pts.push([x + dx / ASPECT, y + dy]);
    }
    return pts;
  }
  // 점들 중 o보다 앞에 그려지는 물건에 가려지지 않은 비율
  function uncovered(points, o, objs) {
    const front = objs.filter((p) => p !== o && drawsAfter(p, o));
    let free = 0;
    for (const [x, y] of points) if (!front.some((p) => Math.hypot((x - p.x) * ASPECT, y - p.y) < p.size * 0.4)) free++;
    return free / points.length;
  }

  function makeObject(rng, theme, slot, id, counts, cfg, lv) {
    const zone = theme.zones[slot.zone];
    const kind = rng.pick(zone.kinds.filter((k) => !(ONLY_ONE.has(k) && counts[k])));
    counts[kind] = (counts[kind] || 0) + 1;
    const e = EMOJI[kind];
    const jx = cfg.dense ? 0.02 : cfg.cols > 4 ? 0.025 : 0.035;
    const o = {
      id,
      kind,
      size: rng.range(zone.size[0], zone.size[1]) * cfg.scale,
      x: slot.x + rng.range(-jx, jx),
      y: slot.y + rng.range(-0.02, 0.02),
      flip: !e.sym && rng.next() < 0.5,
      zone: slot.zone,
    };
    // 레벨 3부터 몇몇 물건은 처음부터 무늬가 있다
    if (lv >= 3 && canPattern(e) && rng.next() < 0.2) o.pattern = { type: rng.pick(PATTERNS), color: patternColor(rng, e) };
    return o;
  }

  // 물건 하나에 쓸 수 있는 차이 종류
  function applicable(o, theme, lv) {
    const e = EMOJI[o.kind];
    const t = ['remove', 'size'];
    if (theme.zones[o.zone].kinds.some((k) => k !== o.kind && !ONLY_ONE.has(k))) t.push('swap');
    if (e.sat >= 0.3) t.push('color');
    if (!e.sym) t.push('flip');
    if (canPattern(e)) t.push('patternToggle', 'patternShape');
    if (e.eyes) t.push('eyes');
    if (colorParts(e).length) t.push('partColor');
    if (growParts(e).length) t.push('partGrow');
    if (rotParts(e).length) t.push('partRot');
    if (hideParts(e).length) t.push('partHide');
    return t.filter((x) => TYPES[x].from <= lv);
  }

  // 레벨이 높을수록 작은(세밀한) 차이를 더 자주
  function weight(type, lv, used) {
    let w = 1;
    if (lv >= 6) w = TYPES[type].coarse ? 0.45 : 1.5;
    else if (lv >= 4) w = TYPES[type].coarse ? 0.8 : 1.2;
    return w / (1 + 2.5 * (used[type] || 0));
  }

  function weightedPick(rng, items, weights) {
    const sum = weights.reduce((x, y) => x + y, 0);
    let r = rng.next() * sum;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  // 차이 하나를 적용하고 동그라미 위치를 돌려준다. before = 왼쪽 그림의 물건, o = 오른쪽 그림의 물건
  function applyDiff(rng, type, before, o, theme, cfg) {
    const e = EMOJI[o.kind];
    const setPart = (pi, mod) => { o.parts = Object.assign({}, o.parts, { [pi]: mod }); };
    switch (type) {
      case 'remove':
        o.removed = true;
        return spot(before, e.box, 1);
      case 'size':
        o.size *= rng.next() < 0.5 ? (cfg.subtle ? 1.28 : 1.35) : (cfg.subtle ? 0.74 : 0.6);
        return { x: before.x, y: before.y, r: Math.max(before.size, o.size) / 2 + 0.05 };
      case 'swap': {
        const choices = Array.from(new Set(theme.zones[o.zone].kinds)).filter((k) => k !== o.kind && !ONLY_ONE.has(k));
        o.kind = rng.pick(choices);
        o.flip = !EMOJI[o.kind].sym && o.flip;
        delete o.pattern;
        return { x: before.x, y: before.y, r: o.size / 2 + 0.05 };
      }
      case 'color':
        o.hue = rng.pick(HUES);
        return { x: before.x, y: before.y, r: o.size / 2 + 0.04 };
      case 'flip':
        o.flip = !o.flip;
        return { x: before.x, y: before.y, r: o.size / 2 + 0.04 };
      case 'patternToggle':
        if (o.pattern) delete o.pattern;
        else o.pattern = { type: rng.pick(PATTERNS), color: patternColor(rng, e) };
        return spot(before, e.baseBox, 1);
      case 'patternShape': {
        // 점박이 → 하트처럼 무늬 모양만 바꾼다 (왼쪽에 무늬가 없으면 같이 만들어 준다)
        if (!before.pattern) before.pattern = { type: rng.pick(PATTERNS), color: patternColor(rng, e) };
        o.pattern = { type: rng.pick(PATTERNS.filter((p) => p !== before.pattern.type)), color: before.pattern.color };
        return spot(before, e.baseBox, 1);
      }
      case 'eyes': {
        o.eyes = 'smile';
        const b = e.eyeBoxes;
        const x0 = Math.min(...b.map((q) => q[0])), y0 = Math.min(...b.map((q) => q[1]));
        const x1 = Math.max(...b.map((q) => q[0] + q[2])), y1 = Math.max(...b.map((q) => q[1] + q[3]));
        return spot(before, [x0, y0, x1 - x0, y1 - y0], 1.2);
      }
      case 'partColor': {
        const pi = rng.pick(colorParts(e));
        setPart(pi, { hue: rng.pick(HUES) });
        return spot(before, e.parts[pi].box, 1.1);
      }
      case 'partGrow': {
        const pi = rng.pick(growParts(e));
        const k = cfg.subtle ? 1.35 : 1.55;
        setPart(pi, { scale: k });
        return spot(before, e.parts[pi].box, k);
      }
      case 'partRot': {
        const pi = rng.pick(rotParts(e));
        setPart(pi, { rot: (rng.next() < 0.5 ? -1 : 1) * (cfg.subtle ? 28 : 38) });
        return spot(before, e.parts[pi].box, 1.3);
      }
      case 'partHide': {
        const pi = rng.pick(hideParts(e));
        setPart(pi, { hide: true });
        return spot(before, e.parts[pi].box, 1.1);
      }
    }
    throw new Error('모르는 차이: ' + type);
  }

  // ---------- 배경 소품 배치와 차이 ----------
  const ratio = (name) => BG_SIZES[name][0] / BG_SIZES[name][1];

  // 지평선을 칸으로 나눠 칸마다 소품 하나 (서로 겹치지 않게)
  function makeProps(rng, sc) {
    const n = sc.count[0] + rng.int(sc.count[1] - sc.count[0] + 1);
    const slotW = 1 / n;
    const list = [];
    for (let i = 0; i < n; i++) {
      const name = rng.pick(sc.props);
      const p = { id: 1000 + i, name, slotW, x: 0, y: sc.horizon + 0.012, h: 0, flip: !!PROPS[name].flip && rng.next() < 0.5 };
      fitProp(rng, p);
      p.x = (i + 0.5) * slotW + rng.range(-1, 1) * Math.max(0, (slotW - propWidth(p)) / 2) * 0.8;
      list.push(p);
    }
    return list;
  }
  // 소품 높이를 고르고, 칸보다 넓으면 줄인다
  function fitProp(rng, p) {
    const r = PROPS[p.name].h;
    p.h = rng.range(r[0], r[1]);
    const maxW = p.slotW * 0.92;
    if (propWidth(p) > maxW) p.h *= maxW / propWidth(p);
  }
  const propWidth = (p) => (p.h * ratio(p.name)) / ASPECT; // 그림 너비 대비 비율

  // 소품이 이모지에 가려지지 않고 보이는 비율 (5x5 점 검사)
  function propVisible(p, covers) {
    const w = propWidth(p);
    let seen = 0;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const x = p.x - w / 2 + ((i + 0.5) / 5) * w, y = p.y - p.h + ((j + 0.5) / 5) * p.h;
      if (!covers.some((o) => Math.hypot((x - o.x) * ASPECT, y - o.y) < o.r)) seen++;
    }
    return seen / 25;
  }

  function bgApplicable(p, sc, lv) {
    const meta = PROPS[p.name];
    const t = ['bgHide'];
    if (sc.props.some((n) => n !== p.name && PROPS[n].group === meta.group && PROPS[n].color !== p.name)) t.push('bgSwap');
    if (meta.color && BG_SIZES[meta.color]) t.push('bgColor');
    if (meta.flip) t.push('bgFlip');
    return t.filter((x) => TYPES[x].from <= lv);
  }

  function applyBgDiff(rng, type, before, p, sc) {
    if (type === 'bgHide') p.removed = true;
    else if (type === 'bgFlip') p.flip = !p.flip;
    else if (type === 'bgColor') p.name = PROPS[p.name].color;
    else if (type === 'bgSwap') {
      const group = PROPS[p.name].group;
      p.name = rng.pick(sc.props.filter((n) => n !== p.name && PROPS[n].group === group && PROPS[n].color !== before.name));
      fitProp(rng, p);
      p.flip = !!PROPS[p.name].flip && p.flip;
    }
    // 바뀌기 전과 후를 모두 덮는 동그라미
    const h = Math.max(before.h, p.h), w = Math.max(propWidth(before), propWidth(p));
    return { x: before.x, y: before.y - h / 2, r: Math.max(w * ASPECT, h) / 2 + 0.03 };
  }

  function generate(level, seed, themeId) {
    const rng = Core.makeRng(seed);
    const lv = Core.clamp(level | 0, 1, MAX_LEVEL);
    const cfg = levelConfig(lv);
    const theme = THEMES[themeId] || THEMES[rng.pick(THEME_IDS)];
    const sc = SCENERY[theme.id] || null;
    const all = buildSlots(theme, cfg.cols, cfg.dense);

    const pool = rng.shuffle(all);
    // 빈자리 하나는 "추가" 차이용으로 남겨 둔다
    const otherCount = Math.min(pool.length - 1, cfg.objects);

    const counts = {};
    const a = [];
    for (const s of pool.slice(0, otherCount)) a.push(makeObject(rng, theme, s, a.length, counts, cfg, lv));
    const freeSlots = pool.slice(otherCount);
    const propsA = sc ? makeProps(rng, sc) : [];

    const diffs = [];
    const touched = new Set();
    const changes = new Map(); // id → 오른쪽 그림의 물건 또는 소품

    const useAdd = freeSlots.length > 0 && rng.next() < (lv >= 6 ? 0.2 : 0.35);
    const changeCount = cfg.diffs - (useAdd ? 1 : 0);

    // 이모지에 가려지는 소품은 차이로 쓰지 않는다 (커지는 차이와 추가될 자리까지 넉넉히 고려)
    const covers = a.map((o) => ({ x: o.x, y: o.y, r: (o.size / 2) * 1.1 }));
    if (useAdd) covers.push({ x: freeSlots[0].x, y: freeSlots[0].y, r: 0.14 });
    const bgCandidates = propsA.filter((p) => propVisible(p, covers) >= 0.6);
    const maxBg = lv <= 3 ? 1 : 2;
    let bgCount = 0;

    const used = {};
    const candidates = rng.shuffle([...a.map((o) => ({ bg: false, o })), ...bgCandidates.map((o) => ({ bg: true, o }))]);
    for (const { bg, o: before } of candidates) {
      if (diffs.length >= changeCount) break;
      if (touched.has(before.id)) continue;
      if (bg && bgCount >= maxBg) continue;
      // 앞 물건에 많이 가려진 물건은 차이로 쓰지 않는다
      if (!bg && uncovered(discPoints(before.x, before.y, before.size * 0.35), before, a) < 0.6) continue;
      const types = bg ? bgApplicable(before, sc, lv) : applicable(before, theme, lv);
      if (!types.length) continue;
      const type = weightedPick(rng, types, types.map((t) => weight(t, lv, used)));
      const o = Object.assign({}, before);
      const hadPattern = before.pattern;
      const where = bg ? applyBgDiff(rng, type, before, o, sc) : applyDiff(rng, type, before, o, theme, cfg);
      // 바뀐 곳(동그라미 가운데)이 가려지면 이 차이는 버리고 다른 물건을 고른다
      if (!bg && uncovered(discPoints(where.x, where.y, Math.min(where.r, before.size * 0.4) * 0.6), before, a) < 0.5) {
        if (!hadPattern) delete before.pattern; // patternShape가 왼쪽 그림에 더한 무늬 되돌리기
        continue;
      }
      used[type] = (used[type] || 0) + 1;
      if (bg) bgCount++;
      changes.set(o.id, o);
      touched.add(before.id);
      diffs.push(Object.assign({ id: o.id, type }, where));
    }

    // 바뀌지 않은 물건은 마지막에 복사한다 (patternShape가 왼쪽 그림에 무늬를 더했을 수 있으므로)
    const b = a.map((o) => changes.get(o.id) || Object.assign({}, o)).filter((o) => !o.removed);
    const propsB = propsA.map((p) => changes.get(p.id) || Object.assign({}, p)).filter((p) => !p.removed);
    if (useAdd) {
      const added = makeObject(rng, theme, freeSlots[0], a.length, counts, cfg, lv);
      b.push(added);
      diffs.push({ id: added.id, type: 'add', x: added.x, y: added.y, r: added.size / 2 + 0.05 });
    }

    return { theme: theme.id, aspect: ASPECT, a, b, propsA, propsB, scenery: sc, diffs, level: lv, seed };
  }

  // 터치 위치(그림 안 비율 좌표)에 가장 가까운, 아직 못 찾은 차이
  function hitTest(scene, nx, ny, foundSet, tolerance) {
    let best = -1, bestD = Infinity;
    scene.diffs.forEach((d, i) => {
      if (foundSet && foundSet.has(i)) return;
      const dist = Math.hypot((nx - d.x) * scene.aspect, ny - d.y);
      if (dist <= d.r + (tolerance || 0) && dist < bestD) { best = i; bestD = dist; }
    });
    return best;
  }

  const Scene = { uncovered, discPoints, generate, hitTest, levelConfig, applicable, PROPS, SCENERY, THEMES, THEME_IDS, TYPES, ASPECT, MAX_LEVEL };
  if (isNode) module.exports = Scene;
  else root.Scene = Scene;
})(typeof self !== 'undefined' ? self : this);
