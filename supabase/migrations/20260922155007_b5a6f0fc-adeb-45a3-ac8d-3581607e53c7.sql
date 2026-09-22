-- ============================================================
-- VOLTIO · Control de coche eléctrico
-- ============================================================

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "profiles_self_select" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- vehicles ----------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  make text,
  model text,
  model_year int,
  plate text,
  battery_kwh numeric,
  wltp_range_km numeric,
  efficiency_wh_km numeric,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.vehicles to authenticated;
grant all on public.vehicles to service_role;

alter table public.vehicles enable row level security;

create policy "vehicles_own_all" on public.vehicles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- charging_sessions ----------
create table public.charging_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  location_label text,
  charger_type text,
  start_soc numeric,
  end_soc numeric,
  energy_kwh numeric not null,
  cost_eur numeric,
  currency text not null default 'EUR',
  price_per_kwh numeric,
  mileage_km numeric,
  note text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.charging_sessions to authenticated;
grant all on public.charging_sessions to service_role;

alter table public.charging_sessions enable row level security;

create policy "charging_own_all" on public.charging_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index charging_user_time_idx on public.charging_sessions (user_id, occurred_at desc);
create index charging_vehicle_idx on public.charging_sessions (vehicle_id, occurred_at desc);

-- ---------- trips ----------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  label text,
  distance_km numeric not null,
  energy_kwh numeric,
  start_soc numeric,
  end_soc numeric,
  avg_speed_kmh numeric,
  note text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.trips to authenticated;
grant all on public.trips to service_role;

alter table public.trips enable row level security;

create policy "trips_own_all" on public.trips
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index trips_user_time_idx on public.trips (user_id, occurred_at desc);
create index trips_vehicle_idx on public.trips (vehicle_id, occurred_at desc);

-- ---------- maintenance_records ----------
create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  category text not null default 'otro',
  title text not null,
  description text,
  cost_eur numeric,
  currency text not null default 'EUR',
  mileage_km numeric,
  provider text,
  next_due_at date,
  next_due_km numeric,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.maintenance_records to authenticated;
grant all on public.maintenance_records to service_role;

alter table public.maintenance_records enable row level security;

create policy "maintenance_own_all" on public.maintenance_records
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index maintenance_user_time_idx on public.maintenance_records (user_id, occurred_at desc);

-- ---------- insights ----------
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  kind text not null,
  severity text not null default 'info',
  title text not null,
  body text not null,
  metric jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.insights to authenticated;
grant all on public.insights to service_role;

alter table public.insights enable row level security;

create policy "insights_own_all" on public.insights
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index insights_user_time_idx on public.insights (user_id, created_at desc);

-- ---------- chat_messages (single conversation) ----------
create table public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text,
  role text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;

alter table public.chat_messages enable row level security;

create policy "chat_own_all" on public.chat_messages
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index chat_user_idx on public.chat_messages (user_id, id asc);
