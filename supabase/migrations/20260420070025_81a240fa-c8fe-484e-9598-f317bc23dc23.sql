-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enum for AUX category
CREATE TYPE public.aux_category AS ENUM ('productive', 'neutral', 'unproductive');
CREATE TYPE public.mindmap_node_type AS ENUM ('text', 'image', 'link', 'task');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 300,
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUX STATUSES
CREATE TABLE public.aux_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10b981',
  category public.aux_category NOT NULL DEFAULT 'neutral',
  is_paid BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  shortcut_key TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aux_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own aux" ON public.aux_statuses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_aux_statuses_user ON public.aux_statuses(user_id);
CREATE TRIGGER update_aux_statuses_updated_at BEFORE UPDATE ON public.aux_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUX SESSIONS
CREATE TABLE public.aux_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES public.aux_statuses(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.aux_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.aux_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_sessions_user_started ON public.aux_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_active ON public.aux_sessions(user_id) WHERE ended_at IS NULL;

-- MINDMAP BOARDS
CREATE TABLE public.mindmap_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled board',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mindmap_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own boards" ON public.mindmap_boards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.mindmap_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MINDMAP NODES
CREATE TABLE public.mindmap_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.mindmap_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_type public.mindmap_node_type NOT NULL DEFAULT 'text',
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  color TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mindmap_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own nodes" ON public.mindmap_nodes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_nodes_board ON public.mindmap_nodes(board_id);
CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON public.mindmap_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MINDMAP EDGES
CREATE TABLE public.mindmap_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.mindmap_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.mindmap_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.mindmap_nodes(id) ON DELETE CASCADE,
  source_handle TEXT,
  target_handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mindmap_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own edges" ON public.mindmap_edges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_edges_board ON public.mindmap_edges(board_id);

-- AI INSIGHTS
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 0.7,
  generated_for_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own insights" ON public.ai_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_insights_user_date ON public.ai_insights(user_id, generated_for_date DESC);

-- Auto-create profile + default AUX statuses on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();