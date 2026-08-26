-- ============================================================
-- Sango Fiora — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. PRODUCTS TABLE (replaces hardcoded plants.json)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  variant TEXT DEFAULT '',
  category TEXT NOT NULL,
  size TEXT NOT NULL,
  pot_included BOOLEAN DEFAULT true,
  price INTEGER NOT NULL,
  mrp INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  image TEXT NOT NULL,
  description TEXT,
  stock INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  is_sold_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. USER PROFILES (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  shipping_address TEXT NOT NULL,
  landmark TEXT,
  pincode TEXT NOT NULL,
  city TEXT,
  state TEXT,
  gstin TEXT,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_status TEXT DEFAULT 'Pending',
  txn_id TEXT,
  subtotal INTEGER DEFAULT 0,
  mrp_total INTEGER DEFAULT 0,
  mrp_savings INTEGER DEFAULT 0,
  coupon_code TEXT,
  coupon_discount INTEGER DEFAULT 0,
  delivery_fee INTEGER DEFAULT 0,
  gst_amount INTEGER DEFAULT 0,
  net_total INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Order Placed',
  status_step INTEGER DEFAULT 1,
  est_delivery_date TEXT,
  tracking_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ORDER LINE ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_slug TEXT,
  product_image TEXT,
  product_variant TEXT DEFAULT '',
  product_category TEXT DEFAULT '',
  size TEXT,
  price INTEGER NOT NULL,
  mrp INTEGER DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. COUPONS TABLE (replaces hardcoded coupons)
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  percent INTEGER NOT NULL CHECK (percent > 0 AND percent <= 100),
  label TEXT NOT NULL,
  min_subtotal INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER DEFAULT NULL,
  times_used INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  product_slug TEXT,
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CART (for logged-in user sync)
CREATE TABLE IF NOT EXISTS user_carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  items JSONB DEFAULT '[]',
  coupon_code TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. WISHLIST (for logged-in user sync)
CREATE TABLE IF NOT EXISTS user_wishlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  items JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Helper function to check if current user is admin (SECURITY DEFINER bypasses RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public can read active products" ON products;
DROP POLICY IF EXISTS "Admins can do everything with products" ON products;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Admins can do everything with orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can do everything with order items" ON order_items;
DROP POLICY IF EXISTS "Public can read active coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;
DROP POLICY IF EXISTS "Anyone can insert analytics" ON analytics_events;
DROP POLICY IF EXISTS "Admins can read analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can manage own cart" ON user_carts;
DROP POLICY IF EXISTS "Users can manage own wishlist" ON user_wishlists;

-- PRODUCTS: Anyone can read active products; only admins can write
CREATE POLICY "Public can read active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can do everything with products" ON products
  FOR ALL USING (is_admin());

-- PROFILES: Users can read/update own profile; admins can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ORDERS: Users see own orders; admins see all
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete orders" ON orders
  FOR DELETE USING (is_admin());

-- ORDER ITEMS: Follow parent order access or admin
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Users can insert own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Admins can update order items" ON order_items
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete order items" ON order_items
  FOR DELETE USING (is_admin());

-- COUPONS: Anyone can read active coupons; admins can write
CREATE POLICY "Public can read active coupons" ON coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON coupons
  FOR ALL USING (is_admin());

-- ANALYTICS: Admins can read; anyone can insert
CREATE POLICY "Anyone can insert analytics" ON analytics_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read analytics" ON analytics_events
  FOR SELECT USING (is_admin());

-- USER CARTS: Users can manage own cart
CREATE POLICY "Users can manage own cart" ON user_carts
  FOR ALL USING (auth.uid() = user_id);

-- USER WISHLISTS: Users can manage own wishlist
CREATE POLICY "Users can manage own wishlist" ON user_wishlists
  FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- AUTO-UPDATE TRIGGER (updated_at)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS orders_updated_at ON orders;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN-UP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- SEED DEFAULT COUPONS (from the original hardcoded ones)
-- ============================================================
INSERT INTO coupons (code, percent, label, min_subtotal, is_active) VALUES
  ('WELCOME10', 10, '10% New Member Discount', 0, true),
  ('PLANTLOVE15', 15, '15% Plant Lover Discount', 0, true),
  ('BULK20', 20, '20% Bulk Order Discount', 5000, true),
  ('SANGO10', 10, '10% Welcome Discount', 0, true)
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- SEED PRODUCTS FROM EXISTING plants.json
-- (Run the import script separately — see scripts/seed-products.js)
-- ============================================================
-- Products are imported via the seed script which reads _data/plants.json
-- and inserts all 76 products into this table.
