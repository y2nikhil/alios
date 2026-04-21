
-- =========================================================================
-- 1. ENUMS
-- =========================================================================

-- Add new task statuses
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'overdue';

-- Task type enum
DO $$ BEGIN
  CREATE TYPE public.task_type AS ENUM ('standard', 'youtube_checklist');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Notification types
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'task_assigned','task_status_changed','task_comment',
    'note_assigned','note_comment',
    'mindmap_shared','chat_mention',
    'request_approved','request_rejected',
    'role_granted','role_revoked','account_revoked'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Mindmap collaborator role
DO $$ BEGIN
  CREATE TYPE public.collab_role AS ENUM ('viewer','editor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========================================================================
-- 2. COLUMN ADDITIONS
-- =========================================================================

ALTER TABLE public.manager_notes
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

-- recipient_id may be null when team-wide
ALTER TABLE public.manager_notes ALTER COLUMN recipient_id DROP NOT NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type public.task_type NOT NULL DEFAULT 'standard';

-- =========================================================================
-- 3. ACCOUNT EVENTS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.account_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin views account events" ON public.account_events;
CREATE POLICY "Super admin views account events"
  ON public.account_events FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Signup trigger: extends handle_new_user behavior; we add a separate trigger
CREATE OR REPLACE FUNCTION public.log_signup_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.account_events (user_id, email, event_type, metadata)
  VALUES (NEW.id, NEW.email, 'signup', jsonb_build_object('provider', COALESCE(NEW.raw_app_meta_data->>'provider','email')));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_signup_event ON auth.users;
CREATE TRIGGER on_auth_user_signup_event
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.log_signup_event();

-- Backfill existing accounts so super admin sees them immediately
INSERT INTO public.account_events (user_id, email, event_type, metadata, created_at)
SELECT u.id, u.email, 'signup', jsonb_build_object('backfilled', true), u.created_at
FROM auth.users u
LEFT JOIN public.account_events ae ON ae.user_id = u.id AND ae.event_type = 'signup'
WHERE ae.id IS NULL;

-- =========================================================================
-- 4. AUDIT LOG
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_user_id uuid,
  target_id uuid,
  target_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin views audit log" ON public.audit_log;
CREATE POLICY "Super admin views audit log"
  ON public.audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admin views own actions" ON public.audit_log;
CREATE POLICY "Admin views own actions"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = actor_id);

DROP POLICY IF EXISTS "Authenticated insert audit" ON public.audit_log;
CREATE POLICY "Authenticated insert audit"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() = actor_id);

CREATE OR REPLACE FUNCTION public.write_audit(
  _action text,
  _target_user uuid DEFAULT NULL,
  _target_id uuid DEFAULT NULL,
  _target_type text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.audit_log (actor_id, action, target_user_id, target_id, target_type, metadata)
  VALUES (auth.uid(), _action, _target_user, _target_id, _target_type, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- =========================================================================
-- 5. NOTIFICATIONS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid,
  _type public.notification_type,
  _title text,
  _body text DEFAULT NULL,
  _link text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link, metadata)
  VALUES (_user_id, _type, _title, _body, _link, _metadata)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- =========================================================================
-- 6. NOTE COMMENTS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.note_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.manager_notes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_note_comments_note ON public.note_comments(note_id, created_at);

ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View comments on visible notes" ON public.note_comments;
CREATE POLICY "View comments on visible notes"
  ON public.note_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.manager_notes mn
      WHERE mn.id = note_id
      AND (
        mn.author_id = auth.uid()
        OR mn.recipient_id = auth.uid()
        OR (mn.team_id IS NOT NULL AND public.is_team_member(auth.uid(), mn.team_id))
        OR public.has_role(auth.uid(),'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Insert comments on visible notes" ON public.note_comments;
CREATE POLICY "Insert comments on visible notes"
  ON public.note_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.manager_notes mn
      WHERE mn.id = note_id
      AND (
        mn.author_id = auth.uid()
        OR mn.recipient_id = auth.uid()
        OR (mn.team_id IS NOT NULL AND public.is_team_member(auth.uid(), mn.team_id))
      )
    )
  );

DROP POLICY IF EXISTS "Author deletes own comment" ON public.note_comments;
CREATE POLICY "Author deletes own comment"
  ON public.note_comments FOR DELETE
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'super_admin'));

-- Update manager_notes RLS to support team-wide visibility
DROP POLICY IF EXISTS "Users view notes they author or receive" ON public.manager_notes;
CREATE POLICY "Users view assigned or team notes"
  ON public.manager_notes FOR SELECT
  USING (
    auth.uid() = author_id
    OR auth.uid() = recipient_id
    OR (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id))
    OR public.has_role(auth.uid(),'super_admin')
  );

