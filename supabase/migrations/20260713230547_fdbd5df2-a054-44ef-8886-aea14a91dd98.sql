
-- Enums
DO $$ BEGIN
  CREATE TYPE public.report_target_type AS ENUM ('chat_message','dm_message','user','party_message','note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_reason AS ENUM ('harassment','nsfw','spam','hate','self_harm','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('open','actioned','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sanction_kind AS ENUM ('warn','mute','temp_ban','perma_ban');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type   public.report_target_type NOT NULL,
  target_id     uuid NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason        public.report_reason NOT NULL,
  details       text,
  status        public.report_status NOT NULL DEFAULT 'open',
  handled_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at    timestamptz,
  handler_note  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can file their own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporter or moderator can view"
  ON public.reports FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'super_admin')
  );

CREATE POLICY "Moderators can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS reports_status_created_idx ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_idx ON public.reports (target_type, target_id);

-- Sanctions table
CREATE TABLE IF NOT EXISTS public.user_sanctions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         public.sanction_kind NOT NULL,
  reason       text,
  issued_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at   timestamptz,
  lifted_at    timestamptz,
  lifted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  report_id    uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_sanctions TO authenticated;
GRANT INSERT, UPDATE ON public.user_sanctions TO authenticated;
GRANT ALL ON public.user_sanctions TO service_role;

ALTER TABLE public.user_sanctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self or moderator can view sanctions"
  ON public.user_sanctions FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'super_admin')
  );

CREATE POLICY "Moderators can issue sanctions"
  ON public.user_sanctions FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
    AND user_id <> auth.uid()
    AND (kind <> 'perma_ban' OR public.has_role(auth.uid(),'super_admin'))
  );

CREATE POLICY "Moderators can lift sanctions"
  ON public.user_sanctions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS user_sanctions_user_active_idx
  ON public.user_sanctions (user_id) WHERE lifted_at IS NULL;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_muted(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sanctions
    WHERE user_id = _user
      AND kind IN ('mute','temp_ban','perma_ban')
      AND lifted_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_banned(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sanctions
    WHERE user_id = _user
      AND kind IN ('temp_ban','perma_ban')
      AND lifted_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Enforce mute on chat, party chat, and manager notes
DROP POLICY IF EXISTS "Muted users cannot post chat" ON public.chat_messages;
CREATE POLICY "Muted users cannot post chat"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_muted(auth.uid()));

DROP POLICY IF EXISTS "Muted users cannot post party chat" ON public.watch_party_messages;
CREATE POLICY "Muted users cannot post party chat"
  ON public.watch_party_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_muted(auth.uid()));

DROP POLICY IF EXISTS "Muted users cannot post notes" ON public.manager_notes;
CREATE POLICY "Muted users cannot post notes"
  ON public.manager_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_muted(auth.uid()));

-- updated_at triggers
DROP TRIGGER IF EXISTS reports_touch ON public.reports;
CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
