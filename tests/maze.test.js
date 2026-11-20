const test = require('node:test');
const assert = require('node:assert');
const Maze = require('../js/maze.js');

test('모든 칸에 갈 수 있고 길이 하나뿐인 완전 미로다', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const cols = 4 + (seed % 6), rows = 5 + (seed % 9);
    const m = Maze.generate(cols, rows, seed);
    // 열린 통로 수 = 칸 수 - 1 이면 사이클 없는 트리
    let openings = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (Maze.canMove(m, x, y, 1, 0)) openings++;
      if (Maze.canMove(m, x, y, 0, 1)) openings++;
    }
    assert.strictEqual(openings, cols * rows - 1);
    // 모든 칸 도달 가능
    const seen = new Set(['0,0']);
    const q = [[0, 0]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (Maze.canMove(m, x, y, dx, dy) && !seen.has(k)) { seen.add(k); q.push([x + dx, y + dy]); }
      }
    }
    assert.strictEqual(seen.size, cols * rows);
  }
});

test('벽은 양쪽 칸에서 똑같이 보인다', () => {
  const m = Maze.generate(7, 9, 42);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 7; x++) {
    if (x < 6) assert.strictEqual(Maze.canMove(m, x, y, 1, 0), Maze.canMove(m, x + 1, y, -1, 0));
    if (y < 8) assert.strictEqual(Maze.canMove(m, x, y, 0, 1), Maze.canMove(m, x, y + 1, 0, -1));
  }
});

test('같은 시드는 같은 미로, 다른 시드는 대개 다른 미로', () => {
  assert.deepStrictEqual(Maze.generate(6, 8, 7).walls, Maze.generate(6, 8, 7).walls);
  assert.notDeepStrictEqual(Maze.generate(6, 8, 7).walls, Maze.generate(6, 8, 8).walls);
});

test('풀이는 시작에서 도착까지 한 칸씩 이어진다', () => {
  const m = Maze.generate(8, 12, 3);
  const p = Maze.solve(m);
  assert.deepStrictEqual(p[0], m.start);
  assert.deepStrictEqual(p[p.length - 1], m.goal);
  for (let i = 1; i < p.length; i++) {
    assert.ok(Maze.canMove(m, p[i - 1].x, p[i - 1].y, p[i].x - p[i - 1].x, p[i].y - p[i - 1].y));
  }
});

test('두 칸 사이 최단 길은 이어져 있고, 같은 칸이면 그 칸 하나', () => {
  const m = Maze.generate(9, 15, 77);
  const a = { x: 2, y: 5 }, b = { x: 6, y: 11 };
  const p = Maze.pathBetween(m, a, b);
  assert.deepStrictEqual(p[0], a);
  assert.deepStrictEqual(p[p.length - 1], b);
  for (let i = 1; i < p.length; i++) {
    assert.ok(Maze.canMove(m, p[i - 1].x, p[i - 1].y, p[i].x - p[i - 1].x, p[i].y - p[i - 1].y));
  }
  assert.deepStrictEqual(Maze.pathBetween(m, a, a), [a]);
});

test('출발은 가장자리, 도착은 출발에서 길로 가장 먼 막다른 끝', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const cols = 4 + (seed % 9), rows = 5 + (seed % 12);
    const m = Maze.generate(cols, rows, seed);
    const { x, y } = m.start;
    assert.ok(x === 0 || y === 0 || x === cols - 1 || y === rows - 1, '출발이 가장자리가 아님');
    const dist = Maze.distances(m, m.start);
    assert.strictEqual(dist[m.goal.y * cols + m.goal.x], Math.max(...dist), '도착이 가장 먼 칸이 아님');
    let open = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (Maze.canMove(m, m.goal.x, m.goal.y, dx, dy)) open++;
    assert.strictEqual(open, 1, '도착이 막다른 끝이 아님 (도착 너머로 길이 이어짐)');
  }
});

test('출발과 도착 위치는 판마다 다르고, 늘 오른쪽 아래가 아니다', () => {
  const starts = new Set(), goals = new Set();
  let bottomRight = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const m = Maze.generate(7, 11, seed);
    starts.add(m.start.x + ',' + m.start.y);
    goals.add(m.goal.x + ',' + m.goal.y);
    if (m.goal.x === 6 && m.goal.y === 10) bottomRight++;
  }
  assert.ok(starts.size > 15 && goals.size > 15, `출발 ${starts.size}곳, 도착 ${goals.size}곳`);
  assert.ok(bottomRight < 15, `도착이 오른쪽 아래 구석인 판 ${bottomRight}개`);
});

test('레벨별 크기: 레벨 1은 4칸, 레벨 10은 13칸, 세로 화면은 세로로 길게', () => {
  assert.deepStrictEqual(Maze.dimsForLevel(1, 1.8), { cols: 4, rows: 7 });
  assert.strictEqual(Maze.dimsForLevel(6, 1.8).cols, 9);
  assert.deepStrictEqual(Maze.dimsForLevel(10, 1.8), { cols: 13, rows: 23 });
  assert.strictEqual(Maze.dimsForLevel(99, 1.8).cols, 13);
  assert.deepStrictEqual(Maze.dimsForLevel(1, 0.5), { cols: 8, rows: 4 });
});

test('가장 큰 미로(레벨 10)도 완전 미로이고 풀 수 있다', () => {
  const d = Maze.dimsForLevel(10, 2.2);
  const m = Maze.generate(d.cols, d.rows, 2026);
  const p = Maze.solve(m);
  assert.ok(p && p.length > d.cols);
});
