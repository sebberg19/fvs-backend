// scripts/generate-favicons.js
// Usage: npm install sharp && node scripts/generate-favicons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const input = path.join(assetsDir, 'logo.png');

const outputs = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'favicon-64x64.png', size: 64 },
  { name: 'favicon-192x192.png', size: 192 }
];

(async function() {
  try {
    if (!fs.existsSync(input)) {
      console.error('Input file not found:', input);
      process.exit(1);
    }

    await Promise.all(outputs.map(async out => {
      const outPath = path.join(assetsDir, out.name);
      await sharp(input)
        .resize({ width: out.size, height: out.size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outPath);
      console.log('Written', outPath);
    }));

    console.log('\nDone. Replace your favicon links in HTML head if needed.');
  } catch (err) {
    console.error('Error generating favicons:', err);
    process.exit(2);
  }
})();
