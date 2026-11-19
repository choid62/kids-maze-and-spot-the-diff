// 모든 그림을 코드로 그린다. 각 그림은 (-1,-1)~(1,1) 단위 공간에 그려진다.
(function (root) {
  const INK = '#4a3b35';

  function mix(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round(r + (t - r) * p);
    g = Math.round(g + (t - g) * p);
    b = Math.round(b + (t - b) * p);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function outline(ctx, w) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = w || 0.07;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function oval(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
  function poly(ctx, p) {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath();
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fs(ctx, fill) { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); }
  function dot(ctx, x, y, r, fill) { ctx.fillStyle = fill; circle(ctx, x, y, r); ctx.fill(); }
  function eye(ctx, x, y, s) {
    dot(ctx, x, y, s, INK);
    dot(ctx, x + s * 0.35, y - s * 0.35, s * 0.38, '#fff');
  }
  function face(ctx, cx, cy, s) {
    eye(ctx, cx - 0.3 * s, cy - 0.1 * s, 0.11 * s);
    eye(ctx, cx + 0.3 * s, cy - 0.1 * s, 0.11 * s);
    outline(ctx, 0.05 * s / 0.55);
    ctx.beginPath();
    ctx.arc(cx, cy + 0.06 * s, 0.22 * s, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,140,0.4)';
    circle(ctx, cx - 0.5 * s, cy + 0.15 * s, 0.11 * s); ctx.fill();
    circle(ctx, cx + 0.5 * s, cy + 0.15 * s, 0.11 * s); ctx.fill();
  }
  // 원 여러 개를 합친 모양 (구름, 나무) - 바깥 테두리만 보이게
  function blob(ctx, circles, fill) {
    outline(ctx, 0.14);
    for (const [x, y, r] of circles) { circle(ctx, x, y, r); ctx.stroke(); }
    ctx.fillStyle = fill;
    for (const [x, y, r] of circles) { circle(ctx, x, y, r); ctx.fill(); }
    outline(ctx);
  }
  function thickLine(ctx, path, color, w) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = w + 0.1; path(); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; path(); ctx.stroke();
  }

  const K = {};

  K.sun = (ctx, c) => {
    ctx.strokeStyle = c; ctx.lineWidth = 0.13; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 0.7, Math.sin(a) * 0.7);
      ctx.lineTo(Math.cos(a) * 0.95, Math.sin(a) * 0.95);
      ctx.stroke();
    }
    outline(ctx); circle(ctx, 0, 0, 0.56); fs(ctx, c);
    face(ctx, 0, 0, 0.55);
  };

  K.cloud = (ctx, c) => {
    blob(ctx, [[-0.52, 0.12, 0.32], [-0.12, -0.12, 0.42], [0.36, -0.02, 0.36], [0.58, 0.2, 0.26], [0.05, 0.22, 0.33]], c);
    face(ctx, 0, 0.08, 0.42);
  };

  K.bird = (ctx, c) => {
    outline(ctx);
    poly(ctx, [-0.42, 0, -0.88, -0.3, -0.82, 0.24]); fs(ctx, mix(c, -0.15));
    oval(ctx, 0, 0.05, 0.58, 0.42); fs(ctx, c);
    oval(ctx, -0.08, 0.14, 0.3, 0.17, -0.35); fs(ctx, mix(c, -0.18));
    poly(ctx, [0.52, -0.08, 0.88, 0.03, 0.52, 0.14]); fs(ctx, '#FFA726');
    eye(ctx, 0.28, -0.1, 0.08);
  };

  K.balloon = (ctx, c) => {
    outline(ctx, 0.04);
    ctx.beginPath(); ctx.moveTo(0, 0.48); ctx.quadraticCurveTo(0.2, 0.72, 0, 0.98); ctx.stroke();
    outline(ctx);
    poly(ctx, [-0.09, 0.52, 0.09, 0.52, 0, 0.42]); fs(ctx, c);
    oval(ctx, 0, -0.12, 0.5, 0.6); fs(ctx, c);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    oval(ctx, -0.2, -0.36, 0.1, 0.18, 0.4); ctx.fill();
  };

  K.butterfly = (ctx, c) => {
    outline(ctx);
    for (const s of [-1, 1]) {
      oval(ctx, s * 0.4, -0.22, 0.4, 0.3, s * 0.5); fs(ctx, c);
      oval(ctx, s * 0.3, 0.28, 0.27, 0.22, -s * 0.4); fs(ctx, mix(c, 0.35));
      dot(ctx, s * 0.45, -0.25, 0.1, 'rgba(255,255,255,0.8)');
    }
    oval(ctx, 0, 0.02, 0.09, 0.48); fs(ctx, INK);
    outline(ctx, 0.05);
    ctx.beginPath();
    ctx.moveTo(-0.04, -0.42); ctx.quadraticCurveTo(-0.12, -0.72, -0.28, -0.82);
    ctx.moveTo(0.04, -0.42); ctx.quadraticCurveTo(0.12, -0.72, 0.28, -0.82);
    ctx.stroke();
    dot(ctx, -0.28, -0.82, 0.06, INK);
    dot(ctx, 0.28, -0.82, 0.06, INK);
  };

  K.tree = (ctx, c) => {
    outline(ctx);
    rrect(ctx, -0.13, 0.05, 0.26, 0.9, 0.06); fs(ctx, '#A1887F');
    blob(ctx, [[0, -0.45, 0.42], [-0.36, -0.14, 0.34], [0.36, -0.14, 0.34], [0, 0.02, 0.36]], c);
  };

  K.flower = (ctx, c) => {
    ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -0.1); ctx.lineTo(0, 0.95); ctx.stroke();
    outline(ctx);
    oval(ctx, 0.2, 0.6, 0.2, 0.09, -0.5); fs(ctx, '#66BB6A');
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      circle(ctx, Math.cos(a) * 0.28, -0.3 + Math.sin(a) * 0.28, 0.23); fs(ctx, c);
    }
    circle(ctx, 0, -0.3, 0.16); fs(ctx, '#FFD54F');
  };

  K.house = (ctx, c) => {
    outline(ctx);
    rrect(ctx, 0.25, -0.8, 0.18, 0.4, 0.03); fs(ctx, '#B0705A');
    rrect(ctx, -0.6, -0.12, 1.2, 0.97, 0.05); fs(ctx, c);
    poly(ctx, [-0.78, -0.05, 0, -0.82, 0.78, -0.05]); fs(ctx, '#E57373');
    rrect(ctx, -0.42, 0.35, 0.3, 0.5, 0.06); fs(ctx, '#A1887F');
    rrect(ctx, 0.08, 0.12, 0.34, 0.3, 0.04); fs(ctx, '#BBDEFB');
    ctx.beginPath();
    ctx.moveTo(0.25, 0.12); ctx.lineTo(0.25, 0.42);
    ctx.moveTo(0.08, 0.27); ctx.lineTo(0.42, 0.27);
    ctx.stroke();
    dot(ctx, -0.18, 0.62, 0.035, INK);
  };

  K.ball = (ctx, c) => {
    outline(ctx);
    circle(ctx, 0, 0.15, 0.62); ctx.fillStyle = c; ctx.fill();
    ctx.save();
    circle(ctx, 0, 0.15, 0.62); ctx.clip();
    ctx.translate(0, 0.15); ctx.rotate(-0.5);
    ctx.fillStyle = '#fff'; ctx.fillRect(-1, -0.12, 2, 0.24);
    ctx.restore();
    outline(ctx); circle(ctx, 0, 0.15, 0.62); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    oval(ctx, -0.25, -0.15, 0.12, 0.08, -0.6); ctx.fill();
  };

  K.cat = (ctx, c) => {
    thickLine(ctx, () => { ctx.beginPath(); ctx.moveTo(0.35, 0.62); ctx.quadraticCurveTo(0.95, 0.6, 0.78, 0.05); }, c, 0.14);
    outline(ctx);
    oval(ctx, 0.08, 0.55, 0.45, 0.32); fs(ctx, c);
    poly(ctx, [-0.48, -0.32, -0.42, -0.85, -0.12, -0.58]); fs(ctx, c);
    poly(ctx, [0.02, -0.58, 0.32, -0.85, 0.38, -0.32]); fs(ctx, c);
    circle(ctx, -0.05, -0.22, 0.42); fs(ctx, c);
    eye(ctx, -0.2, -0.25, 0.07);
    eye(ctx, 0.1, -0.25, 0.07);
    poly(ctx, [-0.1, -0.12, 0, -0.12, -0.05, -0.06]); ctx.fillStyle = '#FF8A80'; ctx.fill();
    outline(ctx, 0.025);
    ctx.beginPath();
    ctx.moveTo(-0.25, -0.06); ctx.lineTo(-0.6, -0.1);
    ctx.moveTo(-0.25, 0); ctx.lineTo(-0.6, 0.04);
    ctx.moveTo(0.15, -0.06); ctx.lineTo(0.5, -0.1);
    ctx.moveTo(0.15, 0); ctx.lineTo(0.5, 0.04);
    ctx.stroke();
  };

  K.car = (ctx, c) => {
    outline(ctx);
    poly(ctx, [-0.5, -0.02, -0.32, -0.45, 0.28, -0.45, 0.5, -0.02]); fs(ctx, mix(c, 0.25));
    poly(ctx, [-0.4, -0.06, -0.27, -0.37, -0.04, -0.37, -0.04, -0.06]); fs(ctx, '#BBDEFB');
    poly(ctx, [0.04, -0.06, 0.04, -0.37, 0.24, -0.37, 0.38, -0.06]); fs(ctx, '#BBDEFB');
    rrect(ctx, -0.88, -0.08, 1.76, 0.5, 0.16); fs(ctx, c);
    for (const x of [-0.48, 0.48]) {
      circle(ctx, x, 0.45, 0.21); fs(ctx, '#455A64');
      circle(ctx, x, 0.45, 0.08); fs(ctx, '#CFD8DC');
    }
    circle(ctx, 0.78, 0.08, 0.07); fs(ctx, '#FFF59D');
  };

  K.mushroom = (ctx, c) => {
    outline(ctx);
    rrect(ctx, -0.2, -0.05, 0.4, 0.72, 0.12); fs(ctx, '#FFF3E0');
    ctx.beginPath();
    ctx.moveTo(-0.7, 0.05);
    ctx.quadraticCurveTo(-0.72, -0.72, 0, -0.72);
    ctx.quadraticCurveTo(0.72, -0.72, 0.7, 0.05);
    ctx.closePath();
    fs(ctx, c);
    dot(ctx, -0.32, -0.25, 0.11, '#fff');
    dot(ctx, 0.08, -0.48, 0.12, '#fff');
    dot(ctx, 0.36, -0.18, 0.09, '#fff');
    eye(ctx, -0.08, 0.27, 0.045);
    eye(ctx, 0.08, 0.27, 0.045);
  };

  K.fish = (ctx, c) => {
    outline(ctx);
    poly(ctx, [-0.42, 0, -0.9, -0.36, -0.9, 0.36]); fs(ctx, mix(c, -0.15));
    poly(ctx, [-0.12, -0.3, 0.12, -0.56, 0.24, -0.3]); fs(ctx, mix(c, -0.15));
    oval(ctx, 0, 0, 0.62, 0.4); fs(ctx, c);
    ctx.save();
    oval(ctx, 0, 0, 0.62, 0.4); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(-0.18, -0.5, 0.14, 1);
    ctx.restore();
    outline(ctx); oval(ctx, 0, 0, 0.62, 0.4); ctx.stroke();
    eye(ctx, 0.3, -0.08, 0.08);
  };

  K.jellyfish = (ctx, c) => {
    for (const x of [-0.36, -0.12, 0.12, 0.36]) {
      thickLine(ctx, () => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 0.15, 0.3, x - 0.15, 0.6, x + 0.05, 0.92); }, mix(c, -0.1), 0.06);
    }
    outline(ctx);
    ctx.beginPath();
    ctx.moveTo(-0.6, 0.05);
    ctx.quadraticCurveTo(-0.62, -0.75, 0, -0.75);
    ctx.quadraticCurveTo(0.62, -0.75, 0.6, 0.05);
    for (let i = 0; i < 4; i++) {
      const x0 = 0.6 - 0.3 * i;
      ctx.quadraticCurveTo(x0 - 0.15, 0.2, x0 - 0.3, 0.05);
    }
    ctx.closePath();
    fs(ctx, c);
    face(ctx, 0, -0.28, 0.4);
  };

  K.starfish = (ctx, c) => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 0.38 : 0.95;
      p.push(Math.cos(a) * rr, Math.sin(a) * rr + 0.05);
    }
    outline(ctx); poly(ctx, p); fs(ctx, c);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      dot(ctx, Math.cos(a) * 0.62, Math.sin(a) * 0.62 + 0.05, 0.06, mix(c, 0.45));
    }
    face(ctx, 0, 0.08, 0.38);
  };

  K.seaweed = (ctx, c) => {
    for (const [x, h, d] of [[-0.3, 0.85, 1], [0, 1, -1], [0.3, 0.75, 1]]) {
      const top = 0.95 - 1.8 * h;
      thickLine(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(x, 0.95);
        ctx.bezierCurveTo(x + 0.28 * d, 0.95 - 0.6 * h, x - 0.28 * d, 0.95 - 1.2 * h, x + 0.1 * d, top);
      }, c, 0.14);
    }
  };

  K.shell = (ctx, c) => {
    outline(ctx);
    rrect(ctx, -0.18, 0.52, 0.36, 0.2, 0.05); fs(ctx, mix(c, -0.15));
    ctx.beginPath();
    ctx.moveTo(0, 0.62);
    ctx.lineTo(-0.75, -0.05);
    ctx.quadraticCurveTo(0, -1.1, 0.75, -0.05);
    ctx.closePath();
    fs(ctx, c);
    ctx.strokeStyle = mix(c, -0.3); ctx.lineWidth = 0.045;
    for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const u = 1 - t;
      const px = u * u * -0.75 + 2 * u * t * 0 + t * t * 0.75;
      const py = u * u * -0.05 + 2 * u * t * -1.1 + t * t * -0.05;
      ctx.beginPath();
      ctx.moveTo(0, 0.52);
      ctx.lineTo(px * 0.88, 0.52 + (py - 0.52) * 0.88);
      ctx.stroke();
    }
  };

  K.crab = (ctx, c) => {
    outline(ctx, 0.07);
    ctx.beginPath();
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(s * 0.35, 0.12 + i * 0.12);
        ctx.lineTo(s * 0.8, 0.28 + i * 0.2);
      }
      ctx.moveTo(s * 0.35, -0.05);
      ctx.lineTo(s * 0.6, -0.4);
      ctx.moveTo(s * 0.15, -0.15);
      ctx.lineTo(s * 0.2, -0.48);
    }
    ctx.stroke();
    outline(ctx);
    for (const s of [-1, 1]) {
      oval(ctx, s * 0.62, -0.55, 0.14, 0.22, s * 0.5); fs(ctx, c);
      oval(ctx, s * 0.78, -0.45, 0.1, 0.17, s * 0.6); fs(ctx, c);
      circle(ctx, s * 0.2, -0.55, 0.11); fs(ctx, '#fff');
      dot(ctx, s * 0.2, -0.55, 0.05, INK);
    }
    oval(ctx, 0, 0.1, 0.55, 0.36); fs(ctx, c);
    ctx.beginPath(); ctx.arc(0, 0.08, 0.16, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  };

  // ---------- 농장 ----------
  K.pig = (ctx, c) => {
    outline(ctx);
    for (const x of [-0.45, -0.2, 0.12, 0.35]) { rrect(ctx, x, 0.3, 0.15, 0.42, 0.05); fs(ctx, mix(c, -0.12)); }
    outline(ctx, 0.05);
    ctx.beginPath(); ctx.moveTo(-0.66, 0); ctx.bezierCurveTo(-0.9, -0.05, -0.85, -0.3, -0.72, -0.22); ctx.stroke();
    outline(ctx);
    oval(ctx, -0.05, 0.1, 0.65, 0.45); fs(ctx, c);
    circle(ctx, 0.5, -0.15, 0.33); fs(ctx, c);
    poly(ctx, [0.33, -0.4, 0.4, -0.7, 0.58, -0.45]); fs(ctx, mix(c, -0.12));
    oval(ctx, 0.8, -0.08, 0.11, 0.14); fs(ctx, mix(c, -0.18));
    dot(ctx, 0.78, -0.12, 0.025, INK);
    dot(ctx, 0.82, -0.03, 0.025, INK);
    eye(ctx, 0.52, -0.25, 0.055);
    dot(ctx, 0.48, -0.02, 0.06, 'rgba(255,110,140,0.45)');
  };

  K.chicken = (ctx, c) => {
    ctx.strokeStyle = '#FFA726'; ctx.lineWidth = 0.07; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.12, 0.45); ctx.lineTo(-0.16, 0.86);
    ctx.moveTo(0.1, 0.45); ctx.lineTo(0.12, 0.86);
    ctx.stroke();
    outline(ctx);
    poly(ctx, [-0.42, 0.02, -0.85, -0.45, -0.68, -0.05, -0.9, -0.15, -0.52, 0.22]); fs(ctx, c);
    oval(ctx, -0.05, 0.15, 0.5, 0.38); fs(ctx, c);
    circle(ctx, 0.27, -0.62, 0.09); fs(ctx, '#FF5A5F');
    circle(ctx, 0.41, -0.65, 0.09); fs(ctx, '#FF5A5F');
    circle(ctx, 0.35, -0.35, 0.26); fs(ctx, c);
    poly(ctx, [0.58, -0.4, 0.8, -0.33, 0.58, -0.26]); fs(ctx, '#FFA726');
    oval(ctx, 0.52, -0.17, 0.05, 0.08); fs(ctx, '#FF5A5F');
    oval(ctx, -0.1, 0.15, 0.25, 0.15, -0.3); fs(ctx, mix(c, -0.12));
    eye(ctx, 0.42, -0.4, 0.05);
  };

  K.sheep = (ctx, c) => {
    outline(ctx);
    for (const x of [-0.42, -0.2, 0.1, 0.3]) { rrect(ctx, x, 0.3, 0.11, 0.55, 0.05); fs(ctx, '#5D4037'); }
    blob(ctx, [[-0.35, 0, 0.3], [0, -0.14, 0.33], [0.3, 0, 0.3], [-0.15, 0.24, 0.3], [0.15, 0.24, 0.3]], c);
    oval(ctx, 0.48, -0.32, 0.13, 0.06, -0.5); fs(ctx, '#5D4037');
    oval(ctx, 0.64, -0.15, 0.2, 0.25); fs(ctx, '#5D4037');
    circle(ctx, 0.7, -0.2, 0.06); ctx.fillStyle = '#fff'; ctx.fill();
    dot(ctx, 0.71, -0.2, 0.03, INK);
  };

  K.pumpkin = (ctx, c) => {
    outline(ctx);
    rrect(ctx, -0.06, -0.72, 0.12, 0.26, 0.04); fs(ctx, '#6D4C41');
    oval(ctx, 0.2, -0.6, 0.16, 0.07, -0.4); fs(ctx, '#66BB6A');
    oval(ctx, -0.34, 0.12, 0.36, 0.5); fs(ctx, c);
    oval(ctx, 0.34, 0.12, 0.36, 0.5); fs(ctx, c);
    oval(ctx, 0, 0.1, 0.34, 0.56); fs(ctx, mix(c, 0.12));
  };

  K.barn = (ctx, c) => {
    outline(ctx);
    poly(ctx, [-0.7, 0.85, -0.7, -0.15, 0, -0.75, 0.7, -0.15, 0.7, 0.85]); fs(ctx, c);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.08;
    ctx.beginPath(); ctx.moveTo(-0.66, -0.12); ctx.lineTo(0, -0.68); ctx.lineTo(0.66, -0.12); ctx.stroke();
    outline(ctx);
    rrect(ctx, -0.32, 0.22, 0.64, 0.63, 0.04); fs(ctx, '#fff');
    ctx.strokeStyle = c; ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.moveTo(-0.26, 0.28); ctx.lineTo(0.26, 0.8);
    ctx.moveTo(0.26, 0.28); ctx.lineTo(-0.26, 0.8);
    ctx.stroke();
    outline(ctx);
    rrect(ctx, -0.15, -0.38, 0.3, 0.26, 0.03); fs(ctx, '#FFE082');
  };

  // ---------- 우주 ----------
  K.moon = (ctx, c) => {
    outline(ctx);
    ctx.beginPath();
    ctx.arc(0, 0, 0.75, -0.5 * Math.PI, 0.5 * Math.PI, true);
    ctx.quadraticCurveTo(-0.42, 0, 0, -0.75);
    ctx.closePath();
    fs(ctx, c);
    eye(ctx, -0.48, -0.08, 0.06);
    ctx.beginPath(); ctx.arc(-0.45, 0.08, 0.1, 0.3 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  };

  K.planet = (ctx, c) => {
    const ring = '#FFE082';
    thickLine(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, 0.92, 0.26, -0.3, Math.PI, 2 * Math.PI); }, ring, 0.1);
    outline(ctx);
    circle(ctx, 0, 0, 0.52); ctx.fillStyle = c; ctx.fill();
    ctx.save();
    circle(ctx, 0, 0, 0.52); ctx.clip();
    ctx.fillStyle = mix(c, -0.15);
    ctx.rotate(-0.3);
    ctx.fillRect(-0.6, -0.28, 1.2, 0.12);
    ctx.fillRect(-0.6, 0.12, 1.2, 0.08);
    ctx.restore();
    outline(ctx); circle(ctx, 0, 0, 0.52); ctx.stroke();
    thickLine(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, 0.92, 0.26, -0.3, 0, Math.PI); }, ring, 0.1);
  };

  K.rocket = (ctx, c) => {
    ctx.rotate(0.45);
    outline(ctx);
    poly(ctx, [-0.14, 0.55, 0, 0.95, 0.14, 0.55]); fs(ctx, '#FFA726');
    poly(ctx, [-0.24, 0.15, -0.5, 0.62, -0.2, 0.55]); fs(ctx, '#FF5A5F');
    poly(ctx, [0.24, 0.15, 0.5, 0.62, 0.2, 0.55]); fs(ctx, '#FF5A5F');
    ctx.beginPath();
    ctx.moveTo(0, -0.88);
    ctx.quadraticCurveTo(0.36, -0.5, 0.27, 0.58);
    ctx.lineTo(-0.27, 0.58);
    ctx.quadraticCurveTo(-0.36, -0.5, 0, -0.88);
    ctx.closePath();
    fs(ctx, c);
    circle(ctx, 0, -0.15, 0.14); fs(ctx, '#BBDEFB');
  };

  K.ufo = (ctx, c) => {
    outline(ctx);
    ctx.beginPath(); ctx.arc(0, -0.08, 0.38, Math.PI, 0); ctx.closePath(); fs(ctx, 'rgba(190,230,255,0.95)');
    circle(ctx, 0, -0.2, 0.12); fs(ctx, '#7CDB6B');
    eye(ctx, 0, -0.22, 0.045);
    oval(ctx, 0, 0.05, 0.88, 0.26); fs(ctx, c);
    for (const x of [-0.5, -0.17, 0.17, 0.5]) dot(ctx, x, 0.1, 0.07, '#FFF59D');
  };

  K.alien = (ctx, c) => {
    outline(ctx, 0.05);
    ctx.beginPath();
    ctx.moveTo(-0.15, -0.6); ctx.lineTo(-0.3, -0.88);
    ctx.moveTo(0.15, -0.6); ctx.lineTo(0.3, -0.88);
    ctx.stroke();
    dot(ctx, -0.3, -0.88, 0.07, c);
    dot(ctx, 0.3, -0.88, 0.07, c);
    outline(ctx);
    oval(ctx, 0, 0.58, 0.3, 0.3); fs(ctx, c);
    oval(ctx, 0, -0.18, 0.55, 0.46); fs(ctx, c);
    circle(ctx, 0, -0.24, 0.2); fs(ctx, '#fff');
    dot(ctx, 0.03, -0.24, 0.09, INK);
    dot(ctx, 0.06, -0.28, 0.035, '#fff');
    ctx.beginPath(); ctx.arc(0, 0.0, 0.14, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  };

  K.star = (ctx, c) => {
    const p = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 0.42 : 0.92;
      p.push(Math.cos(a) * rr, Math.sin(a) * rr + 0.06);
    }
    outline(ctx); poly(ctx, p); fs(ctx, c);
    face(ctx, 0, 0.1, 0.36);
  };

  K.comet = (ctx, c) => {
    ctx.lineCap = 'round';
    for (const [dx, dy, w] of [[-0.95, 0.55, 0.16], [-0.8, 0.8, 0.12], [-0.6, 0.95, 0.09]]) {
      ctx.strokeStyle = mix(c, 0.45); ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(0.25, -0.2); ctx.lineTo(dx, dy); ctx.stroke();
    }
    outline(ctx); circle(ctx, 0.32, -0.3, 0.36); fs(ctx, c);
    face(ctx, 0.32, -0.3, 0.34);
  };

  // ---------- 눈 마을 ----------
  K.snowman = (ctx, c) => {
    outline(ctx, 0.06);
    ctx.strokeStyle = '#6D4C41';
    ctx.beginPath();
    ctx.moveTo(-0.38, 0.3); ctx.lineTo(-0.82, 0.02); ctx.moveTo(-0.65, 0.12); ctx.lineTo(-0.72, -0.08);
    ctx.moveTo(0.38, 0.3); ctx.lineTo(0.82, 0.02);
    ctx.stroke();
    outline(ctx);
    circle(ctx, 0, 0.5, 0.44); fs(ctx, '#FFFFFF');
    circle(ctx, 0, -0.18, 0.33); fs(ctx, '#FFFFFF');
    rrect(ctx, 0.08, 0.06, 0.13, 0.32, 0.05); fs(ctx, c);
    rrect(ctx, -0.3, 0.05, 0.6, 0.13, 0.06); fs(ctx, c);
    rrect(ctx, -0.35, -0.5, 0.7, 0.09, 0.03); fs(ctx, '#37474F');
    rrect(ctx, -0.22, -0.86, 0.44, 0.38, 0.04); fs(ctx, '#37474F');
    eye(ctx, -0.12, -0.24, 0.045);
    eye(ctx, 0.12, -0.24, 0.045);
    poly(ctx, [0, -0.15, 0.24, -0.1, 0, -0.06]); ctx.fillStyle = '#FF9800'; ctx.fill();
    for (const y of [0.36, 0.52, 0.68]) dot(ctx, 0, y, 0.045, INK);
  };

  K.pine = (ctx, c) => {
    outline(ctx);
    rrect(ctx, -0.1, 0.55, 0.2, 0.38, 0.03); fs(ctx, '#8D6E63');
    poly(ctx, [-0.68, 0.6, 0, -0.1, 0.68, 0.6]); fs(ctx, c);
    poly(ctx, [-0.54, 0.22, 0, -0.48, 0.54, 0.22]); fs(ctx, c);
    poly(ctx, [-0.4, -0.15, 0, -0.9, 0.4, -0.15]); fs(ctx, c);
    for (const [x, y, col] of [[-0.3, 0.45, '#FF5A5F'], [0.25, 0.1, '#FFD23F'], [-0.12, -0.3, '#3FA7F5'], [0.35, 0.5, '#FFD23F']]) {
      dot(ctx, x, y, 0.06, col);
    }
  };

  K.penguin = (ctx, c) => {
    outline(ctx);
    oval(ctx, -0.12, 0.82, 0.14, 0.07); fs(ctx, '#FFA726');
    oval(ctx, 0.18, 0.82, 0.14, 0.07); fs(ctx, '#FFA726');
    oval(ctx, 0, 0.08, 0.46, 0.76); fs(ctx, c);
    oval(ctx, 0.08, 0.2, 0.3, 0.55); fs(ctx, '#FFFFFF');
    oval(ctx, -0.42, 0.18, 0.11, 0.32, 0.35); fs(ctx, c);
    eye(ctx, 0.0, -0.36, 0.06);
    eye(ctx, 0.22, -0.36, 0.06);
    poly(ctx, [0.12, -0.26, 0.4, -0.2, 0.12, -0.14]); fs(ctx, '#FFA726');
  };

  K.gift = (ctx, c) => {
    outline(ctx);
    oval(ctx, -0.2, -0.52, 0.2, 0.12, 0.4); fs(ctx, '#FFD23F');
    oval(ctx, 0.2, -0.52, 0.2, 0.12, -0.4); fs(ctx, '#FFD23F');
    rrect(ctx, -0.58, -0.18, 1.16, 1.0, 0.06); fs(ctx, c);
    rrect(ctx, -0.66, -0.38, 1.32, 0.26, 0.06); fs(ctx, mix(c, 0.15));
    rrect(ctx, -0.1, -0.38, 0.2, 1.2, 0.02); fs(ctx, '#FFD23F');
  };

  // 미로 캐릭터
  K.bunny = (ctx) => {
    outline(ctx);
    for (const s of [-1, 1]) {
      oval(ctx, s * 0.22, -0.55, 0.14, 0.36, s * 0.15); fs(ctx, '#FFFFFF');
      oval(ctx, s * 0.22, -0.53, 0.07, 0.25, s * 0.15); ctx.fillStyle = '#FFB6C8'; ctx.fill();
    }
    circle(ctx, 0, 0.12, 0.5); fs(ctx, '#FFFFFF');
    eye(ctx, -0.18, 0.06, 0.07);
    eye(ctx, 0.18, 0.06, 0.07);
    dot(ctx, 0, 0.2, 0.06, '#FF8FAB');
    outline(ctx, 0.04);
    ctx.beginPath();
    ctx.arc(-0.07, 0.26, 0.07, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.arc(0.07, 0.26, 0.07, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,140,0.4)';
    circle(ctx, -0.32, 0.22, 0.08); ctx.fill();
    circle(ctx, 0.32, 0.22, 0.08); ctx.fill();
  };

  K.carrot = (ctx) => {
    outline(ctx);
    for (const a of [-0.45, 0, 0.45]) {
      oval(ctx, Math.sin(a) * 0.28, -0.62, 0.11, 0.28, a); fs(ctx, '#66BB6A');
    }
    ctx.beginPath();
    ctx.moveTo(-0.34, -0.38);
    ctx.quadraticCurveTo(0, -0.56, 0.34, -0.38);
    ctx.quadraticCurveTo(0.22, 0.4, 0, 0.92);
    ctx.quadraticCurveTo(-0.22, 0.4, -0.34, -0.38);
    ctx.closePath();
    fs(ctx, '#FF9800');
    ctx.strokeStyle = '#E65100'; ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(-0.2, -0.1); ctx.lineTo(-0.02, -0.1);
    ctx.moveTo(0.05, 0.15); ctx.lineTo(0.18, 0.15);
    ctx.moveTo(-0.14, 0.4); ctx.lineTo(-0.02, 0.4);
    ctx.stroke();
  };

  K.bee = (ctx) => {
    outline(ctx);
    oval(ctx, -0.15, -0.45, 0.22, 0.32, -0.4); fs(ctx, 'rgba(210,240,255,0.95)');
    oval(ctx, 0.18, -0.42, 0.2, 0.28, 0.4); fs(ctx, 'rgba(210,240,255,0.95)');
    poly(ctx, [-0.58, 0.04, -0.85, 0.12, -0.58, 0.22]); fs(ctx, INK);
    oval(ctx, 0, 0.12, 0.62, 0.45); ctx.fillStyle = '#FFD54F'; ctx.fill();
    ctx.save();
    oval(ctx, 0, 0.12, 0.62, 0.45); ctx.clip();
    ctx.fillStyle = INK;
    ctx.fillRect(-0.3, -0.5, 0.14, 1.2);
    ctx.fillRect(0.02, -0.5, 0.14, 1.2);
    ctx.restore();
    outline(ctx); oval(ctx, 0, 0.12, 0.62, 0.45); ctx.stroke();
    eye(ctx, 0.38, 0.04, 0.07);
    ctx.beginPath(); ctx.arc(0.36, 0.14, 0.09, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  };

  const DEFAULT_COLOR = { fish: '#FF9F1C', car: '#FF5A5F', house: '#FFD23F', shell: '#FF8FC7', flower: '#FF6FA5' };

  // 물건 하나 그리기. x, y = 가운데(px), size = 지름(px)
  // mods는 이모지 그림의 변형 (emoji-render.js 참고)
  function object(ctx, kind, x, y, size, color, flip, mods) {
    if (root.EMOJI && root.EMOJI[kind]) return root.EmojiRender.draw(ctx, kind, x, y, size, flip, mods);
    const fn = K[kind];
    if (!fn) return;
    const r = size / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -r : r, r);
    fn(ctx, color || DEFAULT_COLOR[kind] || '#FFD23F');
    ctx.restore();
  }

  // Kenney 배경 조각으로 만든 야외 배경. sc = Scene.SCENERY 설정, props = 지평선 소품 목록
  function scenery(ctx, sc, props, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h * sc.horizon);
    g.addColorStop(0, sc.sky[0]);
    g.addColorStop(1, sc.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const img = (n) => root.BgImages && root.BgImages.get(n);
    // 구름층과 먼 풍경은 그림 너비에 맞춰 늘린다 (원본 1024x400)
    const layer = (name, bottom, alpha) => {
      const im = img(name);
      if (!im) return;
      const lh = (w * im.naturalHeight) / im.naturalWidth;
      ctx.globalAlpha = alpha;
      ctx.drawImage(im, 0, bottom - lh, w, lh);
      ctx.globalAlpha = 1;
    };
    layer(sc.clouds, h * sc.horizon * 0.95, 0.9);
    layer(sc.far, h * (sc.horizon + 0.03), 0.85);
    // 땅: 물결 모양 두 겹
    const hz = h * sc.horizon;
    ctx.fillStyle = sc.ground[0];
    ctx.beginPath();
    ctx.moveTo(0, hz);
    ctx.quadraticCurveTo(w * 0.3, hz - h * 0.03, w * 0.55, hz + h * 0.005);
    ctx.quadraticCurveTo(w * 0.8, hz + h * 0.035, w, hz - h * 0.01);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sc.ground[1];
    ctx.beginPath();
    ctx.moveTo(0, h * 0.74);
    ctx.quadraticCurveTo(w * 0.35, h * 0.69, w * 0.65, h * 0.73);
    ctx.quadraticCurveTo(w * 0.85, h * 0.76, w, h * 0.71);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    // 소품: 큰 것부터 그려서 작은 덤불이 앞에 오게
    for (const p of props.slice().sort((a, b) => b.h - a.h)) {
      const im = img(p.name);
      if (!im) continue;
      const ph = p.h * h, pw = (ph * im.naturalWidth) / im.naturalHeight;
      ctx.save();
      ctx.translate(p.x * w, p.y * h);
      if (p.flip) ctx.scale(-1, 1);
      ctx.drawImage(im, -pw / 2, -ph, pw, ph);
      ctx.restore();
    }
  }

  function background(ctx, theme, w, h) {
    if (theme === 'party') {
      ctx.fillStyle = '#FFE9F1';
      ctx.fillRect(0, 0, w, h);
      // 벽지 줄무늬
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let x = 0; x < w; x += w / 12) ctx.fillRect(x, 0, w / 24, h * 0.42);
      // 가랜드
      const flags = ['#FF8FC7', '#FFD23F', '#5BC266', '#3FA7F5', '#A06CD5'];
      ctx.strokeStyle = '#C98BA6';
      ctx.lineWidth = Math.max(1.5, h * 0.006);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.03);
      ctx.quadraticCurveTo(w / 2, h * 0.13, w, h * 0.03);
      ctx.stroke();
      for (let i = 0; i < 11; i++) {
        const t = (i + 0.5) / 11, x = t * w, y = h * 0.03 + 4 * t * (1 - t) * h * 0.05;
        ctx.fillStyle = flags[i % flags.length];
        ctx.beginPath();
        ctx.moveTo(x - w * 0.025, y);
        ctx.lineTo(x + w * 0.025, y);
        ctx.lineTo(x, y + h * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      // 식탁보
      ctx.fillStyle = '#FFF6D6';
      ctx.fillRect(0, h * 0.42, w, h);
      ctx.fillStyle = 'rgba(255,170,90,0.18)';
      for (let x = 0; x < w; x += w / 10) ctx.fillRect(x, h * 0.42, w / 20, h);
      for (let y = h * 0.42; y < h; y += h / 9) ctx.fillRect(0, y, w, h / 18);
      return;
    }
    if (theme === 'zoo') {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      g.addColorStop(0, '#9FDCFF');
      g.addColorStop(1, '#FFF1C9');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#E8D27A';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.46);
      ctx.quadraticCurveTo(w * 0.3, h * 0.4, w * 0.55, h * 0.45);
      ctx.quadraticCurveTo(w * 0.8, h * 0.5, w, h * 0.43);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#D9BF62';
      for (let i = 0; i < 18; i++) {
        const x = ((i * 0.618034) % 1) * w, y = h * (0.55 + ((i * 0.7548777) % 1) * 0.42);
        ctx.beginPath();
        ctx.ellipse(x, y, w * 0.02, h * 0.006, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (theme === 'space') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1B1550');
      g.addColorStop(1, '#3D2C84');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // 작은 별들은 고정된 위치 (두 그림이 똑같아야 하므로 난수 대신 공식 사용)
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 40; i++) {
        const x = ((i * 0.618034) % 1) * w, y = ((i * 0.381966 * 2.7) % 1) * h;
        circle(ctx, x, y, 1 + (i % 3) * 0.6);
        ctx.fill();
      }
      return;
    }
    if (theme === 'snow') {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      g.addColorStop(0, '#BFD9F2');
      g.addColorStop(1, '#EAF3FC');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#F7FBFF';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.48);
      ctx.quadraticCurveTo(w * 0.35, h * 0.42, w * 0.65, h * 0.5);
      ctx.quadraticCurveTo(w * 0.85, h * 0.54, w, h * 0.47);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#D6E6F5';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 30; i++) {
        const x = ((i * 0.618034) % 1) * w, y = ((i * 0.7548777) % 1) * h * 0.45;
        circle(ctx, x, y, 2 + (i % 2));
        ctx.fill();
      }
      return;
    }
    if (theme === 'farm') {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      g.addColorStop(0, '#FFD9A8');
      g.addColorStop(1, '#FFF3DC');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#C9E37C';
      ctx.fillRect(0, h * 0.47, w, h);
      // 울타리
      ctx.strokeStyle = '#C49A6C';
      ctx.lineWidth = Math.max(2, h * 0.012);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.42); ctx.lineTo(w, h * 0.42);
      ctx.moveTo(0, h * 0.46); ctx.lineTo(w, h * 0.46);
      for (let x = w * 0.04; x < w; x += w * 0.08) { ctx.moveTo(x, h * 0.39); ctx.lineTo(x, h * 0.48); }
      ctx.stroke();
      return;
    }
    if (theme === 'sea') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#8FDBFF');
      g.addColorStop(1, '#2F8FE0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (const [x, wd] of [[0.12, 0.08], [0.42, 0.12], [0.75, 0.07]]) {
        ctx.beginPath();
        ctx.moveTo(x * w, 0);
        ctx.lineTo((x + wd) * w, 0);
        ctx.lineTo((x + wd * 2.2) * w, h * 0.75);
        ctx.lineTo((x + wd * 0.6) * w, h * 0.75);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#F6D58E';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.quadraticCurveTo(w * 0.25, h * 0.66, w * 0.5, h * 0.71);
      ctx.quadraticCurveTo(w * 0.75, h * 0.76, w, h * 0.69);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    g.addColorStop(0, '#9FDCFF');
    g.addColorStop(1, '#E3F6FF');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#A5DC7A';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.quadraticCurveTo(w * 0.3, h * 0.42, w * 0.6, h * 0.48);
    ctx.quadraticCurveTo(w * 0.85, h * 0.53, w, h * 0.46);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  root.Draw = { object, background, scenery, rrect, mix, INK, kinds: Object.keys(K) };
})(typeof self !== 'undefined' ? self : this);
