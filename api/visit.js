function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return {};
}

const DEFAULT_WINDOW_MINUTES = 30;
const configuredWindowMinutes = Number(process.env.VISIT_ALERT_WINDOW_MINUTES || DEFAULT_WINDOW_MINUTES);
const RATE_LIMIT_WINDOW_MS = Math.max(1, configuredWindowMinutes) * 60 * 1000;

// Best-effort per-instance cooldown cache for alert throttling by IP.
const alertWindowByIp = globalThis.__edutripVisitAlertWindowByIp || new Map();
globalThis.__edutripVisitAlertWindowByIp = alertWindowByIp;

function pruneCooldownMap(nowMs) {
  if (alertWindowByIp.size < 5000) return;
  for (const [ip, lastSentAt] of alertWindowByIp.entries()) {
    if (nowMs - lastSentAt > RATE_LIMIT_WINDOW_MS) {
      alertWindowByIp.delete(ip);
    }
  }
}

function canSendAlertForIp(ip, nowMs) {
  pruneCooldownMap(nowMs);
  const previous = alertWindowByIp.get(ip);
  if (typeof previous === "number" && nowMs - previous < RATE_LIMIT_WINDOW_MS) {
    return false;
  }
  alertWindowByIp.set(ip, nowMs);
  return true;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 2800) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function stripAsnPrefix(orgText) {
  if (typeof orgText !== "string") return null;
  return orgText.replace(/^AS\d+\s+/i, "").trim() || null;
}

function normalizeCompanyPayload(payload, source) {
  if (!payload || typeof payload !== "object") return null;

  const name = payload.name
    || payload.company?.name
    || payload.as?.name
    || payload.asn?.name
    || stripAsnPrefix(payload.org)
    || null;

  const domain = payload.domain
    || payload.company?.domain
    || payload.as?.domain
    || payload.asn?.domain
    || null;

  const industry = payload.category?.industry
    || payload.company?.category?.industry
    || payload.industry
    || null;

  const employees = payload.metrics?.employees
    || payload.company?.metrics?.employees
    || payload.employees
    || null;

  const type = payload.company?.type || payload.as?.type || payload.asn?.type || payload.type || null;

  if (!name && !domain) return null;

  return {
    source,
    name,
    domain,
    industry,
    employees,
    type
  };
}

async function enrichFromIpinfo(ip) {
  const token = process.env.IPINFO_TOKEN;
  if (!token) {
    return { source: "ipinfo", error: "missing_ipinfo_token" };
  }

  const ipParam = encodeURIComponent(ip);
  const endpoints = [
    `https://api.ipinfo.io/lookup/${ipParam}?token=${token}`,
    `https://ipinfo.io/${ipParam}/json?token=${token}`
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchJsonWithTimeout(endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (response.status === 404) continue;
      if (!response.ok) {
        lastError = `status_${response.status}`;
        continue;
      }

      const payload = await response.json();
      const normalized = normalizeCompanyPayload(payload, "ipinfo");
      if (normalized) return normalized;
    } catch (error) {
      lastError = error?.name === "AbortError" ? "timeout" : "request_failed";
    }
  }

  if (lastError) {
    return { source: "ipinfo", error: lastError };
  }

  return null;
}

