const fs = require('fs');

async function createFullyWhiteDarkMode() {
    console.log('🎯 Création d\'un favicon avec mode sombre entièrement blanc...');
    
    try {
        // Lire vos SVG originaux
        const noirSvg = fs.readFileSync('./svg/noir.svg', 'utf8');
        const blancSvg = fs.readFileSync('./svg/blanc.svg', 'utf8');
        
        // Créer une version entièrement blanche en forçant tous les éléments en blanc
        const whiteOnlySvg = blancSvg
            .replace(/stroke: #fff/g, 'stroke: #fff')
            .replace(/fill: #fff/g, 'fill: #fff')
            .replace(/fill: none/g, 'fill: #fff')
            .replace(/stroke: #000/g, 'stroke: #fff');
        
        // Créer le SVG adaptatif avec le mode sombre entièrement blanc
        const adaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 249.62 191.17">
  <defs>
    <style>
      .light-mode { display: block; }
      .dark-mode { display: none; }
      
      @media (prefers-color-scheme: dark) {
        .light-mode { display: none; }
        .dark-mode { display: block; }
      }
      
      /* Force everything to be white in dark mode */
      .dark-mode * {
        fill: #fff !important;
        stroke: #fff !important;
      }
    </style>
  </defs>
  
  <!-- Version claire (logo noir) -->
  <g class="light-mode">
    ${noirSvg.replace(/<\?xml[^>]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
  
  <!-- Version sombre (logo blanc intégral) -->
  <g class="dark-mode">
    ${whiteOnlySvg.replace(/<\?xml[^>]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
</svg>`;

        // Sauvegarder le nouveau favicon
        fs.writeFileSync('./assets/favicon-adaptive.svg', adaptiveSvg);
        console.log('✅ Favicon adaptatif avec mode sombre entièrement blanc créé !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

createFullyWhiteDarkMode();