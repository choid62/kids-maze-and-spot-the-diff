// 짝 맞추기 화면: 혼자(레벨 1~10) 또는 로봇이랑(기억력 쉬움/보통/어려움).
(function (root) {
  const BOT_MEMORY = [0, 0.35, 0.7, 1]; // 로봇이 본 카드를 기억할 확률
  const LEVEL_NAMES = ['', '쉬움', '보통', '어려움'];
  const S = { mode: 'solo', g: null, open: [], matched: new Set(), busy: false, turn: 0, score: [0, 0], memory: new Map(), moves: 0, timers: [], onEnd: null, rng: null };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };

  function init(onEnd) {
    S.onEnd = onEnd;
    // 혼자 하는 중에는 레벨 고르기, 로봇이랑 하는 중이나 메뉴에서는 메뉴(모드와 로봇 난이도)
    $('memo-mode').addEventListener('click', () => {
      if (S.mode === 'solo' && !$('memo-play').classList.contains('hidden')) App.openLevels('memo');
      else showMenu();
    });
    $('memo-new').addEventListener('click', () => { Sound.tap(); restart(); });
    $('memo-solo').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame('solo'); });
    $('memo-bot').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame('bot'); });
    document.querySelectorAll('#memo-levels button').forEach((b) => b.addEventListener('click', () => {
      Store.set('memoBot', +b.dataset.lv);
      Sound.tap();
      renderMenu();
    }));
    $('memo-board').addEventListener('click', (e) => {
      const c = e.target.closest('.card');
      if (c) onCard(+c.dataset.i);
    });
    root.addEventListener('resize', () => { if (S.g && !$('memo-board').classList.contains('hidden')) layout(); });
  }

  function enter(opts) {
    opts = opts || {};
    if (opts.demo === 'memosolo' || opts.demo === 'memobot') {
      startGame(opts.demo === 'memosolo' ? 'solo' : 'bot');
      return autoPlay();
    }
    showMenu();
  }

  function stop() {
    S.timers.forEach(clearTimeout);
    S.timers = [];
    S.busy = false;
  }

  function showMenu() {
    stop();
    $('memo-menu').classList.remove('hidden');
    $('memo-play').classList.add('hidden');
    $('memo-mode').textContent = '짝 맞추기';
    renderMenu();
  }

  function renderMenu() {
    const lv = Store.get('memoBot') || 1;
    document.querySelectorAll('#memo-levels button').forEach((b) => b.classList.toggle('on', +b.dataset.lv === lv));
    $('memo-level').textContent = `혼자: 레벨 ${Store.get('memoLevel') || 1} ▾`;
  }

  function startGame(mode) {
    stop();
    S.mode = mode;
    $('memo-menu').classList.add('hidden');
    $('memo-play').classList.remove('hidden');
    newRound();
  }

  function restart() {
    stop();
    newRound();
  }

  function newRound() {
    const level = S.mode === 'solo' ? Store.get('memoLevel') || 1 : 5;
    S.g = Memory.generate(level, Core.newSeed());
    S.rng = Core.makeRng(Core.newSeed());
    S.open = [];
    S.matched = new Set();
    S.turn = 0;
    S.score = [0, 0];
    S.memory = new Map();
    S.moves = 0;
    S.busy = false;
    $('memo-mode').textContent = S.mode === 'solo'
      ? `혼자 · 레벨 ${level} · ${Core.levelName(level)} ▾`
      : `로봇 · ${LEVEL_NAMES[Store.get('memoBot') || 1]} ▾`;
    $('memo-score').classList.toggle('hidden', S.mode !== 'bot');
    build();
    renderScore();
  }

  // ---------- 카드 ----------
  function build() {
    const board = $('memo-board');
    board.innerHTML = '';
    S.g.cards.forEach((c, i) => {
      const el = document.createElement('button');
      el.className = 'card';
      el.dataset.i = i;
      el.innerHTML = '<div class="inner"><div class="back">⭐</div><div class="front"><canvas></canvas></div></div>';
      board.appendChild(el);
    });
    layout();
  }

  // 카드가 가장 크게 나오는 칸 수 고르기 (카드 가로:세로 = 4:5)
  function layout() {
    const board = $('memo-board');
    const box = board.getBoundingClientRect();
    const n = S.g.cards.length, gap = 10;
    let best = { w: 0, cols: 2 };
    for (let cols = 2; cols <= 8; cols++) {
      const rows = Math.ceil(n / cols);
      const w = Math.min((box.width - gap * (cols + 1)) / cols, ((box.height - gap * (rows + 1)) / rows) * 0.8);
      if (w > best.w) best = { w, cols };
    }
    const w = Math.floor(best.w), h = Math.floor(w * 1.25);
    board.style.gridTemplateColumns = `repeat(${best.cols}, ${w}px)`;
    board.querySelectorAll('.card').forEach((el) => {
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      const c = el.querySelector('canvas');
      const card = S.g.cards[+el.dataset.i];
      const dpr = Math.min(root.devicePixelRatio || 1, 3);
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const f = card.face;
      Draw.object(ctx, f.kind, w / 2, h / 2, w * 0.78, null, f.flip, f);
    });
  }

  const cardEl = (i) => document.querySelector(`#memo-board .card[data-i="${i}"]`);

  function renderScore() {
    if (S.mode !== 'bot') return;
    $('memo-score').innerHTML = `<span class="${S.turn === 0 ? 'turn' : ''}">🐰 ${S.score[0]}</span><b>:</b><span class="${S.turn === 1 ? 'turn' : ''}">${S.score[1]} 🤖</span>`;
  }

  function onCard(i) {
    if (S.busy || (S.mode === 'bot' && S.turn !== 0)) return;
    Sound.unlock();
    flip(i);
  }

  function remember(i) {
    if (S.mode === 'bot' && S.rng.next() < BOT_MEMORY[Store.get('memoBot') || 1]) S.memory.set(i, S.g.cards[i].pair);
  }

  function flip(i) {
    if (S.matched.has(i) || S.open.includes(i) || S.open.length >= 2) return;
    cardEl(i).classList.add('open');
    Sound.tap();
    S.open.push(i);
    remember(i);
    if (S.open.length < 2) return;
    S.busy = true;
    S.moves++;
    const [a, b] = S.open;
    const match = S.g.cards[a].pair === S.g.cards[b].pair;
    later(() => {
      if (match) {
        S.matched.add(a);
        S.matched.add(b);
        cardEl(a).classList.add('matched');
        cardEl(b).classList.add('matched');
        Sound.found();
        S.score[S.turn]++;
        S.open = [];
        S.busy = false;
        renderScore();
        if (S.matched.size === S.g.cards.length) return later(finish, 700);
        if (S.mode === 'bot' && S.turn === 1) later(botTurn, 600); // 맞히면 한 번 더
      } else {
        Sound.miss();
        later(() => {
          cardEl(a).classList.remove('open');
          cardEl(b).classList.remove('open');
          S.open = [];
          S.busy = false;
          if (S.mode === 'bot') {
            S.turn = 1 - S.turn;
            renderScore();
            if (S.turn === 1) later(botTurn, 700);
          }
        }, 800);
      }
    }, 450);
  }

  function botTurn() {
    S.busy = true;
    const first = Memory.botFirst(S.g.cards, S.matched, S.memory, S.rng);
    S.busy = false;
    flip(first);
    S.busy = true;
    later(() => {
      const second = Memory.botSecond(S.g.cards, S.matched, S.memory, first, S.rng);
      S.busy = false;
      flip(second);
    }, 800);
  }

  function finish() {
    if (S.mode === 'solo') {
      const lv = Store.get('memoLevel') || 1;
      const up = lv < Memory.MAX_LEVEL;
      if (up) Store.set('memoLevel', lv + 1);
      return S.onEnd('memo', up ? lv + 1 : 0, {});
    }
    const [me, bot] = S.score;
    if (me > bot) S.onEnd('memo', 0, {});
    else if (me === bot) S.onEnd('memo', 0, { text: '비겼어요!', speech: 'It is a tie!', noSticker: true, sad: true });
    else S.onEnd('memo', 0, { text: '아쉽다! 다시 해 볼까?', speech: 'Oh no! Try again!', noSticker: true, sad: true });
  }

  // 자가 점검용: 내 차례마다 실제 카드를 누른다 (가끔 아는 짝을 맞힌다)
  function autoPlay() {
    const seen = new Map();
    const tick = () => {
      if (!S.g || S.matched.size === S.g.cards.length) return;
      if (!S.busy && (S.mode === 'solo' || S.turn === 0) && S.open.length === 0) {
        const left = S.g.cards.filter((c) => !S.matched.has(c.id));
        const a = left[Math.floor(Math.random() * left.length)];
        cardEl(a.id).click();
        const partner = left.find((c) => c.id !== a.id && c.pair === a.pair);
        const b = Math.random() < 0.5 ? partner : left.find((c) => c.id !== a.id);
        cardEl(b.id).click();
      }
      setTimeout(tick, 400);
    };
    setTimeout(tick, 400);
    return seen;
  }

  // 레벨을 고른 뒤: 그 레벨로 혼자 하기 새 판
  function startSolo() {
    startGame('solo');
  }

  root.MemoGame = { init, enter, stop, restart, startSolo };
})(typeof self !== 'undefined' ? self : this);
