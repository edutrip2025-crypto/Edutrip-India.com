alter table public.chennai_registrations_2026
  add column removed_at timestamptz,
  add column removed_by text,
  add column duplicate_of uuid,
  add column expires_at timestamptz not null default '2026-11-30 18:30:00+00';
create function public.resolve_chennai_duplicate(remove_id uuid, keep_id uuid, actor text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if remove_id = keep_id then return false; end if;
  perform id from public.chennai_registrations_2026 where id in (remove_id,keep_id) order by id for update;
  if not exists(select 1 from public.chennai_registrations_2026 where id=keep_id and removed_at is null)
    or not exists(select 1 from public.chennai_registrations_2026 where id=remove_id and removed_at is null) then return false; end if;
  update public.chennai_registrations_2026 set removed_at=now(),removed_by=actor,duplicate_of=keep_id where id=remove_id;
  return true;
end; $$;
revoke all on function public.resolve_chennai_duplicate(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_chennai_duplicate(uuid,uuid,text) to service_role;
create extension if not exists pg_net with schema extensions;
