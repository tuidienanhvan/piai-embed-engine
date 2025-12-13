// api/content.js
'use strict';

const { EMBED_SECRET, getAllowedOrigins } = require('./_lib/config');
const { verifyToken } = require('./_lib/token');
const { setCors, handleOptions } = require('./_lib/cors');
const { getContent } = require('./_lib/contentStore');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const embedId = (req.query && req.query.embedId) ? String(req.query.embedId) : '';

  // Preflight
  if (handleOptions(req, res, origin)) return;

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!EMBED_SECRET) {
    setCors(res, origin);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'server_not_configured', hint: 'Missing EMBED_SECRET' }));
  }

  if (req.method !== 'GET') {
    setCors(res, origin);
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  if (!embedId) {
    setCors(res, origin);
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'missing_embedId' }));
  }

  // allowlist tồn tại (để CORS trả về đúng origin khi OK)
  const allowed = getAllowedOrigins(embedId);
  if (!allowed) {
    setCors(res, origin);
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'unknown_embedId' }));
  }

  // Nếu bị copy embed sang domain khác, browser vẫn gửi Origin khác → fail
  if (!origin || !allowed.includes(origin)) {
    setCors(res, origin);
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: 'origin_not_allowed', origin }));
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  const vr = verifyToken(EMBED_SECRET, token);
  if (!vr.ok) {
    setCors(res, origin);
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'invalid_token', detail: vr.error }));
  }

  const payload = vr.payload;
  if (payload.embedId !== embedId) {
    setCors(res, origin);
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'embed_mismatch' }));
  }
  if (payload.origin !== origin) {
    setCors(res, origin);
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'origin_mismatch' }));
  }

  const content = await getContent(embedId);
  if (!content) {
    setCors(res, origin);
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'no_content' }));
  }

  setCors(res, origin);
  res.statusCode = 200;
  return res.end(JSON.stringify({ ok: true, embedId, content }));
};
