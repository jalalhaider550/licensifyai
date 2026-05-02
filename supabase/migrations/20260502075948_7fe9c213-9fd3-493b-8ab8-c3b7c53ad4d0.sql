-- =========================================================
-- ADDITIVE COLLABORATOR POLICIES
-- Existing owner policies (auth.uid() = user_id) remain in place.
-- =========================================================

-- ---------- CASES ----------
CREATE POLICY "Collaborators view shared cases"
ON public.cases FOR SELECT TO authenticated
USING (public.has_case_access(id, auth.uid()));

CREATE POLICY "Editors update shared cases"
ON public.cases FOR UPDATE TO authenticated
USING (public.get_case_permission(id, auth.uid()) IN ('editor','co_owner'))
WITH CHECK (public.get_case_permission(id, auth.uid()) IN ('editor','co_owner'));

-- ---------- CASE_DOCUMENTS ----------
CREATE POLICY "Collaborators view case documents"
ON public.case_documents FOR SELECT TO authenticated
USING (public.has_case_access(case_id, auth.uid()));

CREATE POLICY "Contributors add case documents"
ON public.case_documents FOR INSERT TO authenticated
WITH CHECK (
  public.can_edit_case(case_id, auth.uid())
  AND user_id = (SELECT c.user_id FROM public.cases c WHERE c.id = case_id)
);

CREATE POLICY "Editors update case documents"
ON public.case_documents FOR UPDATE TO authenticated
USING (public.get_case_permission(case_id, auth.uid()) IN ('editor','co_owner','contributor'))
WITH CHECK (public.get_case_permission(case_id, auth.uid()) IN ('editor','co_owner','contributor'));

-- ---------- CASE_DRAFTS ----------
CREATE POLICY "Collaborators view case drafts"
ON public.case_drafts FOR SELECT TO authenticated
USING (public.has_case_access(case_id, auth.uid()));

CREATE POLICY "Contributors add case drafts"
ON public.case_drafts FOR INSERT TO authenticated
WITH CHECK (
  public.can_edit_case(case_id, auth.uid())
  AND user_id = (SELECT c.user_id FROM public.cases c WHERE c.id = case_id)
);

CREATE POLICY "Editors update case drafts"
ON public.case_drafts FOR UPDATE TO authenticated
USING (public.get_case_permission(case_id, auth.uid()) IN ('editor','co_owner','contributor'))
WITH CHECK (public.get_case_permission(case_id, auth.uid()) IN ('editor','co_owner','contributor'));

-- ---------- CASE_ACTIVITIES ----------
CREATE POLICY "Collaborators view case activities"
ON public.case_activities FOR SELECT TO authenticated
USING (public.has_case_access(case_id, auth.uid()));

CREATE POLICY "Contributors add case activities"
ON public.case_activities FOR INSERT TO authenticated
WITH CHECK (
  public.can_edit_case(case_id, auth.uid())
  AND user_id = (SELECT c.user_id FROM public.cases c WHERE c.id = case_id)
);

-- ---------- CASE_ACTIONS ----------
CREATE POLICY "Collaborators view case actions"
ON public.case_actions FOR SELECT TO authenticated
USING (public.has_case_access(case_id, auth.uid()));

CREATE POLICY "Contributors add case actions"
ON public.case_actions FOR INSERT TO authenticated
WITH CHECK (
  public.can_edit_case(case_id, auth.uid())
  AND user_id = (SELECT c.user_id FROM public.cases c WHERE c.id = case_id)
);

CREATE POLICY "Contributors update case actions"
ON public.case_actions FOR UPDATE TO authenticated
USING (public.can_edit_case(case_id, auth.uid()))
WITH CHECK (public.can_edit_case(case_id, auth.uid()));

-- ---------- COURT_FILINGS ----------
CREATE POLICY "Collaborators view court filings"
ON public.court_filings FOR SELECT TO authenticated
USING (case_id IS NOT NULL AND public.has_case_access(case_id, auth.uid()));

CREATE POLICY "Editors add court filings"
ON public.court_filings FOR INSERT TO authenticated
WITH CHECK (
  case_id IS NOT NULL
  AND public.get_case_permission(case_id, auth.uid()) IN ('editor','co_owner')
  AND user_id = (SELECT c.user_id FROM public.cases c WHERE c.id = case_id)
);

CREATE POLICY "Editors update court filings"
ON public.court_filings FOR UPDATE TO authenticated
USING (case_id IS NOT NULL AND public.get_case_permission(case_id, auth.uid()) IN ('editor','co_owner'))
WITH CHECK (case_id IS NOT NULL AND public.get_case_permission(case_id, auth.uid()) IN ('editor','co_owner'));

-- ---------- CASE_INFO_REQUESTS ----------
CREATE POLICY "Collaborators view case info requests"
ON public.case_info_requests FOR SELECT TO authenticated
USING (public.has_case_access(case_id, auth.uid()));

CREATE POLICY "Contributors add case info requests"
ON public.case_info_requests FOR INSERT TO authenticated
WITH CHECK (
  public.can_edit_case(case_id, auth.uid())
  AND user_id = (SELECT c.user_id FROM public.cases c WHERE c.id = case_id)
);

CREATE POLICY "Contributors update case info requests"
ON public.case_info_requests FOR UPDATE TO authenticated
USING (public.can_edit_case(case_id, auth.uid()))
WITH CHECK (public.can_edit_case(case_id, auth.uid()));

-- ---------- CASE_INFO_REQUEST_ITEMS ----------
CREATE POLICY "Collaborators view case info request items"
ON public.case_info_request_items FOR SELECT TO authenticated
USING (public.has_case_access(case_id, auth.uid()));

CREATE POLICY "Contributors add case info request items"
ON public.case_info_request_items FOR INSERT TO authenticated
WITH CHECK (
  public.can_edit_case(case_id, auth.uid())
  AND user_id = (SELECT c.user_id FROM public.cases c WHERE c.id = case_id)
);

CREATE POLICY "Contributors update case info request items"
ON public.case_info_request_items FOR UPDATE TO authenticated
USING (public.can_edit_case(case_id, auth.uid()))
WITH CHECK (public.can_edit_case(case_id, auth.uid()));

-- ---------- CLIENTS (collaborators see client tied to a shared case) ----------
CREATE POLICY "Collaborators view clients on shared cases"
ON public.clients FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.client_id = clients.id
      AND public.has_case_access(c.id, auth.uid())
  )
);

-- ---------- DOCUMENT_VERSIONS (collaborators on the underlying case can view) ----------
-- document_versions has document_id = case_drafts.id (or other doc tables); we can only safely add
-- visibility for case_drafts versions because that's the type with case linkage.
CREATE POLICY "Collaborators view shared draft versions"
ON public.document_versions FOR SELECT TO authenticated
USING (
  document_type = 'case_draft'
  AND EXISTS (
    SELECT 1 FROM public.case_drafts d
    WHERE d.id = document_versions.document_id
      AND public.has_case_access(d.case_id, auth.uid())
  )
);

CREATE POLICY "Contributors save shared draft versions"
ON public.document_versions FOR INSERT TO authenticated
WITH CHECK (
  document_type = 'case_draft'
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.case_drafts d
    WHERE d.id = document_versions.document_id
      AND public.can_edit_case(d.case_id, auth.uid())
  )
);