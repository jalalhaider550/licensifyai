
-- ============ 1) Drop anon portal policies (token-enumeration risk) ============
DROP POLICY IF EXISTS "Portal clients can view assigned case actions" ON public.case_actions;
DROP POLICY IF EXISTS "Portal clients can view shared case activity"  ON public.case_activities;
DROP POLICY IF EXISTS "Portal clients can upload case documents"      ON public.case_documents;
DROP POLICY IF EXISTS "Portal clients can view case documents"        ON public.case_documents;
DROP POLICY IF EXISTS "Portal clients can view shared case drafts"    ON public.case_drafts;
DROP POLICY IF EXISTS "Portal clients can update their client record" ON public.clients;
DROP POLICY IF EXISTS "Portal clients can view their client record"   ON public.clients;
DROP POLICY IF EXISTS "Portal clients can manage directors"           ON public.directors;
DROP POLICY IF EXISTS "Portal clients can view directors"             ON public.directors;
DROP POLICY IF EXISTS "Portal clients can upload documents"           ON public.documents;
DROP POLICY IF EXISTS "Portal clients can view documents"             ON public.documents;
DROP POLICY IF EXISTS "Portal clients can read messages"              ON public.portal_messages;
DROP POLICY IF EXISTS "Portal clients can send messages"              ON public.portal_messages;
DROP POLICY IF EXISTS "Portal clients can manage shareholders"        ON public.shareholders;
DROP POLICY IF EXISTS "Portal clients can view shareholders"          ON public.shareholders;

-- ============ 2) Portal SECURITY DEFINER RPCs (token-gated) ============

