// 효과음은 파일 없이 직접 합성하고, 칭찬은 기기의 한국어 음성으로 읽는다.
(function (root) {
  let ac = null;

  function audio() {
    if (!ac) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, start, dur, type, vol) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  const on = () => Store.get('sound');

  root.Sound = {
    unlock() { if (on()) audio(); },
    step() { if (on()) tone(620 + Math.random() * 120, 0, 0.06, 'sine', 0.05); },
    bump() { if (on()) tone(170, 0, 0.12, 'triangle', 0.15); },
    tap() { if (on()) tone(520, 0, 0.05, 'sine', 0.08); },
    miss() { if (on()) tone(330, 0, 0.1, 'sine', 0.07); },
    found() {
      if (!on()) return;
      tone(880, 0, 0.12, 'sine', 0.2);
      tone(1320, 0.1, 0.2, 'sine', 0.2);
    },
    win() {
      if (!on()) return;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.28, 'triangle', 0.2));
    },
    // 말하면서 시작/단어/끝 알림을 받는다 (그림을 목소리에 맞출 때).
    // h.start(), h.word(글자 위치), h.end(). 목소리가 꺼져 있거나 안 되면 false 를 돌려주고 아무것도 부르지 않는다.
    speak(text, h) {
      if (!Store.get('voice')) return false;
      try {
        const s = root.speechSynthesis;
        if (!s) return false;
        s.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.95;
        u.pitch = 1.3;
        const voices = s.getVoices();
        const v = voices.find((x) => x.lang === 'en-US') || voices.find((x) => x.lang && x.lang.toLowerCase().startsWith('en'));
        if (v) u.voice = v;
        u.onstart = () => h.start && h.start();
        u.onboundary = (e) => { if (h.word && (!e.name || e.name === 'word')) h.word(e.charIndex); };
        u.onend = () => h.end && h.end(true);
        u.onerror = () => h.end && h.end(false);
        s.speak(u);
        return true;
      } catch (e) { return false; }
    },
    // done: 다 말한 뒤 부를 함수 (선택). 목소리가 꺼져 있거나 안 되는 기기에서도 maxMs 뒤에는 꼭 한 번 부른다.
    say(text, done, maxMs) {
      let called = false;
      const finish = () => { if (!called) { called = true; if (done) done(); } };
      if (done) setTimeout(finish, maxMs || 1500);
      if (!Store.get('voice')) { if (done) setTimeout(finish, 350); return; }
      try {
        const s = root.speechSynthesis;
        if (!s) { if (done) setTimeout(finish, 350); return; }
        s.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; // 영어 음성은 거의 모든 기기에 깔려 있다
        u.rate = 0.95;
        u.pitch = 1.3;
        const voices = s.getVoices();
        const v = voices.find((x) => x.lang === 'en-US') || voices.find((x) => x.lang && x.lang.toLowerCase().startsWith('en'));
        if (v) u.voice = v;
        if (done) { u.onend = finish; u.onerror = finish; }
        s.speak(u);
      } catch (e) { if (done) setTimeout(finish, 350); }
    },
  };
})(typeof self !== 'undefined' ? self : this);
