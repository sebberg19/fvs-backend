const fs = require('fs');

async function createPureFavicon() {
    console.log('🎯 Création du favicon avec VOS SVG exactement comme ils sont...');
    
    try {
        // Lire vos SVG EXACTS
        const noirSvg = fs.readFileSync('./svg/noir.svg', 'utf8');
        const blancSvg = fs.readFileSync('./svg/blanc.svg', 'utf8');
        
        console.log('✅ Logos originaux chargés directement');
        
        // Extraire seulement le contenu des SVG (sans les balises xml et svg)
        const noirContent = noirSvg
            .replace(/<\?xml[^>]*\?>/, '')
            .replace(/<svg[^>]*>/, '')
            .replace(/<\/svg>\s*$/, '')
            .trim();
            
        const blancContent = blancSvg
            .replace(/<\?xml[^>]*\?>/, '')
            .replace(/<svg[^>]*>/, '')
            .replace(/<\/svg>\s*$/, '')
            .trim();
        
        // Créer le favicon adaptatif avec VOS SVG EXACTS
        const pureFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 249.62 191.17">
  <defs>
    <style>
      .light-logo { display: block; }
      .dark-logo { display: none; }
      
      @media (prefers-color-scheme: dark) {
        .light-logo { display: none; }
        .dark-logo { display: block; }
      }
    </style>
  </defs>
  
  <!-- VOTRE LOGO NOIR EXACT (mode clair) -->
  <g class="light-logo">
    ${noirContent}
  </g>
  
  <!-- VOTRE LOGO BLANC EXACT (mode sombre) -->
  <g class="dark-logo">
    ${blancContent}
  </g>
</svg>`;

        // Sauvegarder
        fs.writeFileSync('./assets/favicon-adaptive.svg', pureFavicon);
        console.log('✅ Favicon avec VOS logos EXACTS créé !');
        console.log('🔥 Aucune modification - copie pure de vos SVG');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

createPureFavicon();