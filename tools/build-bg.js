// Kenney 배경 조각(PNG)의 크기를 읽어 js/bg-data.js 로 만든다. 실행: node tools/build-bg.js
// 그림: Kenney "Background Elements Redux" (CC0, assets/kenney/License.txt)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'kenney');
const OUT = path.join(__dirname, '..', 'js', 'bg-data.js');
const sizes = {};
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.png')).sort()) {
  const b = fs.readFileSync(path.join(SRC, f));
  sizes[f.replace(/\.png$/, '')] = [b.readUInt32BE(16), b.readUInt32BE(20)];
}
fs.writeFileSync(OUT, '// 자동 생성 파일 (tools/build-bg.js). 그림 이름 → [너비, 높이]\n' +
  '(function (root) {\n  const BG_SIZES = ' + JSON.stringify(sizes) + ';\n' +
  "  if (typeof module !== 'undefined' && module.exports) module.exports = BG_SIZES;\n  else root.BG_SIZES = BG_SIZES;\n" +
  "})(typeof self !== 'undefined' ? self : this);\n");
console.log(`배경 조각 ${Object.keys(sizes).length}개 → js/bg-data.js`);
