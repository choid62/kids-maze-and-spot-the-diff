// 틱택토 규칙과 로봇 두뇌. 판은 9칸 배열 (0~8, 왼쪽 위부터), 칸 값은 0(빈칸), 1, 2(두 사람).
(function (root) {
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  const empty = (b) => b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);

  // 이긴 사람과 그 줄 { who, line } (없으면 null)
  function winner(b) {
    for (const line of LINES) {
      const [x, y, z] = line;
      if (b[x] && b[x] === b[y] && b[x] === b[z]) return { who: b[x], line };
    }
    return null;
  }

  const full = (b) => b.every((v) => v);

  // 이 칸에 두면 바로 이기는 칸
  function winningMove(b, me) {
    return empty(b).find((i) => { const n = b.slice(); n[i] = me; return winner(n); });
  }

  // 끝까지 계산: me 입장의 점수 (빨리 이길수록 크고, 늦게 질수록 덜 나쁨, 비김 0).
  // 놓인 돌 수로 점수를 매겨서 같은 판은 늘 같은 점수 → 한 번 계산한 판은 기억해 둔다.
  const memo = new Map();
  function minimax(b, turn, me) {
    const key = b.join('') + turn + me;
    if (memo.has(key)) return memo.get(key);
    const stones = 9 - empty(b).length;
    const w = winner(b);
    let best;
    if (w) best = w.who === me ? 20 - stones : stones - 20;
    else if (stones < 9) {
      best = turn === me ? -Infinity : Infinity;
      for (const i of empty(b)) {
        b[i] = turn;
        const v = minimax(b, 3 - turn, me);
        b[i] = 0;
        best = turn === me ? Math.max(best, v) : Math.min(best, v);
      }
    } else best = 0;
    memo.set(key, best);
    return best;
  }
  function bestMoves(b, me) {
    const opts = empty(b).map((i) => { const n = b.slice(); n[i] = me; return { i, v: minimax(n, 3 - me, me) }; });
    const top = Math.max(...opts.map((o) => o.v));
    return opts.filter((o) => o.v === top).map((o) => o.i);
  }

  // 로봇의 수. level 1 쉬움(대부분 아무 데나), 2 보통(이길 수 있으면 이기고, 막아야 하면 막기), 3 어려움(끝까지 계산)
  function cpuMove(b, me, level, rand) {
    const r = rand || Math.random;
    const pick = (list) => list[Math.floor(r() * list.length)];
    const free = empty(b);
    if (!free.length) return -1;
    if (level >= 3) return pick(bestMoves(b, me));
    const win = winningMove(b, me);
    if (level === 2) {
      if (win !== undefined) return win;
      const block = winningMove(b, 3 - me);
      if (block !== undefined) return block;
      if (b[4] === 0 && r() < 0.5) return 4;
      return pick(free);
    }
    // 쉬움: 이길 자리도 절반은 놓친다
    if (win !== undefined && r() < 0.5) return win;
    return pick(free);
  }

  const TicTacToe = { LINES, empty, winner, full, winningMove, bestMoves, cpuMove };
  if (typeof module !== 'undefined' && module.exports) module.exports = TicTacToe;
  else root.TicTacToe = TicTacToe;
})(typeof self !== 'undefined' ? self : this);
