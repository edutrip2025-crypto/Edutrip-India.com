const codes = new Set(['FILE_PHOTO','FILE_AADHAAR','UPLOAD_CONNECTION','UPLOAD_TIMEOUT','UPLOAD_RESPONSE','UPLOAD_SERVER','UPLOAD_UNKNOWN','BODY_READ','DATABASE_LOOKUP','ITINERARY_LINK','PHOTO_UPLOAD','AADHAAR_UPLOAD','DATABASE_SAVE']);
const origins = new Set(['https://www.edutripindia.com','https://edutripindia.com','https://www.registrationpmshri.edutripindia.com']);

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers.origin && !origins.has(req.headers.origin)) return res.status(403).end();
  if (Number(req.headers['content-length'] || 0) > 512) return res.status(413).end();
  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > 512) return res.status(413).end();
    try { body = JSON.parse(body); } catch { return res.status(400).end(); }
  }
  if (!body || !codes.has(body.code) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id || '')
      || !Number.isInteger(body.status) || body.status < 0 || body.status > 599) return res.status(400).end();
  // Allow-listed properties only: no names, contact details, identity documents or raw errors.
  console.warn(JSON.stringify({event:'chennai_upload_failure',request_id:body.request_id,code:body.code,status:body.status}));
  return res.status(204).end();
};
