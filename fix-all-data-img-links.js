const fs = require('fs');
const path = require('path');

console.log('🔄 CORRECTION DE TOUS LES LIENS DATA-IMG');
console.log('================================================');

// Trouver tous les fichiers HTML
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));

let totalFixed = 0;

htmlFiles.forEach(file => {
  console.log(`📄 Traitement de ${file}...`);
  
  let content = fs.readFileSync(file, 'utf8');
  let fixedCount = 0;
  
  // Remplacer tous les data-img="images/...png" par data-img="images/...webp"
  content = content.replace(/data-img="images\/([^"]+)\.png"/g, (match, filename) => {
    fixedCount++;
    return `data-img="images/${filename}.webp"`;
  });
  
  // Remplacer tous les data-img="images/...jpg" par data-img="images/...webp"
  content = content.replace(/data-img="images\/([^"]+)\.jpg"/g, (match, filename) => {
    fixedCount++;
    return `data-img="images/${filename}.webp"`;
  });
  
  // Remplacer tous les data-img="images/...jpeg" par data-img="images/...webp"
  content = content.replace(/data-img="images\/([^"]+)\.jpeg"/g, (match, filename) => {
    fixedCount++;
    return `data-img="images/${filename}.webp"`;
  });
  
  if (fixedCount > 0) {
    fs.writeFileSync(file, content);
    console.log(`  ✅ ${fixedCount} liens data-img corrigés`);
    totalFixed += fixedCount;
  } else {
    console.log(`  ✓ Aucun lien à corriger`);
  }
});

console.log('');
console.log('🎉 CORRECTION TERMINÉE !');
console.log('========================');
console.log(`✅ Fichiers traités: ${htmlFiles.length}`);
console.log(`🔗 Total liens corrigés: ${totalFixed}`);
console.log('');
console.log('📋 RÉSULTAT:');
console.log('• Tous les data-img pointent maintenant vers .webp');
console.log('• Les boutons "Ajouter" utiliseront les bonnes images optimisées');
console.log('• Performance du panier améliorée');