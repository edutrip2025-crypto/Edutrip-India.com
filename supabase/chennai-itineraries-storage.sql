-- District itineraries are non-personal programme documents, but keep the bucket private.
-- Registration receives a short-lived signed link after the record is accepted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chennai-itineraries-2026',
  'chennai-itineraries-2026',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
