const fs = require('fs');

function updateToVersion4() {
    console.log('🔄 Mise à jour vers version 4 pour le mode sombre blanc...');
    
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
                
                // Remplacer v=3 par v=4
                content = content.replace(/\?v=3/g, '?v=4');
                
                fs.writeFileSync(filePath, content);
                console.log(`✅ ${filename} mis à jour vers v=4`);
            }
        } catch (error) {
            console.error(`❌ Erreur avec ${filename}:`, error.message);
        }
    });
    
    console.log('🎉 Tous les favicons mis à jour vers version 4 !');
    console.log('⚪ Mode sombre maintenant entièrement blanc');
}

updateToVersion4();