-- =========================================================================
-- 7. TASK COMMENTS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id, created_at);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View comments on visible tasks" ON public.task_comments;
CREATE POLICY "View comments on visible tasks"
  ON public.task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (
        t.assigned_to = auth.uid()
        OR t.assigned_by = auth.uid()
        OR (t.team_id IS NOT NULL AND public.is_team_member(auth.uid(), t.team_id))
        OR public.has_role(auth.uid(),'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Insert comments on visible tasks" ON public.task_comments;
CREATE POLICY "Insert comments on visible tasks"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (
        t.assigned_to = auth.uid()
        OR t.assigned_by = auth.uid()
        OR (t.team_id IS NOT NULL AND public.is_team_member(auth.uid(), t.team_id))
      )
    )
  );

DROP POLICY IF EXISTS "Author deletes own task comment" ON public.task_comments;
CREATE POLICY "Author deletes own task comment"
  ON public.task_comments FOR DELETE
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'super_admin'));

-- Allow users to create tasks for themselves (self-assignment)
DROP POLICY IF EXISTS "User creates self task" ON public.tasks;
CREATE POLICY "User creates self task"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = assigned_by AND auth.uid() = assigned_to);

-- =========================================================================
-- 8. TASK VIDEOS + PROGRESS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.task_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text,
  thumbnail text,
  duration_seconds integer,
  order_index integer NOT NULL DEFAULT 0,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_videos_task ON public.task_videos(task_id, order_index);

ALTER TABLE public.task_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View videos on visible tasks" ON public.task_videos;
CREATE POLICY "View videos on visible tasks"
  ON public.task_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (
        t.assigned_to = auth.uid()
        OR t.assigned_by = auth.uid()
        OR (t.team_id IS NOT NULL AND public.is_team_member(auth.uid(), t.team_id))
        OR public.has_role(auth.uid(),'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Add videos to own/owned tasks" ON public.task_videos;
CREATE POLICY "Add videos to own/owned tasks"
  ON public.task_videos FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.assigned_by = auth.uid() OR t.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Delete videos on own/owned tasks" ON public.task_videos;
CREATE POLICY "Delete videos on own/owned tasks"
  ON public.task_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
      AND (t.assigned_by = auth.uid() OR t.assigned_to = auth.uid())
    ) OR public.has_role(auth.uid(),'super_admin')
  );

CREATE TABLE IF NOT EXISTS public.task_video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_row_id uuid NOT NULL REFERENCES public.task_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  watched_seconds integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_row_id, user_id)
);

ALTER TABLE public.task_video_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own video progress" ON public.task_video_progress;
CREATE POLICY "Users manage own video progress"
  ON public.task_video_progress FOR ALL
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 9. CHAT
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, name)
);
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view team channels" ON public.chat_channels;
CREATE POLICY "Members view team channels"
  ON public.chat_channels FOR SELECT
  USING (
    public.is_team_member(auth.uid(), team_id)
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid())
    OR public.has_role(auth.uid(),'super_admin')
  );

DROP POLICY IF EXISTS "Team owner manages channels" ON public.chat_channels;
CREATE POLICY "Team owner manages channels"
  ON public.chat_channels FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid())
    OR public.has_role(auth.uid(),'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid())
    OR public.has_role(auth.uid(),'super_admin')
  );

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view channel messages" ON public.chat_messages;
CREATE POLICY "Members view channel messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = channel_id
      AND (
        public.is_team_member(auth.uid(), c.team_id)
        OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = c.team_id AND t.owner_id = auth.uid())
        OR public.has_role(auth.uid(),'super_admin')
      )
    )
  );

DROP POLICY IF EXISTS "Members send channel messages" ON public.chat_messages;
CREATE POLICY "Members send channel messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = channel_id
      AND (
        public.is_team_member(auth.uid(), c.team_id)
        OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = c.team_id AND t.owner_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Authors delete own messages" ON public.chat_messages;
CREATE POLICY "Authors delete own messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'));

-- Auto-create a default channel when a team is created
CREATE OR REPLACE FUNCTION public.create_default_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_channels (team_id, name) VALUES (NEW.id, 'general');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_team_created_channel ON public.teams;
CREATE TRIGGER on_team_created_channel
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.create_default_channel();

-- Backfill channels for existing teams
INSERT INTO public.chat_channels (team_id, name)
SELECT t.id, 'general' FROM public.teams t
LEFT JOIN public.chat_channels c ON c.team_id = t.id AND c.name = 'general'
WHERE c.id IS NULL;

-- =========================================================================
-- 10. MIND MAP COLLABORATORS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.mindmap_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.mindmap_boards(id) ON DELETE CASCADE,
  user_id uuid,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  role public.collab_role NOT NULL DEFAULT 'viewer',
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR team_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_mmc_board ON public.mindmap_collaborators(board_id);
CREATE INDEX IF NOT EXISTS idx_mmc_user ON public.mindmap_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_mmc_team ON public.mindmap_collaborators(team_id);

ALTER TABLE public.mindmap_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View collaborators of accessible boards" ON public.mindmap_collaborators;
CREATE POLICY "View collaborators of accessible boards"
  ON public.mindmap_collaborators FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.mindmap_boards b WHERE b.id = board_id AND b.user_id = auth.uid())
    OR user_id = auth.uid()
    OR (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id))
    OR public.has_role(auth.uid(),'super_admin')
  );

