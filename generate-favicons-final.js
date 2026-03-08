/**
 * Generates favicon.ico (16/32/48px) + PNG fallbacks from favicon_FVS.svg
 * Uses sharp (already a dependency in package.json)
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, 'assets', 'favicon_FVS.svg');
const svgBuffer = fs.readFileSync(SVG_PATH);

function createIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + count * dirEntrySize;

  const offsets = [];
  let offset = dirSize;
  for (const buf of pngBuffers) {
    offsets.push(offset);
    offset += buf.length;
  }

  const result = Buffer.alloc(offset);
  result.writeUInt16LE(0, 0);     // reserved
  result.writeUInt16LE(1, 2);     // type = ICO
  result.writeUInt16LE(count, 4); // image count

  for (let i = 0; i < count; i++) {
    const e = headerSize + i * dirEntrySize;
    const sz = sizes[i];
    result.writeUInt8(sz >= 256 ? 0 : sz, e);      // width
    result.writeUInt8(sz >= 256 ? 0 : sz, e + 1);  // height
    result.writeUInt8(0, e + 2);   // color count
    result.writeUInt8(0, e + 3);   // reserved
    result.writeUInt16LE(1, e + 4); // color planes
    result.writeUInt16LE(32, e + 6); // bits per pixel
    result.writeUInt32LE(pngBuffers[i].length, e + 8);  // data size
    result.writeUInt32LE(offsets[i], e + 12);            // data offset
    pngBuffers[i].copy(result, offsets[i]);
  }
  return result;
}

async function main() {
  const icoSizes = [16, 32, 48];
  const pngs = await Promise.all(
    icoSizes.map(sz => sharp(svgBuffer).resize(sz, sz).png().toBuffer())
  );

  // favicon.ico at root
  const ico = createIco(pngs, icoSizes);
  fs.writeFileSync(path.join(__dirname, 'favicon.ico'), ico);
  console.log('✓ favicon.ico generated (16/32/48px)');

  // favicon-32x32.png in assets/
  fs.writeFileSync(path.join(__dirname, 'assets', 'favicon-32x32.png'), pngs[1]);
  console.log('✓ assets/favicon-32x32.png generated');

  // apple-touch-icon.png 180x180 in assets/
  const apple = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(__dirname, 'assets', 'apple-touch-icon.png'), apple);
  console.log('✓ assets/apple-touch-icon.png generated');

  // favicon-192x192.png for webmanifest
  const png192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(__dirname, 'assets', 'favicon-192x192.png'), png192);
  console.log('✓ assets/favicon-192x192.png generated');

  console.log('\nDone. Deploy the new favicon.ico to the root of your site.');
}

main().catch(console.error);
