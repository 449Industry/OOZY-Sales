-- OOZY Admin Web / OOZYSales Supabase schema v1.0
-- Run ONCE in the SAME Supabase project already used by KCEM and UWash.
-- This script creates ONLY OOZY tables / policies. It does not alter KCEM or UWash sales data.

begin;

create table if not exists public.oozy_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    role text not null check (role in ('admin','viewer')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.oozy_daily_sales (
    business_date date primary key,
    card bigint not null default 0,
    cash bigint not null default 0,
    baemin bigint not null default 0,
    coupang bigint not null default 0,
    oozy_order bigint not null default 0,
    other_delivery bigint not null default 0,
    delivery_total bigint not null default 0,
    total bigint not null default 0,
    purchase_spc_total bigint not null default 0,
    purchase_headquarters_total bigint not null default 0,
    purchase_total bigint not null default 0,
    pos_total bigint not null default 0,
    memo text not null default '',
    local_updated_at timestamptz not null default now(),
    synced_at timestamptz not null default now()
);

create table if not exists public.oozy_monthly_delivery_overrides (
    year integer not null,
    month integer not null check (month between 1 and 12),
    baemin bigint not null default 0,
    coupang bigint not null default 0,
    oozy_order bigint not null default 0,
    updated_at timestamptz not null default now(),
    primary key (year, month)
);

create table if not exists public.oozy_sync_status (
    id integer primary key,
    app_version text not null default '',
    generated_at timestamp without time zone,
    daily_count integer not null default 0,
    updated_at timestamptz not null default now()
);

create index if not exists idx_oozy_profiles_role
    on public.oozy_profiles(role);
create index if not exists idx_oozy_daily_sales_date
    on public.oozy_daily_sales(business_date desc);

create or replace function public.oozy_touch_synced_at()
returns trigger
language plpgsql
as $$
begin
    new.synced_at = now();
    return new;
end;
$$;

create or replace function public.oozy_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_oozy_daily_synced_at on public.oozy_daily_sales;
create trigger trg_oozy_daily_synced_at
before update on public.oozy_daily_sales
for each row execute function public.oozy_touch_synced_at();

drop trigger if exists trg_oozy_profiles_updated_at on public.oozy_profiles;
create trigger trg_oozy_profiles_updated_at
before update on public.oozy_profiles
for each row execute function public.oozy_touch_updated_at();

drop trigger if exists trg_oozy_monthly_updated_at on public.oozy_monthly_delivery_overrides;
create trigger trg_oozy_monthly_updated_at
before update on public.oozy_monthly_delivery_overrides
for each row execute function public.oozy_touch_updated_at();

drop trigger if exists trg_oozy_sync_status_updated_at on public.oozy_sync_status;
create trigger trg_oozy_sync_status_updated_at
before update on public.oozy_sync_status
for each row execute function public.oozy_touch_updated_at();

-- Keep anonymous users out. Authenticated access is controlled by RLS below.
revoke all on table public.oozy_profiles from anon, authenticated;
revoke all on table public.oozy_daily_sales from anon, authenticated;
revoke all on table public.oozy_monthly_delivery_overrides from anon, authenticated;
revoke all on table public.oozy_sync_status from anon, authenticated;

grant select on table public.oozy_profiles to authenticated;
grant select, insert, update, delete on table public.oozy_daily_sales to authenticated;
grant select, insert, update, delete on table public.oozy_monthly_delivery_overrides to authenticated;
grant select, insert, update, delete on table public.oozy_sync_status to authenticated;

alter table public.oozy_profiles enable row level security;
alter table public.oozy_daily_sales enable row level security;
alter table public.oozy_monthly_delivery_overrides enable row level security;
alter table public.oozy_sync_status enable row level security;

-- Profile: users can read only their own OOZY role row.
drop policy if exists "oozy profiles read own" on public.oozy_profiles;
create policy "oozy profiles read own"
on public.oozy_profiles
for select to authenticated
using (user_id = (select auth.uid()));

-- OOZY daily sales: admin/viewer can read; admin can write.
drop policy if exists "oozy daily read" on public.oozy_daily_sales;
create policy "oozy daily read"
on public.oozy_daily_sales
for select to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid())
          and p.role in ('admin','viewer')
    )
);

