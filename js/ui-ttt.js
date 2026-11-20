// 틱택토 화면: 로봇이랑(쉬움/보통/어려움) 또는 둘이서. 말은 그림 (나 = 토끼, 로봇, 친구 = 곰).
// 1번 = 나(먼저 고른 사람), 2번 = 로봇 또는 친구.
(function (root) {
  const LEVEL_NAMES = ['', 'Easy', 'Medium', 'Hard'];
  const PIECE = { me: 'rabbit_face', cpu: 'robot', friend: 'teddy_bear' };

  const S = { mode: 'cpu', board: Array(9).fill(0), turn: 1, first: 1, busy: false, over: false, timers: [], onEnd: null };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };
  const kindOf = (p) => (p === 1 ? PIECE.me : S.mode === 'cpu' ? PIECE.cpu : PIECE.friend);
  const isCpuTurn = () => S.mode === 'cpu' && S.turn === 2;

  function init(onEnd) {
    S.onEnd = onEnd;
    const grid = $('ttt-grid');
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('button');
      b.className = 'ttt-cell';
      b.dataset.i = i;
      b.setAttribute('aria-label', `Square ${i + 1}`);
      b.innerHTML = '<canvas></canvas>';
      b.addEventListener('click', () => onCell(i));
      grid.appendChild(b);
    }
    $('ttt-mode').addEventListener('click', showMenu);
    $('ttt-new').addEventListener('click', () => { Sound.tap(); restart(); });
    $('ttt-cpu').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame('cpu'); });
    $('ttt-duo').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame('duo'); });
    document.querySelectorAll('#ttt-levels button').forEach((b) => b.addEventListener('click', () => {
      Store.set('tttLevel', +b.dataset.lv);
      Sound.tap();
      renderMenu();
    }));
  }

  function enter(opts) {
    opts = opts || {};
    if (opts.demo === 'tttplay' || opts.demo === 'tttduo') {
      startGame(opts.demo === 'tttplay' ? 'cpu' : 'duo');
      return autoPlay();
    }
    if (opts.demo === 'tttwin') {
      // 점검용: 나 [0,4] 로봇 [1,2], 내 차례 → 8에 두면 대각선으로 이김
      startGame('cpu');
      S.board = [1, 2, 2, 0, 1, 0, 0, 0, 0];
      render();
      return later(() => onCell(8), 300);
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
    $('ttt-menu').classList.remove('hidden');
    $('ttt-board').classList.add('hidden');
    $('ttt-mode').textContent = 'Tic-Tac-Toe';
    renderMenu();
  }

  function renderMenu() {
    const lv = Store.get('tttLevel') || 1;
    document.querySelectorAll('#ttt-levels button').forEach((b) => b.classList.toggle('on', +b.dataset.lv === lv));
  }

  function startGame(mode) {
    stop();
    S.mode = mode;
    $('ttt-menu').classList.add('hidden');
    $('ttt-board').classList.remove('hidden');
    const lv = Store.get('tttLevel') || 1;
    $('ttt-mode').textContent = mode === 'cpu' ? `Robot · ${LEVEL_NAMES[lv]} ▾` : 'Two Players ▾';
    S.first = 1;
    newRound();
  }

  // 같은 모드로 새 판 (먼저 두는 쪽을 번갈아)
  function restart() {
    stop();
    S.first = 3 - S.first;
    newRound();
  }

  function newRound() {
    S.board = Array(9).fill(0);
    S.turn = S.first;
    S.over = false;
    S.busy = false;
    document.querySelectorAll('.ttt-cell').forEach((c) => c.classList.remove('win', 'pop', 'lose'));
    render();
    if (isCpuTurn()) cpuTurn(900);
  }

  function drawPiece(canvas, kind) {
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (kind) Draw.object(ctx, kind, w / 2, h / 2, Math.min(w, h) * 0.78);
  }

  function render() {
    document.querySelectorAll('.ttt-cell').forEach((c) => {
      const i = +c.dataset.i, v = S.board[i];
      const kind = v ? kindOf(v) : '';
      if (c.dataset.kind !== kind || c.dataset.w !== String(c.clientWidth)) {
        drawPiece(c.querySelector('canvas'), kind);
        c.dataset.kind = kind;
        c.dataset.w = c.clientWidth;
      }
      c.classList.toggle('filled', !!v);
      c.disabled = S.over || !!v;
    });
    for (const p of [1, 2]) {
      const el = document.querySelector(`.ttt-player[data-p="${p}"]`);
      const cv = el.querySelector('canvas');
      if (cv.dataset.kind !== kindOf(p) || cv.dataset.w !== String(cv.clientWidth)) {
        drawPiece(cv, kindOf(p));
        cv.dataset.kind = kindOf(p);
        cv.dataset.w = cv.clientWidth;
      }
      el.classList.toggle('turn', !S.over && S.turn === p);
      const msg = el.querySelector('.msg');
      if (S.over || S.turn !== p) msg.textContent = '';
      else if (p === 2 && S.mode === 'cpu') msg.textContent = 'Thinking…';
      else msg.textContent = 'Your turn!';
    }
  }

  function onCell(i) {
    if (S.over || S.busy || isCpuTurn() || S.board[i]) return;
    Sound.unlock();
    place(i);
  }

  function place(i) {
    S.board[i] = S.turn;
    Sound.step();
    render();
    const cell = document.querySelector(`.ttt-cell[data-i="${i}"]`);
    cell.classList.remove('pop');
    void cell.offsetWidth;
    cell.classList.add('pop');
    const w = TicTacToe.winner(S.board);
    if (w) return finish(w);
    if (TicTacToe.full(S.board)) return finish(null);
    S.turn = 3 - S.turn;
    render();
    if (isCpuTurn()) cpuTurn(700);
  }

  function cpuTurn(ms) {
    S.busy = true;
    later(() => {
      S.busy = false;
      const i = TicTacToe.cpuMove(S.board, 2, Store.get('tttLevel') || 1);
      if (i >= 0) place(i);
    }, ms);
  }

  function finish(w) {
    S.over = true;
    S.busy = false;
    render();
    let result;
    if (!w) {
      Sound.bump();
      result = { text: 'It\'s a tie!', speech: 'It is a tie!', noSticker: true, sad: true };
    } else {
      // 이긴 세 칸이 하나씩 반짝
      w.line.forEach((i, k) => later(() => {
        document.querySelector(`.ttt-cell[data-i="${i}"]`).classList.add('win');
        Sound.found();
      }, k * 220));
      if (S.mode === 'cpu') result = w.who === 1 ? {} : { text: 'So close! Try again?', speech: 'Oh no! Try again!', noSticker: true, sad: true };
      else result = { text: w.who === 1 ? 'Bunny wins!' : 'Teddy wins!', speech: w.who === 1 ? 'Bunny wins!' : 'Teddy wins!', noSticker: true };
    }
    later(() => S.onEnd('ttt', 0, result), w ? 1500 : 900);
  }

  // 자가 점검용: 사람 차례마다 실제 칸을 눌러 한 판을 끝까지 둔다
  function autoPlay() {
    const tick = () => {
      if (S.over) return;
      if (!S.busy && !isCpuTurn()) {
        const i = TicTacToe.cpuMove(S.board, S.turn, 2);
        document.querySelector(`.ttt-cell[data-i="${i}"]`).click();
      }
      setTimeout(tick, 500);
    };
    setTimeout(tick, 500);
  }

  root.TttGame = { init, enter, stop, restart, render };
})(typeof self !== 'undefined' ? self : this);
