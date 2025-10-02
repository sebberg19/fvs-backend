const fs = require('fs');

function createDirectFavicons() {
    console.log('🎯 Copie directe de vos logos comme favicons...');
    
    try {
        // Copier directement vos SVG
        const noirSvg = fs.readFileSync('./svg/noir.svg', 'utf8');
        const blancSvg = fs.readFileSync('./svg/blanc.svg', 'utf8');
        
        // Copier tels quels
        fs.writeFileSync('./assets/favicon-dark.svg', noirSvg);
        fs.writeFileSync('./assets/favicon-light.svg', blancSvg);
        
        console.log('✅ Favicons directs créés :');
        console.log('   - favicon-dark.svg (logo noir)');
        console.log('   - favicon-light.svg (logo blanc)');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

createDirectFavicons();