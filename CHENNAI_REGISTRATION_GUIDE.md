# PM SHRI participant registration

Updated 8 November 2026. The existing registration URL remains https://www.edutripindia.com/chennai-registration. The separate www.registrationpmshri.edutripindia.com hostname currently does not resolve.

Districts: Wanaparthy (21 schools), Vikarabad (30), Nagarkurnool (27), Narayanpet (19), Kamareddy (28), Nizamabad (40). Total: 165 schools; officials and accompanying visitors are additional travellers. No registration cap is imposed.

The form has no destination, venue, fixed travel date or itinerary download. It states: Final trip dates shall be shared with the respective DEO office’s coordinating official. The other participant fields, private uploads, consent, file limits, upload retry protection and staff access remain in place.

Supabase project vrmubjmgwlbypfwctwgq continues using public.chennai_registrations_2026 and the existing private photo and masked Aadhaar buckets. The internal table/bucket names remain unchanged for compatibility. New programme metadata is PM SHRI Exposure Visit 2026 and consent version pmshri-2026-v5. RLS and service-role-only table permissions remain unchanged.

All 115 prior-cohort records (95 active and 20 previously hidden) and 229 private uploads were removed through the authenticated retention worker. No local copy of participant records or uploads was created. One synthetic live submission confirmed the production form and uploads work; its record and two test files were then removed.

Retention remains 30 days after trip completion. Since final dates are not yet confirmed, new records have no expires_at date. Set district-specific expires_at values when final end dates are confirmed. The daily cleanup job now requires both a valid JWT and the existing secret kept in Vault. It deletes only explicitly expired rows and their referenced files. It never purges whole buckets or files belonging to unexpired registrations. Do not restore the old fixed November deadline or bucket-wide cleanup.

Validation: 38 local registration and upload checks pass. A production synthetic submission returned HTTP 201 without an itinerary. Final database and storage counts are checked after removal of the test entry.
