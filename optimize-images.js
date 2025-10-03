const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
    console.log('🚀 Démarrage de l\'optimisation des images...');
    
    const imagesDir = './images';
    const optimizedDir = './images-optimized';
    
    // Créer le dossier d'images optimisées
    if (!fs.existsSync(optimizedDir)) {
        fs.mkdirSync(optimizedDir);
    }
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let processedCount = 0;
    let skippedCount = 0;
    
    // Lire tous les fichiers images
    const files = fs.readdirSync(imagesDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    });
    
    console.log(`📊 ${files.length} images trouvées à optimiser`);
    
    for (const file of files) {
        try {
            const inputPath = path.join(imagesDir, file);
            const originalSize = fs.statSync(inputPath).size;
            const ext = path.extname(file).toLowerCase();
            const baseName = path.parse(file).name;
            
            // Nom de fichier optimisé en WebP
            const outputPath = path.join(optimizedDir, `${baseName}.webp`);
            
            // Skip si déjà traité
            if (fs.existsSync(outputPath)) {
                skippedCount++;
                continue;
            }
            
            // Optimiser selon le type et la taille
            let quality = 85; // Qualité par défaut
            let width = undefined;
            
            // Si le fichier est très lourd, réduire plus agressivement
            if (originalSize > 5 * 1024 * 1024) { // > 5MB
                quality = 75;
                width = 1200; // Limiter à 1200px de largeur
            } else if (originalSize > 2 * 1024 * 1024) { // > 2MB
                quality = 80;
                width = 1200;
            } else if (originalSize > 1 * 1024 * 1024) { // > 1MB
                quality = 85;
            }
            
            // Traitement avec Sharp
            let pipeline = sharp(inputPath);
            
            // Redimensionner si nécessaire
            if (width) {
                pipeline = pipeline.resize(width, null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                });
            }
            
            // Convertir en WebP avec qualité optimisée
            await pipeline
                .webp({ quality: quality, effort: 6 })
                .toFile(outputPath);
            
            const optimizedSize = fs.statSync(outputPath).size;
            const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
            
            totalOriginalSize += originalSize;
            totalOptimizedSize += optimizedSize;
            processedCount++;
            
            // Log pour les gros gains
            if (originalSize > 1024 * 1024) { // > 1MB original
                const originalMB = (originalSize / 1024 / 1024).toFixed(2);
                const optimizedMB = (optimizedSize / 1024 / 1024).toFixed(2);
                console.log(`✅ ${file}: ${originalMB}MB → ${optimizedMB}MB (-${reduction}%)`);
            }
            
            // Petite pause pour éviter la surcharge
            if (processedCount % 50 === 0) {
                console.log(`📈 Progress: ${processedCount}/${files.length} images traitées`);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.error(`❌ Erreur avec ${file}:`, error.message);
        }
    }
    
    // Statistiques finales
    const totalReduction = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
    const originalGB = (totalOriginalSize / 1024 / 1024 / 1024).toFixed(2);
    const optimizedGB = (totalOptimizedSize / 1024 / 1024 / 1024).toFixed(2);
    
    console.log('\n🎉 OPTIMISATION TERMINÉE !');
    console.log(`📊 Images traitées: ${processedCount}`);
    console.log(`⏭️  Images ignorées: ${skippedCount}`);
    console.log(`💾 Taille originale: ${originalGB} GB`);
    console.log(`🗜️  Taille optimisée: ${optimizedGB} GB`);
    console.log(`📉 Réduction totale: ${totalReduction}%`);
    console.log(`\n📁 Images optimisées dans: ${optimizedDir}`);
}

// Vérification des dépendances
if (!fs.existsSync('./node_modules/sharp')) {
    console.log('📦 Installation de Sharp pour l\'optimisation...');
    console.log('Exécutez: npm install sharp');
} else {
    optimizeImages().catch(console.error);
}