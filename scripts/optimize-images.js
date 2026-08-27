const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'images', 'products');
const SITE_DIR = path.join(ROOT, '_site', 'images', 'products');

(async () => {
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));
  console.log(`Optimizing ${files.length} product images...`);
  
  let totalSaved = 0;
  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const sitePath = path.join(SITE_DIR, file);
    const statBefore = fs.statSync(srcPath).size;

    const tmpPath = srcPath + '.tmp';
    await sharp(srcPath)
      .rotate()
      .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true })
      .toFile(tmpPath);

    fs.renameSync(tmpPath, srcPath);
    if (fs.existsSync(SITE_DIR)) {
      try {
        fs.copyFileSync(srcPath, sitePath);
      } catch (e) {}
    }

    const statAfter = fs.statSync(srcPath).size;
    totalSaved += (statBefore - statAfter);
  }

  console.log(`DONE! Total payload saved: ${(totalSaved / (1024 * 1024)).toFixed(2)} MB`);
})();
