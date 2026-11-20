// 몬스터 밥 주기 화면: 몬스터가 "딸기 5개!" 라고 하고 접시에 2개가 있으면, 몇 개를 더 줘야 하는지(2 + ? = 5) 보기 3개 중에서 고른다.
// 접시가 너무 많으면 몇 개를 덜어야 하는지(7 − ? = 4). 맞히면 그만큼 하나씩 세며 놓거나 덜고 몬스터가 먹는다.
(function (root) {
  const COLORS = ['#8E6BE8', '#3FB97A', '#3E9BEA', '#F07A3D', '#E05C9A'];
  const MAX_ON_PLATE = 10;
  const S = { level: 1, qi: 0, firstTry: 0, q: null, tries: 0, plate: 0, busy: false, token: {}, timers: [], onEnd: null, active: false, rng: null, color: COLORS[0] };
  const $ = (id) => document.getElementById(id);
  const later = (f, ms) => { const tk = S.token; S.timers.push(setTimeout(() => { if (S.token === tk) f(); }, ms)); };

  function anim(ms, step, done) {
    const tk = S.token, t0 = performance.now();
    const f = () => {
      if (S.token !== tk) return;
      const k = Math.min(1, (performance.now() - t0) / ms);
      step(k);
      if (k < 1) setTimeout(f, 16);
      else if (done) done();
    };
    f();
  }

  // ---------- 몬스터 그림 (SVG) ----------
  // mood: hungry(입 벌림) | happy(웃음) | chomp(크게 벌림) | sad(아직 배고픔) | full(너무 많아 배부름)
  function monsterSVG(mood, color) {
    const eyes = mood === 'happy'
      ? '<path d="M62 78 q12 -14 24 0" stroke="#2B1D3A" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M114 78 q12 -14 24 0" stroke="#2B1D3A" stroke-width="7" fill="none" stroke-linecap="round"/>'
      : mood === 'full'
        ? '<path d="M62 72 l22 10 M62 84 l22 -10" stroke="#2B1D3A" stroke-width="6" stroke-linecap="round"/><path d="M116 82 l22 -10 M116 72 l22 10" stroke="#2B1D3A" stroke-width="6" stroke-linecap="round"/>'
        : `<circle cx="74" cy="76" r="17" fill="#fff"/><circle cx="126" cy="76" r="17" fill="#fff"/><circle cx="${mood === 'sad' ? 72 : 77}" cy="${mood === 'sad' ? 82 : 79}" r="8" fill="#2B1D3A"/><circle cx="${mood === 'sad' ? 124 : 129}" cy="${mood === 'sad' ? 82 : 79}" r="8" fill="#2B1D3A"/>`;
    const brows = mood === 'sad' ? '<path d="M58 54 l26 8 M142 54 l-26 8" stroke="#2B1D3A" stroke-width="6" stroke-linecap="round"/>' : '';
    const mouth = {
      hungry: '<ellipse cx="100" cy="128" rx="30" ry="22" fill="#5A1F3A"/><ellipse cx="100" cy="140" rx="16" ry="8" fill="#FF6F91"/><path d="M80 112 l6 10 l6 -10 M108 112 l6 10 l6 -10" fill="#fff"/>',
      chomp: '<ellipse cx="100" cy="130" rx="40" ry="32" fill="#5A1F3A"/><ellipse cx="100" cy="148" rx="20" ry="9" fill="#FF6F91"/><path d="M72 104 l7 12 l7 -12 M114 104 l7 12 l7 -12" fill="#fff"/>',
      happy: '<path d="M68 120 q32 34 64 0" fill="#5A1F3A" stroke="#5A1F3A" stroke-width="6" stroke-linejoin="round"/><ellipse cx="100" cy="132" rx="14" ry="6" fill="#FF6F91"/>',
      sad: '<path d="M74 140 q26 -22 52 0" fill="none" stroke="#5A1F3A" stroke-width="8" stroke-linecap="round"/>',
      full: '<path d="M70 134 q8 -8 15 0 q8 8 15 0 q8 -8 15 0 q8 8 15 0" fill="none" stroke="#5A1F3A" stroke-width="7" stroke-linecap="round"/>',
    }[mood];
    const cheeks = mood === 'full' ? '<circle cx="56" cy="112" r="11" fill="#9BE36A" opacity="0.8"/><circle cx="144" cy="112" r="11" fill="#9BE36A" opacity="0.8"/>'
      : '<circle cx="56" cy="110" r="10" fill="#FF8FB1" opacity="0.6"/><circle cx="144" cy="110" r="10" fill="#FF8FB1" opacity="0.6"/>';
    return `<svg viewBox="0 0 200 200" aria-hidden="true">
      <path d="M58 40 L48 8 L78 30 Z M142 40 L152 8 L122 30 Z" fill="#FFD25A" stroke="#E0A92B" stroke-width="4" stroke-linejoin="round"/>
      <path d="M100 22 C160 22 186 70 186 118 C186 168 150 192 100 192 C50 192 14 168 14 118 C14 70 40 22 100 22 Z" fill="${color}"/>
      <ellipse cx="100" cy="150" rx="60" ry="34" fill="#fff" opacity="0.18"/>
      <path d="M22 140 q-14 10 -6 24 M178 140 q14 10 6 24" stroke="${color}" stroke-width="14" stroke-linecap="round" fill="none"/>
      ${brows}${eyes}${cheeks}${mouth}
    </svg>`;
  }

  function setMood(mood) {
    const m = $('monster-face');
    m.innerHTML = monsterSVG(mood, S.color);
    m.dataset.mood = mood;
  }

  // ---------- 화면 ----------
  function init(onEnd) {
    S.onEnd = onEnd;
    $('monster-choices').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b && !b.disabled) answer(+b.dataset.n, b);
    });
    $('monster-new').addEventListener('click', () => { Sound.tap(); start({}); });
    root.addEventListener('resize', () => { if (S.active) drawAll(); });
  }

  function start(opts) {
    opts = opts || {};
    stop();
    S.active = true;
    S.level = Core.clamp(opts.level || Store.get('monsterLevel') || 1, 1, Numbers.MONSTER_MAX_LEVEL);
    S.rng = Core.makeRng(opts.seed != null ? opts.seed : Core.newSeed());
    S.qi = 0;
    S.firstTry = 0;
    S.demo = opts.demo === 'monsterplay';
    $('monster-level').textContent = `Level ${S.level} · ${Core.levelName(S.level)} ▾`;
    question();
  }

  function stop() {
    S.active = false;
    S.token = {};
    S.timers.forEach(clearTimeout);
    S.timers = [];
    document.querySelectorAll('.monster-fly').forEach((f) => f.remove());
  }

  function foodCanvas(kind, size) {
    const c = document.createElement('canvas');
    const dpr = Math.min(root.devicePixelRatio || 1, 3);
    c.width = c.height = Math.round(size * dpr);
    c.style.width = c.style.height = size + 'px';
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Draw.object(ctx, kind, size / 2, size / 2, size * 0.92);
    return c;
  }

  const cfg = () => Numbers.MONSTER_LEVELS[S.level];
  const itemSize = () => Math.max(26, Math.min(64, $('monster-plate').clientWidth / 7.4)); // 한 줄 5개가 접시 안에 들어가게
  const isAdd = () => S.q.have < S.q.want;

  // 접시 수와 원하는 수의 차이를 묻는다: 더 주기 "2 + ? = 5", 덜기 "7 − ? = 4"
  function question() {
    S.q = Numbers.monsterQuestion(S.level, S.rng);
    S.q.answer = Math.abs(S.q.want - S.q.have);
    S.tries = 0;
    S.plate = S.q.have;
    S.busy = false;
    S.color = COLORS[(S.qi + S.level) % COLORS.length];
    $('monster-dots').innerHTML = Array.from({ length: Numbers.ROUND }, (_, i) => `<span class="dot${i < S.qi ? ' on' : ''}"></span>`).join('');
    setMood('hungry');
    const { want, food } = S.q;
    const word = want === 1 ? food.one : food.many;
    $('monster-say').textContent = `I want ${want} ${word}!`;
    drawAll();
    const ask = isAdd() ? 'How many more?' : 'Too many! How many should we take away?';
    $('monster-tip').textContent = ask;
    showEq('?');
    // 보기: 숫자 대신 음식 그림 n 개 (5개씩 한 줄로 세기 쉽게)
    const box = $('monster-choices');
    box.innerHTML = '';
    const icon = Math.max(22, Math.min(44, Math.floor((Math.min(root.innerWidth, 900) - 60) / 3 / 5.9)));
    for (const n of Numbers.choices(S.q.answer, S.rng, 1, 10)) {
      const b = document.createElement('button');
      b.className = 'pic-choice';
      b.dataset.n = n;
      b.setAttribute('aria-label', String(n));
      for (let i = 0; i < n; i++) b.appendChild(foodCanvas(food.kind, icon));
      b.style.setProperty('--icon', icon + 'px');
      box.appendChild(b);
    }
    Sound.say(`I want ${want} ${word}! ${ask}`);
    if (S.demo) demoAnswer();
  }

  function showEq(mid) {
    const { have, want } = S.q;
    const add = isAdd();
    $('monster-eq').innerHTML = `<span class="t">${have}</span><span class="op ${add ? 'plus' : 'minus'}">${add ? '+' : '−'}</span>`
      + `<span class="t ans${mid === '?' ? ' q' : ''} ${add ? 'plus' : 'minus'}">${mid}</span><span class="op">=</span><span class="t">${want}</span>`;
  }

  function drawAll() {
    const size = itemSize();
    // 말풍선의 점 그림 (원하는 수만큼, 낮은 레벨만)
    const dots = $('monster-want');
    dots.innerHTML = '';
    if (cfg().dots) for (let i = 0; i < S.q.want; i++) { const c = foodCanvas(S.q.food.kind, 26); c.className = 'want'; dots.appendChild(c); }
    // 통
    const jar = $('monster-jar-food');
    jar.innerHTML = '';
    jar.appendChild(foodCanvas(S.q.food.kind, Math.round(size * 1.3)));
    // 접시
    const items = $('monster-items');
    items.innerHTML = '';
    // 한 줄에 5개씩 (세기 쉽게)
    items.style.width = (size * 5 + 4 * 4) + 'px';
    for (let i = 0; i < S.plate; i++) {
      const it = document.createElement('span');
      it.className = 'item';
      it.appendChild(foodCanvas(S.q.food.kind, size));
      items.appendChild(it);
    }
    const c = $('monster-count');
    c.textContent = cfg().count ? String(S.plate) : '';
    c.classList.toggle('hidden', !cfg().count);
  }

  function center(el) {
    const base = $('screen-monster').getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
  }

  // 음식 하나를 a 에서 b 로 날린다 (tag: 위에 붙일 숫자)
  function fly(fromEl, toEl, size, done, arc, tag, tagCls) {
    const f = document.createElement('div');
    f.className = 'monster-fly';
    f.appendChild(foodCanvas(S.q.food.kind, size));
    if (tag != null) f.insertAdjacentHTML('beforeend', `<span class="hop-tag ${tagCls || ''}">${tag}</span>`);
    $('screen-monster').appendChild(f);
    const a = center(fromEl), b = center(toEl);
    const h = arc == null ? 60 : arc;
    anim(tag != null ? 520 : 380, (k) => {
      f.style.transform = `translate(${a.x + (b.x - a.x) * k - size / 2}px, ${a.y + (b.y - a.y) * k - size / 2 - Math.sin(Math.PI * k) * h}px)`;
    }, () => { f.remove(); if (done) done(); });
  }

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function answer(n, btn) {
    if (S.busy || !S.active) return;
    Sound.unlock();
    if (n === S.q.answer) {
      Sound.found();
      btn.classList.add('right');
      if (S.tries === 0) S.firstTry++;
      solve();
    } else {
      S.tries++;
      Sound.miss();
      btn.disabled = true;
      btn.classList.add('wrong');
      shake(btn);
      // 몬스터 반응: 그만큼 주면 모자라거나 너무 많다
      const after = isAdd() ? S.q.have + n : S.q.have - n;
      if (after < S.q.want) { setMood('sad'); $('monster-say').textContent = `${after}? Still hungry!`; Sound.say('Still hungry!'); }
      else { setMood('full'); $('monster-say').textContent = `${after}? Too many!`; Sound.say('Too many!'); }
      later(() => { if (!S.busy) { setMood('hungry'); const w = S.q.want; $('monster-say').textContent = `I want ${w} ${w === 1 ? S.q.food.one : S.q.food.many}!`; } }, 1600);
      if (S.tries >= 2) solve();
    }
  }

  // 답만큼 하나씩 세며 접시에 놓거나(통 → 접시) 덜어 낸 뒤(접시 → 통), 몬스터가 먹는다
  function solve() {
    S.busy = true;
    $('monster-choices').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    showEq(S.q.answer);
    const add = isAdd();
    const k = S.q.answer;
    const step = (j) => {
      if (j >= k) return later(eat, 500);
      Sound.step();
      if (add) {
        S.plate++;
        drawAll();
        const items = $('monster-items').querySelectorAll('.item');
        const last = items[items.length - 1];
        last.style.visibility = 'hidden';
        fly($('monster-jar'), last, itemSize(), () => { last.style.visibility = ''; later(() => step(j + 1), 150); }, 70, j + 1, '');
      } else {
        const items = $('monster-items').querySelectorAll('.item');
        const last = items[items.length - 1];
        last.style.visibility = 'hidden';
        S.plate--;
        fly(last, $('monster-jar'), itemSize(), () => { drawAll(); later(() => step(j + 1), 150); }, 70, j + 1, 'minus');
      }
    };
    later(() => step(0), 400);
  }

  function eat() {
    setMood('chomp');
    const items = Array.from($('monster-items').querySelectorAll('.item'));
    const mouth = $('monster-mouth');
    items.forEach((it, i) => later(() => {
      it.style.visibility = 'hidden';
      fly(it, mouth, itemSize(), () => { Sound.step(); const f = $('monster-face'); f.classList.remove('munch'); void f.offsetWidth; f.classList.add('munch'); }, 30);
    }, i * 150));
    later(() => {
      setMood('happy');
      Sound.found();
      const w = S.q.want;
      $('monster-say').textContent = `Yum! ${w} ${w === 1 ? S.q.food.one : S.q.food.many}. Thank you!`;
      Sound.say('Yum! Thank you!');
      later(next, 1900);
    }, items.length * 150 + 500);
  }

  function next() {
    S.qi++;
    if (S.qi < Numbers.ROUND) return question();
    let newLevel = 0;
    if (S.firstTry >= 4 && S.level < Numbers.MONSTER_MAX_LEVEL) {
      newLevel = S.level + 1;
      Store.set('monsterLevel', newLevel);
    }
    S.onEnd('monster', newLevel);
  }

  // 자가 점검용: 홀수 번째 문제는 한 번 틀린 뒤 정답
  function demoAnswer() {
    later(() => {
      const btns = Array.from(document.querySelectorAll('#monster-choices button'));
      const wrong = btns.find((b) => +b.dataset.n !== S.q.answer);
      if (S.qi % 2 && wrong) wrong.click();
      later(() => { const r = btns.find((b) => +b.dataset.n === S.q.answer); if (r && !S.busy) r.click(); }, 700);
    }, 900);
  }

  root.MonsterGame = { init, start, stop, MAX_LEVEL: Numbers.MONSTER_MAX_LEVEL, monsterSVG };
})(typeof self !== 'undefined' ? self : this);
