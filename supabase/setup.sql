-- Trazo: configuración de Supabase. Pégalo completo en el SQL Editor y dale "Run".
-- Se puede correr más de una vez sin problema. No toca nada de Fibra.

create table if not exists public.trazo_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.trazo_state enable row level security;

drop policy if exists "trazo leer lo propio" on public.trazo_state;
drop policy if exists "trazo crear lo propio" on public.trazo_state;
drop policy if exists "trazo actualizar lo propio" on public.trazo_state;
drop policy if exists "trazo borrar lo propio" on public.trazo_state;
create policy "trazo leer lo propio" on public.trazo_state for select to authenticated using (auth.uid() = user_id);
create policy "trazo crear lo propio" on public.trazo_state for insert to authenticated with check (auth.uid() = user_id);
create policy "trazo actualizar lo propio" on public.trazo_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trazo borrar lo propio" on public.trazo_state for delete to authenticated using (auth.uid() = user_id);
