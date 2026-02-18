-- Migration: 008_affiliate_commissions.sql
-- Purpose: Creator affiliate commission tracking for Intelligence subscriptions (20% recurring)

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users NOT NULL,
  referred_id uuid REFERENCES auth.users NOT NULL,
  stripe_subscription_id text NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled')),
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own commissions (as referrer)
CREATE POLICY "Users can view own commissions"
  ON affiliate_commissions
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- Create index for fast lookups by referrer
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referrer
  ON affiliate_commissions (referrer_id);

-- Create index for fast lookups by referred user + subscription
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referred_sub
  ON affiliate_commissions (referred_id, stripe_subscription_id);
