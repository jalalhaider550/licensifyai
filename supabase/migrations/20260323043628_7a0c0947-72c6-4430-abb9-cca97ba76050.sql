-- Extend cases with a client-safe summary for portal sharing
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS client_summary text NOT NULL DEFAULT '';

-- Add client visibility flags to case activity and case documents
ALTER TABLE public.case_activities
ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.case_documents
ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS uploaded_by text NOT NULL DEFAULT 'lawyer',
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_case_documents_case_created_at
ON public.case_documents (case_id, created_at DESC);

-- Extend portal messages so chat can live inside a specific case and carry attachments
ALTER TABLE public.portal_messages
ADD COLUMN IF NOT EXISTS case_id uuid,
ADD COLUMN IF NOT EXISTS sender_name text,
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'portal_messages'
      AND constraint_name = 'portal_messages_case_id_fkey'
  ) THEN
    ALTER TABLE public.portal_messages
    ADD CONSTRAINT portal_messages_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portal_messages_case_created_at
ON public.portal_messages (case_id, created_at DESC);

-- Persist AI actions and their execution results inside each case
CREATE TABLE public.case_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  action_type text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  description text,
  reasoning text,
  result_content text NOT NULL DEFAULT '',
  document_category text,
  is_client_action boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.case_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own case actions"
ON public.case_actions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_actions.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own case actions"
ON public.case_actions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_actions.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own case actions"
ON public.case_actions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_actions.case_id
      AND cases.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_actions.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own case actions"
ON public.case_actions
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_actions.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Portal clients can view assigned case actions"
ON public.case_actions
FOR SELECT
TO anon
USING (
  is_client_action = true
  AND EXISTS (
    SELECT 1
    FROM public.cases
    JOIN public.client_access_tokens
      ON client_access_tokens.client_id = cases.client_id
    WHERE cases.id = case_actions.case_id
      AND client_access_tokens.is_active = true
      AND client_access_tokens.expires_at > now()
  )
);

CREATE INDEX idx_case_actions_case_created_at ON public.case_actions (case_id, created_at DESC);
CREATE INDEX idx_case_actions_case_status ON public.case_actions (case_id, status);

-- Persist lawyer-generated drafts and final approved versions
CREATE TABLE public.case_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'legal_draft',
  jurisdiction text NOT NULL DEFAULT 'UK',
  version_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_notes text,
  approved_at timestamp with time zone,
  approved_by uuid,
  client_visible boolean NOT NULL DEFAULT false,
  pdf_storage_path text,
  docx_storage_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.case_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own case drafts"
ON public.case_drafts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_drafts.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own case drafts"
ON public.case_drafts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_drafts.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own case drafts"
ON public.case_drafts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_drafts.case_id
      AND cases.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_drafts.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own case drafts"
ON public.case_drafts
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.cases
    WHERE cases.id = case_drafts.case_id
      AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Portal clients can view shared case drafts"
ON public.case_drafts
FOR SELECT
TO anon
USING (
  client_visible = true
  AND EXISTS (
    SELECT 1
    FROM public.cases
    JOIN public.client_access_tokens
      ON client_access_tokens.client_id = cases.client_id
    WHERE cases.id = case_drafts.case_id
      AND client_access_tokens.is_active = true
      AND client_access_tokens.expires_at > now()
  )
);

CREATE INDEX idx_case_drafts_case_status ON public.case_drafts (case_id, status, version_number DESC);

-- Keep case-linked records internally consistent
CREATE OR REPLACE FUNCTION public.validate_case_linked_record()
RETURNS trigger
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

  IF TG_TABLE_NAME = 'portal_messages' THEN
    IF NEW.client_id IS DISTINCT FROM linked_case.client_id THEN
      RAISE EXCEPTION 'client_id must match the linked case client';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_case_documents_case_link ON public.case_documents;
CREATE TRIGGER validate_case_documents_case_link
BEFORE INSERT OR UPDATE ON public.case_documents
FOR EACH ROW
EXECUTE FUNCTION public.validate_case_linked_record();

DROP TRIGGER IF EXISTS validate_case_actions_case_link ON public.case_actions;
CREATE TRIGGER validate_case_actions_case_link
BEFORE INSERT OR UPDATE ON public.case_actions
FOR EACH ROW
EXECUTE FUNCTION public.validate_case_linked_record();

DROP TRIGGER IF EXISTS validate_case_drafts_case_link ON public.case_drafts;
CREATE TRIGGER validate_case_drafts_case_link
BEFORE INSERT OR UPDATE ON public.case_drafts
FOR EACH ROW
EXECUTE FUNCTION public.validate_case_linked_record();

DROP TRIGGER IF EXISTS validate_portal_messages_case_link ON public.portal_messages;
CREATE TRIGGER validate_portal_messages_case_link
BEFORE INSERT OR UPDATE ON public.portal_messages
FOR EACH ROW
WHEN (NEW.case_id IS NOT NULL)
EXECUTE FUNCTION public.validate_case_linked_record();

-- Updated at automation for new draft/action records
DROP TRIGGER IF EXISTS update_case_actions_updated_at ON public.case_actions;
CREATE TRIGGER update_case_actions_updated_at
BEFORE UPDATE ON public.case_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_case_drafts_updated_at ON public.case_drafts;
CREATE TRIGGER update_case_drafts_updated_at
BEFORE UPDATE ON public.case_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow portal clients to view case-visible activity and upload case-specific documents
CREATE POLICY "Portal clients can view shared case activity"
ON public.case_activities
FOR SELECT
TO anon
USING (
  client_visible = true
  AND EXISTS (
    SELECT 1
    FROM public.cases
    JOIN public.client_access_tokens
      ON client_access_tokens.client_id = cases.client_id
    WHERE cases.id = case_activities.case_id
      AND client_access_tokens.is_active = true
      AND client_access_tokens.expires_at > now()
  )
);

CREATE POLICY "Portal clients can view case documents"
ON public.case_documents
FOR SELECT
TO anon
USING (
  client_visible = true
  AND EXISTS (
    SELECT 1
    FROM public.cases
    JOIN public.client_access_tokens
      ON client_access_tokens.client_id = cases.client_id
    WHERE cases.id = case_documents.case_id
      AND client_access_tokens.is_active = true
      AND client_access_tokens.expires_at > now()
  )
);

CREATE POLICY "Portal clients can upload case documents"
ON public.case_documents
FOR INSERT
TO anon
WITH CHECK (
  uploaded_by = 'client'
  AND EXISTS (
    SELECT 1
    FROM public.cases
    JOIN public.client_access_tokens
      ON client_access_tokens.client_id = cases.client_id
    WHERE cases.id = case_documents.case_id
      AND case_documents.user_id = cases.user_id
      AND client_access_tokens.is_active = true
      AND client_access_tokens.expires_at > now()
  )
);