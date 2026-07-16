
GRANT EXECUTE ON FUNCTION public.can_view_board(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_board(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dm_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_muted(uuid) TO authenticated;
