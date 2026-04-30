
-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_id UUID NULL,
  client_id UUID NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Meeting',
  source TEXT NOT NULL DEFAULT 'live' CHECK (source IN ('live','upload')),
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording','processing','ready','failed')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  transcript TEXT NOT NULL DEFAULT '',
  tldr TEXT NULL,
  detailed_summary TEXT NULL,
  lawyer_brief TEXT NULL,
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  deadlines JSONB NOT NULL DEFAULT '[]'::jsonb,
  parties JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  important_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  case_type TEXT NULL,
  jurisdiction TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_user ON public.meetings(user_id, created_at DESC);
CREATE INDEX idx_meetings_case ON public.meetings(case_id);
CREATE INDEX idx_meetings_client ON public.meetings(client_id);
CREATE INDEX idx_meetings_search ON public.meetings USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(transcript,'') || ' ' || coalesce(tldr,'') || ' ' || coalesce(detailed_summary,'')));

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own meetings" ON public.meetings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own meetings" ON public.meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own meetings" ON public.meetings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own meetings" ON public.meetings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meeting segments (timestamped transcript pieces)
CREATE TABLE public.meeting_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  start_seconds NUMERIC NOT NULL DEFAULT 0,
  end_seconds NUMERIC NOT NULL DEFAULT 0,
  speaker TEXT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_segments_meeting ON public.meeting_segments(meeting_id, start_seconds);

ALTER TABLE public.meeting_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own segments" ON public.meeting_segments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own segments" ON public.meeting_segments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own segments" ON public.meeting_segments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own segments" ON public.meeting_segments FOR DELETE USING (auth.uid() = user_id);
