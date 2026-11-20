// 식물 키우기(Grow It!) 화면. 씨앗 고르기 → 심기 → 싹(땅속 뿌리) → 돌보기 사건 → 꽃/열매 → 거두기 → 한살이.
// 그림은 캔버스 하나에 그린다: 하늘, 해·구름, 땅(단면: 뿌리와 당근이 보인다), 줄기와 잎(직접 그림), 꽃·열매·벌레(Fluent Emoji).
// 움직임은 setTimeout 으로 매 프레임 그린다 (어느 기기에서나 같은 속도).
(function (root) {
  const S = {
    active: false, token: {}, timers: [], anims: [], tags: [], onEnd: null, rng: null, demo: false,
    plan: null, plant: null, step: 'choose', stageIdx: 0, needIdx: 0, need: null, busy: false,
    g: 0, rootG: 0, hole: 0, seedIn: 0, covered: 0, thirsty: false, lean: 0, pale: 0,
    sunX: 0.82, cloudX: -0.4, rain: 0, drops: [], dropsGiven: 0, dropsWanted: 0,
    bugs: [], flowers: [], fruits: [], seeds: [], carrots: [], head: 0, headFlip: 1, bee: null, count: 0,
    W: 0, H: 0, dpr: 1,
  };
  const $ = (id) => document.getElementById(id);
  const UNRIPE = { '#F8312F': '#8CCB4E' }; // 토마토·딸기의 빨간 부분
  const later = (f, ms) => { const tk = S.token; S.timers.push(setTimeout(() => { if (S.token === tk) f(); }, ms)); };
  const ease = (k) => 1 - Math.pow(1 - k, 3);

  // ms 동안 fn(0~1), 끝나면 done
  function anim(ms, fn, done) {
    S.anims.push({ t0: performance.now(), ms, fn, done });
  }

  function init(onEnd) {
    S.onEnd = onEnd;
    S.canvas = $('grow-canvas');
    S.ctx = S.canvas.getContext('2d');
    S.canvas.addEventListener('pointerdown', onTap);
    $('grow-water').addEventListener('click', water);
    $('grow-new').addEventListener('click', () => { Sound.tap(); start({}); });
    $('grow-seeds').addEventListener('click', (e) => {
      const b = e.target.closest('[data-plant]');
      if (b) choose(b.dataset.plant);
    });
    root.addEventListener('resize', () => { if (S.active) layout(); });
  }

  function start(opts) {
    opts = opts || {};
    stop();
    S.active = true;
    S.speaking = false;
    S.pending = null;
    $('screen-grow').classList.remove('speaking');
    S.demo = opts.demo === 'growplay';
    S.rng = Core.makeRng(opts.seed != null ? opts.seed : Core.newSeed());
    Object.assign(S, {
      plan: null, plant: null, step: 'choose', stageIdx: 0, needIdx: 0, need: null, busy: false,
      g: 0, rootG: 0, hole: 0, seedIn: 0, covered: 0, thirsty: false, lean: 0, pale: 0,
      sunX: 0.82, cloudX: -0.4, rain: 0, drops: [], dropsGiven: 0, dropsWanted: 0,
      bugs: [], flowers: [], fruits: [], seeds: [], carrots: [], head: 0, headFlip: 1, bee: null, count: 0, anims: [], tags: [],
    });
    $('grow-cycle').classList.add('hidden');
    $('grow-count').textContent = '0';
    setWater(false);
    layout();
    showSeeds(opts.plant || opts.theme); // 점검용: ?theme=carrot 처럼 식물을 정할 수 있다
    tick();
  }

  function stop() {
    S.active = false;
    S.token = {};
    S.timers.forEach(clearTimeout);
    S.timers = [];
    document.querySelectorAll('.grow-fly').forEach((f) => f.remove());
  }

  function layout() {
    const box = $('grow-stage').getBoundingClientRect();
    S.dpr = Math.min(root.devicePixelRatio || 1, 3);
    S.W = box.width;
    S.H = box.height;
    S.canvas.width = Math.round(S.W * S.dpr);
    S.canvas.height = Math.round(S.H * S.dpr);
    S.canvas.style.width = S.W + 'px';
    S.canvas.style.height = S.H + 'px';
    if (S.W && S.active) draw(); // 크기를 바꾸면 캔버스가 지워지므로 바로 다시 그린다
  }

  // ---------- 진행 표시와 말 ----------
  function progress() {
    $('grow-dots').innerHTML = Garden.STAGES.map((s, i) => `<span class="dot${i < S.stageIdx ? ' on' : ''}${i === S.stageIdx ? ' now' : ''}"></span>`).join('');
  }
  // 화면 글자 + 목소리. 저절로 넘어가는 다음 순서는 afterSay 로 말이 끝난 뒤에 (아이가 누르는 건 바로)
  let sayTok = 0;
  function say(text, speech) {
    const el = $('grow-caption');
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    const words = speech || text;
    const my = ++sayTok;
    S.speaking = true;
    $('screen-grow').classList.add('speaking');
    Sound.say(words, () => {
      if (my !== sayTok) return;
      S.speaking = false;
      $('screen-grow').classList.remove('speaking');
      const fn = S.pending;
      S.pending = null;
      if (fn) later(fn, 300);
    }, 900 + words.length * 85); // 목소리가 없거나 끝 알림이 안 오면 글 길이만큼 기다린다
  }
  // 적어도 minMs 뒤, 그리고 지금 하는 말이 끝난 뒤에 fn
  function afterSay(fn, minMs) {
    later(() => { if (!S.speaking) fn(); else S.pending = fn; }, minMs || 0);
  }
  function setWater(on) { $('grow-water').classList.toggle('hidden', !on); }

  // ---------- 1. 씨앗 고르기 ----------
  function showSeeds(force) {
    S.step = 'choose';
    S.stageIdx = 0;
    progress();
    const ids = force && Garden.PLANTS[force] ? [force] : Garden.seedChoices(S.rng);
    $('grow-seeds').innerHTML = ids.map((id) => {
      const p = Garden.PLANTS[id];
      return `<button class="seed-pack" data-plant="${id}"><img src="assets/words/${p.fruit}.svg" alt=""><span>${p.name}</span></button>`;
    }).join('');
    $('grow-seeds').classList.remove('hidden');
    say('Pick a seed to plant!');
    if (S.demo) { const pick = () => (S.speaking ? later(pick, 300) : $('grow-seeds').querySelector('[data-plant]').click()); later(pick, 800); }
  }

  function choose(id) {
    if (S.step !== 'choose' || S.speaking) return;
    Sound.unlock();
    Sound.tap();
    S.plant = Garden.PLANTS[id];
    S.plan = Garden.plan(id, S.rng);
    $('grow-seeds').classList.add('hidden');
    $('grow-title').textContent = `Grow It! · ${S.plant.name}`;
    S.xs = S.plant.type === 'root' ? rowXs(S.plan.carrots) : [0.5];
    S.step = 'dig';
    say(S.plant.type === 'root' ? 'Carrot seeds are tiny, so we plant a row. Tap to dig!' : 'Tap the ground to dig a hole!');
    if (S.demo) demoTap();
  }

  const rowXs = (n) => Array.from({ length: n }, (_, i) => 0.5 + (i - (n - 1) / 2) * Math.min(0.17, 0.7 / n));

  // ---------- 그리기 ----------
  const groundY = () => S.H * 0.62;
  const stemH = () => S.g * S.plant.height * S.H;
  function stemPt(t, x0) {
    const bx = (x0 == null ? 0.5 : x0) * S.W;
    const h = stemH();
    return { x: bx + S.lean * t * t * S.W * 0.06, y: groundY() - t * h };
  }

  function draw() {
    const ctx = S.ctx, W = S.W, H = S.H, gy = groundY();
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    // 하늘
    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, S.rain > 0 ? '#9DB3C7' : '#8FD3FF');
    sky.addColorStop(1, '#E3F6FF');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, gy);
    // 해와 구름
    const sun = sunPos();
    Draw.object(ctx, 'sun', sun.x, sun.y, H * 0.16);
    Draw.object(ctx, 'cloud', (S.sunX > 0.5 ? 0.2 : 0.8) * W, H * 0.12, H * 0.12); // 장식 구름은 해 반대편
    if (S.rain > 0) { ctx.globalAlpha = 0.95; Draw.object(ctx, 'cloud', sun.x - H * 0.03, sun.y + H * 0.02, H * 0.3, null, false, { recolor: { '#F3EEF8': '#A9B4C2' } }); Draw.object(ctx, 'cloud', W * 0.45, H * 0.1, H * 0.24, null, false, { recolor: { '#F3EEF8': '#B8C2CE' } }); ctx.globalAlpha = 1; }
    if (S.cloudX > -0.3) Draw.object(ctx, 'cloud', S.cloudX * W, sun.y + H * 0.02, H * 0.26);
    // 땅 (단면)
    ctx.fillStyle = '#7BC67E';
    ctx.fillRect(0, gy - 6, W, 10);
    const soil = ctx.createLinearGradient(0, gy, 0, H);
    soil.addColorStop(0, '#A0703F');
    soil.addColorStop(1, '#7A5230');
    ctx.fillStyle = soil;
    ctx.fillRect(0, gy + 4, W, H - gy);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc((i * 97) % W, gy + 20 + ((i * 53) % (H - gy - 24)), 3 + (i % 3), 0, 6.3); ctx.fill(); }
    if (!S.plant) return drawTags();
    for (const x0 of S.xs) drawOne(x0);
    drawParts();
    // 비
    if (S.rain > 0) {
      ctx.strokeStyle = 'rgba(70,130,220,0.7)';
      ctx.lineWidth = 3;
      const t = performance.now() / 1000;
      for (let i = 0; i < 40; i++) {
        const x = ((i * 53 + t * 40) % W);
        const y = ((i * 37 + t * 600) % gy);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 16); ctx.stroke();
      }
    }
    // 떨어지는 물방울
    for (const d of S.drops) drawDrop(ctx, d.x, d.y, H * 0.035);
    if (S.bee) Draw.object(ctx, 'honeybee', S.bee.x, S.bee.y, H * 0.1, null, S.bee.flip);
    drawTags();
  }

  function sunPos() { return { x: S.sunX * S.W, y: S.H * 0.13 }; }

  function drawDrop(ctx, x, y, r) {
    ctx.fillStyle = '#3FA9F5';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.4);
    ctx.quadraticCurveTo(x + r, y, x, y + r);
    ctx.quadraticCurveTo(x - r, y, x, y - r * 1.4);
    ctx.fill();
  }

  // 식물 하나 (당근은 줄로 여러 개)
  function drawOne(x0) {
    const ctx = S.ctx, W = S.W, H = S.H, gy = groundY();
    const bx = x0 * W;
    // 구멍과 씨앗
    if (S.hole > 0 && S.covered < 1) {
      ctx.fillStyle = '#5C3B1E';
      ctx.beginPath(); ctx.ellipse(bx, gy + 14, 26 * S.hole, 12 * S.hole, 0, 0, 6.3); ctx.fill();
    }
    if (S.seedIn > 0) {
      const sy = gy - 60 * (1 - S.seedIn) + 22 * S.seedIn;
      ctx.fillStyle = '#6B4A2B';
      ctx.beginPath(); ctx.ellipse(bx, sy, 9, 6, 0.4, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#E9D2B0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx - 5, sy - 1); ctx.lineTo(bx + 5, sy + 1); ctx.stroke();
    }
    if (S.covered > 0 && S.covered < 1) {
      ctx.fillStyle = '#8A5C33';
      ctx.beginPath(); ctx.ellipse(bx, gy + 2, 30, 10 * S.covered, 0, Math.PI, 0); ctx.fill();
    }
    // 뿌리 (땅속으로)
    if (S.rootG > 0) {
      ctx.strokeStyle = '#F3E3C3';
      ctx.lineCap = 'round';
      const L = (H - gy) * 0.55 * S.rootG;
      const roots = [[0, 1, 4], [-0.5, 0.7, 2.5], [0.55, 0.65, 2.5], [-0.25, 0.45, 2], [0.3, 0.4, 2]];
      for (const [dx, len, w] of roots) {
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(bx, gy + 22);
        ctx.quadraticCurveTo(bx + dx * 30, gy + 22 + L * len * 0.5, bx + dx * 50 * S.rootG, gy + 22 + L * len);
        ctx.stroke();
      }
    }
    if (S.g <= 0) return;
    if (S.plant.type === 'root') return drawCarrotTop(x0);
    // 줄기
    const top = stemPt(1, x0);
    const green = S.pale > 0 ? '#9BBF5A' : '#3E9B3A';
    ctx.strokeStyle = green;
    ctx.lineWidth = Math.max(4, 6 + S.g * (S.plant.type === 'sunflower' ? 10 : 5));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0 * W, gy + 20);
    const mid = stemPt(0.5, x0);
    ctx.quadraticCurveTo(mid.x, mid.y, top.x, top.y);
    ctx.stroke();
    // 떡잎: 막 나온 새싹 꼭대기의 작은 잎 두 장
    if (S.g < 0.45 && S.plant.type !== 'root') {
      const c = Math.min(1, S.g / 0.12) * (1 - Math.max(0, (S.g - 0.3) / 0.15));
      if (c > 0) { drawLeaf(ctx, top.x, top.y, H * 0.035 * c, -1, -0.5, green); drawLeaf(ctx, top.x, top.y, H * 0.035 * c, 1, 0.5, green); }
    }
    // 잎 (아래부터 차례로 나온다)
    const leaves = S.plant.type === 'sunflower' ? [0.25, 0.42, 0.6, 0.75] : S.plant.id === 'strawberry' ? [0.35, 0.55, 0.75, 0.9] : [0.22, 0.38, 0.55, 0.7, 0.85];
    leaves.forEach((t, i) => {
      const grow = Math.max(0, Math.min(1, (S.g - t * 0.55) * 3));
      if (grow <= 0) return;
      const p = stemPt(t, x0);
      const side = i % 2 ? 1 : -1;
      const size = H * (S.plant.type === 'sunflower' ? 0.085 : 0.07) * grow * (S.plant.id === 'strawberry' ? 1.2 : 1);
      const ang = side * (S.thirsty ? 1.15 : 0.55) + (S.thirsty ? 0.5 : -0.1) * side;
      drawLeaf(ctx, p.x, p.y, size, side, ang, green);
    });
    // 해바라기 꽃
    if (S.plant.type === 'sunflower' && S.head > 0) {
      const sz = H * 0.2 * S.head;
      Draw.object(ctx, 'sunflower', top.x, top.y - sz * 0.25, sz, null, S.headFlip < 0);
    }
  }

  // 해바라기 꽃 가운데(갈색 부분)의 위치
  function headCenter() {
    const top = stemPt(1);
    const sz = S.H * 0.2;
    return { x: top.x, y: top.y - sz * 0.25 - sz * 0.13 };
  }

  function drawLeaf(ctx, x, y, size, side, ang, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang - Math.PI / 2 * side * 0);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(side * size * 0.75, -size * 0.1, size * 0.8, size * 0.36, side * -0.35 + (ang - side * 0.55) * 0.6, 0, 6.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * size * 1.3, -size * 0.2); ctx.stroke();
    ctx.restore();
  }

  // 당근: 땅 위 깃털 잎 + 땅속 당근
  function drawCarrotTop(x0) {
    const ctx = S.ctx, H = S.H, gy = groundY();
    const c = S.carrots.find((k) => k.x === x0);
    if (c && c.pulled) return;
    const bx = x0 * S.W;
    const lift = c && c.lift ? c.lift : 0;
    ctx.save();
    ctx.translate(0, -lift); // 뽑을 때 잎과 당근을 함께 위로
    const h = H * 0.18 * S.g;
    ctx.strokeStyle = S.pale > 0 ? '#9BBF5A' : '#3E9B3A';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
      const ex = bx + i * h * 0.22, ey = gy - h * (1 - Math.abs(i) * 0.12) * (S.thirsty ? 0.7 : 1);
      ctx.beginPath(); ctx.moveTo(bx, gy); ctx.quadraticCurveTo(bx + i * h * 0.05, gy - h * 0.5, ex, ey); ctx.stroke();
      for (let k = 1; k <= 3; k++) {
        const fx = bx + (ex - bx) * (k / 4), fy = gy + (ey - gy) * (k / 4);
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - 7, fy - 6); ctx.moveTo(fx, fy); ctx.lineTo(fx + 7, fy - 6); ctx.stroke();
      }
    }
    // 땅속 당근 (단면이라 보인다)
    const cs = c ? c.size : Math.max(0, S.g - 0.3);
    if (cs > 0) {
      const len = H * 0.19 * cs, wid = H * 0.028 * cs + 4;
      const y0 = gy + 2;
      ctx.fillStyle = '#F28C28';
      ctx.beginPath(); ctx.moveTo(bx - wid, y0); ctx.lineTo(bx + wid, y0); ctx.lineTo(bx, y0 + len); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#D9701A'; ctx.lineWidth = 2;
      for (let k = 1; k <= 3; k++) { const yy = y0 + len * k / 4; ctx.beginPath(); ctx.moveTo(bx - wid * (1 - k / 4) * 0.7, yy); ctx.lineTo(bx - wid * (1 - k / 4) * 0.2, yy); ctx.stroke(); }
    }
    ctx.restore();
  }

  // 꽃, 열매, 해바라기 씨, 애벌레
  function drawParts() {
    const ctx = S.ctx, H = S.H;
    for (const f of S.flowers) {
      if (f.gone) continue;
      branch(f);
      const sz = H * 0.075 * f.open;
      if (sz > 1) drawFlower(ctx, f.x, f.y, sz);
      if (f.pollen > 0) { ctx.fillStyle = `rgba(255,214,64,${f.pollen})`; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(f.x + Math.cos(i) * sz * 0.6, f.y + Math.sin(i * 2) * sz * 0.5, 3, 0, 6.3); ctx.fill(); } }
    }
    for (const fr of S.fruits) {
      if (fr.picked) continue;
      branch(fr);
      // 덜 익은 열매: 빨간 부분만 초록으로, 익어 갈수록 빨간 그림을 위에 겹쳐 그린다
      const sz = H * 0.09 * fr.size;
      if (fr.ripe < 1) Draw.object(ctx, S.plant.fruit, fr.x, fr.y + fr.wob, sz, null, false, { recolor: UNRIPE });
      if (fr.ripe > 0) { ctx.globalAlpha = fr.ripe; Draw.object(ctx, S.plant.fruit, fr.x, fr.y + fr.wob, sz); ctx.globalAlpha = 1; }
    }
    for (const s of S.seeds) if (!s.picked) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.fillStyle = '#1F1712';
      ctx.strokeStyle = '#FFF4DC';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 10, 0, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
      ctx.restore();
    }
    for (const b of S.bugs) if (!b.gone) Draw.object(ctx, 'bug', b.x + (b.fly ? b.fly * 400 * b.dir : 0), b.y - (b.fly ? b.fly * 300 : 0), H * 0.08, null, b.dir < 0);
  }

  // 꽃잎 5장 + 가운데 (가지 끝에 핀 꽃)
  function drawFlower(ctx, x, y, size) {
    const yellow = S.plant.id === 'tomato';
    const petal = yellow ? '#FFD23F' : '#FFFFFF', edge = yellow ? '#E8A800' : '#E3D8EC';
    const r = size * 0.24;
    ctx.fillStyle = petal;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15, r, r * 0.8, a, 0, 6.3);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = yellow ? '#F28C28' : '#FFC83D';
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, 6.3); ctx.fill();
  }

  // 줄기에서 꽃/열매까지 작은 가지
  function branch(o) {
    if (o.from == null) return;
    const ctx = S.ctx;
    const p = stemPt(o.from);
    ctx.strokeStyle = '#3E9B3A';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo((p.x + o.x) / 2, Math.min(p.y, o.y) - 10, o.x, o.y - 6); ctx.stroke();
  }

  function drawTags() {
    const ctx = S.ctx, now = performance.now();
    S.tags = S.tags.filter((t) => now - t.t0 < 1100);
    for (const t of S.tags) {
      const k = (now - t.t0) / 1100;
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = t.color || '#FF5A2E';
      ctx.beginPath(); ctx.arc(t.x, t.y - k * 30, 20, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.text, t.x, t.y - k * 30 + 1);
      ctx.globalAlpha = 1;
    }
  }
  const tag = (x, y, text, color) => S.tags.push({ x, y, text: String(text), color, t0: performance.now() });

  function tick() {
    if (!S.active) return;
    const now = performance.now();
    const list = S.anims;
    S.anims = [];
    for (const a of list) {
      const k = Math.min(1, (now - a.t0) / a.ms);
      a.fn(k);
      if (k < 1) S.anims.push(a);
      else if (a.done) a.done();
    }
    // 물방울 떨어지기
    for (const d of S.drops) d.y += S.H * 0.02;
    S.drops = S.drops.filter((d) => d.y < groundY() + 10);
    if (S.W) draw();
    const tk = S.token;
    setTimeout(() => { if (S.token === tk) tick(); }, 33);
  }

  // ---------- 2. 심기 ----------
  function onTap(e) {
    if (!S.active || S.busy || S.speaking) return; // 말이 끝난 뒤에 누를 수 있다
    Sound.unlock();
    const r = S.canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (S.step === 'dig' || S.step === 'drop' || S.step === 'cover') return plantStep();
    if (S.step === 'cloud') return tapCloud(x, y);
    if (S.step === 'bugs') return tapBug(x, y);
    if (S.step === 'bee') return tapFlower(x, y);
    if (S.step === 'pick') return tapFruit(x, y);
    if (S.step === 'sun') return tapSun(x, y);
    if (S.step === 'callbee') return callBee();
    if (S.step === 'seeds') return tapSeed(x, y);
    if (S.step === 'pull') return tapCarrot(x);
  }

  function plantStep() {
    S.busy = true;
    Sound.tap();
    if (S.step === 'dig') {
      anim(500, (k) => { S.hole = ease(k); }, () => { S.step = 'drop'; S.busy = false; say('Drop the seed in!'); if (S.demo) demoTap(); });
    } else if (S.step === 'drop') {
      anim(600, (k) => { S.seedIn = k; }, () => { S.step = 'cover'; S.busy = false; say('Cover it with soil!'); if (S.demo) demoTap(); });
    } else {
      anim(500, (k) => { S.covered = k; }, () => {
        S.covered = 1; S.hole = 0;
        S.stageIdx = 1; progress();
        S.step = 'water';
        S.busy = false;
        askWater(S.plan.drops, `The seed needs water. Give it ${S.plan.drops} drops!`);
      });
    }
  }

  // ---------- 물 주기 ----------
  function askWater(n, text) {
    S.dropsWanted = n;
    S.dropsGiven = 0;
    setWater(true);
    say(text);
    if (S.demo) demoWater();
  }

  function water() {
    if (!S.active || S.speaking) return;
    Sound.unlock();
    if (S.rain > 0) { say('No need! The rain is watering it.'); return; }
    if (S.step !== 'water' || S.busy) { Sound.bump(); say("I'm not thirsty now!"); return; }
    Sound.step();
    S.dropsGiven++;
    const xs = S.xs;
    for (const x0 of xs) S.drops.push({ x: x0 * S.W + (Math.random() - 0.5) * 20, y: S.H * 0.2 });
    tag(S.W * 0.5 + 70, groundY() - 40, S.dropsGiven, '#3FA9F5');
    if (S.dropsGiven < S.dropsWanted) return;
    S.busy = true;
    setWater(false);
    later(afterWater, 700);
  }

  function afterWater() {
    if (S.stageIdx === 1) {
      // 싹 틔우기: 뿌리는 아래로, 싹은 위로
      say('Look! Roots grow down into the soil.');
      anim(1600, (k) => { S.rootG = ease(k); }, () => afterSay(() => {
        say('And the sprout grows up!');
        anim(1400, (k) => { S.g = 0.18 * ease(k); }, () => afterSay(nextNeed, 600));
      }, 200));
    } else {
      S.thirsty = false;
      say('Ahh, thank you!');
      afterSay(grew, 700);
    }
  }

  // ---------- 3. 돌보기 사건 ----------
  function nextNeed() {
    S.busy = false;
    if (S.stageIdx < 2) { S.stageIdx = 2; progress(); }
    if (S.needIdx >= S.plan.needs.length) return bloom();
    const need = S.plan.needs[S.needIdx++];
    S.need = need;
    if (need.type === 'thirsty') {
      S.thirsty = true;
      S.step = 'water';
      askWater(need.drops, `The leaves are droopy. I'm thirsty! Give me ${need.drops} drops.`);
    } else if (need.type === 'cloud') {
      S.step = 'wait';
      say('Oh no, a big cloud is hiding the sun!');
      anim(1200, (k) => { S.cloudX = -0.3 + (S.sunX + 0.3) * ease(k); S.pale = k; }, () => afterSay(() => {
        S.step = 'cloud';
        say('Plants need sunlight. Tap the cloud to move it!');
        if (S.demo) demoTapAt(S.cloudX * S.W, S.H * 0.15);
      }, 200));
    } else if (need.type === 'bugs') {
      S.step = 'bugs';
      S.bugs = [];
      for (let i = 0; i < need.n; i++) {
        const t = 0.3 + (i / Math.max(1, need.n - 1)) * 0.6;
        const x0 = S.xs[i % S.xs.length];
        const p = S.plant.type === 'root' ? { x: x0 * S.W + (i % 2 ? 22 : -22), y: groundY() - S.H * 0.1 * S.g - 10 } : stemPt(t, x0);
        S.bugs.push({ x: p.x + (i % 2 ? 26 : -26), y: p.y, dir: i % 2 ? 1 : -1, fly: 0, gone: false });
      }
      S.bugsLeft = need.n;
      say(`Hungry caterpillars are eating the leaves! Tap them away.`);
      if (S.demo) demoBugs();
    } else {
      S.step = 'wait';
      say("It's raining! Rain gives the plant water.");
      anim(3000, (k) => { S.rain = k < 1 ? 1 : 0; }, () => { S.rain = 0; afterSay(grew, 0); });
    }
  }

  function tapCloud(x, y) {
    if (Math.hypot(x - S.cloudX * S.W, y - S.H * 0.15) > S.H * 0.22) return;
    S.busy = true;
    Sound.tap();
    const x0 = S.cloudX;
    anim(900, (k) => { S.cloudX = x0 + (1.5 - x0) * ease(k); S.pale = 1 - k; }, () => {
      S.cloudX = -0.4;
      say('Sunshine! Plants use sunlight to make food.');
      afterSay(grew, 900);
    });
  }

  function tapBug(x, y) {
    const b = S.bugs.find((k) => !k.gone && !k.fly && Math.hypot(k.x - x, k.y - y) < S.H * 0.07);
    if (!b) return;
    Sound.tap();
    const n = S.plan.needs.find((k) => k.type === 'bugs').n - S.bugsLeft + 1;
    tag(b.x, b.y - 30, n, '#3FB97A');
    S.bugsLeft--;
    anim(700, (k) => { b.fly = k; }, () => { b.gone = true; });
    if (S.bugsLeft === 0) {
      S.busy = true;
      later(() => { say('The leaves are safe now. Thank you!'); afterSay(grew, 900); }, 700);
    }
  }

  // 한 사건이 끝나면 조금 자란다
  function grew() {
    S.step = 'wait';
    const g0 = S.g, g1 = Math.min(0.8, 0.18 + 0.2 * S.needIdx);
    Sound.found();
    anim(1100, (k) => { S.g = g0 + (g1 - g0) * ease(k); }, () => later(nextNeed, 500));
  }

  // ---------- 4. 꽃과 열매 ----------
  function bloom() {
    S.stageIdx = 3; progress();
    S.step = 'wait';
    const g0 = S.g;
    anim(1200, (k) => { S.g = g0 + (1 - g0) * ease(k); }, () => {
      const t = S.plant.type;
      if (t === 'fruit') return flowers();
      if (t === 'sunflower') return sunflowerHead();
      return carrotsReady();
    });
  }

  function flowers() {
    const n = S.plan.flowers;
    S.flowers = [];
    for (let i = 0; i < n; i++) {
      const t = 0.42 + 0.5 * (i / Math.max(1, n - 1));
      const p = stemPt(t);
      const side = i % 2 ? 1 : -1;
      const dx = S.W * 0.07 * S.plant.spread * (1 + (i % 3) * 0.25);
      const dy = S.plant.id === 'strawberry' ? S.H * 0.05 : -S.H * 0.01;
      S.flowers.push({ x: p.x + side * dx, y: p.y + dy, from: t, open: 0, pollen: 0, done: false });
    }
    say('Flowers are blooming!');
    anim(900, (k) => { for (const f of S.flowers) f.open = ease(k); }, () => afterSay(() => {
      S.bee = { x: -40, y: S.H * 0.25, flip: false };
      S.flowersLeft = n;
      S.step = 'bee';
      say('Here comes a bee! Tap each flower to help the bee.');
      if (S.demo) demoFlowers();
    }, 200));
  }

  function flyBee(x, y, done) {
    const b = S.bee, x0 = b.x, y0 = b.y;
    b.flip = x < x0;
    anim(650, (k) => { b.x = x0 + (x - x0) * ease(k); b.y = y0 + (y - y0) * ease(k) - Math.sin(Math.PI * k) * 30; }, done);
  }

  function tapFlower(x, y) {
    const f = S.flowers.find((k) => !k.done && Math.hypot(k.x - x, k.y - y) < S.H * 0.07);
    if (!f) return;
    f.done = true;
    S.busy = true;
    Sound.tap();
    flyBee(f.x, f.y - S.H * 0.05, () => {
      Sound.found();
      tag(f.x, f.y - 40, S.plan.flowers - S.flowersLeft + 1, '#F2B33D');
      anim(500, (k) => { f.pollen = 1 - k; });
      S.flowersLeft--;
      S.busy = false;
      if (S.flowersLeft === 0) {
        S.busy = true;
        say('Bees carry pollen from flower to flower. Now the flowers turn into fruit!');
        later(() => flyBee(S.W + 60, S.H * 0.1, () => { S.bee = null; }), 600);
        later(makeFruit, 1500);
      }
    });
  }

  function makeFruit() {
    const ripe = S.plan.ripeFirst;
    S.fruits = S.flowers.map((f, i) => ({ x: f.x, y: f.y + S.H * 0.03, from: f.from, size: 0.3, ripe: 0, ripeLater: i >= ripe, picked: false, wob: 0 }));
    // 익는 순서를 섞는다
    const order = S.rng.shuffle(S.fruits.map((_, i) => i));
    S.fruits.forEach((fr, i) => { fr.ripeLater = order.indexOf(i) >= ripe; });
    anim(800, (k) => { for (const f of S.flowers) f.open = 1 - k; }, () => { for (const f of S.flowers) f.gone = true; });
    anim(1400, (k) => { for (const fr of S.fruits) { fr.size = 0.3 + 0.7 * ease(k); if (!fr.ripeLater) fr.ripe = ease(k); } }, () => afterSay(() => {
      S.stageIdx = 4; progress();
      S.step = 'pick';
      S.busy = false;
      say(`Pick the red ${S.plant.many}! Green ones are not ready yet.`);
      if (S.demo) demoPick();
    }, 200));
  }

  function tapFruit(x, y) {
    const fr = S.fruits.find((k) => !k.picked && Math.hypot(k.x - x, k.y - y) < S.H * 0.07);
    if (!fr) return;
    if (fr.ripe < 1) {
      Sound.bump();
      say('Not yet! It is still green.');
      anim(400, (k) => { fr.wob = Math.sin(k * Math.PI * 4) * 5; });
      return;
    }
    fr.picked = true;
    collect(fr.x, fr.y, S.plant.fruit);
    if (S.fruits.every((k) => k.picked)) return later(done, 900);
    if (S.fruits.filter((k) => !k.picked).every((k) => k.ripe < 1)) {
      S.busy = true;
      later(() => {
        say('Wait… the green ones are turning red!');
        anim(1500, (k) => { for (const f of S.fruits) if (!f.picked) f.ripe = k; }, () => afterSay(() => {
          S.busy = false;
          say(`Now pick the rest!`);
          if (S.demo) demoPick();
        }, 200));
      }, 700);
    }
  }

  // 해바라기: 해를 따라 돈다 → 벌 → 씨앗
  function sunflowerHead() {
    anim(1000, (k) => { S.head = ease(k); }, () => afterSay(() => {
      S.headFlip = 1;
      S.step = 'sun';
      say('Sunflowers turn to face the sun! Tap the sun to move it.');
      if (S.demo) demoTapAt(sunPos().x, sunPos().y);
    }, 200));
  }

  function tapSun(x, y) {
    const p = sunPos();
    if (Math.hypot(x - p.x, y - p.y) > S.H * 0.15) return;
    S.busy = true;
    Sound.tap();
    const x0 = S.sunX, x1 = x0 > 0.5 ? 0.18 : 0.82;
    anim(1400, (k) => { S.sunX = x0 + (x1 - x0) * ease(k); S.lean = (x1 < 0.5 ? -1 : 1) * ease(k) * 0.8; if (k > 0.5) S.headFlip = x1 < 0.5 ? -1 : 1; }, () => {
      say('See? The flower follows the sun!');
      afterSay(() => {
        S.step = 'callbee';
        S.busy = false;
        say('Tap the flower to call a bee!');
        if (S.demo) demoTap();
      }, 1000);
    });
  }

  function callBee() {
    S.busy = true;
    Sound.tap();
    const top = stemPt(1);
    S.bee = { x: -40, y: S.H * 0.2, flip: false };
    flyBee(top.x, top.y - S.H * 0.08, () => {
      say('The bee brings pollen. Now the flower makes seeds!');
      later(() => flyBee(S.W + 60, S.H * 0.1, () => { S.bee = null; }), 500);
      afterSay(() => {
        // 씨앗은 꽃 가운데 갈색 부분에 해바라기처럼 둥글게 (해바라기 무늬: 황금각)
        const c = headCenter();
        const disk = S.H * 0.2 * 0.22;
        const n = S.plan.seeds;
        S.seeds = Array.from({ length: n }, (_, i) => {
          const r = disk * 0.82 * Math.sqrt((i + 0.6) / n), a = i * 2.39996;
          return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, a, picked: false };
        });
        S.stageIdx = 4; progress();
        S.step = 'seeds';
        S.busy = false;
        say('Tap the seeds to collect them!');
        if (S.demo) demoSeeds();
      }, 1200);
    });
  }

  function tapSeed(x, y) {
    const s = S.seeds.find((k) => !k.picked && Math.hypot(k.x - x, k.y - y) < S.H * 0.06);
    if (!s) return;
    s.picked = true;
    collect(s.x, s.y, null);
    if (S.seeds.every((k) => k.picked)) later(done, 900);
  }

  // 당근: 땅속에서 자란 당근 뽑기
  function carrotsReady() {
    S.carrots = S.xs.map((x) => ({ x, size: 0, pulled: false, lift: 0 }));
    anim(1300, (k) => { for (const c of S.carrots) c.size = 0.4 + 0.6 * ease(k); }, () => afterSay(() => {
      S.stageIdx = 4; progress();
      S.step = 'pull';
      say('Look! Carrots grow underground. Tap a carrot top to pull it up!');
      if (S.demo) demoCarrots();
    }, 200));
  }

  function tapCarrot(x) {
    const c = S.carrots.find((k) => !k.pulled && !k.lifting && Math.abs(k.x * S.W - x) < S.W * 0.08);
    if (!c) return;
    c.lifting = true;
    Sound.tap();
    anim(700, (k) => { c.lift = ease(k) * S.H * 0.3; }, () => {
      c.pulled = true;
      collect(c.x * S.W, groundY() - S.H * 0.2, 'carrot');
      if (S.carrots.every((k) => k.pulled)) later(done, 900);
    });
  }

  // 바구니로 날아가며 세기
  function collect(x, y, kind) {
    S.count++;
    Sound.found();
    tag(x, y - 40, S.count, '#FF8A3D');
    $('grow-count').textContent = S.count;
    const body = $('screen-grow').getBoundingClientRect();
    const cr = S.canvas.getBoundingClientRect();
    const br = $('grow-basket').getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'grow-fly';
    f.innerHTML = kind ? `<img src="assets/words/${kind}.svg" alt="">` : '<span class="seed-dot"></span>';
    $('screen-grow').appendChild(f);
    const a = { x: cr.left - body.left + x, y: cr.top - body.top + y };
    const b = { x: br.left - body.left + br.width / 2, y: br.top - body.top + br.height / 2 };
    const t0 = performance.now(), tk = S.token;
    const step = () => {
      if (S.token !== tk) return f.remove();
      const k = Math.min(1, (performance.now() - t0) / 650);
      f.style.transform = `translate(${a.x + (b.x - a.x) * k - 22}px, ${a.y + (b.y - a.y) * k - 22 - Math.sin(Math.PI * k) * 80}px)`;
      if (k < 1) setTimeout(step, 16);
      else { f.remove(); $('grow-basket').classList.remove('pop'); void $('grow-basket').offsetWidth; $('grow-basket').classList.add('pop'); }
    };
    step();
  }

  // ---------- 5. 끝: 한살이 ----------
  function done() {
    S.step = 'end';
    S.stageIdx = 5; progress();
    const p = S.plant, n = S.count;
    say(`You grew ${n} ${n === 1 ? p.one : p.many}!`);
    afterSay(showCycle, 1200);
  }

  function showCycle() {
    const p = S.plant;
    const last = p.type === 'root' ? { img: 'carrot', label: 'Carrot' } : p.type === 'sunflower' ? { img: 'sunflower', label: 'Flower & seeds' } : { img: p.fruit, label: 'Fruit' };
    const steps = [
      { html: '<span class="seed-dot big"></span>', label: 'Seed' },
      { html: '<span class="sprout">🌱</span>', label: 'Sprout' },
      { html: '<span class="sprout">🌿</span>', label: 'Leaves' },
      p.type === 'fruit' ? { html: '<span class="sprout">🌸</span>', label: 'Flower' } : null,
      { html: `<img src="assets/words/${last.img}.svg" alt="">`, label: last.label },
    ].filter(Boolean);
    const box = $('grow-cycle');
    const r = 38;
    box.innerHTML = '<p class="cycle-title">The life cycle</p><div class="cycle-ring">' + steps.map((s, i) => {
      const a = -Math.PI / 2 + (i / steps.length) * Math.PI * 2;
      return `<div class="cycle-step" style="left:${50 + Math.cos(a) * r}%;top:${50 + Math.sin(a) * r}%">${s.html}<span>${s.label}</span></div>`;
    }).join('') + '<div class="cycle-mid">↻</div></div><p class="cycle-note">' +
      (p.type === 'root' ? 'Carrots make seeds in their second year!' : 'New seeds grow new plants!') + '</p>';
    box.classList.remove('hidden');
    const items = box.querySelectorAll('.cycle-step');
    items.forEach((el, i) => later(() => { el.classList.add('on'); Sound.step(); }, 400 + i * 600));
    const words = steps.map((s) => s.label).join(', ');
    later(() => say('The life cycle', `${words}… and seeds grow again!`), 300);
    afterSay(() => S.onEnd('grow', 0), 400 + steps.length * 600 + 1200);
  }

  // ---------- 자가 점검용 자동 진행 ----------
  function canvasClick(x, y) {
    if (S.speaking) return later(() => canvasClick(x, y), 300);
    const r = S.canvas.getBoundingClientRect();
    S.canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + x, clientY: r.top + y, bubbles: true }));
  }
  const demoTap = () => later(() => canvasClick(S.W * 0.5, groundY()), 700);
  const demoTapAt = (x, y) => later(() => canvasClick(x, y), 700);
  function demoWater() {
    let i = 0;
    const go = () => { if (S.speaking) return later(go, 300); if (i++ < S.dropsWanted) { $('grow-water').click(); later(go, 350); } };
    later(go, 700);
  }
  function demoSeq(list, fn) {
    let i = 0;
    const go = () => { if (i < list.length && S.active) { fn(list[i++]); later(go, 900); } };
    later(go, 700);
  }
  const demoBugs = () => demoSeq(S.bugs.slice(), (b) => canvasClick(b.x, b.y));
  const demoFlowers = () => demoSeq(S.flowers.slice(), (f) => canvasClick(f.x, f.y));
  function demoPick() {
    const green = S.fruits.find((k) => !k.picked && k.ripe < 1);
    const ripe = S.fruits.filter((k) => !k.picked && k.ripe >= 1);
    demoSeq(green && !S.triedGreen ? [green, ...ripe] : ripe, (fr) => { if (fr.ripe < 1) S.triedGreen = true; canvasClick(fr.x, fr.y); });
  }
  const demoSeeds = () => demoSeq(S.seeds.slice(), (s) => canvasClick(s.x, s.y));
  const demoCarrots = () => demoSeq(S.carrots.slice(), (c) => canvasClick(c.x * S.W, groundY() - 20));

  root.GrowGame = { init, start, stop };
})(typeof self !== 'undefined' ? self : this);
