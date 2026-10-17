begin;
alter table public.chennai_registrations_2026 drop constraint if exists chennai_registrations_2026_district_check;
alter table public.chennai_registrations_2026 add constraint chennai_registrations_2026_district_check check (district in ('Hyderabad','Sangareddy','Mahbubnagar','Medchal–Malkajgiri'));
alter table public.chennai_registrations_2026 drop constraint if exists chennai_registrations_2026_date_of_birth_check;
alter table public.chennai_registrations_2026 add constraint chennai_registrations_2026_date_of_birth_check check (date_of_birth between date '1900-01-01' and date '2026-10-27');
update public.chennai_registrations_2026 set expires_at = '2026-11-28 18:30:00+00' where expires_at = '2026-11-30 18:30:00+00';
alter table public.chennai_registrations_2026 alter column expires_at set default '2026-11-28 18:30:00+00';
alter table public.chennai_registrations_2026 add column if not exists whatsapp_phone text;
alter table public.chennai_registrations_2026 add column if not exists aadhaar_path text;
alter table public.chennai_registrations_2026 alter column consent_version set default 'chennai-2026-v4';
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('chennai-masked-aadhaar-2026','chennai-masked-aadhaar-2026',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['application/pdf','image/jpeg','image/png'];
commit;
