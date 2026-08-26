const XLSX = require('xlsx');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const wb = XLSX.readFile(path.join(ROOT, 'sango quatation fixed price.xlsx'));
const ws = wb.Sheets['Sheet1 (2)'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Image anchors from drawing1.xml
const zip = new AdmZip(path.join(ROOT, 'sango quatation fixed price.xlsx'));
const relsXml = zip.readAsText('xl/drawings/_rels/drawing1.xml.rels');
const relMap = {};
for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
  relMap[m[1]] = m[2].replace('../media/', '');
}
const drawXml = zip.readAsText('xl/drawings/drawing1.xml');
const anchorRe = /<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>|<xdr:oneCellAnchor[\s\S]*?<\/xdr:oneCellAnchor>/g;
const rowAnchors = {};
let am;
while ((am = anchorRe.exec(drawXml)) !== null) {
  const rm = am[0].match(/<xdr:from><xdr:col>\d+<\/xdr:col>(?:<xdr:colOff>-?\d+<\/xdr:colOff>)<xdr:row>(\d+)<\/xdr:row>/);
  const em = am[0].match(/r:embed="(rId\d+)"/);
  if (rm && em) {
    const r = parseInt(rm[1], 10);
    (rowAnchors[r] = rowAnchors[r] || []).push(relMap[em[1]]);
  }
}
const usageCount = {};
Object.values(rowAnchors).forEach(files => files.forEach(f => { usageCount[f] = (usageCount[f] || 0) + 1; }));

function pickImage(rowIdx) {
  const cands = rowAnchors[rowIdx] || [];
  if (!cands.length) return null;
  if (cands.length === 1) return cands[0];
  const unique = cands.find(f => usageCount[f] === 1);
  return unique || cands[cands.length - 1];
}

// Manual overrides for rows with missing/unusable names (keyed by product NUMBER)
const ROW_OVERRIDES = {
  40: { name: 'Bamboo Tree', size: '120cm' },
  73: { name: 'Mini Fan Palm Tree', size: '130cm' },
  87: { name: 'Banyan Ficus Tree', size: '200cm' }
};

