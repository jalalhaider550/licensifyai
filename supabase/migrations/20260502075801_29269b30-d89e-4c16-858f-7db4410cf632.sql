-- =========================================================
-- FIRM WORKSPACE FOUNDATION
-- =========================================================

-- Enums
CREATE TYPE public.firm_role AS ENUM ('admin','partner','associate','paralegal','assistant','custom');
CREATE TYPE public.case_permission AS ENUM ('viewer','contributor','editor','co_owner');
CREATE TYPE public.firm_account_type AS ENUM ('solo','firm');
CREATE TYPE public.invite_status AS ENUM ('pending','accepted','revoked','expired');

-- =========================================================
-- FIRMS
-- =========================================================
CREATE TABLE public.firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type public.firm_account_type NOT NULL DEFAULT 'solo',
  admin_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- FIRM MEMBERS
-- =========================================================
CREATE TABLE public.firm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.firm_role NOT NULL DEFAULT 'associate',
  custom_role_label text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, user_id)
);
CREATE INDEX idx_firm_members_user ON public.firm_members(user_id);
CREATE INDEX idx_firm_members_firm ON public.firm_members(firm_id);

-- =========================================================
-- FIRM INVITES
-- =========================================================
CREATE TABLE public.firm_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  email text NOT NULL,
  role public.firm_role NOT NULL DEFAULT 'associate',
  custom_role_label text NOT NULL DEFAULT '',
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  status public.invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_firm_invites_token ON public.firm_invites(token);
CREATE INDEX idx_firm_invites_email ON public.firm_invites(lower(email));

-- =========================================================
-- CASE SHARES
-- =========================================================
CREATE TABLE public.case_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  shared_with_user_id uuid NOT NULL,
  shared_by_user_id uuid NOT NULL,
  permission public.case_permission NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, shared_with_user_id)
);
CREATE INDEX idx_case_shares_case ON public.case_shares(case_id);
CREATE INDEX idx_case_shares_user ON public.case_shares(shared_with_user_id);

-- =========================================================
-- FIRM CASES (admin-designated firm pool)
-- =========================================================
CREATE TABLE public.firm_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  case_id uuid NOT NULL UNIQUE,
  designated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_firm_cases_firm ON public.firm_cases(firm_id);

-- =========================================================
-- CASE ACTIVITY LOG (immutable feed)
-- =========================================================
CREATE TABLE public.case_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  actor_name text NOT NULL DEFAULT '',
  action_type text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id uuid,
  description text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_case_activity_case_time ON public.case_activity_log(case_id, created_at DESC);

-- =========================================================
-- DOCUMENT COMMENTS
-- =========================================================
CREATE TABLE public.document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  document_type text NOT NULL,
  document_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  anchor jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_comments_doc ON public.document_comments(document_type, document_id);
CREATE INDEX idx_doc_comments_case ON public.document_comments(case_id);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid,
  notif_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link_path text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  default_mode text NOT NULL DEFAULT 'realtime', -- realtime | digest | off
  per_case jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- CASE PRESENCE (live who-is-here)
-- =========================================================
CREATE TABLE public.case_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#3B82F6',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (case_id, user_id)
);
CREATE INDEX idx_case_presence_case ON public.case_presence(case_id, last_seen_at DESC);

-- =========================================================
-- HELPER FUNCTIONS (security definer to avoid RLS recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_user_firm_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT firm_id FROM public.firm_members
  WHERE user_id = _user_id AND is_active = true
  ORDER BY created_at ASC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_firm_admin(_user_id uuid, _firm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.firms f
    WHERE f.id = _firm_id AND f.admin_user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_firm_member(_user_id uuid, _firm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.firm_members
    WHERE user_id = _user_id AND firm_id = _firm_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.same_firm(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.firm_members ma
    JOIN public.firm_members mb ON mb.firm_id = ma.firm_id
    WHERE ma.user_id = _a AND mb.user_id = _b
      AND ma.is_active = true AND mb.is_active = true
  );
$$;

-- Returns the user's permission level on a case ('owner','co_owner','editor','contributor','viewer','firm_pool', or null)
CREATE OR REPLACE FUNCTION public.get_case_permission(_case_id uuid, _user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _owner uuid;
  _perm public.case_permission;
  _firm uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.cases WHERE id = _case_id;
  IF _owner IS NULL THEN RETURN NULL; END IF;
  IF _owner = _user_id THEN RETURN 'owner'; END IF;

  SELECT permission INTO _perm FROM public.case_shares
  WHERE case_id = _case_id AND shared_with_user_id = _user_id;
  IF _perm IS NOT NULL THEN RETURN _perm::text; END IF;

  -- Firm pool check
  SELECT fc.firm_id INTO _firm FROM public.firm_cases fc WHERE fc.case_id = _case_id;
  IF _firm IS NOT NULL AND public.is_firm_member(_user_id, _firm) THEN
    RETURN 'firm_pool';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_case_access(_case_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_case_permission(_case_id, _user_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_case(_case_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_case_permission(_case_id, _user_id) IN ('owner','co_owner','editor','contributor');
$$;

-- =========================================================
-- AUTO-CREATE PERSONAL FIRM ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_firm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _firm_id uuid;
  _name text;
  _email text;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'firm_name',
                    NEW.raw_user_meta_data->>'display_name',
                    split_part(NEW.email, '@', 1),
                    'Personal Firm');
  _email := COALESCE(NEW.email, '');

  INSERT INTO public.firms (name, account_type, admin_user_id)
  VALUES (_name, 'solo', NEW.id)
  RETURNING id INTO _firm_id;

  INSERT INTO public.firm_members (firm_id, user_id, role, display_name, email)
  VALUES (_firm_id, NEW.id, 'admin', _name, _email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_firm ON auth.users;
CREATE TRIGGER on_auth_user_created_firm
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_firm();

-- =========================================================
-- BACKFILL: existing users get a personal firm
-- =========================================================
DO $$
DECLARE
  u RECORD;
  _firm_id uuid;
  _name text;
BEGIN
  FOR u IN
    SELECT au.id, au.email, p.firm_name, p.display_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE NOT EXISTS (SELECT 1 FROM public.firm_members fm WHERE fm.user_id = au.id)
  LOOP
    _name := COALESCE(NULLIF(u.firm_name,''), NULLIF(u.display_name,''), split_part(u.email,'@',1), 'Personal Firm');
    INSERT INTO public.firms (name, account_type, admin_user_id) VALUES (_name, 'solo', u.id) RETURNING id INTO _firm_id;
    INSERT INTO public.firm_members (firm_id, user_id, role, display_name, email)
    VALUES (_firm_id, u.id, 'admin', _name, COALESCE(u.email,''));
  END LOOP;
END $$;

-- =========================================================
-- TIMESTAMP TRIGGERS
-- =========================================================
CREATE TRIGGER trg_firms_updated BEFORE UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_firm_members_updated BEFORE UPDATE ON public.firm_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_case_shares_updated BEFORE UPDATE ON public.case_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_comments_updated BEFORE UPDATE ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_presence ENABLE ROW LEVEL SECURITY;

-- firms
CREATE POLICY "Members view their firm" ON public.firms FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), id));
CREATE POLICY "Admin updates firm" ON public.firms FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid()) WITH CHECK (admin_user_id = auth.uid());
CREATE POLICY "User creates firm" ON public.firms FOR INSERT TO authenticated
  WITH CHECK (admin_user_id = auth.uid());
CREATE POLICY "Admin deletes firm" ON public.firms FOR DELETE TO authenticated
  USING (admin_user_id = auth.uid());

-- firm_members
CREATE POLICY "Members view firm members" ON public.firm_members FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "Admin manages firm members insert" ON public.firm_members FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_admin(auth.uid(), firm_id) OR user_id = auth.uid());
CREATE POLICY "Admin updates firm members" ON public.firm_members FOR UPDATE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id))
  WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));
