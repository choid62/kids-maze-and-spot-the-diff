// Fluent Emoji(MIT) 평면 SVG를 내려받는다. 실행: node tools/fetch-emoji.js <저장소 파일 목록 tree.json>
const fs = require('fs');
const path = require('path');
const names = require('./emoji-list.js');

const tree = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).tree;
const out = path.join(__dirname, '..', 'assets', 'fluent-emoji');
fs.mkdirSync(out, { recursive: true });
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

(async () => {
  const missing = [];
  for (const name of names) {
    const entry = tree.find((e) => e.path.startsWith(`assets/${name}/Flat/`) && e.path.endsWith('_flat.svg'));
    if (!entry) { missing.push(name); continue; }
    const file = path.join(out, slug(name) + '.svg');
    if (fs.existsSync(file)) continue;
    const url = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/' + entry.path.split('/').map(encodeURIComponent).join('/');
    const res = await fetch(url);
    if (!res.ok) { missing.push(name + ' (' + res.status + ')'); continue; }
    fs.writeFileSync(file, await res.text());
  }
  console.log('받음:', fs.readdirSync(out).filter((f) => f.endsWith('.svg')).length, '개');
  if (missing.length) console.log('없음:', missing.join(', '));
})();