async function enrichCompanyFromIp(ip) {
  const enabled = String(process.env.VISIT_COMPANY_ENRICHMENT_ENABLED || "false").toLowerCase() === "true";
  if (!enabled) return null;
  if (!ip || ip === "unknown") return null;

  const provider = String(process.env.VISIT_COMPANY_ENRICHMENT_PROVIDER || "ipinfo").toLowerCase();

  try {
    if (provider === "ipinfo") {
      return enrichFromIpinfo(ip);
    }

    if (provider === "clearbit") {
      const clearbitApiKey = process.env.CLEARBIT_API_KEY;
      if (!clearbitApiKey) {
        return { source: "clearbit", error: "missing_clearbit_key" };
      }

      const clearbitUrl = `https://reveal.clearbit.com/v1/companies/find?ip=${encodeURIComponent(ip)}`;
      const response = await fetchJsonWithTimeout(clearbitUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clearbitApiKey}`,
          "Content-Type": "application/json"
        }
      });

      if (response.status === 404) return null;
      if (!response.ok) {
        return { source: "clearbit", error: `status_${response.status}` };
      }

      const payload = await response.json();
      return normalizeCompanyPayload(payload, "clearbit");
    }

    if (provider === "custom") {
      const apiUrl = process.env.VISIT_COMPANY_ENRICHMENT_URL;
      if (!apiUrl) {
        return { source: "custom", error: "missing_custom_url" };
      }

      const authHeader = process.env.VISIT_COMPANY_ENRICHMENT_API_KEY;
      const resolvedUrl = apiUrl.includes("{ip}")
        ? apiUrl.replaceAll("{ip}", encodeURIComponent(ip))
        : `${apiUrl}${apiUrl.includes("?") ? "&" : "?"}ip=${encodeURIComponent(ip)}`;

      const headers = { "Content-Type": "application/json" };
      if (authHeader) {
        headers.Authorization = `Bearer ${authHeader}`;
      }

      const response = await fetchJsonWithTimeout(resolvedUrl, {
        method: "GET",
        headers
      });

      if (response.status === 404) return null;
      if (!response.ok) {
        return { source: "custom", error: `status_${response.status}` };
      }

      const payload = await response.json();
      return normalizeCompanyPayload(payload, "custom");
    }

    return { source: provider, error: "unsupported_provider" };
  } catch (error) {
    return { source: provider, error: error?.name === "AbortError" ? "timeout" : "request_failed" };
  }
}

async function sendViaResend(subject, htmlBody, textBody) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.VISIT_ALERT_TO_EMAIL;
  const from = process.env.VISIT_ALERT_FROM_EMAIL || "Edutrip Alerts <alerts@edutripindia.com>";

  if (!apiKey || !to) {
    return { sent: false, reason: "missing_resend_env" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: htmlBody,
      text: textBody
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  return { sent: true, id: result.id || null };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const body = normalizeBody(req.body);
  const now = new Date();
  const nowMs = now.getTime();

  const visitData = {
    timestamp_utc: now.toISOString(),
    ip: getClientIp(req),
    country: req.headers["x-vercel-ip-country"] || null,
    region: req.headers["x-vercel-ip-country-region"] || null,
    city: req.headers["x-vercel-ip-city"] || null,
    latitude: req.headers["x-vercel-ip-latitude"] || null,
    longitude: req.headers["x-vercel-ip-longitude"] || null,
    user_agent: req.headers["user-agent"] || "unknown",
    path: typeof body.path === "string" ? body.path : "/",
    referrer: typeof body.referrer === "string" ? body.referrer : "",
    timezone: typeof body.timezone === "string" ? body.timezone : "",
    screen: typeof body.screen === "string" ? body.screen : "",
    page_title: typeof body.page_title === "string" ? body.page_title : ""
  };

  const shouldSendEmail = canSendAlertForIp(visitData.ip, nowMs);

  if (!shouldSendEmail) {
    console.log("visit_event_rate_limited", { ...visitData, email_sent: false, rate_limited: true });
    return res.status(200).json({ success: true, email_sent: false, rate_limited: true });
  }

  const company = await enrichCompanyFromIp(visitData.ip);
  const hasCompanyMatch = Boolean(company?.name || company?.domain);
  const companyLine = hasCompanyMatch
    ? `${company.name || "Unknown"}${company.domain ? ` (${company.domain})` : ""}`
    : "No confident company match";

  const locationLine = [visitData.city, visitData.region, visitData.country].filter(Boolean).join(", ") || "Unknown";
  const subject = hasCompanyMatch
    ? `New website visit: ${company.name || company.domain}`
    : `New website visit: ${locationLine}`;

  const textBody = [
    "New website visit recorded.",
    `Time (UTC): ${visitData.timestamp_utc}`,
    `IP: ${visitData.ip}`,
    `Approx location: ${locationLine}`,
    `Company guess: ${companyLine}`,
    `Company source: ${company?.source || "n/a"}`,
    `Company type: ${company?.type || "Unknown"}`,
    `Industry: ${company?.industry || "Unknown"}`,
    `Employees: ${company?.employees || "Unknown"}`,
    `Path: ${visitData.path}`,
    `Referrer: ${visitData.referrer || "Direct / none"}`,
    `Timezone: ${visitData.timezone || "Unknown"}`,
    `Screen: ${visitData.screen || "Unknown"}`,
    `User-Agent: ${visitData.user_agent}`
  ].join("\n");

  const htmlBody = `
    <h2>New Website Visit</h2>
    <p><strong>Time (UTC):</strong> ${visitData.timestamp_utc}</p>
    <p><strong>IP:</strong> ${visitData.ip}</p>
    <p><strong>Approx Location:</strong> ${locationLine}</p>
    <p><strong>Company Guess:</strong> ${companyLine}</p>
    <p><strong>Company Source:</strong> ${company?.source || "n/a"}</p>
    <p><strong>Company Type:</strong> ${company?.type || "Unknown"}</p>
    <p><strong>Industry:</strong> ${company?.industry || "Unknown"}</p>
    <p><strong>Employees:</strong> ${company?.employees || "Unknown"}</p>
    <p><strong>Path:</strong> ${visitData.path}</p>
    <p><strong>Referrer:</strong> ${visitData.referrer || "Direct / none"}</p>
    <p><strong>Timezone:</strong> ${visitData.timezone || "Unknown"}</p>
    <p><strong>Screen:</strong> ${visitData.screen || "Unknown"}</p>
    <p><strong>User-Agent:</strong> ${visitData.user_agent}</p>
  `;

  try {
    const emailResult = await sendViaResend(subject, htmlBody, textBody);
    console.log("visit_event", { ...visitData, company, email_sent: emailResult.sent, rate_limited: false });
    return res.status(200).json({ success: true, email_sent: emailResult.sent, rate_limited: false, company });
  } catch (error) {
    console.error("visit_email_failed", error);
    console.log("visit_event", { ...visitData, company });
    return res.status(200).json({ success: true, email_sent: false, fallback_logged: true, rate_limited: false, company });
  }
};
