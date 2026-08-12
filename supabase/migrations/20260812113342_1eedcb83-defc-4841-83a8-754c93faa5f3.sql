DROP POLICY IF EXISTS "View parties by visibility" ON public.watch_parties;

CREATE POLICY "Public can view discoverable parties"
ON public.watch_parties
FOR SELECT
TO anon, authenticated
USING (visibility IN ('public'::public.party_visibility, 'unlisted'::public.party_visibility));

CREATE POLICY "Hosts can view own parties"
ON public.watch_parties
FOR SELECT
TO authenticated
USING (host_id = auth.uid());

CREATE POLICY "Moderators can view all parties"
ON public.watch_parties
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);