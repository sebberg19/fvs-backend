const fs = require('fs');

function createJavaScriptFaviconSolution() {
    console.log('🔧 Création d\'une solution JavaScript plus robuste...');
    
    const htmlFiles = [
        'index.html', 'maillots.html', 'tous-les-maillots.html', 
        'maillots-vintage.html', 'classiques.html', 'maillots-pays.html', 
        'pays-vintage.html', 'cart.html', 'checkout.html', 'payment-success.html'
    ];
    
    // Script JavaScript pour gérer les favicons dynamiquement
    const faviconScript = `    <script>
        // Gestion dynamique des favicons selon le thème
        function updateFavicon() {
            const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const favicon = document.querySelector('link[rel="icon"]');
            
            if (favicon) {
                if (isDarkMode) {
                    favicon.href = './assets/favicon-light.svg?v=7'; // Logo blanc pour mode sombre
                } else {
                    favicon.href = './assets/favicon-dark.svg?v=7';  // Logo noir pour mode clair
                }
            }
        }
        
        // Exécuter au chargement
        document.addEventListener('DOMContentLoaded', updateFavicon);
        
        // Écouter les changements de thème
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateFavicon);
    </script>`;
    
    // Nouveau lien favicon simplifié
    const newFaviconLinks = `    <!-- Favicon dynamique géré par JavaScript -->
    <link rel="icon" type="image/svg+xml" href="./assets/favicon-dark.svg?v=7" id="favicon">
    <link rel="apple-touch-icon" href="./assets/apple-touch-icon.png?v=7" sizes="180x180">`;
    
    htmlFiles.forEach(filename => {
        try {
            if (fs.existsSync(filename)) {
                let content = fs.readFileSync(filename, 'utf8');
                
                // Remplacer les anciens liens favicon
                content = content.replace(
                    /<!-- Favicons avec VOS logos exacts -->[\s\S]*?<link rel="apple-touch-icon"[^>]*>/g,
                    newFaviconLinks
                );
                
                // Ajouter le script avant la fermeture du head
                if (!content.includes('updateFavicon')) {
                    content = content.replace('</head>', faviconScript + '\n</head>');
                }
                
                fs.writeFileSync(filename, content);
                console.log(`✅ ${filename} mis à jour avec solution JavaScript`);
            }
        } catch (error) {
            console.error(`❌ Erreur avec ${filename}:`, error.message);
        }
    });
    
    console.log('🎉 Solution JavaScript appliquée !');
    console.log('🔄 Le favicon changera maintenant dynamiquement selon le thème');
}

createJavaScriptFaviconSolution();