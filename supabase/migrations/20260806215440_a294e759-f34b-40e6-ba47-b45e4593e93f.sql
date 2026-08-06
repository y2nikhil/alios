
CREATE OR REPLACE FUNCTION public.public_posts(_limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE (
  id uuid, slug text, title text, body text, media_url text, media_kind text,
  tag text, up_count int, down_count int, comment_count int, created_at timestamptz,
  author_id uuid, author_name text, author_username text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.slug, p.title, p.body, p.media_url, p.media_kind, p.tag,
         p.up_count, p.down_count, p.comment_count, p.created_at,
         p.author_id, pr.display_name, pr.username
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.id = p.author_id
  ORDER BY p.created_at DESC
  LIMIT least(coalesce(_limit, 50), 200) OFFSET greatest(coalesce(_offset, 0), 0)
$$;

CREATE OR REPLACE FUNCTION public.public_post_by_slug(_slug text)
RETURNS TABLE (
  id uuid, slug text, title text, body text, media_url text, media_kind text,
  tag text, up_count int, down_count int, comment_count int, created_at timestamptz,
  author_id uuid, author_name text, author_username text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.slug, p.title, p.body, p.media_url, p.media_kind, p.tag,
         p.up_count, p.down_count, p.comment_count, p.created_at,
         p.author_id, pr.display_name, pr.username
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.id = p.author_id
  WHERE p.slug = _slug
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.public_post_comments(_post_id uuid)
RETURNS TABLE (
  id uuid, post_id uuid, parent_id uuid, body text, up_count int, down_count int,
  created_at timestamptz, author_id uuid, author_name text, author_username text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.post_id, c.parent_id, c.body, c.up_count, c.down_count, c.created_at,
         c.author_id, pr.display_name, pr.username
  FROM public.post_comments c
  LEFT JOIN public.profiles pr ON pr.id = c.author_id
  WHERE c.post_id = _post_id
  ORDER BY c.created_at ASC
  LIMIT 500
$$;

REVOKE ALL ON FUNCTION public.public_posts(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_post_by_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_post_comments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_posts(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_post_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_post_comments(uuid) TO anon, authenticated;
