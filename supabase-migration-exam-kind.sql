-- ============================================================
-- Гарааны үнэлгээ (baseline assessment) — нэмэлт багана
-- Supabase > SQL Editor дээр НЭГ УДАА ажиллуулна.
-- Аюулгүй: одоо байгаа өгөгдөлд нөлөөлөхгүй, дахин ажиллуулж болно.
-- ============================================================

alter table public.content_items
  add column if not exists exam_kind text;

alter table public.content_items
  drop constraint if exists content_items_exam_kind_check;

alter table public.content_items
  add constraint content_items_exam_kind_check
  check (exam_kind is null or exam_kind in ('baseline', 'progress', 'final'));

-- Одоо байгаа шалгалтуудыг "явцын үнэлгээ" болгож тэмдэглэнэ.
update public.content_items
set exam_kind = 'progress'
where content_type = 'exam' and exam_kind is null;
