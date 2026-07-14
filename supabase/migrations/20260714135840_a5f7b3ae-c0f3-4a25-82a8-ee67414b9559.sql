
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Locked-down settings table (no policies = only service_role via GRANT)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Trigger: on new notification, POST to dispatch endpoint via pg_net.
CREATE OR REPLACE FUNCTION public.dispatch_notification_push()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _secret text;
  _url text;
BEGIN
  SELECT value INTO _secret FROM public.app_settings WHERE key = 'push_dispatch_secret';
  SELECT value INTO _url FROM public.app_settings WHERE key = 'push_dispatch_url';
  IF _secret IS NULL OR _url IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatch-secret', _secret
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispatch_notification_push ON public.notifications;
CREATE TRIGGER trg_dispatch_notification_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_notification_push();
