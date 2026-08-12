ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_presence()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.touch_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;

CREATE OR REPLACE FUNCTION public.public_presence(_ids uuid[])
RETURNS TABLE(id uuid, online boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, (p.last_seen_at IS NOT NULL AND p.last_seen_at > now() - interval '3 minutes')
  FROM public.profiles p WHERE p.id = ANY(_ids);
$$;
REVOKE ALL ON FUNCTION public.public_presence(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_presence(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_user_profile(_username text)
RETURNS TABLE(
  id uuid, username text, display_name text, avatar_icon text, avatar_gradient text,
  created_at timestamptz, online boolean,
  post_count bigint, comment_count bigint, post_karma bigint, comment_karma bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_icon, p.avatar_gradient, p.created_at,
    (p.last_seen_at IS NOT NULL AND p.last_seen_at > now() - interval '3 minutes'),
    (SELECT count(*) FROM public.posts po WHERE po.author_id = p.id),
    (SELECT count(*) FROM public.post_comments c WHERE c.author_id = p.id),
    COALESCE((SELECT sum(po.up_count - po.down_count) FROM public.posts po WHERE po.author_id = p.id), 0),
    COALESCE((SELECT sum(c.up_count - c.down_count) FROM public.post_comments c WHERE c.author_id = p.id), 0)
  FROM public.profiles p
  WHERE lower(p.username) = lower(_username)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.public_user_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_user_profile(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_user_posts(_user uuid, _limit integer DEFAULT 30)
RETURNS TABLE(
  id uuid, slug text, title text, body text, media_url text, media_kind text, tag text,
  up_count integer, down_count integer, comment_count integer, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT po.id, po.slug, po.title, po.body, po.media_url, po.media_kind, po.tag,
         po.up_count, po.down_count, po.comment_count, po.created_at
  FROM public.posts po
  WHERE po.author_id = _user
  ORDER BY po.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 30), 100);
$$;
REVOKE ALL ON FUNCTION public.public_user_posts(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_user_posts(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_user_comments(_user uuid, _limit integer DEFAULT 30)
RETURNS TABLE(
  id uuid, post_id uuid, post_slug text, post_title text, body text,
  up_count integer, down_count integer, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.post_id, po.slug, po.title, c.body, c.up_count, c.down_count, c.created_at
  FROM public.post_comments c
  JOIN public.posts po ON po.id = c.post_id
  WHERE c.author_id = _user
  ORDER BY c.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 30), 100);
$$;
REVOKE ALL ON FUNCTION public.public_user_comments(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_user_comments(uuid, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_usernames(_limit integer DEFAULT 1000)
RETURNS TABLE(username text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.username FROM public.profiles p
  WHERE p.username IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 1000), 5000);
$$;
REVOKE ALL ON FUNCTION public.public_usernames(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_usernames(integer) TO anon, authenticated;