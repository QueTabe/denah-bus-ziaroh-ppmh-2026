-- ============================================================
-- DATABASE DENAH BUS PP. MAMBAUL HISAN
-- 4 BUS x 59 KURSI = 236 BARIS
-- Jalankan di Supabase > SQL Editor > New query.
-- Tabel ini terpisah dari tabel bus_seats website sebelumnya.
-- ============================================================

create table if not exists public.bus_seats_multi (
  bus_id text not null check (bus_id in ('bus-1','bus-2','bus-3','bus-4')),
  number integer not null check (number between 1 and 59),
  name text not null default '',
  status text not null default 'available'
    check (status in ('available','filled','reserved')),
  color text not null default ''
    check (color in ('','green','gold','mint')),
  updated_at timestamptz not null default now(),
  primary key (bus_id, number)
);

-- Isi otomatis 59 kursi untuk setiap bus, seluruhnya kosong.
insert into public.bus_seats_multi (bus_id, number)
select bus_id, seat_number
from unnest(array['bus-1','bus-2','bus-3','bus-4']) as bus_id
cross join generate_series(1,59) as seat_number
on conflict (bus_id, number) do nothing;

-- Tabel admin. Jika tabel admin_users sudah ada dari project sebelumnya,
-- perintah IF NOT EXISTS tidak akan mengganti data yang lama.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.bus_seats_multi enable row level security;
alter table public.admin_users enable row level security;

-- Hapus policy dengan nama yang sama agar skrip aman dijalankan ulang.
drop policy if exists "Public can view all bus seats multi" on public.bus_seats_multi;
drop policy if exists "Admins can insert bus seats multi" on public.bus_seats_multi;
drop policy if exists "Admins can update bus seats multi" on public.bus_seats_multi;
drop policy if exists "Admins can delete bus seats multi" on public.bus_seats_multi;
drop policy if exists "Admins can view own admin record" on public.admin_users;

-- Pengunjung dapat membaca denah, tetapi hanya admin yang dapat mengubahnya.
create policy "Public can view all bus seats multi"
on public.bus_seats_multi for select
to anon, authenticated
using (true);

create policy "Admins can insert bus seats multi"
on public.bus_seats_multi for insert
to authenticated
with check (
  exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

create policy "Admins can update bus seats multi"
on public.bus_seats_multi for update
to authenticated
using (
  exists (select 1 from public.admin_users a where a.user_id = auth.uid())
)
with check (
  exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

create policy "Admins can delete bus seats multi"
on public.bus_seats_multi for delete
to authenticated
using (
  exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

create policy "Admins can view own admin record"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

-- Aktifkan Realtime untuk pembaruan denah langsung.
do $$
begin
  alter publication supabase_realtime add table public.bus_seats_multi;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'Publication supabase_realtime tidak ditemukan; aktifkan Realtime melalui Dashboard.';
end $$;

-- LANGKAH MENDAFTARKAN ADMIN:
-- 1. Buat akun melalui Supabase Authentication > Users > Add user.
-- 2. Salin UUID akun tersebut.
-- 3. Ganti UUID_DI_SINI pada query berikut, lalu jalankan:
--
-- insert into public.admin_users (user_id)
-- values ('UUID_DI_SINI')
-- on conflict (user_id) do nothing;