DROP POLICY IF EXISTS "Owner manages collaborators" ON public.mindmap_collaborators;
CREATE POLICY "Owner manages collaborators"
  ON public.mindmap_collaborators FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.mindmap_boards b WHERE b.id = board_id AND b.user_id = auth.uid())
    OR public.has_role(auth.uid(),'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.mindmap_boards b WHERE b.id = board_id AND b.user_id = auth.uid())
    OR public.has_role(auth.uid(),'super_admin')
  );

-- Helper to check board access
CREATE OR REPLACE FUNCTION public.can_view_board(_user uuid, _board uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mindmap_boards b WHERE b.id = _board AND b.user_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.mindmap_collaborators mc
    WHERE mc.board_id = _board
    AND (mc.user_id = _user OR (mc.team_id IS NOT NULL AND public.is_team_member(_user, mc.team_id)))
  ) OR public.has_role(_user,'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.can_edit_board(_user uuid, _board uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mindmap_boards b WHERE b.id = _board AND b.user_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.mindmap_collaborators mc
    WHERE mc.board_id = _board
    AND mc.role = 'editor'
    AND (mc.user_id = _user OR (mc.team_id IS NOT NULL AND public.is_team_member(_user, mc.team_id)))
  ) OR public.has_role(_user,'super_admin');
$$;

-- Update mindmap RLS to use the new helpers
DROP POLICY IF EXISTS "Users manage own boards" ON public.mindmap_boards;

CREATE POLICY "View accessible boards"
  ON public.mindmap_boards FOR SELECT
  USING (public.can_view_board(auth.uid(), id));

CREATE POLICY "Owner manages boards"
  ON public.mindmap_boards FOR ALL
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Users manage own nodes" ON public.mindmap_nodes;
CREATE POLICY "View nodes of accessible boards"
  ON public.mindmap_nodes FOR SELECT
  USING (public.can_view_board(auth.uid(), board_id));

CREATE POLICY "Edit nodes of editable boards"
  ON public.mindmap_nodes FOR INSERT
  WITH CHECK (public.can_edit_board(auth.uid(), board_id) AND auth.uid() = user_id);

CREATE POLICY "Update nodes of editable boards"
  ON public.mindmap_nodes FOR UPDATE
  USING (public.can_edit_board(auth.uid(), board_id));

CREATE POLICY "Delete nodes of editable boards"
  ON public.mindmap_nodes FOR DELETE
  USING (public.can_edit_board(auth.uid(), board_id));

DROP POLICY IF EXISTS "Users manage own edges" ON public.mindmap_edges;
CREATE POLICY "View edges of accessible boards"
  ON public.mindmap_edges FOR SELECT
  USING (public.can_view_board(auth.uid(), board_id));

CREATE POLICY "Edit edges of editable boards"
  ON public.mindmap_edges FOR INSERT
  WITH CHECK (public.can_edit_board(auth.uid(), board_id) AND auth.uid() = user_id);

CREATE POLICY "Update edges of editable boards"
  ON public.mindmap_edges FOR UPDATE
  USING (public.can_edit_board(auth.uid(), board_id));

CREATE POLICY "Delete edges of editable boards"
  ON public.mindmap_edges FOR DELETE
  USING (public.can_edit_board(auth.uid(), board_id));

