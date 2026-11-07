alter table public.chennai_registrations_2026 drop constraint chennai_registrations_2026_district_check;
alter table public.chennai_registrations_2026 add constraint chennai_registrations_2026_district_check check (district in ('Wanaparthy','Vikarabad','Nagarkurnool','Narayanpet','Kamareddy','Nizamabad'));
