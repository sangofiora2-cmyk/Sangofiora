/**
 * Sango Fiora — Seed Script
 * Imports all products from _data/plants.json into Supabase products table.
 *
 * Usage:
 *   1. Install dependency: npm install @supabase/supabase-js
 *   2. Set your env vars:
 *      export SUPABASE_URL="https://your-project.supabase.co"
 *      export SUPABASE_SERVICE_KEY="your-service-role-key"
 *   3. Run: node scripts/seed-products.js
 *
 * NOTE: Uses the SERVICE ROLE key (not anon key) to bypass RLS.
 *       Get it from Supabase Dashboard → Settings → API → service_role key
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  console.error('   Example:');
  console.error('   set SUPABASE_URL=https://your-project.supabase.co');
  console.error('   set SUPABASE_SERVICE_KEY=eyJhbGciOi...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seed() {
  console.log('🌱 Sango Fiora — Product Seeder');
  console.log('────────────────────────────────');

  // Read plants.json
  const jsonPath = path.join(__dirname, '..', '_data', 'plants.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);
  const products = data.products || [];

  console.log(`📦 Found ${products.length} products in plants.json`);

  // Transform to match Supabase table schema
  const rows = products.map(function (p) {
    return {
      slug: p.slug,
      name: p.name,
      variant: p.variant || '',
      category: p.category,
      size: p.size,
      pot_included: p.potIncluded !== false,
      price: p.price,
      mrp: p.mrp,
      discount: p.discount || 0,
      rating: p.rating || 4.5,
      reviews: p.reviews || 0,
      image: p.image,
      description: p.description || '',
      stock: 100,
      is_active: true,
      is_sold_out: false
    };
  });

  // Upsert (insert or update on conflict)
  const { data: result, error } = await supabase
    .from('products')
    .upsert(rows, { onConflict: 'slug' });

  if (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${products.length} products into Supabase!`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Go to your Supabase Dashboard → Table Editor → products');
  console.log('  2. Verify all products are there');
  console.log('  3. To make yourself an admin:');
  console.log('     - Sign up / sign in on your site');
  console.log('     - Go to Supabase Dashboard → Table Editor → profiles');
  console.log('     - Find your row and change "role" from "customer" to "admin"');
}

seed();
