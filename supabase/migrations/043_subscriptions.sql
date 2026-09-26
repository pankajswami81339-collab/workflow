-- ============================================================
-- 043_subscriptions.sql — Subscription plans & billing
--
-- Adds:
--   1. `plans` table — 3 tiers (Starter / Growth / Scale)
--   2. `subscriptions` table — per-account active subscription
--      with start_date, end_date (1-month period), status
--   3. `is_super_admin` column on `profiles` — gates /admin panel
--   4. RLS: only super-admins can manage plans + all subscriptions;
--      account owners/admins can read their own subscription.
-- ============================================================

-- ── Super-admin flag ──────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Plans ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,          -- 'Starter' | 'Growth' | 'Scale'
  price_inr       INTEGER NOT NULL,              -- ₹ per month
  customer_limit  INTEGER,                       -- NULL = unlimited
  features        JSONB NOT NULL DEFAULT '[]',   -- array of feature strings
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans (needed for the pricing page)
DROP POLICY IF EXISTS "plans_public_read" ON plans;
CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (TRUE);

-- Only super-admins can mutate plans
DROP POLICY IF EXISTS "plans_super_admin_all" ON plans;
CREATE POLICY "plans_super_admin_all" ON plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND is_super_admin = TRUE
    )
  );

-- Trigger: updated_at
DROP TRIGGER IF EXISTS set_updated_at ON plans;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed plans ────────────────────────────────────────────────────
INSERT INTO plans (name, price_inr, customer_limit, features, sort_order)
VALUES
  (
    'Starter',
    499,
    2000,
    '["2,000 Contacts", "WhatsApp CRM Inbox", "Chatbot / Flow Builder", "Broadcast Campaigns", "3 Team Members", "Basic Automations", "Message Templates", "Email Support"]',
    1
  ),
  (
    'Growth',
    1999,
    20000,
    '["20,000 Contacts", "WhatsApp CRM Inbox", "Chatbot / Flow Builder", "Broadcast Campaigns", "10 Team Members", "Advanced Automations", "AI Reply Assistant", "Webhook Integrations", "Priority Support"]',
    2
  ),
  (
    'Scale',
    3999,
    NULL,
    '["Unlimited Contacts", "WhatsApp CRM Inbox", "Chatbot / Flow Builder", "Broadcast Campaigns", "Unlimited Team Members", "Advanced Automations", "AI Reply Assistant", "Webhook Integrations", "Public REST API", "Dedicated Support", "Custom Onboarding"]',
    3
  )
ON CONFLICT (name) DO UPDATE
  SET price_inr      = EXCLUDED.price_inr,
      customer_limit = EXCLUDED.customer_limit,
      features       = EXCLUDED.features,
      sort_order     = EXCLUDED.sort_order,
      updated_at     = NOW();

-- ── Subscriptions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id     UUID NOT NULL REFERENCES plans(id),
  status      TEXT NOT NULL DEFAULT 'active'  -- 'active' | 'expired' | 'cancelled'
                CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  notes       TEXT,                           -- admin notes (e.g. payment ref)
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)                          -- one active subscription per account
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Account members can read their own subscription
DROP POLICY IF EXISTS "subscriptions_member_read" ON subscriptions;
CREATE POLICY "subscriptions_member_read" ON subscriptions
  FOR SELECT USING (
    is_account_member(account_id, 'viewer')
  );

-- Only super-admins can create / update / delete subscriptions
DROP POLICY IF EXISTS "subscriptions_super_admin_all" ON subscriptions;
CREATE POLICY "subscriptions_super_admin_all" ON subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND is_super_admin = TRUE
    )
  );

DROP TRIGGER IF EXISTS set_updated_at ON subscriptions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for fast lookup by account
CREATE INDEX IF NOT EXISTS idx_subscriptions_account_id ON subscriptions(account_id);

-- ── Auto-expire: mark subscriptions past their end_date as 'expired' ─
-- This runs as a simple DB function; call it from a cron or on read.
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND end_date < NOW();
END;
$$;
