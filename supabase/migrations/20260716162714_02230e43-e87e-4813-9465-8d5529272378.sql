
-- Revoke EXECUTE from anon on all SECURITY DEFINER functions except sign-up/login helpers
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_board(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_board(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.end_watch_party(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_dm_thread(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_muted(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_account(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_account(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, notification_type, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, uuid, uuid, text, jsonb) FROM anon;

-- Revoke EXECUTE from authenticated on functions never called directly by the client
-- (they are still usable inside RLS policies and other SECURITY DEFINER functions,
-- which execute with the function owner's privileges).
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_board(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_board(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_muted(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM authenticated;
