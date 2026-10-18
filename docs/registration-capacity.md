# Registration capacity verification — 18 October 2026

The intended burst is 200–300 simultaneous users. Opening or revisiting the registration page serves static website files; it makes no Supabase registration, database, or storage request. Submission is the operation that reads and uploads files and writes a registration.

## Verified

- Production page delivery: 300 simultaneous GET requests, 300 HTTP 200 responses with the registration form, no failures. Total observed duration 1.961 seconds; median 1.429 seconds and p95 1.581 seconds from the test machine. This is one measured burst, not a latency guarantee.
- Handler simulation: 300 concurrent submissions from one shared IP followed by 300 retries. Exactly 300 records and 600 files in simulated upstream services; no rate-limit rejection or duplicate records. This does not measure hosted database/storage throughput or full-size concurrent uploads.
- The prepared patch passes 37 tests, including concurrency, excess-traffic rejection, duplicate protection, uncertain saves, upload failures, and retry delays. The increased shared-IP allowance still requires explicit approval before deployment.
- Earlier production browser verification stored a 2,097,152-byte photo and 5,242,880-byte synthetic Aadhaar file. Retrying returned the original reference and retained exactly two files. The QA registration was hidden from operations afterward.

## Changes for the stated burst

The production per-worker allowance is currently 40 new request IDs per shared IP in ten minutes. The prepared proposal is 600 to accommodate 300 people behind one school Wi-Fi or carrier NAT with headroom. Automatic approval review blocked deploying that abuse-control adjustment pending explicit user approval. Existing request IDs do not consume additional slots. Excess new IDs receive HTTP 429 and Retry-After. The in-memory limit is best effort per worker, not a global rate limiter.

Client retries now include a random stagger and respect short Retry-After delays. This reduces synchronized retries when a temporary service interruption affects many phones.

## Remaining infrastructure limit

The connected Supabase organization is on the Free plan. Its published file-storage allowance is 1 GB. Object metadata in this project totaled approximately 76 MB at inspection; this is not an organization-wide billing usage measurement.

At the permitted file limits, 300 actual registrations store:

`300 × (2,097,152 + 5,242,880) = 2,202,009,600 bytes` (about 2.2 GB), before existing files or interrupted-upload remnants.

The Free storage allowance is insufficient for that worst case. If 300 actual uploads are expected, obtain sufficient storage capacity before the burst. Supabase Pro currently starts at USD 25/month and includes 100 GB file storage; account/project additions can affect billing. Changing billing requires the account owner's action. No paid upgrade was performed.

Sources: [Supabase pricing](https://supabase.com/pricing), [Edge Function limits](https://supabase.com/docs/guides/functions/limits).

A successful static-page burst and simulated handler tests do not certify 300 simultaneous full-size production uploads. A controlled hosted upload test with sufficient quota is the next capacity-verification step if that specific guarantee is required. Phone connectivity and provider outages remain external dependencies.
