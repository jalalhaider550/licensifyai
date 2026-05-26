
DROP FUNCTION IF EXISTS public.validate_client_access_token(text);
CREATE FUNCTION public.validate_client_access_token(_token text)
RETURNS TABLE(client_id uuid, user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.client_id, t.user_id
  FROM public.client_access_tokens t
  WHERE t.token = _token
    AND t.is_active = true
    AND t.expires_at > now()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_client_access_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_client_access_token(text) TO anon, authenticated;
