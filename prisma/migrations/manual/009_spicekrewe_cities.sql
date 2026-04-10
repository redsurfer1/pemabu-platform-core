-- Rank 9 — SpiceKrewe cities registry + GigLocation city_slug (manual)
CREATE TABLE IF NOT EXISTS "SpiceKreweCity" (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  is_live BOOLEAN DEFAULT FALSE,
  launched_at TIMESTAMPTZ,
  hero_image_url TEXT,
  tagline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO "SpiceKreweCity"
  (id, slug, display_name, state_code, is_live, launched_at)
VALUES
  ('city_memphis', 'memphis', 'Memphis', 'TN', TRUE, NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "SpiceKreweCity"
  (id, slug, display_name, state_code, is_live)
VALUES
  ('city_new_orleans', 'new_orleans', 'New Orleans', 'LA', FALSE),
  ('city_nashville', 'nashville', 'Nashville', 'TN', FALSE),
  ('city_austin', 'austin', 'Austin', 'TX', FALSE),
  ('city_charleston', 'charleston', 'Charleston', 'SC', FALSE),
  ('city_savannah', 'savannah', 'Savannah', 'GA', FALSE)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE "GigLocation"
  ADD COLUMN IF NOT EXISTS city_slug TEXT;

UPDATE "GigLocation"
SET city_slug = 'memphis'
WHERE LOWER(city) LIKE '%memphis%';

UPDATE "GigLocation"
SET city_slug = 'nashville'
WHERE LOWER(city) LIKE '%nashville%';

UPDATE "GigLocation"
SET city_slug = 'new_orleans'
WHERE LOWER(city) LIKE '%new%orleans%'
   OR LOWER(city) LIKE '%new_orleans%';

CREATE INDEX IF NOT EXISTS "GigLocation_city_slug_idx" ON "GigLocation" (city_slug);
