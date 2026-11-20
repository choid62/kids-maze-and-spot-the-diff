// 단어 잇기 화면: 왼쪽 영어 단어 3개, 오른쪽 그림 3개. 단어에서 그림으로 줄을 그어(또는 차례로 눌러) 잇는다.
// 맞히면 그 단어를 영어로 읽어 준다. 한 판에 5문제.
// 레벨은 저절로 올라가지 않는다 (아이에게 맞는 레벨을 계속 복습, 바꿀 때는 위쪽 레벨 표시를 눌러 고른다).
// 단어는 한 번도 안 나왔거나 가장 오래전에 나온 것부터 나온다 (Store.wordsSeen).
(function (root) {
  const COLORS = ['#FF8A3D', '#4FAEF2', '#7BC67E'];
  const S = {
    level: 1, qi: 0, round: [], used: null, misses: 0, pairs: [], selected: null, drag: null,
    busy: false, timers: [], onEnd: null, active: false,
  };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };

  function init(onEnd) {
    S.onEnd = onEnd;
    $('words-new').addEventListener('click', () => { Sound.tap(); start({}); });
    const board = $('words-board');
    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', cancelDrag);
    root.addEventListener('resize', () => { if (S.active) drawLines(); });
  }

  function start(opts) {
    opts = opts || {};
    stop();
    S.active = true;
    S.level = Core.clamp(opts.level || Store.get('wordsLevel') || 1, 1, Words.MAX_LEVEL);
    S.qi = 0;
    S.misses = 0;
    S.used = new Set();
    $('words-level').textContent = `Level ${S.level} · ${Core.levelName(S.level)} ▾`;
    next();
    if (opts.demo === 'wordsplay') autoPlay();
  }

  function stop() {
    S.active = false;
    S.timers.forEach(clearTimeout);
    S.timers = [];
    S.busy = false;
    S.drag = null;
  }

  // 다음 문제
  function next() {
    const seen = Store.get('wordsSeen') || {};
    let tick = Store.get('wordsTick') || 0;
    S.round = Words.pickRound(S.level, seen, Math.random, S.used);
    for (const x of S.round) { S.used.add(x.w); seen[x.w] = tick++; }
    Store.set('wordsSeen', seen);
    Store.set('wordsTick', tick);
    S.pairs = [];
    S.selected = null;
    S.busy = false;
    $('words-dots').innerHTML = Array.from({ length: Words.ROUNDS }, (_, i) => `<span class="dot${i < S.qi ? ' on' : ''}"></span>`).join('');

    const left = $('words-left'), right = $('words-right');
    left.innerHTML = '';
    right.innerHTML = '';
    // 단어 순서와 그림 순서를 따로 섞는다 (같은 줄에 정답이 오지 않게)
    const words = shuffle(S.round.slice());
    let pics = shuffle(S.round.slice());
    for (let k = 0; k < 6 && pics.some((p, i) => p === words[i]); k++) pics = shuffle(S.round.slice());
    words.forEach((x) => {
      const b = document.createElement('button');
      b.className = 'wcard word';
      b.dataset.w = x.w;
      b.dataset.side = 'L';
      b.innerHTML = `<span class="txt">${x.w}</span><span class="knob"></span>`;
      if (x.w.length >= 9) b.classList.add('long');
      left.appendChild(b);
    });
    pics.forEach((x) => {
      const b = document.createElement('button');
      b.className = 'wcard pic';
      b.dataset.w = x.w;
      b.dataset.side = 'R';
      b.setAttribute('aria-label', 'picture');
      b.innerHTML = `<span class="knob"></span><img src="assets/words/${x.file}.svg" alt="" draggable="false">`;
      right.appendChild(b);
    });
    drawLines();
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- 줄 ----------
  // 카드의 연결점(단어는 오른쪽, 그림은 왼쪽) 위치 (판 기준)
  function knobOf(card) {
    const base = $('words-board').getBoundingClientRect();
    const r = card.querySelector('.knob').getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
  }

  function boardPoint(e) {
    const base = $('words-board').getBoundingClientRect();
    return { x: e.clientX - base.left, y: e.clientY - base.top };
  }

  const line = (a, b, color, cls) => `<line class="${cls || ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="10" stroke-linecap="round"/>`;

  function drawLines(tempTo) {
    const svg = $('words-lines');
    const box = $('words-board').getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    let html = '';
    for (const p of S.pairs) html += line(knobOf(p.word), knobOf(p.pic), p.color);
    if (S.drag && tempTo) html += line(knobOf(S.drag.card), tempTo, '#B9A8C9', 'temp');
    svg.innerHTML = html;
  }

  // ---------- 손가락 ----------
  const cardAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el && el.closest('#words-board .wcard');
  };

  function onDown(e) {
    const card = e.target.closest('.wcard');
    if (!card || S.busy || card.classList.contains('done')) return;
    Sound.unlock();
    Sound.tap();
    // 이미 다른 쪽 카드를 골라 두었으면 바로 잇기
    if (S.selected && S.selected.dataset.side !== card.dataset.side) {
      const from = S.selected;
      select(null);
      return attempt(from, card);
    }
    select(card);
    S.drag = { card, id: e.pointerId, moved: false, x: e.clientX, y: e.clientY };
    try { $('words-board').setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
  }

  function onMove(e) {
    if (!S.drag || e.pointerId !== S.drag.id) return;
    if (Math.hypot(e.clientX - S.drag.x, e.clientY - S.drag.y) > 10) S.drag.moved = true;
    if (S.drag.moved) drawLines(boardPoint(e));
  }

  function onUp(e) {
    if (!S.drag || e.pointerId !== S.drag.id) return;
    const from = S.drag.card, moved = S.drag.moved;
    S.drag = null;
    drawLines();
    if (!moved) return; // 눌렀다 뗌: 고른 채로 두고 다음에 누르는 카드와 잇는다
    const target = cardAt(e.clientX, e.clientY);
    if (target && target.dataset.side !== from.dataset.side && !target.classList.contains('done')) {
      select(null);
      attempt(from, target);
    }
  }

  function cancelDrag() {
    S.drag = null;
    drawLines();
  }

  function select(card) {
    if (S.selected) S.selected.classList.remove('selected');
    S.selected = card;
    if (card) card.classList.add('selected');
  }

  function attempt(a, b) {
    if (a.classList.contains('done') || b.classList.contains('done')) return;
    const word = a.dataset.side === 'L' ? a : b, pic = word === a ? b : a;
    if (word.dataset.w === pic.dataset.w) {
      const color = COLORS[S.pairs.length % COLORS.length];
      S.pairs.push({ word, pic, color });
      for (const c of [word, pic]) {
        c.classList.add('done');
        c.style.setProperty('--pair', color);
      }
      drawLines();
      Sound.found();
      Sound.say(word.dataset.w);
      if (S.pairs.length === S.round.length) {
        S.busy = true;
        S.qi++;
        $('words-dots').querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('on', i < S.qi));
        later(() => (S.qi >= Words.ROUNDS ? finish() : next()), 1300);
      }
    } else {
      S.misses++;
      Sound.miss();
      for (const c of [word, pic]) {
        c.classList.remove('shake');
        void c.offsetWidth;
        c.classList.add('shake');
      }
    }
  }

  function finish() {
    S.onEnd('words', 0);
  }

  // 자가 점검용: 문제마다 한 번은 틀리게, 나머지는 끌어서(첫 짝) / 차례로 눌러서(나머지) 잇는다
  function autoPlay() {
    const pt = (el) => { const r = el.getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, bubbles: true }; };
    const fire = (el, type, p) => el.dispatchEvent(new PointerEvent(type, p));
    const tick = () => {
      if (!S.active) return;
      if (!S.busy && !S.drag) {
        const words = Array.from(document.querySelectorAll('#words-left .wcard:not(.done)'));
        const pics = Array.from(document.querySelectorAll('#words-right .wcard:not(.done)'));
        if (words.length) {
          const w = words[0];
          const right = pics.find((p) => p.dataset.w === w.dataset.w);
          const wrong = pics.find((p) => p.dataset.w !== w.dataset.w);
          if (words.length === 3 && wrong && !w.dataset.tried) {
            w.dataset.tried = 1; // 틀리게 한 번: 누르고 → 다른 그림 누르기
            fire(w, 'pointerdown', pt(w)); fire(w, 'pointerup', pt(w));
            fire(wrong, 'pointerdown', pt(wrong));
          } else if (words.length === 3) {
            // 끌어서 잇기
            const a = pt(w), b = pt(right);
            fire(w, 'pointerdown', a);
            fire(w, 'pointermove', Object.assign({}, a, { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }));
            fire(w, 'pointerup', b);
          } else {
            fire(w, 'pointerdown', pt(w)); fire(w, 'pointerup', pt(w));
            fire(right, 'pointerdown', pt(right));
          }
        }
      }
      setTimeout(tick, 450);
    };
    setTimeout(tick, 600);
  }

  root.WordsGame = { init, start, stop, MAX_LEVEL: Words.MAX_LEVEL };
})(typeof self !== 'undefined' ? self : this);
