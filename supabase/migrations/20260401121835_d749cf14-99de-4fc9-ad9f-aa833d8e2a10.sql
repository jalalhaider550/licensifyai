ALTER TABLE public.conveyancing_cases ADD COLUMN intake_token text DEFAULT encode(extensions.gen_random_bytes(24), 'hex');

-- Allow anonymous users to read conveyancing case by intake token
CREATE POLICY "Anon can view conveyancing case by intake token"
ON public.conveyancing_cases FOR SELECT TO anon
USING (intake_token IS NOT NULL);

-- Allow anonymous users to read conveyancing steps by case
CREATE POLICY "Anon can view conveyancing steps by intake token"
ON public.conveyancing_steps FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.conveyancing_cases cc
  WHERE cc.id = conveyancing_steps.case_id
  AND cc.intake_token IS NOT NULL
));

-- Allow anonymous users to insert/update conveyancing_client_intake
CREATE POLICY "Anon can insert intake by token"
ON public.conveyancing_client_intake FOR INSERT TO anon
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conveyancing_cases cc
  WHERE cc.id = conveyancing_client_intake.case_id
  AND cc.intake_token IS NOT NULL
));

CREATE POLICY "Anon can update intake by token"
ON public.conveyancing_client_intake FOR UPDATE TO anon
USING (EXISTS (
  SELECT 1 FROM public.conveyancing_cases cc
  WHERE cc.id = conveyancing_client_intake.case_id
  AND cc.intake_token IS NOT NULL
));

CREATE POLICY "Anon can view intake by token"
ON public.conveyancing_client_intake FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.conveyancing_cases cc
  WHERE cc.id = conveyancing_client_intake.case_id
  AND cc.intake_token IS NOT NULL
));