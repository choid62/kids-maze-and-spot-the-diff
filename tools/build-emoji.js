// Fluent Emoji SVG를 분석해서 js/emoji-data.js 로 만든다. 실행: node tools/build-emoji.js
// 각 그림을 조각(path) 목록으로 바꾸고, 틀린그림 차이를 만들 때 쓸 정보를 함께 계산한다.
//   base  : 몸통(가장 큰 조각) - 무늬를 입힐 곳
//   eyes  : 두 눈(어둡고 작은 조각 한 쌍 + 안쪽 하이라이트) - 웃는 눈으로 바꿀 곳
//   parts : 몸통에 붙은 부분 묶음(집게, 날개, 귀, 바퀴 등) - 크기/각도/색/없애기
//   sym   : 좌우 대칭이면 뒤집기 차이를 쓰지 않는다
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'fluent-emoji');
const OUT = path.join(__dirname, '..', 'js', 'emoji-data.js');

// ---------- SVG path → 다각형(점 목록) ----------
// 곡선과 호를 잘게 나눠 점으로 바꾼다. 경계 상자와 실제 면적 계산에 쓴다.
function arcPoints(x1, y1, rx, ry, phi, fa, fs, x2, y2) {
  if (!rx || !ry) return [[x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const c = Math.cos((phi * Math.PI) / 180), s = Math.sin((phi * Math.PI) / 180);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = c * dx + s * dy, yp = -s * dx + c * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  let co = Math.sqrt(Math.max(0, num / den));
  if (fa === fs) co = -co;
  const cxp = (co * rx * yp) / ry, cyp = (-co * ry * xp) / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI;
  else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(dt) / (Math.PI / 16)));
  const pts = [];
  for (let k = 1; k <= n; k++) {
    const t = t1 + (dt * k) / n;
    pts.push([cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c]);
  }
  return pts;
}

function flatten(d) {
  const subs = [];
  let cur = null, i = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0, lc = null, lq = null, prev = '';
  const ws = () => { while (i < d.length && /[\s,]/.test(d[i])) i++; };
  const num = () => {
    ws();
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(d.slice(i));
    if (!m) throw new Error('숫자를 읽을 수 없음: ' + d.slice(i, i + 20));
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const flag = () => { ws(); return d[i++] === '1' ? 1 : 0; };
  const hasNum = () => { ws(); return i < d.length && /[-+.\d]/.test(d[i]); };
  const pt = (x, y) => { if (!cur) { cur = [[cx, cy]]; subs.push(cur); } cur.push([x, y]); };
  const cubic = (x1, y1, x2, y2, x, y) => {
    for (let k = 1; k <= 10; k++) {
      const t = k / 10, u = 1 - t;
      pt(u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x, u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y);
    }
  };
  const quad = (x1, y1, x, y) => {
    for (let k = 1; k <= 8; k++) {
      const t = k / 8, u = 1 - t;
      pt(u * u * cx + 2 * u * t * x1 + t * t * x, u * u * cy + 2 * u * t * y1 + t * t * y);
    }
  };

  while (i < d.length) {
    ws();
    if (i >= d.length) break;
    if (/[a-zA-Z]/.test(d[i])) cmd = d[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') {
      if (cur) cur.push([sx, sy]);
      cx = sx; cy = sy; cur = null; prev = 'Z';
      if (!hasNum()) continue;
      continue;
    }
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (C === 'M') {
      cx = ox + num(); cy = oy + num(); sx = cx; sy = cy;
      cur = [[cx, cy]]; subs.push(cur);
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') { const x = ox + num(), y = oy + num(); pt(x, y); cx = x; cy = y; }
    else if (C === 'H') { const x = ox + num(); pt(x, cy); cx = x; }
    else if (C === 'V') { const y = oy + num(); pt(cx, y); cy = y; }
    else if (C === 'C') {
      const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), x = ox + num(), y = oy + num();
      cubic(x1, y1, x2, y2, x, y); lc = [x2, y2]; cx = x; cy = y;
    } else if (C === 'S') {
      const r = (prev === 'C' || prev === 'S') && lc ? [2 * cx - lc[0], 2 * cy - lc[1]] : [cx, cy];
      const x2 = ox + num(), y2 = oy + num(), x = ox + num(), y = oy + num();
      cubic(r[0], r[1], x2, y2, x, y); lc = [x2, y2]; cx = x; cy = y;
    } else if (C === 'Q') {
      const x1 = ox + num(), y1 = oy + num(), x = ox + num(), y = oy + num();
      quad(x1, y1, x, y); lq = [x1, y1]; cx = x; cy = y;
    } else if (C === 'T') {
      const r = (prev === 'Q' || prev === 'T') && lq ? [2 * cx - lq[0], 2 * cy - lq[1]] : [cx, cy];
      const x = ox + num(), y = oy + num();
      quad(r[0], r[1], x, y); lq = r; cx = x; cy = y;
    } else if (C === 'A') {
      const rx = num(), ry = num(), phi = num(), fa = flag(), fs = flag(), x = ox + num(), y = oy + num();
      for (const [px, py] of arcPoints(cx, cy, rx, ry, phi, fa, fs, x, y)) pt(px, py);
      cx = x; cy = y;
    } else throw new Error('모르는 명령: ' + cmd);
    prev = C;
  }
  return subs;
}

function pathBox(d) {
  const subs = flatten(d);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, sum = 0, n = 0;
  for (const s of subs) for (const [x, y] of s) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    sum += x; n++;
  }
  const b = [minX, minY, maxX - minX, maxY - minY];
  b.cx = sum / n; // 점들의 평균 위치 (대칭 판정용)
  b.subs = subs;
  return b;
}

