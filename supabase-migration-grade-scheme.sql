-- ============================================================
-- Дүнгийн бүтэц: багш анги бүрт жинг өөрөө тохируулна
--   Ирц · Явц · Явцын шалгалт · Даалгавар · Эцсийн шалгалт
-- Supabase > SQL Editor дээр НЭГ УДАА ажиллуулна.
-- Аюулгүй: одоо байгаа өгөгдлийг устгахгүй, дахин ажиллуулж болно.
-- ============================================================

-- 1. Жингийн тохиргоо (багш × анги)
create table if not exists public.grade_schemes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  grade text not null check (grade in ('7','8','9','10','11','12')),
  attendance numeric not null default 10,
  participation numeric not null default 20,
  progress_exam numeric not null default 20,
  assignment numeric not null default 20,
  final_exam numeric not null default 30,
  updated_at timestamptz not null default now(),
  unique (owner_id, grade)
);

-- 2. Ирц / Явцын оноо (сурагч бүрээр, 0–100%)
create table if not exists public.student_category_scores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('attendance','participation')),
  score numeric check (score is null or (score >= 0 and score <= 100)),
  updated_at timestamptz not null default now(),
  unique (owner_id, student_id, category)
);

-- ---------- updated_at триггер ----------
drop trigger if exists grade_schemes_updated_at on public.grade_schemes;
create trigger grade_schemes_updated_at before update on public.grade_schemes
  for each row execute procedure public.set_updated_at();

drop trigger if exists student_category_scores_updated_at on public.student_category_scores;
create trigger student_category_scores_updated_at before update on public.student_category_scores
  for each row execute procedure public.set_updated_at();

-- ---------- RLS ----------
alter table public.grade_schemes enable row level security;
alter table public.student_category_scores enable row level security;

-- Жингийн бүтэц: бүх нэвтэрсэн хүн уншина (сурагч дүнгээ тооцоолоход хэрэгтэй),
-- зөвхөн эзэн багш эсвэл админ бичнэ.
drop policy if exists "schemes_select" on public.grade_schemes;
create policy "schemes_select" on public.grade_schemes
  for select to authenticated using (true);

drop policy if exists "schemes_insert" on public.grade_schemes;
create policy "schemes_insert" on public.grade_schemes
  for insert to authenticated
  with check ((owner_id = auth.uid() and public.is_teacher_or_admin()) or public.is_admin());

drop policy if exists "schemes_update" on public.grade_schemes;
create policy "schemes_update" on public.grade_schemes
  for update to authenticated
  using ((owner_id = auth.uid() and public.is_teacher_or_admin()) or public.is_admin())
  with check ((owner_id = auth.uid() and public.is_teacher_or_admin()) or public.is_admin());

drop policy if exists "schemes_delete" on public.grade_schemes;
create policy "schemes_delete" on public.grade_schemes
  for delete to authenticated
  using ((owner_id = auth.uid() and public.is_teacher_or_admin()) or public.is_admin());

-- Ирц/Явцын оноо: сурагч ЗӨВХӨН өөрийнхөө оноог харна, бичиж чадахгүй.
drop policy if exists "category_scores_select" on public.student_category_scores;
create policy "category_scores_select" on public.student_category_scores
  for select to authenticated
  using (student_id = auth.uid() or owner_id = auth.uid() or public.is_admin());

drop policy if exists "category_scores_insert" on public.student_category_scores;
create policy "category_scores_insert" on public.student_category_scores
  for insert to authenticated
  with check ((owner_id = auth.uid() and public.is_teacher_or_admin()) or public.is_admin());

drop policy if exists "category_scores_update" on public.student_category_scores;
create policy "category_scores_update" on public.student_category_scores
  for update to authenticated
  using ((owner_id = auth.uid() and public.is_teacher_or_admin()) or public.is_admin())
  with check ((owner_id = auth.uid() and public.is_teacher_or_admin()) or public.is_admin());

grant select, insert, update, delete on public.grade_schemes to authenticated;
grant select, insert, update on public.student_category_scores to authenticated;
