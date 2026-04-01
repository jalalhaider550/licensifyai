
ALTER TABLE public.conveyancing_cases
  ADD COLUMN IF NOT EXISTS postcode text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'purchase',
  ADD COLUMN IF NOT EXISTS client_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_side_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS other_side_firm text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tenure text NOT NULL DEFAULT 'freehold',
  ADD COLUMN IF NOT EXISTS property_category text NOT NULL DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS mortgage_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS target_completion_date date,
  ADD COLUMN IF NOT EXISTS estate_agent text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referral_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS readiness_score integer NOT NULL DEFAULT 0;
