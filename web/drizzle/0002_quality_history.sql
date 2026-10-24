-- Existing prices are unconfirmed until re-observed. Never infer a total from financing flags.
ALTER TABLE listings ADD COLUMN price_kind TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE listings ADD COLUMN km_known INTEGER NOT NULL DEFAULT 1;
ALTER TABLE listings ADD COLUMN usd_rate REAL;
ALTER TABLE listings ADD COLUMN rate_date TEXT;
ALTER TABLE listings ADD COLUMN score_confidence TEXT NOT NULL DEFAULT 'insufficient';
ALTER TABLE listings ADD COLUMN comparable_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN reference_price REAL;
ALTER TABLE listings ADD COLUMN inferred_fields TEXT NOT NULL DEFAULT '[]';
ALTER TABLE listings ADD COLUMN duplicate_group TEXT;
UPDATE listings SET km_known = 0 WHERE km = 0;
UPDATE listings SET price_ars = price WHERE currency = 'ARS' AND price_ars IS NULL;
UPDATE listings SET deal_score = 0;
UPDATE listings SET province = 'CABA' WHERE lower(province) IN ('capital federal', 'ciudad autónoma buenos aires', 'ciudad autonoma buenos aires', 'ciudad autónoma de buenos aires', 'ciudad autonoma de buenos aires');
CREATE INDEX idx_listings_eligible_price ON listings(is_active, price_kind, price_ars, id);
CREATE INDEX idx_listings_comparables ON listings(brand, model, year, price_kind);
CREATE TABLE price_history (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 listing_id TEXT NOT NULL,
 price REAL NOT NULL,
 currency TEXT NOT NULL,
 price_kind TEXT NOT NULL,
 observed_at TEXT NOT NULL
);
CREATE INDEX idx_history_listing ON price_history(listing_id, observed_at);
-- Capture original currency amounts, so FX changes cannot generate false price drops.
CREATE TRIGGER listing_first_price AFTER INSERT ON listings BEGIN
 INSERT INTO price_history(listing_id, price, currency, price_kind, observed_at)
 VALUES(NEW.id, NEW.price, NEW.currency, NEW.price_kind, NEW.updated_at);
END;
CREATE TRIGGER listing_changed_price AFTER UPDATE OF price, currency, price_kind ON listings
WHEN OLD.price != NEW.price OR OLD.currency != NEW.currency OR OLD.price_kind != NEW.price_kind BEGIN
 INSERT INTO price_history(listing_id, price, currency, price_kind, observed_at)
 VALUES(NEW.id, NEW.price, NEW.currency, NEW.price_kind, NEW.updated_at);
END;
CREATE TABLE scrape_runs (
 id TEXT PRIMARY KEY, source TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT,
 status TEXT NOT NULL, found INTEGER NOT NULL DEFAULT 0, written INTEGER NOT NULL DEFAULT 0,
 rejected INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE INDEX idx_runs_source ON scrape_runs(source, started_at);
