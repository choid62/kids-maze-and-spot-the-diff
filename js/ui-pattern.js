// 다음에 올 것 화면: 규칙을 보고 빈칸(?)에 들어갈 그림을 고른다. 한 판에 5문제.
(function (root) {
  const S = { qs: [], qi: 0, firstTry: 0, wrong: false, busy: false, timers: [], onEnd: null, active: false };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { S.timers.push(setTimeout(f, ms)); };

  function init(onEnd) {
    S.onEnd = onEnd;
    $('pattern-opts').addEventListener('click', (e) => {
      const b = e.target.closest('.opt');
      if (b) choose(+b.dataset.i, b);
    });
    root.addEventListener('resize', () => { if (S.active && S.qs.length) show(); });
  }

  function start(opts) {
    opts = opts || {};
    stop();
    S.active = true;
    const level = Core.clamp(opts.level || Store.get('patternLevel') || 1, 1, Pattern.MAX_LEVEL);
    S.level = level;
    S.qs = Pattern.round(level, opts.seed != null ? opts.seed : Core.newSeed());
    S.qi = 0;
    S.firstTry = 0;
    $('pattern-level').textContent = `Level ${level} · ${Core.levelName(level)} ▾`;
    show();
    if (opts.demo === 'patternplay') autoPlay();
  }

  function stop() {
    S.active = false;
    S.timers.forEach(clearTimeout);
    S.timers = [];
    S.busy = false;
  }

  function faceCanvas(face, size) {
    const c = document.createElement('canvas');
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    c.width = c.height = size * dpr;
    c.style.width = c.style.height = size + 'px';
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Draw.object(ctx, face.kind, size / 2, size / 2, size * 0.86 * (face.scale || 1), null, face.flip, face);
    return c;
  }

  function show() {
    const q = S.qs[S.qi];
    S.wrong = false;
    S.busy = false;
    // 진행 점
    $('pattern-dots').innerHTML = S.qs.map((_, i) => `<span class="dot${i < S.qi ? ' on' : ''}"></span>`).join('');
    // 줄: 한 줄에 최대 5칸
    const box = $('pattern-seq').getBoundingClientRect();
    const perRow = Math.min(q.items.length, 5);
    const tile = Math.floor(Math.min(110, (box.width - 12 * (perRow + 1)) / perRow));
    const seq = $('pattern-seq');
    seq.innerHTML = '';
    q.items.forEach((f, i) => {
      const cell = document.createElement('div');
      cell.className = 'cell' + (f ? '' : ' blank');
      cell.style.width = cell.style.height = tile + 'px';
      if (f) cell.appendChild(faceCanvas(f, tile));
      else cell.textContent = '?';
      cell.dataset.i = i;
      seq.appendChild(cell);
    });
    // 보기
    const opts = $('pattern-opts');
    opts.innerHTML = '';
    const big = Math.floor(Math.min(120, (box.width - 16 * (q.options.length + 1)) / q.options.length));
    q.options.forEach((f, i) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.dataset.i = i;
      b.style.width = b.style.height = big + 'px';
      b.appendChild(faceCanvas(f, big - 16));
      opts.appendChild(b);
    });
  }

  function choose(i, btn) {
    if (S.busy) return;
    Sound.unlock();
    const q = S.qs[S.qi];
    if (i !== q.answerIndex) {
      S.wrong = true;
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
      Sound.miss();
      return;
    }
    S.busy = true;
    if (!S.wrong) S.firstTry++;
    const cell = document.querySelector('#pattern-seq .cell.blank');
    const size = cell.getBoundingClientRect().width;
    cell.classList.remove('blank');
    cell.classList.add('filled');
    cell.textContent = '';
    cell.appendChild(faceCanvas(q.answer, size));
    btn.classList.add('right');
    Sound.found();
    later(() => {
      S.qi++;
      if (S.qi < S.qs.length) return show();
      $('pattern-dots').innerHTML = S.qs.map(() => '<span class="dot on"></span>').join('');
      // 5문제 중 4문제 이상 한 번에 맞히면 레벨 업
      const lv = Store.get('patternLevel') || 1;
      const up = S.firstTry >= 4 && lv < Pattern.MAX_LEVEL;
      if (up) Store.set('patternLevel', lv + 1);
      S.onEnd('pattern', up ? lv + 1 : 0, {});
    }, 1000);
  }

  // 자가 점검용: 문제마다 한 번은 틀리게, 그다음 맞게 누른다
  function autoPlay() {
    const tick = () => {
      if (!S.active || S.qi >= S.qs.length) return;
      if (!S.busy) {
        const q = S.qs[S.qi];
        const btns = document.querySelectorAll('#pattern-opts .opt');
        const wrongI = q.options.findIndex((_, i) => i !== q.answerIndex);
        if (!S.wrong && S.qi % 2 && wrongI >= 0) btns[wrongI].click();
        else btns[q.answerIndex].click();
      }
      later(tick, 500);
    };
    later(tick, 500);
  }

  root.PatternGame = { init, start, stop };
})(typeof self !== 'undefined' ? self : this);
