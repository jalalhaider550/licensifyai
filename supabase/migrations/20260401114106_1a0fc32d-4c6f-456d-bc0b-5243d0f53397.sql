
CREATE TABLE public.conveyancing_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  property_address text NOT NULL,
  client_type text NOT NULL DEFAULT 'buyer',
  price numeric NOT NULL DEFAULT 0,
  current_step text NOT NULL DEFAULT 'client_intake',
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conveyancing_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conveyancing cases" ON public.conveyancing_cases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conveyancing cases" ON public.conveyancing_cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conveyancing cases" ON public.conveyancing_cases FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own conveyancing cases" ON public.conveyancing_cases FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.conveyancing_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.conveyancing_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  missing_items text[] NOT NULL DEFAULT '{}'::text[],
  ai_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conveyancing_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conveyancing steps" ON public.conveyancing_steps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conveyancing steps" ON public.conveyancing_steps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conveyancing steps" ON public.conveyancing_steps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own conveyancing steps" ON public.conveyancing_steps FOR DELETE TO authenticated USING (auth.uid() = user_id);
