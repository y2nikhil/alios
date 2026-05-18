-- ============= GROUPS =============
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  topic text,
  emoji text NOT NULL DEFAULT '💬',
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View public groups" ON public.groups
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated creates groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator updates group" ON public.groups
  FOR UPDATE USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Creator deletes group" ON public.groups
  FOR DELETE USING (auth.uid() = created_by OR has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View group memberships" ON public.group_members
  FOR SELECT USING (true);

CREATE POLICY "Users join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

-- Link chat_channels to groups
ALTER TABLE public.chat_channels ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "View channels" ON public.chat_channels;
CREATE POLICY "View channels" ON public.chat_channels FOR SELECT USING (
  (team_id IS NULL AND group_id IS NULL)
  OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = chat_channels.group_id AND g.is_public = true))
  OR (team_id IS NOT NULL AND (is_team_member(auth.uid(), team_id) OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = chat_channels.team_id AND t.owner_id = auth.uid())))
  OR has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Send channel messages" ON public.chat_messages;
CREATE POLICY "Send channel messages" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.chat_channels c WHERE c.id = chat_messages.channel_id AND (
      (c.team_id IS NULL AND c.group_id IS NULL)
      OR (c.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = c.group_id AND g.is_public = true))
      OR (c.team_id IS NOT NULL AND (is_team_member(auth.uid(), c.team_id) OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = c.team_id AND t.owner_id = auth.uid())))
    )
  )
);

DROP POLICY IF EXISTS "View channel messages" ON public.chat_messages;
CREATE POLICY "View channel messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_channels c WHERE c.id = chat_messages.channel_id AND (
      (c.team_id IS NULL AND c.group_id IS NULL)
      OR (c.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = c.group_id AND g.is_public = true))
      OR (c.team_id IS NOT NULL AND (is_team_member(auth.uid(), c.team_id) OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = c.team_id AND t.owner_id = auth.uid())))
      OR has_role(auth.uid(), 'super_admin')
    )
  )
);

CREATE OR REPLACE FUNCTION public.create_group_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_channels (group_id, name) VALUES (NEW.id, NEW.slug);
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id) VALUES (NEW.id, NEW.created_by)
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_group_channel
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.create_group_channel();

-- ============= WATCH PARTIES =============
CREATE TABLE public.watch_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  title text NOT NULL,
  media_url text NOT NULL,
  media_kind text NOT NULL DEFAULT 'iframe',
  media_id text,
  poster_url text,
  current_time_sec numeric NOT NULL DEFAULT 0,
  is_playing boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View parties" ON public.watch_parties FOR SELECT USING (true);
CREATE POLICY "Auth creates parties" ON public.watch_parties FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host updates party" ON public.watch_parties FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Host deletes party" ON public.watch_parties FOR DELETE USING (auth.uid() = host_id OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_watch_parties_updated_at
  BEFORE UPDATE ON public.watch_parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.watch_party_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  UNIQUE(party_id, user_id)
);
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View participants" ON public.watch_party_participants FOR SELECT USING (true);
CREATE POLICY "Users join parties" ON public.watch_party_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own participation" ON public.watch_party_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users leave parties" ON public.watch_party_participants FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.watch_party_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View party messages" ON public.watch_party_messages FOR SELECT USING (true);
CREATE POLICY "Send party messages" ON public.watch_party_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER TABLE public.watch_parties REPLICA IDENTITY FULL;
ALTER TABLE public.watch_party_participants REPLICA IDENTITY FULL;
ALTER TABLE public.groups REPLICA IDENTITY FULL;

-- Seed public groups (idempotent)
INSERT INTO public.groups (slug, name, description, topic, emoji, is_public) VALUES
  ('cat-prep',     'CAT Prep',      'Plan, share, and crush CAT together.',           'Exam',    '📚', true),
  ('ssc-prep',     'SSC Prep',      'SSC CGL, CHSL and beyond — group study room.',   'Exam',    '🎯', true),
  ('bank-prep',    'Bank Prep',     'IBPS, SBI, RBI — quants, reasoning, GA.',        'Exam',    '🏦', true),
  ('college-exams','College Exams', 'Semesters, vivas, mid-terms. You are not alone.','Academic','🎓', true),
  ('movie-night',  'Movie Night',   'Watch parties — drop a link, chill, vibe.',      'Hangout', '🍿', true)
ON CONFLICT (slug) DO NOTHING;