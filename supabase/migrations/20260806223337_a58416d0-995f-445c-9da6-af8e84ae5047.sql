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
        wp.visibility IN ('public', 'unlisted')
        OR wp.host_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.watch_party_participants participant
          WHERE participant.party_id = wp.id
            AND participant.user_id = auth.uid()
            AND participant.left_at IS NULL
        )
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
      )
  )
);