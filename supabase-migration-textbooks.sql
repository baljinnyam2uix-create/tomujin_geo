-- ============================================================
-- Сурах бичигт тулгуурласан AI багш (RAG)
-- Supabase > SQL Editor дээр НЭГ УДАА ажиллуулна.
-- ============================================================

-- Вектор хайлтын өргөтгөл
create extension if not exists vector;

create table if not exists public.textbook_chunks (
  id uuid primary key default gen_random_uuid(),
  grade int not null check (grade between 7 and 12),
  source text not null,            -- сурах бичгийн нэр
  page int,                        -- ойролцоо хуудас
  content text not null,           -- текстийн хэсэг
  embedding vector(1536),          -- text-embedding-3-small
  created_at timestamptz not null default now()
);

-- Ойролцоо хайлтын индекс (cosine)
create index if not exists textbook_chunks_embedding_idx
  on public.textbook_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists textbook_chunks_grade_idx on public.textbook_chunks (grade);

-- Асуултад хамгийн ойр хэсгүүдийг олох
create or replace function public.match_textbook_chunks(
  query_embedding vector(1536),
  max_grade int,
  match_count int default 5
)
returns table (id uuid, grade int, source text, page int, content text, similarity float)
language sql stable
as $$
  select c.id, c.grade, c.source, c.page, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.textbook_chunks c
  where c.grade <= max_grade and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 12));
$$;

-- ---------- RLS ----------
alter table public.textbook_chunks enable row level security;

-- Нэвтэрсэн хэрэглэгч уншина. Бичих эрхийг зөвхөн service_role эзэмшинэ
-- (өгөгдөл оруулах скрипт локалаар ажиллана), тиймээс insert/update policy үүсгэхгүй.
drop policy if exists "textbook_chunks_select" on public.textbook_chunks;
create policy "textbook_chunks_select" on public.textbook_chunks
  for select to authenticated using (true);

grant select on public.textbook_chunks to authenticated;
grant execute on function public.match_textbook_chunks(vector, int, int) to authenticated;
