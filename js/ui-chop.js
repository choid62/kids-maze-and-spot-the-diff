// 젓가락 놀이 화면: 로봇이랑(쉬움/보통/어려움) 또는 둘이서(한 폰으로 마주 보고).
// 아래쪽 = 사람(0번), 위쪽 = 로봇 또는 다른 사람(1번).
(function (root) {
  const SKILL = [0, 0.3, 0.7, 1]; // 로봇이 최선의 수를 고를 확률 (쉬움/보통/어려움)
  const LEVEL_NAMES = ['', '쉬움', '보통', '어려움'];
  const MAX_MOVES = 100; // 이만큼 두어도 안 끝나면 비김
  const AVATAR = { me: 'rabbit_face', cpu: 'robot', friend: 'teddy_bear' };

  const S = {
    mode: 'cpu', hands: [[1, 1], [1, 1]], turn: 0, selected: null, busy: false, over: false,
    moves: 0, cpuStarts: false, timers: [], onEnd: null,
  };
  const $ = (id) => document.getElementById(id);

  // ---------- 손 그림 (SVG) ----------
  // n: 펴진 손가락 수(0이면 죽은 손), mirror: 왼손, fist: 0개여도 살아 있는 주먹으로 (코코넛 놀이)
  function handSVG(n, mirror, fist) {
    const dead = n === 0 && !fist;
    const skin = dead ? '#D6D0CA' : '#FFD3A1', line = dead ? '#A8A099' : '#D9925A';
    const fingers = [[23, 13, 44], [38, 13, 50], [53, 13, 46], [68, 12, 36]]; // x, 너비, 펼친 길이 (검지→새끼)
    let parts = '';
    fingers.forEach(([x, w, len], i) => {
      if (i < n) parts += `<rect x="${x}" y="${58 - len}" width="${w}" height="${len + 10}" rx="${w / 2}" fill="${skin}" stroke="${line}" stroke-width="3"/>`;
      else parts += `<rect x="${x}" y="46" width="${w}" height="18" rx="${w / 2}" fill="${skin}" stroke="${line}" stroke-width="3"/>`;
    });
    const palm = `<rect x="19" y="52" width="64" height="58" rx="20" fill="${skin}" stroke="${line}" stroke-width="3"/>`;
    const thumb = `<path d="M24 86 Q14 70 22 62 Q30 58 40 70 Q46 78 40 84 Z" fill="${skin}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>`;
    const face = dead ? '<text x="51" y="92" font-size="22" text-anchor="middle" fill="#8C847D">✖</text>' : '';
    const flip = mirror ? ' transform="translate(102 0) scale(-1 1)"' : '';
    return `<svg viewBox="0 0 102 116" aria-hidden="true"><g${flip}>${parts}${palm}${thumb}</g>${face}</svg>`;
  }

  // ---------- 화면 만들기 ----------
  function init(onEnd) {
    S.onEnd = onEnd;
    for (const p of [0, 1]) {
      const side = $(p ? 'chop-top' : 'chop-bottom');
      side.querySelectorAll('.hand').forEach((btn) => btn.addEventListener('click', () => onHand(+btn.dataset.p, +btn.dataset.h)));
      side.querySelector('.split-btn').addEventListener('click', () => onSplitButton(p));
    }
    $('chop-mode').addEventListener('click', showMenu);
    $('chop-new').addEventListener('click', () => { Sound.tap(); restart(); });
    $('chop-cpu').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame('cpu'); });
    $('chop-duo').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame('duo'); });
    document.querySelectorAll('#chop-levels button').forEach((b) => b.addEventListener('click', () => {
      Store.set('chopLevel', +b.dataset.lv);
      Sound.tap();
      renderMenu();
    }));
  }

  function enter(opts) {
    opts = opts || {};
    if (opts.demo === 'duo') return startGame('duo');
    if (opts.demo === 'cpu') return startGame('cpu');
    if (opts.demo === 'chopplay' || opts.demo === 'chopduo') {
      startGame(opts.demo === 'chopplay' ? 'cpu' : 'duo');
      return autoPlay();
    }
    showMenu();
  }

  function stop() {
    S.timers.forEach(clearTimeout);
    S.timers = [];
    S.busy = false;
  }

  const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };

  function showMenu() {
    stop();
    $('chop-menu').classList.remove('hidden');
    $('chop-board').classList.add('hidden');
    $('chop-mode').textContent = '젓가락 놀이';
    renderMenu();
  }

  function renderMenu() {
    const lv = Store.get('chopLevel') || 1;
    document.querySelectorAll('#chop-levels button').forEach((b) => b.classList.toggle('on', +b.dataset.lv === lv));
  }

  function startGame(mode) {
    stop();
    S.mode = mode;
    $('chop-menu').classList.add('hidden');
    $('chop-board').classList.remove('hidden');
    $('chop-board').classList.toggle('duo', mode === 'duo');
    const lv = Store.get('chopLevel') || 1;
    $('chop-mode').textContent = mode === 'cpu' ? `로봇 · ${LEVEL_NAMES[lv]} ▾` : '둘이서 ▾';
    drawAvatar('chop-avatar-0', AVATAR.me);
    drawAvatar('chop-avatar-1', mode === 'cpu' ? AVATAR.cpu : AVATAR.friend);
    S.cpuStarts = false;
    newRound();
  }

  // 같은 모드로 새 판 (로봇이랑은 먼저 두는 쪽을 번갈아)
  function restart() {
    stop();
    if (S.mode === 'cpu') S.cpuStarts = !S.cpuStarts;
    newRound();
  }

  function newRound() {
    S.hands = [[1, 1], [1, 1]];
    S.turn = S.mode === 'cpu' && S.cpuStarts ? 1 : 0;
    S.selected = null;
    S.over = false;
    S.busy = false;
    S.moves = 0;
    closeSplits();
    render();
    if (isCpuTurn()) later(cpuMove, 1200);
  }

  function drawAvatar(id, kind) {
    const c = $(id);
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);
    Draw.object(ctx, kind, c.clientWidth / 2, c.clientHeight / 2, c.clientWidth * 0.9);
  }

  const isCpuTurn = () => S.mode === 'cpu' && S.turn === 1;

  function render() {
    for (const p of [0, 1]) {
      const side = $(p ? 'chop-top' : 'chop-bottom');
      side.classList.toggle('turn', !S.over && S.turn === p);
      side.querySelectorAll('.hand').forEach((btn) => {
        const h = +btn.dataset.h, n = S.hands[p][h];
        btn.innerHTML = handSVG(n, h === 0) + `<span class="num">${n || ''}</span>`;
        btn.classList.toggle('dead', n === 0);
        btn.classList.toggle('selected', S.turn === p && S.selected === h);
      });
      const msg = side.querySelector('.turn-msg');
      if (S.over) msg.textContent = '';
      else if (S.turn === p) msg.textContent = p === 1 && S.mode === 'cpu' ? '로봇이 생각하는 중…' : '내 차례!';
      else msg.textContent = '';
      side.querySelector('.split-btn').disabled = S.over || S.turn !== p || !Chop.splits(S.hands[p]).length;
    }
  }

  // ---------- 누르기 ----------
  function onHand(p, h) {
    if (S.busy || S.over || isCpuTurn()) return;
    Sound.unlock();
    const btn = handBtn(p, h);
    if (p === S.turn) {
      // 내 손 고르기
      if (S.hands[p][h] === 0) return shake(btn);
      closeSplits();
      S.selected = h;
      Sound.tap();
      return render();
    }
    // 상대 손 치기
    if (S.hands[p][h] === 0) return shake(btn);
    const mine = S.hands[S.turn];
    let from = S.selected;
    if (from == null) {
      const alive = [0, 1].filter((i) => mine[i] > 0);
      if (alive.length === 1) from = alive[0];
      else {
        // 어느 손으로 칠지 먼저 골라야 한다: 내 손을 살짝 흔들어 알려 준다
        alive.forEach((i) => shake(handBtn(S.turn, i)));
        return;
      }
    }
    doMove({ type: 'hit', from, to: h });
  }

  function onSplitButton(p) {
    if (S.busy || S.over || p !== S.turn || isCpuTurn()) return;
    const row = document.querySelector(`.split-row[data-p="${p}"]`);
    if (!row.classList.contains('hidden')) return closeSplits();
    const options = Chop.splits(S.hands[p]);
    if (!options.length) return;
    // 나누는 방법이 하나뿐이면 바로 나눈다
    if (options.length === 1) return doMove({ type: 'split', to: options[0] });
    Sound.tap();
    S.selected = null;
    render();
    row.innerHTML = '';
    for (const [x, y] of options) {
      const b = document.createElement('button');
      b.className = 'split-opt';
      b.innerHTML = `<span class="mini">${handSVG(x, true)}</span><span class="mini">${handSVG(y, false)}</span><b>${x} + ${y}</b>`;
      b.addEventListener('click', () => { closeSplits(); doMove({ type: 'split', to: [x, y] }); });
      row.appendChild(b);
    }
    row.classList.remove('hidden');
  }

  function closeSplits() {
    document.querySelectorAll('.split-row').forEach((r) => { r.classList.add('hidden'); r.innerHTML = ''; });
  }

  const handBtn = (p, h) => document.querySelector(`#${p ? 'chop-top' : 'chop-bottom'} .hand[data-h="${h}"]`);

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    Sound.miss();
  }

  // ---------- 수 두기 ----------
  function doMove(m) {
    S.busy = true;
    const p = S.turn, q = 1 - p;
    if (m.type === 'hit') {
      // 치는 손이 상대 손 쪽으로 쭉 나갔다 돌아온다
      const a = handBtn(p, m.from), t = handBtn(q, m.to);
      const ra = a.getBoundingClientRect(), rt = t.getBoundingClientRect();
      const sign = p === 1 ? -1 : 1; // 위쪽 판은 (로봇이랑 할 때도) 180도 돌아가 있다
      a.style.transform = `translate(${sign * (rt.left - ra.left) * 0.7}px, ${sign * (rt.top - ra.top) * 0.7}px) scale(1.08)`;
      a.classList.add('attacking');
      later(() => {
        a.style.transform = '';
        a.classList.remove('attacking');
        const before = S.hands[q][m.to];
        S.hands[q] = Chop.hit(S.hands[p], S.hands[q], m.from, m.to);
        if (S.hands[q][m.to] === 0 && before > 0) Sound.bump(); else Sound.step();
        t.classList.remove('pop');
        void t.offsetWidth;
        t.classList.add('pop');
        afterMove();
      }, 280);
    } else {
      S.hands[p] = m.to.slice();
      Sound.found();
      afterMove();
    }
  }

  function afterMove() {
    const p = S.turn, q = 1 - p;
    S.moves++;
    S.selected = null;
    if (!Chop.alive(S.hands[q])) return finish(p);
    if (S.moves >= MAX_MOVES) return finish(-1);
    S.turn = q;
    S.busy = false;
    render();
    if (isCpuTurn()) later(cpuMove, 1100);
  }

  function cpuMove() {
    const skill = SKILL[Store.get('chopLevel') || 1];
    const m = Chop.chooseMove(S.hands[1], S.hands[0], skill);
    if (m.type === 'hit') {
      // 어느 손으로 칠지 먼저 보여 준다
      S.selected = m.from;
      render();
      later(() => doMove(m), 600);
    } else {
      doMove(m);
    }
  }

  function finish(winner) {
    S.over = true;
    S.busy = false;
    render();
    let result;
    if (winner === -1) result = { text: '비겼어요!', speech: 'It is a tie!', noSticker: true, sad: true };
    else if (S.mode === 'cpu') result = winner === 0 ? {} : { text: '아쉽다! 다시 해 볼까?', speech: 'Oh no! Try again!', noSticker: true, sad: true };
    else result = { text: winner === 0 ? '아래쪽 승리!' : '위쪽 승리!', speech: winner === 0 ? 'Bottom wins!' : 'Top wins!', noSticker: true };
    later(() => S.onEnd('chop', 0, result), 700);
  }

  // 자가 점검용: 사람 차례마다 실제 버튼을 눌러 한 판을 끝까지 둔다
  function autoPlay() {
    const tick = () => {
      if (S.over) return;
      if (!S.busy && !isCpuTurn()) {
        const p = S.turn, q = 1 - p;
        const m = Chop.chooseMove(S.hands[p], S.hands[q], 0.5);
        if (m.type === 'hit') {
          handBtn(p, m.from).click();
          handBtn(q, m.to).click();
        } else {
          document.querySelector(`#${p ? 'chop-top' : 'chop-bottom'} .split-btn`).click();
          const want = m.to.join(' + ');
          const opt = Array.from(document.querySelectorAll(`.split-row[data-p="${p}"] .split-opt`)).find((b) => b.textContent.includes(want));
          if (opt) opt.click(); // 방법이 하나뿐이면 버튼만 눌러도 이미 나눠졌다
        }
      }
      setTimeout(tick, 400);
    };
    setTimeout(tick, 400);
  }

  root.ChopGame = { init, enter, stop, restart, handSVG };
})(typeof self !== 'undefined' ? self : this);
