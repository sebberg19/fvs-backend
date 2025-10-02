const fs = require('fs');
const path = require('path');

function updateFavicons() {
    console.log('🔄 Mise à jour des liens favicon avec version 3...');
    
    // Liste des fichiers HTML
    const htmlFiles = [
        'index.html',
        'maillots.html',
        'tous-les-maillots.html',
        'maillots-vintage.html',
        'classiques.html',
        'maillots-pays.html',
        'pays-vintage.html',
        'cart.html',
        'checkout.html',
        'payment-success.html'
    ];
    
    htmlFiles.forEach(filename => {
        try {
            const filePath = `./${filename}`;
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Remplacer toutes les références aux favicons avec v=3
                content = content
                    .replace(/favicon-adaptive\.svg(\?v=\d+)?/g, 'favicon-adaptive.svg?v=3')
                    .replace(/favicon-32x32\.png(\?v=\d+)?/g, 'favicon-32x32.png?v=3')
                    .replace(/favicon-16x16\.png(\?v=\d+)?/g, 'favicon-16x16.png?v=3')
                    .replace(/favicon-light\.png(\?v=\d+)?/g, 'favicon-light.png?v=3')
                    .replace(/favicon-light-16x16\.png(\?v=\d+)?/g, 'favicon-light-16x16.png?v=3')
                    .replace(/apple-touch-icon\.png(\?v=\d+)?/g, 'apple-touch-icon.png?v=3');
                
                fs.writeFileSync(filePath, content);
                console.log(`✅ ${filename} mis à jour`);
            }
        } catch (error) {
            console.error(`❌ Erreur avec ${filename}:`, error.message);
        }
    });
    
    console.log('🎉 Tous les favicons mis à jour avec version 3 !');
    console.log('🔄 Pour voir les changements, videz le cache du navigateur ou faites Ctrl+F5');
}

updateFavicons();