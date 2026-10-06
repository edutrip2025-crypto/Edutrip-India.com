# Chennai exposure visit registration

Programme dates from the supplied itinerary: 28–31 October 2026, including return travel. Institution bookings and transport timings still need organiser confirmation.

The government annexure lists Hyderabad 3, Sangareddy 44, Medak 31 and Medchal–Malkajgiri 25 schools: **103 schools**. Officials and accompanying visitors are additional travellers. The form does not impose a 103-person cap.

## Website

Page: `/chennai-registration.html`; Vercel also routes `/chennai-registration` to this page. The existing public address is `https://www.edutripindia.com/chennai-registration`. The requested domain is `https://www.registrationpmshri.edutripindia.com/`; its root is configured to show the registration page once the domain is connected in Vercel and DNS.

The form contains all requested fields plus role, institution, mobile number, optional email, emergency-contact name/relationship, accessibility needs and consent. UDISE code and Mandal have been removed; the backend keeps their legacy columns null for new registrations. No Aadhaar number or Aadhaar copy is collected. Dietary exclusions allow multiple selections, exclusive None, and required Other details. Medical information can be declared privately by telephone. JPG/PNG photos are limited to 2 MB. Personal details are not saved to browser storage.

## Supabase connection

Selected project: **founders@edutripindia.com's Project**, `vrmubjmgwlbypfwctwgq`.

- Database: `public.chennai_registrations_2026`, RLS enabled, no anon/authenticated table privileges.
- Private bucket: `chennai-passport-photos-2026`, limited to JPEG/PNG and 2 MB.
- Edge Function: `chennai-registration`, platform JWT verification enabled.
- Frontend configuration: `assets/chennai-registration-config.js`, public anon JWT only. Service-role credentials stay in the Edge Function environment.
- API allows only POST and OPTIONS and never exposes records or photo URLs. Allowed browser origins are the two Edutrip domain variants, `https://www.registrationpmshri.edutripindia.com`, and localhost port 304 for testing.

The public form uses a public anon JWT to call a write-only function. This is not participant identity verification. The server validates all fields, checks photo signatures and limits request size. Honeypot and per-instance IP throttling reduce casual abuse; throttling does not provide a global distributed limit. Repeated registrations from new page visits can still occur; organisers should reconcile duplicates by school, name and mobile before bookings.

## Connect the requested registration domain

You already own `edutripindia.com`; the requested address is a subdomain and does not require buying another domain.

1. In [Vercel](https://vercel.com/dashboard), open the existing project that serves `www.edutripindia.com`.
2. Open **Settings → Domains → Add Domain** and enter `www.registrationpmshri.edutripindia.com`. Assign it to Production and serve this project; do not select a redirect to the main website.
3. Copy the CNAME target Vercel displays for this exact domain. Do not substitute an example target; Vercel uses project-specific targets.
4. Open the authoritative DNS manager for `edutripindia.com` and add a record:

| DNS field | Value |
| --- | --- |
| Type | CNAME |
| Name / Host | `www.registrationpmshri` |
| Target / Value | Exact target shown by Vercel |
| TTL | Auto / default |

If your DNS provider requires a full name, use `www.registrationpmshri.edutripindia.com`. If Cloudflare is your DNS provider, begin with DNS only (grey cloud) while verifying the domain.

5. Save the record, then return to Vercel and wait for valid domain configuration and SSL certificate issuance. Complete any TXT ownership verification Vercel requests using its exact values.
6. Open `https://www.registrationpmshri.edutripindia.com/`; the registration page should appear. Check the logos, district dropdown, medical declaration, Other food restrictions, photo upload and submit button.

Only the new subdomain record is needed. Keep the existing apex/www and email DNS records in place. Setup guidance: [Vercel custom domain documentation](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

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
# Staff dashboard and retention

Staff can use https://app.edutripindia.com/admin/ops/registrations/pm-shri-chennai after signing in with an authorised Ops/SuperAdmin account. The admin endpoint verifies Firebase signatures, issuer and audience for the live `edutrip-web` project. Public and ordinary participant requests cannot list records or obtain photos.

Possible duplicates match normalised name + date of birth or mobile + date of birth. Staff compare both records and explicitly confirm which one to remove from the active list. Removed records remain private until the programme retention deadline. Atomic database row locks prevent two concurrent reviewers from removing both records.

The trip ends 31 October 2026; records are retained through 30 November. Cleanup is scheduled daily at 19:00 UTC (00:30 India time) and refuses to run before `2026-11-30T18:30:00Z`. The `chennai-retention` function authenticates a private Vault-held job token by its SHA-256 hash, deletes the programme's expired records and private photos, and retries failures on subsequent scheduled runs. The registration submission endpoint closes at the same deadline. Check Supabase Cron job `chennai-2026-retention`, `cron.job_run_details`, and `net._http_response` for cleanup completion or errors after the deadline. Provider copies and platform backups are addressed separately in the published Data Handling Policy. Remove separately created staff exports at the same deadline.

Applied migration: `supabase/chennai-admin-retention.sql`. Edge functions: `chennai-registrations-admin` (custom Firebase JWT authentication) and `chennai-retention` (custom secret authentication). Both intentionally disable Supabase JWT checking because their own authentication is implemented in the function; neither is an anonymous privileged endpoint.

## Registration downloads and references

The staff dashboard now provides Download Excel and Download photos. Excel includes all active registrations, independent of search filters, with an airline manifest and full-details sheet. The photo ZIP uses reference folders and participant filenames such as REGCHN0001/Raghavendra_Photo.jpg, preserving JPEG/PNG formats. Existing portraits are copied to named paths before their database pointers change; new uploads receive isolated attempt folders with named files. Staff may confirm individual deletion using the trash icon; inactive records are excluded from dashboard counts and exports and remain private until scheduled retention cleanup.

The applied migration `supabase/chennai-references.sql` assigns persistent sequential REGCHN0001 references, backfills existing records chronologically, and uses a transactional counter for concurrent submissions. Internal UUIDs still support idempotent retries. Numbers are never reused after removal. Both the participant page and staff app use the existing Edutrip favicon.
