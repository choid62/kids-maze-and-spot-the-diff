// 코코넛 크랙 놀이 규칙.
// 둥글게 앉아 시계 방향으로 "Coco·nut, Coco·nut, Coco·nut, Crack!" 7박자에 맞춰 코코넛을 하나씩 친다.
// 7번째(Crack!)에 걸린 코코넛이 한 단계 바뀐다:
//   통 코코넛 → 쩍 갈라져 반쪽 코코넛 두 개 → 걸린 반쪽은 우유가 쏟아짐 → 다시 걸리면 사라짐
// 코코넛이 다 사라지면 탈락, 마지막까지 남은 사람이 이긴다.
// 세는 사람은 자기 코코넛 하나를 고르고, 그 코코넛부터 세거나 그 바로 다음(시계 방향) 코코넛부터 센다.
// 다음에 세는 사람은 방금 걸린 사람 (탈락했으면 시계 방향으로 다음 사람).
// 합치기: 세는 차례에 우유 쏟은 반쪽이 두 개면 다시 통 코코넛 하나로 합칠 수 있다 (한 사람당 한 판에 한 번).
(function (root) {
  const BEATS = 7;
  const NEXT_STAGE = { whole: 'half', half: 'spilled', spilled: null };

  // players: [{ units: ['whole'] }, ...] (자리 순서와 코코넛 순서가 곧 시계 방향 순서)
  function newGame(count) {
    return { players: Array.from({ length: count }, () => ({ units: ['whole'] })), counter: 0 };
  }

  const alive = (g, p) => g.players[p].units.length > 0;
  const aliveCount = (g) => g.players.filter((pl) => pl.units.length > 0).length;
  const winner = (g) => (aliveCount(g) === 1 ? g.players.findIndex((pl) => pl.units.length > 0) : -1);
  // 비김: 남은 사람 모두 코코넛이 하나씩이고 모양이 같을 때 (그때는 먼저 세는 사람이 이길 수밖에 없어서 비김으로 한다).
  // 처음의 통 코코넛 하나씩은 비김이 아니다.
  function isTie(g) {
    const left = g.players.filter((pl) => pl.units.length > 0);
    if (left.length < 2 || left.some((pl) => pl.units.length !== 1)) return false;
    const stage = left[0].units[0];
    return stage !== 'whole' && left.every((pl) => pl.units[0] === stage);
  }

  // 시계 방향으로 늘어선 코코넛 목록 [{ p, u }]
  function order(g) {
    const list = [];
    g.players.forEach((pl, p) => pl.units.forEach((_, u) => list.push({ p, u })));
    return list;
  }
  const indexOf = (g, t) => order(g).findIndex((x) => x.p === t.p && x.u === t.u);

  // 세는 사람이 시작할 수 있는 곳 (order 안의 번호): 자기 코코넛 각각, 그리고 각각의 바로 다음 코코넛
  function starts(g, counter) {
    const list = order(g);
    const out = new Set();
    list.forEach((x, i) => {
      if (x.p !== counter) return;
      out.add(i);
      out.add((i + 1) % list.length);
    });
    return Array.from(out).sort((a, b) => a - b);
  }

  // start(order 번호)부터 7박자 동안 치는 코코넛들
  function countPath(g, start) {
    const list = order(g);
    return Array.from({ length: BEATS }, (_, k) => list[(start + k) % list.length]);
  }
  const target = (g, start) => countPath(g, start)[BEATS - 1];

  // 걸린 코코넛을 한 단계 바꾼다. 무슨 일이 있었는지: 'crack' | 'spill' | 'gone' | 'out'
  function hit(g, t) {
    const pl = g.players[t.p];
    const stage = pl.units[t.u];
    let what;
    if (stage === 'whole') { pl.units.splice(t.u, 1, 'half', 'half'); what = 'crack'; }
    else if (stage === 'half') { pl.units[t.u] = 'spilled'; what = 'spill'; }
    else { pl.units.splice(t.u, 1); what = pl.units.length ? 'gone' : 'out'; }
    let next = t.p;
    while (!alive(g, next)) next = (next + 1) % g.players.length;
    g.counter = next;
    return what;
  }

  // 합치기: 우유 쏟은 반쪽 두 개 → 통 코코넛 하나
  const canMerge = (g, p) => !g.players[p].merged && g.players[p].units.length === 2 && g.players[p].units.every((u) => u === 'spilled');
  function merge(g, p) {
    if (!canMerge(g, p)) return false;
    g.players[p].units = ['whole'];
    g.players[p].merged = true;
    return true;
  }

  const clone = (g) => ({ counter: g.counter, players: g.players.map((pl) => ({ units: pl.units.slice(), merged: !!pl.merged })) });

  // ---------- 1:1은 모든 상황을 미리 풀어 둔다 (되짚어 풀기) ----------
  // 끝에서부터 거꾸로 이김/짐을 정한다 (남는 것은 비김으로 본다. 합치기가 한 번뿐이라 실제로는 거의 없다).
  // 값은 0번 사람 입장: 1 이김, -1 짐, 0 비김. 세는 사람은 합칠 수 있으면 먼저 합친다.
  const CONFIGS = [['whole'], ['half', 'half'], ['half', 'spilled'], ['spilled', 'half'], ['spilled', 'spilled'], ['half'], ['spilled'], []];
  const key2 = (g) => g.counter + '|' + g.players.map((pl) => pl.units.map((u) => u[0]).join('') + (pl.merged ? '*' : '')).join('/');
  let table2 = null;
  function prepared(g) {
    const n = clone(g);
    merge(n, n.counter);
    return n;
  }
  function children2(g) {
    const m = prepared(g);
    return starts(m, m.counter).map((s) => { const n = clone(m); hit(n, target(m, s)); return { s, n }; });
  }
  function solve2() {
    if (table2) return table2;
    table2 = {};
    const kids = {};
    for (const a of CONFIGS) for (const b of CONFIGS) for (const ma of [false, true]) for (const mb of [false, true]) for (const c of [0, 1]) {
      const g = { counter: c, players: [{ units: a.slice(), merged: ma }, { units: b.slice(), merged: mb }] };
      if (!g.players[c].units.length && g.players[1 - c].units.length) continue; // 세는 사람은 살아 있다
      const k = key2(g);
      const w = winner(g);
      if (w >= 0) table2[k] = w === 0 ? 1 : -1;
      else if (aliveCount(g) === 0) continue;
      else if (isTie(g)) table2[k] = 0; // 비김에서 끝
      else kids[k] = { c, list: children2(g).map((x) => key2(x.n)) };
    }
    for (let changed = true; changed;) {
      changed = false;
      for (const k of Object.keys(kids)) {
        if (k in table2) continue;
        const { c, list } = kids[k];
        const vals = list.map((x) => table2[x]);
        const good = c === 0 ? 1 : -1;
        if (vals.includes(good)) { table2[k] = good; changed = true; }
        else if (vals.every((v) => v === -good)) { table2[k] = -good; changed = true; }
      }
    }
    for (const k of Object.keys(kids)) if (!(k in table2)) table2[k] = 0;
    return table2;
  }
  // 1:1에서 세는 사람 입장의 결과 (1 이김, 0 비김, -1 짐)
  function value2(g) {
    const v = solve2()[key2(g)];
    return g.counter === 0 ? v : -v;
  }
  // 1:1에서 세는 사람에게 가장 좋은 시작점들 (합칠 수 있으면 합친 뒤의 시작점)
  function bestStarts(g) {
    const c = g.counter;
    const opts = children2(g).map(({ s, n }) => ({ s, v: c === 0 ? solve2()[key2(n)] : -solve2()[key2(n)] }));
    const best = Math.max(...opts.map((o) => o.v));
    return { v: best, starts: opts.filter((o) => o.v === best).map((o) => o.s) };
  }

  // 컴퓨터가 시작점을 고른다. level: 1 쉬움(아무 데나), 2 보통(내 코코넛 피하기),
  // 3 어려움(내 코코넛 피하고, 아이 코코넛을 노리고, 다음 차례에 내가 걸리기 쉬운 상황 피하기; 1:1은 끝까지 계산)
  // human = 아이 자리
  function cpuChoice(g, counter, level, human, rand) {
    const r = rand || Math.random;
    const opts = starts(g, counter);
    const pick = (list) => list[Math.floor(r() * list.length)];
    if (level <= 1) return pick(opts);
    // 1:1 어려움: 끝까지 내다보고 이기거나 최소한 비기는 쪽 (아이도 가끔 이길 수 있게 15%는 보통처럼)
    if (level >= 3 && g.players.length === 2 && g.counter === counter && r() < 0.85) {
      const best = bestStarts(g);
      if (best.v >= 0) return pick(best.starts);
    }
    const score = (s) => {
      const t = target(g, s);
      let v = t.p === counter ? -10 : 0;
      if (level >= 3) {
        if (t.p === human) v += 3;
        const next = clone(g);
        hit(next, t);
        if (winner(next) < 0 && !isTie(next)) {
          const nexts = starts(next, next.counter);
          v -= (3 * nexts.filter((s2) => target(next, s2).p === counter).length) / nexts.length;
        }
      }
      return v;
    };
    const scores = opts.map(score);
    const best = Math.max(...scores);
    return pick(opts.filter((s, i) => scores[i] === best));
  }

  const Coconut = { BEATS, NEXT_STAGE, newGame, order, indexOf, starts, countPath, target, hit, winner, aliveCount, cpuChoice, canMerge, merge, value2, bestStarts, isTie };
  if (typeof module !== 'undefined' && module.exports) module.exports = Coconut;
  else root.Coconut = Coconut;
})(typeof self !== 'undefined' ? self : this);