drop policy if exists "oozy daily admin insert" on public.oozy_daily_sales;
create policy "oozy daily admin insert"
on public.oozy_daily_sales
for insert to authenticated
with check (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

drop policy if exists "oozy daily admin update" on public.oozy_daily_sales;
create policy "oozy daily admin update"
on public.oozy_daily_sales
for update to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
)
with check (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

drop policy if exists "oozy daily admin delete" on public.oozy_daily_sales;
create policy "oozy daily admin delete"
on public.oozy_daily_sales
for delete to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

-- Monthly delivery overrides use the same OOZY role rules.
drop policy if exists "oozy monthly read" on public.oozy_monthly_delivery_overrides;
create policy "oozy monthly read"
on public.oozy_monthly_delivery_overrides
for select to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid())
          and p.role in ('admin','viewer')
    )
);

drop policy if exists "oozy monthly admin insert" on public.oozy_monthly_delivery_overrides;
create policy "oozy monthly admin insert"
on public.oozy_monthly_delivery_overrides
for insert to authenticated
with check (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

drop policy if exists "oozy monthly admin update" on public.oozy_monthly_delivery_overrides;
create policy "oozy monthly admin update"
on public.oozy_monthly_delivery_overrides
for update to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
)
with check (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

drop policy if exists "oozy monthly admin delete" on public.oozy_monthly_delivery_overrides;
create policy "oozy monthly admin delete"
on public.oozy_monthly_delivery_overrides
for delete to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

-- Sync status is readable by admin/viewer and writable only by admin.
drop policy if exists "oozy sync read" on public.oozy_sync_status;
create policy "oozy sync read"
on public.oozy_sync_status
for select to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid())
          and p.role in ('admin','viewer')
    )
);

drop policy if exists "oozy sync admin insert" on public.oozy_sync_status;
create policy "oozy sync admin insert"
on public.oozy_sync_status
for insert to authenticated
with check (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

drop policy if exists "oozy sync admin update" on public.oozy_sync_status;
create policy "oozy sync admin update"
on public.oozy_sync_status
for update to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
)
with check (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

drop policy if exists "oozy sync admin delete" on public.oozy_sync_status;
create policy "oozy sync admin delete"
on public.oozy_sync_status
for delete to authenticated
using (
    exists (
        select 1 from public.oozy_profiles p
        where p.user_id=(select auth.uid()) and p.role='admin'
    )
);

-- Existing KCEM/UWash admins automatically receive the same OOZY admin role.
insert into public.oozy_profiles(user_id, display_name, role)
select distinct u.id, coalesce(u.email, '통합 관리자'), 'admin'
from auth.users u
where
    exists (
        select 1 from public.kcem_user_roles k
        where k.user_id=u.id and k.role='admin'
    )
    or exists (
        select 1 from public.uwash_user_roles w
        where w.user_id=u.id and w.role='admin'
    )
on conflict (user_id)
do update set role='admin', updated_at=now();

-- Recreate the helper now that oozy_profiles definitely exists.
create or replace function public.oozy_unify_my_admin_roles()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := (select auth.uid());
    allowed boolean := false;
    email_text text := '';
begin
    if uid is null then
        raise exception 'Authentication required';
    end if;

    select
        exists(select 1 from public.oozy_profiles p where p.user_id=uid and p.role='admin')
        or exists(select 1 from public.kcem_user_roles k where k.user_id=uid and k.role='admin')
        or exists(select 1 from public.uwash_user_roles w where w.user_id=uid and w.role='admin')
    into allowed;

    if not allowed then
        raise exception 'Current user is not an admin in OOZY, KCEM, or UWash';
    end if;

    select coalesce(email,'') into email_text from auth.users where id=uid;

    insert into public.oozy_profiles(user_id, display_name, role)
    values(uid, case when email_text='' then '통합 관리자' else email_text end, 'admin')
    on conflict (user_id) do update set role='admin', updated_at=now();

    insert into public.kcem_user_roles(user_id, role)
    values(uid, 'admin')
    on conflict (user_id) do update set role='admin', updated_at=now();

    insert into public.uwash_user_roles(user_id, role)
    values(uid, 'admin')
    on conflict (user_id) do update set role='admin', updated_at=now();

    return jsonb_build_object('ok',true,'user_id',uid,'role','admin');
end;
$$;

revoke all on function public.oozy_unify_my_admin_roles() from public, anon;
grant execute on function public.oozy_unify_my_admin_roles() to authenticated;

commit;

-- Verification: these four rows should all be returned.
select 'oozy_profiles' as object_name, count(*)::bigint as row_count from public.oozy_profiles
union all
select 'oozy_daily_sales', count(*) from public.oozy_daily_sales
union all
select 'oozy_monthly_delivery_overrides', count(*) from public.oozy_monthly_delivery_overrides
union all
select 'oozy_sync_status', count(*) from public.oozy_sync_status;
