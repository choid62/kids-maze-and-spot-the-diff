// 틀린그림 화면: 두 그림을 보고 다른 곳을 누른다.
(function (root) {
  const MAX_LEVEL = Scene.MAX_LEVEL;
  const HINT_AFTER_MS = 60000; // 판을 시작하거나 마지막으로 차이를 찾은 뒤 1분이 지나면 힌트
  const MARK = '#FF3B6B';

  const S = {
    active: false, canvas: null, ctx: null, scene: null, found: new Set(), foundAt: new Map(),
    rects: [], picW: 0, picH: 0, dpr: 1, raf: 0, onWin: null,
    lastActivity: 0, hintIdx: -1, usedHint: false, won: false, ripples: [], sparks: [],
  };

  function init(onWin) {
    S.onWin = onWin;
    S.canvas = document.getElementById('spot-canvas');
    S.ctx = S.canvas.getContext('2d');
    S.canvas.addEventListener('pointerdown', onDown);
  }

  function start(opts) {
    opts = opts || {};
    const level = Core.clamp(opts.level || Store.get('spotLevel') || 1, 1, MAX_LEVEL);
    const seed = opts.seed != null ? opts.seed : Core.newSeed();
    // 같은 장면이 연달아 나오지 않게 고른다
    let theme = opts.theme;
    if (!theme) {
      const choices = Scene.THEME_IDS.filter((t) => t !== S.lastTheme);
      theme = choices[Core.makeRng(seed ^ 0x51ed).int(choices.length)];
    }
    S.scene = Scene.generate(level, seed, theme);
    S.lastTheme = S.scene.theme;
    document.getElementById('spot-level').textContent = `레벨 ${level} · ${Core.levelName(level)} ▾`;
    S.found = new Set();
    S.foundAt = new Map();
    S.ripples = [];
    S.sparks = [];
    S.hintIdx = -1;
    S.usedHint = false;
    S.won = false;
    S.lastActivity = performance.now();
    if (opts.demo === 'found') { mark(0, true); mark(1, true); }
    if (opts.demo === 'hint') showHint();
    updateDots();
    relayout();
    // 배경 그림 파일을 아직 불러오는 중이면, 다 불러온 뒤 다시 그린다
    const scene = S.scene;
    BgImages.whenReady(() => { if (S.active && S.scene === scene) relayout(); });
    S.active = true;
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(frame);
    if (opts.demo === 'tapall') setTimeout(autoTap, 300);
  }

  // 자가 점검용: 빈 곳 한 번, 그다음 아래 그림의 차이를 모두 누른다
  function autoTap() {
    const r = S.canvas.getBoundingClientRect(), rect = S.rects[1];
    const tap = (nx, ny) => S.canvas.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: r.left + rect.x + nx * S.picW, clientY: r.top + rect.y + ny * S.picH, pointerId: 1, bubbles: true,
    }));
    tap(0.02, 0.02);
    S.scene.diffs.forEach((d) => tap(d.x + 0.01, d.y - 0.01));
  }

  function stop() {
    S.active = false;
    cancelAnimationFrame(S.raf);
  }

  function relayout() {
    const box = S.canvas.parentElement.getBoundingClientRect();
    S.dpr = Math.min(root.devicePixelRatio || 1, 3);
    S.canvas.width = Math.round(box.width * S.dpr);
    S.canvas.height = Math.round(box.height * S.dpr);
    S.w = box.width;
    S.h = box.height;
    const A = Scene.ASPECT, pad = 12, gap = 14;
    // 위아래 배치와 좌우 배치 중 그림이 더 크게 나오는 쪽
    const stackedW = Math.min(box.width - pad * 2, ((box.height - pad * 2 - gap) / 2) * A);
    const sideW = Math.min((box.width - pad * 2 - gap) / 2, (box.height - pad * 2) * A);
    const stacked = stackedW >= sideW;
    const pw = Math.floor(stacked ? stackedW : sideW), ph = Math.floor(pw / A);
    S.picW = pw;
    S.picH = ph;
    if (stacked) {
      const top = Math.round((box.height - ph * 2 - gap) / 2), left = Math.round((box.width - pw) / 2);
      S.rects = [{ x: left, y: top }, { x: left, y: top + ph + gap }];
    } else {
      const top = Math.round((box.height - ph) / 2), left = Math.round((box.width - pw * 2 - gap) / 2);
      S.rects = [{ x: left, y: top }, { x: left + pw + gap, y: top }];
    }
    // 두 그림은 바뀌지 않으니 한 번만 그려 두고 매 프레임 복사한다
    S.pictures = [[S.scene.a, S.scene.propsA], [S.scene.b, S.scene.propsB]].map(([objects, props]) => drawPicture(objects, props));
  }

  const FRAME = 10; // 그림 둘레 흰 테두리와 그림자 여백

  function drawPicture(objects, props) {
    const { picW: w, picH: h, dpr } = S;
    const c = document.createElement('canvas');
    c.width = Math.round((w + FRAME * 2) * dpr);
    c.height = Math.round((h + FRAME * 2) * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, FRAME * dpr, FRAME * dpr);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff';
    Draw.rrect(ctx, -5, -5, w + 10, h + 10, 22);
    ctx.fill();
    ctx.restore();

    Draw.rrect(ctx, 0, 0, w, h, 18);
    ctx.clip();
    if (S.scene.scenery) Draw.scenery(ctx, S.scene.scenery, props, w, h);
    else Draw.background(ctx, S.scene.theme, w, h);
    // 뒤쪽(위) 물건부터 그려서 앞쪽 물건이 위에 오게
    const sorted = objects.slice().sort((a, b) => a.y - b.y);
    for (const o of sorted) Draw.object(ctx, o.kind, o.x * w, o.y * h, o.size * h, null, o.flip, o);
    return c;
  }

  function frame(now) {
    if (!S.active) return;
    if (!S.won && S.hintIdx < 0 && now - S.lastActivity > HINT_AFTER_MS) showHint();
    render(now);
    S.raf = requestAnimationFrame(frame);
  }

  function render(now) {
    const ctx = S.ctx;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.clearRect(0, 0, S.w, S.h);
    S.rects.forEach((rect, i) => {
      const pic = S.pictures[i];
      ctx.drawImage(pic, rect.x - FRAME, rect.y - FRAME, pic.width / S.dpr, pic.height / S.dpr);
    });

    const { picW: w, picH: h } = S;
    for (const rect of S.rects) {
      ctx.save();
      Draw.rrect(ctx, rect.x, rect.y, w, h, 18);
      ctx.clip();
      // 찾은 곳 동그라미 (커지면서 나타남)
      S.found.forEach((i) => {
        const d = S.scene.diffs[i];
        const t = Math.min(1, (now - S.foundAt.get(i)) / 250);
        const grow = 1 + 0.4 * (1 - t);
        ctx.strokeStyle = MARK;
        ctx.lineWidth = Math.max(4, h * 0.022);
        ctx.beginPath();
        ctx.arc(rect.x + d.x * w, rect.y + d.y * h, d.r * h * grow, 0, Math.PI * 2);
        ctx.stroke();
      });
      // 힌트: 반짝이는 노란 동그라미
      if (S.hintIdx >= 0 && !S.found.has(S.hintIdx)) {
        const d = S.scene.diffs[S.hintIdx];
        const pulse = 0.5 + 0.5 * Math.sin(now / 180);
        ctx.strokeStyle = `rgba(255,200,0,${0.5 + 0.5 * pulse})`;
        ctx.lineWidth = Math.max(5, h * 0.03);
        ctx.setLineDash([h * 0.04, h * 0.03]);
        ctx.beginPath();
        ctx.arc(rect.x + d.x * w, rect.y + d.y * h, d.r * h * (1.05 + 0.15 * pulse), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // 틀린 곳을 누르면 작은 물결만 (벌칙 없음)
    S.ripples = S.ripples.filter((r) => now - r.t < 450);
    for (const r of S.ripples) {
      const t = (now - r.t) / 450;
      ctx.strokeStyle = `rgba(120,120,140,${0.6 * (1 - t)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + t * 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 찾았을 때 반짝이
    S.sparks = S.sparks.filter((p) => now - p.t < 700);
    for (const p of S.sparks) {
      const t = (now - p.t) / 700;
      const x = p.x + Math.cos(p.a) * p.v * t, y = p.y + Math.sin(p.a) * p.v * t;
      ctx.fillStyle = p.c;
      ctx.globalAlpha = 1 - t;
      star(ctx, x, y, p.s * (1 - t * 0.5));
      ctx.globalAlpha = 1;
    }
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function onDown(e) {
    if (!S.active || S.won) return;
    Sound.unlock();
    const r = S.canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const rect = S.rects.find((q) => px >= q.x && px <= q.x + S.picW && py >= q.y && py <= q.y + S.picH);
    if (!rect) return;
    const nx = (px - rect.x) / S.picW, ny = (py - rect.y) / S.picH;
    const idx = Scene.hitTest(S.scene, nx, ny, S.found, 0.03);
    if (idx >= 0) {
      mark(idx);
    } else {
      S.ripples.push({ x: px, y: py, t: performance.now() });
      Sound.miss();
    }
  }

  function mark(idx, quiet) {
    const now = performance.now();
    S.found.add(idx);
    S.foundAt.set(idx, now);
    // 힌트 시간은 마지막으로 차이를 찾은 때부터 다시 센다 (그냥 누르는 것은 세지 않음)
    S.lastActivity = now;
    if (S.hintIdx === idx) S.hintIdx = -1;
    updateDots();
    if (quiet) return;
    const d = S.scene.diffs[idx];
    const colors = ['#FFD23F', '#FF8FC7', '#5BC266', '#3FA7F5', '#FF9F1C'];
    for (const rect of S.rects) {
      for (let i = 0; i < 10; i++) {
        S.sparks.push({
          x: rect.x + d.x * S.picW, y: rect.y + d.y * S.picH,
          a: Math.random() * Math.PI * 2, v: 30 + Math.random() * 40,
          s: 5 + Math.random() * 5, c: colors[i % colors.length], t: now,
        });
      }
    }
    Sound.found();
    if (S.found.size === S.scene.diffs.length) {
      S.won = true;
      const lv = Store.get('spotLevel') || 1;
      const up = !S.usedHint && lv < MAX_LEVEL;
      if (up) Store.set('spotLevel', lv + 1);
      setTimeout(() => { if (S.active) S.onWin('spot', up ? lv + 1 : 0); }, 800);
    } else {
      Sound.say('Found it!');
    }
  }

  function showHint() {
    if (!S.scene || S.won) return;
    const idx = S.scene.diffs.findIndex((_, i) => !S.found.has(i));
    if (idx < 0) return;
    S.hintIdx = idx;
    S.usedHint = true;
    S.lastActivity = performance.now();
  }

  function updateDots() {
    const el = document.getElementById('spot-dots');
    el.innerHTML = '';
    S.scene.diffs.forEach((_, i) => {
      const s = document.createElement('span');
      s.className = 'dot' + (S.found.has(i) ? ' on' : '');
      el.appendChild(s);
    });
  }

  root.SpotGame = { init, start, stop, relayout: () => { if (S.active) relayout(); }, MAX_LEVEL };
})(typeof self !== 'undefined' ? self : this);
