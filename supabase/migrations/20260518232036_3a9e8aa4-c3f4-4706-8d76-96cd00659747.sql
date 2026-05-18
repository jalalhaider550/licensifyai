REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) TO authenticated;