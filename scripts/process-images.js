const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const MEDIA = path.join(ROOT, '_xlsx-media');
const OUT_DIR = path.join(ROOT, 'src', 'images', 'products');
fs.mkdirSync(OUT_DIR, { recursive: true });

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products-raw.json'), 'utf8'));

(async () => {
  let done = 0, failed = [];
  const seen = new Set();
  for (const p of products) {
    if (!p.hasPhoto) continue;
    if (!fs.existsSync(path.join(MEDIA, p.imageFile))) { console.log('MISSING SOURCE:', p.slug, p.imageFile); continue; }
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    try {
      await sharp(path.join(MEDIA, p.imageFile))
        .rotate() // respect EXIF
        .resize({ width: 3840, height: 3840, fit: 'inside', kernel: 'lanczos3', withoutEnlargement: false })
        .jpeg({ quality: 80, progressive: true, mozjpeg: true })
        .toFile(path.join(OUT_DIR, p.slug + '.jpg'));
      done++;
      if (done % 15 === 0) console.log('Processed', done, '...');
    } catch (e) {
      failed.push(p.slug + ': ' + e.message);
    }
  }
  console.log('DONE. Processed:', done);
  if (failed.length) console.log('FAILED:\n' + failed.join('\n'));
})();