// 점이 조각 안에 있는지 (nonzero 또는 evenodd)
function inside(subs, evenodd, x, y) {
  let wind = 0, cross = 0;
  for (const s of subs) {
    for (let k = 0, n = s.length; k < n; k++) {
      const [x1, y1] = s[k], [x2, y2] = s[(k + 1) % n];
      if ((y1 <= y) !== (y2 <= y)) {
        const xi = x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
        if (xi > x) { cross++; wind += y2 > y1 ? 1 : -1; }
      }
    }
  }
  return evenodd ? cross % 2 === 1 : wind !== 0;
}

// 64x64 격자로 그려서 조각마다 "실제로 보이는 면적"(맨 위에 보이는 칸 수)을 센다
function visibleAreas(paths, boxes) {
  const N = 64, step = 32 / N, vis = new Array(paths.length).fill(0);
  for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
    const x = (gx + 0.5) * step, y = (gy + 0.5) * step;
    for (let k = paths.length - 1; k >= 0; k--) {
      const b = boxes[k];
      if (x < b[0] || y < b[1] || x > b[0] + b[2] || y > b[1] + b[3]) continue;
      if (inside(b.subs, paths[k].evenodd, x, y)) { vis[k]++; break; }
    }
  }
  return vis.map((v) => v * step * step);
}

// ---------- 색 ----------
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function lum(hex) { const [r, g, b] = rgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b; }
function sat(hex) {
  const [r, g, b] = rgb(hex);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return 0;
  return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
}

// ---------- 상자 계산 ----------
const area = (b) => b[2] * b[3];
const contains = (o, i, t = 0.35) => i[0] >= o[0] - t && i[1] >= o[1] - t && i[0] + i[2] <= o[0] + o[2] + t && i[1] + i[3] <= o[1] + o[3] + t;
function union(boxes) {
  const x0 = Math.min(...boxes.map((b) => b[0])), y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[0] + b[2])), y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  return [x0, y0, x1 - x0, y1 - y0];
}
const r2 = (v) => Math.round(v * 100) / 100;

