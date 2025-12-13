// api/issue-token.js
'use strict';

const { EMBED_SECRET, TOKEN_TTL_SECONDS, getAllowedOrigins } = require('./_lib/config');
const { signToken } = require('./_lib/token');
const { setCors, handleOptions } = require('./_lib/cors');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const embedId = (req.query && req.query.embedId) ? String(req.query.embedId) : '';

  // Preflight
  if (handleOptions(req, res, origin)) return;

  res.setHeader('Cache-Control', 'no-store');

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

  const allowed = getAllowedOrigins(embedId);
  if (!allowed) {
    setCors(res, origin);
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'unknown_embedId' }));
  }

  // Browser không spoof được Origin → chặn copy embed qua domain khác
  if (!origin || !allowed.includes(origin)) {
    setCors(res, origin);
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: 'origin_not_allowed', origin }));
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(10, TOKEN_TTL_SECONDS);

  const token = signToken(EMBED_SECRET, { embedId, origin, exp });

  setCors(res, origin);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 200;
  return res.end(JSON.stringify({ token, exp, ttl: TOKEN_TTL_SECONDS }));
};
