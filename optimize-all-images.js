const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeAllImages() {
    console.log('🚀 OPTIMISATION MASSIVE DE TOUTES LES IMAGES');
    console.log('⚠️  Cela peut prendre plusieurs minutes...\n');
    
    const imagesDir = './images';
    const optimizedDir = './images-optimized';
    
    // Créer le dossier optimisé
    if (!fs.existsSync(optimizedDir)) {
        fs.mkdirSync(optimizedDir);
    }
    
    // Lire tous les fichiers images
    const allFiles = fs.readdirSync(imagesDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    });
    
    console.log(`📊 ${allFiles.length} images à traiter`);
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let processedCount = 0;
    let errorCount = 0;
    
    // Traitement par lots de 10 pour éviter la surcharge mémoire
    const batchSize = 10;
    
    for (let i = 0; i < allFiles.length; i += batchSize) {
        const batch = allFiles.slice(i, i + batchSize);
        
        console.log(`📦 Traitement du lot ${Math.floor(i/batchSize) + 1}/${Math.ceil(allFiles.length/batchSize)}`);
        
        const promises = batch.map(async (file) => {
            try {
                const inputPath = path.join(imagesDir, file);
                const originalSize = fs.statSync(inputPath).size;
                const baseName = path.parse(file).name;
                const outputPath = path.join(optimizedDir, `${baseName}.webp`);
                
                // Skip si déjà traité
                if (fs.existsSync(outputPath)) {
                    return { skipped: true };
                }
                
                // Paramètres d'optimisation selon la taille
                let quality = 85;
                let width = undefined;
                
                if (originalSize > 5 * 1024 * 1024) { // > 5MB
                    quality = 70;
                    width = 1200;
                } else if (originalSize > 2 * 1024 * 1024) { // > 2MB
                    quality = 75;
                    width = 1200;
                } else if (originalSize > 1 * 1024 * 1024) { // > 1MB
                    quality = 80;
                    width = 1400;
                }
                
                // Pipeline d'optimisation
                let pipeline = sharp(inputPath);
                
                if (width) {
                    pipeline = pipeline.resize(width, null, {
                        withoutEnlargement: true,
                        fit: 'inside'
                    });
                }
                
                await pipeline
                    .webp({ 
                        quality: quality, 
                        effort: 4, // Équilibre vitesse/qualité
                        nearLossless: originalSize < 100 * 1024 // Préserver petites images
                    })
                    .toFile(outputPath);
                
                const optimizedSize = fs.statSync(outputPath).size;
                
                return {
                    file,
                    originalSize,
                    optimizedSize,
                    success: true
                };
                
            } catch (error) {
                console.error(`❌ ${file}: ${error.message}`);
                return { file, error: true };
            }
        });
        
        const results = await Promise.all(promises);
        
        // Comptabiliser les résultats
        results.forEach(result => {
            if (result.success) {
                totalOriginalSize += result.originalSize;
                totalOptimizedSize += result.optimizedSize;
                processedCount++;
                
                // Log pour les grosses économies
                if (result.originalSize > 2 * 1024 * 1024) {
                    const reduction = ((result.originalSize - result.optimizedSize) / result.originalSize * 100).toFixed(1);
                    const originalMB = (result.originalSize / 1024 / 1024).toFixed(2);
                    const optimizedMB = (result.optimizedSize / 1024 / 1024).toFixed(2);
                    console.log(`  ✅ ${result.file}: ${originalMB}MB → ${optimizedMB}MB (-${reduction}%)`);
                }
            } else if (result.error) {
                errorCount++;
            }
        });
        
        // Affichage du progrès
        const progress = ((i + batchSize) / allFiles.length * 100).toFixed(1);
        console.log(`📈 Progrès: ${Math.min(i + batchSize, allFiles.length)}/${allFiles.length} (${progress}%)\n`);
    }
    
    // Statistiques finales
    const totalReduction = totalOriginalSize > 0 ? 
        ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1) : 0;
    const originalGB = (totalOriginalSize / 1024 / 1024 / 1024).toFixed(2);
    const optimizedGB = (totalOptimizedSize / 1024 / 1024 / 1024).toFixed(2);
    const savedGB = (originalGB - optimizedGB).toFixed(2);
    
    console.log('🎉 OPTIMISATION TERMINÉE !');
    console.log('='.repeat(50));
    console.log(`✅ Images traitées: ${processedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`💾 Taille originale: ${originalGB} GB`);
    console.log(`🗜️  Taille optimisée: ${optimizedGB} GB`);
    console.log(`💰 Espace économisé: ${savedGB} GB`);
    console.log(`📉 Réduction totale: ${totalReduction}%`);
    console.log(`📁 Images dans: ${optimizedDir}`);
    console.log('='.repeat(50));
    
    // Instructions pour la suite
    console.log('\n📋 PROCHAINES ÉTAPES:');
    console.log('1. Vérifiez les images dans images-optimized/');
    console.log('2. Sauvegardez le dossier images/ original');
    console.log('3. Remplacez images/ par images-optimized/');
    console.log('4. Mettez à jour les liens HTML vers .webp');
}

optimizeAllImages().catch(console.error);