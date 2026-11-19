// Kenney 배경 조각 그림(PNG)을 미리 불러 둔다.
(function (root) {
  const imgs = {};
  const waiters = [];
  let pending = 0;

  function done() {
    if (--pending === 0) waiters.splice(0).forEach((f) => f());
  }

  for (const name of Object.keys(root.BG_SIZES)) {
    pending++;
    const im = new Image();
    im.onload = done;
    im.onerror = done; // 하나가 실패해도 나머지는 쓴다
    im.src = 'assets/kenney/' + name + '.png';
    imgs[name] = im;
  }

  root.BgImages = {
    // 다 불러온 그림만 돌려준다
    get(name) {
      const im = imgs[name];
      return im && im.complete && im.naturalWidth ? im : null;
    },
    // 모두 불러오면 f를 부른다 (이미 끝났으면 바로)
    whenReady(f) {
      if (pending === 0) f();
      else waiters.push(f);
    },
  };
})(typeof self !== 'undefined' ? self : this);
