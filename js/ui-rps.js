// 가위바위보 화면: 로봇이랑 또는 둘이서(태블릿을 사이에 두고 마주 앉아서). 먼저 3번 이기면 승리.
// 아래쪽 = 0번(토끼), 위쪽 = 1번(로봇 또는 곰돌이). 둘이서는 위쪽 화면이 뒤집혀 있다.
// 손을 고르면 "Rock, paper, scissors, shoot!" 에 맞춰 두 주먹이 흔들리다가 동시에 펼쳐진다.
(function (root) {
  const LABEL = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };
  const AVATAR = { me: 'rabbit_face', cpu: 'robot', friend: 'teddy_bear' };
  const NAME = { me: 'Bunny', cpu: 'Robot', friend: 'Teddy' };
  const S = { mode: 'cpu', pick: [null, null], score: [0, 0], busy: false, over: false, timers: [], onEnd: null, demo: false };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };
  const side = (p) => $(p ? 'rps-top' : 'rps-bottom');
  const img = (h) => `assets/rps/${h}.svg`;

  function init(onEnd) {
    S.onEnd = onEnd;
    for (const p of [0, 1]) {
      const box = side(p).querySelector('.rps-picks');
      box.innerHTML = RPS.HANDS.map((h) => `<button class="rps-pick" data-h="${h}"><img src="${img(h)}" alt=""><span>${LABEL[h]}</span></button>`).join('');
      box.addEventListener('click', (e) => {
        const b = e.target.closest('.rps-pick');
        if (b) onPick(p, b.dataset.h);
      });
    }
    $('rps-mode').addEventListener('click', showMenu);
    $('rps-new').addEventListener('click', () => { Sound.tap(); restart(); });
    $('rps-cpu').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame('cpu'); });
    $('rps-duo').addEventListener('click', () => { Sound.unlock(); Sound.tap(); startGame('duo'); });
  }

  function enter(opts) {
    opts = opts || {};
    if (opts.demo === 'rpsplay' || opts.demo === 'rpsduo') {
      S.demo = true;
      return startGame(opts.demo === 'rpsplay' ? 'cpu' : 'duo');
    }
    S.demo = false;
    showMenu();
  }

  function stop() {
    S.timers.forEach(clearTimeout);
    S.timers = [];
    S.busy = false;
  }

  function showMenu() {
    stop();
    $('rps-menu').classList.remove('hidden');
    $('rps-board').classList.add('hidden');
    $('rps-mode').textContent = 'Rock Paper Scissors';
  }

  function drawAvatar(canvas, kind) {
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    const size = canvas.clientWidth || 48;
    canvas.width = canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    Draw.object(ctx, kind, size / 2, size / 2, size * 0.9);
  }

  const who = (p) => (p === 0 ? 'me' : S.mode === 'cpu' ? 'cpu' : 'friend');

  function startGame(mode) {
    stop();
    S.mode = mode;
    $('rps-menu').classList.add('hidden');
    const board = $('rps-board');
    board.classList.remove('hidden');
    board.classList.toggle('duo', mode === 'duo');
    $('rps-mode').textContent = mode === 'cpu' ? 'vs Robot ▾' : 'Two Players ▾';
    for (const p of [0, 1]) drawAvatar(side(p).querySelector('.rps-avatar'), AVATAR[who(p)]);
    restart();
  }

  function restart() {
    stop();
    S.score = [0, 0];
    S.over = false;
    round();
  }

  function round() {
    S.pick = [null, null];
    S.busy = false;
    $('rps-call').textContent = '';
    $('rps-why').textContent = '';
    for (const p of [0, 1]) {
      const s = side(p);
      s.classList.remove('picked', 'win', 'lose');
      s.querySelector('.rps-hand img').src = img('rock');
      s.querySelector('.rps-hand').classList.remove('pump', 'show');
      setMsg(p, p === 1 && S.mode === 'cpu' ? '' : 'Pick one!');
    }
    renderStars();
    if (S.demo) demoPick();
  }

  function setMsg(p, text) { side(p).querySelector('.rps-msg').textContent = text; }

  function renderStars() {
    for (const p of [0, 1]) {
      let h = '';
      for (let i = 0; i < RPS.WIN_TO; i++) h += `<i class="${i < S.score[p] ? 'on' : ''}">★</i>`;
      side(p).querySelector('.rps-stars').innerHTML = h;
    }
  }

  function onPick(p, h) {
    if (S.busy || S.over || S.pick[p]) return;
    if (S.mode === 'cpu' && p === 1) return;
    Sound.unlock();
    Sound.tap();
    S.pick[p] = h;
    side(p).classList.add('picked');
    setMsg(p, S.mode === 'duo' ? 'Ready ✓' : '');
    if (S.mode === 'cpu') S.pick[1] = RPS.cpuHand();
    if (S.pick[0] && S.pick[1]) shoot();
    else setMsg(1 - p, 'Your turn! Pick one!');
  }

  // 두 주먹이 세 번 흔들리고 "Shoot!" 에 펼쳐진다
  function shoot() {
    S.busy = true;
    Sound.say('Rock, paper, scissors, shoot!');
    const words = ['Rock…', 'Paper…', 'Scissors…', 'Shoot!'];
    for (const p of [0, 1]) side(p).querySelector('.rps-hand').classList.add('pump');
    words.forEach((w, i) => later(() => {
      $('rps-call').textContent = w;
      if (i < 3) Sound.step();
    }, i * 520));
    later(reveal, 3 * 520 + 120);
  }

  function reveal() {
    const [a, b] = S.pick;
    for (const p of [0, 1]) {
      const hand = side(p).querySelector('.rps-hand');
      hand.classList.remove('pump');
      hand.querySelector('img').src = img(S.pick[p]);
      void hand.offsetWidth;
      hand.classList.add('show');
    }
    const r = RPS.result(a, b);
    const why = RPS.reason(a, b);
    $('rps-why').textContent = why || 'Same hand!';
    if (r === 0) {
      Sound.bump();
      $('rps-call').textContent = 'Tie! Go again!';
      for (const p of [0, 1]) setMsg(p, 'Tie!');
      Sound.say('Tie! Go again!');
    } else {
      const w = r > 0 ? 0 : 1;
      S.score[w]++;
      side(w).classList.add('win');
      side(1 - w).classList.add('lose');
      const name = NAME[who(w)];
      $('rps-call').textContent = S.mode === 'cpu' ? (w === 0 ? 'You win!' : 'Robot wins!') : `${name} wins!`;
      if (S.mode === 'cpu') {
        setMsg(0, w === 0 ? 'You win! ⭐' : 'Oh no!');
        setMsg(1, '');
      } else {
        setMsg(w, 'You win! ⭐');
        setMsg(1 - w, 'Oh no!');
      }
      if (S.mode === 'cpu' && w === 1) Sound.miss(); else Sound.found();
      Sound.say(`${why} ${S.mode === 'cpu' ? (w === 0 ? 'You win!' : 'Robot wins!') : name + ' wins!'}`);
      renderStars();
      if (S.score[w] >= RPS.WIN_TO) return later(() => finish(w), 2200);
    }
    later(round, 2600);
  }

  function finish(w) {
    S.over = true;
    let result;
    if (S.mode === 'cpu') result = w === 0 ? {} : { text: 'So close! Try again?', speech: 'Oh no! Try again!', noSticker: true, sad: true };
    else result = { text: `${NAME[who(w)]} wins!`, speech: `${NAME[who(w)]} wins!`, noSticker: true };
    S.onEnd('rps', 0, result);
  }

  // 자가 점검용: 차례마다 실제 버튼을 누른다
  function demoPick() {
    later(() => {
      for (const p of S.mode === 'cpu' ? [0] : [0, 1]) {
        const btns = side(p).querySelectorAll('.rps-pick');
        btns[Math.floor(Math.random() * 3)].click();
      }
    }, 700);
  }

  root.RpsGame = { init, enter, stop, restart };
})(typeof self !== 'undefined' ? self : this);
