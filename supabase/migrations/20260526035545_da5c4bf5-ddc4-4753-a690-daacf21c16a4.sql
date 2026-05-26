
-- =========================================================
-- 1. CLIENT ACCESS TOKENS: remove broad anon SELECT, add RPC
-- =========================================================
DROP POLICY IF EXISTS "Anyone can validate tokens" ON public.client_access_tokens;

CREATE OR REPLACE FUNCTION public.validate_client_access_token(_token text)
RETURNS TABLE(client_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.client_id
  FROM public.client_access_tokens t
  WHERE t.token = _token
    AND t.is_active = true
    AND t.expires_at > now()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_client_access_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_client_access_token(text) TO anon, authenticated;

-- =========================================================
-- 2. FIRM INVITES: remove broad anon SELECT, add RPC
-- =========================================================
DROP POLICY IF EXISTS "Anon validates invite by token" ON public.firm_invites;

CREATE OR REPLACE FUNCTION public.get_firm_invite_by_token(_token text)
RETURNS TABLE(
  id uuid,
  firm_id uuid,
  email text,
  role text,
  custom_role_label text,
  status text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.id, i.firm_id, i.email, i.role::text, i.custom_role_label,
         i.status::text, i.expires_at
  FROM public.firm_invites i
  WHERE i.token = _token
    AND i.status = 'pending'
    AND i.expires_at > now()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_firm_invite_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_firm_invite_by_token(text) TO anon, authenticated;

-- Accept invite via RPC so anon doesn't need direct UPDATE
CREATE OR REPLACE FUNCTION public.accept_firm_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _invite public.firm_invites%ROWTYPE;
  _uid uuid := auth.uid();
  _email text;
  _name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _invite FROM public.firm_invites
   WHERE token = _token AND status = 'pending' AND expires_at > now()
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found or expired'; END IF;

  SELECT au.email, COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email,'@',1))
    INTO _email, _name
  FROM auth.users au WHERE au.id = _uid;

  UPDATE public.firm_members SET is_active = false WHERE user_id = _uid;

  INSERT INTO public.firm_members (firm_id, user_id, role, custom_role_label, display_name, email, is_active)
  VALUES (_invite.firm_id, _uid, _invite.role, COALESCE(_invite.custom_role_label,''),
          COALESCE(_name,''), COALESCE(_email, _invite.email), true)
  ON CONFLICT (firm_id, user_id) DO UPDATE SET is_active = true, role = EXCLUDED.role;

  UPDATE public.firm_invites
     SET status = 'accepted', accepted_at = now()
   WHERE id = _invite.id;

  RETURN _invite.firm_id;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_firm_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_firm_invite(text) TO authenticated;

-- =========================================================
-- 3. CONVEYANCING: remove wide anon access, add token-validated RPCs
-- =========================================================
DROP POLICY IF EXISTS "Anon can view conveyancing case by intake token" ON public.conveyancing_cases;
DROP POLICY IF EXISTS "Anon can view conveyancing steps by intake token" ON public.conveyancing_steps;
DROP POLICY IF EXISTS "Anon can view intake by token" ON public.conveyancing_client_intake;
DROP POLICY IF EXISTS "Anon can insert intake by token" ON public.conveyancing_client_intake;
DROP POLICY IF EXISTS "Anon can update intake by token" ON public.conveyancing_client_intake;

