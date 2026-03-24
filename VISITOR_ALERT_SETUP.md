# Visitor Alert Setup

This project now includes a serverless endpoint at `/api/visit` that logs IP-based approximate location and sends an email alert.

## What gets captured

- Visitor IP (`x-forwarded-for`)
- Approximate location from Vercel geo headers (`city`, `region`, `country`)
- Timestamp (UTC)
- Path, referrer, timezone, screen size, user-agent

No GPS location is collected.

## Required environment variables (Vercel)

Set these in your Vercel project settings:

- `RESEND_API_KEY`: API key from Resend
- `VISIT_ALERT_TO_EMAIL`: recipient email for alerts

Optional:

- `VISIT_ALERT_FROM_EMAIL`: sender email (must be verified in Resend)
  - Default used if omitted: `Edutrip Alerts <alerts@edutripindia.com>`
- `VISIT_ALERT_WINDOW_MINUTES`: cooldown window per IP before sending the next alert
  - Default: `30`

## How it works

1. Frontend sends a non-blocking POST request to `/api/visit` once per browser tab session.
2. API extracts IP/location from request headers.
3. API checks per-IP cooldown (default 30 minutes).
4. If not rate-limited, API sends an email via Resend.
5. If rate-limited or email fails, visit data is still written to function logs.

## Notes on rate limiting

- Current rate limiting is **best-effort per serverless instance memory**.
- It reduces duplicate alerts significantly but is not globally strict across all instances.
- For strict global throttling, use Redis/KV as shared storage.

## Test

1. Deploy to Vercel with env vars configured.
2. Open the homepage in a private window.
3. Confirm:
   - API call appears at `/api/visit` in Vercel logs.
   - First visit sends an alert email.
4. Refresh within 30 minutes from same IP and confirm logs show `rate_limited: true`.
