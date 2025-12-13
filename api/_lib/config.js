// api/_lib/config.js
'use strict';

/**
 * ENV cần set trên Vercel:
 * - EMBED_SECRET: chuỗi bí mật để ký token (rất dài)
 * - EMBED_ALLOWLIST_JSON: JSON map embedId -> origins[]
 *   Ví dụ:
 *   {
 *     "EMBED_ABC": ["https://lms.yourdomain.com", "https://preview.yourdomain.com"]
 *   }
 *
 * - TOKEN_TTL_SECONDS (optional): mặc định 90s
 */

function safeJsonParse(s, fallback) {
  try { return JSON.parse(s); } catch (_) { return fallback; }
}

const EMBED_SECRET = process.env.EMBED_SECRET || '';
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 90);

const ALLOWLIST = safeJsonParse(process.env.EMBED_ALLOWLIST_JSON || '{}', {});

if (!EMBED_SECRET) {
  // Không throw để khỏi làm local dev chết ngay, nhưng API sẽ trả lỗi.
}

function getAllowedOrigins(embedId) {
  const list = ALLOWLIST[embedId];
  return Array.isArray(list) ? list : null;
}

module.exports = {
  EMBED_SECRET,
  TOKEN_TTL_SECONDS,
  getAllowedOrigins,
};
