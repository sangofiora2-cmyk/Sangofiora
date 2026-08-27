const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'src', 'images', 'products');
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'products-raw.json'), 'utf8'));

const slugImage = {};
for (const p of raw) {
  const file = path.join(IMG_DIR, p.slug + '.jpg');
  if (!slugImage[p.slug] && fs.existsSync(file)) {
    slugImage[p.slug] = '/images/products/' + p.slug + '.jpg';
  }
}
if (!fs.existsSync(path.join(IMG_DIR, 'sago-palm-tree-70cm.jpg'))) {
  if (fs.existsSync(path.join(IMG_DIR, 'sago-palm-tree-70cm.svg'))) {
    slugImage['sago-palm-tree-70cm'] = '/images/products/sago-palm-tree-70cm.svg';
  } else {
    slugImage['sago-palm-tree-70cm'] = '/images/products/fan-palm-tree-120cm.jpg';
  }
}

function descFor(p) {
  const cat = p.category;
  const sizeLine = `standing approximately ${p.size} tall`;
  const potLine = 'delivered in a premium nursery pot';
  const map = {
    Foliage: `${p.name} ${sizeLine}, ${potLine}. A lush statement plant that thrives in bright, indirect light and instantly elevates living rooms, bedrooms and office corners.`,
    Palms: `${p.name} ${sizeLine}, ${potLine}. Architectural fronds bring resort-style calm to any space — perfect beside sofas, in entryways or on covered balconies.`,
    Trees: `${p.name} ${sizeLine}, ${potLine}. A sculptural indoor tree handpicked for structure and healthy growth, ideal as a natural focal point in modern interiors.`,
    Flowering: `${p.name} ${sizeLine}, ${potLine}. Seasonal colour and fragrance for your home — enjoy beautiful blooms with simple, low-effort care.`
  };
  return (map[cat] || map.Foliage);
}

const seen = new Set();
const products = [];
for (const p of raw) {
  if (seen.has(p.slug)) continue;
  seen.add(p.slug);
  products.push({
    slug: p.slug,
    name: p.name,
    variant: p.variant || '',
    category: p.category,
    size: p.size,
    potIncluded: true,
    price: p.price,
    mrp: p.mrp,
    discount: p.discount,
    rating: p.rating,
    reviews: p.reviews,
    image: slugImage[p.slug] || '/images/hero-bg.svg',
    description: descFor(p)
  });
}

const COLLECTIONS_LIST = [
  { key: 'foliage', title: 'Foliage', heading: 'Foliage Plants', tagline: 'Lush statement greens for every room', banner: '/images/products/calathea-orbifolia-120cm.jpg' },
  { key: 'palms', title: 'Palms', heading: 'Palm Trees', tagline: 'Resort-style palms, potted & ready', banner: '/images/products/areca-palm-tree-180cm.jpg' },
  { key: 'trees', title: 'Trees', heading: 'Indoor Trees', tagline: 'Sculptural trees as natural focal points', banner: '/images/products/fiddle-leaf-fig-180cm.jpg' },
  { key: 'flowering', title: 'Flowering', heading: 'Flowering Plants', tagline: 'Colour and fragrance, delivered', banner: '/images/products/rose-plant-white-colour-90cm.jpg' }
];
for (const c of COLLECTIONS_LIST) {
  c.count = products.filter(p => p.category === c.title).length;
}

const CARE = {
  Foliage: { light: 'Bright, indirect sunlight', water: 'Water when top soil feels dry', humidity: 'Loves misting' },
  Palms: { light: 'Bright, filtered light', water: 'Keep soil lightly moist', humidity: 'Enjoys humidity' },
  Trees: { light: 'Bright light to gentle direct sun', water: 'Water weekly, allow drainage', humidity: 'Average room humidity' },
  Flowering: { light: 'Morning sun, afternoon shade', water: 'Regular watering while blooming', humidity: 'Average room humidity' }
};

const byReviews = [...products].sort((a, b) => b.reviews - a.reviews);
const byDiscount = [...products].sort((a, b) => b.discount - a.discount);

fs.writeFileSync(path.join(ROOT, '_data', 'plants.json'), JSON.stringify({
  products,
  collectionsList: COLLECTIONS_LIST,
  careGuide: CARE,
  bestsellers: byReviews.slice(0, 8),
  deals: byDiscount.slice(0, 4),
  stats: { totalProducts: products.length, maxDiscount: byDiscount[0].discount }
}, null, 2));

console.log('CANONICAL DATA WRITTEN');
console.log('products:', products.length);
COLLECTIONS_LIST.forEach(c => console.log(` ${c.title}: ${c.count} -> /collections/${c.key}/`));
