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
    // 길 파기는 아무 칸에서나 시작 (늘 같은 구석에서 시작하면 길 모양이 한쪽으로 치우친다)
    const first = rng.int(cols * rows);
    const stack = [first];
    visited[first] = 1;
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
    const maze = { cols, rows, walls, seed };
    // 출발: 가장자리 칸 중 아무 데나. 도착: 출발에서 길로 가장 먼 칸.
    // 길이 하나뿐인 미로에서 가장 먼 칸은 늘 막다른 끝이라, 도착점 너머로 이어지는 쓸데없는 길이 없다.
    const border = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) border.push({ x, y });
    }
    maze.start = rng.pick(border);
    const dist = distances(maze, maze.start);
    const far = Math.max(...dist);
    const goals = [];
    dist.forEach((d, i) => { if (d === far) goals.push({ x: i % cols, y: (i / cols) | 0 }); });
    maze.goal = rng.pick(goals);
    return maze;
  }

  // 한 칸에서 모든 칸까지 길로 몇 걸음인지
  function distances(maze, from) {
    const { cols, rows } = maze;
    const dist = new Array(cols * rows).fill(-1);
    dist[from.y * cols + from.x] = 0;
    const queue = [from.y * cols + from.x];
    while (queue.length) {
      const cur = queue.shift();
      const x = cur % cols, y = (cur / cols) | 0;
      for (const d of DIRS) {
        if (!canMove(maze, x, y, d.dx, d.dy)) continue;
        const n = (y + d.dy) * cols + (x + d.dx);
        if (dist[n] < 0) { dist[n] = dist[cur] + 1; queue.push(n); }
      }
    }
    return dist;
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

  const Maze = { generate, canMove, solve, pathBetween, distances, dimsForLevel, MAX_LEVEL, N, E, S, W };
  if (typeof module !== 'undefined' && module.exports) module.exports = Maze;
  else root.Maze = Maze;
})(typeof self !== 'undefined' ? self : this);
