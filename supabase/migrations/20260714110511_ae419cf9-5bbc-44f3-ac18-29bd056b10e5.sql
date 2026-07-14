
-- Add 'file' to chat kinds; add 'system' safely
DO $$ BEGIN ALTER TYPE public.chat_message_kind ADD VALUE IF NOT EXISTS 'file'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'system'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mindmap_comment'; EXCEPTION WHEN others THEN NULL; END $$;

-- Attachment metadata
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text,
  ADD COLUMN IF NOT EXISTS attachment_size integer,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';

-- =========================================================================
-- Reactions on group chat messages
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions readable to channel viewers" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_messages m
    JOIN public.chat_channels ch ON ch.id = m.channel_id
    WHERE m.id = message_reactions.message_id
      AND (
        (ch.team_id IS NULL AND ch.group_id IS NULL)
        OR (ch.team_id IS NOT NULL AND public.is_team_member(auth.uid(), ch.team_id))
        OR (ch.group_id IS NOT NULL AND public.is_group_member(auth.uid(), ch.group_id))
      )
  ));

CREATE POLICY "users add their own reactions" ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users remove their own reactions" ON public.message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- Reactions on DM messages
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.dm_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.dm_message_reactions TO authenticated;
GRANT ALL ON public.dm_message_reactions TO service_role;
ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm reactions readable to participants" ON public.dm_message_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dm_messages m
    WHERE m.id = dm_message_reactions.message_id
      AND public.is_dm_participant(auth.uid(), m.thread_id)
  ));

CREATE POLICY "users add own dm reactions" ON public.dm_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.dm_messages m
    WHERE m.id = dm_message_reactions.message_id
      AND public.is_dm_participant(auth.uid(), m.thread_id)
  ));

CREATE POLICY "users remove own dm reactions" ON public.dm_message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- Mindmap share thread comments
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.mindmap_share_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.mindmap_share_comments TO authenticated;
GRANT ALL ON public.mindmap_share_comments TO service_role;
ALTER TABLE public.mindmap_share_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mindmap comments readable to channel viewers" ON public.mindmap_share_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_messages m
    JOIN public.chat_channels ch ON ch.id = m.channel_id
    WHERE m.id = mindmap_share_comments.message_id
      AND (
        (ch.team_id IS NULL AND ch.group_id IS NULL)
        OR (ch.team_id IS NOT NULL AND public.is_team_member(auth.uid(), ch.team_id))
        OR (ch.group_id IS NOT NULL AND public.is_group_member(auth.uid(), ch.group_id))
      )
  ));

CREATE POLICY "users add own mindmap comments" ON public.mindmap_share_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own mindmap comments" ON public.mindmap_share_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- @mention notifications
-- =========================================================================
CREATE OR REPLACE FUNCTION public.notify_mentions_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  handle text;
  target uuid;
  seen uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NEW.body IS NULL THEN RETURN NEW; END IF;
  FOR handle IN
    SELECT DISTINCT lower(m[1])
    FROM regexp_matches(NEW.body, '@([A-Za-z0-9_]{2,32})', 'g') AS m
  LOOP
    SELECT id INTO target FROM public.profiles WHERE lower(username) = handle LIMIT 1;
    IF target IS NOT NULL AND target <> NEW.user_id AND NOT (target = ANY(seen)) THEN
      seen := array_append(seen, target);
      PERFORM public.notify_user(
        target, 'chat_mention'::notification_type,
        'You were mentioned',
        LEFT(NEW.body, 140),
        '/app/collaborate',
        jsonb_build_object('message_id', NEW.id, 'channel_id', NEW.channel_id)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_mentions_chat ON public.chat_messages;
CREATE TRIGGER trg_notify_mentions_chat
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_mentions_chat();

CREATE OR REPLACE FUNCTION public.notify_mentions_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  handle text;
  target uuid;
  seen uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NEW.body IS NULL THEN RETURN NEW; END IF;
  FOR handle IN
    SELECT DISTINCT lower(m[1])
    FROM regexp_matches(NEW.body, '@([A-Za-z0-9_]{2,32})', 'g') AS m
  LOOP
    SELECT id INTO target FROM public.profiles WHERE lower(username) = handle LIMIT 1;
    IF target IS NOT NULL AND target <> NEW.sender_id AND NOT (target = ANY(seen)) THEN
      seen := array_append(seen, target);
      PERFORM public.notify_user(
        target, 'chat_mention'::notification_type,
        'You were mentioned in a DM',
        LEFT(NEW.body, 140),
        '/app/dm/' || NEW.thread_id::text,
        jsonb_build_object('message_id', NEW.id, 'thread_id', NEW.thread_id)
      );
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_mentions_dm ON public.dm_messages;
CREATE TRIGGER trg_notify_mentions_dm
AFTER INSERT ON public.dm_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_mentions_dm();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mindmap_share_comments;
