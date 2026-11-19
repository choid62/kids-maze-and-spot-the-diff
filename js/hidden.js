// 숨은그림 찾기 규칙. 장면 하나에 물건을 늘어놓고, 위쪽 목록의 물건(그림+색)을 정해진 수만큼 찾는다.
// 좌표: x, y는 그림 안 0~1 비율, size는 그림 높이 대비 비율. aspect = 그림 너비 / 높이.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const Core = isNode ? require('./core.js') : root.Core;
  const Scene = isNode ? require('./scene.js') : root.Scene;
  const Faces = isNode ? require('./faces.js') : root.Faces;
  const EMOJI = isNode ? require('./emoji-data.js') : root.EMOJI;

  const MAX_LEVEL = 10;
  // objects 물건 수, targets 찾을 종류 수, count 종류마다 몇 개, dense 겹치게, decoy 같은 그림의 다른 색 섞기
  const LEVELS = [null,
    { objects: 10, targets: 1, count: [2, 2] },
    { objects: 12, targets: 1, count: [3, 3] },
    { objects: 14, targets: 2, count: [1, 2] },
    { objects: 16, targets: 2, count: [2, 3] },
    { objects: 18, targets: 2, count: [2, 3], dense: true },
    { objects: 20, targets: 3, count: [1, 3], dense: true },
    { objects: 22, targets: 3, count: [2, 3], dense: true, decoy: true },
    { objects: 24, targets: 3, count: [2, 4], dense: true, decoy: true },
    { objects: 27, targets: 3, count: [2, 4], dense: true, decoy: true },
    { objects: 30, targets: 4, count: [2, 4], dense: true, decoy: true },
  ];
  const HUES = [0, 110, 180, 250];
  const fkey = (o) => o.kind + '|' + (o.hue || 0);

  // 아래쪽 물건이 앞에 그려진다. 앞에 그려지는 물건에 가려지지 않은 비율
  function visible(o, objs, aspect) {
    const front = objs.filter((p) => p !== o && (p.y > o.y || (p.y === o.y && p.id > o.id)));
    let free = 0, all = 0;
    const r = o.size * 0.33;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const dx = ((i - 2) / 2) * r, dy = ((j - 2) / 2) * r;
      if (dx * dx + dy * dy > r * r * 1.01) continue;
      all++;
      const x = o.x + dx / aspect, y = o.y + dy;
      if (!front.some((p) => Math.hypot((x - p.x) * aspect, y - p.y) < p.size * 0.42)) free++;
    }
    return free / all;
  }

  function attempt(rng, level, aspect, themeId) {
    const cfg = LEVELS[level];
    const theme = Scene.THEMES[themeId] || Scene.THEMES[rng.pick(Scene.THEME_IDS)];
    const zones = theme.zones;
    const upperKinds = Array.from(new Set(zones[0].kinds)).filter((k) => !['sun', 'sun_with_face', 'crescent_moon', 'full_moon_face'].includes(k));
    const lowerKinds = Array.from(new Set(zones[zones.length - 1].kinds)).filter((k) => !['house', 'birthday_cake'].includes(k));
    const horizon = zones.length > 1 ? 0.42 : -1;

    // 칸 나누기: 물건 수보다 넉넉하게
    const n = cfg.objects;
    const cols = Math.max(3, Math.round(Math.sqrt(n * 1.25 * aspect)));
    const rows = Math.max(3, Math.ceil((n * 1.25) / cols));
    const cellH = 0.9 / rows;
    const size = Math.min(cellH, 1 / cols * aspect) * (cfg.dense ? 1.15 : 0.85);
    const slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const shift = cfg.dense && r % 2 ? 0.5 : 0;
      if (shift && c === cols - 1) continue;
      slots.push({ x: (c + 0.5 + shift) / cols, y: 0.06 + (r + 0.5) * cellH });
    }
    const chosen = rng.shuffle(slots).slice(0, n);

    // 찾을 것 정하기: 위/아래 영역 어디에나 놓일 수 있는 그림 중에서
    const targets = [];
    const pool = rng.shuffle(Array.from(new Set([...upperKinds, ...lowerKinds])));
    for (const kind of pool) {
      if (targets.length >= cfg.targets) break;
      const hue = cfg.decoy && Faces.colorful(kind) ? rng.pick(HUES) : 0;
      targets.push({ face: { kind, hue }, count: cfg.count[0] + rng.int(cfg.count[1] - cfg.count[0] + 1) });
    }
    const targetKeys = new Set(targets.map((t) => fkey(t.face)));

    // 자리마다 물건: 먼저 찾을 것들, 나머지는 방해 물건
    const objects = [];
    let s = 0;
    targets.forEach((t, ti) => {
      for (let i = 0; i < t.count; i++) {
        const slot = chosen[s++];
        objects.push({ kind: t.face.kind, hue: t.face.hue || 0, target: ti, x: slot.x, y: slot.y });
      }
    });
    const targetKinds = new Set(targets.map((t) => t.face.kind));
    for (; s < chosen.length; s++) {
      const slot = chosen[s];
      const kinds = (slot.y < horizon ? upperKinds : lowerKinds).filter((k) => !targetKinds.has(k));
      let o;
      // 헷갈리는 물건: 찾을 그림과 같은 그림, 다른 색
      if (cfg.decoy && rng.next() < 0.3) {
        const t = rng.pick(targets.filter((x) => Faces.colorful(x.face.kind)));
        if (t) {
          const hue = rng.pick(HUES.filter((h) => h !== (t.face.hue || 0)));
          o = { kind: t.face.kind, hue, target: -1 };
        }
      }
      if (!o) o = { kind: rng.pick(kinds.length ? kinds : lowerKinds.filter((k) => !targetKinds.has(k))), hue: 0, target: -1 };
      objects.push(Object.assign(o, { x: slot.x, y: slot.y }));
    }
    objects.forEach((o, id) => {
      o.id = id;
      o.size = size * rng.range(0.92, 1.08);
      o.x += rng.range(-0.25, 0.25) / cols * 0.5;
      o.y += rng.range(-0.2, 0.2) * cellH * 0.5;
      o.flip = !EMOJI[o.kind].sym && rng.next() < 0.5;
    });
    return { theme: theme.id, aspect, objects, targets, targetKeys };
  }

  // 찾을 물건이 모두 잘 보이고, 찾을 것이 아닌데 같은 얼굴인 물건이 없는 장면이 나올 때까지 다시 만든다
  function generate(level, seed, aspect, themeId) {
    const lv = Core.clamp(level | 0, 1, MAX_LEVEL);
    const a = Core.clamp(aspect || 4 / 3, 0.55, 1.8);
    for (let t = 0; t < 200; t++) {
      const rng = Core.makeRng((seed + t * 7919) >>> 0);
      const g = attempt(rng, lv, a, themeId);
      const ok = g.objects.every((o) => o.target < 0 ? !g.targetKeys.has(fkey(o)) : visible(o, g.objects, a) >= 0.6);
      if (ok) {
        delete g.targetKeys;
        g.level = lv;
        return g;
      }
    }
    throw new Error('장면을 만들 수 없음');
  }

  // 누른 곳에서 가장 앞에 보이는 물건 (없으면 null)
  function pick(g, nx, ny) {
    let best = null;
    for (const o of g.objects) {
      if (Math.hypot((nx - o.x) * g.aspect, ny - o.y) > o.size * 0.48) continue;
      if (!best || o.y > best.y || (o.y === best.y && o.id > best.id)) best = o;
    }
    return best;
  }

  const Hidden = { MAX_LEVEL, LEVELS, generate, pick, visible };
  if (isNode) module.exports = Hidden;
  else root.Hidden = Hidden;
})(typeof self !== 'undefined' ? self : this);
