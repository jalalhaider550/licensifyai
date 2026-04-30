-- Document version control (additive — does not modify case_drafts or documents)
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  change_summary TEXT NOT NULL DEFAULT '',
  author_type TEXT NOT NULL DEFAULT 'user',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_versions_doc ON public.document_versions(document_type, document_id, version_number DESC);
CREATE INDEX idx_document_versions_user ON public.document_versions(user_id);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own document versions"
  ON public.document_versions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own document versions"
  ON public.document_versions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own document versions"
  ON public.document_versions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own document versions"
  ON public.document_versions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Vault Projects (isolated grouping of files)
CREATE TABLE public.vault_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'navy',
  case_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vault_projects_user ON public.vault_projects(user_id);
CREATE INDEX idx_vault_projects_case ON public.vault_projects(case_id);

ALTER TABLE public.vault_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vault projects"
  ON public.vault_projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vault projects"
  ON public.vault_projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vault projects"
  ON public.vault_projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vault projects"
  ON public.vault_projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_vault_projects_updated_at
  BEFORE UPDATE ON public.vault_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vault Files
CREATE TABLE public.vault_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vault_files_project ON public.vault_files(project_id);
CREATE INDEX idx_vault_files_user ON public.vault_files(user_id);
CREATE INDEX idx_vault_files_tags ON public.vault_files USING GIN(tags);

ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vault files"
  ON public.vault_files FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.vault_projects p
    WHERE p.id = vault_files.project_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users insert own vault files"
  ON public.vault_files FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.vault_projects p
    WHERE p.id = vault_files.project_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users update own vault files"
  ON public.vault_files FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vault files"
  ON public.vault_files FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_vault_files_updated_at
  BEFORE UPDATE ON public.vault_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for vault files (reuse existing 'documents' bucket, prefix 'vault/')
CREATE POLICY "Users upload to own vault folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'vault' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Users read own vault files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'vault' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Users delete own vault files storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'vault' AND (storage.foldername(name))[2] = auth.uid()::text);