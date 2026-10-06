-- Apply once to the selected remote project using the Supabase migration tool.
create table public.chennai_registrations_2026 (
  id uuid primary key,
  created_at timestamptz not null default now(),
  programme text not null default 'Chennai Exposure Visit 2026',
  full_name text not null,
  date_of_birth date not null check (date_of_birth between date '1900-01-01' and date '2026-10-28'),
  gender text not null,
  mobile text not null check (mobile ~ '^[6-9][0-9]{9}$'),
  email text,
  district text not null check (district in ('Hyderabad','Sangareddy','Medak','Medchal–Malkajgiri')),
  role text not null,
  role_other text,
  institution text not null,
  udise text check (udise is null or udise ~ '^[0-9]{11}$'),
  mandal text,
  meal text not null check (meal in ('Veg','Non Veg')),
  beverage text not null check (beverage in ('Tea','Coffee','Neither')),
  food_restrictions text[] not null,
  food_other text,
  food_notes text,
  medical_declaration text not null,
  medical_details text,
  accessibility text,
  emergency_name text not null,
  emergency_relationship text not null,
  emergency_phone text not null check (emergency_phone ~ '^[6-9][0-9]{9}$'),
  photo_path text not null,
  consent_version text not null default 'chennai-2026-v1',
  consent_at timestamptz not null default now()
);
alter table public.chennai_registrations_2026 enable row level security;
revoke all on public.chennai_registrations_2026 from public, anon, authenticated;
grant select, insert, update, delete on public.chennai_registrations_2026 to service_role;
create index chennai_registrations_2026_district on public.chennai_registrations_2026 (district);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('chennai-passport-photos-2026','chennai-passport-photos-2026',false,2097152,array['image/jpeg','image/png']);
-- No public storage policies are added. The server writes using its service-role key.
