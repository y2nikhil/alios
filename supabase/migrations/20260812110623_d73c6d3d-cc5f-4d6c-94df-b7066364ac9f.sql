GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_parties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_party_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_party_participants TO authenticated;
GRANT SELECT ON public.watch_parties TO anon;
GRANT ALL ON public.watch_parties TO service_role;
GRANT ALL ON public.watch_party_messages TO service_role;
GRANT ALL ON public.watch_party_participants TO service_role;