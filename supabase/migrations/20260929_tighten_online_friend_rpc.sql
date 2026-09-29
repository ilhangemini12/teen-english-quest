-- BatumHub privacy hardening: friend presence is authenticated-only.
revoke execute on function public.get_online_friends() from anon;
grant execute on function public.get_online_friends() to authenticated, service_role;
