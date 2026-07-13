
-- Chat message kinds
DO $$ BEGIN
  CREATE TYPE public.chat_message_kind AS ENUM ('text','image','poll','mindmap_share');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS kind public.chat_message_kind NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Tasks: optional group
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_group_idx ON public.tasks (group_id);

-- Poll options + votes
CREATE TABLE IF NOT EXISTS public.poll_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  label       text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view poll options"
  ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Message author can add options"
  ON public.poll_options FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_messages cm
    WHERE cm.id = message_id AND cm.user_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id   uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (option_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view votes"
  ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users cast their own vote"
  ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_muted(auth.uid()));
CREATE POLICY "Users remove their own vote"
  ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DM threads
CREATE TABLE IF NOT EXISTS public.dm_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT ON public.dm_threads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view thread"
  ON public.dm_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Friends can create thread"
  ON public.dm_threads FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = user_a OR auth.uid() = user_b)
    AND public.are_friends(user_a, user_b)
  );

-- Helper: get or create a thread for a pair
CREATE OR REPLACE FUNCTION public.get_or_create_dm_thread(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _me uuid := auth.uid();
  _a uuid; _b uuid; _id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _me = _other THEN RAISE EXCEPTION 'cannot DM yourself'; END IF;
  IF NOT public.are_friends(_me, _other) THEN
    RAISE EXCEPTION 'You must be friends to start a DM';
  END IF;
  _a := LEAST(_me, _other); _b := GREATEST(_me, _other);
  SELECT id INTO _id FROM public.dm_threads WHERE user_a=_a AND user_b=_b;
  IF _id IS NULL THEN
    INSERT INTO public.dm_threads(user_a, user_b) VALUES (_a, _b) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.get_or_create_dm_thread(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_thread(uuid) TO authenticated;

-- DM messages
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body           text,
  attachment_url text,
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS dm_messages_thread_created_idx
  ON public.dm_messages (thread_id, created_at);

CREATE OR REPLACE FUNCTION public.is_dm_participant(_user uuid, _thread uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dm_threads t
    WHERE t.id = _thread AND (t.user_a = _user OR t.user_b = _user)
  );
$$;
REVOKE ALL ON FUNCTION public.is_dm_participant(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) TO authenticated;

CREATE POLICY "Participants view DMs"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (public.is_dm_participant(auth.uid(), thread_id));

CREATE POLICY "Participants send DMs"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_dm_participant(auth.uid(), thread_id)
    AND NOT public.is_muted(auth.uid())
  );

CREATE POLICY "Recipient marks read"
  ON public.dm_messages FOR UPDATE TO authenticated
  USING (public.is_dm_participant(auth.uid(), thread_id) AND sender_id <> auth.uid())
  WITH CHECK (public.is_dm_participant(auth.uid(), thread_id) AND sender_id <> auth.uid());

-- Bump thread updated_at when a new message arrives
CREATE OR REPLACE FUNCTION public.bump_dm_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.dm_threads SET updated_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS dm_messages_bump ON public.dm_messages;
CREATE TRIGGER dm_messages_bump AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_dm_thread();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
