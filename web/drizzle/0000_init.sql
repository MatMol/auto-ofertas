CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT,
  year INTEGER NOT NULL,
  is_new INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL,
  price_usd REAL,
  km INTEGER NOT NULL DEFAULT 0,
  fuel_type TEXT,
  transmission TEXT,
  body_type TEXT,
  doors INTEGER,
  is_imported INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  province TEXT NOT NULL,
  image_urls TEXT NOT NULL DEFAULT '[]',
  seller_type TEXT NOT NULL DEFAULT 'particular',
  verification_badge TEXT,
  accepts_swap INTEGER NOT NULL DEFAULT 0,
  has_financing INTEGER NOT NULL DEFAULT 0,
  deal_score REAL NOT NULL DEFAULT 0,
  consumption REAL,
  tank_capacity REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_listings_brand ON listings(brand);
CREATE INDEX IF NOT EXISTS idx_listings_year ON listings(year);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_province ON listings(province);
CREATE INDEX IF NOT EXISTS idx_listings_fuel_type ON listings(fuel_type);
CREATE INDEX IF NOT EXISTS idx_listings_transmission ON listings(transmission);
CREATE INDEX IF NOT EXISTS idx_listings_body_type ON listings(body_type);
CREATE INDEX IF NOT EXISTS idx_listings_seller_type ON listings(seller_type);
CREATE INDEX IF NOT EXISTS idx_listings_deal_score ON listings(deal_score);
CREATE INDEX IF NOT EXISTS idx_listings_km ON listings(km);
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings(is_active, brand, year, price);
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source, source_id);

CREATE TABLE IF NOT EXISTS reference_prices (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT,
  year INTEGER NOT NULL,
  avg_price REAL NOT NULL,
  min_price REAL NOT NULL,
  max_price REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS brands_models (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);
