// api/_lib/token.js
'use strict';

const crypto = require('crypto');

function b64urlEncode(bufOrStr) {
  const b = Buffer.isBuffer(bufOrStr) ? bufOrStr : Buffer.from(String(bufOrStr), 'utf8');
  return b.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecodeToString(b64url) {
  const s = String(b64url).replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Buffer.from(s + pad, 'base64').toString('utf8');
}

function hmacSha256(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

function timingSafeEq(a, b) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

/**
 * token = base64url(payloadJson) + "." + base64url(hmac(payloadB64))
 * payload: { embedId, origin, exp }
 */
function signToken(secret, payloadObj) {
  const payloadJson = JSON.stringify(payloadObj);
  const payloadB64 = b64urlEncode(payloadJson);
  const sig = b64urlEncode(hmacSha256(secret, payloadB64));
  return `${payloadB64}.${sig}`;
}

function verifyToken(secret, token) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'no_token' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, error: 'bad_format' };

  const [payloadB64, sigB64] = parts;
  const expected = b64urlEncode(hmacSha256(secret, payloadB64));

  if (!timingSafeEq(sigB64, expected)) return { ok: false, error: 'bad_sig' };

  let payload;
  try {
    payload = JSON.parse(b64urlDecodeToString(payloadB64));
  } catch (_) {
    return { ok: false, error: 'bad_payload' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || typeof payload.exp !== 'number') return { ok: false, error: 'no_exp' };
  if (payload.exp < now) return { ok: false, error: 'expired' };

  return { ok: true, payload };
}

module.exports = {
  signToken,
  verifyToken,
};
