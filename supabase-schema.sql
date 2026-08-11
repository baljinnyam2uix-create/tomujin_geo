-- ============================================================
-- Tomujin Geo Education LMS v2
-- Unified Student/Teacher auth + activity + grading + admin
-- Run in Supabase > SQL Editor. Designed to upgrade the old schema.
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  school text not null default '',
  subject text not null default 'Газарзүй',
  grade text,
  role text not null default 'teacher',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists grade text;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','teacher','admin'));
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('active','suspended'));
alter table public.profiles drop constraint if exists profiles_grade_check;
alter table public.profiles add constraint profiles_grade_check check (grade is null or grade='' or grade in ('7','8','9','10','11','12'));

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  teacher_name text not null default '',
  content_type text not null check (content_type in ('lesson','assignment','exam')),
  title text not null,
  description text not null default '',
  grade text not null check (grade in ('7','8','9','10','11','12')),
  subject text not null default 'Газарзүй',
  resource_type text not null check (resource_type in ('video','ppt','word','pdf','link','other')),
  external_url text,
  file_path text,
  file_name text,
  due_at timestamptz,
  published boolean not null default false,
  max_score numeric,
  grade_weight numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_items add column if not exists teacher_name text not null default '';
alter table public.content_items add column if not exists max_score numeric;
alter table public.content_items add column if not exists grade_weight numeric not null default 0;
alter table public.content_items drop constraint if exists content_items_max_score_check;
alter table public.content_items add constraint content_items_max_score_check check (max_score is null or max_score > 0);
alter table public.content_items drop constraint if exists content_items_grade_weight_check;
alter table public.content_items add constraint content_items_grade_weight_check check (grade_weight >= 0 and grade_weight <= 100);

create table if not exists public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  status text not null default 'pending',
  score numeric,
  teacher_feedback text not null default '',
  opened_at timestamptz,
  last_opened_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, content_id)
);
alter table public.student_progress add column if not exists teacher_feedback text not null default '';
alter table public.student_progress add column if not exists opened_at timestamptz;
alter table public.student_progress add column if not exists last_opened_at timestamptz;
alter table public.student_progress drop constraint if exists student_progress_status_check;
alter table public.student_progress add constraint student_progress_status_check check (status in ('pending','in_progress','completed'));

create table if not exists public.app_settings (
  id integer primary key check (id=1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.app_settings(id,settings) values(1,'{"site_title":"Сонирхолтой Газарзүй","registration_open":true,"teacher_registration_open":true,"student_registration_open":true,"teacher_can_publish":true,"support_email":"support@example.mn"}'::jsonb) on conflict(id) do nothing;

-- ---------- helpers ----------
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active');
$$;
create or replace function public.is_teacher_or_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('teacher','admin') and status='active');
$$;
create or replace function public.is_student() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='student' and status='active');
$$;
create or replace function public.student_can_access_grade(target_grade text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='student' and status='active' and grade=target_grade);
$$;
create or replace function public.teacher_can_view_student(target_school text) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.profiles me where me.id=auth.uid() and me.role='teacher' and me.status='active' and me.school=target_school);
$$;
create or replace function public.teacher_owns_content(target_content uuid) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.content_items c where c.id=target_content and c.owner_id=auth.uid() and public.is_teacher_or_admin());
$$;

-- New user metadata may only request student or teacher. Never admin from client metadata.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare requested text; safe_role text; safe_grade text;
begin
  requested:=coalesce(new.raw_user_meta_data->>'requested_role','student');
  safe_role:=case when requested='teacher' then 'teacher' else 'student' end;
  safe_grade:=case when safe_role='student' then nullif(new.raw_user_meta_data->>'grade','') else null end;
  insert into public.profiles(id,email,full_name,school,subject,grade,role,status)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'school',''),coalesce(new.raw_user_meta_data->>'subject','Газарзүй'),safe_grade,safe_role,'active')
  on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end;$$;
drop trigger if exists profiles_updated_at on public.profiles; create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists content_updated_at on public.content_items; create trigger content_updated_at before update on public.content_items for each row execute procedure public.set_updated_at();
drop trigger if exists progress_updated_at on public.student_progress; create trigger progress_updated_at before update on public.student_progress for each row execute procedure public.set_updated_at();

create or replace function public.enforce_publish_setting() returns trigger language plpgsql security definer set search_path=public as $$
declare can_publish boolean;begin if public.is_admin() then return new;end if;select coalesce((settings->>'teacher_can_publish')::boolean,true) into can_publish from public.app_settings where id=1;if not can_publish then new.published:=false;end if;return new;end;$$;
drop trigger if exists content_publish_guard on public.content_items;create trigger content_publish_guard before insert or update on public.content_items for each row execute procedure public.enforce_publish_setting();


