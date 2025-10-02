const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateExactFavicons() {
    console.log('🎯 Génération des favicons avec vos logos exacts...');
    
    try {
        // Lire vos SVG exacts
        const noirSvg = fs.readFileSync('./svg/noir.svg', 'utf8');
        const blancSvg = fs.readFileSync('./svg/blanc.svg', 'utf8');
        
        console.log('✅ SVG originaux chargés');
        
        // Créer un SVG adaptatif qui utilise exactement vos logos
        const adaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 249.62 191.17">
  <defs>
    <style>
      .light-mode { display: block; }
      .dark-mode { display: none; }
      
      @media (prefers-color-scheme: dark) {
        .light-mode { display: none; }
        .dark-mode { display: block; }
      }
    </style>
  </defs>
  
  <!-- Version claire (logo noir) -->
  <g class="light-mode">
    ${noirSvg.replace(/<\?xml[^>]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
  
  <!-- Version sombre (logo blanc) -->
  <g class="dark-mode">
    ${blancSvg.replace(/<\?xml[^>]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
</svg>`;

        // Sauvegarder le favicon adaptatif
        fs.writeFileSync('./assets/favicon-adaptive.svg', adaptiveSvg);
        console.log('✅ Favicon adaptatif créé avec vos logos exacts');
        
        // Créer les versions PNG avec vos logos
        console.log('🔄 Génération des PNG...');
        
        // PNG 32x32 (version noire)
        await sharp(Buffer.from(noirSvg))
            .resize(32, 32, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png()
            .toFile('./assets/favicon-32x32.png');
            
        // PNG 16x16 (version noire)
        await sharp(Buffer.from(noirSvg))
            .resize(16, 16, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png()
            .toFile('./assets/favicon-16x16.png');
            
        // Version claire pour les thèmes sombres
        await sharp(Buffer.from(blancSvg))
            .resize(32, 32, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png()
            .toFile('./assets/favicon-light.png');
            
        await sharp(Buffer.from(blancSvg))
            .resize(16, 16, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png()
            .toFile('./assets/favicon-light-16x16.png');
            
        // Apple touch icon (180x180)
        await sharp(Buffer.from(noirSvg))
            .resize(180, 180, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png()
            .toFile('./assets/apple-touch-icon.png');
            
        console.log('✅ Tous les favicons générés avec vos logos exacts !');
        console.log('📱 Formats créés:');
        console.log('   - favicon-adaptive.svg (adaptatif automatique)');
        console.log('   - favicon-32x32.png (logo noir)');
        console.log('   - favicon-16x16.png (logo noir)');
        console.log('   - favicon-light.png (logo blanc)');
        console.log('   - favicon-light-16x16.png (logo blanc)');
        console.log('   - apple-touch-icon.png (Apple devices)');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

generateExactFavicons();