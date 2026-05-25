
DO $$ BEGIN
  CREATE TYPE public.party_visibility AS ENUM ('public','unlisted','private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.watch_parties
  ADD COLUMN IF NOT EXISTS visibility public.party_visibility NOT NULL DEFAULT 'public';

DROP POLICY IF EXISTS "View parties" ON public.watch_parties;
DROP POLICY IF EXISTS "View parties by visibility" ON public.watch_parties;
CREATE POLICY "View parties by visibility"
  ON public.watch_parties FOR SELECT
  USING (
    visibility = 'public'
    OR visibility = 'unlisted'
    OR auth.uid() = host_id
    OR has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'admin')
  );

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timeline_public boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "View public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "View public profiles"
  ON public.profiles FOR SELECT
  USING (timeline_public = true OR auth.uid() = id OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "View public aux sessions" ON public.aux_sessions;
CREATE POLICY "View public aux sessions"
  ON public.aux_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = aux_sessions.user_id AND p.timeline_public = true));

DROP POLICY IF EXISTS "View public adherence" ON public.daily_adherence;
CREATE POLICY "View public adherence"
  ON public.daily_adherence FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = daily_adherence.user_id AND p.timeline_public = true));

CREATE OR REPLACE FUNCTION public.end_watch_party(_party_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
          OR EXISTS (SELECT 1 FROM public.watch_parties WHERE id = _party_id AND host_id = auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to end this party';
  END IF;
  UPDATE public.watch_parties SET ended_at = now(), is_playing = false WHERE id = _party_id;
END;
$fn$;

DROP POLICY IF EXISTS "Admin updates any party" ON public.watch_parties;
CREATE POLICY "Admin updates any party"
  ON public.watch_parties FOR UPDATE
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin'));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_parties;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
