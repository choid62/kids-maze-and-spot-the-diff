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
    say(text) {
      if (!Store.get('voice')) return;
      try {
        const s = root.speechSynthesis;
        if (!s) return;
        s.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR';
        u.rate = 0.95;
        u.pitch = 1.3;
        const v = s.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('ko'));
        if (v) u.voice = v;
        s.speak(u);
      } catch (e) { /* 음성 미지원 */ }
    },
  };
})(typeof self !== 'undefined' ? self : this);
