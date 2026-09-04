ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS word_count integer
  GENERATED ALWAYS AS (array_length(regexp_split_to_array(btrim(coalesce(content, '')), '\s+'), 1)) STORED;

CREATE INDEX IF NOT EXISTS blog_posts_status_published_at_idx
  ON public.blog_posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS blog_posts_updated_at_idx
  ON public.blog_posts (updated_at DESC);

CREATE INDEX IF NOT EXISTS posts_created_at_idx
  ON public.posts (created_at DESC);