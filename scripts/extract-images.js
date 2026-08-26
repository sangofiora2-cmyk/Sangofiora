const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const zip = new AdmZip(path.join(__dirname, '..', 'sango quatation fixed price.xlsx'));

const relsXml = zip.readAsText('xl/drawings/_rels/drawing1.xml.rels');
const relMap = {};
for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
  relMap[m[1]] = m[2].replace('../media/', '');
}

const drawXml = zip.readAsText('xl/drawings/drawing1.xml');
const anchorRe = /<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>|<xdr:oneCellAnchor[\s\S]*?<\/xdr:oneCellAnchor>/g;
const rowRe = /<xdr:from><xdr:col>(\d+)<\/xdr:col>(?:<xdr:colOff>-?\d+<\/xdr:colOff>)<xdr:row>(\d+)<\/xdr:row>/;
const anchors = [];
let m;
while ((m = anchorRe.exec(drawXml)) !== null) {
  const block = m[0];
  const rm = block.match(rowRe) || block.match(/<xdr:row>(\d+)<\/xdr:row>/);
  const em = block.match(/r:embed="(rId\d+)"/);
  if (rm && em) {
    const row = rm.length === 3 ? parseInt(rm[2], 10) : parseInt(rm[1], 10);
    anchors.push({ row, col: (block.match(/<xdr:col>(\d+)<\/xdr:col>/) || [0, 0])[1], file: relMap[em[1]] });
  }
}

anchors.sort((a, b) => a.row - b.row || Number(a.col) - Number(b.col));
console.log('Anchors found:', anchors.length);

// Detect duplicates on same row (stacked images)
const byRow = {};
for (const a of anchors) {
  (byRow[a.row] = byRow[a.row] || []).push(a.file);
}
console.log('\nRow -> image(s):');
Object.keys(byRow).sort((a, b) => a - b).forEach(r => console.log(`sheetRow0=${r} (display ${Number(r) + 1}):`, byRow[r].join(', ')));

fs.writeFileSync(path.join(__dirname, 'image-map.json'), JSON.stringify(anchors, null, 2));
console.log('\nSaved scripts/image-map.json');
