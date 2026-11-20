// 가위바위보 규칙. 손: 'rock'(바위) | 'paper'(보) | 'scissors'(가위)
(function (root) {
  const HANDS = ['rock', 'paper', 'scissors'];
  const WIN_TO = 3; // 먼저 3번 이기면 승리
  // a 가 이기는 상대
  const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  // 이긴 이유 (화면과 목소리, 영어)
  const WHY = { rock: 'Rock breaks scissors!', paper: 'Paper covers rock!', scissors: 'Scissors cut paper!' };

  // a 기준 결과: 1 이김, -1 짐, 0 비김
  function result(a, b) {
    if (a === b) return 0;
    return BEATS[a] === b ? 1 : -1;
  }

  // 이번 판을 설명하는 말 (비기면 null)
  function reason(a, b) {
    const r = result(a, b);
    if (r === 0) return null;
    return WHY[r > 0 ? a : b];
  }

  // 로봇의 손: 아무거나
  function cpuHand(rand) {
    const r = rand || Math.random;
    return HANDS[Math.floor(r() * 3)];
  }

  const RPS = { HANDS, WIN_TO, BEATS, result, reason, cpuHand };
  if (typeof module !== 'undefined' && module.exports) module.exports = RPS;
  else root.RPS = RPS;
})(typeof self !== 'undefined' ? self : this);
