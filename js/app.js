// 화면 전환, 홈, 축하, 스티커 북, 부모 설정
(function (root) {
  const $ = (id) => document.getElementById(id);
  const SCREENS = ['home', 'maze', 'spot', 'hidden', 'memo', 'pattern', 'chop', 'coco', 'stickers'];
  // [화면 글자, 영어 목소리]
  const CHEERS = [['잘했어!', 'Good job!'], ['최고야!', 'Awesome!'], ['대단해!', 'Amazing!'], ['멋져!', 'Great!'], ['해냈다!', 'You did it!']];
  const STICKER_KINDS = Object.keys(EMOJI);
  let current = null;

  // 주소의 ?seed=...&level=...&demo=... 는 테스트용 (처음 한 번만 적용)
  const q = new URLSearchParams(location.search);
  let debugOpts = {
    seed: q.has('seed') ? Number(q.get('seed')) >>> 0 : undefined,
    level: q.has('level') ? Number(q.get('level')) : undefined,
    theme: q.has('theme') ? (isNaN(Number(q.get('theme'))) ? q.get('theme') : Number(q.get('theme'))) : undefined,
    demo: q.get('demo') || undefined,
  };

  function route() {
    const h = location.hash.replace('#', '');
    return SCREENS.includes(h) ? h : 'home';
  }

  function show(name) {
    if (current === 'maze' && name !== 'maze') MazeGame.stop();
    if (current === 'spot' && name !== 'spot') SpotGame.stop();
    if (current === 'chop' && name !== 'chop') ChopGame.stop();
    if (current === 'coco' && name !== 'coco') CocoGame.stop();
    if (current === 'memo' && name !== 'memo') MemoGame.stop();
    if (current === 'hidden' && name !== 'hidden') HiddenGame.stop();
    if (current === 'pattern' && name !== 'pattern') PatternGame.stop();
    hide('celebrate');
    hide('levels');
    for (const s of SCREENS) $('screen-' + s).classList.toggle('active', s === name);
    current = name;
    const opts = debugOpts || {};
    debugOpts = null;
    if (name === 'maze') MazeGame.start(opts);
    else if (name === 'chop') ChopGame.enter(opts);
    else if (name === 'coco') CocoGame.enter(opts);
    else if (name === 'memo') MemoGame.enter(opts);
    else if (name === 'hidden') HiddenGame.start(opts);
    else if (name === 'pattern') PatternGame.start(opts);
    else if (name === 'spot') SpotGame.start(opts);
    else if (name === 'stickers') renderStickers();
    else renderHome();
  }

  function go(name) {
    if (route() === name && location.hash) show(name);
    else location.hash = name;
  }

  function hide(id) { $(id).classList.add('hidden'); }
  function open(id) { $(id).classList.remove('hidden'); }

  // ---------- 홈 ----------
  function sizeCanvas(c) {
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    // clientWidth는 회전 애니메이션의 영향을 받지 않는다
    const w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function renderHome() {
    $('star-count').textContent = Store.get('stickers').length;
    $('home-maze-level').textContent = '레벨 ' + Store.get('mazeLevel');
    $('home-spot-level').textContent = '레벨 ' + Store.get('spotLevel');
    $('home-hidden-level').textContent = '레벨 ' + Store.get('hiddenLevel');
    $('home-memo-level').textContent = '레벨 ' + Store.get('memoLevel');
    $('home-pattern-level').textContent = '레벨 ' + Store.get('patternLevel');
    $('chop-art').innerHTML = ChopGame.handSVG(2, true) + ChopGame.handSVG(3, false);
    document.querySelectorAll('canvas.btn-art').forEach((c) => {
      const { ctx, w, h } = sizeCanvas(c);
      if (c.dataset.art === 'maze') drawMazeArt(ctx, w, h);
      else if (c.dataset.art === 'memo') drawMemoArt(ctx, w, h);
      else if (c.dataset.art === 'hidden') drawHiddenArt(ctx, w, h);
      else if (c.dataset.art === 'pattern') drawPatternArt(ctx, w, h);
      else if (c.dataset.art === 'coco') Draw.object(ctx, 'coconut', w / 2, h / 2, w * 0.72, null, false, { recolor: { '#D3D3D3': '#FFFFFF', '#9B9B9B': '#FFF6E6' } });
      else drawSpotArt(ctx, w, h);
    });
  }

  function drawMazeArt(ctx, w, h) {
    const m = Maze.generate(4, 4, 11);
    const pad = w * 0.1, cell = (w - pad * 2) / 4;
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = cell * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const wl = m.walls[y * 4 + x], x0 = pad + x * cell, y0 = pad + y * cell;
      if (wl & Maze.N) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + cell, y0); }
      if (wl & Maze.W) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + cell); }
      if (x === 3 && wl & Maze.E) { ctx.moveTo(x0 + cell, y0); ctx.lineTo(x0 + cell, y0 + cell); }
      if (y === 3 && wl & Maze.S) { ctx.moveTo(x0, y0 + cell); ctx.lineTo(x0 + cell, y0 + cell); }
    }
    ctx.stroke();
    Draw.object(ctx, 'rabbit_face', pad + cell * (m.start.x + 0.5), pad + cell * (m.start.y + 0.5), cell * 0.85);
    Draw.object(ctx, 'carrot', pad + cell * (m.goal.x + 0.5), pad + cell * (m.goal.y + 0.5), cell * 0.8);
  }

  // 짝 맞추기: 뒤집힌 카드 하나와 그림 카드 하나
  function drawMemoArt(ctx, w, h) {
    const cw = w * 0.36, ch = h * 0.5, y = (h - ch) / 2;
    ctx.fillStyle = '#FF9F5A';
    Draw.rrect(ctx, w * 0.1, y, cw, ch, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(cw * 0.5) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w * 0.1 + cw / 2, h / 2);
    ctx.fillStyle = '#FFF4E6';
    ctx.strokeStyle = '#FF9F5A';
    ctx.lineWidth = 3;
    Draw.rrect(ctx, w * 0.54, y, cw, ch, 8);
    ctx.fill();
    ctx.stroke();
    Draw.object(ctx, 'cat', w * 0.54 + cw / 2, h / 2, cw * 0.8);
  }

  // 숨은그림: 돋보기 너머의 무당벌레
  function drawHiddenArt(ctx, w, h) {
    Draw.object(ctx, 'lady_beetle', w * 0.42, h * 0.42, w * 0.38);
    ctx.strokeStyle = '#4a3b35';
    ctx.lineWidth = w * 0.06;
    ctx.beginPath();
    ctx.arc(w * 0.42, h * 0.42, w * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = w * 0.1;
    ctx.beginPath();
    ctx.moveTo(w * 0.61, h * 0.61);
    ctx.lineTo(w * 0.82, h * 0.82);
    ctx.stroke();
  }

  // 다음은?: 사과 바나나 사과 ?
  function drawPatternArt(ctx, w, h) {
    const s = w * 0.26;
    Draw.object(ctx, 'red_apple', w * 0.2, h * 0.36, s);
    Draw.object(ctx, 'banana', w * 0.5, h * 0.36, s);
    Draw.object(ctx, 'red_apple', w * 0.8, h * 0.36, s);
    ctx.fillStyle = '#9B6BD6';
    ctx.font = 'bold ' + Math.round(h * 0.34) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w * 0.5, h * 0.76);
  }

  function drawSpotArt(ctx, w, h) {
    const bw = w * 0.4, bh = h * 0.56, y = (h - bh) / 2;
    [[w * 0.07, {}], [w * 0.53, { hue: 150 }]].forEach(([x, mods]) => {
      ctx.fillStyle = '#E3F6FF';
      Draw.rrect(ctx, x, y, bw, bh, 8);
      ctx.fill();
      ctx.strokeStyle = '#B0D8F0';
      ctx.lineWidth = 2;
      ctx.stroke();
      Draw.object(ctx, 'lady_beetle', x + bw / 2, y + bh / 2, bh * 0.75, null, false, mods);
    });
  }

  // ---------- 축하 ----------
  // opts: { text 직접 정한 말(화면), speech 영어 목소리, noSticker 스티커 없음, sad 진 경우(빵빠레와 꽃가루 없음) }
  function celebrate(game, newLevel, opts) {
    opts = opts || {};
    const sticker = opts.noSticker ? null : { kind: STICKER_KINDS[Math.floor(Math.random() * STICKER_KINDS.length)] };
    if (sticker) Store.addSticker(sticker);

    const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    const text = opts.text || cheer[0];
    const speech = opts.text ? opts.speech : cheer[1]; // 목소리는 영어
    $('cheer-text').textContent = text;
    $('levelup').classList.toggle('hidden', !newLevel);
    if (newLevel) $('levelup').textContent = `레벨 업! 이제 레벨 ${newLevel}`;
    open('celebrate');
    $('sticker-prize').classList.toggle('hidden', !sticker);
    if (sticker) {
      const { ctx, w, h } = sizeCanvas($('sticker-prize'));
      ctx.clearRect(0, 0, w, h);
      Draw.object(ctx, sticker.kind, w / 2, h / 2, w * 0.8, null, false, sticker);
    }
    $('celebrate').dataset.game = game;
    if (!opts.sad) { Sound.win(); confetti(); }
    if (speech) setTimeout(() => Sound.say(speech), 500);
  }

  let confettiRaf = 0;
  function confetti() {
    const c = $('confetti');
    const { ctx, w, h } = sizeCanvas(c);
    const colors = ['#FFD23F', '#FF8FC7', '#5BC266', '#3FA7F5', '#FF9F1C', '#A06CD5'];
    const parts = Array.from({ length: 120 }, () => ({
      x: Math.random() * w, y: -20 - Math.random() * h * 0.5,
      vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
      a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
      s: 6 + Math.random() * 6, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    cancelAnimationFrame(confettiRaf);
    const tick = (now) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.a += p.va;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (now - t0 < 3500 && !$('celebrate').classList.contains('hidden')) confettiRaf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    confettiRaf = requestAnimationFrame(tick);
  }

  // ---------- 스티커 북 ----------
  function renderStickers() {
    const grid = $('sticker-grid');
    grid.innerHTML = '';
    const list = Store.get('stickers').slice().reverse().slice(0, 300);
    $('sticker-empty').classList.toggle('hidden', list.length > 0);
    $('sticker-total').textContent = Store.get('stickers').length;
    for (const s of list) {
      const c = document.createElement('canvas');
      grid.appendChild(c);
      const { ctx, w, h } = sizeCanvas(c);
      Draw.object(ctx, s.kind, w / 2, h / 2, w * 0.78, s.color, false, s);
    }
  }

  // ---------- 레벨 고르기 ----------
  const TIERS = [[3, '쉬움', 't1'], [6, '보통', 't2'], [8, '어려움', 't3'], [10, '아주 어려움', 't4'], [15, '최고', 't5']];
  const tierOf = (lv) => TIERS.find((t) => lv <= t[0]);

  // 레벨이 있는 놀이: 저장 이름, 최고 레벨, 이름, 레벨을 고른 뒤 할 일
  const LEVEL_GAMES = {
    maze: { key: 'mazeLevel', max: () => MazeGame.MAX_LEVEL, name: '미로', go: () => MazeGame.start({}) },
    spot: { key: 'spotLevel', max: () => SpotGame.MAX_LEVEL, name: '틀린그림', go: () => SpotGame.start({}) },
    hidden: { key: 'hiddenLevel', max: () => Hidden.MAX_LEVEL, name: '숨은그림', go: () => HiddenGame.start({}) },
    memo: { key: 'memoLevel', max: () => Memory.MAX_LEVEL, name: '짝 맞추기', go: () => MemoGame.startSolo() },
    pattern: { key: 'patternLevel', max: () => Pattern.MAX_LEVEL, name: '다음은?', go: () => PatternGame.start({}) },
  };

  function openLevels(game) {
    const info = LEVEL_GAMES[game];
    const key = info.key;
    const max = info.max();
    const now = Store.get(key);
    $('levels-title').textContent = info.name + ' 레벨 고르기';
    const grid = $('level-grid');
    grid.innerHTML = '';
    for (let lv = 1; lv <= max; lv++) {
      const btn = document.createElement('button');
      btn.className = 'lv ' + tierOf(lv)[2] + (lv === now ? ' now' : '');
      btn.textContent = lv;
      btn.addEventListener('click', () => {
        Store.set(key, lv);
        hide('levels');
        Sound.tap();
        info.go();
      });
      grid.appendChild(btn);
    }
    // 이 게임에 있는 구간만 보여 준다 (구간의 첫 레벨이 최고 레벨 이하)
    $('level-legend').innerHTML = TIERS.filter((t, i) => (i ? TIERS[i - 1][0] + 1 : 1) <= max)
      .map((t) => `<span class="chip ${t[2]}">${t[1]}</span>`).join('');
    open('levels');
  }

  root.App = { openLevels };

  // ---------- 부모 잠금 + 설정 ----------
  function openGate() {
    const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
    const answer = a + b;
    $('gate-q').textContent = `${a} + ${b} = ?`;
    const choices = new Set([answer]);
    while (choices.size < 4) choices.add(answer + Math.floor(Math.random() * 9) - 4);
    const box = $('gate-choices');
    box.innerHTML = '';
    Array.from(choices).sort(() => Math.random() - 0.5).forEach((n) => {
      const btn = document.createElement('button');
      btn.textContent = n;
      btn.addEventListener('click', () => {
        hide('gate');
        if (n === answer) openSettings();
      });
      box.appendChild(btn);
    });
    open('gate');
  }

  function openSettings() {
    renderSettings();
    open('settings');
  }

  function renderSettings() {
    const toggle = (key) => {
      const btn = $('set-' + key);
      const on = Store.get(key);
      btn.textContent = on ? '켜짐' : '꺼짐';
      btn.className = 'pill ' + (on ? 'on' : 'off');
    };
    toggle('sound');
    toggle('voice');
    $('set-mazeLevel').textContent = Store.get('mazeLevel');
    $('set-spotLevel').textContent = Store.get('spotLevel');
    $('set-count').textContent = Store.get('stickers').length;
  }

  function bindSettings() {
    for (const key of ['sound', 'voice']) {
      $('set-' + key).addEventListener('click', () => { Store.set(key, !Store.get(key)); renderSettings(); });
    }
    const limits = { mazeLevel: MazeGame.MAX_LEVEL, spotLevel: SpotGame.MAX_LEVEL };
    document.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        Store.set(key, Core.clamp(Store.get(key) + Number(btn.dataset.step), 1, limits[key]));
        renderSettings();
      });
    });
    $('set-reset').addEventListener('click', () => {
      if (confirm('스티커와 단계를 모두 처음으로 되돌릴까요?')) {
        const sound = Store.get('sound'), voice = Store.get('voice');
        Store.reset();
        Store.set('sound', sound);
        Store.set('voice', voice);
        renderSettings();
      }
    });
    $('set-close').addEventListener('click', () => { hide('settings'); if (current === 'home') renderHome(); });
    $('gate-cancel').addEventListener('click', () => hide('gate'));
  }

  // ---------- 시작 ----------
  function boot() {
    MazeGame.init(celebrate);
    ChopGame.init(celebrate);
    CocoGame.init(celebrate);
    MemoGame.init(celebrate);
    HiddenGame.init(celebrate);
    PatternGame.init(celebrate);
    SpotGame.init(celebrate);
    bindSettings();

    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) { Sound.unlock(); Sound.tap(); go(b.dataset.go); }
    });
    $('btn-settings').addEventListener('click', openGate);
    document.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { Sound.unlock(); Sound.tap(); openLevels(b.dataset.pick); }));
    $('levels-close').addEventListener('click', () => hide('levels'));
    $('cele-home').addEventListener('click', () => { hide('celebrate'); go('home'); });
    $('cele-next').addEventListener('click', () => {
      hide('celebrate');
      Sound.tap();
      if ($('celebrate').dataset.game === 'maze') MazeGame.start({});
      else if ($('celebrate').dataset.game === 'chop') ChopGame.restart();
      else if ($('celebrate').dataset.game === 'coco') CocoGame.restart();
      else if ($('celebrate').dataset.game === 'memo') MemoGame.restart();
      else if ($('celebrate').dataset.game === 'hidden') HiddenGame.start({});
      else if ($('celebrate').dataset.game === 'pattern') PatternGame.start({});
      else SpotGame.start({});
    });

    root.addEventListener('hashchange', () => show(route()));
    let resizeTimer = 0;
    root.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        MazeGame.relayout();
        SpotGame.relayout();
        if (current === 'home') renderHome();
      }, 120);
    });

    show(route());

    // 점검용: ?demo=picker 는 레벨 고르기 창을 열고, ?demo=pick12 는 레벨 12를 누른다
    const demo = q.get('demo') || '';
    if ((demo === 'picker' || demo.startsWith('pick')) && LEVEL_GAMES[route()]) {
      openLevels(route());
      const n = Number(demo.slice(4));
      if (n) $('level-grid').children[n - 1].click();
    }

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})(typeof self !== 'undefined' ? self : this);
