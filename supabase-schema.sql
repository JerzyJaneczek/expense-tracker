create table expenses (
  id uuid default gen_random_uuid() primary key,
  amount decimal(10,2) not null check (amount > 0),
  category text not null default 'other',
  title text check (char_length(title) <= 60),
  notes text check (char_length(notes) <= 240),
  date date not null default current_date,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table expenses enable row level security;

-- Allow all operations (update this policy when you add auth)
create policy "allow all" on expenses for all using (true) with check (true);
