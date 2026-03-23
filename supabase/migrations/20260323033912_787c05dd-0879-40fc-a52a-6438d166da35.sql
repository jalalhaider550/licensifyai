DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'case_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.case_type AS ENUM (
      'licensing',
      'contract_dispute',
      'corporate',
      'employment',
      'intellectual_property',
      'general_legal'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NULL,
  title TEXT NOT NULL,
  case_type public.case_type NOT NULL DEFAULT 'general_legal',
  client_name TEXT NOT NULL,
  opponent TEXT NULL,
  case_summary TEXT NOT NULL DEFAULT '',
  key_facts TEXT[] NOT NULL DEFAULT '{}'::text[],
  intake_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'intake',
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT cases_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT cases_client_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.case_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.case_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  document_category TEXT NOT NULL DEFAULT 'supporting',
  file_type TEXT NULL,
  storage_path TEXT NULL,
  raw_text TEXT NOT NULL DEFAULT '',
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cases"
ON public.cases
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cases"
ON public.cases
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cases"
ON public.cases
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cases"
ON public.cases
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own case activities"
ON public.case_activities
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_activities.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own case activities"
ON public.case_activities
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_activities.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own case activities"
ON public.case_activities
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_activities.case_id
      AND cases.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_activities.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own case activities"
ON public.case_activities
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_activities.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own case documents"
ON public.case_documents
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own case documents"
ON public.case_documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own case documents"
ON public.case_documents
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own case documents"
ON public.case_documents
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
  )
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS case_id UUID NULL;
ALTER TABLE public.license_applications ADD COLUMN IF NOT EXISTS case_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_case_id_fkey'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_case_id_fkey
      FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'license_applications_case_id_fkey'
  ) THEN
    ALTER TABLE public.license_applications
      ADD CONSTRAINT license_applications_case_id_fkey
      FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_cases_user_id_updated_at ON public.cases(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON public.cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_type ON public.cases(case_type);
CREATE INDEX IF NOT EXISTS idx_case_activities_case_id_created_at ON public.case_activities(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id_created_at ON public.case_documents(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);
CREATE INDEX IF NOT EXISTS idx_license_applications_case_id ON public.license_applications(case_id);

DROP TRIGGER IF EXISTS update_cases_updated_at ON public.cases;
CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_case_documents_updated_at ON public.case_documents;
CREATE TRIGGER update_case_documents_updated_at
BEFORE UPDATE ON public.case_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();