-- =========================================================================
-- 11. NOTIFICATION TRIGGERS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.on_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> NEW.assigned_by THEN
    PERFORM public.notify_user(
      NEW.assigned_to, 'task_assigned',
      'New task: ' || NEW.title,
      NEW.description,
      '/app/admin',
      jsonb_build_object('task_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_assigned ON public.tasks;
CREATE TRIGGER trg_task_assigned
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.on_task_assigned();

CREATE OR REPLACE FUNCTION public.on_task_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> OLD.status AND NEW.assigned_by IS NOT NULL AND NEW.assigned_by <> auth.uid() THEN
    PERFORM public.notify_user(
      NEW.assigned_by, 'task_status_changed',
      'Task updated: ' || NEW.title,
      'Status changed to ' || NEW.status,
      '/app/admin',
      jsonb_build_object('task_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_status_changed ON public.tasks;
CREATE TRIGGER trg_task_status_changed
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.on_task_status_changed();

CREATE OR REPLACE FUNCTION public.on_note_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.recipient_id IS NOT NULL AND NEW.recipient_id <> NEW.author_id THEN
    PERFORM public.notify_user(
      NEW.recipient_id, 'note_assigned',
      'New manager note',
      LEFT(NEW.body, 140),
      '/app',
      jsonb_build_object('note_id', NEW.id)
    );
  ELSIF NEW.team_id IS NOT NULL THEN
    -- notify all team members except author
    INSERT INTO public.notifications(user_id, type, title, body, link, metadata)
    SELECT tm.user_id, 'note_assigned', 'New team note', LEFT(NEW.body,140), '/app',
           jsonb_build_object('note_id', NEW.id)
    FROM public.team_members tm
    WHERE tm.team_id = NEW.team_id AND tm.status = 'active'
      AND tm.user_id IS NOT NULL AND tm.user_id <> NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_note_assigned ON public.manager_notes;
CREATE TRIGGER trg_note_assigned
  AFTER INSERT ON public.manager_notes
  FOR EACH ROW EXECUTE FUNCTION public.on_note_assigned();

CREATE OR REPLACE FUNCTION public.on_mindmap_shared()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_title text;
BEGIN
  SELECT title INTO _board_title FROM public.mindmap_boards WHERE id = NEW.board_id;
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.notify_user(
      NEW.user_id, 'mindmap_shared',
      'Mind map shared with you',
      _board_title,
      '/app/mindmap/' || NEW.board_id::text,
      jsonb_build_object('board_id', NEW.board_id, 'role', NEW.role)
    );
  ELSIF NEW.team_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link, metadata)
    SELECT tm.user_id, 'mindmap_shared', 'Mind map shared with your team', _board_title,
           '/app/mindmap/' || NEW.board_id::text,
           jsonb_build_object('board_id', NEW.board_id, 'role', NEW.role)
    FROM public.team_members tm
    WHERE tm.team_id = NEW.team_id AND tm.status='active' AND tm.user_id IS NOT NULL
      AND tm.user_id <> NEW.added_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mindmap_shared ON public.mindmap_collaborators;
CREATE TRIGGER trg_mindmap_shared
  AFTER INSERT ON public.mindmap_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.on_mindmap_shared();

-- =========================================================================
-- 12. SUPER-ADMIN OVERSIGHT POLICIES (read-all)
-- =========================================================================

DROP POLICY IF EXISTS "Super admin views all teams 2" ON public.teams;
DROP POLICY IF EXISTS "Super admin views all team members" ON public.team_members;
CREATE POLICY "Super admin views all team members"
  ON public.team_members FOR SELECT
  USING (public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Super admin views all tasks 2" ON public.tasks;
CREATE POLICY "Super admin views all tasks"
  ON public.tasks FOR SELECT
  USING (public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Super admin views all notes" ON public.manager_notes;
CREATE POLICY "Super admin views all notes"
  ON public.manager_notes FOR SELECT
  USING (public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Super admin views all aux sessions" ON public.aux_sessions;
CREATE POLICY "Super admin views all aux sessions"
  ON public.aux_sessions FOR SELECT
  USING (public.has_role(auth.uid(),'super_admin'));

-- =========================================================================
-- 13. REVOKE ACCOUNT RPC
-- =========================================================================

CREATE OR REPLACE FUNCTION public.revoke_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Only super admin can revoke accounts';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own account';
  END IF;
  UPDATE auth.users SET banned_until = 'infinity'::timestamptz WHERE id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  PERFORM public.write_audit('account_revoked', _user_id, _user_id, 'account', '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN
    RAISE EXCEPTION 'Only super admin can restore accounts';
  END IF;
  UPDATE auth.users SET banned_until = NULL WHERE id = _user_id;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, 'member')
    ON CONFLICT DO NOTHING;
  PERFORM public.write_audit('account_restored', _user_id, _user_id, 'account', '{}'::jsonb);
END;
$$;

-- =========================================================================
-- 14. REALTIME PUBLICATIONS
-- =========================================================================

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.mindmap_nodes REPLICA IDENTITY FULL;
ALTER TABLE public.mindmap_edges REPLICA IDENTITY FULL;
ALTER TABLE public.account_events REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mindmap_nodes;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mindmap_edges;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.account_events;
EXCEPTION WHEN duplicate_object THEN null; END $$;
