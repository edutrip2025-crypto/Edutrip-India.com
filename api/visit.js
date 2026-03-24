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

  const locationLine = [visitData.city, visitData.region, visitData.country].filter(Boolean).join(", ") || "Unknown";
  const subject = `New website visit: ${locationLine}`;
  const textBody = [
    "New website visit recorded.",
    `Time (UTC): ${visitData.timestamp_utc}`,
    `IP: ${visitData.ip}`,
    `Approx location: ${locationLine}`,
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
    <p><strong>Path:</strong> ${visitData.path}</p>
    <p><strong>Referrer:</strong> ${visitData.referrer || "Direct / none"}</p>
    <p><strong>Timezone:</strong> ${visitData.timezone || "Unknown"}</p>
    <p><strong>Screen:</strong> ${visitData.screen || "Unknown"}</p>
    <p><strong>User-Agent:</strong> ${visitData.user_agent}</p>
  `;

  try {
    const emailResult = await sendViaResend(subject, htmlBody, textBody);
    console.log("visit_event", { ...visitData, email_sent: emailResult.sent });
    return res.status(200).json({ success: true, email_sent: emailResult.sent });
  } catch (error) {
    console.error("visit_email_failed", error);
    console.log("visit_event", visitData);
    return res.status(200).json({ success: true, email_sent: false, fallback_logged: true });
  }
};
