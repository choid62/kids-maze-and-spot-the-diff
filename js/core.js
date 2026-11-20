// 공통 유틸: 시드 기반 난수 (같은 시드 = 같은 문제)
(function (root) {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    const r = mulberry32(seed);
    return {
      next: r,
      int: (n) => Math.floor(r() * n),
      range: (a, b) => a + r() * (b - a),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(r() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
    };
  }

  function newSeed() {
    return Math.floor(Math.random() * 4294967296) >>> 0;
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // 레벨(1~15)을 부모가 알아보기 쉬운 말로
  function levelName(level) {
    if (level <= 3) return 'Easy';
    if (level <= 6) return 'Medium';
    if (level <= 8) return 'Hard';
    if (level <= 10) return 'Very Hard';
    return 'Expert';
  }

  const Core = { makeRng, newSeed, clamp, levelName };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.Core = Core;
})(typeof self !== 'undefined' ? self : this);
