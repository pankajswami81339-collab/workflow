-- ============================================================
-- 044_subscriptions_enhancements.sql
-- Enhanced subscription plans with 7-day trial, exact feature limits,
-- billing cycles, admin custom overrides, and auto-trial setup.
-- ============================================================

-- ── Enhance plans table ───────────────────────────────────────
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_monthly_inr INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_yearly_inr INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS contacts_limit INTEGER DEFAULT 10;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS campaigns_limit INTEGER DEFAULT 1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS bot_replies_limit INTEGER DEFAULT 1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS bot_flows_limit INTEGER DEFAULT 1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS custom_fields_limit INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS team_members_limit INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS ai_bot_access BOOLEAN DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS api_webhook_access BOOLEAN DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS whatsapp_calling_api BOOLEAN DEFAULT TRUE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7;

-- ── Enhance subscriptions table ───────────────────────────────
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS custom_overrides JSONB DEFAULT '{}'::jsonb;

-- ── Seed/Update the standard plans matching TTWAPI/WhatsApp SaaS ─
INSERT INTO plans (
  name,
  price_inr,
  price_monthly_inr,
  price_yearly_inr,
  customer_limit,
  contacts_limit,
  campaigns_limit,
  bot_replies_limit,
  bot_flows_limit,
  custom_fields_limit,
  team_members_limit,
  ai_bot_access,
  api_webhook_access,
  whatsapp_calling_api,
  is_trial,
  trial_days,
  features,
  sort_order
)
VALUES
  (
    'Free Plan',
    0,
    0,
    0,
    10,
    10,
    1,
    1,
    1,
    0,
    0,
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    7,
    '["10 Contacts", "1 Campaigns Per Month", "1 Bot Replies", "1 Bot Flows", "0 Contact Custom Fields", "0 Team Members/Agents", "Whatsapp Calling API"]',
    0
  ),
  (
    'Starter',
    299,
    299,
    3229,
    2000,
    2000,
    60,
    50,
    5,
    5,
    5,
    FALSE,
    FALSE,
    TRUE,
    FALSE,
    0,
    '["2000 Contacts", "60 monthly Campaigns", "50 Bot Replies", "5 Bot Flows", "5 Contact Custom Fields", "5 Team Members/Agents", "Whatsapp Calling API"]',
    1
  ),
  (
    'Growth',
    999,
    999,
    10789,
    50000,
    50000,
    250,
    200,
    25,
    25,
    25,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    0,
    '["50000 Contacts", "250 monthly Campaigns", "200 Bot Replies", "25 Bot Flows", "25 Contact Custom Fields", "25 Team Members/Agents", "AI Chat Bot", "API and Webhook Access", "Whatsapp Calling API"]',
    2
  ),
  (
    'Enterprise',
    1999,
    1999,
    21589,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    0,
    '["Unlimited Contacts", "Unlimited Campaigns", "Unlimited Bot Replies", "Unlimited Bot Flows", "Unlimited Contact Custom Fields", "Unlimited Team Members/Agents", "AI Chat Bot", "API and Webhook Access", "Whatsapp Calling API"]',
    3
  )
ON CONFLICT (name) DO UPDATE
  SET price_inr            = EXCLUDED.price_inr,
      price_monthly_inr    = EXCLUDED.price_monthly_inr,
      price_yearly_inr     = EXCLUDED.price_yearly_inr,
      customer_limit       = EXCLUDED.customer_limit,
      contacts_limit       = EXCLUDED.contacts_limit,
      campaigns_limit      = EXCLUDED.campaigns_limit,
      bot_replies_limit    = EXCLUDED.bot_replies_limit,
      bot_flows_limit      = EXCLUDED.bot_flows_limit,
      custom_fields_limit  = EXCLUDED.custom_fields_limit,
      team_members_limit   = EXCLUDED.team_members_limit,
      ai_bot_access        = EXCLUDED.ai_bot_access,
      api_webhook_access   = EXCLUDED.api_webhook_access,
      whatsapp_calling_api = EXCLUDED.whatsapp_calling_api,
      is_trial             = EXCLUDED.is_trial,
      trial_days           = EXCLUDED.trial_days,
      features             = EXCLUDED.features,
      sort_order           = EXCLUDED.sort_order,
      updated_at           = NOW();

-- ── Remove 'Scale' plan and migrate any subscriptions to 'Enterprise' ──
DO $$
DECLARE
  v_enterprise_id UUID;
  v_scale_id UUID;
BEGIN
  SELECT id INTO v_enterprise_id FROM public.plans WHERE name = 'Enterprise' LIMIT 1;
  SELECT id INTO v_scale_id FROM public.plans WHERE name = 'Scale' LIMIT 1;

  IF v_scale_id IS NOT NULL AND v_enterprise_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET plan_id = v_enterprise_id
    WHERE plan_id = v_scale_id;
  END IF;

  DELETE FROM public.plans WHERE name = 'Scale';
  DELETE FROM public.plans WHERE name ILIKE '%starter free%';
END $$;

-- ── Auto assign 7-day Free Trial to new accounts on signup ─────
CREATE OR REPLACE FUNCTION public.assign_default_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id FROM public.plans WHERE name = 'Free Plan' LIMIT 1;
  
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      account_id,
      plan_id,
      status,
      is_trial,
      billing_cycle,
      start_date,
      end_date,
      notes
    )
    VALUES (
      NEW.id,
      v_free_plan_id,
      'active',
      TRUE,
      'monthly',
      NOW(),
      NOW() + INTERVAL '7 days',
      '7-day free trial on signup'
    )
    ON CONFLICT (account_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to assign default trial subscription to account %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_account_default_trial ON public.accounts;
CREATE TRIGGER trg_account_default_trial
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_trial_subscription();

-- Backfill existing accounts without any subscription to Free Plan (7 days trial from creation or active)
DO $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id FROM public.plans WHERE name = 'Free Plan' LIMIT 1;
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (
      account_id,
      plan_id,
      status,
      is_trial,
      billing_cycle,
      start_date,
      end_date,
      notes
    )
    SELECT
      a.id,
      v_free_plan_id,
      'active',
      TRUE,
      'monthly',
      NOW(),
      NOW() + INTERVAL '7 days',
      '7-day free trial assigned'
    FROM public.accounts a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.subscriptions s WHERE s.account_id = a.id
    )
    ON CONFLICT (account_id) DO NOTHING;
  END IF;
END $$;
