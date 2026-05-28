
-- 1. Tighten court_filings: require case_id and case-level permission
DROP POLICY IF EXISTS "Users insert own court filings" ON public.court_filings;
DROP POLICY IF EXISTS "Users update own court filings" ON public.court_filings;
DROP POLICY IF EXISTS "Users delete own court filings" ON public.court_filings;
DROP POLICY IF EXISTS "Users view own court filings" ON public.court_filings;

CREATE POLICY "Owner or editors view court filings"
  ON public.court_filings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (case_id IS NOT NULL AND has_case_access(case_id, auth.uid())));

CREATE POLICY "Owner or editors update court filings"
  ON public.court_filings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (case_id IS NOT NULL AND get_case_permission(case_id, auth.uid()) = ANY (ARRAY['editor','co_owner'])))
  WITH CHECK (auth.uid() = user_id OR (case_id IS NOT NULL AND get_case_permission(case_id, auth.uid()) = ANY (ARRAY['editor','co_owner'])));

CREATE POLICY "Owner deletes court filings"
  ON public.court_filings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. firm_members: remove self-insert privilege escalation
DROP POLICY IF EXISTS "Admin manages firm members insert" ON public.firm_members;
CREATE POLICY "Admin manages firm members insert"
  ON public.firm_members FOR INSERT TO authenticated
  WITH CHECK (is_firm_admin(auth.uid(), firm_id));

-- 3. profiles: remove blanket admin read/update of all profiles (billing exposure)
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;

-- 4. portal_messages: remove from realtime publication to prevent cross-tenant leak
ALTER PUBLICATION supabase_realtime DROP TABLE public.portal_messages;
