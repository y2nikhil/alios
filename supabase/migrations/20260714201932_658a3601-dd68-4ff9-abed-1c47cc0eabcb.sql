
-- 1. group_members: scope SELECT
DROP POLICY IF EXISTS "View group memberships" ON public.group_members;
CREATE POLICY "View group memberships" ON public.group_members
FOR SELECT TO authenticated
USING (
  public.is_group_member(auth.uid(), group_id)
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.is_public = true)
  OR public.has_role(auth.uid(),'super_admin')
);

-- 2. watch_party_participants: scope SELECT
DROP POLICY IF EXISTS "View participants" ON public.watch_party_participants;
CREATE POLICY "View participants" ON public.watch_party_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.watch_parties wp
    WHERE wp.id = party_id
      AND (wp.host_id = auth.uid() OR wp.visibility = 'public')
  )
  OR EXISTS (
    SELECT 1 FROM public.watch_party_participants me
    WHERE me.party_id = watch_party_participants.party_id AND me.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(),'super_admin')
);

-- 3. audit_log: only service role can insert
DROP POLICY IF EXISTS "Authenticated insert audit" ON public.audit_log;
-- (write_audit runs SECURITY DEFINER so triggers/RPC still work; direct client inserts blocked)

-- 4. storage chat-attachments: scope SELECT to message participants
DROP POLICY IF EXISTS "chat_attachments_read" ON storage.objects;
CREATE POLICY "chat_attachments_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.attachment_url = storage.objects.name
        AND (
          cm.user_id = auth.uid()
          OR (cm.channel_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.chat_channels ch
            WHERE ch.id = cm.channel_id
              AND (
                ch.team_id IS NULL AND ch.group_id IS NULL
                OR (ch.team_id IS NOT NULL AND public.is_team_member(auth.uid(), ch.team_id))
                OR (ch.group_id IS NOT NULL AND public.is_group_member(auth.uid(), ch.group_id))
              )
          ))
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.dm_messages dm
      WHERE dm.attachment_url = storage.objects.name
        AND public.is_dm_participant(auth.uid(), dm.thread_id)
    )
  )
);

-- 5. Lock down SECURITY DEFINER functions that are trigger-only (revoke direct callability)
DO $$
DECLARE
  fn text;
  trigger_only_fns text[] := ARRAY[
    'dispatch_notification_push()',
    'notify_user(uuid, notification_type, text, text, text, jsonb)',
    'on_task_completed()',
    'on_task_assigned()',
    'on_task_status_changed()',
    'log_signup_event()',
    'handle_new_user()',
    'create_default_channel()',
    'create_group_channel()',
    'on_note_assigned()',
    'on_group_invite_created()',
    'on_report_created()',
    'on_mindmap_shared()',
    'bump_dm_thread()',
    'on_aux_session_ended()',
    'check_hour_awards(uuid)',
    'notify_mentions_chat()',
    'notify_mentions_dm()',
    'write_audit(text, uuid, uuid, text, jsonb)'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_only_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
