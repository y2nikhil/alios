CREATE OR REPLACE FUNCTION public.on_task_completed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done'::task_status AND (OLD.status IS DISTINCT FROM 'done'::task_status) THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
      PERFORM public.notify_user(
        NEW.assigned_to, 'task_completed'::notification_type,
        '🎉 Task completed: ' || NEW.title,
        'Nicely done — task marked complete.',
        '/app/admin',
        jsonb_build_object('task_id', NEW.id)
      );
    END IF;
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