-- ============================================================================
-- ASKreader — Database Schema (PostgreSQL 15+)
-- Implements the data model in the ASKreader project blueprint, Section 9.
-- Design principles:
--   * Book and Edition are separate tables — a revised edition never
--     overwrites a published one (Section 8.2).
--   * Entitlement is the single source of truth for access control.
--   * Every administrative mutation is expected to write an audit_event row
--     (enforced at the application layer, not by trigger, to keep actor
--     context — IP, session — available).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
  'super_admin', 'content_admin', 'subscription_admin',
  'support_executive', 'individual_subscriber', 'institutional_subscriber', 'guest'
);

CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'suspended', 'deactivated');

CREATE TYPE publication_status AS ENUM (
  'draft', 'in_review', 'scheduled', 'published', 'superseded', 'withdrawn', 'archived'
);

CREATE TYPE entitlement_status AS ENUM (
  'pending', 'active', 'grace', 'expired', 'suspended', 'cancelled', 'revoked'
);

CREATE TYPE order_status AS ENUM ('created', 'pending', 'paid', 'failed', 'refunded', 'cancelled');

CREATE TYPE annotation_type AS ENUM ('bookmark', 'highlight', 'note');

CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp', 'in_app');

CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'delivered', 'failed');

-- ----------------------------------------------------------------------------
-- USERS & AUTH
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               TEXT NOT NULL,
  email              CITEXT UNIQUE,
  phone              TEXT UNIQUE,
  password_hash      TEXT,                       -- null if OTP-only account
  organisation       TEXT,
  professional_category TEXT,                    -- advocate, student, judicial officer, etc.
  state              TEXT,
  preferred_language TEXT DEFAULT 'en',
  role               user_role NOT NULL DEFAULT 'individual_subscriber',
  status             user_status NOT NULL DEFAULT 'pending_verification',
  email_verified_at  TIMESTAMPTZ,
  phone_verified_at  TIMESTAMPTZ,
  marketing_opt_in   BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_contact_present CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE otp_codes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  destination  TEXT NOT NULL,        -- email or phone this code was sent to
  code_hash    TEXT NOT NULL,
  purpose      TEXT NOT NULL,        -- 'signup', 'login', 'password_reset'
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint        TEXT NOT NULL,
  platform           TEXT,           -- 'web', 'android', 'ios'
  label              TEXT,           -- human-readable, e.g. "Chrome on Windows"
  last_active_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);

CREATE TABLE sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id        UUID REFERENCES devices(id) ON DELETE SET NULL,
  refresh_token_hash TEXT NOT NULL,
  ip_address       INET,
  user_agent       TEXT,
  expires_at       TIMESTAMPTZ NOT NULL,
  revoked_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- CATALOGUE
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  parent_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE books (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          TEXT NOT NULL,
  author_editor  TEXT,
  isbn           TEXT,
  state          TEXT,                 -- e.g. 'Uttar Pradesh', 'All-India'
  subject        TEXT,
  language       TEXT DEFAULT 'en',
  related_titles UUID[] DEFAULT '{}',  -- soft references to other books.id
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE book_categories (
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, category_id)
);

CREATE TABLE editions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id            UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  version_label      TEXT NOT NULL,          -- e.g. '3rd edition', 'Act No. 45 of 2023'
  effective_date     DATE,
  amendment_currency TEXT,                   -- e.g. 'Updated through 2025'
  editorial_note     TEXT,
  file_type          TEXT NOT NULL,          -- 'pdf' | 'epub' | 'html'
  storage_key        TEXT NOT NULL,          -- private object storage path, never public
  cover_image_key    TEXT,
  status             publication_status NOT NULL DEFAULT 'draft',
  scheduled_at       TIMESTAMPTZ,
  published_at       TIMESTAMPTZ,
  superseded_by      UUID REFERENCES editions(id) ON DELETE SET NULL,
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_editions_book_status ON editions(book_id, status);

-- Structural table of contents, one row per chapter/section, self-referencing
-- for nesting (chapter -> section -> sub-section).
CREATE TABLE edition_sections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edition_id   UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES edition_sections(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  page_start   INTEGER,                -- for fixed-layout PDF page mapping
  anchor       TEXT,                   -- anchor/id within the HTML/EPUB rendition
  search_text  TEXT                    -- plain text for full-text indexing
);
CREATE INDEX idx_edition_sections_edition ON edition_sections(edition_id);
CREATE INDEX idx_edition_sections_fts ON edition_sections USING GIN (to_tsvector('english', coalesce(search_text, '')));

