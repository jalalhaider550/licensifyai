
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contracts_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contracts_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contracts_bonus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_cycle_start timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text;

-- 2. Grandfather existing users -> professional with 30/mo
UPDATE public.profiles
SET plan = 'professional',
    contracts_limit = 30,
    contracts_used = 0,
    contracts_bonus = 0,
    billing_cycle_start = now(),
    subscription_status = 'grandfathered'
WHERE plan IN ('pro', 'free_trial') OR plan IS NULL;

-- 3. Subscriptions mirror (per Stripe webhook spec)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text,
  price_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Usage log
CREATE TABLE IF NOT EXISTS public.contract_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contract_type text,
  country text,
  jurisdiction text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contract_usage_log_user ON public.contract_usage_log(user_id, created_at);
ALTER TABLE public.contract_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own usage" ON public.contract_usage_log;
CREATE POLICY "Users view own usage" ON public.contract_usage_log
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own usage" ON public.contract_usage_log;
CREATE POLICY "Users insert own usage" ON public.contract_usage_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. consume_contract: atomic allowance check + increment
CREATE OR REPLACE FUNCTION public.consume_contract(_contract_type text DEFAULT NULL, _country text DEFAULT NULL, _jurisdiction text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text;
  _used int;
  _limit int;
  _bonus int;
  _status text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  SELECT plan, contracts_used, contracts_limit, contracts_bonus, subscription_status
    INTO _plan, _used, _limit, _bonus, _status
  FROM public.profiles WHERE user_id = _uid FOR UPDATE;

  IF _plan = 'pending' OR _plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'pending_payment');
  END IF;

  -- law_firm = unlimited
  IF _plan = 'law_firm' THEN
    UPDATE public.profiles SET contracts_used = contracts_used + 1, updated_at = now() WHERE user_id = _uid;
    INSERT INTO public.contract_usage_log(user_id, contract_type, country, jurisdiction)
      VALUES (_uid, _contract_type, _country, _jurisdiction);
    RETURN jsonb_build_object('allowed', true, 'used', _used + 1, 'limit', NULL, 'bonus', _bonus);
  END IF;

  IF _used >= (_limit + _bonus) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'limit_reached', 'used', _used, 'limit', _limit, 'bonus', _bonus);
  END IF;

  UPDATE public.profiles SET contracts_used = contracts_used + 1, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.contract_usage_log(user_id, contract_type, country, jurisdiction)
    VALUES (_uid, _contract_type, _country, _jurisdiction);

  RETURN jsonb_build_object('allowed', true, 'used', _used + 1, 'limit', _limit, 'bonus', _bonus);
END;
$$;

-- 6. credit_contract_topup (service role / edge function only)
CREATE OR REPLACE FUNCTION public.credit_contract_topup(_user_id uuid, _amount int DEFAULT 10)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET contracts_bonus = contracts_bonus + _amount,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- 7. apply_subscription_state (service role / webhook)
CREATE OR REPLACE FUNCTION public.apply_subscription_state(
  _user_id uuid,
  _plan text,
  _status text,
  _stripe_customer_id text,
  _stripe_subscription_id text,
  _period_start timestamptz,
  _reset_usage boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_limit int := CASE _plan WHEN 'starter' THEN 15 WHEN 'professional' THEN 30 WHEN 'law_firm' THEN 999999 ELSE 0 END;
BEGIN
  INSERT INTO public.profiles (user_id, firm_name, plan, contracts_limit, contracts_used, contracts_bonus,
                               billing_cycle_start, stripe_customer_id, stripe_subscription_id, subscription_status)
  VALUES (_user_id, '', _plan, _new_limit, 0, 0,
          COALESCE(_period_start, now()), _stripe_customer_id, _stripe_subscription_id, _status)
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    contracts_limit = EXCLUDED.contracts_limit,
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.profiles.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, public.profiles.stripe_subscription_id),
    subscription_status = EXCLUDED.subscription_status,
    billing_cycle_start = CASE WHEN _reset_usage THEN COALESCE(_period_start, now()) ELSE public.profiles.billing_cycle_start END,
    contracts_used = CASE WHEN _reset_usage THEN 0 ELSE public.profiles.contracts_used END,
    contracts_bonus = CASE WHEN _reset_usage THEN 0 ELSE public.profiles.contracts_bonus END,
    updated_at = now();
END;
$$;
