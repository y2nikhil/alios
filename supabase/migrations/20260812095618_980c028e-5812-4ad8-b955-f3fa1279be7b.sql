DROP POLICY IF EXISTS "Anyone signed in can view poll options" ON public.poll_options;
CREATE POLICY "View poll options in accessible channels"
ON public.poll_options
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_channels c ON c.id = m.channel_id
    WHERE m.id = poll_options.message_id
      AND (
        (c.team_id IS NULL AND c.group_id IS NULL)
        OR (
          c.group_id IS NOT NULL
          AND (
            EXISTS (SELECT 1 FROM public.groups g WHERE g.id = c.group_id AND g.is_public = true)
            OR public.is_group_member(auth.uid(), c.group_id)
          )
        )
        OR (
          c.team_id IS NOT NULL
          AND (
            public.is_team_member(auth.uid(), c.team_id)
            OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = c.team_id AND t.owner_id = auth.uid())
          )
        )
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  )
);

DROP POLICY IF EXISTS "Anyone signed in can view votes" ON public.poll_votes;
CREATE POLICY "View poll votes in accessible channels"
ON public.poll_votes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.poll_options po
    JOIN public.chat_messages m ON m.id = po.message_id
    JOIN public.chat_channels c ON c.id = m.channel_id
    WHERE po.id = poll_votes.option_id
      AND (
        (c.team_id IS NULL AND c.group_id IS NULL)
        OR (
          c.group_id IS NOT NULL
          AND (
            EXISTS (SELECT 1 FROM public.groups g WHERE g.id = c.group_id AND g.is_public = true)
            OR public.is_group_member(auth.uid(), c.group_id)
          )
        )
        OR (
          c.team_id IS NOT NULL
          AND (
            public.is_team_member(auth.uid(), c.team_id)
            OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = c.team_id AND t.owner_id = auth.uid())
          )
        )
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      )
  )
);