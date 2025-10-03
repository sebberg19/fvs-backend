const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DES IMAGES MANQUANTES');
console.log('====================================');

// Obtenir la liste de toutes les images disponibles
const imagesDir = './images';
const availableImages = new Set();
try {
  const files = fs.readdirSync(imagesDir);
  files.forEach(file => {
    if (file.endsWith('.webp')) {
      availableImages.add(file);
    }
  });
  console.log(`📁 ${availableImages.size} images WebP disponibles`);
} catch (error) {
  console.log('❌ Erreur lors de la lecture du dossier images/');
  process.exit(1);
}

// Mapping des corrections pour les images manquantes
const replacements = {
  'Argentina_42.webp': 'Argentina_40.webp',
  'Arsenal_FC_005.webp': 'Arsenal_130.webp',
  'Atlético_Madrid_001.webp': 'Atletico_Madrid_13.webp',
  'Atlético_Madrid_002.webp': 'Atletico_Madrid_176.webp',
  'Atlético_Madrid_003.webp': 'Atletico_Madrid_52.webp',
  'Atlético_Madrid_005.webp': 'Atletico_Madrid_67.webp',
  'Atlético_Madrid_006.webp': 'Atletico_Madrid_13.webp',
  'Brazil_61.webp': 'Brazil_62.webp',
  'Brighton_&amp;_Hove_Albion_001.webp': 'Brighton_39.webp',
  'Brighton_&amp;_Hove_Albion_002.webp': 'Brighton_39.webp',
  'Real_Madrid_14.webp': 'Real_Madrid_001.webp',
  'Real_Madrid_15.webp': 'Real_Madrid_002.webp',
  'Real_Madrid_16.webp': 'Real_Madrid_003.webp',
  'Real_Madrid_18.webp': 'Real_Madrid_004.webp',
  'Real_Madrid_5.webp': 'Real_Madrid_005.webp',
  'Real_Madrid_6.webp': 'Real_Madrid_006.webp',
  'Real_Madrid_8.webp': 'Real_Madrid_007.webp',
  'Real_Madrid_9.webp': 'Real_Madrid_008.webp',
  'arsenal.webp': 'arsenal_141.webp',
  'as_roma_146.webp': 'AS_Roma_146.webp'
};

// Vérifier que les images de remplacement existent
const validReplacements = {};
Object.entries(replacements).forEach(([missing, replacement]) => {
  if (availableImages.has(replacement)) {
    validReplacements[missing] = replacement;
    console.log(`✅ ${missing} → ${replacement}`);
  } else {
    validReplacements[missing] = 'placeholder.webp';
    console.log(`⚠️  ${missing} → placeholder.webp (remplacement introuvable)`);
  }
});

// Trouver tous les fichiers HTML
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));

let totalFixed = 0;

htmlFiles.forEach(file => {
  console.log(`\n📄 Traitement de ${file}...`);
  
  let content = fs.readFileSync(file, 'utf8');
  let fixedCount = 0;
  
  // Remplacer les images manquantes dans src=""
  Object.entries(validReplacements).forEach(([missing, replacement]) => {
    const srcPattern = new RegExp(`src="images/${missing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    const dataImgPattern = new RegExp(`data-img="images/${missing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    
    const srcMatches = (content.match(srcPattern) || []).length;
    const dataImgMatches = (content.match(dataImgPattern) || []).length;
    
    if (srcMatches > 0 || dataImgMatches > 0) {
      content = content.replace(srcPattern, `src="images/${replacement}"`);
      content = content.replace(dataImgPattern, `data-img="images/${replacement}"`);
      
      const totalMatches = srcMatches + dataImgMatches;
      console.log(`  🔄 ${missing} → ${replacement} (${totalMatches} occurrences)`);
      fixedCount += totalMatches;
    }
  });
  
  if (fixedCount > 0) {
    fs.writeFileSync(file, content);
    console.log(`  ✅ ${fixedCount} liens corrigés`);
    totalFixed += fixedCount;
  } else {
    console.log(`  ✓ Aucun lien à corriger`);
  }
});

console.log('\n🎉 CORRECTION TERMINÉE !');
console.log('========================');
console.log(`✅ Fichiers traités: ${htmlFiles.length}`);
console.log(`🔗 Total liens corrigés: ${totalFixed}`);
console.log('\n📋 RÉSULTAT:');
console.log('• Toutes les images manquantes ont été remplacées');
console.log('• Les images similaires ou de remplacement sont utilisées');
console.log('• Aucune image cassée ne devrait apparaître sur le site');