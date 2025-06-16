create type "public"."assistant_status" as enum ('draft', 'active', 'inactive');

create table "public"."assistants" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "vapi_assistant_id" text,
    "business_name" text,
    "assistant_name" text,
    "greeting" text,
    "status" assistant_status default 'draft'::assistant_status,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."assistants" enable row level security;

alter table "public"."user_settings" drop column "ai_greeting";

alter table "public"."user_settings" drop column "assistant_name";

CREATE UNIQUE INDEX assistants_pkey ON public.assistants USING btree (id);

CREATE UNIQUE INDEX assistants_vapi_assistant_id_key ON public.assistants USING btree (vapi_assistant_id);

CREATE INDEX idx_assistants_user ON public.assistants USING btree (user_id);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

alter table "public"."assistants" add constraint "assistants_pkey" PRIMARY KEY using index "assistants_pkey";

alter table "public"."assistants" add constraint "assistants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."assistants" validate constraint "assistants_user_id_fkey";

alter table "public"."assistants" add constraint "assistants_vapi_assistant_id_key" UNIQUE using index "assistants_vapi_assistant_id_key";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

grant delete on table "public"."assistants" to "anon";

grant insert on table "public"."assistants" to "anon";

grant references on table "public"."assistants" to "anon";

grant select on table "public"."assistants" to "anon";

grant trigger on table "public"."assistants" to "anon";

grant truncate on table "public"."assistants" to "anon";

grant update on table "public"."assistants" to "anon";

grant delete on table "public"."assistants" to "authenticated";

grant insert on table "public"."assistants" to "authenticated";

grant references on table "public"."assistants" to "authenticated";

grant select on table "public"."assistants" to "authenticated";

grant trigger on table "public"."assistants" to "authenticated";

grant truncate on table "public"."assistants" to "authenticated";

grant update on table "public"."assistants" to "authenticated";

grant delete on table "public"."assistants" to "service_role";

grant insert on table "public"."assistants" to "service_role";

grant references on table "public"."assistants" to "service_role";

grant select on table "public"."assistants" to "service_role";

grant trigger on table "public"."assistants" to "service_role";

grant truncate on table "public"."assistants" to "service_role";

grant update on table "public"."assistants" to "service_role";

create policy "assistant_owner"
on "public"."assistants"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



