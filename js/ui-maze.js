// 미로 화면: 캐릭터를 손가락으로 끌어 목표까지 데려간다.
(function (root) {
  const THEMES = [
    { bg: '#E6F6E1', floor: '#FFFFFF', wall: '#4CAF50', trail: '#FFC46B', player: 'rabbit_face', goal: 'carrot' },
    { bg: '#FFF4D6', floor: '#FFFFFF', wall: '#F2A900', trail: '#8FD3FF', player: 'honeybee', goal: 'blossom' },
    { bg: '#DDF1FF', floor: '#FFFFFF', wall: '#2A8BD8', trail: '#FFB199', player: 'tropical_fish', goal: 'spiral_shell' },
    { bg: '#F3E6FA', floor: '#FFFFFF', wall: '#9C4DCC', trail: '#9EE0A0', player: 'automobile', goal: 'house' },
    { bg: '#FFF0E0', floor: '#FFFFFF', wall: '#E07B39', trail: '#B7E07B', player: 'baby_chick', goal: 'ear_of_corn' },
    { bg: '#E4E2FA', floor: '#FFFFFF', wall: '#4B3FA8', trail: '#FFD66B', player: 'rocket', goal: 'ringed_planet' },
  ];
  const MAX_LEVEL = Maze.MAX_LEVEL;
  // 좌우 방향이 있는 캐릭터는 가는 쪽을 바라본다 (그림이 원래 보는 방향: 1 오른쪽, -1 왼쪽)
  const FACING = {};

  const S = {
    active: false, canvas: null, ctx: null, maze: null, theme: null,
    trail: [], pos: { x: 0, y: 0 }, facing: 1, grabbing: false, won: false,
    lastBump: 0, nudgeUntil: 0, L: null, dpr: 1, raf: 0, onWin: null, t0: 0,
  };

  function init(onWin) {
    S.onWin = onWin;
    S.canvas = document.getElementById('maze-canvas');
    S.ctx = S.canvas.getContext('2d');
    const c = S.canvas;
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onUp);
    document.getElementById('maze-new').addEventListener('click', () => { Sound.tap(); start({}); });
  }

  function start(opts) {
    opts = opts || {};
    const level = Core.clamp(opts.level || Store.get('mazeLevel') || 1, 1, MAX_LEVEL);
    const seed = opts.seed != null ? opts.seed : Core.newSeed();
    const rng = Core.makeRng(seed ^ 0x9e3779b9);
    S.theme = THEMES[opts.theme != null ? opts.theme % THEMES.length : rng.int(THEMES.length)];
    const box = S.canvas.parentElement.getBoundingClientRect();
    const dims = Maze.dimsForLevel(level, box.height / Math.max(1, box.width));
    S.maze = Maze.generate(dims.cols, dims.rows, seed);
    S.trail = [{ x: 0, y: 0 }];
    S.facing = 1;
    S.won = false;
    S.grabbing = false;
    if (opts.demo === 'solve' || opts.demo === 'win') {
      const p = Maze.solve(S.maze);
      S.trail = opts.demo === 'win' ? p : p.slice(0, Math.ceil(p.length * 0.6));
    }
    const end = S.trail[S.trail.length - 1];
    S.pos = { x: end.x, y: end.y };
    S.t0 = performance.now();
    S.nudgeUntil = S.t0 + 1500; // 처음에 캐릭터를 살짝 흔들어 어디서 시작하는지 알려 준다
    document.getElementById('maze-level').textContent = `레벨 ${level} · ${Core.levelName(level)} ▾`;
    relayout();
    S.active = true;
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(frame);
    if (opts.demo === 'win') win();
    if (opts.demo === 'drag') setTimeout(autoDrag, 300);
  }

  // 자가 점검용: 손가락으로 풀이를 따라 끄는 동작을 흉내 낸다 (2칸씩 건너뛰며)
  function autoDrag() {
    const path = Maze.solve(S.maze);
    const r = S.canvas.getBoundingClientRect();
    const fire = (type, c) => {
      const p = center(c);
      S.canvas.dispatchEvent(new PointerEvent(type, { clientX: r.left + p.x, clientY: r.top + p.y, pointerId: 1, bubbles: true }));
    };
    fire('pointerdown', path[0]);
    path.forEach((c, i) => { if (i % 2 === 0 || i === path.length - 1) fire('pointermove', c); });
    fire('pointerup', path[path.length - 1]);
  }

  function stop() {
    S.active = false;
    cancelAnimationFrame(S.raf);
  }

  function relayout() {
    if (!S.maze) return;
    const box = S.canvas.parentElement.getBoundingClientRect();
    S.dpr = Math.min(root.devicePixelRatio || 1, 3);
    S.canvas.width = Math.round(box.width * S.dpr);
    S.canvas.height = Math.round(box.height * S.dpr);
    const pad = 14;
    const { cols, rows } = S.maze;
    const cell = Math.floor(Math.min((box.width - pad * 2) / cols, (box.height - pad * 2) / rows));
    S.L = {
      w: box.width, h: box.height, cell,
      ox: Math.round((box.width - cell * cols) / 2),
      oy: Math.round((box.height - cell * rows) / 2),
    };
  }

  const center = (c) => ({ x: S.L.ox + (c.x + 0.5) * S.L.cell, y: S.L.oy + (c.y + 0.5) * S.L.cell });

  function frame(now) {
    if (!S.active) return;
    const end = S.trail[S.trail.length - 1];
    S.pos.x += (end.x - S.pos.x) * 0.35;
    S.pos.y += (end.y - S.pos.y) * 0.35;
    render(now);
    S.raf = requestAnimationFrame(frame);
  }

  function render(now) {
    const { ctx, maze, theme, L } = S;
    const { cell, ox, oy } = L;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, L.w, L.h);

    ctx.fillStyle = theme.floor;
    Draw.rrect(ctx, ox - 4, oy - 4, cell * maze.cols + 8, cell * maze.rows + 8, cell * 0.25);
    ctx.fill();

    // 지나온 길
    if (S.trail.length > 1) {
      ctx.strokeStyle = theme.trail;
      ctx.lineWidth = cell * 0.36;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      S.trail.forEach((c, i) => {
        const p = i === S.trail.length - 1 ? center(S.pos) : center(c);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // 벽
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = Math.max(4, cell * 0.15);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        const w = maze.walls[y * maze.cols + x];
        const x0 = ox + x * cell, y0 = oy + y * cell;
        if (w & Maze.N) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + cell, y0); }
        if (w & Maze.W) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + cell); }
        if (x === maze.cols - 1 && w & Maze.E) { ctx.moveTo(x0 + cell, y0); ctx.lineTo(x0 + cell, y0 + cell); }
        if (y === maze.rows - 1 && w & Maze.S) { ctx.moveTo(x0, y0 + cell); ctx.lineTo(x0 + cell, y0 + cell); }
      }
    }
    ctx.stroke();

    // 목표 (통통 튄다)
    const g = center(maze.goal);
    const bounce = S.won ? 0 : Math.sin(now / 300) * cell * 0.05;
    Draw.object(ctx, theme.goal, g.x, g.y + bounce, cell * 0.78, theme.goalColor);

    // 캐릭터
    const p = center(S.pos);
    let wiggle = 0;
    if (now < S.nudgeUntil) {
      wiggle = Math.sin(now / 60) * cell * 0.06;
      ctx.fillStyle = 'rgba(255,200,80,0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, cell * (0.5 + 0.08 * Math.sin(now / 120)), 0, Math.PI * 2);
      ctx.fill();
    }
    const flip = FACING[theme.player] ? S.facing !== FACING[theme.player] : false;
    Draw.object(ctx, theme.player, p.x + wiggle, p.y, cell * (S.grabbing ? 0.92 : 0.84), theme.playerColor, flip);
  }

  function local(e) {
    const r = S.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (!S.active || S.won) return;
    Sound.unlock();
    const p = local(e);
    const c = center(S.trail[S.trail.length - 1]);
    if (Math.hypot(p.x - c.x, p.y - c.y) < S.L.cell * 1.4) {
      S.grabbing = true;
      try { S.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
      moveToward(p);
    } else {
      // 캐릭터가 아닌 곳을 누르면 캐릭터를 흔들어 "여기서 시작해" 하고 알려 준다
      S.nudgeUntil = performance.now() + 900;
    }
  }

  function onMove(e) {
    if (S.grabbing && !S.won) moveToward(local(e));
  }

  function onUp() {
    S.grabbing = false;
  }

  function moveToward(p) {
    const { cell, ox, oy } = S.L;
    const tx = Core.clamp(Math.floor((p.x - ox) / cell), 0, S.maze.cols - 1);
    const ty = Core.clamp(Math.floor((p.y - oy) / cell), 0, S.maze.rows - 1);
    const seen = new Set();
    // 손가락까지 미로 안에서 거의 곧장 갈 수 있으면 그 길을 따라간다 (대각선으로 빨리 끌어도 옆길로 새지 않게)
    const cur0 = S.trail[S.trail.length - 1];
    const route = Maze.pathBetween(S.maze, cur0, { x: tx, y: ty });
    if (route && route.length - 1 <= Math.abs(tx - cur0.x) + Math.abs(ty - cur0.y) + 2) {
      for (let i = 1; i < route.length && !S.won; i++) {
        const cur = S.trail[S.trail.length - 1];
        step([route[i].x - cur.x, route[i].y - cur.y], seen);
      }
      return;
    }
    for (let guard = 0; guard < 40 && !S.won; guard++) {
      const cur = S.trail[S.trail.length - 1];
      seen.add(cur.x + ',' + cur.y);
      if (cur.x === tx && cur.y === ty) return;
      const dx = Math.sign(tx - cur.x), dy = Math.sign(ty - cur.y);
      const horizFirst = Math.abs(tx - cur.x) >= Math.abs(ty - cur.y);
      const first = horizFirst ? [dx, 0] : [0, dy];
      const second = horizFirst ? (dy ? [0, dy] : null) : (dx ? [dx, 0] : null);
      if (step(first, seen) || (second && step(second, seen))) continue;
      bump();
      return;
    }
  }

  function step(d, seen) {
    const cur = S.trail[S.trail.length - 1];
    if (!Maze.canMove(S.maze, cur.x, cur.y, d[0], d[1])) return false;
    const next = { x: cur.x + d[0], y: cur.y + d[1] };
    if (seen.has(next.x + ',' + next.y)) return false;
    const prev = S.trail[S.trail.length - 2];
    if (prev && prev.x === next.x && prev.y === next.y) S.trail.pop(); // 되돌아가면 길을 지운다
    else S.trail.push(next);
    if (d[0]) S.facing = d[0];
    Sound.step();
    if (next.x === S.maze.goal.x && next.y === S.maze.goal.y) win();
    return true;
  }

  function bump() {
    const now = performance.now();
    if (now - S.lastBump > 450) {
      S.lastBump = now;
      Sound.bump();
    }
  }

  function win() {
    if (S.won) return;
    S.won = true;
    S.grabbing = false;
    const lv = Store.get('mazeLevel') || 1;
    const up = lv < MAX_LEVEL;
    if (up) Store.set('mazeLevel', lv + 1);
    setTimeout(() => { if (S.active) S.onWin('maze', up ? lv + 1 : 0); }, 450);
  }

  root.MazeGame = { init, start, stop, relayout: () => { if (S.active) relayout(); }, MAX_LEVEL, THEMES };
})(typeof self !== 'undefined' ? self : this);
