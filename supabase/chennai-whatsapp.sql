alter table public.chennai_registrations_2026 add column whatsapp_phone text
  check (whatsapp_phone is null or whatsapp_phone ~ '^[6-9][0-9]{9}$');
