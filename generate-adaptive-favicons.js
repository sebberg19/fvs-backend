const sharp = require('sharp');
const fs = require('fs');

async function createAdaptiveFavicons() {
  try {
    console.log('🎨 Création des favicons adaptatifs...');
    
    // Créer le favicon blanc (pour mode sombre)
    await sharp('./assets/logo.png')
      .resize(32, 32, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fond transparent
      })
      .flatten({ background: '#ffffff' }) // Appliquer un fond blanc
      .png()
      .toFile('./assets/favicon-light.png');
    
    console.log('✅ Favicon blanc créé (favicon-light.png)');
    
    // Créer le favicon noir (pour mode clair)
    await sharp('./assets/logo.png')
      .resize(32, 32, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fond transparent
      })
      .flatten({ background: '#000000' }) // Appliquer un fond noir
      .png()
      .toFile('./assets/favicon-dark.png');
    
    console.log('✅ Favicon noir créé (favicon-dark.png)');
    
    // Créer les versions 16x16
    await sharp('./assets/logo.png')
      .resize(16, 16, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .flatten({ background: '#ffffff' })
      .png()
      .toFile('./assets/favicon-light-16x16.png');
    
    await sharp('./assets/logo.png')
      .resize(16, 16, { 
        fit: 'contain', 
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .flatten({ background: '#000000' })
      .png()
      .toFile('./assets/favicon-dark-16x16.png');
    
    console.log('✅ Favicons 16x16 créés');
    
    // Créer un fichier SVG adaptatif
    const adaptiveSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <style>
    .logo-light { display: block; }
    .logo-dark { display: none; }
    @media (prefers-color-scheme: dark) {
      .logo-light { display: none; }
      .logo-dark { display: block; }
    }
  </style>
  <!-- Logo pour mode clair (fond transparent, logo noir) -->
  <rect class="logo-light" width="32" height="32" fill="transparent"/>
  <text class="logo-light" x="16" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000">F</text>
  
  <!-- Logo pour mode sombre (fond transparent, logo blanc) -->
  <rect class="logo-dark" width="32" height="32" fill="transparent"/>
  <text class="logo-dark" x="16" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff">F</text>
</svg>`;
    
    fs.writeFileSync('./assets/favicon-adaptive.svg', adaptiveSvg);
    console.log('✅ Favicon SVG adaptatif créé');
    
    console.log('🎉 Tous les favicons adaptatifs ont été créés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des favicons:', error);
  }
}

createAdaptiveFavicons();