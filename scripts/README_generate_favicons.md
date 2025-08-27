Generate favicons from the existing logo.png

This repository includes a small script to generate square favicons from `assets/logo.png` using sharp.

Steps:

1. Make sure Node.js is installed (v12+).
2. From the repository root, install sharp:

   npm install sharp

3. Run the generator:

   node scripts/generate-favicons.js

4. The script will write the following files to `assets/`:
   - favicon-16x16.png
   - favicon-32x32.png
   - apple-touch-icon.png (180x180)
   - favicon-48x48.png
   - favicon-64x64.png
   - favicon-192x192.png

5. Commit and push the generated files, or copy them to your deployment assets.

Notes:
- The script uses `fit: 'contain'` with a transparent background, so the logo will be centered and never stretched.
- If you need an `.ico` file, use an external tool (e.g., ImageMagick or an online converter) to combine the PNGs into a multi-resolution ICO.
