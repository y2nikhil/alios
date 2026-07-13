
-- Profile theming
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_icon text,
  ADD COLUMN IF NOT EXISTS avatar_gradient text NOT NULL DEFAULT 'violet',
  ADD COLUMN IF NOT EXISTS theme_accent text NOT NULL DEFAULT 'violet';

-- Awards catalog
CREATE TABLE IF NOT EXISTS public.awards (
  code             text PRIMARY KEY,
  title            text NOT NULL,
  description      text NOT NULL,
  icon             text NOT NULL,        -- lucide icon name
  tier             text NOT NULL,        -- bronze/silver/gold/platinum/legendary
  threshold_hours  numeric,              -- for time-based awards
  category         text NOT NULL         -- 'hours' | 'streak' | 'social'
);

GRANT SELECT ON public.awards TO anon, authenticated;
GRANT ALL ON public.awards TO service_role;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view awards" ON public.awards FOR SELECT TO anon, authenticated USING (true);

-- User awards
CREATE TABLE IF NOT EXISTS public.user_awards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  award_code  text NOT NULL REFERENCES public.awards(code) ON DELETE CASCADE,
  earned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, award_code)
);

GRANT SELECT ON public.user_awards TO authenticated;
GRANT ALL ON public.user_awards TO service_role;
ALTER TABLE public.user_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can view unlocked awards"
  ON public.user_awards FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS user_awards_user_idx ON public.user_awards (user_id);

-- Seed catalog
INSERT INTO public.awards (code, title, description, icon, tier, threshold_hours, category) VALUES
  ('hours_10',   'First Ten',       'Logged 10 productive hours',     'Sparkles', 'bronze',   10,   'hours'),
  ('hours_25',   'Quarter Century', '25 productive hours',            'Award',    'bronze',   25,   'hours'),
  ('hours_50',   'Half Ton',        '50 productive hours',            'Medal',    'silver',   50,   'hours'),
  ('hours_100',  'Century Club',    '100 productive hours',           'Trophy',   'gold',     100,  'hours'),
  ('hours_250',  'Deep Diver',      '250 productive hours',           'Trophy',   'gold',     250,  'hours'),
  ('hours_500',  'Marathon',        '500 productive hours',           'Crown',    'platinum', 500,  'hours'),
  ('hours_1000', 'Titan',           '1000 productive hours',          'Crown',    'legendary',1000, 'hours'),
  ('streak_3',   'Getting Warmed Up','3 days in a row punched in',    'Flame',    'bronze',   NULL, 'streak'),
  ('streak_7',   'On Fire',         '7-day punch-in streak',          'Flame',    'silver',   NULL, 'streak'),
  ('streak_30',  'Unstoppable',     '30-day punch-in streak',         'Zap',      'gold',     NULL, 'streak'),
  ('social_friend', 'Made a Friend', 'Added your first friend',       'UserPlus', 'bronze',   NULL, 'social'),
  ('social_dm',    'Ice Breaker',   'Sent your first DM',             'MessageCircle','bronze',NULL,'social')
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description,
  icon = EXCLUDED.icon, tier = EXCLUDED.tier,
  threshold_hours = EXCLUDED.threshold_hours, category = EXCLUDED.category;

-- Function: grant hour-based awards up to the user's current productive total
CREATE OR REPLACE FUNCTION public.check_hour_awards(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _hours numeric;
BEGIN
  SELECT COALESCE(SUM(s.duration_seconds), 0) / 3600.0
    INTO _hours
    FROM public.aux_sessions s
    JOIN public.aux_statuses st ON st.id = s.status_id
   WHERE s.user_id = _user
     AND st.category = 'productive'
     AND s.ended_at IS NOT NULL;

  INSERT INTO public.user_awards (user_id, award_code)
  SELECT _user, a.code
    FROM public.awards a
   WHERE a.category = 'hours'
     AND a.threshold_hours IS NOT NULL
     AND _hours >= a.threshold_hours
  ON CONFLICT DO NOTHING;
END $$;

REVOKE ALL ON FUNCTION public.check_hour_awards(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.check_hour_awards(uuid) TO authenticated;

-- Trigger: when a session ends, check awards for that user
CREATE OR REPLACE FUNCTION public.on_aux_session_ended()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at IS DISTINCT FROM NEW.ended_at) THEN
    PERFORM public.check_hour_awards(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS aux_session_awards ON public.aux_sessions;
CREATE TRIGGER aux_session_awards AFTER UPDATE ON public.aux_sessions
  FOR EACH ROW EXECUTE FUNCTION public.on_aux_session_ended();

-- Backfill existing users' hour awards
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.aux_sessions WHERE ended_at IS NOT NULL LOOP
    PERFORM public.check_hour_awards(r.user_id);
  END LOOP;
END $$;
