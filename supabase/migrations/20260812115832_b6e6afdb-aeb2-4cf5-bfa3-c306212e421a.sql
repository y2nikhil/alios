CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'page_view',
  path text,
  label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own activity"
  ON public.activity_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins read all activity"
  ON public.activity_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_activity_events_user_created ON public.activity_events (user_id, created_at DESC);
CREATE INDEX idx_activity_events_created ON public.activity_events (created_at DESC);

-- Super admin oversight reads
CREATE POLICY "Super admins view all aux sessions"
  ON public.aux_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins view all aux statuses"
  ON public.aux_statuses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins view all chat messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins view all party messages"
  ON public.watch_party_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));