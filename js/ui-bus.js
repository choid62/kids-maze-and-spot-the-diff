// 버스 정류장 화면: 버스에 동물 친구들이 타고(덧셈) 내린(뺄셈) 뒤, 버스가 터널에 들어가면 지금 몇 마리인지 고른다.
// 장면(world)은 화면 3개 너비: [정류장][터널][터널 밖]. 버스가 달리면 장면이 함께 옆으로 움직인다.
(function (root) {
  const RIDERS = ['cat', 'dog', 'pig', 'rabbit_face', 'panda', 'koala', 'lion', 'penguin', 'chicken', 'fox', 'monkey', 'teddy_bear', 'cow', 'duck'];
  const SEATS = 10;
  const S = {
    level: 1, qi: 0, firstTry: 0, q: null, tries: 0, seats: [], busX: 0, worldX: 0,
    token: {}, timers: [], onEnd: null, active: false, busy: false, rng: null, L: null,
  };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { const tk = S.token; S.timers.push(setTimeout(() => { if (S.token === tk) f(); }, ms)); };

  // ms 동안 step(0~1) 을 부르고 끝나면 done (setTimeout 으로 움직여 어느 기기에서나 같은 속도)
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
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  function init(onEnd) {
    S.onEnd = onEnd;
    const bus = $('bus-bus');
    const win = bus.querySelector('.windows');
    for (let i = 0; i < SEATS; i++) {
      const s = document.createElement('div');
      s.className = 'seat';
      s.innerHTML = '<canvas></canvas><span class="tag"></span>';
      win.appendChild(s);
    }
    $('bus-choices').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b && !b.disabled) answer(+b.dataset.n, b);
    });
    $('bus-new').addEventListener('click', () => { Sound.tap(); start({}); });
    root.addEventListener('resize', () => { if (S.active) { layout(); place(); } });
  }

  function start(opts) {
    opts = opts || {};
    stop();
    S.active = true;
    S.level = Core.clamp(opts.level || Store.get('busLevel') || 1, 1, Numbers.BUS_MAX_LEVEL);
    S.rng = Core.makeRng(opts.seed != null ? opts.seed : Core.newSeed());
    S.qi = 0;
    S.firstTry = 0;
    $('bus-level').textContent = `Level ${S.level} · ${Core.levelName(S.level)} ▾`;
    S.demo = opts.demo === 'busplay';
    layout();
    question();
  }

  function stop() {
    S.active = false;
    S.token = {};
    S.timers.forEach(clearTimeout);
    S.timers = [];
    document.querySelectorAll('#bus-world .flyer').forEach((f) => f.remove());
  }

  // ---------- 자리 계산 ----------
  function layout() {
    const scene = $('bus-scene');
    const W = scene.clientWidth, H = scene.clientHeight;
    const bw = Math.min(W * 0.62, H * 1.15);
    const bh = bw * 0.56;
    const L = { W, H, bw, bh, roadY: H * 0.74, size: Math.min(bw * 0.13, H * 0.16) };
    L.busTop = L.roadY - bh;
    L.stopX = W * 0.46 - bw / 2;
    L.tunnelX = W + (W - bw) / 2;
    L.exitX = 2 * W + (W - bw) / 2;
    L.walkY = H * 0.9;
    S.L = L;
    const world = $('bus-world');
    world.style.width = W * 3 + 'px';
    const bus = $('bus-bus');
    bus.style.width = bw + 'px';
    bus.style.height = bh + 'px';
    bus.style.top = L.busTop + 'px';
    const tunnel = $('bus-tunnel');
    tunnel.style.width = bw * 1.22 + 'px';
    tunnel.style.height = bh * 1.32 + 'px';
    tunnel.style.left = W * 1.5 - bw * 0.61 + 'px';
    tunnel.style.top = L.roadY - bh * 1.32 + bh * 0.08 + 'px';
    $('bus-sign').style.left = Math.min(L.stopX + bw + W * 0.03, W - 60) + 'px';
    $('bus-sign').style.top = L.roadY - H * 0.2 + 'px';
    document.querySelectorAll('#bus-bus .seat canvas').forEach((c) => { c.dataset.kind = ''; });
    drawSeats();
  }

  function place() {
    $('bus-bus').style.transform = `translateX(${S.busX}px)`;
    $('bus-world').style.transform = `translateX(${-S.worldX}px)`;
  }

  function drawAnimal(canvas, kind, size) {
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    canvas.width = canvas.height = Math.round(size * dpr);
    canvas.style.width = canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (kind) Draw.object(ctx, kind, size / 2, size / 2, size * 0.92);
  }

  function drawSeats() {
    document.querySelectorAll('#bus-bus .seat').forEach((s, i) => {
      const kind = S.seats[i] || '';
      const c = s.querySelector('canvas');
      const size = Math.floor(Math.min(s.clientWidth, s.clientHeight) * 0.92);
      if (c.dataset.kind !== kind || c.dataset.size !== String(size)) {
        drawAnimal(c, kind, size);
        c.dataset.kind = kind;
        c.dataset.size = size;
      }
    });
  }

  // 요소 가운데의 장면(world) 좌표
  function worldPos(el) {
    const w = $('bus-world').getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - w.left + r.width / 2, y: r.top - w.top + r.height / 2 };
  }

  function flyer(kind, x, y) {
    const f = document.createElement('div');
    f.className = 'flyer';
    const c = document.createElement('canvas');
    f.appendChild(c);
    drawAnimal(c, kind, S.L.size);
    $('bus-world').appendChild(f);
    moveFlyer(f, x, y);
    return f;
  }
  const moveFlyer = (f, x, y) => { f.style.transform = `translate(${x - S.L.size / 2}px, ${y - S.L.size / 2}px)`; };

  // ---------- 한 문제 ----------
  function caption(text, speak) {
    const el = $('bus-caption');
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    if (speak) Sound.say(speak === true ? text : speak);
  }

  function badge(text, cls) {
    const b = $('bus-badge');
    b.textContent = text;
    b.className = 'bus-badge' + (text ? ' show ' + cls : '');
  }

  function question() {
    S.q = Numbers.busQuestion(S.level, S.rng);
    S.tries = 0;
    S.busy = true;
    $('bus-dots').innerHTML = Array.from({ length: Numbers.ROUND }, (_, i) => `<span class="dot${i < S.qi ? ' on' : ''}"></span>`).join('');
    $('bus-choices').innerHTML = '';
    $('bus-eq').textContent = '';
    $('bus-eq').classList.remove('show');
    badge('');
    document.querySelectorAll('#bus-bus .seat .tag').forEach((t) => { t.textContent = ''; });
    // 처음 탄 친구들
    S.pool = S.rng.shuffle(RIDERS.slice());
    S.seats = Array(SEATS).fill(null);
    for (let i = 0; i < S.q.start; i++) S.seats[i] = nextRider();
    drawSeats();
    // 버스가 왼쪽에서 들어와 정류장에 선다
    S.worldX = 0;
    S.busX = -S.L.bw - 30;
    place();
    caption('Here comes the bus!');
    anim(1300, (k) => { S.busX = -S.L.bw - 30 + (S.L.stopX + S.L.bw + 30) * easeOut(k); place(); }, () => {
      const n = S.q.start;
      caption(`${n} ${n === 1 ? 'friend is' : 'friends are'} on the bus.`, true);
      showEq(0);
      later(() => runEvent(0), 1900);
    });
  }

  // 아래 식: 처음 수 → 정류장마다 + / − 가 붙고, 터널에서는 "= ?", 답을 맞히면 "= 4"
  function showEq(upto, end) {
    const q = S.q;
    let h = `<span class="t">${q.start}</span>`;
    q.events.slice(0, upto).forEach((e) => {
      h += `<span class="op ${e > 0 ? 'plus' : 'minus'}">${e > 0 ? '+' : '−'}</span><span class="t ${e > 0 ? 'plus' : 'minus'}">${Math.abs(e)}</span>`;
    });
    if (end != null) h += `<span class="op">=</span><span class="t ans${end === '?' ? ' q' : ''}">${end}</span>`;
    const el = $('bus-eq');
    el.innerHTML = h;
    el.classList.add('show');
    const last = el.lastElementChild;
    if (last) last.classList.add('new');
  }

  function nextRider() {
    if (!S.pool.length) S.pool = S.rng.shuffle(RIDERS.slice());
    return S.pool.pop();
  }

  function runEvent(i) {
    if (i >= S.q.events.length) return toTunnel();
    const e = S.q.events[i];
    const k = Math.abs(e);
    const L = S.L;
    showEq(i + 1);
    if (e > 0) {
      caption(`${k} more ${k === 1 ? 'friend gets' : 'friends get'} on!`, true);
      badge('+' + k, 'plus');
      // 기다리는 친구들이 인도에 나타난다
      const door = L.stopX + L.bw * 0.7;
      const waiting = [];
      for (let j = 0; j < k; j++) {
        const kind = nextRider();
        const f = flyer(kind, door + (j + 0.6) * L.size * 1.15, L.walkY);
        f.classList.add('appear');
        waiting.push({ f, kind });
      }
      const hop = (j) => {
        if (j >= waiting.length) return later(() => { badge(''); runEvent(i + 1); }, 900);
        const seatIdx = S.seats.indexOf(null);
        const seat = document.querySelectorAll('#bus-bus .seat')[seatIdx];
        const from = { x: door + (j + 0.6) * L.size * 1.15, y: L.walkY };
        const to = worldPos(seat);
        const w = waiting[j];
        w.f.insertAdjacentHTML('beforeend', `<span class="hop-tag">${j + 1}</span>`);
        Sound.step();
        anim(650, (t) => moveFlyer(w.f, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * L.size * 1.2), () => {
          w.f.remove();
          S.seats[seatIdx] = w.kind;
          drawSeats();
          later(() => hop(j + 1), 250);
        });
      };
      later(() => hop(0), 900);
    } else {
      caption(`${k} ${k === 1 ? 'friend gets' : 'friends get'} off.`, true);
      badge('−' + k, 'minus');
      const seats = document.querySelectorAll('#bus-bus .seat');
      const hop = (j) => {
        if (j >= k) return later(() => { badge(''); runEvent(i + 1); }, 900);
        let idx = -1;
        for (let s = SEATS - 1; s >= 0; s--) if (S.seats[s]) { idx = s; break; }
        const kind = S.seats[idx];
        const from = worldPos(seats[idx]);
        S.seats[idx] = null;
        drawSeats();
        const f = flyer(kind, from.x, from.y);
        f.insertAdjacentHTML('beforeend', `<span class="hop-tag minus">${j + 1}</span>`);
        const to = { x: L.stopX + L.bw * 0.75 + j * L.size * 0.4, y: L.walkY };
        Sound.step();
        anim(650, (t) => moveFlyer(f, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * L.size), () => {
          // 손 흔들며 걸어서 떠난다
          anim(1100, (t) => { moveFlyer(f, to.x + t * L.W * 0.5, to.y); f.style.opacity = String(1 - t); }, () => f.remove());
          later(() => hop(j + 1), 350);
        });
      };
      later(() => hop(0), 900);
    }
  }

  function toTunnel() {
    caption('Into the tunnel!', true);
    const L = S.L;
    const x0 = S.busX;
    anim(1800, (k) => {
      const e = easeInOut(k);
      S.busX = x0 + (L.tunnelX - x0) * e;
      S.worldX = L.W * e;
      place();
    }, () => {
      caption('How many friends are on the bus now?', true);
      showEq(S.q.events.length, '?');
      const box = $('bus-choices');
      box.innerHTML = Numbers.choices(S.q.answer, S.rng, 1, 10).map((n) => `<button class="num-btn" data-n="${n}">${n}</button>`).join('');
      S.busy = false;
      if (S.demo) demoAnswer();
    });
  }

  function answer(n, btn) {
    if (S.busy) return;
    Sound.unlock();
    if (n === S.q.answer) {
      Sound.found();
      btn.classList.add('right');
      if (S.tries === 0) S.firstTry++;
      reveal();
    } else {
      S.tries++;
      Sound.miss();
      btn.disabled = true;
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake', 'wrong');
      if (S.tries >= 2) reveal();
    }
  }

  // 버스가 터널을 나와 친구들을 하나씩 세고, 식을 보여 준다
  function reveal() {
    S.busy = true;
    $('bus-choices').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const L = S.L;
    const x0 = S.busX, w0 = S.worldX;
    caption("Let's count!");
    anim(1500, (k) => {
      const e = easeInOut(k);
      S.busX = x0 + (L.exitX - x0) * e;
      S.worldX = w0 + (2 * L.W - w0) * e;
      place();
    }, () => {
      const tags = document.querySelectorAll('#bus-bus .seat .tag');
      const filled = S.seats.map((k, i) => (k ? i : -1)).filter((i) => i >= 0);
      filled.forEach((i, j) => later(() => { tags[i].textContent = j + 1; Sound.step(); }, j * 380));
      later(() => {
        const n = S.q.answer;
        showEq(S.q.events.length, n);
        caption(`${n} ${n === 1 ? 'friend' : 'friends'}!`, true);
        later(next, 2400);
      }, filled.length * 380 + 300);
    });
  }

  function next() {
    S.qi++;
    if (S.qi < Numbers.ROUND) return question();
    let newLevel = 0;
    if (S.firstTry >= 4 && S.level < Numbers.BUS_MAX_LEVEL) {
      newLevel = S.level + 1;
      Store.set('busLevel', newLevel);
    }
    S.onEnd('bus', newLevel);
  }

  // 자가 점검용: 문제마다 처음엔 틀린 수를 한 번 누르고 그다음 정답
  function demoAnswer() {
    later(() => {
      const btns = Array.from(document.querySelectorAll('#bus-choices button'));
      const wrong = btns.find((b) => +b.dataset.n !== S.q.answer);
      if (S.qi % 2 && wrong) wrong.click();
      later(() => { const r = btns.find((b) => +b.dataset.n === S.q.answer); if (r && !S.busy) r.click(); }, 500);
    }, 400);
  }

  root.BusGame = { init, start, stop, MAX_LEVEL: Numbers.BUS_MAX_LEVEL };
})(typeof self !== 'undefined' ? self : this);
