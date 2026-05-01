-- Court filings module
CREATE TABLE public.court_filings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_id UUID,
  client_id UUID,
  jurisdiction TEXT NOT NULL DEFAULT 'UK',
  court TEXT NOT NULL DEFAULT '',
  filing_type TEXT NOT NULL,
  title TEXT NOT NULL,
  parties JSONB NOT NULL DEFAULT '{}'::jsonb,
  case_number TEXT NOT NULL DEFAULT '',
  facts TEXT NOT NULL DEFAULT '',
  relief TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  format_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.court_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own court filings" ON public.court_filings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own court filings" ON public.court_filings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own court filings" ON public.court_filings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own court filings" ON public.court_filings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_court_filings_updated_at BEFORE UPDATE ON public.court_filings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_court_filings_user ON public.court_filings(user_id, created_at DESC);

-- Legal memory system
CREATE TABLE public.legal_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_id UUID,
  client_id UUID,
  memory_type TEXT NOT NULL DEFAULT 'note',
  jurisdiction TEXT,
  topic TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  lessons TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own legal memory" ON public.legal_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own legal memory" ON public.legal_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own legal memory" ON public.legal_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own legal memory" ON public.legal_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_legal_memory_updated_at BEFORE UPDATE ON public.legal_memory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_legal_memory_user ON public.legal_memory(user_id, created_at DESC);
CREATE INDEX idx_legal_memory_search ON public.legal_memory USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(topic,'') || ' ' || coalesce(lessons,'')));
CREATE INDEX idx_legal_memory_tags ON public.legal_memory USING gin(tags);