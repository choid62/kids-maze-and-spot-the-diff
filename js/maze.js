// 미로 생성기: 재귀적 백트래킹(DFS). 길이 정확히 하나인 "완전 미로"를 만든다.
(function (root) {
  const Core = typeof module !== 'undefined' && module.exports ? require('./core.js') : root.Core;

  // 벽 비트: 북1 동2 남4 서8
  const N = 1, E = 2, S = 4, W = 8;
  const DIRS = [
    { dx: 0, dy: -1, bit: N, opp: S },
    { dx: 1, dy: 0, bit: E, opp: W },
    { dx: 0, dy: 1, bit: S, opp: N },
    { dx: -1, dy: 0, bit: W, opp: E },
  ];

  function generate(cols, rows, seed) {
    const rng = Core.makeRng(seed);
    const walls = new Array(cols * rows).fill(N | E | S | W);
    const visited = new Uint8Array(cols * rows);
    const stack = [0];
    visited[0] = 1;
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const x = cur % cols, y = (cur / cols) | 0;
      const options = DIRS.filter((d) => {
        const nx = x + d.dx, ny = y + d.dy;
        return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited[ny * cols + nx];
      });
      if (!options.length) {
        stack.pop();
        continue;
      }
      const d = rng.pick(options);
      const next = (y + d.dy) * cols + (x + d.dx);
      walls[cur] &= ~d.bit;
      walls[next] &= ~d.opp;
      visited[next] = 1;
      stack.push(next);
    }
    return { cols, rows, walls, start: { x: 0, y: 0 }, goal: { x: cols - 1, y: rows - 1 }, seed };
  }

  function canMove(maze, x, y, dx, dy) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= maze.cols || ny >= maze.rows) return false;
    const d = DIRS.find((o) => o.dx === dx && o.dy === dy);
    if (!d) return false;
    return (maze.walls[y * maze.cols + x] & d.bit) === 0;
  }

  // 시작점에서 도착점까지의 길
  function solve(maze) {
    return pathBetween(maze, maze.start, maze.goal);
  }

  // 두 칸 사이의 최단 길 (BFS). 양 끝 칸 포함.
  function pathBetween(maze, from, to) {
    const { cols, rows } = maze;
    const prev = new Int32Array(cols * rows).fill(-1);
    const startIdx = from.y * cols + from.x;
    const goalIdx = to.y * cols + to.x;
    const queue = [startIdx];
    prev[startIdx] = startIdx;
    while (queue.length) {
      const cur = queue.shift();
      if (cur === goalIdx) break;
      const x = cur % cols, y = (cur / cols) | 0;
      for (const d of DIRS) {
        if (!canMove(maze, x, y, d.dx, d.dy)) continue;
        const n = (y + d.dy) * cols + (x + d.dx);
        if (prev[n] !== -1) continue;
        prev[n] = cur;
        queue.push(n);
      }
    }
    if (prev[goalIdx] === -1) return null;
    const path = [];
    for (let c = goalIdx; ; c = prev[c]) {
      path.push({ x: c % cols, y: (c / cols) | 0 });
      if (c === startIdx) break;
    }
    return path.reverse();
  }

  const MAX_LEVEL = 10;

  // 레벨별 크기. 짧은 변 기준 4칸(레벨 1)부터 13칸(레벨 10)까지.
  // aspect = 화면 높이 / 너비
  function dimsForLevel(level, aspect) {
    const n = Core.clamp(3 + (level | 0), 4, 3 + MAX_LEVEL);
    const a = aspect > 0 ? aspect : 1;
    if (a >= 1) return { cols: n, rows: Core.clamp(Math.round(n * a), n, 24) };
    return { cols: Core.clamp(Math.round(n / a), n, 24), rows: n };
  }

  const Maze = { generate, canMove, solve, pathBetween, dimsForLevel, MAX_LEVEL, N, E, S, W };
  if (typeof module !== 'undefined' && module.exports) module.exports = Maze;
  else root.Maze = Maze;
})(typeof self !== 'undefined' ? self : this);
