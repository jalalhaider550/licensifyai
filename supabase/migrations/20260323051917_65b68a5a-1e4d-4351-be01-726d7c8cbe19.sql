-- Create request records for collecting missing client information on legal cases
CREATE TABLE public.case_info_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  title TEXT NOT NULL,
  request_message TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested',
  submitted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submission_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  last_reminded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token)
);

CREATE INDEX idx_case_info_requests_case_id ON public.case_info_requests(case_id);
CREATE INDEX idx_case_info_requests_client_id ON public.case_info_requests(client_id);
CREATE INDEX idx_case_info_requests_status ON public.case_info_requests(status);
CREATE INDEX idx_case_info_requests_token ON public.case_info_requests(token);

CREATE TABLE public.case_info_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.case_info_requests(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  request_type TEXT NOT NULL DEFAULT 'document',
  document_category TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  response_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_info_request_items_request_id ON public.case_info_request_items(request_id);
CREATE INDEX idx_case_info_request_items_case_id ON public.case_info_request_items(case_id);
CREATE INDEX idx_case_info_request_items_status ON public.case_info_request_items(status);

ALTER TABLE public.case_info_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_info_request_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_case_info_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  linked_case public.cases%ROWTYPE;
BEGIN
  SELECT * INTO linked_case
  FROM public.cases
  WHERE id = NEW.case_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced case % does not exist', NEW.case_id;
  END IF;

  IF linked_case.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'user_id must match the linked case owner';
  END IF;

  IF linked_case.client_id IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'client_id must match the linked case client';
  END IF;

  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_case_info_request_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  linked_request public.case_info_requests%ROWTYPE;
BEGIN
  SELECT * INTO linked_request
  FROM public.case_info_requests
  WHERE id = NEW.request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced request % does not exist', NEW.request_id;
  END IF;

  IF linked_request.case_id IS DISTINCT FROM NEW.case_id THEN
    RAISE EXCEPTION 'case_id must match the parent request';
  END IF;

  IF linked_request.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'user_id must match the parent request owner';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_case_info_request_before_write
BEFORE INSERT OR UPDATE ON public.case_info_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_case_info_request();

CREATE TRIGGER validate_case_info_request_item_before_write
BEFORE INSERT OR UPDATE ON public.case_info_request_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_case_info_request_item();

CREATE TRIGGER update_case_info_requests_updated_at
BEFORE UPDATE ON public.case_info_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_info_request_items_updated_at
BEFORE UPDATE ON public.case_info_request_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view own case info requests"
ON public.case_info_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_info_requests.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own case info requests"
ON public.case_info_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_info_requests.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own case info requests"
ON public.case_info_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_info_requests.case_id
      AND cases.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_info_requests.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own case info requests"
ON public.case_info_requests
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_info_requests.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own case info request items"
ON public.case_info_request_items
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.case_info_requests
    WHERE case_info_requests.id = case_info_request_items.request_id
      AND case_info_requests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own case info request items"
ON public.case_info_request_items
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.case_info_requests
    WHERE case_info_requests.id = case_info_request_items.request_id
      AND case_info_requests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own case info request items"
ON public.case_info_request_items
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.case_info_requests
    WHERE case_info_requests.id = case_info_request_items.request_id
      AND case_info_requests.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.case_info_requests
    WHERE case_info_requests.id = case_info_request_items.request_id
      AND case_info_requests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own case info request items"
ON public.case_info_request_items
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.case_info_requests
    WHERE case_info_requests.id = case_info_request_items.request_id
      AND case_info_requests.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.get_case_info_request(_token TEXT)
RETURNS TABLE (
  id UUID,
  case_id UUID,
  client_id UUID,
  title TEXT,
  request_message TEXT,
  instructions TEXT,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  client_name TEXT,
  case_title TEXT,
  items JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.case_id,
    r.client_id,
    r.title,
    r.request_message,
    r.instructions,
    r.status,
    r.expires_at,
    r.submitted_at,
    c.client_name,
    c.title AS case_title,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'label', i.label,
            'description', i.description,
            'request_type', i.request_type,
            'document_category', i.document_category,
            'status', i.status,
            'response_text', i.response_text,
            'metadata', i.metadata,
            'sort_order', i.sort_order
          ) ORDER BY i.sort_order, i.created_at
        )
        FROM public.case_info_request_items i
        WHERE i.request_id = r.id
      ),
      '[]'::jsonb
    ) AS items
  FROM public.case_info_requests r
  JOIN public.cases c ON c.id = r.case_id
  WHERE r.token = _token
    AND r.expires_at > now();
$$;