CREATE TABLE amendments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  state             TEXT NOT NULL,
  amendment_source  TEXT NOT NULL,      -- Act/notification citation
  affected_provision TEXT NOT NULL,     -- section/schedule/rule/proviso
  effective_date    DATE,
  review_status     TEXT DEFAULT 'pending', -- 'pending' | 'verified'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- PLANS, ORDERS, ENTITLEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE plans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,           -- 'Starter', 'Professional', 'Complete Annual', ...
  duration_days     INTEGER NOT NULL DEFAULT 365,
  price_paise       BIGINT NOT NULL,         -- store money as integer paise, never float
  currency          TEXT NOT NULL DEFAULT 'INR',
  tax_rate_bps      INTEGER NOT NULL DEFAULT 1800, -- basis points, e.g. 1800 = 18% GST
  included_category_ids UUID[] NOT NULL DEFAULT '{}',
  included_book_ids UUID[] NOT NULL DEFAULT '{}',  -- for single-title plans
  device_limit      INTEGER NOT NULL DEFAULT 2,
  is_institutional  BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES users(id),
  plan_id            UUID NOT NULL REFERENCES plans(id),
  amount_paise       BIGINT NOT NULL,
  tax_paise          BIGINT NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'INR',
  status             order_status NOT NULL DEFAULT 'created',
  gateway            TEXT NOT NULL,          -- 'razorpay', 'cashfree', etc.
  gateway_order_id   TEXT,
  gateway_payment_id TEXT,
  invoice_number     TEXT UNIQUE,
  failure_reason     TEXT,
  idempotency_key    TEXT UNIQUE NOT NULL,   -- prevents duplicate entitlements on retried webhooks
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user ON orders(user_id);

CREATE TABLE entitlements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  plan_id         UUID NOT NULL REFERENCES plans(id),
  source_order_id UUID REFERENCES orders(id),
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  status          entitlement_status NOT NULL DEFAULT 'pending',
  auto_renew      BOOLEAN NOT NULL DEFAULT false,
  grace_days      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entitlements_user_status ON entitlements(user_id, status);
CREATE INDEX idx_entitlements_end_at ON entitlements(end_at) WHERE status = 'active';

-- Institutional seats: an institutional entitlement's usage is tracked per
-- named or concurrently-checked-out seat.
CREATE TABLE institutional_seats (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entitlement_id UUID NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES users(id),
  seat_label     TEXT,
  checked_out_at TIMESTAMPTZ,
  released_at    TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- READER WORKSPACE
-- ----------------------------------------------------------------------------
CREATE TABLE annotations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edition_id  UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  section_id  UUID REFERENCES edition_sections(id) ON DELETE SET NULL,
  type        annotation_type NOT NULL,
  location    JSONB NOT NULL,        -- { page, charOffset, cfi, ... } — format depends on file_type
  text        TEXT,                  -- highlight snippet or note body
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_annotations_user_edition ON annotations(user_id, edition_id);

CREATE TABLE reading_progress (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edition_id    UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  section_id    UUID REFERENCES edition_sections(id),
  position      JSONB,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, edition_id)
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS & AUDIT
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template     TEXT NOT NULL,          -- 'expiry_30d', 'expiry_1d', 'payment_success', ...
  channel      notification_channel NOT NULL,
  status       notification_status NOT NULL DEFAULT 'queued',
  payload      JSONB,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_pending ON notifications(scheduled_for) WHERE status = 'queued';

CREATE TABLE audit_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES users(id),
  action       TEXT NOT NULL,          -- e.g. 'edition.published', 'entitlement.extended'
  target_table TEXT NOT NULL,
  target_id    UUID NOT NULL,
  before_value JSONB,
  after_value  JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_target ON audit_events(target_table, target_id);
-- Application layer should run as a role WITHOUT delete/update grants on this
-- table (Section 10: "Audit logs protected from ordinary administrator deletion").

-- ----------------------------------------------------------------------------
-- USEFUL VIEWS
-- ----------------------------------------------------------------------------
CREATE VIEW v_active_entitlements AS
SELECT e.*, u.name AS user_name, u.email, p.name AS plan_name
FROM entitlements e
JOIN users u ON u.id = e.user_id
JOIN plans p ON p.id = e.plan_id
WHERE e.status = 'active' AND e.end_at > now();

CREATE VIEW v_expiring_soon AS
SELECT * FROM v_active_entitlements
WHERE end_at <= now() + INTERVAL '30 days';

-- ----------------------------------------------------------------------------
-- SCAFFOLD ADDITION (not in the original blueprint schema): a plain-text
-- `content` column so this minimal demo backend can serve readable section
-- text directly, without a separate content-store service. A production
-- build would likely keep structured content in object storage instead and
-- use `search_text` purely for indexing, per the architecture doc.
-- ----------------------------------------------------------------------------
ALTER TABLE edition_sections ADD COLUMN IF NOT EXISTS content TEXT;
