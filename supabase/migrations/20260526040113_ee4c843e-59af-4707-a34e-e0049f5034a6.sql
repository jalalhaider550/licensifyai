-- Enforce payment-first activation: new users default to 'pending' until Stripe webhook activates them.
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'pending';

-- Move any users on the legacy 'free_trial' default who never paid to 'pending'.
UPDATE public.profiles
SET plan = 'pending',
    subscription_status = 'pending',
    contracts_limit = 0,
    updated_at = now()
WHERE plan = 'free_trial'
  AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
  AND (subscription_status IS NULL OR subscription_status NOT IN ('active','trialing','grandfathered'));