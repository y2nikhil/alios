
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'member');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer: get email by user id (for super_admin bootstrap & display)
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id
$$;

-- RLS for user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admin manages all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ AUTO-BOOTSTRAP SUPER ADMIN ============
-- Update handle_new_user to grant super_admin if email matches
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.aux_statuses (user_id, name, color, category, is_paid, sort_order, shortcut_key, is_default) VALUES
    (NEW.id, 'Available',  '#10b981', 'productive',   true,  1, '1', true),
    (NEW.id, 'Deep Work',  '#8b5cf6', 'productive',   true,  2, '2', true),
    (NEW.id, 'Meeting',    '#3b82f6', 'productive',   true,  3, '3', true),
    (NEW.id, 'Break',      '#f59e0b', 'neutral',      true,  4, '4', true),
    (NEW.id, 'Lunch',      '#fb923c', 'neutral',      true,  5, '5', true),
    (NEW.id, 'Away',       '#94a3b8', 'neutral',      false, 6, '6', true),
    (NEW.id, 'Busy',       '#ef4444', 'unproductive', true,  7, '7', true),
    (NEW.id, 'Idle',       '#64748b', 'unproductive', false, 8, '8', true);

  -- Grant role: super_admin if matches the bootstrap email, else member
  IF lower(NEW.email) = 'n6nikhil@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: if n6nikhil@gmail.com already exists, grant super_admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users WHERE lower(email) = 'n6nikhil@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Backfill member role for all existing users without any role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'member'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT DO NOTHING;

-- ============ ADMIN REQUESTS (apply to become admin/client) ============
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  status request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requests" ON public.admin_requests
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users create own requests" ON public.admin_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin updates requests" ON public.admin_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users delete own pending requests" ON public.admin_requests
  FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

CREATE TRIGGER admin_requests_updated_at
  BEFORE UPDATE ON public.admin_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TEAMS ============
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  status text NOT NULL DEFAULT 'active', -- 'active' | 'pending'
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id),
  UNIQUE (team_id, invited_email),
  CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Security definer: is user member of team?
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id AND status = 'active'
  )
$$;

-- Teams RLS
CREATE POLICY "Super admin sees all teams" ON public.teams
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owners see their teams" ON public.teams
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Members see their teams" ON public.teams
  FOR SELECT USING (public.is_team_member(auth.uid(), id));
CREATE POLICY "Admins create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "Owners update teams" ON public.teams
  FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owners delete teams" ON public.teams
  FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Team members RLS
CREATE POLICY "Super admin manages all team members" ON public.team_members
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Team owner manages members" ON public.team_members
  FOR ALL USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));
CREATE POLICY "Members view own team membership" ON public.team_members
  FOR SELECT USING (auth.uid() = user_id);

-- ============ SCHEDULES ============
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,  -- null = applies to whole team
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  required_status_category aux_category NOT NULL DEFAULT 'productive',
  break_minutes integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manages all schedules" ON public.schedules
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Team owner manages schedules" ON public.schedules
  FOR ALL USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));
CREATE POLICY "Members view own schedules" ON public.schedules
  FOR SELECT USING (auth.uid() = user_id OR public.is_team_member(auth.uid(), team_id));

CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TASKS ============
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_at timestamptz,
  status task_status NOT NULL DEFAULT 'todo',
  priority smallint NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manages all tasks" ON public.tasks
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Assignee views and updates own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = assigned_to);
CREATE POLICY "Assignee updates own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = assigned_to);
CREATE POLICY "Team owner manages team tasks" ON public.tasks
  FOR ALL USING (team_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (team_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TIME OFF REQUESTS ============
CREATE TABLE public.time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own time off" ON public.time_off_requests
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own time off" ON public.time_off_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update time off" ON public.time_off_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own pending time off" ON public.time_off_requests
  FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

CREATE TRIGGER time_off_updated_at
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DAILY ADHERENCE (cached score) ============
CREATE TABLE public.daily_adherence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  for_date date NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  scheduled_minutes integer NOT NULL DEFAULT 0,
  worked_minutes integer NOT NULL DEFAULT 0,
  break_overrun_minutes integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, for_date)
);

ALTER TABLE public.daily_adherence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own adherence" ON public.daily_adherence
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own adherence" ON public.daily_adherence
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own adherence" ON public.daily_adherence
  FOR UPDATE USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.aux_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
