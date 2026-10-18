# Registration capacity verification — 18 October 2026

The user clarified the target as 200–300 simultaneous page visitors and only 110 registrations in total. Opening or revisiting the registration page serves static website files; it makes no Supabase registration, database, or storage request. Submission is the operation that reads and uploads files and writes a registration.

## Verified

- Production page delivery: 300 simultaneous GET requests, 300 HTTP 200 responses with the registration form, no failures. Total observed duration 1.961 seconds; median 1.429 seconds and p95 1.581 seconds from the test machine. This is one measured burst, not a latency guarantee.
- Handler simulation: 110 concurrent submissions from one shared IP followed by 110 retries. Exactly 110 records and 220 files in simulated upstream services; no rate-limit rejection or duplicate records. This does not measure hosted database/storage throughput or full-size concurrent uploads.
- The regression suite passes 37 tests, including concurrency, excess-traffic rejection, duplicate protection, uncertain saves, upload failures, and retry delays.
- Earlier production browser verification stored a 2,097,152-byte photo and 5,242,880-byte synthetic Aadhaar file. Retrying returned the original reference and retained exactly two files. The QA registration was hidden from operations afterward.

## Changes for the stated burst

The old per-worker allowance was 40 new request IDs per shared IP in ten minutes. After the scope clarification, the user explicitly approved 150 per shared IP per ten minutes. The updated allowance accommodates all 110 registrants behind one school Wi-Fi or carrier NAT with headroom. Existing request IDs do not consume additional slots. Excess new IDs receive HTTP 429 and Retry-After. The in-memory limit is best effort per worker, not a global rate limiter.

Client retries now include a random stagger and respect short Retry-After delays. This reduces synchronized retries when a temporary service interruption affects many phones.

## Remaining infrastructure limit

The connected Supabase organization is on the Free plan. Its published file-storage allowance is 1 GB. Object metadata in this project totaled approximately 76 MB at inspection; this is not an organization-wide billing usage measurement.

At the permitted file limits, 110 actual registrations store:

`110 × (2,097,152 + 5,242,880) = 807,403,520 bytes` (about 807 MB), before existing files or interrupted-upload remnants. Added to the approximately 76 MB observed in this project, this is approximately 883 MB, below the published 1 GB Free allowance. Other organization-wide usage and future orphaned uploads can reduce that headroom.

The clarified 110-registration total does not establish a storage-upgrade requirement from these observed project figures. If the total increases, recalculate usage: 300 maximum-size registrations alone would require approximately 2.2 GB and exceed the Free allowance. Changing billing requires the account owner's action. No paid upgrade was performed.

Sources: [Supabase pricing](https://supabase.com/pricing), [Edge Function limits](https://supabase.com/docs/guides/functions/limits).

A successful static-page burst and simulated handler tests do not certify 110 simultaneous full-size production uploads. A controlled hosted upload test is the next capacity-verification step if that specific guarantee is required. Phone connectivity and provider outages remain external dependencies.
