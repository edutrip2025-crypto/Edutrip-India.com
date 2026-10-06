begin;
lock table public.chennai_registrations_2026 in access exclusive mode;
alter table public.chennai_registrations_2026 add column registration_number bigint unique;
with numbered as (select id, row_number() over (order by created_at, id) n from public.chennai_registrations_2026)
update public.chennai_registrations_2026 r set registration_number = numbered.n from numbered where r.id = numbered.id;
create table public.chennai_registration_counter (singleton boolean primary key default true check(singleton), value bigint not null);
insert into public.chennai_registration_counter select true, coalesce(max(registration_number),0) from public.chennai_registrations_2026;
alter table public.chennai_registration_counter enable row level security;
revoke all on public.chennai_registration_counter from public, anon, authenticated;
create function public.assign_chennai_registration_number() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.chennai_registration_counter set value = value + 1 where singleton = true returning value into new.registration_number;
  return new;
end;
$$;
revoke all on function public.assign_chennai_registration_number() from public, anon, authenticated;
create trigger assign_chennai_registration_number before insert on public.chennai_registrations_2026 for each row execute function public.assign_chennai_registration_number();
alter table public.chennai_registrations_2026 alter column registration_number set not null;
alter table public.chennai_registrations_2026 add column registration_reference text generated always as ('REGCHN' || case when registration_number < 10000 then lpad(registration_number::text,4,'0') else registration_number::text end) stored;
create unique index chennai_registration_reference_unique on public.chennai_registrations_2026 (registration_reference);
commit;
