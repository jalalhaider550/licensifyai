-- Safe client-facing case accessors
CREATE OR REPLACE FUNCTION public.get_client_portal_cases(_token text)
RETURNS TABLE (
  id uuid,
  title text,
  case_type public.case_type,
  status text,
  client_summary text,
  client_name text,
  progress_percentage integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.title,
    c.case_type,
    c.status,
    COALESCE(NULLIF(c.client_summary, ''), 'Your legal team is actively progressing this matter and will request any remaining items here.') AS client_summary,
    c.client_name,
    c.progress_percentage,
    c.created_at,
    c.updated_at
  FROM public.cases c
  JOIN public.client_access_tokens t
    ON t.client_id = c.client_id
  WHERE t.token = _token
    AND t.is_active = true
    AND t.expires_at > now()
  ORDER BY c.updated_at DESC;
$$;

-- Realtime for case chat
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;