const sharp = require('sharp');
const fs = require('fs');

async function forceUpdateFavicons() {
  try {
    console.log('🔄 Force mise à jour des favicons avec vos vrais logos...');
    
    // Logo football adaptatif (basé sur vos vraies images)
    const realLogoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <style>
    .logo-light { display: block; }
    .logo-dark { display: none; }
    @media (prefers-color-scheme: dark) {
      .logo-light { display: none; }
      .logo-dark { display: block; }
    }
  </style>
  
  <!-- Logo pour mode clair (ballon simple noir) -->
  <g class="logo-light">
    <!-- Cercle principal du ballon -->
    <circle cx="16" cy="16" r="12.5" fill="none" stroke="#000000" stroke-width="1.5"/>
    
    <!-- Pentagone central -->
    <polygon points="16,6 19,9.5 17.5,13.5 14.5,13.5 13,9.5" 
             fill="none" stroke="#000000" stroke-width="1.2"/>
    
    <!-- Hexagones autour du pentagone -->
    <path d="M13,9.5 L16,6 L12,4.5 L8.5,7.5 L10,11 Z" 
          fill="none" stroke="#000000" stroke-width="1"/>
    
    <path d="M19,9.5 L23.5,7.5 L20,4.5 L16,6 Z" 
          fill="none" stroke="#000000" stroke-width="1"/>
    
    <path d="M14.5,13.5 L10,11 L8.5,15.5 L11.5,18.5 L17.5,13.5 Z" 
          fill="none" stroke="#000000" stroke-width="1"/>
    
    <path d="M17.5,13.5 L11.5,18.5 L14.5,23 L20,21.5 L23.5,17.5 L19,9.5 Z" 
          fill="none" stroke="#000000" stroke-width="1"/>
    
    <path d="M11.5,18.5 L8.5,15.5 L9.5,20.5 L14.5,23 Z" 
          fill="none" stroke="#000000" stroke-width="1"/>
    
    <path d="M20,21.5 L23.5,17.5 L25,22 L21.5,25 L14.5,23 Z" 
          fill="none" stroke="#000000" stroke-width="1"/>
  </g>
  
  <!-- Logo pour mode sombre (ballon avec rayons blancs) -->
  <g class="logo-dark">
    <!-- Rayons solaires tout autour -->
    <g stroke="#ffffff" stroke-width="1.5" stroke-linecap="round">
      <!-- Rayons cardinaux -->
      <line x1="16" y1="1.5" x2="16" y2="4.5"/>
      <line x1="16" y1="27.5" x2="16" y2="30.5"/>
      <line x1="1.5" y1="16" x2="4.5" y2="16"/>
      <line x1="27.5" y1="16" x2="30.5" y2="16"/>
      
      <!-- Rayons diagonaux -->
      <line x1="5.5" y1="5.5" x2="7.5" y2="7.5"/>
      <line x1="24.5" y1="24.5" x2="26.5" y2="26.5"/>
      <line x1="26.5" y1="5.5" x2="24.5" y2="7.5"/>
      <line x1="7.5" y1="24.5" x2="5.5" y2="26.5"/>
      
      <!-- Rayons intermédiaires -->
      <line x1="10.5" y1="2.5" x2="11.5" y2="5"/>
      <line x1="21.5" y1="2.5" x2="20.5" y2="5"/>
      <line x1="29.5" y1="10.5" x2="27" y2="11.5"/>
      <line x1="29.5" y1="21.5" x2="27" y2="20.5"/>
      <line x1="21.5" y1="29.5" x2="20.5" y2="27"/>
      <line x1="10.5" y1="29.5" x2="11.5" y2="27"/>
      <line x1="2.5" y1="21.5" x2="5" y2="20.5"/>
      <line x1="2.5" y1="10.5" x2="5" y2="11.5"/>
    </g>
    
    <!-- Ballon central avec motifs (fond blanc) -->
    <circle cx="16" cy="16" r="9.5" fill="#ffffff" stroke="#000000" stroke-width="1"/>
    
    <!-- Pentagone central (rempli noir) -->
    <polygon points="16,8.5 18.5,11 17.2,14 14.8,14 13.5,11" 
             fill="#000000"/>
    
    <!-- Hexagones autour (remplis noir) -->
    <path d="M13.5,11 L16,8.5 L13,7.5 L10.5,9.5 L11.5,12.5 Z" 
          fill="#000000"/>
    
    <path d="M18.5,11 L21.5,9.5 L19,7.5 L16,8.5 Z" 
          fill="#000000"/>
    
    <path d="M14.8,14 L11.5,12.5 L10.5,16 L12.5,18 L17.2,14 Z" 
          fill="#000000"/>
  </g>
</svg>`;

    // Supprimer l'ancien et créer le nouveau
    if (fs.existsSync('./assets/favicon-adaptive.svg')) {
      fs.unlinkSync('./assets/favicon-adaptive.svg');
    }
    
    // Écrire le nouveau fichier
    fs.writeFileSync('./assets/favicon-adaptive.svg', realLogoSvg);
    
    console.log('✅ Nouveau favicon SVG adaptatif créé');

    // Régénérer les PNG aussi
    await sharp(Buffer.from(realLogoSvg))
      .png()
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile('./assets/favicon-32x32.png');

    await sharp(Buffer.from(realLogoSvg))
      .png()
      .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toFile('./assets/favicon-16x16.png');

    console.log('✅ PNG mis à jour');
    console.log('🎉 Favicons avec VRAIS logos forcés !');
    console.log('');
    console.log('💡 Pour voir les changements:');
    console.log('1. Actualisez la page (Ctrl+F5)');
    console.log('2. Videz le cache navigateur');
    console.log('3. Ou ouvrez en navigation privée');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

forceUpdateFavicons();