CREATE OR REPLACE FUNCTION public.get_conveyancing_case_by_token(_token text)
RETURNS TABLE(
  id uuid, property_address text, postcode text, client_name text,
  client_type text, price numeric, tenure text, property_category text,
  mortgage_status text, user_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.property_address, c.postcode, c.client_name,
         c.client_type, c.price, c.tenure, c.property_category,
         c.mortgage_status, c.user_id
  FROM public.conveyancing_cases c
  WHERE c.intake_token = _token AND _token IS NOT NULL
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_conveyancing_case_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conveyancing_case_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_conveyancing_intake_by_token(_token text)
RETURNS SETOF public.conveyancing_client_intake
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.*
  FROM public.conveyancing_client_intake i
  JOIN public.conveyancing_cases c ON c.id = i.case_id
  WHERE c.intake_token = _token AND _token IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_conveyancing_intake_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conveyancing_intake_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_conveyancing_intake_by_token(_token text, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _case public.conveyancing_cases%ROWTYPE;
  _existing_id uuid;
  _id uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RAISE EXCEPTION 'Invalid token'; END IF;
  SELECT * INTO _case FROM public.conveyancing_cases WHERE intake_token = _token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid token'; END IF;

  -- Force server-controlled fields
  _payload := _payload
    - 'id' - 'created_at' - 'updated_at'
    || jsonb_build_object('case_id', _case.id, 'user_id', _case.user_id);

  SELECT id INTO _existing_id FROM public.conveyancing_client_intake WHERE case_id = _case.id LIMIT 1;

  IF _existing_id IS NULL THEN
    INSERT INTO public.conveyancing_client_intake
    SELECT * FROM jsonb_populate_record(NULL::public.conveyancing_client_intake, _payload)
    RETURNING id INTO _id;
  ELSE
    UPDATE public.conveyancing_client_intake AS t
      SET (
        full_name, date_of_birth, email, phone, current_address, address_postcode, country,
        id_document_type, id_document_path, proof_of_address_path,
        client_role, property_address, property_postcode, property_type, tenure, transaction_price,
        has_mortgage, lender_name, mortgage_broker, source_of_funds, source_of_wealth,
        source_of_funds_document_path, first_time_buyer, buying_with_another, second_buyer_name,
        owns_property_fully, existing_mortgage, existing_lender_name, property_vacant,
        lease_years_remaining, ground_rent,
        ta6_disputes, ta6_planning_works, ta6_guarantees, ta6_boundaries, ta6_rights_of_way,
        ta6_notices, ta6_services,
        ta10_included_items, ta10_excluded_items, ta10_additional_items,
        special_instructions, declaration_confirmed,
        intake_complete, current_step, submitted_at, updated_at
      ) = (
        COALESCE((_payload->>'full_name'), t.full_name),
        NULLIF(_payload->>'date_of_birth','')::date,
        COALESCE((_payload->>'email'), t.email),
        COALESCE((_payload->>'phone'), t.phone),
        COALESCE((_payload->>'current_address'), t.current_address),
        COALESCE((_payload->>'address_postcode'), t.address_postcode),
        COALESCE((_payload->>'country'), t.country),
        COALESCE((_payload->>'id_document_type'), t.id_document_type),
        COALESCE((_payload->>'id_document_path'), t.id_document_path),
        COALESCE((_payload->>'proof_of_address_path'), t.proof_of_address_path),
        COALESCE((_payload->>'client_role'), t.client_role),
        COALESCE((_payload->>'property_address'), t.property_address),
        COALESCE((_payload->>'property_postcode'), t.property_postcode),
        COALESCE((_payload->>'property_type'), t.property_type),
        COALESCE((_payload->>'tenure'), t.tenure),
        COALESCE(NULLIF(_payload->>'transaction_price','')::numeric, t.transaction_price),
        COALESCE((_payload->>'has_mortgage')::boolean, t.has_mortgage),
        COALESCE((_payload->>'lender_name'), t.lender_name),
        COALESCE((_payload->>'mortgage_broker'), t.mortgage_broker),
        COALESCE((_payload->>'source_of_funds'), t.source_of_funds),
        COALESCE((_payload->>'source_of_wealth'), t.source_of_wealth),
        COALESCE((_payload->>'source_of_funds_document_path'), t.source_of_funds_document_path),
        COALESCE((_payload->>'first_time_buyer')::boolean, t.first_time_buyer),
        COALESCE((_payload->>'buying_with_another')::boolean, t.buying_with_another),
        COALESCE((_payload->>'second_buyer_name'), t.second_buyer_name),
        COALESCE((_payload->>'owns_property_fully')::boolean, t.owns_property_fully),
        COALESCE((_payload->>'existing_mortgage')::boolean, t.existing_mortgage),
        COALESCE((_payload->>'existing_lender_name'), t.existing_lender_name),
        COALESCE((_payload->>'property_vacant')::boolean, t.property_vacant),
        COALESCE(NULLIF(_payload->>'lease_years_remaining','')::int, t.lease_years_remaining),
        COALESCE((_payload->>'ground_rent'), t.ground_rent),
        COALESCE((_payload->>'ta6_disputes'), t.ta6_disputes),
        COALESCE((_payload->>'ta6_planning_works'), t.ta6_planning_works),
        COALESCE((_payload->>'ta6_guarantees'), t.ta6_guarantees),
        COALESCE((_payload->>'ta6_boundaries'), t.ta6_boundaries),
        COALESCE((_payload->>'ta6_rights_of_way'), t.ta6_rights_of_way),
        COALESCE((_payload->>'ta6_notices'), t.ta6_notices),
        COALESCE((_payload->>'ta6_services'), t.ta6_services),
        COALESCE((_payload->>'ta10_included_items'), t.ta10_included_items),
        COALESCE((_payload->>'ta10_excluded_items'), t.ta10_excluded_items),
        COALESCE((_payload->>'ta10_additional_items'), t.ta10_additional_items),
        COALESCE((_payload->>'special_instructions'), t.special_instructions),
        COALESCE((_payload->>'declaration_confirmed')::boolean, t.declaration_confirmed),
        COALESCE((_payload->>'intake_complete')::boolean, t.intake_complete),
        COALESCE((_payload->>'current_step')::int, t.current_step),
        NULLIF(_payload->>'submitted_at','')::timestamptz,
        now()
      )
      WHERE t.id = _existing_id
      RETURNING t.id INTO _id;
  END IF;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_conveyancing_intake_by_token(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_conveyancing_intake_by_token(text, jsonb) TO anon, authenticated;

-- =========================================================
-- 4. NOTIFICATIONS: restrict insert
-- =========================================================
DROP POLICY IF EXISTS "System (any authed) inserts notifications" ON public.notifications;
CREATE POLICY "Authed inserts notifications to self or firm-mate"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.same_firm(auth.uid(), user_id)
);

-- =========================================================
-- 5. CASE CONTRIBUTOR POLICIES: user_id must match inserter
-- =========================================================
DROP POLICY IF EXISTS "Contributors add case actions" ON public.case_actions;
CREATE POLICY "Contributors add case actions"
ON public.case_actions FOR INSERT TO authenticated
WITH CHECK (can_edit_case(case_id, auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Contributors add case activities" ON public.case_activities;
CREATE POLICY "Contributors add case activities"
ON public.case_activities FOR INSERT TO authenticated
WITH CHECK (can_edit_case(case_id, auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Contributors add case drafts" ON public.case_drafts;
CREATE POLICY "Contributors add case drafts"
ON public.case_drafts FOR INSERT TO authenticated
WITH CHECK (can_edit_case(case_id, auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Contributors add case documents" ON public.case_documents;
CREATE POLICY "Contributors add case documents"
ON public.case_documents FOR INSERT TO authenticated
WITH CHECK (can_edit_case(case_id, auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Contributors add case info requests" ON public.case_info_requests;
CREATE POLICY "Contributors add case info requests"
ON public.case_info_requests FOR INSERT TO authenticated
WITH CHECK (can_edit_case(case_id, auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Contributors add case info request items" ON public.case_info_request_items;
CREATE POLICY "Contributors add case info request items"
ON public.case_info_request_items FOR INSERT TO authenticated
WITH CHECK (can_edit_case(case_id, auth.uid()) AND user_id = auth.uid());

-- =========================================================
-- 6. STORAGE: add UPDATE policy for users' own folder in documents bucket
-- =========================================================
DROP POLICY IF EXISTS "Users update own docs storage" ON storage.objects;
CREATE POLICY "Users update own docs storage"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =========================================================
-- 7. Lock search_path on email queue helpers
-- =========================================================
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
