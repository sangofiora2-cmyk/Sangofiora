const fs = require('fs'), path = require('path');
const site = path.join(__dirname, '..', '_site');
function walk(d) {
  let o = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) o = o.concat(walk(p));
    else if (f.endsWith('.html')) o.push(p);
  }
  return o;
}
const files = walk(site);
const bad = new Set();
let links = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const re = /(?:href|src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1];
    links++;
    const skip = u.startsWith('#') || u.startsWith('http') || u.startsWith('mailto:') ||
      u.startsWith('tel:') || u.startsWith('data:');
    if (skip || !u) continue;
    u = u.split('#')[0].split('?')[0];
    if (!u) continue;
    const clean = u.replace(/^\//, '').replace(/\/$/, '');
    let ok = false;
    for (const c of [path.join(site, clean), path.join(site, clean, 'index.html'), path.join(site, clean + '.html')]) {
      try { if (fs.statSync(c).isFile()) { ok = true; break; } } catch (e) {}
    }
    if (!ok) bad.add(u + '  <-- ' + path.relative(site, f));
  }
}
console.log('files:', files.length, '| links checked:', links);
if (bad.size) {
  console.log('DEAD LINKS (' + bad.size + '):');
  [...bad].slice(0, 40).forEach(x => console.log(' ', x));
} else {
  console.log('ZERO dead internal links');
}
