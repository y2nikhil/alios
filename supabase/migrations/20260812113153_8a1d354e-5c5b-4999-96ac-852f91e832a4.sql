CREATE OR REPLACE FUNCTION public.is_active_watch_party_participant(_party_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.watch_party_participants
    WHERE party_id = _party_id
      AND user_id = _user_id
      AND left_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_watch_party_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_watch_party_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_watch_party_participant(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "View participants" ON public.watch_party_participants;
CREATE POLICY "View participants"
ON public.watch_party_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_active_watch_party_participant(party_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.watch_parties wp
    WHERE wp.id = watch_party_participants.party_id
      AND wp.host_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "View party messages" ON public.watch_party_messages;
CREATE POLICY "View party messages"
ON public.watch_party_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.watch_parties wp
    WHERE wp.id = watch_party_messages.party_id
      AND (
        wp.visibility IN ('public'::public.party_visibility, 'unlisted'::public.party_visibility)
        OR wp.host_id = auth.uid()
        OR public.is_active_watch_party_participant(wp.id, auth.uid())
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  )
);