// Fluent Emoji 그림을 조각 단위로 그린다. 조각마다 색, 크기, 각도, 숨기기를 바꿀 수 있다.
// mods (모두 선택):
//   hue: 그림 전체 색상 회전(도)
//   pattern: { type: 'dots' | 'hearts' | 'stars', color } 몸통에 입히는 무늬
//   parts: { [부분 번호]: { hue, scale, rot, hide } }
//   eyes: 'smile' 이면 동그란 눈 대신 웃는 눈
//   recolor: { '#원래색': '#바꿀색' } 특정 색만 바꿔 그리기 (예: 코코넛 속살을 하얗게)
(function (root) {
  const prepared = {};

  function prep(name) {
    if (prepared[name]) return prepared[name];
    const e = root.EMOJI[name];
    const partOf = new Int16Array(e.p.length).fill(-1);
    e.parts.forEach((part, pi) => part.idx.forEach((k) => { partOf[k] = pi; }));
    const isEye = new Uint8Array(e.p.length);
    (e.eyes || []).forEach((k) => { isEye[k] = 1; });
    // 부분이 몸통에 붙은 지점: 부분 상자에서 그림 중심에 가장 가까운 점
    const cx = e.box[0] + e.box[2] / 2, cy = e.box[1] + e.box[3] / 2;
    const pivots = e.parts.map(({ box: b }) => [
      Math.min(Math.max(cx, b[0]), b[0] + b[2]),
      Math.min(Math.max(cy, b[1]), b[1] + b[3]),
    ]);
    prepared[name] = { paths: e.p.map((x) => new Path2D(x[0])), partOf, isEye, pivots };
    return prepared[name];
  }

  // ---------- 색상 회전 ----------
  const hueCache = new Map();
  function hueShift(hex, deg) {
    const key = hex + deg;
    if (hueCache.has(key)) return hueCache.get(key);
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    h = (h + deg + 360) % 360;
    const f = (p, q, t) => {
      t = (t + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    if (s === 0) { r = g = b = l; } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, hh = h / 360;
      r = f(p, q, hh + 1 / 3); g = f(p, q, hh); b = f(p, q, hh - 1 / 3);
    }
    const out = '#' + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
    hueCache.set(key, out);
    return out;
  }

  // ---------- 무늬 ----------
  function heart(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.fill();
  }
  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r * 1.1;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  function pattern(ctx, e, path, evenodd, pat) {
    const [bx, by, bw, bh] = e.baseBox;
    const step = Math.max(bw, bh) / 4.2, r = step * 0.2;
    ctx.save();
    ctx.clip(path, evenodd ? 'evenodd' : 'nonzero');
    ctx.fillStyle = pat.color;
    let row = 0;
    for (let y = by + step * 0.5; y < by + bh; y += step * 0.87, row++) {
      for (let x = bx + (row % 2 ? step * 0.5 : step * 0.0) + step * 0.25; x < bx + bw; x += step) {
        if (pat.type === 'hearts') heart(ctx, x, y, r * 1.1);
        else if (pat.type === 'stars') star(ctx, x, y, r * 1.1);
        else { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  function smileEye(ctx, b, color) {
    const w = Math.max(b[2], b[3]);
    ctx.strokeStyle = color;
    ctx.lineWidth = w * 0.32;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(b[0] + b[2] / 2, b[1] + b[3] / 2 + w * 0.22, w * 0.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // x, y = 가운데(px), size = 그림의 긴 변(px)
  function draw(ctx, name, x, y, size, flip, mods) {
    const e = root.EMOJI[name];
    const c = prep(name);
    const m = mods || {};
    const parts = m.parts || {};
    const [bx, by, bw, bh] = e.box;
    const s = size / Math.max(bw, bh);
    const smile = m.eyes === 'smile' && e.eyes;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -s : s, s);
    ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    for (let i = 0; i < e.p.length; i++) {
      if (smile && c.isEye[i]) continue;
      const pi = c.partOf[i];
      const pm = pi >= 0 ? parts[pi] : null;
      if (pm && pm.hide) continue;
      let fill = e.p[i][1];
      if (m.recolor && m.recolor[fill]) fill = m.recolor[fill];
      if (m.hue) fill = hueShift(fill, m.hue);
      if (pm && pm.hue) fill = hueShift(fill, pm.hue);
      const tr = pm && (pm.scale || pm.rot);
      if (tr) {
        const [px, py] = c.pivots[pi];
        ctx.save();
        ctx.translate(px, py);
        if (pm.rot) ctx.rotate((pm.rot * Math.PI) / 180);
        if (pm.scale) ctx.scale(pm.scale, pm.scale);
        ctx.translate(-px, -py);
      }
      ctx.fillStyle = fill;
      ctx.fill(c.paths[i], e.p[i][2] ? 'evenodd' : 'nonzero');
      if (tr) ctx.restore();
      if (i === e.base && m.pattern) pattern(ctx, e, c.paths[i], e.p[i][2], m.pattern);
    }
    if (smile) for (const b of e.eyeBoxes) smileEye(ctx, b, e.eyeColor);
    ctx.restore();
  }

  root.EmojiRender = { draw, hueShift };
})(typeof self !== 'undefined' ? self : this);
