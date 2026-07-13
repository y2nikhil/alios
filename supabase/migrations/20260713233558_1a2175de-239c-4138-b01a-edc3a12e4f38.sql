
CREATE OR REPLACE FUNCTION public.is_group_member(_user uuid, _group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group AND user_id = _user);
$$;

-- Create group_invites FIRST so policies referencing it can be created
CREATE TABLE public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (group_id, invitee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_invites TO authenticated;
GRANT ALL ON public.group_invites TO service_role;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own invites" ON public.group_invites FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id
       OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_invites.group_id AND g.created_by = auth.uid()));

CREATE POLICY "Members invite friends" ON public.group_invites FOR INSERT
WITH CHECK (
  auth.uid() = inviter_id
  AND public.are_friends(auth.uid(), invitee_id)
  AND (public.is_group_member(auth.uid(), group_id)
       OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_invites.group_id AND g.created_by = auth.uid()))
);

CREATE POLICY "Invitee responds" ON public.group_invites FOR UPDATE
USING (auth.uid() = invitee_id) WITH CHECK (auth.uid() = invitee_id);

CREATE POLICY "Inviter or invitee delete" ON public.group_invites FOR DELETE
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE OR REPLACE FUNCTION public.on_group_invite_created() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _name text;
BEGIN
  SELECT name INTO _name FROM public.groups WHERE id = NEW.group_id;
  PERFORM public.notify_user(NEW.invitee_id, 'system'::notification_type,
    'Group invite',
    'You were invited to join ' || COALESCE(_name,'a group'),
    '/app/collaborate',
    jsonb_build_object('group_id', NEW.group_id, 'invite_id', NEW.id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_group_invite_created ON public.group_invites;
CREATE TRIGGER trg_group_invite_created AFTER INSERT ON public.group_invites
FOR EACH ROW EXECUTE FUNCTION public.on_group_invite_created();

-- Now update the group/channel/message policies
DROP POLICY IF EXISTS "View public groups" ON public.groups;
CREATE POLICY "View groups" ON public.groups FOR SELECT
USING (is_public = true OR auth.uid() = created_by OR public.is_group_member(auth.uid(), id));

DROP POLICY IF EXISTS "View channels" ON public.chat_channels;
CREATE POLICY "View channels" ON public.chat_channels FOR SELECT
USING (
  (team_id IS NULL AND group_id IS NULL)
  OR (group_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.groups g WHERE g.id = chat_channels.group_id AND g.is_public = true)
        OR public.is_group_member(auth.uid(), group_id)
     ))
  OR (team_id IS NOT NULL AND (public.is_team_member(auth.uid(), team_id)
        OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = chat_channels.team_id AND t.owner_id = auth.uid())))
  OR public.has_role(auth.uid(),'super_admin')
);

DROP POLICY IF EXISTS "View channel messages" ON public.chat_messages;
CREATE POLICY "View channel messages" ON public.chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_channels c WHERE c.id = chat_messages.channel_id AND (
    (c.team_id IS NULL AND c.group_id IS NULL)
    OR (c.group_id IS NOT NULL AND (
          EXISTS (SELECT 1 FROM public.groups g WHERE g.id = c.group_id AND g.is_public = true)
          OR public.is_group_member(auth.uid(), c.group_id)
       ))
    OR (c.team_id IS NOT NULL AND (public.is_team_member(auth.uid(), c.team_id)
          OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = c.team_id AND t.owner_id = auth.uid())))
    OR public.has_role(auth.uid(),'super_admin')
  )
));

DROP POLICY IF EXISTS "Send channel messages" ON public.chat_messages;
CREATE POLICY "Send channel messages" ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.chat_channels c WHERE c.id = chat_messages.channel_id AND (
      (c.team_id IS NULL AND c.group_id IS NULL)
      OR (c.group_id IS NOT NULL AND (
            EXISTS (SELECT 1 FROM public.groups g WHERE g.id = c.group_id AND g.is_public = true)
            OR public.is_group_member(auth.uid(), c.group_id)
         ))
      OR (c.team_id IS NOT NULL AND (public.is_team_member(auth.uid(), c.team_id)
            OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = c.team_id AND t.owner_id = auth.uid())))
    )
  )
);

DROP POLICY IF EXISTS "Users join groups" ON public.group_members;
CREATE POLICY "Users join groups" ON public.group_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.is_public = true)
    OR EXISTS (SELECT 1 FROM public.group_invites i
               WHERE i.group_id = group_members.group_id AND i.invitee_id = auth.uid() AND i.status IN ('pending','accepted'))
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_invites;
