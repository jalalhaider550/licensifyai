DROP FUNCTION IF EXISTS public.admin_list_profiles();
DROP FUNCTION IF EXISTS public.admin_set_user_plan(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  user_id uuid,
  email text,
  firm_name text,
  display_name text,
  plan text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.id AS user_id,
    au.email::text AS email,
    COALESCE(NULLIF(p.firm_name, ''), au.raw_user_meta_data->>'firm_name', split_part(au.email, '@', 1), '') AS firm_name,
    COALESCE(p.display_name, au.raw_user_meta_data->>'display_name') AS display_name,
    COALESCE(p.plan, 'free_trial') AS plan,
    COALESCE(p.created_at, au.created_at) AS created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY COALESCE(p.created_at, au.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_user_id uuid, _plan text)
RETURNS TABLE (
  user_id uuid,
  email text,
  firm_name text,
  display_name text,
  plan text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF _plan NOT IN ('free_trial', 'pro') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = _user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.profiles (user_id, firm_name, display_name, plan)
  SELECT
    au.id,
    COALESCE(au.raw_user_meta_data->>'firm_name', split_part(au.email, '@', 1), ''),
    au.raw_user_meta_data->>'display_name',
    _plan
  FROM auth.users au
  WHERE au.id = _user_id
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        updated_at = now();

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email::text AS email,
    COALESCE(NULLIF(p.firm_name, ''), au.raw_user_meta_data->>'firm_name', split_part(au.email, '@', 1), '') AS firm_name,
    COALESCE(p.display_name, au.raw_user_meta_data->>'display_name') AS display_name,
    COALESCE(p.plan, 'free_trial') AS plan,
    COALESCE(p.created_at, au.created_at) AS created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE au.id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) TO authenticated;