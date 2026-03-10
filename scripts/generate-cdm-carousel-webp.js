const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const outputDir = path.join(root, 'images', 'cdm-carousel');

async function main() {
  const html = fs.readFileSync(indexPath, 'utf8');
  const matches = [...html.matchAll(/\{img:'([^']+)',\s*title:'[^']+'\}/g)];
  const uniqueImages = [...new Set(matches.map((match) => match[1]))];

  fs.mkdirSync(outputDir, { recursive: true });

  let created = 0;
  for (const relativeSrc of uniqueImages) {
    const normalizedSrc = relativeSrc.replace(/^\.\//, '');
    const sourcePath = path.join(root, normalizedSrc);
    const fileName = path.basename(relativeSrc).replace(/\.[^.]+$/, '.webp');
    const outputPath = path.join(outputDir, fileName);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`Missing source: ${relativeSrc}`);
      continue;
    }

    await sharp(sourcePath)
      .resize({ width: 340, height: 320, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .toFile(outputPath);

    created += 1;
  }

  console.log(`Created ${created} optimized carousel images.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
