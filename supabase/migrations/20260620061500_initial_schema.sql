create table if not exists public.profiles (
  clerk_user_id text primary key,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.profiles(clerk_user_id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, name)
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references public.profiles(clerk_user_id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  title text not null,
  url text not null,
  domain text not null,
  notes text not null default '',
  tags text[] not null default '{}',
  favorite boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collections_user_idx on public.collections(clerk_user_id);
create index if not exists bookmarks_user_idx on public.bookmarks(clerk_user_id);
create index if not exists bookmarks_collection_idx on public.bookmarks(collection_id);
create index if not exists bookmarks_tags_idx on public.bookmarks using gin(tags);

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.bookmarks enable row level security;

create policy "profiles are owned by clerk subject"
  on public.profiles
  for all
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

create policy "collections are owned by clerk subject"
  on public.collections
  for all
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

create policy "bookmarks are owned by clerk subject"
  on public.bookmarks
  for all
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');
