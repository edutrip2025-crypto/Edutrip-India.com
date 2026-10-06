# Chennai exposure visit registration

Programme dates from the supplied itinerary: 28–31 October 2026, including return travel. Institution bookings and transport timings still need organiser confirmation.

The government annexure lists Hyderabad 3, Sangareddy 44, Medak 31 and Medchal–Malkajgiri 25 schools: **103 schools**. Officials and accompanying visitors are additional travellers. The form does not impose a 103-person cap.

## Website

Page: `/chennai-registration.html`; Vercel also routes `/chennai-registration` to this page. The intended public address after website deployment is `https://www.edutripindia.com/chennai-registration`.

The form contains all requested fields plus role, institution, UDISE code for school leaders, mobile number, optional email and mandal, emergency-contact name/relationship, accessibility needs and consent. No Aadhaar number or Aadhaar copy is collected. Dietary exclusions allow multiple selections, exclusive None, and required Other details. Medical information can be declared privately by telephone. JPG/PNG photos are limited to 2 MB. Personal details are not saved to browser storage.

## Supabase connection

Selected project: **founders@edutripindia.com's Project**, `vrmubjmgwlbypfwctwgq`.

- Database: `public.chennai_registrations_2026`, RLS enabled, no anon/authenticated table privileges.
- Private bucket: `chennai-passport-photos-2026`, limited to JPEG/PNG and 2 MB.
- Edge Function: `chennai-registration`, platform JWT verification enabled.
- Frontend configuration: `assets/chennai-registration-config.js`, public anon JWT only. Service-role credentials stay in the Edge Function environment.
- API allows only POST and OPTIONS and never exposes records or photo URLs. Allowed browser origins are the two Edutrip domain variants and localhost port 304 for testing.

The public form uses a public anon JWT to call a write-only function. This is not participant identity verification. The server validates all fields, checks photo signatures and limits request size. Honeypot and per-instance IP throttling reduce casual abuse; throttling does not provide a global distributed limit. Repeated registrations from new page visits can still occur; organisers should reconcile duplicates by school, name and mobile before bookings.

## Organiser access and operations

Use the project's Supabase dashboard with your authorised account. Table Editor shows registrations; filter by district or role and export the necessary columns as CSV. Storage shows photos under registration ID folders. Photos require authorised access or time-limited signed URLs, consistent with [Supabase's private bucket model](https://supabase.com/docs/guides/storage/buckets/fundamentals). No public participant listing or admin page is provided.

For ID cards and venue passes use full name, role, institution, district and photo. Keep medical/emergency details out of general ID-card exports. Reconcile the final traveller list and use only confirmed bookings and pickup points; Medak/Medchal pickup arrangements are not specified in the original itinerary.

If a server write times out, retry from the same open page: the request ID prevents duplicate rows. A connection failure can leave an unreferenced photo. Periodically compare bucket paths with `photo_path` in the table and remove only confirmed unreferenced files through Storage. Handle corrections through the coordinator; the participant form does not permit editing a submitted record.

Retention/deletion timing remains an organiser decision. Do not announce an unconfirmed retention promise. After the programme and required reporting, review what must be retained and remove records and photos no longer needed. Delete both the database row and its Storage object when fulfilling an approved deletion.

## Validation and deployment

Run `node --test tests/chennai-registration.test.mjs`. Serve locally with `python -m http.server 304 --bind 127.0.0.1` and open `http://127.0.0.1:304/chennai-registration.html`.

The SQL source is `supabase/chennai-registration-schema.sql`; it has been applied remotely. Function source is in `supabase/functions/chennai-registration/`. Changes to local Edge Function files must also be redeployed to Supabase.

Deploy the HTML, CSS, frontend script, public config and Vercel route before distributing the public link. The local source directory is not itself a published website.

Verified: eight automated tests covering validation, photo restrictions, write sequencing, retry behaviour, failed-write cleanup and origin/body-size limits. The live endpoint answered preflight with 204, rejected an empty submission with 400, and the anonymous database read returned permission denied. No real participant data has been submitted during testing. A successful live registration/photo upload still needs a final test once the public form is published.

Automatic approval review rejected a temporary live QA cleanup route because it would add privileged deletion access. That route was not deployed and no QA record was created. The production function retains its POST/OPTIONS-only interface.
