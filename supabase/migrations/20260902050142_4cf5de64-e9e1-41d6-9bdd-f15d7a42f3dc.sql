CREATE OR REPLACE FUNCTION public.purge_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activity_events WHERE created_at < now() - interval '24 hours';
  DELETE FROM public.focus_milestone_events WHERE created_at < now() - interval '7 days';
  DELETE FROM public.aux_sessions WHERE started_at < now() - interval '7 days';
  DELETE FROM public.college_gen_runs WHERE started_at < now() - interval '7 days';
  DELETE FROM public.college_queue;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_data() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('purge-old-data', '15 3 * * *', $cron$ SELECT public.purge_old_data(); $cron$);