const fs = require('fs');
const path = require('path');

// Fonction pour lister tous les fichiers HTML
function getHtmlFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            files.push(...getHtmlFiles(fullPath));
        } else if (item.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Fonction pour convertir les liens d'images
function updateImageLinks(content) {
    // Remplacer toutes les références aux images PNG/JPG par WebP
    let updatedContent = content;
    
    // Pattern pour capturer les liens d'images dans src, data-src, etc.
    const patterns = [
        /src=["']([^"']*images\/[^"']*\.(?:png|jpg|jpeg))["']/gi,
        /data-src=["']([^"']*images\/[^"']*\.(?:png|jpg|jpeg))["']/gi,
        /srcset=["']([^"']*images\/[^"']*\.(?:png|jpg|jpeg)[^"']*)["']/gi,
        /url\(["']?([^"')]*images\/[^"')]*\.(?:png|jpg|jpeg))["']?\)/gi
    ];
    
    let changeCount = 0;
    
    patterns.forEach(pattern => {
        updatedContent = updatedContent.replace(pattern, (match, imagePath) => {
            changeCount++;
            // Remplacer l'extension par .webp
            const webpPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
            return match.replace(imagePath, webpPath);
        });
    });
    
    return { content: updatedContent, changes: changeCount };
}

// Fonction pour ajouter lazy loading
function addLazyLoading(content) {
    // Ajouter loading="lazy" aux images qui n'en ont pas déjà
    let updatedContent = content.replace(
        /<img(?![^>]*loading=)([^>]*src=["'][^"']*images\/[^"']*\.webp["'][^>]*)>/gi,
        '<img loading="lazy"$1>'
    );
    
    return updatedContent;
}

console.log('🔄 MISE À JOUR DES LIENS VERS WEBP + LAZY LOADING');
console.log('================================================');

// Obtenir tous les fichiers HTML
const htmlFiles = getHtmlFiles('.');
console.log(`📄 ${htmlFiles.length} fichiers HTML trouvés`);

let totalChanges = 0;
let filesUpdated = 0;

// Mettre à jour chaque fichier
htmlFiles.forEach(filePath => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { content: webpContent, changes } = updateImageLinks(content);
        const finalContent = addLazyLoading(webpContent);
        
        if (changes > 0 || finalContent !== content) {
            fs.writeFileSync(filePath, finalContent, 'utf8');
            console.log(`✅ ${path.relative('.', filePath)}: ${changes} liens mis à jour`);
            totalChanges += changes;
            filesUpdated++;
        }
    } catch (error) {
        console.error(`❌ Erreur avec ${filePath}:`, error.message);
    }
});

console.log('\n🎉 MISE À JOUR TERMINÉE !');
console.log('========================');
console.log(`✅ Fichiers modifiés: ${filesUpdated}`);
console.log(`🔗 Total liens mis à jour: ${totalChanges}`);
console.log(`📱 Lazy loading ajouté sur toutes les images`);
console.log('\n📋 PROCHAINES ÉTAPES:');
console.log('1. Remplacez le dossier "images" par "images-new"');
console.log('2. Testez votre site avec les nouvelles images WebP');
console.log('3. Vérifiez la vitesse de chargement améliorée');