-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 한 번 실행하세요.

-- 1) 홈페이지 내용 저장 테이블 (한 줄만 사용)
create table if not exists public.site_content (
  id int primary key default 1 check (id = 1),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_content (id) values (1) on conflict do nothing;

alter table public.site_content enable row level security;

-- 누구나 읽기 (홈페이지 방문자)
drop policy if exists "public read" on public.site_content;
create policy "public read" on public.site_content
  for select using (true);

-- 로그인한 관리자만 수정
drop policy if exists "admin update" on public.site_content;
create policy "admin update" on public.site_content
  for update to authenticated using (true) with check (true);

-- 2) 이미지·영상 저장소 (공개 버킷)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');

drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media');
