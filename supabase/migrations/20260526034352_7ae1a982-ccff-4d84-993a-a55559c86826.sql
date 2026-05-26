CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_user_id uuid, _plan text)
 RETURNS TABLE(user_id uuid, email text, firm_name text, display_name text, plan text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_limit int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF _plan NOT IN ('pending', 'starter', 'professional', 'law_firm', 'free_trial', 'pro') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = _user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  _new_limit := CASE _plan
    WHEN 'starter' THEN 15
    WHEN 'professional' THEN 30
    WHEN 'law_firm' THEN 999999
    WHEN 'pro' THEN 30
    WHEN 'free_trial' THEN 30
    ELSE 0
  END;

  INSERT INTO public.profiles (user_id, firm_name, display_name, plan, contracts_limit, subscription_status)
  SELECT
    au.id,
    COALESCE(au.raw_user_meta_data->>'firm_name', split_part(au.email, '@', 1), ''),
    au.raw_user_meta_data->>'display_name',
    _plan,
    _new_limit,
    CASE WHEN _plan = 'pending' THEN 'pending' ELSE 'grandfathered' END
  FROM auth.users au
  WHERE au.id = _user_id
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        contracts_limit = EXCLUDED.contracts_limit,
        subscription_status = EXCLUDED.subscription_status,
        updated_at = now();

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email::text AS email,
    COALESCE(NULLIF(p.firm_name, ''), au.raw_user_meta_data->>'firm_name', split_part(au.email, '@', 1), '') AS firm_name,
    COALESCE(p.display_name, au.raw_user_meta_data->>'display_name') AS display_name,
    COALESCE(p.plan, 'pending') AS plan,
    COALESCE(p.created_at, au.created_at) AS created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE au.id = _user_id;
END;
$function$;