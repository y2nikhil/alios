DROP POLICY IF EXISTS "View public adherence" ON public.daily_adherence;
CREATE POLICY "View public adherence" ON public.daily_adherence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = daily_adherence.user_id
      AND (
        p.timeline_visibility = 'public'
        OR (p.timeline_visibility = 'friends' AND public.are_friends(auth.uid(), p.id))
      )
  )
);