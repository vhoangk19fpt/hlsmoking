
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.topup_wallet(NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topup_wallet(NUMERIC) TO authenticated;
