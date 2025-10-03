const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function testOptimization() {
    console.log('🧪 Test d\'optimisation sur les plus gros fichiers...');
    
    const imagesDir = './images';
    const testDir = './images-test-optimized';
    
    // Créer le dossier de test
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir);
    }
    
    // Les 10 plus gros fichiers pour tester
    const bigFiles = [
        'Chelsea_FC_178.png',
        'Inter_milan_38.png', 
        'blackburn-rovers_97.png',
        'FC_Barcelona_98.png',
        'AC_Milan_20.png',
        'aston_villa_third_25-26.png',
        'aston_villa_away_25-26.png',
        'Inter_Miami_CF_52.png',
        'ac_milan_107.png',
        'leeds_home_25-26.png'
    ];
    
    let totalOriginal = 0;
    let totalOptimized = 0;
    
    for (const file of bigFiles) {
        try {
            const inputPath = path.join(imagesDir, file);
            if (!fs.existsSync(inputPath)) continue;
            
            const originalSize = fs.statSync(inputPath).size;
            const baseName = path.parse(file).name;
            const outputPath = path.join(testDir, `${baseName}.webp`);
            
            // Optimisation agressive pour les gros fichiers
            await sharp(inputPath)
                .resize(1200, null, { 
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .webp({ quality: 75, effort: 6 })
                .toFile(outputPath);
            
            const optimizedSize = fs.statSync(outputPath).size;
            const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
            
            totalOriginal += originalSize;
            totalOptimized += optimizedSize;
            
            const originalMB = (originalSize / 1024 / 1024).toFixed(2);
            const optimizedMB = (optimizedSize / 1024 / 1024).toFixed(2);
            
            console.log(`✅ ${file}:`);
            console.log(`   📊 ${originalMB}MB → ${optimizedMB}MB (-${reduction}%)`);
            
        } catch (error) {
            console.error(`❌ Erreur avec ${file}:`, error.message);
        }
    }
    
    const totalReduction = ((totalOriginal - totalOptimized) / totalOriginal * 100).toFixed(1);
    const originalMB = (totalOriginal / 1024 / 1024).toFixed(2);
    const optimizedMB = (totalOptimized / 1024 / 1024).toFixed(2);
    
    console.log('\n🎯 RÉSULTATS DU TEST:');
    console.log(`💾 Avant: ${originalMB} MB`);
    console.log(`🗜️  Après: ${optimizedMB} MB`);
    console.log(`📉 Réduction: ${totalReduction}%`);
    console.log(`\n📁 Images test dans: ${testDir}`);
}

testOptimization().catch(console.error);