-- Students may update progress timestamps/status, but never their own score or teacher feedback.
create or replace function public.protect_student_grade_fields() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.is_student() and new.student_id=auth.uid() then
    if tg_op='INSERT' then
      new.score:=null; new.teacher_feedback:='';
    else
      new.score:=old.score; new.teacher_feedback:=old.teacher_feedback;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists protect_student_grade_fields_trigger on public.student_progress;
create trigger protect_student_grade_fields_trigger before insert or update on public.student_progress for each row execute procedure public.protect_student_grade_fields();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.content_items enable row level security;
alter table public.student_progress enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_role_aware" on public.profiles;
create policy "profiles_select_role_aware" on public.profiles for select to authenticated using (
  id=auth.uid() or public.is_admin() or (role='student' and public.teacher_can_view_student(school))
);
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists "content_select_owner_or_admin" on public.content_items;
drop policy if exists "content_select_role_aware" on public.content_items;
create policy "content_select_role_aware" on public.content_items for select to authenticated using (
  owner_id=auth.uid() or public.is_admin() or (published=true and public.student_can_access_grade(grade))
);
drop policy if exists "content_insert_owner" on public.content_items;
create policy "content_insert_owner" on public.content_items for insert to authenticated with check(owner_id=auth.uid() and public.is_teacher_or_admin());
drop policy if exists "content_update_owner_or_admin" on public.content_items;
create policy "content_update_owner_or_admin" on public.content_items for update to authenticated using((owner_id=auth.uid() and public.is_teacher_or_admin()) or public.is_admin()) with check((owner_id=auth.uid() and public.is_teacher_or_admin()) or public.is_admin());
drop policy if exists "content_delete_owner_or_admin" on public.content_items;
create policy "content_delete_owner_or_admin" on public.content_items for delete to authenticated using((owner_id=auth.uid() and public.is_teacher_or_admin()) or public.is_admin());

drop policy if exists "progress_select" on public.student_progress;
create policy "progress_select" on public.student_progress for select to authenticated using(student_id=auth.uid() or public.is_admin() or public.teacher_owns_content(content_id));
drop policy if exists "progress_insert_own" on public.student_progress;
drop policy if exists "progress_insert_role_aware" on public.student_progress;
create policy "progress_insert_role_aware" on public.student_progress for insert to authenticated with check((student_id=auth.uid() and public.is_student()) or public.teacher_owns_content(content_id));
drop policy if exists "progress_update_own_or_admin" on public.student_progress;
drop policy if exists "progress_update_role_aware" on public.student_progress;
create policy "progress_update_role_aware" on public.student_progress for update to authenticated using((student_id=auth.uid() and public.is_student()) or public.is_admin() or public.teacher_owns_content(content_id)) with check((student_id=auth.uid() and public.is_student()) or public.is_admin() or public.teacher_owns_content(content_id));

drop policy if exists "settings_public_read" on public.app_settings;create policy "settings_public_read" on public.app_settings for select to anon,authenticated using(true);
drop policy if exists "settings_admin_update" on public.app_settings;create policy "settings_admin_update" on public.app_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());

grant usage on schema public to anon,authenticated;
grant select on public.app_settings to anon,authenticated;
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select,insert,update,delete on public.content_items to authenticated;
grant select,insert,update on public.student_progress to authenticated;
grant update on public.app_settings to authenticated;

-- ---------- private Storage ----------
insert into storage.buckets(id,name,public) values('course-files','course-files',false) on conflict(id) do update set public=false;
create or replace function public.student_can_access_file(object_name text) returns boolean language sql stable security definer set search_path=public,storage as $$
  select exists(select 1 from public.content_items c join public.profiles p on p.id=auth.uid() where c.file_path=object_name and c.published=true and p.role='student' and p.status='active' and p.grade=c.grade);
$$;
drop policy if exists "course_files_insert_own" on storage.objects;create policy "course_files_insert_own" on storage.objects for insert to authenticated with check(bucket_id='course-files' and public.is_teacher_or_admin() and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "course_files_select_own_or_admin" on storage.objects;drop policy if exists "course_files_select_role_aware" on storage.objects;create policy "course_files_select_role_aware" on storage.objects for select to authenticated using(bucket_id='course-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin() or public.student_can_access_file(name)));
drop policy if exists "course_files_delete_own_or_admin" on storage.objects;create policy "course_files_delete_own_or_admin" on storage.objects for delete to authenticated using(bucket_id='course-files' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

-- FIRST ADMIN: register normally, then run this once with your email:
-- update public.profiles set role='admin' where email='YOUR_ADMIN_EMAIL@example.mn';
