-- Add referral_pro_until to profiles for stackable referral rewards
-- Each successful referral adds 7 days of Wire Pro access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_pro_until timestamptz DEFAULT NULL;

-- Drop the unique constraint on referred_id so one user can refer many people
-- (the unique was preventing referrers from getting multiple rewards)
-- Actually the unique on referred_id is correct — one person can only BE referred once
-- But one person can REFER many people (referrer_id is not unique)
-- So we just need to remove the status='completed' uniqueness if any
