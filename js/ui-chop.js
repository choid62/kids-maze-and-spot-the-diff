// 젓가락 놀이 화면: 로봇이랑(쉬움/보통/어려움) 또는 둘이서(한 폰으로 마주 보고).
// 아래쪽 = 사람(0번), 위쪽 = 로봇 또는 다른 사람(1번).
(function (root) {
  const SKILL = [0, 0.3, 0.7, 1]; // 로봇이 최선의 수를 고를 확률 (쉬움/보통/어려움)
  const LEVEL_NAMES = ['', 'Easy', 'Medium', 'Hard'];
  const MAX_MOVES = 100; // 이만큼 두어도 안 끝나면 비김
  const AVATAR = { me: 'rabbit_face', cpu: 'robot', friend: 'teddy_bear' };

  const S = {
    mode: 'cpu', hands: [[1, 1], [1, 1]], turn: 0, selected: null, busy: false, over: false,
    moves: 0, cpuStarts: false, timers: [], onEnd: null,
  };
  const $ = (id) => document.getElementById(id);

  // ---------- 손 그림 (SVG) ----------
  // 손가락: x, 너비, 펼친 길이 (검지→새끼). 그림 크기는 102 x 116
  const FINGERS = [[23, 13, 44], [38, 13, 50], [53, 13, 46], [68, 12, 36]];
  // n: 펴진 손가락 수(0이면 죽은 손), mirror: 왼손, fist: 0개여도 살아 있는 주먹으로 (코코넛 놀이)
  function handSVG(n, mirror, fist) {
    const dead = n === 0 && !fist;
    const skin = dead ? '#D6D0CA' : '#FFD3A1', line = dead ? '#A8A099' : '#D9925A';
    const fingers = FINGERS;
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
    if (opts.demo === 'chopsum' || opts.demo === 'chopdead') {
      // 점검용: 덧셈 보여 주기 (chopsum 1 + 3 = 4, chopdead 2 + 3 = 5 → 쉬는 손)
      startGame('cpu');
      stop();
      S.hands = opts.demo === 'chopsum' ? [[1, 1], [3, 1]] : [[1, 2], [3, 1]];
      S.turn = 0;
      render();
      return later(() => doMove({ type: 'hit', from: opts.demo === 'chopsum' ? 0 : 1, to: 0 }), 300);
    }
    if (opts.demo === 'chopplay' || opts.demo === 'chopduo') {
      startGame(opts.demo === 'chopplay' ? 'cpu' : 'duo');
      return autoPlay();
    }
    showMenu();
  }

  function stop() {
    S.token = {}; // 진행 중이던 날기와 식은 무시
    clearEq();
    S.timers.forEach(clearTimeout);
    S.timers = [];
    S.busy = false;
  }

  const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };

  function showMenu() {
    stop();
    $('chop-menu').classList.remove('hidden');
    $('chop-board').classList.add('hidden');
    $('chop-mode').textContent = 'Chopsticks';
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
    $('chop-mode').textContent = mode === 'cpu' ? `Robot · ${LEVEL_NAMES[lv]} ▾` : 'Two Players ▾';
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
      else if (S.turn === p) msg.textContent = p === 1 && S.mode === 'cpu' ? 'Robot is thinking…' : 'Your turn!';
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
    clearEq(); // 지난 차례의 식은 이제 지운다
    const p = S.turn, q = 1 - p;
    if (m.type === 'hit') {
      showSum(p, q, m, () => {
        S.hands[q] = Chop.hit(S.hands[p], S.hands[q], m.from, m.to);
        render();
        const t = handBtn(q, m.to);
        t.classList.remove('pop');
        void t.offsetWidth;
        t.classList.add('pop');
        afterMove();
      });
    } else {
      S.hands[p] = m.to.slice();
      Sound.found();
      afterMove();
    }
  }

  // ---------- 덧셈 보여 주기 ----------
  // 내 손의 수와 맞는 손의 수가 손가락에서 튀어나와 가운데 식의 빈칸으로 날아가 "1 + 3 = 4"를 만들고,
  // 답 4가 식에서 튀어나와 맞는 손으로 날아가 그 손이 바뀐다 (5 이상이면 쉬는 손).
  // 식은 다음 사람이 칠 때까지 가운데에 남아 있다.

  function clearEq() {
    if (S.eq) S.eq.remove();
    S.eq = null;
  }

  // 요소를 from에서 to로 ms 동안 움직인다 (약 1/60초마다 위치를 직접 계산해서 어떤 기기에서도 날아가는 모습이 보이게)
  function tween(el, from, to, ms, done) {
    const token = S.token;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = () => {
      if (S.token !== token) return el.remove();
      const now = performance.now();
      const t = Math.min(1, (now - t0) / ms), k = ease(t);
      el.style.transform = `translate(${from.x + (to.x - from.x) * k}px, ${from.y + (to.y - from.y) * k}px) translate(-50%, -50%)`;
      if (t < 1) setTimeout(step, 16);
      else done();
    };
    el.style.transform = `translate(${from.x}px, ${from.y}px) translate(-50%, -50%)`;
    setTimeout(step, 16);
  }

  // 치는 손이 맞는 손 쪽으로 쭉 뻗어 톡 치고 돌아온다. 그동안 가운데 식은 손을 가리지 않게 흐려진다.
  // (숫자처럼 약 1/60초마다 위치를 직접 계산해서 움직인다)
  function punch(p, a, t, eq, back) {
    const ra = a.getBoundingClientRect(), rt = t.getBoundingClientRect();
    const sign = p === 1 ? -1 : 1; // 위쪽 판은 180도 돌아가 있어서 방향을 뒤집는다
    const dx = sign * (rt.left - ra.left) * 0.78, dy = sign * (rt.top - ra.top) * 0.78;
    const token = S.token;
    const move = (from, to, ms, ease, then) => {
      const t0 = performance.now();
      const step = () => {
        if (S.token !== token) return;
        const k = ease(Math.min(1, (performance.now() - t0) / ms)), f = from + (to - from) * k;
        a.style.transform = `translate(${dx * f}px, ${dy * f}px) scale(${1 + 0.1 * f})`;
        if (f !== to) setTimeout(step, 16);
        else then();
      };
      step();
    };
    eq.classList.add('dim');
    a.classList.add('attacking');
    a.style.transition = 'none';
    // 쭉 뻗기 (점점 빠르게) → 톡! → 돌아오기 (점점 느리게)
    move(0, 1, 260, (k) => k * k, () => {
      Sound.bump();
      t.classList.remove('pop');
      void t.offsetWidth;
      t.classList.add('pop');
      later(() => move(1, 0, 240, (k) => 1 - (1 - k) * (1 - k), () => {
        a.style.transform = '';
        a.style.transition = '';
        a.classList.remove('attacking');
        eq.classList.remove('dim');
        later(back, 150);
      }), 120);
    });
  }

  // 손가락 세기: 펴진 손가락 끝마다 1, 2, 3 … 숫자를 하나씩 붙인 뒤 then()
  // 위치는 실제로 그려진 손가락 모양에서 바로 읽는다 (거꾸로 돌아간 손, 좌우가 뒤집힌 손도 저절로 맞는다).
  // hand = 손 버튼, n = 손가락 수, top = 위쪽 판(180도 돌아가 있어 손가락 끝이 아래쪽)
  function countFingers(hand, n, top, then) {
    const board = $('chop-board');
    // 숫자를 붙이는 그 순간의 손가락 끝 위치 (손가락 i = 그림 속 i번째 rect, 검지부터)
    const tipOf = (i) => {
      const base = board.getBoundingClientRect();
      const r = hand.querySelectorAll('svg rect')[i].getBoundingClientRect();
      const y = top ? r.bottom - r.height * 0.2 : r.top + r.height * 0.2;
      return { x: r.left + r.width / 2 - base.left, y: y - base.top };
    };
    const marks = [];
    for (let i = 0; i < n; i++) {
      later(() => {
        const pt = tipOf(i);
        const el = document.createElement('div');
        el.className = 'finger-count';
        el.textContent = i + 1;
        el.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`;
        board.appendChild(el);
        marks.push(el);
        Sound.tap();
      }, i * 380);
    }
    later(() => {
      marks.forEach((el) => el.remove());
      then();
    }, n * 380 + 350);
  }

  function showSum(p, q, m, done) {
    const board = $('chop-board');
    const a = handBtn(p, m.from), t = handBtn(q, m.to);
    const av = S.hands[p][m.from], tv = S.hands[q][m.to];
    const sum = av + tv, dead = sum >= Chop.DEAD_AT;
    const token = S.token;

    clearEq();
    const eq = document.createElement('div');
    eq.className = 'chop-eq';
    eq.innerHTML = '<div class="eq-row"><span class="slot"></span><span class="op">+</span><span class="slot"></span><span class="op">=</span><span class="slot sum"></span></div><div class="eq-note"></div>';
    board.appendChild(eq);
    S.eq = eq;
    const slots = eq.querySelectorAll('.slot');

    // 위치는 날아가는 숫자가 붙는 상자(판) 기준
    const centerOf = (el) => {
      const base = board.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    };
    // 숫자 공 하나를 from 요소에서 to 요소로 날린다
    const fly = (n, fromEl, toEl, landed) => {
      const ball = document.createElement('div');
      ball.className = 'chop-fly num';
      ball.textContent = n;
      board.appendChild(ball);
      tween(ball, centerOf(fromEl), centerOf(toEl), 650, () => { ball.remove(); landed(); });
    };
    const fill = (slot, n) => {
      slot.textContent = n;
      slot.classList.add('filled');
    };

    a.classList.add('selected');
    // ① 내 손의 수
    later(() => countFingers(a, av, p === 1, () => {
      Sound.step();
      fly(av, a, slots[0], () => {
        fill(slots[0], av);
        // ② 맞는 손의 수
        later(() => countFingers(t, tv, q === 1, () => {
          Sound.step();
          fly(tv, t, slots[1], () => {
            fill(slots[1], tv);
            // ③ 답
            later(() => {
              fill(slots[2], sum);
              slots[2].classList.add('show');
              if (dead) {
                eq.querySelector('.eq-note').textContent = `${Chop.DEAD_AT} or more: that hand is out`;
                Sound.bump();
              } else Sound.found();
              // ④ 손이 손을 톡! 치고 돌아온 뒤 ⑤ 답이 맞는 손으로 날아간다 (식은 그대로 남는다)
              later(() => {
                punch(p, a, t, eq, () => {
                  fly(sum, slots[2], t, () => {
                    if (S.token !== token) return;
                    a.classList.remove('selected');
                    done();
                  });
                });
              }, dead ? 1000 : 600);
            }, 300);
          });
        }), 200);
      });
    }), 150);
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
    if (winner === -1) result = { text: 'It\'s a tie!', speech: 'It is a tie!', noSticker: true, sad: true };
    else if (S.mode === 'cpu') result = winner === 0 ? {} : { text: 'So close! Try again?', speech: 'Oh no! Try again!', noSticker: true, sad: true };
    else result = { text: winner === 0 ? 'Bottom wins!' : 'Top wins!', speech: winner === 0 ? 'Bottom wins!' : 'Top wins!', noSticker: true };
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
