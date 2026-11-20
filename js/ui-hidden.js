// 숨은그림 찾기 화면: 위쪽 목록의 물건을 장면에서 찾아 누른다.
(function (root) {
  const HINT_AFTER_MS = 120000;
  const MARK = '#FF3B6B';
  const S = { active: false, g: null, found: new Set(), foundAt: new Map(), rect: null, w: 0, h: 0, dpr: 1, raf: 0, pic: null,
    lastActivity: 0, hint: null, usedHint: false, won: false, ripples: [], sparks: [], onEnd: null };
  const $ = (id) => document.getElementById(id);

  function init(onEnd) {
    S.onEnd = onEnd;
    S.canvas = $('hidden-canvas');
    S.ctx = S.canvas.getContext('2d');
    S.canvas.addEventListener('pointerdown', onDown);
    $('hidden-hint').addEventListener('click', () => { Sound.tap(); showHint(); });
    root.addEventListener('resize', () => { if (S.active) { layout(); draw(); } });
  }

  function start(opts) {
    opts = opts || {};
    const level = Core.clamp(opts.level || Store.get('hiddenLevel') || 1, 1, Hidden.MAX_LEVEL);
    const box = S.canvas.parentElement.getBoundingClientRect();
    const aspect = Core.clamp((box.width - 16) / Math.max(1, box.height - 16), 0.6, 1.7);
    S.g = Hidden.generate(level, opts.seed != null ? opts.seed : Core.newSeed(), aspect, opts.theme);
    S.found = new Set();
    S.foundAt = new Map();
    S.hint = null;
    S.usedHint = false;
    S.won = false;
    S.ripples = [];
    S.sparks = [];
    S.lastActivity = performance.now();
    $('hidden-level').textContent = `Level ${level} · ${Core.levelName(level)} ▾`;
    buildTargets();
    layout();
    draw();
    S.active = true;
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(frame);
    BgImages.whenReady(() => { if (S.active) draw(); });
    if (opts.demo === 'hiddenplay') setTimeout(autoTap, 400);
  }

  function stop() {
    S.active = false;
    cancelAnimationFrame(S.raf);
  }

  // 위쪽 목록: 찾을 물건의 영어 단어와 찾은 수
  function buildTargets() {
    const box = $('hidden-targets');
    box.innerHTML = '';
    S.g.targets.forEach((t, ti) => {
      const chip = document.createElement('span');
      chip.className = 'target';
      chip.dataset.t = ti;
      chip.innerHTML = '<span class="word"></span><b></b>';
      chip.querySelector('.word').textContent = t.word;
      box.appendChild(chip);
    });
    updateTargets();
  }

  function updateTargets() {
    S.g.targets.forEach((t, ti) => {
      const got = S.g.objects.filter((o) => o.target === ti && S.found.has(o.id)).length;
      const chip = document.querySelector(`#hidden-targets .target[data-t="${ti}"]`);
      chip.querySelector('b').textContent = `${got}/${t.count}`;
      chip.classList.toggle('done', got === t.count);
    });
  }

  function layout() {
    const box = S.canvas.parentElement.getBoundingClientRect();
    S.dpr = Math.min(root.devicePixelRatio || 1, 3);
    S.canvas.width = Math.round(box.width * S.dpr);
    S.canvas.height = Math.round(box.height * S.dpr);
    S.w = box.width;
    S.h = box.height;
    const pad = 8;
    let pw = box.width - pad * 2, ph = pw / S.g.aspect;
    if (ph > box.height - pad * 2) { ph = box.height - pad * 2; pw = ph * S.g.aspect; }
    S.rect = { x: (box.width - pw) / 2, y: (box.height - ph) / 2, w: pw, h: ph };
  }

  // 장면 그림은 한 번만 그려 둔다
  function draw() {
    const { w, h } = S.rect;
    const c = document.createElement('canvas');
    c.width = Math.round(w * S.dpr);
    c.height = Math.round(h * S.dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    Draw.rrect(ctx, 0, 0, w, h, 18);
    ctx.clip();
    const sc = Scene.SCENERY && Scene.SCENERY[S.g.theme];
    if (sc) Draw.scenery(ctx, sc, [], w, h);
    else Draw.background(ctx, S.g.theme, w, h);
    for (const o of S.g.objects.slice().sort((a, b) => a.y - b.y || a.id - b.id)) {
      Draw.object(ctx, o.kind, o.x * w, o.y * h, o.size * h, null, o.flip, { hue: o.hue });
    }
    S.pic = c;
  }

  function frame(now) {
    if (!S.active) return;
    if (!S.won && !S.hint && now - S.lastActivity > HINT_AFTER_MS) showHint();
    render(now);
    S.raf = requestAnimationFrame(frame);
  }

  function render(now) {
    const ctx = S.ctx, { x, y, w, h } = S.rect;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.clearRect(0, 0, S.w, S.h);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff';
    Draw.rrect(ctx, x - 5, y - 5, w + 10, h + 10, 22);
    ctx.fill();
    ctx.restore();
    if (S.pic) ctx.drawImage(S.pic, x, y, w, h);
    for (const o of S.g.objects) {
      if (!S.found.has(o.id)) continue;
      const t = Math.min(1, (now - S.foundAt.get(o.id)) / 250);
      ctx.strokeStyle = MARK;
      ctx.lineWidth = Math.max(3, h * 0.008);
      ctx.beginPath();
      ctx.arc(x + o.x * w, y + o.y * h, o.size * h * 0.55 * (1 + 0.4 * (1 - t)), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (S.hint && !S.found.has(S.hint.id)) {
      const o = S.hint, pulse = 0.5 + 0.5 * Math.sin(now / 180);
      ctx.strokeStyle = `rgba(255,200,0,${0.5 + 0.5 * pulse})`;
      ctx.lineWidth = Math.max(4, h * 0.012);
      ctx.setLineDash([h * 0.015, h * 0.012]);
      ctx.beginPath();
      ctx.arc(x + o.x * w, y + o.y * h, o.size * h * (0.6 + 0.12 * pulse), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    S.ripples = S.ripples.filter((r) => now - r.t < 450);
    for (const r of S.ripples) {
      const t = (now - r.t) / 450;
      ctx.strokeStyle = `rgba(120,120,140,${0.6 * (1 - t)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + t * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    S.sparks = S.sparks.filter((p) => now - p.t < 700);
    for (const p of S.sparks) {
      const t = (now - p.t) / 700;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.a) * p.v * t, p.y + Math.sin(p.a) * p.v * t, p.s * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function onDown(e) {
    if (!S.active || S.won) return;
    Sound.unlock();
    const r = S.canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const { x, y, w, h } = S.rect;
    if (px < x || py < y || px > x + w || py > y + h) return;
    S.lastActivity = performance.now();
    const o = Hidden.pick(S.g, (px - x) / w, (py - y) / h);
    if (o && o.target >= 0 && !S.found.has(o.id)) return found(o);
    if (o && S.found.has(o.id)) return;
    S.ripples.push({ x: px, y: py, t: performance.now() });
    Sound.miss();
  }

  function found(o) {
    const now = performance.now();
    S.found.add(o.id);
    S.foundAt.set(o.id, now);
    if (S.hint === o) S.hint = null;
    const { x, y, w, h } = S.rect;
    const colors = ['#FFD23F', '#FF8FC7', '#5BC266', '#3FA7F5', '#FF9F1C'];
    for (let i = 0; i < 12; i++) {
      S.sparks.push({ x: x + o.x * w, y: y + o.y * h, a: Math.random() * Math.PI * 2, v: 30 + Math.random() * 40, s: 3 + Math.random() * 4, c: colors[i % 5], t: now });
    }
    Sound.found();
    updateTargets();
    const total = S.g.targets.reduce((n, t) => n + t.count, 0);
    if (S.found.size === total) {
      S.won = true;
      const lv = Store.get('hiddenLevel') || 1;
      const up = !S.usedHint && lv < Hidden.MAX_LEVEL;
      if (up) Store.set('hiddenLevel', lv + 1);
      setTimeout(() => { if (S.active) S.onEnd('hidden', up ? lv + 1 : 0, {}); }, 800);
    }
  }

  function showHint() {
    if (S.won) return;
    const left = S.g.objects.filter((o) => o.target >= 0 && !S.found.has(o.id));
    if (!left.length) return;
    S.hint = left[0];
    S.usedHint = true;
    S.lastActivity = performance.now();
  }

  // 자가 점검용: 빈 곳을 한 번 누르고, 찾을 물건을 모두 누른다
  function autoTap() {
    const r = S.canvas.getBoundingClientRect(), { x, y, w, h } = S.rect;
    const tap = (nx, ny) => S.canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + x + nx * w, clientY: r.top + y + ny * h, bubbles: true }));
    tap(0.01, 0.01);
    for (const o of S.g.objects.filter((q) => q.target >= 0)) tap(o.x, o.y);
  }

  root.HiddenGame = { init, start, stop };
})(typeof self !== 'undefined' ? self : this);
