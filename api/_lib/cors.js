// api/_lib/cors.js
'use strict';

function setCors(res, origin) {
  if (!origin) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
}

function handleOptions(req, res, origin) {
  if (req.method !== 'OPTIONS') return false;
  setCors(res, origin);
  res.statusCode = 204;
  res.end();
  return true;
}

module.exports = {
  setCors,
  handleOptions,
};