function parseSvg(text) {
  const paths = [];
  const re = /<(path|circle)\b([^>]*)\/?>/g;
  let m;
  while ((m = re.exec(text))) {
    const attrs = {};
    m[2].replace(/([a-zA-Z-]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; });
    let d = attrs.d;
    if (m[1] === 'circle') {
      const cx = +attrs.cx, cy = +attrs.cy, r = +attrs.r;
      d = `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
    }
    if (!d || !attrs.fill || attrs.fill === 'none') continue;
    const NAMED = { white: '#FFFFFF', black: '#000000' };
    const fill = NAMED[attrs.fill.toLowerCase()] || attrs.fill.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fill)) throw new Error('모르는 색: ' + attrs.fill);
    paths.push({ d, fill, evenodd: attrs['fill-rule'] === 'evenodd' });
  }
  return paths;
}

// 눈이 아닌 것(창문, 씨앗 등)을 눈으로 잘못 찾는 그림
const NO_EYES = new Set(['automobile', 'flying_saucer', 'watermelon']);

function analyze(paths, name) {
  const boxes = paths.map((p) => pathBox(p.d));
  const box = union(boxes);
  const total = area(box);
  const vis = visibleAreas(paths, boxes);
  const visTotal = vis.reduce((x, y) => x + y, 0);

  // 몸통: 실제로 가장 넓게 보이는 조각
  let base = 0;
  vis.forEach((v, i) => { if (v > vis[base]) base = i; });

  // 부모: 앞서 그려진 조각 중 나를 감싸는 가장 가까운 조각 (몸통 제외)
  const parent = paths.map((_, j) => {
    for (let i = j - 1; i >= 0; i--) {
      if (i === base) continue;
      if (contains(boxes[i], boxes[j]) && area(boxes[i]) > area(boxes[j]) * 1.2) return i;
    }
    return -1;
  });
  const childrenOf = (i) => {
    const out = [i];
    for (let j = i + 1; j < paths.length; j++) if (out.includes(parent[j])) out.push(j);
    return out;
  };

  // 눈: 어둡고 작은 조각 한 쌍, 같은 높이, 좌우로 떨어져 있음
  const dark = paths.map((p, i) => i).filter((i) => {
    const a = area(boxes[i]) / total;
    return lum(paths[i].fill) < 0.3 && a > 0.002 && a < 0.06 && i !== base;
  });
  let eyes = null;
  if (!NO_EYES.has(name)) for (const i of dark) for (const j of dark) {
    if (j <= i) continue;
    const a = boxes[i], b = boxes[j];
    const ratio = area(a) / area(b);
    const cyA = a[1] + a[3] / 2, cyB = b[1] + b[3] / 2;
    const dx = Math.abs(a[0] + a[2] / 2 - (b[0] + b[2] / 2));
    if (ratio < 0.6 || ratio > 1.65) continue;
    if (Math.abs(cyA - cyB) > Math.max(a[3], b[3]) * 0.6) continue;
    if (dx < Math.max(a[2], b[2]) * 1.3 || dx > box[2] * 0.6) continue;
    if ((cyA - box[1]) / box[3] > 0.75) continue;
    if (!eyes || cyA < eyes.cy) eyes = { pair: [i, j], cy: cyA };
  }
  // 옆모습이라 눈이 하나뿐이면: 위쪽에 있는 동그스름한 어두운 조각 하나
  if (!eyes && !NO_EYES.has(name)) {
    for (const i of dark) {
      const b = boxes[i], ratio = b[2] / b[3], cy = b[1] + b[3] / 2;
      if (ratio < 0.55 || ratio > 1.8 || area(b) / total > 0.03) continue;
      if ((cy - box[1]) / box[3] > 0.6) continue;
      if (!eyes || cy < eyes.cy) eyes = { pair: [i], cy };
    }
  }
  let eyeIdx = null, eyeBoxes = null, eyeColor = null;
  if (eyes) {
    eyeBoxes = eyes.pair.map((k) => boxes[k]);
    eyeColor = paths[eyes.pair[0]].fill;
    eyeIdx = eyes.pair.slice();
    // 눈 안의 하이라이트(밝은 작은 조각)도 눈에 포함
    paths.forEach((p, k) => {
      if (eyeIdx.includes(k)) return;
      if (eyeBoxes.some((eb) => contains(eb, boxes[k], 0.5)) && area(boxes[k]) < area(eyeBoxes[0]) * 1.2) eyeIdx.push(k);
    });
  }

  // 좌우 대칭: 거울에 비친 같은 색 조각이 있는지
  const mid = box[0] + box[2] / 2;
  let symA = 0, allA = 0;
  boxes.forEach((b, i) => {
    const mx = 2 * mid - (b[0] + b[2]);
    const a = area(b);
    allA += a;
    if (boxes.some((c, k) => paths[k].fill === paths[i].fill && Math.abs(c[0] - mx) < 0.7 && Math.abs(c[1] - b[1]) < 0.7 &&
      Math.abs(c[2] - b[2]) < 0.7 && Math.abs(c[3] - b[3]) < 0.7 && Math.abs(c.cx - (2 * mid - b.cx)) < 0.6)) symA += a;
  });
  const sym = symA / allA > 0.85;

  // 부분 묶음: 몸통 바로 위에 붙은 조각과 그 안의 조각들
  const used = new Set([base, ...(eyeIdx || [])]);
  const parts = [];
  paths.forEach((p, i) => {
    if (used.has(i) || parent[i] !== -1) return;
    const idx = childrenOf(i).filter((k) => !used.has(k));
    const gb = union(idx.map((k) => boxes[k]));
    const a = area(gb) / total;
    if (a < 0.015 || a > 0.35) return;
    if (gb[2] < box[2] * 0.08 && gb[3] < box[3] * 0.08) return;
    // edge: 바깥으로 튀어나온 부분(날개, 꼬리, 집게, 다리, 귀) - 돌려도 자연스럽다
    const bb = boxes[base], t = 0.8;
    const touchesEdge = gb[0] <= box[0] + t || gb[1] <= box[1] + t || gb[0] + gb[2] >= box[0] + box[2] - t || gb[1] + gb[3] >= box[1] + box[3] - t;
    const outsideBase = gb[0] < bb[0] - 0.5 || gb[1] < bb[1] - 0.5 || gb[0] + gb[2] > bb[0] + bb[2] + 0.5 || gb[1] + gb[3] > bb[1] + bb[3] + 0.5;
    // seen: 그 부분이 실제로 보이는 면적 비율 (가려진 부분을 숨기거나 색을 바꾸면 아무 변화가 없으므로)
    const seen = idx.reduce((x, k) => x + vis[k], 0) / visTotal;
    parts.push({ idx, box: gb.map(r2), sat: Math.max(...idx.map((k) => sat(paths[k].fill))), share: r2(a), seen: r2(seen), edge: touchesEdge || outsideBase });
  });

  const baseFill = paths[base].fill;
  return {
    p: paths.map((x) => (x.evenodd ? [x.d, x.fill, 1] : [x.d, x.fill])),
    box: [box[0], box[1], box[2], box[3]].map(r2),
    base,
    baseBox: [boxes[base][0], boxes[base][1], boxes[base][2], boxes[base][3]].map(r2),
    baseShare: r2(vis[base] / visTotal),
    baseLum: r2(lum(baseFill)),
    sat: r2(Math.max(...paths.filter((_, k) => vis[k] / visTotal > 0.08).map((x) => sat(x.fill)), 0)),
    sym,
    eyes: eyeIdx,
    eyeBoxes: eyeBoxes && eyeBoxes.map((b) => [b[0], b[1], b[2], b[3]].map(r2)),
    eyeColor,
    parts: parts.map((q) => ({ idx: q.idx, box: q.box, sat: r2(q.sat), share: q.share, seen: q.seen, edge: q.edge })),
  };
}

const data = {};
const report = [];
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort()) {
  const name = file.replace(/\.svg$/, '');
  const info = analyze(parseSvg(fs.readFileSync(path.join(SRC, file), 'utf8')), name);
  data[name] = info;
  report.push(`${name.padEnd(22)} 조각 ${String(info.p.length).padStart(3)}  부분 ${info.parts.length}  눈 ${info.eyes ? 'O' : '-'}  대칭 ${info.sym ? 'O' : '-'}  몸통 ${info.baseShare}`);
}

const header = '// 자동 생성 파일 (tools/build-emoji.js). 직접 고치지 마세요.\n' +
  '// 그림: Microsoft Fluent Emoji (MIT License, assets/fluent-emoji/LICENSE)\n';
fs.writeFileSync(OUT, header +
  '(function (root) {\n  const EMOJI = ' + JSON.stringify(data) + ';\n' +
  "  if (typeof module !== 'undefined' && module.exports) module.exports = EMOJI;\n  else root.EMOJI = EMOJI;\n" +
  "})(typeof self !== 'undefined' ? self : this);\n");
if (process.argv.includes('--report')) console.log(report.join('\n'));
console.log(`그림 ${Object.keys(data).length}개 → ${path.relative(process.cwd(), OUT)} (${Math.round(fs.statSync(OUT).size / 1024)}KB)`);
