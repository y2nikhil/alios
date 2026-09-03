-- 1) Stop anonymous/authenticated clients from resolving a username to a real email.
REVOKE EXECUTE ON FUNCTION public.email_for_username(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_for_username(text) TO service_role;

-- 2) Mask emails for callers who are not the owner, an admin, or a super admin.
CREATE OR REPLACE FUNCTION public.mask_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _email IS NULL OR position('@' in _email) = 0 THEN NULL
    ELSE left(split_part(_email, '@', 1), 1) || '***@' || split_part(_email, '@', 2)
  END
$$;
GRANT EXECUTE ON FUNCTION public.mask_email(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN auth.uid() = _user_id
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      THEN u.email
    ELSE public.mask_email(u.email)
  END
  FROM auth.users u
  WHERE u.id = _user_id
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated, service_role;

-- 3) Exact-email lookup stays authenticated-only and never returns an email.
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated, service_role;