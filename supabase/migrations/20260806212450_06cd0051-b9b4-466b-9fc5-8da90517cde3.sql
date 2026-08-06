
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  media_url text,
  media_kind text,
  tag text,
  up_count integer NOT NULL DEFAULT 0,
  down_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_delete_own_or_admin" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  up_count integer NOT NULL DEFAULT 0,
  down_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_select" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "pc_insert_own" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "pc_update_own" ON public.post_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "pc_delete_own_or_admin" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.post_votes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_votes TO authenticated;
GRANT ALL ON public.post_votes TO service_role;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_select" ON public.post_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_write_own" ON public.post_votes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.post_comment_votes (
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comment_votes TO authenticated;
GRANT ALL ON public.post_comment_votes TO service_role;
ALTER TABLE public.post_comment_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcv_select" ON public.post_comment_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "pcv_write_own" ON public.post_comment_votes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_posts_created ON public.posts (created_at DESC);
CREATE INDEX idx_pc_post ON public.post_comments (post_id, created_at);

CREATE OR REPLACE FUNCTION public.sync_post_vote_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE public.posts p SET
    up_count = (SELECT count(*) FROM public.post_votes v WHERE v.post_id = pid AND v.value = 1),
    down_count = (SELECT count(*) FROM public.post_votes v WHERE v.post_id = pid AND v.value = -1)
  WHERE p.id = pid;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_post_votes AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_vote_counts();

CREATE OR REPLACE FUNCTION public.sync_comment_vote_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  cid := COALESCE(NEW.comment_id, OLD.comment_id);
  UPDATE public.post_comments c SET
    up_count = (SELECT count(*) FROM public.post_comment_votes v WHERE v.comment_id = cid AND v.value = 1),
    down_count = (SELECT count(*) FROM public.post_comment_votes v WHERE v.comment_id = cid AND v.value = -1)
  WHERE c.id = cid;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_comment_votes AFTER INSERT OR UPDATE OR DELETE ON public.post_comment_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_comment_vote_counts();

CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE public.posts p SET comment_count = (SELECT count(*) FROM public.post_comments c WHERE c.post_id = pid) WHERE p.id = pid;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_post_comments AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
