drop trigger if exists "handle_user_subscriptions_updated_at" on "public"."user_subscriptions";

drop policy "Only service role can modify subscriptions" on "public"."user_subscriptions";

drop policy "Users can insert own subscription" on "public"."user_subscriptions";

drop policy "Users can view own subscription" on "public"."user_subscriptions";

revoke delete on table "public"."user_subscriptions" from "anon";

revoke insert on table "public"."user_subscriptions" from "anon";

revoke references on table "public"."user_subscriptions" from "anon";

revoke select on table "public"."user_subscriptions" from "anon";

revoke trigger on table "public"."user_subscriptions" from "anon";

revoke truncate on table "public"."user_subscriptions" from "anon";

revoke update on table "public"."user_subscriptions" from "anon";

revoke delete on table "public"."user_subscriptions" from "authenticated";

revoke insert on table "public"."user_subscriptions" from "authenticated";

revoke references on table "public"."user_subscriptions" from "authenticated";

revoke select on table "public"."user_subscriptions" from "authenticated";

revoke trigger on table "public"."user_subscriptions" from "authenticated";

revoke truncate on table "public"."user_subscriptions" from "authenticated";

revoke update on table "public"."user_subscriptions" from "authenticated";

revoke delete on table "public"."user_subscriptions" from "service_role";

revoke insert on table "public"."user_subscriptions" from "service_role";

revoke references on table "public"."user_subscriptions" from "service_role";

revoke select on table "public"."user_subscriptions" from "service_role";

revoke trigger on table "public"."user_subscriptions" from "service_role";

revoke truncate on table "public"."user_subscriptions" from "service_role";

revoke update on table "public"."user_subscriptions" from "service_role";

alter table "public"."profiles" drop constraint "profiles_stripe_customer_id_key";

alter table "public"."user_subscriptions" drop constraint "user_subscriptions_id_fkey";

alter table "public"."user_subscriptions" drop constraint "user_subscriptions_plan_type_check";

alter table "public"."user_subscriptions" drop constraint "user_subscriptions_status_check";

alter table "public"."user_subscriptions" drop constraint "user_subscriptions_stripe_subscription_id_key";

alter table "public"."user_subscriptions" drop constraint "valid_plan_type";

alter table "public"."user_subscriptions" drop constraint "valid_subscription_status";

alter table "public"."user_subscriptions" drop constraint "user_subscriptions_pkey";

drop index if exists "public"."idx_profiles_stripe_customer_id";

drop index if exists "public"."idx_user_subscriptions_status_plan";

drop index if exists "public"."idx_user_subscriptions_stripe_subscription_id";

drop index if exists "public"."idx_user_subscriptions_user_id";

drop index if exists "public"."profiles_stripe_customer_id_key";

drop index if exists "public"."user_subscriptions_pkey";

drop index if exists "public"."user_subscriptions_status_idx";

drop index if exists "public"."user_subscriptions_stripe_subscription_id_key";

drop table "public"."user_subscriptions";

alter table "public"."profiles" drop column "stripe_customer_id";

alter table "public"."user_settings" drop column "sms_notifications";


