-- Create profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  created_at timestamp with time zone default now(),
  primary key (id)
);

alter table public.profiles enable row level security;

-- Create sentiment_analyses table for history
create table public.sentiment_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  sentiment text not null,
  confidence numeric(5,2),
  analyzed_at timestamp with time zone default now()
);

alter table public.sentiment_analyses enable row level security;

-- RLS policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS policies for sentiment_analyses
create policy "Users can view their own analyses"
  on public.sentiment_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own analyses"
  on public.sentiment_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own analyses"
  on public.sentiment_analyses for delete
  using (auth.uid() = user_id);

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Trigger to auto-create profile
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();