
-- Client access tokens for portal
CREATE TABLE public.client_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_access_tokens ENABLE ROW LEVEL SECURITY;

-- Lawyers can manage their own tokens
CREATE POLICY "Users can manage own tokens" ON public.client_access_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read for portal access (token validation)
CREATE POLICY "Anyone can validate tokens" ON public.client_access_tokens
  FOR SELECT TO anon
  USING (is_active = true AND expires_at > now());

-- Portal messages
CREATE TABLE public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('lawyer', 'client')),
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

-- Lawyers can manage messages for their clients
CREATE POLICY "Users can manage messages for own clients" ON public.portal_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = portal_messages.client_id AND clients.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = portal_messages.client_id AND clients.user_id = auth.uid()));

-- Anon users with valid token can read/insert messages
CREATE POLICY "Portal clients can read messages" ON public.portal_messages
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = portal_messages.client_id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

CREATE POLICY "Portal clients can send messages" ON public.portal_messages
  FOR INSERT TO anon
  WITH CHECK (
    sender_type = 'client' AND
    EXISTS (
      SELECT 1 FROM client_access_tokens
      WHERE client_access_tokens.client_id = portal_messages.client_id
      AND client_access_tokens.is_active = true
      AND client_access_tokens.expires_at > now()
    )
  );

-- Allow anon to read client data via valid token
CREATE POLICY "Portal clients can view their client record" ON public.clients
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = clients.id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

-- Allow anon to update client data via valid token
CREATE POLICY "Portal clients can update their client record" ON public.clients
  FOR UPDATE TO anon
  USING (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = clients.id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

-- Allow anon to read directors via valid token
CREATE POLICY "Portal clients can view directors" ON public.directors
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = directors.client_id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

-- Allow anon to manage directors via valid token
CREATE POLICY "Portal clients can manage directors" ON public.directors
  FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = directors.client_id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

-- Allow anon to read shareholders via valid token
CREATE POLICY "Portal clients can view shareholders" ON public.shareholders
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = shareholders.client_id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

-- Allow anon to manage shareholders via valid token
CREATE POLICY "Portal clients can manage shareholders" ON public.shareholders
  FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = shareholders.client_id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

-- Allow anon to read documents via valid token
CREATE POLICY "Portal clients can view documents" ON public.documents
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = documents.client_id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

-- Allow anon to insert documents via valid token  
CREATE POLICY "Portal clients can upload documents" ON public.documents
  FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM client_access_tokens
    WHERE client_access_tokens.client_id = documents.client_id
    AND client_access_tokens.is_active = true
    AND client_access_tokens.expires_at > now()
  ));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_messages;
