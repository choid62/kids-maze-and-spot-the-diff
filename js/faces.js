// 여러 놀이가 같이 쓰는 그림 목록과 "그림 얼굴"(그림 + 색/무늬/방향/크기 변형).
// 얼굴 face = { kind, hue?, pattern?, flip?, eyes?, scale? } → Draw.object(ctx, kind, x, y, size * (scale||1), null, flip, face)
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const EMOJI = isNode ? require('./emoji-data.js') : root.EMOJI;

  // 5살이 바로 알아보는 그림들 (서로 비슷한 것은 하나만: 열대어만 두고 물고기는 빼고, 고래만 두고 돌고래는 뺌)
  const KIDS = [
    'cat', 'dog', 'rabbit_face', 'pig', 'cow', 'chicken', 'duck', 'penguin', 'lion', 'elephant', 'monkey', 'panda', 'koala',
    'tropical_fish', 'octopus', 'crab', 'turtle', 'butterfly', 'lady_beetle', 'honeybee', 'snail', 'owl',
    'giraffe', 'zebra', 'hedgehog', 'red_apple', 'banana', 'strawberry', 'watermelon', 'carrot', 'tomato', 'cupcake',
    'doughnut', 'lollipop', 'ice_cream', 'soccer_ball', 'balloon', 'kite', 'automobile', 'bicycle', 'rocket', 'sun', 'star',
    'tulip', 'sunflower', 'mushroom', 'teddy_bear', 'robot', 'house', 'ringed_planet', 'snowman', 'spouting_whale',
  ].filter((k) => EMOJI[k]);

  const info = (kind) => EMOJI[kind];
  const colorful = (kind) => info(kind).sat >= 0.3;
  const asym = (kind) => !info(kind).sym;
  const hasEyes = (kind) => !!info(kind).eyes;
  const canPattern = (kind) => info(kind).baseShare >= 0.22 && info(kind).p.length <= 26;

  const key = (f) => [f.kind, f.hue || 0, f.pattern ? f.pattern.type : '', f.flip ? 1 : 0, f.eyes || '', f.scale || 1].join('|');
  const same = (a, b) => key(a) === key(b);

  // 얼굴 하나를 살짝 바꾼 "헷갈리는 얼굴" (색, 무늬, 방향, 웃는 눈 중 하나)
  function variant(rng, face) {
    const k = face.kind;
    const opts = [];
    if (colorful(k)) opts.push(() => Object.assign({}, face, { hue: rng.pick([110, 180, 250]) }));
    if (canPattern(k)) opts.push(() => Object.assign({}, face, { pattern: { type: rng.pick(['dots', 'hearts', 'stars']), color: info(k).baseLum < 0.55 ? '#FFFFFF' : '#FF4F8B' } }));
    if (asym(k)) opts.push(() => Object.assign({}, face, { flip: !face.flip }));
    if (hasEyes(k)) opts.push(() => Object.assign({}, face, { eyes: 'smile' }));
    return opts.length ? rng.pick(opts)() : null;
  }

  const Faces = { KIDS, key, same, variant, colorful, asym, hasEyes, canPattern };
  if (isNode) module.exports = Faces;
  else root.Faces = Faces;
})(typeof self !== 'undefined' ? self : this);
