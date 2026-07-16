
-- Revoke anon EXECUTE on all SECURITY DEFINER functions except pre-auth helpers
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_board(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_board(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_banned(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_muted(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.end_watch_party(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_account(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_account(uuid) FROM anon;
