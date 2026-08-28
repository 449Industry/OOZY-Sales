-- OOZY 통합 관리자 웹 v1.0.0
-- 목적: 같은 Supabase Auth 계정 하나로 OOZY / KCEM / UWash 조회 권한을 통합합니다.
-- 기존 테이블/데이터는 수정하지 않고, 기존 관리자 UID의 역할 행만 맞춥니다.
-- Supabase Dashboard > SQL Editor에서 한 번 실행하세요.

begin;

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

    select exists(select 1 from public.oozy_profiles p where p.user_id=uid and p.role='admin')
        or exists(select 1 from public.kcem_user_roles k where k.user_id=uid and k.role='admin')
        or exists(select 1 from public.uwash_user_roles u where u.user_id=uid and u.role='admin')
      into allowed;

    if not allowed then
        raise exception 'Current user is not an admin in OOZY, KCEM, or UWash';
    end if;

    select coalesce(email,'') into email_text from auth.users where id=uid;

    insert into public.oozy_profiles(user_id, display_name, role)
    values(uid, case when email_text='' then '통합 관리자' else email_text end, 'admin')
    on conflict (user_id) do update set role='admin';

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

-- ------------------------------------------------------------------
-- 새 Auth 계정을 통합 관리자로 처음 지정해야 하는 경우에만 아래를 사용합니다.
-- 1) Supabase > Authentication > Users 에서 이메일/비밀번호 계정을 먼저 생성
-- 2) ADMIN_EMAIL을 실제 이메일로 바꾸고 아래 블록을 별도로 실행
-- ------------------------------------------------------------------
-- do $$
-- declare uid uuid;
-- begin
--   select id into uid from auth.users where email='ADMIN_EMAIL' limit 1;
--   if uid is null then raise exception 'ADMIN_EMAIL Auth user not found'; end if;
--   insert into public.oozy_profiles(user_id,display_name,role) values(uid,'통합 관리자','admin')
--     on conflict(user_id) do update set role='admin';
--   insert into public.kcem_user_roles(user_id,role) values(uid,'admin')
--     on conflict(user_id) do update set role='admin',updated_at=now();
--   insert into public.uwash_user_roles(user_id,role) values(uid,'admin')
--     on conflict(user_id) do update set role='admin',updated_at=now();
-- end $$;
