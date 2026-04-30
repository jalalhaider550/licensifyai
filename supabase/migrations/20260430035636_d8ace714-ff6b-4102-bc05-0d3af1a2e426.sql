-- Workflows: reusable AI task presets
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own workflows" ON public.workflows FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own workflows" ON public.workflows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workflows" ON public.workflows FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own workflows" ON public.workflows FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workflow runs: execution history
CREATE TABLE public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workflow_id UUID NOT NULL,
  case_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  input_context TEXT NOT NULL DEFAULT '',
  step_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_output TEXT NOT NULL DEFAULT '',
  error_message TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own workflow runs" ON public.workflow_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own workflow runs" ON public.workflow_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workflow runs" ON public.workflow_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own workflow runs" ON public.workflow_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bulk reviews: spreadsheet-style document review
CREATE TABLE public.bulk_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  case_id UUID,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bulk reviews" ON public.bulk_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bulk reviews" ON public.bulk_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bulk reviews" ON public.bulk_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own bulk reviews" ON public.bulk_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_bulk_reviews_updated_at
BEFORE UPDATE ON public.bulk_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workflows_user ON public.workflows(user_id);
CREATE INDEX idx_workflow_runs_user ON public.workflow_runs(user_id);
CREATE INDEX idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);
CREATE INDEX idx_bulk_reviews_user ON public.bulk_reviews(user_id);