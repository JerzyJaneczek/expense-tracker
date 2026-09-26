-- Expense tracker schema. Run once in Supabase → SQL Editor.

create type tag_kind as enum ('category', 'person');
create type entry_type as enum ('income', 'expense');

create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind tag_kind not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type entry_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  description text check (char_length(description) <= 120),
  date date not null default current_date,
  created_at timestamptz not null default now()
);
create index entries_user_date_idx on entries (user_id, date);

create table entry_tags (
  entry_id uuid not null references entries on delete cascade,
  tag_id uuid not null references tags on delete cascade,
  primary key (entry_id, tag_id)
);
create index entry_tags_tag_idx on entry_tags (tag_id);

-- Row Level Security: every user only ever sees their own rows.
alter table tags enable row level security;
alter table entries enable row level security;
alter table entry_tags enable row level security;

create policy "own tags" on tags for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own entries" on entries for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own entry_tags" on entry_tags for all to authenticated
  using (
    exists (select 1 from entries e where e.id = entry_id and e.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from entries e where e.id = entry_id and e.user_id = (select auth.uid()))
    and exists (select 1 from tags t where t.id = tag_id and t.user_id = (select auth.uid()))
  );
