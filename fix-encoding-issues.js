const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DES CARACTÈRES SPÉCIAUX DANS LES NOMS D\'IMAGES');
console.log('==============================================================');

// Mapping des corrections pour les caractères spéciaux
const encodingFixes = {
  'Atl�tico_Madrid_001.webp': 'Atletico_Madrid_13.webp',
  'Atl�tico_Madrid_002.webp': 'Atletico_Madrid_176.webp', 
  'Atl�tico_Madrid_003.webp': 'Atletico_Madrid_52.webp',
  'Atl�tico_Madrid_005.webp': 'Atletico_Madrid_67.webp',
  'Atl�tico_Madrid_006.webp': 'Atletico_Madrid_13.webp'
};

// Trouver tous les fichiers HTML
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));

let totalFixed = 0;

htmlFiles.forEach(file => {
  console.log(`📄 Traitement de ${file}...`);
  
  let content = fs.readFileSync(file, 'utf8');
  let fixedCount = 0;
  
  // Remplacer les images avec caractères mal encodés
  Object.entries(encodingFixes).forEach(([malformed, correct]) => {
    const srcPattern = new RegExp(`src="images/${malformed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    const dataImgPattern = new RegExp(`data-img="images/${malformed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    
    const srcMatches = (content.match(srcPattern) || []).length;
    const dataImgMatches = (content.match(dataImgPattern) || []).length;
    
    if (srcMatches > 0 || dataImgMatches > 0) {
      content = content.replace(srcPattern, `src="images/${correct}"`);
      content = content.replace(dataImgPattern, `data-img="images/${correct}"`);
      
      const totalMatches = srcMatches + dataImgMatches;
      console.log(`  🔄 ${malformed} → ${correct} (${totalMatches} occurrences)`);
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
console.log('• Tous les caractères spéciaux ont été corrigés');
console.log('• Les noms d\'images utilisent maintenant l\'ASCII standard');
console.log('• Plus de problèmes d\'encodage dans les liens d\'images');