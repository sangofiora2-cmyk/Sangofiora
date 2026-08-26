const XLSX = require('xlsx');
const AdmZip = require('adm-zip');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'sango quatation fixed price.xlsx'));
const ws = wb.Sheets['Sheet1 (2)'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('=== ALL DATA ROWS (R3 onwards) ===');
for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  if (!r[0] && !r[2]) continue;
  console.log(`${r[0]}|${(r[2] || '').toString().trim()}|${r[3]}|${r[5]}|${r[6]}|${r[8]}|${r[9]}`);
}

console.log('\n=== ZIP MEDIA CONTENTS ===');
const zip = new AdmZip(path.join(__dirname, '..', 'sango quatation fixed price.xlsx'));
const entries = zip.getEntries();
const media = entries.filter(e => e.entryName.startsWith('xl/media/'));
console.log('Media files:', media.length);
media.slice(0, 20).forEach(e => {
  console.log(e.entryName, e.header.size);
});

console.log('\n=== DRAWINGS ===');
entries.filter(e => e.entryName.includes('drawing') || e.entryName.includes('rels'))
  .forEach(e => console.log(e.entryName));
