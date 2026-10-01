-- Presets: reusable lists of entries (e.g. "Subscriptions") you can add to any month.
-- Additive only: creates new tables and one new nullable column. Existing data is untouched.
-- Run once in Supabase → SQL Editor.

create table if not exists presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists preset_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  preset_id uuid not null references presets on delete cascade,
  type entry_type not null default 'expense',
  amount numeric(12, 2) not null check (amount > 0),
  description text check (char_length(description) <= 120),
  day smallint not null default 1 check (day between 1 and 31),
  -- category + people tag ids; ids of deleted tags are ignored when the preset is applied
  tag_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists preset_items_preset_idx on preset_items (preset_id);

-- Remember which preset an entry came from, so the app can warn before adding it twice.
alter table entries add column if not exists preset_id uuid references presets on delete set null;

alter table presets enable row level security;
alter table preset_items enable row level security;

drop policy if exists "own presets" on presets;
create policy "own presets" on presets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own preset_items" on preset_items;
create policy "own preset_items" on preset_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from presets p where p.id = preset_id and p.user_id = (select auth.uid()))
  );
