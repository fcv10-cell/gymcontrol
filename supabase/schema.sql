-- GymControl — base de datos en Supabase.
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Se puede ejecutar más de una vez sin problema. No toca las tablas de Ritmo.
--
-- Seguridad: cada fila pertenece a la cuenta que la creó (owner_id). Cada cuenta solo puede
-- ver y cambiar sus propias filas, así que aunque alguien más se registre, nunca ve tu gimnasio.

create table if not exists public.plans (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  days integer not null default 30,
  price numeric(14,2) not null default 0,
  color text
);

create table if not exists public.members (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  phone text,
  plan_id uuid,
  start_date date,
  end_date date,
  notes text,
  created_at date default current_date,
  example boolean default false
);

create table if not exists public.payments (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('in', 'out')),
  date date not null,
  amount numeric(14,2) not null default 0,
  method text,
  concept text,
  member_id uuid,
  member_name text,
  client_id uuid,
  created_at timestamptz default now(),
  example boolean default false
);

create table if not exists public.checkins (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  member_id uuid not null,
  date date not null,
  time text not null,
  created_at timestamptz default now(),
  example boolean default false
);

-- Ajustes del gym: una fila "main" por cuenta.
create table if not exists public.settings (
  id text not null,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  gym_name text,
  currency text,
  cc text,
  primary key (owner_id, id)
);

-- Entrenamiento personalizado: clientes con mensualidad y horario fijo.
create table if not exists public.pt_clients (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  member_id uuid,
  name text not null,
  phone text,
  price numeric(14,2) not null default 0,
  days integer[] default '{}',
  time text,
  goal text,
  notes text,
  start_date date,
  end_date date,
  active boolean default true,
  created_at date default current_date,
  example boolean default false
);

-- Cada sesión dada (asistió / faltó) con lo que se entrenó.
create table if not exists public.pt_sessions (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_id uuid not null,
  date date not null,
  time text,
  status text not null default 'done' check (status in ('done', 'missed')),
  notes text,
  created_at timestamptz default now(),
  example boolean default false
);

create index if not exists members_owner_idx on public.members (owner_id);
create index if not exists payments_owner_date_idx on public.payments (owner_id, date);
create index if not exists checkins_owner_date_idx on public.checkins (owner_id, date);
create index if not exists pt_sessions_owner_date_idx on public.pt_sessions (owner_id, date);

do $$
declare t text;
begin
  foreach t in array array['plans', 'members', 'payments', 'checkins', 'settings', 'pt_clients', 'pt_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "equipo del gym" on public.%I', t);
    execute format('drop policy if exists "gym: solo mis datos" on public.%I', t);
    execute format('create policy "gym: solo mis datos" on public.%I for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id)', t);
    -- Avisos en vivo: un cambio en un equipo aparece al instante en los demás.
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
