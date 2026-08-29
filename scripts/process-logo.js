const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function process() {
  const srcPath = path.resolve('C:/Users/KISHORE V/.gemini/antigravity-ide/brain/20aeaaf4-d597-4977-a2f0-21fef09922d5/.user_uploaded/media_1787976258800.png');
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  
  const width = info.width;
  const height = info.height;
  const outBuf = Buffer.alloc(width * height * 4);
  
  // Row bg calculation
  const rowBg = [];
  for (let y = 0; y < height; y++) {
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let x = 0; x < 12; x++) {
      const idx = (y * width + x) * 4;
      rSum += data[idx]; gSum += data[idx+1]; bSum += data[idx+2]; count++;
    }
    for (let x = width - 12; x < width; x++) {
      const idx = (y * width + x) * 4;
      rSum += data[idx]; gSum += data[idx+1]; bSum += data[idx+2]; count++;
    }
    rowBg.push({ r: rSum / count, g: gSum / count, b: bSum / count });
  }

  for (let y = 0; y < height; y++) {
    const bg = rowBg[y];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const lumBg = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b;
      const lumPixel = 0.299 * r + 0.587 * g + 0.114 * b;
      const diff = lumBg - lumPixel;
      
      let alpha = 0;
      if (diff < 12) {
        alpha = 0;
      } else if (diff < 35) {
        alpha = Math.round(((diff - 12) / 23) * 255);
      } else {
        alpha = 255;
      }
      
      if (alpha > 0) {
        outBuf[idx] = Math.min(r, Math.round(r * 0.95));
        outBuf[idx + 1] = Math.min(g, Math.round(g * 0.92));
        outBuf[idx + 2] = Math.min(b, Math.round(b * 0.88));
        outBuf[idx + 3] = alpha;
      } else {
        outBuf[idx] = 0;
        outBuf[idx + 1] = 0;
        outBuf[idx + 2] = 0;
        outBuf[idx + 3] = 0;
      }
    }
  }
  
  // Save trimmed transparent logo
  await sharp(outBuf, { raw: { width, height, channels: 4 } })
    .trim()
    .png()
    .toFile('images/sango-fiora-logo-transparent.png');
    
  fs.copyFileSync('images/sango-fiora-logo-transparent.png', 'images/logo.png');

  // Create clean icon
  const size = 64;
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
  );

  await sharp('images/sango-fiora-logo-transparent.png')
    .extract({ left: 196, top: 0, width: 56, height: 56 })
    .resize(size, size)
    .composite([{
      input: circleMask,
      blend: 'dest-in'
    }])
    .png()
    .toFile('images/logo-icon.png');

  // Favicon (32x32)
  await sharp('images/logo-icon.png')
    .resize(32, 32)
    .png()
    .toFile('images/favicon.png');

  console.log('All logo assets processed successfully!');
}

process().catch(console.error);
