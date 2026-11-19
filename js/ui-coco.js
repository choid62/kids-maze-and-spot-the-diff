// 코코넛 크랙 놀이 화면: 1:1 또는 1:1:1(나 + 컴퓨터 2명). 컴퓨터 난이도 쉬움/보통/어려움.
// 코코넛은 큰 원 위에 시계 방향 순서대로 놓이고, 모두 원의 가운데를 바라본다.
// 시작 고르기: 내 코코넛을 누르고 → 같은 코코넛을 한 번 더 누르면 거기서부터, 바로 다음 코코넛을 누르면 그 옆에서부터 센다.
(function (root) {
  const LEVEL_NAMES = ['', '쉬움', '보통', '어려움'];
  const WORDS = ['Coco', 'nut', 'Coco', 'nut', 'Coco', 'nut', 'Crack!'];
  const BEAT_MS = 450; // 한 박자
  const MAX_ROUNDS = 80; // 합치기 때문에 끝없이 이어질 수 있어 이만큼 걸리면 비김
  const BOTS = ['robot', 'monkey'];
  const ME = 'rabbit_face';
  const DEG = Math.PI / 180;

  const S = { size: 2, g: null, timers: [], busy: false, over: false, firstCounter: 0, selected: null, onEnd: null };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };

  function init(onEnd) {
    S.onEnd = onEnd;
    $('coco-mode').addEventListener('click', showMenu);
    $('coco-new').addEventListener('click', () => { Sound.tap(); restart(); });
    $('coco-1v1').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame(2); });
    $('coco-3p').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame(3); });
    document.querySelectorAll('#coco-levels button').forEach((b) => b.addEventListener('click', () => {
      Store.set('cocoLevel', +b.dataset.lv);
      Sound.tap();
      renderMenu();
    }));
    $('coco-merge').addEventListener('click', onMerge);
    $('coco-table').addEventListener('click', (e) => {
      const el = e.target.closest('.nut');
      if (el) onNut(+el.dataset.i);
    });
    root.addEventListener('resize', () => { if (S.g && !$('coco-board').classList.contains('hidden')) render(); });
  }

  function enter(opts) {
    opts = opts || {};
    if (opts.demo === 'cocomerge' || opts.demo === 'cocomergeplay') {
      // 점검용: 내 코코넛이 우유 쏟은 반쪽 두 개인 상태에서 내 차례로 시작
      startGame(3);
      stop();
      S.g.players[0].units = ['spilled', 'spilled'];
      S.g.players[1].units = ['half', 'spilled'];
      S.g.counter = 0;
      S.busy = true;
      later(nextTurn, 300);
      if (opts.demo === 'cocomergeplay') autoPlay();
      return;
    }
    if (opts.demo === 'coco2' || opts.demo === 'coco3') {
      startGame(opts.demo === 'coco2' ? 2 : 3);
      return autoPlay();
    }
    showMenu();
  }

  function stop() {
    S.timers.forEach(clearTimeout);
    S.timers = [];
    S.busy = false;
    S.token = {}; // 진행 중이던 세기는 무시
  }

  function showMenu() {
    stop();
    $('coco-menu').classList.remove('hidden');
    $('coco-board').classList.add('hidden');
    $('coco-mode').textContent = '코코넛 크랙';
    renderMenu();
  }

  function renderMenu() {
    const lv = Store.get('cocoLevel') || 1;
    document.querySelectorAll('#coco-levels button').forEach((b) => b.classList.toggle('on', +b.dataset.lv === lv));
  }

  function startGame(size) {
    stop();
    S.size = size;
    S.firstCounter = 0;
    $('coco-menu').classList.add('hidden');
    $('coco-board').classList.remove('hidden');
    $('coco-mode').textContent = `${size === 2 ? '1:1' : '1:1:1'} · ${LEVEL_NAMES[Store.get('cocoLevel') || 1]} ▾`;
    newRound();
  }

  // 같은 모드로 새 판 (처음 세는 사람을 돌아가며)
  function restart() {
    stop();
    S.firstCounter = (S.firstCounter + 1) % S.size;
    newRound();
  }

  function newRound() {
    S.g = Coconut.newGame(S.size);
    S.g.counter = S.firstCounter;
    S.over = false;
    S.busy = true;
    S.selected = null;
    S.rounds = 0;
    $('coco-merge').classList.add('hidden');
    render();
    later(nextTurn, 700);
  }

  // ---------- 그리기 ----------
  const seatKind = (p) => (p === 0 ? ME : BOTS[(p - 1) % BOTS.length]);
  // 자리 각도: 화면 아래(90°)에서 시작해 시계 방향 (화면 좌표는 y가 아래로 커져서 각도가 커지면 시계 방향)
  const seatAngle = (p) => 90 + (p * 360) / S.size;

  // 원 위의 코코넛 위치: 한 사람의 코코넛은 자리 각도 둘레에 시계 방향 순서로
  function layout() {
    const g = S.g;
    const box = $('coco-table').getBoundingClientRect();
    const cx = box.width / 2, cy = box.height / 2;
    const R = Math.min(box.width, box.height) * (S.size === 2 ? 0.3 : 0.3);
    const nut = Math.min(box.width, box.height) * (S.size === 2 ? 0.22 : 0.18);
    const spread = S.size === 2 ? 22 : 17; // 두 반쪽 사이 각도의 절반
    const list = Coconut.order(g).map((t) => {
      const n = g.players[t.p].units.length;
      const a = seatAngle(t.p) + (n === 2 ? (t.u === 0 ? -spread : spread) : 0);
      return Object.assign({ a, x: cx + R * Math.cos(a * DEG), y: cy + R * Math.sin(a * DEG) }, t);
    });
    return { cx, cy, R, nut, list };
  }

  // 코코넛 그림 (위쪽이 원의 가운데를 바라보도록 돌려서 배치)
  const WHOLE_NUT = '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<ellipse cx="50" cy="54" rx="40" ry="38" fill="#8B5A2B" stroke="#5E3A17" stroke-width="3"/>' +
    '<path d="M22 40 Q30 30 40 34 M60 30 Q72 30 78 42 M20 62 Q26 72 36 70 M66 76 Q76 72 80 62 M44 84 Q50 88 58 84" stroke="#6B4320" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="26" r="5" fill="#4A2C10"/><circle cx="56" cy="24" r="5" fill="#4A2C10"/><circle cx="48" cy="36" r="5" fill="#4A2C10"/>' +
    '<ellipse cx="34" cy="48" rx="8" ry="5" fill="#A9773F" opacity="0.6" transform="rotate(-30 34 48)"/></svg>';

  // Fluent 코코넛의 회색 속살을 바꿔 칠한다: 갈라진 반쪽은 하얀 속살, 우유가 쏟아진 반쪽은 빈 껍질
  const FRESH = { recolor: { '#D3D3D3': '#FFFFFF', '#9B9B9B': '#FFF6E6' } };
  const EMPTY = { recolor: { '#D3D3D3': '#E9D3B6', '#9B9B9B': '#B98A5E' } };

  function drawNut(c, stage, size) {
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (stage === 'half') {
      Draw.object(ctx, 'coconut', size / 2, size / 2, size * 0.92, null, false, FRESH);
    } else {
      // 우유가 쏟아진 반쪽: 하얀 우유 웅덩이 위에 엎어진 반쪽
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E2D8CC';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(size / 2, size * 0.7, size * 0.42, size * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (const [dx, dy, r] of [[-0.3, 0.52, 0.05], [0.33, 0.55, 0.04], [0.05, 0.86, 0.035]]) {
        ctx.beginPath();
        ctx.arc(size / 2 + dx * size, dy * size, r * size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(size / 2, size * 0.45);
      ctx.rotate(2.6);
      Draw.object(ctx, 'coconut', 0, 0, size * 0.62, null, false, EMPTY);
      ctx.restore();
    }
  }

  function render() {
    const g = S.g;
    const table = $('coco-table');
    const L = layout();
    // 코코넛
    table.querySelectorAll('.nut, .seat').forEach((el) => el.remove());
    const valid = isMyChoice() ? validTaps() : new Set();
    L.list.forEach((t, i) => {
      const el = document.createElement('div');
      const stage = g.players[t.p].units[t.u];
      el.className = 'nut ' + stage + (S.selected === i ? ' selected' : '') + (valid.has(i) ? ' can' : '');
      el.dataset.i = i;
      el.style.width = el.style.height = L.nut + 'px';
      el.style.left = t.x - L.nut / 2 + 'px';
      el.style.top = t.y - L.nut / 2 + 'px';
      el.style.transform = `rotate(${t.a - 90}deg)`;
      if (stage === 'whole') el.innerHTML = WHOLE_NUT;
      else { const c = document.createElement('canvas'); el.appendChild(c); drawNut(c, stage, L.nut); }
      table.appendChild(el);
    });
    // 얼굴: 원 바깥, 자리 각도 방향
    const far = L.R + L.nut * 0.95;
    for (let p = 0; p < S.size; p++) {
      const a = seatAngle(p) * DEG;
      const el = document.createElement('div');
      const gone = g.players[p].units.length === 0;
      el.className = 'seat' + (!S.over && g.counter === p ? ' counter' : '') + (gone ? ' gone' : '');
      el.style.left = L.cx + far * Math.cos(a) + 'px';
      el.style.top = L.cy + far * Math.sin(a) + 'px';
      el.innerHTML = '<canvas></canvas><span class="pointer">👆</span>' + (gone ? '<span class="out-label">탈락</span>' : '');
      table.appendChild(el);
      const c = el.querySelector('canvas');
      const dpr = Math.min(root.devicePixelRatio || 1, 3);
      c.width = c.height = 52 * dpr;
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Draw.object(ctx, seatKind(p), 26, 26, 48);
    }
  }

  const nutEl = (i) => document.querySelector(`#coco-table .nut[data-i="${i}"]`);

  function say(text, big) {
    const el = $('coco-word');
    el.textContent = text;
    el.classList.toggle('big', !!big);
  }

  // ---------- 차례 ----------
  const isMyChoice = () => !S.over && !S.busy && S.g.counter === 0;

  function nextTurn() {
    if (S.over) return;
    const g = S.g;
    const w = Coconut.winner(g);
    if (w >= 0) return finish(w);
    S.selected = null;
    const c = g.counter;
    if (c === 0) {
      S.busy = false;
      const canMerge = Coconut.canMerge(g, 0);
      $('coco-merge').classList.toggle('hidden', !canMerge);
      say(canMerge ? '합칠 수 있어요!' : '내 코코넛을 골라요');
      render();
    } else {
      S.busy = true;
      render();
      // 컴퓨터는 합칠 수 있으면 먼저 합친다
      const merged = Coconut.merge(g, c);
      if (merged) {
        render();
        popSeat(c);
        Sound.found();
        say('합쳤다!');
      } else say('생각하는 중…');
      later(() => {
        const start = Coconut.cpuChoice(g, c, Store.get('cocoLevel') || 1, 0);
        // 어느 코코넛으로 시작하는지 보여 준다: 자기 코코넛을 고르고, 시작점을 짚는다
        const list = Coconut.order(g);
        const own = list[start].p === c ? start : (start - 1 + list.length) % list.length;
        S.selected = own;
        render();
        say(own === start ? '여기서부터!' : '옆에서부터!');
        later(() => count(start), 900);
      }, merged ? 1300 : 900);
    }
  }

  // 우유 쏟은 반쪽 두 개를 통 코코넛 하나로
  function onMerge() {
    if (!isMyChoice() || !Coconut.merge(S.g, 0)) return;
    Sound.unlock();
    Sound.found();
    S.selected = null;
    $('coco-merge').classList.add('hidden');
    render();
    popSeat(0);
    say('합쳤다! 내 코코넛을 골라요');
  }

  // 그 사람의 코코넛을 반짝
  function popSeat(p) {
    Coconut.order(S.g).forEach((t, i) => { if (t.p === p && nutEl(i)) nutEl(i).classList.add('pop'); });
  }

  // 지금 누를 수 있는 코코넛: 아무것도 안 골랐으면 내 코코넛들, 골랐으면 그 코코넛과 바로 다음 코코넛
  function validTaps() {
    const list = Coconut.order(S.g);
    const mine = list.map((x, i) => (x.p === 0 ? i : -1)).filter((i) => i >= 0);
    if (S.selected == null) return new Set(mine);
    return new Set([...mine, (S.selected + 1) % list.length]);
  }

  function onNut(i) {
    if (!isMyChoice()) return;
    Sound.unlock();
    const list = Coconut.order(S.g);
    const mineAt = list[i].p === 0;
    if (S.selected == null) {
      if (!mineAt) return shake(i);
      S.selected = i;
      Sound.tap();
      say('한 번 더, 또는 옆을 눌러요');
      return render();
    }
    const next = (S.selected + 1) % list.length;
    if (i === S.selected || i === next) {
      S.busy = true;
      $('coco-merge').classList.add('hidden');
      Sound.tap();
      render();
      return count(i);
    }
    if (mineAt) {
      // 다른 내 코코넛으로 바꿔 고르기
      S.selected = i;
      Sound.tap();
      return render();
    }
    shake(i);
  }

  function shake(i) {
    const el = nutEl(i);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    Sound.miss();
  }

  // 7박자 세기: 박자마다 한 칸씩 옮기고, 7번째(Crack!)에 걸린 코코넛이 바뀐다
  function count(start) {
    const g = S.g;
    const list = Coconut.order(g);
    const N = Coconut.BEATS;
    const token = (S.token = {});
    for (let k = 0; k < N; k++) {
      later(() => {
        if (S.token !== token) return;
        document.querySelectorAll('#coco-table .nut.beat').forEach((el) => el.classList.remove('beat'));
        const el = nutEl((start + k) % list.length);
        if (el) { void el.offsetWidth; el.classList.add('beat'); }
        say(WORDS[k], k === N - 1);
        if (k === N - 1) Sound.bump(); else Sound.step();
      }, k * BEAT_MS);
    }
    later(() => { if (S.token === token) applyHit(); }, N * BEAT_MS + 250);

    function applyHit() {
      const t = Coconut.target(g, start);
      const what = Coconut.hit(g, t);
      S.selected = null;
      render();
      const msg = { crack: '쩍! 코코넛이 갈라졌어요', spill: '앗, 코코넛 우유가 쏟아졌어요', gone: '코코넛이 사라졌어요', out: '탈락!' }[what];
      say(msg);
      if (what === 'crack') Sound.found();
      // 갈라진 경우 두 반쪽 모두 반짝
      const idx = Coconut.indexOf(g, t);
      if (idx >= 0 && nutEl(idx)) nutEl(idx).classList.add('pop');
      if (idx >= 0 && what === 'crack' && nutEl(idx + 1)) nutEl(idx + 1).classList.add('pop');
      if (S.size > 2 && t.p === 0 && what === 'out') return later(() => finish(-1), 900); // 내가 탈락
      if (++S.rounds >= MAX_ROUNDS && Coconut.winner(g) < 0) return later(() => finish(-2), 900); // 너무 길어지면 비김
      later(nextTurn, 1300);
    }
  }

  function finish(w) {
    S.over = true;
    S.busy = false;
    render();
    $('coco-merge').classList.add('hidden');
    say(w === 0 ? '내가 이겼다!' : w === -2 ? '비겼어요!' : '아쉽다!');
    const result = w === 0 ? {} : w === -2 ? { text: '비겼어요!', noSticker: true, sad: true } : { text: '아쉽다! 다시 해 볼까?', noSticker: true, sad: true };
    later(() => S.onEnd('coco', 0, result), 900);
  }

  // 자가 점검용: 내 차례마다 실제 코코넛을 눌러 한 판을 끝까지 한다 (고르기 → 같은 것 또는 옆 것)
  function autoPlay() {
    const tick = () => {
      if (S.over) return;
      if (isMyChoice() && Coconut.canMerge(S.g, 0)) $('coco-merge').click();
      if (isMyChoice()) {
        const list = Coconut.order(S.g);
        const mine = list.map((x, i) => (x.p === 0 ? i : -1)).filter((i) => i >= 0);
        const pickMine = mine[Math.floor(Math.random() * mine.length)];
        nutEl(pickMine).click();
        const second = Math.random() < 0.5 ? pickMine : (pickMine + 1) % list.length;
        nutEl(second).click();
      }
      setTimeout(tick, 500);
    };
    setTimeout(tick, 500);
  }

  root.CocoGame = { init, enter, stop, restart };
})(typeof self !== 'undefined' ? self : this);
