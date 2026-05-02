
-- Credentials vault per user + court system
CREATE TABLE public.court_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  court_system text NOT NULL,
  jurisdiction text NOT NULL,
  username text NOT NULL DEFAULT '',
  secret_cipher text NOT NULL DEFAULT '',
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, court_system)
);

ALTER TABLE public.court_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own court credentials" ON public.court_credentials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own court credentials" ON public.court_credentials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own court credentials" ON public.court_credentials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own court credentials" ON public.court_credentials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_court_credentials_updated_at
  BEFORE UPDATE ON public.court_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Submission receipts
CREATE TABLE public.court_filing_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid,
  filing_id uuid,
  court_system text NOT NULL,
  jurisdiction text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  confirmation_number text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  last_polled_at timestamptz,
  receipt jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.court_filing_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own filing submissions" ON public.court_filing_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own filing submissions" ON public.court_filing_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own filing submissions" ON public.court_filing_submissions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own filing submissions" ON public.court_filing_submissions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_court_filing_submissions_updated_at
  BEFORE UPDATE ON public.court_filing_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_filing_submissions_case ON public.court_filing_submissions(case_id);
CREATE INDEX idx_filing_submissions_user ON public.court_filing_submissions(user_id);