CREATE POLICY "Admin removes firm members" ON public.firm_members FOR DELETE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id) AND user_id <> auth.uid());

-- firm_invites
CREATE POLICY "Admin views invites" ON public.firm_invites FOR SELECT TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id));
CREATE POLICY "Admin creates invites" ON public.firm_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_admin(auth.uid(), firm_id) AND invited_by = auth.uid());
CREATE POLICY "Admin updates invites" ON public.firm_invites FOR UPDATE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id))
  WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));
CREATE POLICY "Admin deletes invites" ON public.firm_invites FOR DELETE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id));
CREATE POLICY "Anon validates invite by token" ON public.firm_invites FOR SELECT TO anon
  USING (status = 'pending' AND expires_at > now());

-- case_shares
CREATE POLICY "Owner or share-target sees shares" ON public.case_shares FOR SELECT TO authenticated
  USING (
    shared_with_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    OR public.get_case_permission(case_id, auth.uid()) = 'co_owner'
  );
CREATE POLICY "Owner or co-owner shares case" ON public.case_shares FOR INSERT TO authenticated
  WITH CHECK (
    shared_by_user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
      OR public.get_case_permission(case_id, auth.uid()) = 'co_owner'
    )
  );
CREATE POLICY "Owner or co-owner updates share" ON public.case_shares FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    OR public.get_case_permission(case_id, auth.uid()) = 'co_owner'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    OR public.get_case_permission(case_id, auth.uid()) = 'co_owner'
  );
CREATE POLICY "Owner or co-owner revokes share" ON public.case_shares FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
    OR public.get_case_permission(case_id, auth.uid()) = 'co_owner'
  );

-- firm_cases
CREATE POLICY "Firm members view firm pool" ON public.firm_cases FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "Admin designates firm case" ON public.firm_cases FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_admin(auth.uid(), firm_id) AND designated_by = auth.uid());
CREATE POLICY "Admin removes firm case" ON public.firm_cases FOR DELETE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id));

-- case_activity_log
CREATE POLICY "Anyone with case access views activity" ON public.case_activity_log FOR SELECT TO authenticated
  USING (public.has_case_access(case_id, auth.uid()));
CREATE POLICY "Anyone with case access logs activity" ON public.case_activity_log FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() AND public.has_case_access(case_id, auth.uid()));

-- document_comments
CREATE POLICY "Case access views comments" ON public.document_comments FOR SELECT TO authenticated
  USING (public.has_case_access(case_id, auth.uid()));
CREATE POLICY "Case editors create comments" ON public.document_comments FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid() AND public.has_case_access(case_id, auth.uid()));
CREATE POLICY "Author or owner updates comment" ON public.document_comments FOR UPDATE TO authenticated
  USING (
    author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Author or owner deletes comment" ON public.document_comments FOR DELETE TO authenticated
  USING (
    author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.user_id = auth.uid())
  );

-- notifications
CREATE POLICY "User views own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "User deletes own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "System (any authed) inserts notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- notification_preferences
CREATE POLICY "User views own prefs" ON public.notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "User upserts own prefs ins" ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "User upserts own prefs upd" ON public.notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- case_presence
CREATE POLICY "Case access views presence" ON public.case_presence FOR SELECT TO authenticated
  USING (public.has_case_access(case_id, auth.uid()));
CREATE POLICY "User upserts own presence ins" ON public.case_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_case_access(case_id, auth.uid()));
CREATE POLICY "User upserts own presence upd" ON public.case_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "User clears own presence" ON public.case_presence FOR DELETE TO authenticated
  USING (user_id = auth.uid());