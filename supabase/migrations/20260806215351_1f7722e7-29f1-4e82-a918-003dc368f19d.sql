
ALTER TYPE public.report_target_type ADD VALUE IF NOT EXISTS 'post';
ALTER TYPE public.report_target_type ADD VALUE IF NOT EXISTS 'post_comment';

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify(_txt text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_txt,'')), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.posts_set_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := left(nullif(public.slugify(NEW.title), ''), 70);
    IF base IS NULL THEN base := 'post'; END IF;
    NEW.slug := base || '-' || left(replace(NEW.id::text, '-', ''), 8);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_posts_set_slug ON public.posts;
CREATE TRIGGER trg_posts_set_slug BEFORE INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_set_slug();

UPDATE public.posts
SET slug = left(coalesce(nullif(public.slugify(title), ''), 'post'), 70) || '-' || left(replace(id::text, '-', ''), 8)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_key ON public.posts (slug);

DROP POLICY IF EXISTS posts_delete_own_or_admin ON public.posts;
CREATE POLICY posts_delete_own_or_admin ON public.posts FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS pc_delete_own_or_admin ON public.post_comments;
CREATE POLICY pc_delete_own_or_admin ON public.post_comments FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "post_media_public_read" ON storage.objects;
CREATE POLICY "post_media_public_read" ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post_media_insert_own" ON storage.objects;
CREATE POLICY "post_media_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "post_media_delete_own" ON storage.objects;
CREATE POLICY "post_media_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
