const fs = require('fs');

function verifyFaviconConfiguration() {
    console.log('🔍 Vérification de la configuration des favicons...');
    
    const htmlFiles = [
        'index.html', 'maillots.html', 'tous-les-maillots.html', 
        'maillots-vintage.html', 'classiques.html', 'maillots-pays.html', 
        'pays-vintage.html', 'cart.html', 'checkout.html', 'payment-success.html'
    ];
    
    let allCorrect = true;
    
    htmlFiles.forEach(filename => {
        try {
            if (fs.existsSync(filename)) {
                const content = fs.readFileSync(filename, 'utf8');
                
                const hasDarkForLight = content.includes('favicon-dark.svg') && content.includes('media="(prefers-color-scheme: light)"');
                const hasLightForDark = content.includes('favicon-light.svg') && content.includes('media="(prefers-color-scheme: dark)"');
                const hasV6 = content.includes('?v=6');
                
                if (hasDarkForLight && hasLightForDark && hasV6) {
                    console.log(`✅ ${filename} - Configuration correcte`);
                } else {
                    console.log(`❌ ${filename} - Configuration incorrecte`);
                    console.log(`   - Logo noir pour mode clair: ${hasDarkForLight ? '✅' : '❌'}`);
                    console.log(`   - Logo blanc pour mode sombre: ${hasLightForDark ? '✅' : '❌'}`);
                    console.log(`   - Version 6: ${hasV6 ? '✅' : '❌'}`);
                    allCorrect = false;
                }
            }
        } catch (error) {
            console.error(`❌ Erreur avec ${filename}:`, error.message);
            allCorrect = false;
        }
    });
    
    console.log('\n📋 Résumé:');
    if (allCorrect) {
        console.log('🎉 Tous les fichiers ont la configuration correcte !');
        console.log('🌞 Mode clair → Logo NOIR (favicon-dark.svg)');
        console.log('🌙 Mode sombre → Logo BLANC (favicon-light.svg)');
    } else {
        console.log('⚠️  Certains fichiers ont besoin de correction');
    }
    
    return allCorrect;
}

verifyFaviconConfiguration();