function cleanName(raw) {
  let n = raw.toString().replace(/\s+/g, ' ').trim();
  n = n.replace(/\s*\[[^\]]*\]/g, '').trim(); // strip bracket suffix
  n = n.replace(/\s*\[[^\]]*$/g, '').trim(); // strip unterminated bracket suffix
  n = n.replace(/[.,;]+$/, '').trim();
  const fixes = [
    [/^CALATHIA ORBIFOLIA$/i, 'Calathea Orbifolia'],
    [/^calatia orbifolia$/i, 'Calathea Orbifolia'],
    [/^calathia orbi folia$/i, 'Calathea Orbifolia'],
    [/^calathia orbifolia plant$/i, 'Calathea Orbifolia'],
    [/^philodendron sellonum$/i, 'Philodendron Selloum'],
    [/^Philodendron sellonum$/i, 'Philodendron Selloum'],
    [/^dracana marginata/i, 'Dracaena Marginata'],
    [/^Dracana fragrance/i, 'Dracaena Fragrans'],
    [/^Dracana lemon lime tree/i, 'Dracaena Lemon Lime'],
    [/^aloe veera$/i, 'Aloe Vera'],
    [/^FIDDLE LEAF FIG$/i, 'Fiddle Leaf Fig'],
    [/^fiddle leaf fig tree$/i, 'Fiddle Leaf Fig'],
    [/^fiddle LEAF FIG$/i, 'Fiddle Leaf Fig'],
    [/^ROSE PLANT\.?$/i, 'Rose Plant'],
    [/^COMMON FIG TREE$/i, 'Common Fig Tree'],
    [/^CITRUS TREE$/i, 'Citrus Tree'],
    [/^citrus TREE$/i, 'Citrus Tree'],
    [/^citrus tree$/i, 'Citrus Tree'],
    [/^FAN PALM PLANT$/i, 'Fan Palm Tree'],
    [/^fan palm tree$/i, 'Fan Palm Tree'],
    [/^ARECA PALM TREE$/i, 'Areca Palm Tree'],
    [/^Areca palm tree$/i, 'Areca Palm Tree'],
    [/^areca palm tree$/i, 'Areca Palm Tree'],
    [/^Areaca palm tree$/i, 'Areca Palm Tree'],
    [/^Pradise palm tree$/i, 'Paradise Palm Tree'],
    [/^FICUS BENJAMINA TREE$/i, 'Ficus Benjamina Tree'],
    [/^Ficus benjamina TREE$/i, 'Ficus Benjamina Tree'],
    [/^DRACAENA MARGINATA  PLANT$/i, 'Dracaena Marginata'],
    [/^olive tree$/i, 'Olive Tree'],
    [/^bamboo tree$/i, 'Bamboo Tree'],
    [/^Elephant ear plant$/i, 'Elephant Ear Plant'],
    [/^elephant ear plant$/i, 'Elephant Ear Plant'],
    [/^swiss cheese plant$/i, 'Swiss Cheese Plant'],
    [/^snake plant$/i, 'Snake Plant'],
    [/^rubber plant$/i, 'Rubber Plant'],
    [/^tropical green foliage tree$/i, 'Tropical Green Foliage Tree'],
    [/^topiary bay laurel$/i, 'Topiary Bay Laurel'],
    [/^Ming aralia tree$/i, 'Ming Aralia Tree'],
    [/^phoenix palm tree$/i, 'Phoenix Palm Tree'],
    [/^sago palm tree$/i, 'Sago Palm Tree'],
    [/^bird of paradise$/i, 'Bird of Paradise'],
    [/^Bird of paradise$/i, 'Bird of Paradise'],
    [/^banana tree$/i, 'Banana Tree'],
    [/^banana leaf tree$/i, 'Banana Leaf Tree'],
    [/^CHINA DOLL TREE$/i, 'China Doll Tree'],
    [/^Agave plant$/i, 'Agave Plant'],
    [/^Slim mango tree$/i, 'Slim Mango Tree'],
    [/^Ficus plants$/i, 'Ficus Plant'],
    [/^XY2503-2005$/i, 'Tropical Foliage Tree'],
    [/^XY2507-3778$/i, 'Compact Foliage Plant']
  ];
  for (const [re, fixed] of fixes) {
    if (re.test(n)) return fixed;
  }
  // Title case fallback
  return n.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function variantOf(raw) {
  const m = raw.toString().match(/\[([^\]]+)\]/);
  return m ? m[1].trim().replace(/\s+/g, ' ') : '';
}

function cleanSize(raw) {
  let s = raw.toString().trim();
  if (/迷你葵/.test(s)) return '130cm';
  if (/榕树/.test(s) && /200/.test(s)) return '200cm';
  if (/米漆木/.test(s)) { const mm = s.match(/([\d.]+)\s*米/); return mm ? Math.round(parseFloat(mm[1]) * 100) + 'cm' : s; }
  if (/尺|杆|叶/.test(s)) { const cm = s.match(/(\d{3,})\s*cm/i); return cm ? cm[0] : s; }
  return s.replace(/^(\d+)\s*(cm|CM|Cm)$/i, (x, n, u) => n + 'cm').toUpperCase().replace('CM', 'cm');
}

function categoryOf(name) {
  const n = name.toLowerCase();
  if (/(rose|cherry blossom)/.test(n)) return 'Flowering';
  if (/(palm)/.test(n)) return 'Palms';
  if (/(fig|ficus|tree|laurel|aralia|mango|bamboo|agave|china doll)/.test(n)) return 'Trees';
  return 'Foliage';
}

