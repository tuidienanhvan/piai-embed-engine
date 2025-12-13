// api/_lib/contentStore.js
'use strict';

/**
 * DEMO: map embedId -> content
 * THỰC TẾ: bạn nên lấy từ backend riêng (DB/MinIO) để không phải redeploy khi đổi nội dung.
 */

const CONTENT = {
  EMBED_ABC: {
    type: 'html',
    html: `
<div class="piai-wrap">
  <div class="piai-hdr">PIAI Secure Embed</div>
  <div class="piai-body">
    <div class="piai-def">
      <div class="piai-def-title">✅ Nội dung được trả từ server</div>
      <div class="piai-def-content">
        Nếu copy embed sang domain khác, API sẽ từ chối và iframe chỉ hiện UNAUTHORIZED.
      </div>
    </div>
  </div>
</div>
    `.trim(),
  },
};

async function getContent(embedId) {
  return CONTENT[embedId] || null;
}

module.exports = { getContent };