-- Internal helper to resolve token -> client_id, user_id (returns NULL row if invalid)
CREATE OR REPLACE FUNCTION public._portal_resolve_token(_token text)
RETURNS TABLE(client_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.client_id, t.user_id
  FROM public.client_access_tokens t
  WHERE t.token = _token
    AND _token IS NOT NULL
    AND length(_token) >= 16
    AND t.is_active = true
    AND t.expires_at > now()
  LIMIT 1;
$$;

-- Full portal bundle in one round-trip
CREATE OR REPLACE FUNCTION public.portal_get_bundle(_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _cid uuid; _uid uuid; _result jsonb;
BEGIN
  SELECT client_id, user_id INTO _cid, _uid FROM public._portal_resolve_token(_token);
  IF _cid IS NULL THEN RAISE EXCEPTION 'Invalid or expired token'; END IF;

  SELECT jsonb_build_object(
    'client',       (SELECT to_jsonb(c) FROM public.clients c WHERE c.id = _cid),
    'directors',    COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at) FROM public.directors d WHERE d.client_id = _cid), '[]'::jsonb),
    'shareholders', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at) FROM public.shareholders s WHERE s.client_id = _cid), '[]'::jsonb),
    'documents',    COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC) FROM public.documents d WHERE d.client_id = _cid), '[]'::jsonb),
    'messages',     COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at) FROM public.portal_messages m WHERE m.client_id = _cid), '[]'::jsonb),
    'case_actions', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
      FROM public.case_actions a
      JOIN public.cases ca ON ca.id = a.case_id
      WHERE ca.client_id = _cid AND a.is_client_action = true
    ), '[]'::jsonb),
    'case_documents', COALESCE((
      SELECT jsonb_agg(to_jsonb(cd) ORDER BY cd.created_at DESC)
      FROM public.case_documents cd
      JOIN public.cases ca ON ca.id = cd.case_id
      WHERE ca.client_id = _cid AND cd.client_visible = true
    ), '[]'::jsonb),
    'case_drafts', COALESCE((
      SELECT jsonb_agg(to_jsonb(cd) ORDER BY cd.updated_at DESC)
      FROM public.case_drafts cd
      JOIN public.cases ca ON ca.id = cd.case_id
      WHERE ca.client_id = _cid AND cd.client_visible = true
    ), '[]'::jsonb),
    'case_activities', COALESCE((
      SELECT jsonb_agg(to_jsonb(av) ORDER BY av.created_at DESC)
      FROM public.case_activities av
      JOIN public.cases ca ON ca.id = av.case_id
      WHERE ca.client_id = _cid AND av.client_visible = true
    ), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_update_client(
  _token text,
  _company_name text,
  _registration_number text,
  _registered_address text,
  _contact_email text,
  _contact_phone text,
  _services text[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid;
BEGIN
  SELECT client_id INTO _cid FROM public._portal_resolve_token(_token);
  IF _cid IS NULL THEN RAISE EXCEPTION 'Invalid or expired token'; END IF;
  UPDATE public.clients SET
    company_name        = COALESCE(_company_name, company_name),
    registration_number = COALESCE(_registration_number, registration_number),
    registered_address  = COALESCE(_registered_address, registered_address),
    contact_email       = COALESCE(_contact_email, contact_email),
    contact_phone       = COALESCE(_contact_phone, contact_phone),
    services            = COALESCE(_services, services),
    updated_at          = now()
  WHERE id = _cid;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_add_director(_token text, _full_name text, _role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _id uuid;
BEGIN
  SELECT client_id INTO _cid FROM public._portal_resolve_token(_token);
  IF _cid IS NULL THEN RAISE EXCEPTION 'Invalid or expired token'; END IF;
  IF _full_name IS NULL OR length(trim(_full_name)) = 0 THEN RAISE EXCEPTION 'Full name required'; END IF;
  INSERT INTO public.directors (client_id, full_name, role)
    VALUES (_cid, _full_name, COALESCE(NULLIF(_role,''), 'Director'))
    RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_add_shareholder(_token text, _name text, _percentage numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _id uuid;
BEGIN
  SELECT client_id INTO _cid FROM public._portal_resolve_token(_token);
  IF _cid IS NULL THEN RAISE EXCEPTION 'Invalid or expired token'; END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'Name required'; END IF;
  INSERT INTO public.shareholders (client_id, name, percentage)
    VALUES (_cid, _name, COALESCE(_percentage, 0))
    RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_send_message(
  _token text, _case_id uuid, _sender_name text, _message text, _attachments jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _id uuid;
BEGIN
  SELECT client_id INTO _cid FROM public._portal_resolve_token(_token);
  IF _cid IS NULL THEN RAISE EXCEPTION 'Invalid or expired token'; END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 THEN RAISE EXCEPTION 'Message required'; END IF;
  -- Ensure _case_id, if given, belongs to this client
  IF _case_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cases WHERE id = _case_id AND client_id = _cid
  ) THEN
    RAISE EXCEPTION 'Case does not belong to client';
  END IF;
  INSERT INTO public.portal_messages (client_id, case_id, sender_type, sender_name, message, attachments)
    VALUES (_cid, _case_id, 'client', COALESCE(_sender_name, 'Client'), _message, COALESCE(_attachments, '[]'::jsonb))
    RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_add_case_document(
  _token text, _case_id uuid, _name text, _file_type text, _storage_path text, _raw_text text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _uid uuid; _id uuid;
BEGIN
  SELECT client_id, user_id INTO _cid, _uid FROM public._portal_resolve_token(_token);
  IF _cid IS NULL THEN RAISE EXCEPTION 'Invalid or expired token'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cases WHERE id = _case_id AND client_id = _cid) THEN
    RAISE EXCEPTION 'Case does not belong to client';
  END IF;
  INSERT INTO public.case_documents (
    case_id, user_id, name, document_category, file_type, storage_path,
    raw_text, ai_status, uploaded_by, client_visible
  ) VALUES (
    _case_id, _uid, _name, 'supporting', _file_type, _storage_path,
    COALESCE(_raw_text,''), 'processed', 'client', true
  ) RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.portal_add_client_document(
  _token text, _name text, _file_type text, _storage_path text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _uid uuid; _id uuid;
BEGIN
  SELECT client_id, user_id INTO _cid, _uid FROM public._portal_resolve_token(_token);
  IF _cid IS NULL THEN RAISE EXCEPTION 'Invalid or expired token'; END IF;
  INSERT INTO public.documents (client_id, user_id, name, file_type, storage_path, ai_status)
    VALUES (_cid, _uid, _name, _file_type, _storage_path, 'pending')
    RETURNING id INTO _id;
  RETURN _id;
END; $$;

GRANT EXECUTE ON FUNCTION public.portal_get_bundle(text)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_update_client(text,text,text,text,text,text,text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_add_director(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_add_shareholder(text,text,numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_send_message(text,uuid,text,text,jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_add_case_document(text,uuid,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_add_client_document(text,text,text,text) TO anon, authenticated;

-- ============ 3) Fix court_filings editor INSERT user_id fixation ============
DROP POLICY IF EXISTS "Editors add court filings" ON public.court_filings;
CREATE POLICY "Editors add court filings"
ON public.court_filings FOR INSERT TO authenticated
WITH CHECK (
  case_id IS NOT NULL
  AND user_id = auth.uid()
  AND get_case_permission(case_id, auth.uid()) = ANY (ARRAY['editor','co_owner'])
);

-- ============ 4) Restrict notifications INSERT to self only ============
DROP POLICY IF EXISTS "Authed inserts notifications to self or firm-mate" ON public.notifications;
CREATE POLICY "Authed inserts own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
