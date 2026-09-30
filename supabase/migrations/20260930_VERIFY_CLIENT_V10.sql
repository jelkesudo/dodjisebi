-- Read-only verification after ULTIMATE_CLIENT_V10.
select table_name from information_schema.tables
where table_schema='public' and table_name in (
'applications','client_profiles','offerings','offering_prices','promo_codes','promo_code_offerings','promo_eligible_users','orders','order_items','payments','promo_redemptions','access_grants','client_subscriptions'
) order by table_name;

select routine_name from information_schema.routines
where routine_schema='public' and routine_name in (
'create_application_secure_v2','get_auth_user_id_by_email','link_application_to_user','quote_offering_for_user','create_client_order','handle_new_user'
) order by routine_name;

select schemaname,tablename,policyname,roles,cmd
from pg_policies
where schemaname='public' and tablename in ('client_profiles','offerings','offering_prices','orders','order_items','payments','access_grants','client_subscriptions')
order by tablename,policyname;
