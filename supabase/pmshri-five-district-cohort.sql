-- Applied through Supabase migration pmshri_five_district_registration_cohort.
alter table public.chennai_registrations_2026 drop constraint chennai_registrations_2026_district_check;
alter table public.chennai_registrations_2026 add constraint chennai_registrations_2026_district_check check (district in ('Wanaparthy','Vikarabad','Nagarkurnool','Narayanpet','Kamareddy')); 
alter table public.chennai_registrations_2026 drop constraint chennai_registrations_2026_date_of_birth_check;
alter table public.chennai_registrations_2026 add constraint chennai_registrations_2026_date_of_birth_check check (date_of_birth between date '1900-01-01' and current_date);
alter table public.chennai_registrations_2026 alter column programme set default 'PM SHRI Exposure Visit 2026', alter column consent_version set default 'pmshri-2026-v5', alter column expires_at drop not null, alter column expires_at drop default;
-- Old records and uploads were removed; the final district constraint is validated.
-- Once each district's final trip end date is confirmed, set expires_at to
-- midnight India time on the day after its 30-day post-trip retention period.
-- The JWT- and secret-authenticated retention worker deletes only expired rows
-- and the private upload paths referenced by those rows. No bucket-wide purge.
