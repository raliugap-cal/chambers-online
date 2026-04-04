-- ================================================================
-- Chambers-online — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- ── Extensiones ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROVIDERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id            TEXT PRIMARY KEY DEFAULT 'pv_' || substr(gen_random_uuid()::text, 1, 12),
  name          TEXT NOT NULL,
  business_name TEXT,
  type          TEXT DEFAULT 'individual' CHECK (type IN ('individual','company')),
  country       TEXT DEFAULT 'mx',
  currency      TEXT DEFAULT 'MXN',
  services      JSONB DEFAULT '[]',
  rating        NUMERIC(3,1) DEFAULT 0,
  review_count  INT DEFAULT 0,
  dist          NUMERIC(5,2) DEFAULT 1.0,
  price         INT DEFAULT 300,
  exp           INT DEFAULT 1,
  score         INT DEFAULT 50,
  verified      BOOLEAN DEFAULT false,
  status        TEXT DEFAULT 'review' CHECK (status IN ('active','review','suspended','rejected')),
  risk_score    INT DEFAULT 50,
  bookings_count INT DEFAULT 0,
  icon          TEXT DEFAULT '👤',
  email         TEXT,
  phone         TEXT,
  city          TEXT,
  bio           TEXT,
  docs          JSONB DEFAULT '{}',
  schedule      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── CLIENTS ─────────────────────────────────────────────────────
-- Note: for full auth use Supabase Auth (supabase.auth.signUp)
-- This table extends auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS clients (
  user_id    TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  first_name TEXT,
  email      TEXT UNIQUE NOT NULL,
  pwd_hash   TEXT NOT NULL,  -- simple hash for demo; use Supabase Auth in production
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOOKINGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  client_name    TEXT,
  provider_id    TEXT REFERENCES providers(id) ON DELETE SET NULL,
  provider_name  TEXT,
  service        TEXT,
  category       TEXT,
  date           TEXT,
  time           TEXT,
  price          NUMERIC(10,2) DEFAULT 0,
  platform_fee   NUMERIC(10,2) DEFAULT 0,
  tip            NUMERIC(10,2) DEFAULT 0,
  total          NUMERIC(10,2) DEFAULT 0,
  status         TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'escrow',
  dist           TEXT,
  notes          TEXT,
  rated          BOOLEAN DEFAULT false,
  rating_value   INT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── REVIEWS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  provider_id TEXT REFERENCES providers(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── ADS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ads (
  id                TEXT PRIMARY KEY DEFAULT 'ad_' || substr(gen_random_uuid()::text, 1, 12),
  provider_id       TEXT REFERENCES providers(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  tagline           TEXT,
  promo_text        TEXT,
  promo_badge       TEXT,
  promo_badge_color TEXT DEFAULT 'accent',
  image_url         TEXT,
  logo_url          TEXT,
  cta_label         TEXT DEFAULT 'Ver oferta',
  url               TEXT,
  icon              TEXT DEFAULT '📢',
  category          TEXT,
  plan              TEXT DEFAULT 'basic' CHECK (plan IN ('basic','standard','premium')),
  placement         TEXT DEFAULT 'both',
  budget            NUMERIC(10,2) DEFAULT 0,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active','paused','expired')),
  impressions       INT DEFAULT 0,
  clicks            INT DEFAULT 0,
  start_date        DATE,
  end_date          DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── CATEGORIES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT,
  description TEXT,
  active      BOOLEAN DEFAULT true,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── ANALYTICS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id         BIGSERIAL PRIMARY KEY,
  event      TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DISPUTES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id          TEXT PRIMARY KEY DEFAULT 'dp_' || substr(gen_random_uuid()::text, 1, 10),
  booking_id  TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  user_id     TEXT,
  provider_id TEXT REFERENCES providers(id) ON DELETE SET NULL,
  reason      TEXT,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','review','resolved','urgent')),
  resolution  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- Row Level Security (RLS)
-- Para MVP con anon key: permitir todo (ajustar en producción)
-- ================================================================
ALTER TABLE providers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes        ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas para anon key (MVP) — restringir en producción
CREATE POLICY "anon_all_providers"        ON providers        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_clients"          ON clients          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_bookings"         ON bookings         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_reviews"          ON reviews          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_ads"              ON ads              FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_categories"       ON categories       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_analytics"        ON analytics_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_disputes"         ON disputes         FOR ALL TO anon USING (true) WITH CHECK (true);

-- ================================================================
-- Triggers — auto-update updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_providers_updated_at
  BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- Seed data — proveedores demo
-- ================================================================
INSERT INTO providers (id, name, business_name, type, country, currency, services,
  rating, review_count, dist, price, exp, score, verified, status, risk_score,
  bookings_count, icon, email, phone, city, schedule)
VALUES
  ('pv_demo1','Herrero Pro S.A.','Herrero Pro S.A.','company','mx','MXN',
   '["herreria","soldadura"]',4.9,127,1.2,450,8,94,true,'active',8,87,
   '⚒️','herrpro@demo.mx','+525512345678','Ciudad de México',
   '{"active":[true,true,true,true,true,false,false],"starts":["09:00","09:00","09:00","09:00","09:00","",""],"ends":["18:00","18:00","18:00","18:00","18:00","",""]}'),
  ('pv_demo2','Juan Martínez',NULL,'individual','mx','MXN',
   '["herreria"]',4.7,84,0.8,300,5,88,true,'active',12,64,
   '🔨','juan@demo.mx','+525598765432','Ciudad de México',
   '{"active":[true,true,true,true,true,false,false],"starts":["08:00","08:00","08:00","08:00","08:00","",""],"ends":["17:00","17:00","17:00","17:00","17:00","",""]}'),
  ('pv_demo3','Roberto Sánchez',NULL,'individual','mx','MXN',
   '["plomeria"]',4.8,56,2.1,350,7,86,true,'active',10,48,
   '🔧','roberto@demo.mx','+525511112222','Guadalajara',
   '{"active":[true,true,true,true,true,true,false],"starts":["08:00","08:00","08:00","08:00","08:00","09:00",""],"ends":["18:00","18:00","18:00","18:00","18:00","14:00",""]}'),
  ('pv_demo4','María López',NULL,'individual','mx','MXN',
   '["carpinteria"]',4.9,62,1.5,380,6,91,true,'active',5,44,
   '🪚','maria@demo.mx','+525533334444','Monterrey',
   '{"active":[true,true,true,true,true,false,false],"starts":["09:00","09:00","09:00","09:00","09:00","",""],"ends":["17:00","17:00","17:00","17:00","17:00","",""]}')
ON CONFLICT (id) DO NOTHING;
