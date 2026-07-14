
-- Enums
DO $$ BEGIN
  CREATE TYPE public.prep_exam AS ENUM ('cat','jee','neet','railways','ssc_upsc','banking');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prep_time_pref AS ENUM ('morning','afternoon','evening','night');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.prep_stage AS ENUM ('beginner','revision','mock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coaching_status AS ENUM ('self_study','coaching','hybrid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Prep profile table
CREATE TABLE public.user_prep_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exam public.prep_exam NOT NULL,
  attempt_year int NOT NULL,
  exam_date date,
  daily_hours numeric(4,1) NOT NULL DEFAULT 4,
  preferred_time public.prep_time_pref NOT NULL DEFAULT 'evening',
  prep_stage public.prep_stage NOT NULL DEFAULT 'beginner',
  weak_subjects text[] NOT NULL DEFAULT '{}',
  goal text,
  coaching_status public.coaching_status NOT NULL DEFAULT 'self_study',
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prep_profile TO authenticated;
GRANT ALL ON public.user_prep_profile TO service_role;

ALTER TABLE public.user_prep_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prep profile - select" ON public.user_prep_profile
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own prep profile - insert" ON public.user_prep_profile
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prep profile - update" ON public.user_prep_profile
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prep profile - delete" ON public.user_prep_profile
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_prep_profile_updated_at
  BEFORE UPDATE ON public.user_prep_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed exam groups (idempotent)
INSERT INTO public.groups (slug, name, description, topic, emoji, is_public)
VALUES
  ('exam-cat',      'CAT Aspirants',       'Community for CAT / MBA exam prep',            'cat',      '📊', true),
  ('exam-jee',      'JEE Aspirants',       'JEE Main + Advanced community',                 'jee',      '⚙️', true),
  ('exam-neet',     'NEET Aspirants',      'NEET UG medical entrance community',            'neet',     '🩺', true),
  ('exam-railways', 'Railways Aspirants',  'RRB NTPC / Group D / JE community',             'railways', '🚆', true),
  ('exam-ssc-upsc', 'SSC & UPSC Aspirants','Government exam community: SSC, UPSC, state',   'ssc_upsc', '🏛️', true),
  ('exam-banking',  'Banking Aspirants',   'IBPS, SBI PO/Clerk, RBI community',             'banking',  '🏦', true)
ON CONFLICT (slug) DO NOTHING;
