CREATE TABLE public.college_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  exam_track text NOT NULL DEFAULT 'other',
  priority integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  post_id uuid,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX college_queue_name_key ON public.college_queue (lower(name));
CREATE INDEX college_queue_pick_idx ON public.college_queue (status, priority, created_at);

CREATE TABLE public.college_gen_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  requested integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  detail jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text
);
CREATE INDEX college_gen_runs_recent_idx ON public.college_gen_runs (started_at DESC);

CREATE TABLE public.college_pipeline_state (
  id integer PRIMARY KEY DEFAULT 1,
  daily_limit integer NOT NULL DEFAULT 5,
  paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  lock_until timestamptz,
  last_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT college_pipeline_state_singleton CHECK (id = 1)
);
INSERT INTO public.college_pipeline_state (id) VALUES (1);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.college_queue TO authenticated;
GRANT ALL ON public.college_queue TO service_role;
GRANT SELECT ON public.college_gen_runs TO authenticated;
GRANT ALL ON public.college_gen_runs TO service_role;
GRANT SELECT, UPDATE ON public.college_pipeline_state TO authenticated;
GRANT ALL ON public.college_pipeline_state TO service_role;

ALTER TABLE public.college_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_gen_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_pipeline_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage college queue" ON public.college_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins read college runs" ON public.college_gen_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins read pipeline state" ON public.college_pipeline_state
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins update pipeline state" ON public.college_pipeline_state
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER college_queue_touch BEFORE UPDATE ON public.college_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();