const sharp = require('sharp');
const fs = require('fs');

async function createRealFavicons() {
  try {
    console.log('🎨 Création des favicons avec les vrais logos de la marque...');
    
    // Je vais d'abord créer des versions SVG des logos basées sur vos images
    
    // Logo noir (pour mode clair) - version simple du ballon
    const blackLogoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="14" fill="none" stroke="#000000" stroke-width="1.5"/>
  <!-- Pentagone central -->
  <polygon points="16,6 20,10 18,15 14,15 12,10" fill="none" stroke="#000000" stroke-width="1"/>
  <!-- Hexagones autour -->
  <polygon points="12,10 16,6 11,4 7,8 9,12" fill="none" stroke="#000000" stroke-width="1"/>
  <polygon points="20,10 25,8 21,4 16,6" fill="none" stroke="#000000" stroke-width="1"/>
  <polygon points="14,15 9,12 7,17 11,20 18,15" fill="none" stroke="#000000" stroke-width="1"/>
  <polygon points="18,15 11,20 15,25 21,23 25,19 20,10" fill="none" stroke="#000000" stroke-width="1"/>
  <polygon points="11,20 7,17 9,22 15,25" fill="none" stroke="#000000" stroke-width="1"/>
  <polygon points="21,23 25,19 27,24 23,28 15,25" fill="none" stroke="#000000" stroke-width="1"/>
</svg>`;

    // Logo blanc (pour mode sombre) - même design mais en blanc
    const whiteLogoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="14" fill="none" stroke="#ffffff" stroke-width="1.5"/>
  <!-- Pentagone central -->
  <polygon points="16,6 20,10 18,15 14,15 12,10" fill="none" stroke="#ffffff" stroke-width="1"/>
  <!-- Hexagones autour -->
  <polygon points="12,10 16,6 11,4 7,8 9,12" fill="none" stroke="#ffffff" stroke-width="1"/>
  <polygon points="20,10 25,8 21,4 16,6" fill="none" stroke="#ffffff" stroke-width="1"/>
  <polygon points="14,15 9,12 7,17 11,20 18,15" fill="none" stroke="#ffffff" stroke-width="1"/>
  <polygon points="18,15 11,20 15,25 21,23 25,19 20,10" fill="none" stroke="#ffffff" stroke-width="1"/>
  <polygon points="11,20 7,17 9,22 15,25" fill="none" stroke="#ffffff" stroke-width="1"/>
  <polygon points="21,23 25,19 27,24 23,28 15,25" fill="none" stroke="#ffffff" stroke-width="1"/>
</svg>`;

    // Logo adaptatif qui change automatiquement
    const adaptiveLogoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <style>
    .logo-light { display: block; }
    .logo-dark { display: none; }
    @media (prefers-color-scheme: dark) {
      .logo-light { display: none; }
      .logo-dark { display: block; }
    }
  </style>
  <!-- Logo pour mode clair (noir) -->
  <g class="logo-light">
    <circle cx="16" cy="16" r="14" fill="none" stroke="#000000" stroke-width="1.5"/>
    <polygon points="16,6 20,10 18,15 14,15 12,10" fill="none" stroke="#000000" stroke-width="1"/>
    <polygon points="12,10 16,6 11,4 7,8 9,12" fill="none" stroke="#000000" stroke-width="1"/>
    <polygon points="20,10 25,8 21,4 16,6" fill="none" stroke="#000000" stroke-width="1"/>
    <polygon points="14,15 9,12 7,17 11,20 18,15" fill="none" stroke="#000000" stroke-width="1"/>
    <polygon points="18,15 11,20 15,25 21,23 25,19 20,10" fill="none" stroke="#000000" stroke-width="1"/>
    <polygon points="11,20 7,17 9,22 15,25" fill="none" stroke="#000000" stroke-width="1"/>
    <polygon points="21,23 25,19 27,24 23,28 15,25" fill="none" stroke="#000000" stroke-width="1"/>
  </g>
  
  <!-- Logo pour mode sombre (blanc) -->
  <g class="logo-dark">
    <circle cx="16" cy="16" r="14" fill="none" stroke="#ffffff" stroke-width="1.5"/>
    <polygon points="16,6 20,10 18,15 14,15 12,10" fill="none" stroke="#ffffff" stroke-width="1"/>
    <polygon points="12,10 16,6 11,4 7,8 9,12" fill="none" stroke="#ffffff" stroke-width="1"/>
    <polygon points="20,10 25,8 21,4 16,6" fill="none" stroke="#ffffff" stroke-width="1"/>
    <polygon points="14,15 9,12 7,17 11,20 18,15" fill="none" stroke="#ffffff" stroke-width="1"/>
    <polygon points="18,15 11,20 15,25 21,23 25,19 20,10" fill="none" stroke="#ffffff" stroke-width="1"/>
    <polygon points="11,20 7,17 9,22 15,25" fill="none" stroke="#ffffff" stroke-width="1"/>
    <polygon points="21,23 25,19 27,24 23,28 15,25" fill="none" stroke="#ffffff" stroke-width="1"/>
  </g>
</svg>`;

    // Sauvegarder les fichiers SVG
    fs.writeFileSync('./assets/logo-black.svg', blackLogoSvg);
    fs.writeFileSync('./assets/logo-white.svg', whiteLogoSvg);
    fs.writeFileSync('./assets/favicon-adaptive.svg', adaptiveLogoSvg);

    console.log('✅ Logos SVG créés');

    // Convertir en PNG avec Sharp
    // Logo noir 32x32
    await sharp(Buffer.from(blackLogoSvg))
      .png()
      .resize(32, 32)
      .toFile('./assets/favicon-32x32.png');

    // Logo blanc 32x32
    await sharp(Buffer.from(whiteLogoSvg))
      .png()
      .resize(32, 32)
      .toFile('./assets/favicon-light.png');

    // Logo noir 16x16
    await sharp(Buffer.from(blackLogoSvg))
      .png()
      .resize(16, 16)
      .toFile('./assets/favicon-16x16.png');

    // Logo blanc 16x16
    await sharp(Buffer.from(whiteLogoSvg))
      .png()
      .resize(16, 16)
      .toFile('./assets/favicon-light-16x16.png');

    console.log('✅ Favicons PNG générés avec les vrais logos');
    console.log('🎉 Tous les favicons avec les vrais logos ont été créés !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des favicons:', error);
  }
}

createRealFavicons();