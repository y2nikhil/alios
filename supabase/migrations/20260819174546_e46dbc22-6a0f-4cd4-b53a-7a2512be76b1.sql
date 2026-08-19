-- Clean, full-word post slugs (no random id suffix), with legacy slug aliases.

CREATE TABLE IF NOT EXISTS public.post_slug_aliases (
  slug text PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.post_slug_aliases TO authenticated;
GRANT ALL ON public.post_slug_aliases TO service_role;
ALTER TABLE public.post_slug_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psa_read ON public.post_slug_aliases;
CREATE POLICY psa_read ON public.post_slug_aliases FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.post_unique_slug(_title text, _id uuid)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE base text; cand text; n int := 1;
BEGIN
  base := nullif(public.slugify(_title), '');
  IF base IS NULL THEN base := 'post'; END IF;
  IF length(base) > 80 THEN
    base := left(base, 80);
    base := regexp_replace(base, '-[^-]*$', '');
    base := trim(both '-' from base);
    IF base = '' THEN base := 'post'; END IF;
  END IF;
  cand := base;
  WHILE EXISTS (SELECT 1 FROM public.posts p WHERE p.slug = cand AND (_id IS NULL OR p.id <> _id))
     OR EXISTS (SELECT 1 FROM public.post_slug_aliases a WHERE a.slug = cand AND (_id IS NULL OR a.post_id <> _id))
  LOOP
    n := n + 1;
    cand := base || '-' || n::text;
  END LOOP;
  RETURN cand;
END $$;

CREATE OR REPLACE FUNCTION public.posts_set_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.post_unique_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_posts_set_slug ON public.posts;
CREATE TRIGGER trg_posts_set_slug BEFORE INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_set_slug();

DO $$
DECLARE r record; clean text;
BEGIN
  FOR r IN SELECT id, title, slug FROM public.posts WHERE slug ~ '-[0-9a-f]{8}$' ORDER BY created_at LOOP
    clean := public.post_unique_slug(r.title, r.id);
    IF clean <> r.slug THEN
      INSERT INTO public.post_slug_aliases (slug, post_id) VALUES (r.slug, r.id) ON CONFLICT DO NOTHING;
      UPDATE public.posts SET slug = clean WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.public_post_slug_alias(_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.slug FROM public.post_slug_aliases a
  JOIN public.posts p ON p.id = a.post_id
  WHERE a.slug = _slug
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.public_post_slug_alias(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_post_slug_alias(text) TO anon, authenticated;