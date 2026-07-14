
-- 1) Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subs"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Notification prefs on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT jsonb_build_object(
    'sound', 'chime',
    'focus_milestone', true,
    'task_completed', true,
    'moderation_alert', true,
    'chat_mention', true,
    'push_enabled', true
  );

-- 3) Focus milestone dedup
CREATE TABLE IF NOT EXISTS public.focus_milestone_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  milestone_minutes int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, milestone_minutes)
);
GRANT SELECT, INSERT ON public.focus_milestone_events TO authenticated;
GRANT ALL ON public.focus_milestone_events TO service_role;
ALTER TABLE public.focus_milestone_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own milestones read" ON public.focus_milestone_events FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "own milestones insert" ON public.focus_milestone_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4) Report trigger — notify all admins/super_admins on new report
CREATE OR REPLACE FUNCTION public.on_report_created()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link, metadata)
  SELECT ur.user_id, 'moderation_alert'::notification_type,
         'New report — ' || NEW.reason::text,
         COALESCE(LEFT(NEW.details, 140), 'A user reported content that needs review'),
         '/app/moderation',
         jsonb_build_object('report_id', NEW.id, 'target_type', NEW.target_type, 'target_id', NEW.target_id)
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','super_admin')
    AND ur.user_id <> NEW.reporter_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_on_report_created ON public.reports;
CREATE TRIGGER trg_on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.on_report_created();

-- 5) Task completed trigger
CREATE OR REPLACE FUNCTION public.on_task_completed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Notify assignee (if different from actor)
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
      PERFORM public.notify_user(
        NEW.assigned_to, 'task_completed'::notification_type,
        '🎉 Task completed: ' || NEW.title,
        'Nicely done — task marked complete.',
        '/app/admin',
        jsonb_build_object('task_id', NEW.id)
      );
    END IF;
    -- Notify assigner (if different)
    IF NEW.assigned_by IS NOT NULL AND NEW.assigned_by <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
       AND NEW.assigned_by <> NEW.assigned_to THEN
      PERFORM public.notify_user(
        NEW.assigned_by, 'task_completed'::notification_type,
        '✅ Task completed: ' || NEW.title,
        'The task you assigned is done.',
        '/app/admin',
        jsonb_build_object('task_id', NEW.id)
      );
    END IF;
    -- Self-celebration
    IF COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) IN (NEW.assigned_to, NEW.assigned_by) THEN
      PERFORM public.notify_user(
        auth.uid(), 'task_completed'::notification_type,
        '🎉 Task complete: ' || NEW.title,
        'Hurray — one more off the list!',
        '/app/admin',
        jsonb_build_object('task_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_on_task_completed ON public.tasks;
CREATE TRIGGER trg_on_task_completed
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.on_task_completed();
