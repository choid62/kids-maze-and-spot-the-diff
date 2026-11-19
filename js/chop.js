// 젓가락 놀이 규칙과 컴퓨터 두뇌.
// 규칙: 양손 1개씩 시작. 내 손으로 상대 손을 치면 상대 손에 내 손가락 수가 더해지고, 5개 이상이면 그 손은 죽는다(0).
//       나누기: 한 손이 죽었고 다른 손이 짝수(2 또는 4)일 때만 반씩 나눈다 (0+2 → 1+1, 0+4 → 2+2).
//       양손이 모두 죽으면 진다.
(function (root) {
  const DEAD_AT = 5;

  // me = 지금 차례인 사람의 두 손, op = 상대의 두 손. 결과는 다음 사람 기준 { me, op }.
  function hit(me, op, from, to) {
    const next = op.slice();
    const v = op[to] + me[from];
    next[to] = v >= DEAD_AT ? 0 : v;
    return next;
  }

  // 나눌 수 있는 모양들 [왼손, 오른손]: 한 손이 죽고 다른 손이 짝수일 때만, 반씩
  function splits(me) {
    const [lo, hi] = me.slice().sort((x, y) => x - y);
    if (lo === 0 && hi > 0 && hi % 2 === 0) return [[hi / 2, hi / 2]];
    return [];
  }

  const alive = (hands) => hands[0] > 0 || hands[1] > 0;

  // 지금 차례인 사람이 둘 수 있는 모든 수
  function moves(me, op) {
    const list = [];
    for (let f = 0; f < 2; f++) for (let t = 0; t < 2; t++) {
      if (me[f] > 0 && op[t] > 0) list.push({ type: 'hit', from: f, to: t });
    }
    for (const s of splits(me)) list.push({ type: 'split', to: s });
    return list;
  }

  // 수를 두면 다음 사람 기준 상태 { me, op }
  function play(me, op, m) {
    if (m.type === 'hit') return { me: hit(me, op, m.from, m.to), op: me.slice() };
    return { me: op.slice(), op: m.to.slice() };
  }

  // ---------- 모든 상황 풀어 두기 (되짚어 풀기) ----------
  // 상태 키: 두 사람 손을 각각 작은 수부터 정렬 (좌우는 결과에 영향이 없다)
  const key = (me, op) => me.slice().sort((x, y) => x - y).join('') + op.slice().sort((x, y) => x - y).join('');
  const WIN = 1, LOSS = -1, DRAW = 0;
  let table = null;

  function solve() {
    if (table) return table;
    const states = [];
    for (let a = 0; a < DEAD_AT; a++) for (let b = a; b < DEAD_AT; b++)
      for (let c = 0; c < DEAD_AT; c++) for (let d = c; d < DEAD_AT; d++) states.push([[a, b], [c, d]]);
    table = {};
    const kids = {};
    for (const [me, op] of states) {
      const k = key(me, op);
      if (!alive(me)) table[k] = { v: LOSS, d: 0 };
      else if (!alive(op)) table[k] = { v: WIN, d: 0 };
      else kids[k] = moves(me, op).map((m) => { const n = play(me, op, m); return key(n.me, n.op); });
    }
    for (let changed = true; changed;) {
      changed = false;
      for (const k of Object.keys(kids)) {
        if (table[k]) continue;
        const res = kids[k].map((c) => table[c]);
        const losses = res.filter((r) => r && r.v === LOSS);
        if (losses.length) {
          table[k] = { v: WIN, d: 1 + Math.min(...losses.map((r) => r.d)) };
          changed = true;
        } else if (res.length && res.every((r) => r && r.v === WIN)) {
          table[k] = { v: LOSS, d: 1 + Math.max(...res.map((r) => r.d)) };
          changed = true;
        }
      }
    }
    for (const k of Object.keys(kids)) if (!table[k]) table[k] = { v: DRAW, d: 0 };
    return table;
  }

  // 지금 차례인 사람 입장에서의 결과 (1 이김, -1 짐, 0 비김)
  function value(me, op) {
    return solve()[key(me, op)];
  }

  // 수 하나의 점수 (높을수록 좋다): 상대를 지게 만드는 수 > 비기는 수 > 지는 수
  function score(me, op, m) {
    const n = play(me, op, m);
    const r = value(n.me, n.op); // 상대 입장
    if (r.v === LOSS) return 1000 - r.d; // 빨리 이기는 쪽
    if (r.v === DRAW) return 0;
    return -1000 + r.d; // 질 때는 최대한 오래 버티기
  }

  // skill: 0~1, 최선의 수를 고를 확률 (나머지는 아무 수나)
  function chooseMove(me, op, skill, rand) {
    const r = rand || Math.random;
    const list = moves(me, op);
    if (!list.length) return null;
    if (r() >= skill) return list[Math.floor(r() * list.length)];
    const scored = list.map((m) => ({ m, s: score(me, op, m) }));
    const best = Math.max(...scored.map((x) => x.s));
    const top = scored.filter((x) => x.s === best);
    return top[Math.floor(r() * top.length)].m;
  }

  const Chop = { DEAD_AT, hit, splits, moves, play, alive, value, score, chooseMove, solve, WIN, LOSS, DRAW };
  if (typeof module !== 'undefined' && module.exports) module.exports = Chop;
  else root.Chop = Chop;
})(typeof self !== 'undefined' ? self : this);
