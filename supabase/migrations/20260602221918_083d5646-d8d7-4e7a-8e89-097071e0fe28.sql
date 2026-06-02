
-- Add username column for unique handles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (LOWER(username));

-- Allow admins to view all profiles (for admin dashboard)
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Allow login lookup of username -> we use a SECURITY DEFINER RPC for that
CREATE OR REPLACE FUNCTION public.email_for_username(_username TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE LOWER(p.username) = LOWER(_username)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.email_for_username(TEXT) TO anon, authenticated;

-- Check uniqueness without exposing data
CREATE OR REPLACE FUNCTION public.username_available(_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(_username)
  );
$$;
GRANT EXECUTE ON FUNCTION public.username_available(TEXT) TO anon, authenticated;
