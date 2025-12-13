/* build-embed.js */
'use strict';

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC = path.join(__dirname, 'public', 'piai-embed-engine.js');
const OUT_MIN = path.join(__dirname, 'public', 'piai-embed-engine.min.js');
const OUT_OBF = path.join(__dirname, 'public', 'piai-embed-engine.obf.js');

(async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('❌ Missing:', SRC);
    process.exit(1);
  }

  const code = fs.readFileSync(SRC, 'utf8');

  // 1) MINIFY
  const min = await minify(code, {
    compress: {
      passes: 2,
      drop_console: false,
      drop_debugger: true,
    },
    mangle: { toplevel: true },
    format: { comments: false },
  });

  if (!min || !min.code) {
    console.error('❌ Minify failed');
    process.exit(1);
  }

  fs.writeFileSync(OUT_MIN, min.code, 'utf8');
  console.log('✅ Wrote:', OUT_MIN);

  // 2) OBFUSCATE (trên bản min)
  const obf = JavaScriptObfuscator.obfuscate(min.code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.2,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.05,
    stringArray: true,
    stringArrayThreshold: 0.7,
    splitStrings: true,
    splitStringsChunkLength: 10,
    numbersToExpressions: true,
    simplify: true,
    renameGlobals: false,
    selfDefending: true,
  });

  fs.writeFileSync(OUT_OBF, obf.getObfuscatedCode(), 'utf8');
  console.log('✅ Wrote:', OUT_OBF);

  console.log('\nDone. Use: /piai-embed-engine.min.js or /piai-embed-engine.obf.js');
})().catch((e) => {
  console.error('❌ Build error:', e);
  process.exit(1);
});
