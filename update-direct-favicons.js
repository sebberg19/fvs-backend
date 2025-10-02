const fs = require('fs');

function updateHtmlWithDirectFavicons() {
    console.log('🔄 Mise à jour des HTML avec favicons directs...');
    
    const htmlFiles = [
        'index.html', 'maillots.html', 'tous-les-maillots.html', 
        'maillots-vintage.html', 'classiques.html', 'maillots-pays.html', 
        'pays-vintage.html', 'cart.html', 'checkout.html', 'payment-success.html'
    ];
    
    const newFaviconLinks = `    <!-- Favicons avec VOS logos exacts -->
    <link rel="icon" type="image/svg+xml" href="./assets/favicon-dark.svg?v=6" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/svg+xml" href="./assets/favicon-light.svg?v=6" media="(prefers-color-scheme: dark)">
    <link rel="icon" type="image/svg+xml" href="./assets/favicon-dark.svg?v=6">
    <link rel="apple-touch-icon" href="./assets/apple-touch-icon.png?v=6" sizes="180x180">`;
    
    htmlFiles.forEach(filename => {
        try {
            if (fs.existsSync(filename)) {
                let content = fs.readFileSync(filename, 'utf8');
                
                // Remplacer tout le bloc favicon
                content = content.replace(
                    /<!-- Favicon adaptatif[\s\S]*?<link rel="apple-touch-icon"[^>]*>/g,
                    newFaviconLinks
                );
                
                fs.writeFileSync(filename, content);
                console.log(`✅ ${filename} mis à jour avec favicons directs`);
            }
        } catch (error) {
            console.error(`❌ Erreur avec ${filename}:`, error.message);
        }
    });
    
    console.log('🎉 Tous les fichiers mis à jour avec VOS logos SVG directs !');
    console.log('🔥 Mode clair → favicon-dark.svg (votre logo noir)');
    console.log('🌙 Mode sombre → favicon-light.svg (votre logo blanc)');
}

updateHtmlWithDirectFavicons();