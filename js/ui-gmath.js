// 정원 수학(Garden Math) 화면: 식물 하나를 키우며 5장면 동안 덧셈·뺄셈 문제를 푼다.
// 문제를 먼저 묻고(예: "8개 중 3개를 따면 몇 개 남을까?"), 답을 고르면 그대로 움직여 보여 준다 (따기, 새가 먹기, 벌이 오기 ...).
// 배경과 식물은 캔버스에, 셀 수 있는 것(씨앗, 물방울, 벌레, 꽃, 열매)은 그 위의 그림(img)으로 그린다.
(function (root) {
  const S = {
    active: false, token: {}, timers: [], onEnd: null, rng: null, demo: false,
    level: 1, round: null, si: 0, sc: null, firstTry: 0, tries: 0, busy: false, speaking: false, pending: null,
    g: 0, sprouts: 0, sproutG: 0, items: [], basket: 0, showBasket: false, W: 0, H: 0, dpr: 1,
  };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { const tk = S.token; S.timers.push(setTimeout(() => { if (S.token === tk) f(); }, ms)); };

  function anim(ms, step, done) {
    const tk = S.token, t0 = performance.now();
    const f = () => {
      if (S.token !== tk) return;
      const k = Math.min(1, (performance.now() - t0) / ms);
      step(k);
      if (k < 1) setTimeout(f, 16);
      else if (done) done();
    };
    f();
  }
  const ease = (k) => 1 - Math.pow(1 - k, 3);

  // ---------- 그림 조각 ----------
  const DROP = '<svg viewBox="0 0 40 50" class="gm-drop"><path d="M20 2 C28 16 36 24 36 33 A16 16 0 0 1 4 33 C4 24 12 16 20 2 Z" fill="#3FA9F5"/><ellipse cx="13" cy="32" rx="4" ry="7" fill="#fff" opacity="0.5"/></svg>';
  const DROP_EMPTY = '<svg viewBox="0 0 40 50" class="gm-drop"><path d="M20 2 C28 16 36 24 36 33 A16 16 0 0 1 4 33 C4 24 12 16 20 2 Z" fill="rgba(255,255,255,0.6)" stroke="#3FA9F5" stroke-width="3" stroke-dasharray="5 4"/></svg>';
  const CAN = '<svg viewBox="0 0 100 80" class="gm-can"><path d="M70 34 L96 14" stroke="#2F8FD8" stroke-width="9" stroke-linecap="round"/><rect x="18" y="26" width="56" height="48" rx="10" fill="#3FA9F5"/><path d="M28 28 C28 4 64 4 64 28" fill="none" stroke="#2F8FD8" stroke-width="8"/><rect x="24" y="40" width="44" height="8" rx="4" fill="#fff" opacity="0.35"/></svg>';
  const IMG = (name) => `<img src="assets/words/${name}.svg" alt="" draggable="false">`;
  function html(kind) {
    if (kind === 'seed') return '<span class="gm-seed"></span>';
    if (kind === 'hole') return '<span class="gm-hole"></span>';
    if (kind === 'drop') return DROP;
    if (kind === 'drop-empty') return DROP_EMPTY;
    if (kind === 'bud') return '<span class="gm-bud"></span>';
    if (kind === 'pack') return '<span class="gm-pack"><span class="gm-seed"></span><span class="gm-seed"></span></span>';
    if (kind === 'can') return CAN;
    if (kind === 'cloud') return IMG('rain');
    if (kind === 'basket') return IMG('basket');
    return IMG(kind);
  }

  // ---------- 화면 ----------
  function init(onEnd) {
    S.onEnd = onEnd;
    S.canvas = $('gmath-canvas');
    S.ctx = S.canvas.getContext('2d');
    $('gmath-choices').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b && !b.disabled) answer(+b.dataset.n, b);
    });
    $('gmath-new').addEventListener('click', () => { Sound.tap(); start({}); });
    root.addEventListener('resize', () => { if (S.active) layout(); });
  }

  function start(opts) {
    opts = opts || {};
    stop();
    S.active = true;
    S.demo = opts.demo === 'gmathplay';
    S.level = Core.clamp(opts.level || Store.get('gmathLevel') || 1, 1, GardenMath.MAX_LEVEL);
    S.rng = Core.makeRng(opts.seed != null ? opts.seed : Core.newSeed());
    S.round = GardenMath.round(S.level, S.rng, opts.plant || opts.theme);
    Object.assign(S, { si: 0, firstTry: 0, g: 0, sprouts: 0, sproutG: 0, items: [], basket: 0, showBasket: false, busy: false, speaking: false, pending: null });
    $('gmath-level').textContent = `Level ${S.level} · ${Core.levelName(S.level)} ▾`;
    $('screen-gmath').classList.remove('speaking');
    layout();
    later(scene, 200);
  }

  function stop() {
    S.active = false;
    S.token = {};
    S.timers.forEach(clearTimeout);
    S.timers = [];
    const l = $('gmath-layer');
    if (l) l.querySelectorAll('.gm-fly').forEach((f) => f.remove());
  }

  function layout() {
    const box = $('gmath-stage').getBoundingClientRect();
    S.dpr = Math.min(root.devicePixelRatio || 1, 3);
    S.W = box.width;
    S.H = box.height;
    S.canvas.width = Math.round(S.W * S.dpr);
    S.canvas.height = Math.round(S.H * S.dpr);
    S.canvas.style.width = S.W + 'px';
    S.canvas.style.height = S.H + 'px';
    if (S.W) { draw(); renderItems(); }
  }

  // ---------- 말 ----------
  // 화면 글자 + 목소리. 말하는 동안에는 보기를 누를 수 없다 (말이 끊기지 않게)
  let sayTok = 0;
  function say(text, speech) {
    const el = $('gmath-caption');
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    const words = speech || text;
    const my = ++sayTok;
    S.speaking = true;
    $('screen-gmath').classList.add('speaking');
    Sound.say(words, () => {
      if (my !== sayTok) return;
      S.speaking = false;
      $('screen-gmath').classList.remove('speaking');
      const fn = S.pending;
      S.pending = null;
      if (fn) later(fn, 300);
    }, 900 + words.length * 85);
  }
  function afterSay(fn, minMs) {
    later(() => { if (!S.speaking) fn(); else S.pending = fn; }, minMs || 0);
  }

  // ---------- 자리 (px) ----------
  const groundY = () => S.H * 0.8;
  const rowX = (i, n, mid, span, max) => S.W * (mid + (i - (n - 1) / 2) * Math.min(max, span / n));
  // 식물 윗부분(잎 덩어리): 가운데와 반지름. c = 자란 정도에 따른 크기
  function crown() {
    const t = S.round.plant.type, gy = groundY(), H = S.H, W = S.W;
    const c = S.g <= 0.35 ? 0 : 0.45 + 0.55 * Math.min(1, (S.g - 0.35) / 0.65);
    if (t === 'tree') { const rx = Math.min(W * 0.3, H * 0.36) * c; return { x: W * 0.5, y: gy - H * 0.46 * c, rx, ry: rx * 0.78, c }; }
    if (t === 'bush') { const rx = Math.min(W * 0.3, H * 0.36) * c; return { x: W * 0.5, y: gy - H * 0.34 * c, rx, ry: rx * 0.74, c }; }
    const rx = Math.min(W * 0.4, H * 0.55) * c;
    return { x: W * 0.5, y: gy - H * 0.14 * c, rx, ry: H * 0.14 * c, c };
  }
  function spotSize(n) {
    const k = crown();
    const rows = Math.ceil(n / 5);
    return Math.max(18, Math.min(S.H * 0.11, (k.rx * 1.9) / (Math.min(n, 5) * 1.3 + 0.4), (k.ry * 1.9) / (rows * 1.35)));
  }
  // 잎 덩어리 위에 5개씩 줄 지어 (세기 쉽게)
  function spotPos(i, n) {
    const k = crown(), s = spotSize(n), d = s * 1.3;
    const rows = Math.ceil(n / 5), r = Math.floor(i / 5), inRow = Math.min(5, n - r * 5), j = i - r * 5;
    return { x: k.x + (j - (inRow - 1) / 2) * d, y: k.y + (r - (rows - 1) / 2) * d * 1.05 };
  }
  function posOf(at) {
    const gy = groundY(), H = S.H, W = S.W;
    if (at.t === 'hole') return { x: rowX(at.i, at.n, 0.5, 0.72, 0.085), y: gy + H * 0.05 };
    if (at.t === 'meter') return { x: rowX(at.i, at.n, 0.56, 0.62, 0.07), y: H * 0.13 };
    if (at.t === 'spot') return spotPos(at.i, at.n);
    if (at.t === 'side') { const r = Math.floor(at.i / 3), j = at.i % 3; return { x: W - H * 0.07 - j * H * 0.085, y: H * 0.14 + r * H * 0.09 }; }
    if (at.t === 'grass') return { x: H * 0.06 + (at.i % 3) * H * 0.075, y: gy - H * 0.04 - Math.floor(at.i / 3) * H * 0.07 };
    if (at.t === 'pack') return { x: H * 0.11, y: gy - H * 0.1 };
    if (at.t === 'can') return { x: Math.max(W * 0.1, H * 0.12), y: H * 0.13 };
    if (at.t === 'basket') return { x: W - H * 0.12, y: gy - H * 0.04 };
    return at;
  }
  function sizeOf(it) {
    const H = S.H;
    if (it.kind === 'seed') return H * 0.075;
    if (it.kind === 'hole') return H * 0.1;
    if (it.at.t === 'meter') return Math.min(H * 0.085, S.W * 0.055);
    if (it.kind === 'can' || it.kind === 'cloud') return H * 0.16;
    if (it.kind === 'basket') return H * 0.17;
    if (it.kind === 'pack') return H * 0.17;
    if (it.at.t === 'spot') return spotSize(it.at.n);
    return H * 0.09;
  }

  // ---------- 그리기 ----------
  function draw() {
    const ctx = S.ctx, W = S.W, H = S.H, gy = groundY();
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, '#8FD3FF');
    sky.addColorStop(1, '#E3F6FF');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, gy);
    Draw.object(ctx, 'sun', W - H * 0.09, H * 0.1, H * 0.14);
    ctx.fillStyle = '#7BC67E';
    ctx.fillRect(0, gy - 6, W, 10);
    const soil = ctx.createLinearGradient(0, gy, 0, H);
    soil.addColorStop(0, '#A0703F');
    soil.addColorStop(1, '#7A5230');
    ctx.fillStyle = soil;
    ctx.fillRect(0, gy + 4, W, H - gy);
    if (!S.round) return;
    // 줄 지어 심은 씨앗에서 난 작은 새싹 (가운데는 큰 식물)
    if (S.sprouts) {
      for (let i = 0; i < S.sprouts; i++) {
        const p = posOf({ t: 'hole', i, n: S.sprouts });
        if (Math.abs(p.x - W / 2) < (S.g > 0.35 ? crown().rx * 1.15 : H * 0.05) && S.g > 0) continue; // 큰 식물 뒤에 가리는 새싹은 그리지 않는다
        drawSprout(ctx, p.x, gy, H * 0.09 * S.sproutG);
      }
    }
    drawPlant();
  }

  function leaf(ctx, x, y, len, ang, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(len * 0.5, 0, len * 0.5, len * 0.24, 0, 0, 6.3);
    ctx.fill();
    ctx.restore();
  }
  function drawSprout(ctx, x, gy, h) {
    if (h <= 1) return;
    ctx.strokeStyle = '#3E9B3A';
    ctx.lineWidth = Math.max(3, h * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x - h * 0.1, gy - h * 0.5, x, gy - h); ctx.stroke();
    leaf(ctx, x, gy - h, h * 0.5, -2.6, '#4FB247');
    leaf(ctx, x, gy - h, h * 0.5, -0.5, '#4FB247');
  }

  function drawPlant() {
    if (S.g <= 0) return;
    const ctx = S.ctx, H = S.H, gy = groundY(), t = S.round.plant.type;
    if (S.g <= 0.35) return drawSprout(ctx, S.W / 2, gy, H * 0.2 * Math.min(1, S.g / 0.3));
    const k = crown();
    // 줄기
    if (t === 'tree') {
      const w = H * 0.04 * k.c;
      ctx.fillStyle = '#8B5A33';
      ctx.beginPath();
      ctx.moveTo(k.x - w, gy + 4); ctx.lineTo(k.x - w * 0.55, k.y); ctx.lineTo(k.x + w * 0.55, k.y); ctx.lineTo(k.x + w, gy + 4);
      ctx.fill();
      ctx.strokeStyle = '#8B5A33'; ctx.lineWidth = w * 0.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(k.x, k.y + k.ry * 0.6); ctx.lineTo(k.x - k.rx * 0.4, k.y + k.ry * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k.x, k.y + k.ry * 0.4); ctx.lineTo(k.x + k.rx * 0.45, k.y); ctx.stroke();
    } else if (t === 'bush') {
      ctx.strokeStyle = '#3E9B3A'; ctx.lineWidth = H * 0.018 * k.c; ctx.lineCap = 'round';
      for (const dx of [-0.35, 0, 0.35]) { ctx.beginPath(); ctx.moveTo(k.x + dx * k.rx * 0.3, gy + 4); ctx.quadraticCurveTo(k.x + dx * k.rx * 0.5, (gy + k.y) / 2, k.x + dx * k.rx, k.y); ctx.stroke(); }
      // 지지대
      ctx.strokeStyle = '#B98A5E'; ctx.lineWidth = H * 0.012;
      ctx.beginPath(); ctx.moveTo(k.x + k.rx * 0.9, gy + 6); ctx.lineTo(k.x + k.rx * 0.9, k.y - k.ry * 0.3); ctx.stroke();
    }
    // 잎 덩어리: 여러 원을 겹쳐 그린다
    const blobs = t === 'low'
      ? [[-0.7, 0.15, 0.42], [0.7, 0.15, 0.42], [-0.35, -0.1, 0.5], [0.35, -0.1, 0.5], [0, 0, 0.55]]
      : [[-0.55, 0.2, 0.55], [0.55, 0.2, 0.55], [-0.3, -0.35, 0.6], [0.3, -0.35, 0.6], [0, 0.05, 0.75]];
    ctx.fillStyle = '#3E9B3A';
    for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.ellipse(k.x + bx * k.rx, k.y + by * k.ry, br * k.rx + 6, br * k.ry * (t === 'low' ? 1.7 : 1) + 6, 0, 0, 6.3); ctx.fill(); }
    ctx.fillStyle = '#5DB85A';
    for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.ellipse(k.x + bx * k.rx, k.y + by * k.ry, br * k.rx, br * k.ry * (t === 'low' ? 1.7 : 1), 0, 0, 6.3); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(k.x - k.rx * 0.3, k.y - k.ry * 0.4, k.rx * 0.35, k.ry * 0.22, -0.3, 0, 6.3); ctx.fill();
  }

  // ---------- 셀 수 있는 것들 ----------
  const item = (kind, at, extra) => Object.assign({ kind, at }, extra || {});
  // 그림 요소는 한 번 만들어 두고 자리·모양만 바꾼다 (다시 만들면 그림을 새로 불러오며 깜빡인다)
  function renderItems() {
    const layer = $('gmath-layer');
    const keep = new Set();
    for (const it of S.items) {
      if (it.hidden) continue;
      if (!it.el || it.elKind !== it.kind) {
        if (it.el) it.el.remove();
        it.el = document.createElement('div');
        it.el.innerHTML = html(it.kind);
        it.elKind = it.kind;
        layer.appendChild(it.el);
      }
      const el = it.el;
      if (el.parentNode !== layer) layer.appendChild(el);
      keep.add(el);
      el.className = 'gm-item' + (it.mark ? ' mark' : '') + (it.ghost ? ' ghost' : '') + (it.pop ? ' pop' : '');
      let tag = el.querySelector('.gm-tag');
      if (it.tag != null) {
        if (!tag) { tag = document.createElement('span'); el.appendChild(tag); }
        tag.className = 'gm-tag ' + (it.tagCls || '');
        tag.textContent = it.tag;
      } else if (tag) tag.remove();
      place(el, posOf(it.at), sizeOf(it));
      it.pop = false;
    }
    if (S.showBasket) {
      if (!S.basketEl) { S.basketEl = document.createElement('div'); S.basketEl.innerHTML = html('basket') + '<b></b>'; }
      const el = S.basketEl;
      el.className = 'gm-item gm-basket';
      el.querySelector('b').textContent = S.basket || '';
      el.querySelector('b').style.display = S.basket ? '' : 'none';
      place(el, posOf({ t: 'basket' }), sizeOf({ kind: 'basket', at: {} }));
      if (el.parentNode !== layer) layer.appendChild(el);
      keep.add(el);
    }
    layer.querySelectorAll('.gm-item').forEach((e) => { if (!keep.has(e)) e.remove(); });
  }
  function place(el, p, size) {
    el.style.width = el.style.height = size + 'px';
    el.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px)`;
  }
  function refresh() { draw(); renderItems(); }

  // 하나를 a 에서 b 로 날린다
  function fly(kind, a, b, size, ms, done, arc, flip) {
    const f = document.createElement('div');
    f.className = 'gm-fly' + (flip ? ' flip' : '');
    f.innerHTML = html(kind);
    f.style.width = f.style.height = size + 'px';
    $('gmath-layer').appendChild(f);
    const h = arc == null ? 50 : arc;
    anim(ms, (k) => {
      const e = ease(k);
      f.style.transform = `translate(${a.x + (b.x - a.x) * e - size / 2}px, ${a.y + (b.y - a.y) * e - size / 2 - Math.sin(Math.PI * k) * h}px)`;
    }, () => { f.remove(); if (done) done(); });
    return f;
  }

  function grow(to, ms, done) {
    const from = S.g;
    anim(ms, (k) => { S.g = from + (to - from) * ease(k); refresh(); }, done);
  }

  // ---------- 장면 ----------
  const P = () => S.round.plant;
  const plural = (n, one, many) => (n === 1 ? one : many);
  const where = () => (P().type === 'tree' ? 'on the tree' : 'on the plant');

  // 장면마다: 보이는 것, 묻는 말, 보기 그림
  function scene() {
    S.sc = S.round.scenes[S.si];
    S.tries = 0;
    S.busy = false;
    const s = S.sc, hint = S.round.hint;
    $('gmath-dots').innerHTML = Array.from({ length: GardenMath.ROUND }, (_, i) => `<span class="dot${i < S.si ? ' on' : ''}${i === S.si ? ' now' : ''}"></span>`).join('');
    S.items = [];
    S.showBasket = false;
    let text, pic;
    if (s.type === 'seeds') {
      S.items.push(item('pack', { t: 'pack' }));
      for (let i = 0; i < s.total; i++) {
        if (i < s.a) S.items.push(item('seed', { t: 'hole', i, n: s.total }));
        else if (hint) S.items.push(item('hole', { t: 'hole', i, n: s.total }));
      }
      text = `We need ${s.total} seeds. We planted ${s.a}. How many more seeds?`;
      pic = 'seed';
    } else if (s.type === 'water') {
      S.items.push(item(s.variant === 'rain' ? 'cloud' : 'can', { t: 'can' }));
      for (let i = 0; i < s.total; i++) {
        if (i < s.a) S.items.push(item('drop', { t: 'meter', i, n: s.total }));
        else if (hint) S.items.push(item('drop-empty', { t: 'meter', i, n: s.total }));
      }
      text = s.variant === 'rain'
        ? `The rain gave ${s.a} ${plural(s.a, 'drop', 'drops')}. The sprouts need ${s.total}. How many more drops?`
        : `The sprouts need ${s.total} drops of water. They have ${s.a}. How many more drops?`;
      pic = 'drop';
    } else if (s.type === 'bugs') {
      const kind = s.variant === 'snail' ? 'snail' : 'bug';
      for (let i = 0; i < s.a; i++) S.items.push(item(kind, { t: 'spot', i, n: s.a }, { mark: hint && i >= s.left }));
      text = s.variant === 'snail'
        ? `${s.a} snails are eating the leaves! We move ${s.b} to the grass. How many will be left?`
        : `${s.a} caterpillars are eating the leaves! A bird will eat ${s.b}. How many will be left?`;
      pic = kind;
    } else if (s.type === 'bloom') {
      const kind = s.variant;
      for (let i = 0; i < s.a; i++) S.items.push(item(kind, { t: 'spot', i, n: s.total }));
      if (hint) for (let i = 0; i < s.b; i++) S.items.push(kind === 'flower' ? item('bud', { t: 'spot', i: s.a + i, n: s.total }) : item(kind, { t: 'side', i }, { wait: true }));
      const name = { flower: ['flower', 'flowers', 'opened', 'will open'], bee: ['bee', 'bees', 'are visiting', 'are coming'], butterfly: ['butterfly', 'butterflies', 'are visiting', 'are coming'] }[kind];
      const first = s.a === 1 ? `1 ${name[0]} ${kind === 'flower' ? 'opened' : 'is visiting'}.` : `${s.a} ${name[1]} ${name[2]}.`;
      text = `${first} ${s.b} more ${name[3]}. How many ${name[1]} in all?`;
      pic = kind;
    } else {
      S.showBasket = s.variant === 'pick';
      const f = P();
      if (s.kind === 'gone') {
        for (let i = 0; i < s.left; i++) S.items.push(item(f.img, { t: 'spot', i, n: s.a }));
        text = `There were ${s.a} ${f.many}. We picked some. Now ${s.left} ${s.left === 1 ? 'is' : 'are'} left. How many did we pick?`;
      } else {
        for (let i = 0; i < s.a; i++) S.items.push(item(f.img, { t: 'spot', i, n: s.a }, { mark: hint && i >= s.left }));
        text = s.variant === 'bird'
          ? `There are ${s.a} ${f.many} ${where()}. A bird will eat ${s.b}. How many will be left?`
          : `There are ${s.a} ${f.many} ${where()}. We pick ${s.b}. How many will be left ${where()}?`;
      }
      pic = f.img;
    }
    S.pic = pic;
    refresh();
    showEq(true);
    choices();
    say(text);
    if (S.demo) demoAnswer();
  }

  function showEq(ask) {
    const e = GardenMath.equation(S.sc);
    const cls = e.op === '+' ? 'plus' : 'minus';
    const cell = (key, v) => (key === e.q
      ? `<span class="t ans${ask ? ' q' : ''} ${cls}">${ask ? '?' : v}</span>`
      : `<span class="t${key === 'm' ? ' ' + cls : ''}">${v}</span>`);
    $('gmath-eq').innerHTML = `${cell('l', e.l)}<span class="op ${cls}">${e.op}</span>${cell('m', e.m)}<span class="op">=</span>${cell('r', e.r)}`;
  }

  // 보기 3개: 숫자 대신 그림 n 개
  function choices() {
    const box = $('gmath-choices');
    box.innerHTML = '';
    const icon = Math.max(22, Math.min(40, Math.floor((Math.min(root.innerWidth, 900) - 60) / 3 / 5.9)));
    const max = GardenMath.LEVELS[S.level].max;
    for (const n of Numbers.choices(S.sc.answer, S.rng, 1, max)) {
      const b = document.createElement('button');
      b.className = 'pic-choice gm-choice';
      b.dataset.n = n;
      b.setAttribute('aria-label', String(n));
      b.style.setProperty('--icon', icon + 'px');
      b.innerHTML = Array.from({ length: n }, () => `<span class="gm-ico">${html(S.pic)}</span>`).join('');
      box.appendChild(b);
    }
  }

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function answer(n, btn) {
    if (S.busy || !S.active || S.speaking) return;
    Sound.unlock();
    if (n === S.sc.answer) {
      Sound.found();
      btn.classList.add('right');
      if (S.tries === 0) S.firstTry++;
      solve();
    } else {
      S.tries++;
      Sound.miss();
      btn.disabled = true;
      btn.classList.add('wrong');
      shake(btn);
      if (S.tries >= 2) solve();
      else say('Not quite. Try again!');
    }
  }

  // ---------- 답 보여 주기 ----------
  function solve() {
    S.busy = true;
    $('gmath-choices').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    showEq(false);
    const s = S.sc;
    const go = { seeds: solveSeeds, water: solveWater, bugs: solveTake, bloom: solveBloom, harvest: s.kind === 'gone' ? solveGone : solveTake }[s.type];
    later(go, 300);
  }

  // 하나씩 차례로: fn(j, next)
  function each(n, fn, done, gap) {
    const step = (j) => (j >= n ? done() : fn(j, () => later(() => step(j + 1), gap == null ? 120 : gap)));
    step(0);
  }

  // 남은 것을 1부터 세며 숫자를 붙인다
  function countUp(list, done) {
    each(list.length, (j, next) => {
      list[j].tag = j + 1;
      list[j].pop = true;
      Sound.step();
      renderItems();
      later(next, 330);
    }, () => later(done, 400), 0);
  }
  const clearTags = () => { S.items.forEach((it) => { it.tag = null; }); renderItems(); };

  // 씨앗: 봉투에서 빈 구멍으로 하나씩 (1, 2, 3 ...) → 흙 덮고 싹
  function solveSeeds() {
    const s = S.sc;
    const from = posOf({ t: 'pack' });
    each(s.answer, (j, next) => {
      const at = { t: 'hole', i: s.a + j, n: s.total };
      Sound.step();
      fly('seed', from, posOf(at), S.H * 0.075, 450, () => {
        S.items = S.items.filter((it) => !(it.kind === 'hole' && it.at.i === at.i));
        S.items.push(item('seed', at, { tag: j + 1, tagCls: 'plus', pop: true }));
        renderItems();
        next();
      }, 70);
    }, () => later(() => {
      // 흙을 덮으면 모든 씨앗에서 싹이 난다
      S.items = S.items.filter((it) => it.kind === 'pack');
      S.sprouts = s.total;
      anim(900, (k) => { S.sproutG = ease(k); S.g = 0.3 * ease(k); refresh(); }, () => {
        say(`${s.total} seeds! Seeds sprout in the soil.`);
        afterSay(next, 600);
      });
    }, 700));
  }

  // 물: 물뿌리개(비구름)에서 빈 칸으로 하나씩 → 모두 땅으로 → 쑥 자란다
  function solveWater() {
    const s = S.sc;
    const from = posOf({ t: 'can' });
    each(s.answer, (j, next) => {
      const at = { t: 'meter', i: s.a + j, n: s.total };
      Sound.step();
      fly('drop', from, posOf(at), S.H * 0.07, 420, () => {
        S.items = S.items.filter((it) => !(it.kind === 'drop-empty' && it.at.i === at.i));
        S.items.push(item('drop', at, { tag: j + 1, tagCls: 'plus', pop: true }));
        renderItems();
        next();
      }, 40);
    }, () => later(() => {
      const drops = S.items.filter((it) => it.kind === 'drop');
      const base = { x: S.W / 2, y: groundY() + S.H * 0.04 };
      drops.forEach((d, i) => later(() => {
        const p = posOf(d.at);
        d.hidden = true;
        renderItems();
        fly('drop', p, base, S.H * 0.06, 500, i === drops.length - 1 ? () => {
          Sound.found();
          grow(0.72, 1200, () => {
            say(`${s.total} drops! Roots drink the water, and the plant grows.`);
            afterSay(next, 600);
          });
        } : null, 0);
      }, i * 90));
    }, 600));
  }

  // 빼기 (벌레, 열매): 빠질 것을 하나씩 데려가고(새가 먹거나, 풀밭으로, 바구니로) 남은 것을 센다
  function solveTake() {
    const s = S.sc;
    const gone = S.items.filter((it) => it.at.t === 'spot').slice(s.left).reverse();
    const stays = S.items.filter((it) => it.at.t === 'spot').slice(0, s.left);
    S.items.forEach((it) => { it.mark = false; });
    renderItems();
    const bird = s.variant === 'bird';
    const snail = s.type === 'bugs' && s.variant === 'snail';
    let birdEl = null, birdAt = { x: S.W + 40, y: S.H * 0.2 };
    if (bird) {
      birdEl = document.createElement('div');
      birdEl.className = 'gm-fly gm-bird';
      birdEl.innerHTML = html('bird');
      $('gmath-layer').appendChild(birdEl);
    }
    const bsz = S.H * 0.13;
    const moveBird = (to, ms, done) => {
      const a = birdAt;
      birdAt = to;
      birdEl.style.width = birdEl.style.height = bsz + 'px';
      anim(ms, (k) => {
        const e = ease(k);
        birdEl.style.transform = `translate(${a.x + (to.x - a.x) * e - bsz / 2}px, ${a.y + (to.y - a.y) * e - bsz * 0.9 - Math.sin(Math.PI * k) * 20}px)`;
      }, done);
    };
    each(gone.length, (j, next) => {
      const it = gone[j];
      const p = posOf(it.at);
      const sz = sizeOf(it);
      const done = () => {
        it.hidden = true;
        renderItems();
        Sound.step();
        const t = document.createElement('span');
        t.className = 'gm-tag minus gm-float';
        t.textContent = `−${j + 1}`;
        t.style.transform = `translate(${p.x - 18}px, ${p.y - sz / 2 - 30}px)`;
        $('gmath-layer').appendChild(t);
        later(() => t.remove(), 900);
        next();
      };
      if (bird) moveBird(p, j === 0 ? 650 : 380, () => later(done, 120));
      else if (snail) { it.hidden = true; renderItems(); fly('snail', p, posOf({ t: 'grass', i: j }), sz, 520, () => { S.items.push(item('snail', { t: 'grass', i: j })); done(); }, 40); }
      else { it.hidden = true; renderItems(); fly(it.kind, p, posOf({ t: 'basket' }), sz, 520, () => { S.basket++; done(); }, 70); }
    }, () => {
      const after = () => later(() => countUp(stays, finish), 300);
      if (bird) moveBird({ x: -60, y: S.H * 0.1 }, 700, () => { birdEl.remove(); after(); });
      else after();
    }, 150);
    function finish() {
      const f = P();
      let text;
      if (s.type === 'bugs') text = snail ? `${s.left} left! Snails munch on leaves, so we moved them.` : `${s.left} left! Birds help gardens by eating bugs.`;
      else text = bird ? `${s.left} left ${where()}! The bird had a snack.` : `${s.left} ${plural(s.left, f.one, f.many)} left ${where()}! Yum!`;
      say(text);
      afterSay(next, 900);
    }
  }

  // 더하기 (꽃, 벌, 나비): 더 오는 것을 하나씩 (이어 세기: 3 → 4, 5)
  function solveBloom() {
    const s = S.sc;
    each(s.b, (j, next) => {
      const at = { t: 'spot', i: s.a + j, n: s.total };
      const tag = s.a + j + 1;
      Sound.step();
      if (s.variant === 'flower') {
        S.items = S.items.filter((it) => !(it.kind === 'bud' && it.at.i === at.i));
        S.items.push(item('flower', at, { tag, tagCls: 'plus', pop: true }));
        renderItems();
        later(next, 380);
      } else {
        const w = S.items.find((it) => it.wait && !it.hidden);
        const from = w ? posOf(w.at) : { x: S.W + 30, y: S.H * (0.1 + 0.08 * j) };
        if (w) { w.hidden = true; renderItems(); }
        fly(s.variant, from, posOf(at), spotSize(s.total), 600, () => {
          S.items.push(item(s.variant, at, { tag, tagCls: 'plus', pop: true }));
          renderItems();
          next();
        }, 40);
      }
    }, () => later(() => {
      // 첫 묶음에도 숫자를 붙여 모두 몇인지 보여 준다
      S.items.filter((it) => it.at.t === 'spot' && it.at.i < s.a).forEach((it) => { it.tag = it.at.i + 1; it.tagCls = ''; });
      renderItems();
      const text = {
        flower: `${s.total} flowers! Bees will come to visit them.`,
        bee: `${s.total} bees! Bees carry pollen from flower to flower.`,
        butterfly: `${s.total} butterflies! Butterflies drink sweet nectar.`,
      }[s.variant];
      say(text);
      afterSay(next, 900);
    }, 500));
  }

  // 몇 개 땄나? (8 − ? = 5): 빈 자리에 딴 열매가 흐리게 하나씩 나타나고(1, 2, 3) 바구니로
  function solveGone() {
    const s = S.sc, f = P();
    S.showBasket = true;
    renderItems();
    const ghosts = [];
    each(s.b, (j, next) => {
      const g = item(f.img, { t: 'spot', i: s.left + j, n: s.a }, { ghost: true, tag: j + 1, tagCls: 'plus', pop: true });
      S.items.push(g);
      ghosts.push(g);
      Sound.step();
      renderItems();
      later(next, 380);
    }, () => later(() => {
      each(ghosts.length, (j, next) => {
        const g = ghosts[j];
        g.hidden = true;
        renderItems();
        fly(f.img, posOf(g.at), posOf({ t: 'basket' }), sizeOf(g), 450, () => { S.basket++; renderItems(); next(); }, 60);
      }, () => {
        say(`We picked ${s.b}! ${s.left} + ${s.b} makes ${s.a}.`, `We picked ${s.b}! ${s.left} plus ${s.b} makes ${s.a}.`);
        afterSay(next, 900);
      }, 60);
    }, 500));
  }

  // 다음 장면으로. 장면 사이에 식물이 자란다
  function next() {
    clearTags();
    S.si++;
    if (S.si >= GardenMath.ROUND) return end();
    const type = S.round.scenes[S.si].type;
    S.items = [];
    S.showBasket = false;
    refresh();
    if (type === 'bugs') return grow(0.8, 700, scene);
    if (type === 'bloom') return grow(1, 700, scene);
    if (type === 'harvest') {
      say(`The flowers turned into ${P().many}!`);
      return afterSay(scene, 500);
    }
    scene();
  }

  function end() {
    let newLevel = 0;
    if (S.firstTry >= 4 && S.level < GardenMath.MAX_LEVEL) {
      newLevel = S.level + 1;
      Store.set('gmathLevel', newLevel);
    }
    S.onEnd('gmath', newLevel);
  }

  // 자가 점검용: 홀수 번째 장면은 한 번 틀린 뒤 정답 (말이 끝나기를 기다린다)
  function demoAnswer() {
    const tap = (fn) => { const f = () => (S.speaking ? later(f, 300) : fn()); later(f, 600); };
    tap(() => {
      const btns = Array.from(document.querySelectorAll('#gmath-choices button'));
      const wrong = btns.find((b) => +b.dataset.n !== S.sc.answer);
      if (S.si % 2 && wrong) wrong.click();
      tap(() => { const r = btns.find((b) => +b.dataset.n === S.sc.answer); if (r && !S.busy) r.click(); });
    });
  }

  root.GardenMathGame = { init, start, stop, MAX_LEVEL: GardenMath.MAX_LEVEL };
})(typeof self !== 'undefined' ? self : this);
