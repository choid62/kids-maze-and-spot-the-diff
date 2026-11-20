// 기기 안에 진행도와 스티커를 저장한다. (저장이 막힌 환경에서도 앱은 동작)
(function (root) {
  const KEY = 'kmsd.v1';
  const defaults = () => ({ mazeLevel: 1, spotLevel: 1, stickers: [], sound: true, voice: true, chopLevel: 1, cocoLevel: 1, memoLevel: 1, memoBot: 1, hiddenLevel: 1, patternLevel: 1, tttLevel: 1 });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { /* 저장소 사용 불가 */ }
    return defaults();
  }

  let state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }

  root.Store = {
    get: (k) => state[k],
    set(k, v) { state[k] = v; save(); },
    addSticker(s) {
      state.stickers.push(s);
      if (state.stickers.length > 500) state.stickers.shift();
      save();
    },
    reset() { state = defaults(); save(); },
  };
})(typeof self !== 'undefined' ? self : this);
