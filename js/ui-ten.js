// 10 만들기 화면: 앞면이 보이는 숫자 카드(숫자 + 열 칸 점) 중에서 더해서 목표 수가 되는 두 장을 고른다.
// 레벨 1은 5 만들기 … 레벨 6부터 10 만들기. 실수 2번 이하로 끝내면 레벨 업.
(function (root) {
  const COLORS = ['#FF8A3D', '#4FAEF2', '#7BC67E', '#9B6BD6', '#E86FA3', '#F2B33D'];
  const S = { level: 1, b: null, sel: [], done: new Set(), misses: 0, busy: false, token: {}, timers: [], onEnd: null, active: false };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { const tk = S.token; S.timers.push(setTimeout(() => { if (S.token === tk) f(); }, ms)); };

  function init(onEnd) {
    S.onEnd = onEnd;
    $('ten-grid').addEventListener('click', (e) => {
      const c = e.target.closest('.ncard');
      if (c) tap(+c.dataset.i, c);
    });
    $('ten-new').addEventListener('click', () => { Sound.tap(); start({}); });
  }

  function start(opts) {
    opts = opts || {};
    stop();
    S.active = true;
    S.level = Core.clamp(opts.level || Store.get('tenLevel') || 1, 1, Numbers.TEN_MAX_LEVEL);
    S.b = Numbers.tenBoard(S.level, Core.makeRng(opts.seed != null ? opts.seed : Core.newSeed()));
    S.sel = [];
    S.done = new Set();
    S.misses = 0;
    S.busy = false;
    $('ten-level').textContent = `Level ${S.level} · ${Core.levelName(S.level)} ▾`;
    $('ten-target').textContent = S.b.target;
    render();
    showEq();
    if (opts.demo === 'tenplay') demoPlay();
  }

  function stop() {
    S.active = false;
    S.token = {};
    S.timers.forEach(clearTimeout);
    S.timers = [];
  }

  // 숫자 n 을 열 칸 점(위 5, 아래 5)으로
  function frame(n) {
    let h = '<span class="frame">';
    for (let i = 0; i < 10; i++) h += `<i class="${i < n ? 'on' : ''}"></i>`;
    return h + '</span>';
  }

  function render() {
    const grid = $('ten-grid');
    const n = S.b.cards.length;
    grid.style.setProperty('--cols', n <= 6 ? 3 : 4);
    grid.innerHTML = S.b.cards.map((v, i) => `<button class="ncard" data-i="${i}" style="--c:${COLORS[v % COLORS.length]}"><b>${v}</b>${frame(v)}</button>`).join('');
  }

  function showEq(bad) {
    const a = S.sel[0] != null ? S.b.cards[S.sel[0]] : '';
    const b = S.sel[1] != null ? S.b.cards[S.sel[1]] : '';
    const sum = a !== '' && b !== '' ? a + b : '';
    $('ten-eq').innerHTML = `<span class="slot${a !== '' ? ' filled' : ''}">${a}</span><span class="op">+</span><span class="slot${b !== '' ? ' filled' : ''}">${b}</span><span class="op">=</span><span class="slot sum${sum !== '' ? (bad ? ' bad' : ' good') : ''}">${sum !== '' ? sum : S.b.target}</span>`;
  }

  function tap(i, card) {
    if (S.busy || S.done.has(i)) return;
    Sound.unlock();
    // 같은 카드를 다시 누르면 고르기 취소
    if (S.sel[0] === i) {
      S.sel = [];
      card.classList.remove('sel');
      Sound.tap();
      return showEq();
    }
    Sound.tap();
    S.sel.push(i);
    card.classList.add('sel');
    showEq();
    if (S.sel.length < 2) return;
    const [x, y] = S.sel;
    const a = S.b.cards[x], b = S.b.cards[y];
    const cards = [x, y].map((k) => $('ten-grid').querySelector(`.ncard[data-i="${k}"]`));
    S.busy = true;
    if (a + b === S.b.target) {
      Sound.found();
      Sound.say(`${a} and ${b} make ${S.b.target}!`);
      cards.forEach((c) => { c.classList.remove('sel'); c.classList.add('match'); });
      later(() => {
        cards.forEach((c) => c.classList.add('gone'));
        S.done.add(x);
        S.done.add(y);
        S.sel = [];
        S.busy = false;
        showEq();
        if (S.done.size === S.b.cards.length) later(finish, 500);
      }, 1100);
    } else {
      S.misses++;
      Sound.miss();
      showEq(true);
      cards.forEach((c) => { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); });
      later(() => {
        cards.forEach((c) => c.classList.remove('sel', 'shake'));
        S.sel = [];
        S.busy = false;
        showEq();
      }, 1100);
    }
  }

  function finish() {
    let newLevel = 0;
    if (S.misses <= 2 && S.level < Numbers.TEN_MAX_LEVEL) {
      newLevel = S.level + 1;
      Store.set('tenLevel', newLevel);
    }
    S.onEnd('ten', newLevel);
  }

  // 자가 점검용: 처음 한 번은 틀린 두 장, 나머지는 맞는 짝
  function demoPlay() {
    let missed = false;
    const step = () => {
      if (!S.active) return;
      if (!S.busy) {
        const left = S.b.cards.map((v, i) => i).filter((i) => !S.done.has(i));
        if (!left.length) return;
        const cardEl = (i) => $('ten-grid').querySelector(`.ncard[data-i="${i}"]`);
        const a = left[0];
        let b = left.find((i) => i !== a && S.b.cards[i] + S.b.cards[a] === S.b.target);
        if (!missed) { const w = left.find((i) => i !== a && S.b.cards[i] + S.b.cards[a] !== S.b.target); if (w != null) { b = w; missed = true; } }
        cardEl(a).click();
        setTimeout(() => cardEl(b).click(), 300);
      }
      setTimeout(step, 1600);
    };
    setTimeout(step, 600);
  }

  root.TenGame = { init, start, stop, MAX_LEVEL: Numbers.TEN_MAX_LEVEL, frame };
})(typeof self !== 'undefined' ? self : this);
