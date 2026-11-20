// 단어 게임 그림(Fluent Emoji 평면 SVG, MIT)을 assets/words/ 로 내려받는다.
// 실행: node tools/fetch-words.js <저장소 파일 목록 tree.json>
//   tree.json: curl -sSL -o tree.json "https://api.github.com/repos/microsoft/fluentui-emoji/git/trees/main?recursive=1"
// 피부색이 있는 그림(귀, 발 등)은 Default(노란색)를 쓴다.
const fs = require('fs');
const path = require('path');
const { WORDS } = require('../js/words.js');

const tree = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).tree;
const out = path.join(__dirname, '..', 'assets', 'words');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const missing = [];
  for (const x of WORDS) {
    const file = path.join(out, x.file + '.svg');
    if (fs.existsSync(file)) continue;
    const entry = tree.find((e) => e.path.startsWith(`assets/${x.e}/Flat/`) && e.path.endsWith('_flat.svg'))
      || tree.find((e) => e.path.startsWith(`assets/${x.e}/Default/Flat/`) && e.path.endsWith('.svg'));
    if (!entry) { missing.push(x.w); continue; }
    const url = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/' + entry.path.split('/').map(encodeURIComponent).join('/');
    const res = await fetch(url);
    if (!res.ok) { missing.push(`${x.w} (${res.status})`); continue; }
    fs.writeFileSync(file, await res.text());
  }
  const have = fs.readdirSync(out).filter((f) => f.endsWith('.svg'));
  console.log('그림:', have.length, '개 / 단어', WORDS.length, '개');
  if (missing.length) console.log('없음:', missing.join(', '));
})();
