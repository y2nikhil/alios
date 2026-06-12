
-- 1) Privacy column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timeline_visibility text NOT NULL DEFAULT 'public'
  CHECK (timeline_visibility IN ('public','friends','private'));

ALTER TABLE public.profiles ALTER COLUMN timeline_public SET DEFAULT true;
UPDATE public.profiles SET timeline_public = true WHERE timeline_public = false;

-- 2) Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT friendships_distinct CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON public.friendships(requester_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Request friendship" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Accept friendship" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id) WITH CHECK (auth.uid() = addressee_id);
CREATE POLICY "Remove friendship" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 3) Helper
CREATE OR REPLACE FUNCTION public.are_friends(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  );
$$;

-- 4) Profiles visibility policy
DROP POLICY IF EXISTS "View public profiles" ON public.profiles;
CREATE POLICY "View public profiles" ON public.profiles FOR SELECT
  USING (
    timeline_visibility = 'public'
    OR auth.uid() = id
    OR public.has_role(auth.uid(),'super_admin')
    OR (timeline_visibility = 'friends' AND public.are_friends(auth.uid(), id))
  );

-- 5) Aux sessions visibility policy
DROP POLICY IF EXISTS "View public aux sessions" ON public.aux_sessions;
CREATE POLICY "View public aux sessions" ON public.aux_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = aux_sessions.user_id
        AND (
          p.timeline_visibility = 'public'
          OR (p.timeline_visibility = 'friends' AND public.are_friends(auth.uid(), p.id))
        )
    )
  );