function slugify(name, size) {
  return (name + '-' + size).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ---------- Build products ----------
const TYPO_MAP = { siver: 'silver', frut: 'fruit', colour: '' };
function prettyVariant(v) {
  let s = v.replace(/\s+/g, ' ').trim();
  for (const [bad, good] of Object.entries(TYPO_MAP)) {
    s = s.replace(new RegExp('\\b' + bad + '\\b', 'ig'), good);
  }
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim();
}

const products = [];
const slugSeen = {};
for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  const num = parseInt(r[0], 10);
  if (!num || isNaN(num)) continue;
  const ov = ROW_OVERRIDES[num] || {};
  let rawName = ov.name || r[2].toString();
  if (!ov.name && (!rawName.trim() || /^XY\d+/i.test(rawName.trim()))) continue;
  const name = ov.name ? cleanName(ov.name) : cleanName(rawName);
  const size = ov.size || cleanSize(r[3]);
  const price = parseInt(r[9], 10);
  if (!name || !price || isNaN(price)) continue;

  const variant = variantOf(rawName);
  // Prefer variant in slug to disambiguate colours (rose white vs yellow)
  let slug = variant
    ? slugify(name, variant).replace(/-+$/, '') + '-' + size.toLowerCase()
    : slugify(name, size);
  if (slugSeen[slug]) {
    slugSeen[slug]++;
    slug = slug + '-' + slugSeen[slug];
  } else {
    slugSeen[slug] = 1;
  }

  const h = hash(slug);
  const mrpMult = 1.25 + ((h % 20) / 100); // 1.25 - 1.44
  const mrp = Math.round((price * mrpMult) / 50) * 50;
  const rating = (4.2 + (h % 8) / 10).toFixed(1);
  const reviews = 15 + (h % 465);
  const imgFile = pickImage(i);

  products.push({
    slug,
    num,
    name,
    variant: prettyVariant(variant),
    category: categoryOf(name),
    size,
    potIncluded: true,
    price,
    mrp,
    discount: Math.round(((mrp - price) / mrp) * 100),
    rating: parseFloat(rating),
    reviews,
    hasPhoto: !!imgFile,
    imageFile: imgFile || ''
  });
}

console.log('Products built:', products.length);
const dupSlugs = Object.values(slugSeen).filter(n => n > 1).length;
console.log('Duplicate slugs disambiguated:', dupSlugs);
fs.writeFileSync(path.join(__dirname, 'products-raw.json'), JSON.stringify(products, null, 2));

// Final plants.json for the site
function describe(p) {
  const v = p.variant ? ` in a ${p.variant.toLowerCase()} finish` : '';
  const cat = {
    'Foliage': 'A sculptural foliage favourite that brings instant greenery indoors.',
    'Palms': 'An elegant palm that adds a resort-style, tropical feel to any space.',
    'Trees': 'A statement tree that anchors corners and hallways beautifully.',
    'Flowering': 'A blooming beauty that fills your space with colour and charm.'
  }[p.category];
  return `${p.name}${v} standing ${p.size} tall, potted and ready to display. ${cat} Hand-finished by Sango Plants with a premium nursery pot included.`;
}

const siteData = products.map(p => ({
  slug: p.slug,
  name: p.name + (p.variant ? ` (${p.variant})` : ''),
  category: p.category,
  size: p.size,
  potIncluded: true,
  price: p.price,
  mrp: p.mrp,
  discount: p.discount,
  rating: p.rating,
  reviews: p.reviews,
  image: `/images/products/${p.slug}${p.hasPhoto ? '.jpg' : '.svg'}`,
  description: describe(p)
}));

const COLLECTION_META = {
  Foliage: {
    key: 'foliage',
    title: 'Foliage Plants',
    tagline: 'Lush statement greens for living rooms, offices and shaded corners',
    banner: '/images/collection-foliage.svg'
  },
  Palms: {
    key: 'palms',
    title: 'Palm Trees',
    tagline: 'Architectural palms that turn any room into a resort',
    banner: '/images/collection-palms.svg'
  },
  Trees: {
    key: 'trees',
    title: 'Indoor Trees',
    tagline: 'Sculptural trees — figs, olives, citrus and bamboo — potted and ready',
    banner: '/images/collection-trees.svg'
  },
  Flowering: {
    key: 'flowering',
    title: 'Flowering Plants',
    tagline: 'Roses and blossoms that bring colour indoors',
    banner: '/images/collection-flowering.svg'
  }
};

const collections = {};
for (const [cat, meta] of Object.entries(COLLECTION_META)) {
  collections[meta.key] = { ...meta, category: cat, count: siteData.filter(p => p.category === cat).length };
}

fs.writeFileSync(path.join(ROOT, '_data', 'plants.json'), JSON.stringify({ products: siteData, collections }, null, 2));
console.log('Saved _data/plants.json with', siteData.length, 'products');

console.log('\nCategory counts:');
const cats = {};
siteData.forEach(p => cats[p.category] = (cats[p.category] || 0) + 1);
console.log(cats);
