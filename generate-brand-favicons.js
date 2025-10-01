const sharp = require('sharp');
const fs = require('fs');

async function createBrandFavicons() {
  try {
    console.log('🎨 Création des favicons avec les vrais logos de la marque...');
    
    // Logo simple (version outline) - pour mode clair
    const simpleLogoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Ballon de football simple (outline noir) -->
  <circle cx="16" cy="16" r="13" fill="none" stroke="#000000" stroke-width="1.2"/>
  
  <!-- Pentagone central -->
  <polygon points="16,5.5 19.5,9 17.8,13.5 14.2,13.5 12.5,9" 
           fill="none" stroke="#000000" stroke-width="0.8"/>
  
  <!-- Hexagones et formes autour du pentagone -->
  <path d="M12.5,9 L16,5.5 L11.5,3.8 L7.5,7.2 L9.2,11.5 Z" 
        fill="none" stroke="#000000" stroke-width="0.8"/>
  
  <path d="M19.5,9 L24.5,7.2 L20.5,3.8 L16,5.5 Z" 
        fill="none" stroke="#000000" stroke-width="0.8"/>
  
  <path d="M14.2,13.5 L9.2,11.5 L7.5,16.2 L10.8,19.5 L17.8,13.5 Z" 
        fill="none" stroke="#000000" stroke-width="0.8"/>
  
  <path d="M17.8,13.5 L10.8,19.5 L14.5,24.2 L20.5,22.8 L24.2,18.8 L19.5,9 Z" 
        fill="none" stroke="#000000" stroke-width="0.8"/>
  
  <path d="M10.8,19.5 L7.5,16.2 L8.8,21.5 L14.5,24.2 Z" 
        fill="none" stroke="#000000" stroke-width="0.8"/>
  
  <path d="M20.5,22.8 L24.2,18.8 L26.2,23.5 L22.5,26.5 L14.5,24.2 Z" 
        fill="none" stroke="#000000" stroke-width="0.8"/>
</svg>`;

    // Logo avec rayons (version complète) - pour mode sombre
    const sunLogoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Rayons solaires -->
  <g stroke="#ffffff" stroke-width="1.5" stroke-linecap="round">
    <!-- Rayons principaux -->
    <line x1="16" y1="2" x2="16" y2="5"/>
    <line x1="16" y1="27" x2="16" y2="30"/>
    <line x1="2" y1="16" x2="5" y2="16"/>
    <line x1="27" y1="16" x2="30" y2="16"/>
    
    <!-- Rayons diagonaux -->
    <line x1="6.3" y1="6.3" x2="8.5" y2="8.5"/>
    <line x1="23.5" y1="23.5" x2="25.7" y2="25.7"/>
    <line x1="25.7" y1="6.3" x2="23.5" y2="8.5"/>
    <line x1="8.5" y1="23.5" x2="6.3" y2="25.7"/>
    
    <!-- Rayons intermédiaires -->
    <line x1="11.2" y1="3.5" x2="12.3" y2="6.2"/>
    <line x1="20.8" y1="3.5" x2="19.7" y2="6.2"/>
    <line x1="28.5" y1="11.2" x2="25.8" y2="12.3"/>
    <line x1="28.5" y1="20.8" x2="25.8" y2="19.7"/>
    <line x1="20.8" y1="28.5" x2="19.7" y2="25.8"/>
    <line x1="11.2" y1="28.5" x2="12.3" y2="25.8"/>
    <line x1="3.5" y1="20.8" x2="6.2" y2="19.7"/>
    <line x1="3.5" y1="11.2" x2="6.2" y2="12.3"/>
  </g>
  
  <!-- Ballon de football central (rempli blanc) -->
  <circle cx="16" cy="16" r="10" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  
  <!-- Pentagone central (noir) -->
  <polygon points="16,8 18.8,10.5 17.5,14 14.5,14 13.2,10.5" 
           fill="#000000"/>
  
  <!-- Hexagones autour (alternance noir/blanc) -->
  <path d="M13.2,10.5 L16,8 L12.5,6.8 L9.5,9.2 L10.8,12.5 Z" 
        fill="#000000"/>
  
  <path d="M18.8,10.5 L22.5,9.2 L19.5,6.8 L16,8 Z" 
        fill="#000000"/>
  
  <path d="M14.5,14 L10.8,12.5 L9.5,16 L12,18.5 L17.5,14 Z" 
        fill="#000000"/>
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
  
  <!-- Logo pour mode clair (version simple noire) -->
  <g class="logo-light">
    <circle cx="16" cy="16" r="13" fill="none" stroke="#000000" stroke-width="1.2"/>
    <polygon points="16,5.5 19.5,9 17.8,13.5 14.2,13.5 12.5,9" 
             fill="none" stroke="#000000" stroke-width="0.8"/>
    <path d="M12.5,9 L16,5.5 L11.5,3.8 L7.5,7.2 L9.2,11.5 Z" 
          fill="none" stroke="#000000" stroke-width="0.8"/>
    <path d="M19.5,9 L24.5,7.2 L20.5,3.8 L16,5.5 Z" 
          fill="none" stroke="#000000" stroke-width="0.8"/>
    <path d="M14.2,13.5 L9.2,11.5 L7.5,16.2 L10.8,19.5 L17.8,13.5 Z" 
          fill="none" stroke="#000000" stroke-width="0.8"/>
    <path d="M17.8,13.5 L10.8,19.5 L14.5,24.2 L20.5,22.8 L24.2,18.8 L19.5,9 Z" 
          fill="none" stroke="#000000" stroke-width="0.8"/>
    <path d="M10.8,19.5 L7.5,16.2 L8.8,21.5 L14.5,24.2 Z" 
          fill="none" stroke="#000000" stroke-width="0.8"/>
    <path d="M20.5,22.8 L24.2,18.8 L26.2,23.5 L22.5,26.5 L14.5,24.2 Z" 
          fill="none" stroke="#000000" stroke-width="0.8"/>
  </g>
  
  <!-- Logo pour mode sombre (version avec rayons blanche) -->
  <g class="logo-dark">
    <!-- Rayons solaires -->
    <g stroke="#ffffff" stroke-width="1.2" stroke-linecap="round">
      <line x1="16" y1="2" x2="16" y2="5"/>
      <line x1="16" y1="27" x2="16" y2="30"/>
      <line x1="2" y1="16" x2="5" y2="16"/>
      <line x1="27" y1="16" x2="30" y2="16"/>
      <line x1="6.3" y1="6.3" x2="8.5" y2="8.5"/>
      <line x1="23.5" y1="23.5" x2="25.7" y2="25.7"/>
      <line x1="25.7" y1="6.3" x2="23.5" y2="8.5"/>
      <line x1="8.5" y1="23.5" x2="6.3" y2="25.7"/>
      <line x1="11.2" y1="3.5" x2="12.3" y2="6.2"/>
      <line x1="20.8" y1="3.5" x2="19.7" y2="6.2"/>
      <line x1="28.5" y1="11.2" x2="25.8" y2="12.3"/>
      <line x1="28.5" y1="20.8" x2="25.8" y2="19.7"/>
      <line x1="20.8" y1="28.5" x2="19.7" y2="25.8"/>
      <line x1="11.2" y1="28.5" x2="12.3" y2="25.8"/>
      <line x1="3.5" y1="20.8" x2="6.2" y2="19.7"/>
      <line x1="3.5" y1="11.2" x2="6.2" y2="12.3"/>
    </g>
    
    <!-- Ballon central -->
    <circle cx="16" cy="16" r="10" fill="#ffffff" stroke="#ffffff" stroke-width="0.8"/>
    <polygon points="16,8 18.8,10.5 17.5,14 14.5,14 13.2,10.5" fill="#000000"/>
    <path d="M13.2,10.5 L16,8 L12.5,6.8 L9.5,9.2 L10.8,12.5 Z" fill="#000000"/>
    <path d="M18.8,10.5 L22.5,9.2 L19.5,6.8 L16,8 Z" fill="#000000"/>
    <path d="M14.5,14 L10.8,12.5 L9.5,16 L12,18.5 L17.5,14 Z" fill="#000000"/>
  </g>
</svg>`;

    // Sauvegarder les fichiers SVG
    fs.writeFileSync('./assets/logo-brand-black.svg', simpleLogoSvg);
    fs.writeFileSync('./assets/logo-brand-white.svg', sunLogoSvg);
    fs.writeFileSync('./assets/favicon-adaptive.svg', adaptiveLogoSvg);

    console.log('✅ Logos SVG de marque créés');

    // Convertir en PNG avec Sharp - version noire (mode clair)
    await sharp(Buffer.from(simpleLogoSvg))
      .png()
      .resize(32, 32)
      .toFile('./assets/favicon-32x32.png');

    await sharp(Buffer.from(simpleLogoSvg))
      .png()
      .resize(16, 16)
      .toFile('./assets/favicon-16x16.png');

    // Convertir en PNG avec Sharp - version avec rayons (mode sombre)
    await sharp(Buffer.from(sunLogoSvg))
      .png()
      .resize(32, 32)
      .toFile('./assets/favicon-light.png');

    await sharp(Buffer.from(sunLogoSvg))
      .png()
      .resize(16, 16)
      .toFile('./assets/favicon-light-16x16.png');

    // Aussi créer une version pour apple-touch-icon (plus grande)
    await sharp(Buffer.from(sunLogoSvg))
      .png()
      .resize(180, 180)
      .toFile('./assets/apple-touch-icon.png');

    console.log('✅ Favicons PNG générés avec les vrais logos de marque');
    console.log('🎉 Favicons de marque Futbolero créés avec succès !');
    
    console.log('\n📋 Fichiers créés:');
    console.log('- favicon-adaptive.svg (adaptatif automatique)');
    console.log('- favicon-32x32.png (logo simple noir)');
    console.log('- favicon-16x16.png (logo simple noir 16px)');
    console.log('- favicon-light.png (logo avec rayons blanc)');
    console.log('- favicon-light-16x16.png (logo avec rayons blanc 16px)');
    console.log('- apple-touch-icon.png (logo pour iOS/Android)');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des favicons:', error);
  }
}

createBrandFavicons();