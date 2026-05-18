INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('licensifyai@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  user_id uuid,
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
    p.user_id,
    p.firm_name,
    p.display_name,
    COALESCE(p.plan, 'free_trial') AS plan,
    p.created_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_user_id uuid, _plan text)
RETURNS TABLE (
  user_id uuid,
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

  RETURN QUERY
  UPDATE public.profiles p
  SET plan = _plan,
      updated_at = now()
  WHERE p.user_id = _user_id
  RETURNING p.user_id, p.firm_name, p.display_name, p.plan, p.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) TO authenticated;