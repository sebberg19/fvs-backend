const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DE L\'EXISTENCE DES IMAGES');
console.log('==========================================');

// Obtenir la liste de toutes les images disponibles
const imagesDir = './images';
const availableImages = new Set();
try {
  const files = fs.readdirSync(imagesDir);
  files.forEach(file => {
    if (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      availableImages.add(file);
    }
  });
  console.log(`📁 ${availableImages.size} images trouvées dans le dossier images/`);
} catch (error) {
  console.log('❌ Erreur lors de la lecture du dossier images/');
  process.exit(1);
}

// Trouver tous les fichiers HTML
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));

const missingImages = new Set();
const foundImages = new Set();
let totalChecked = 0;

htmlFiles.forEach(file => {
  console.log(`📄 Vérification de ${file}...`);
  
  const content = fs.readFileSync(file, 'utf8');
  let checkedInFile = 0;
  
  // Chercher tous les liens vers les images dans src=""
  const srcMatches = content.match(/src="images\/[^"]+"/g) || [];
  srcMatches.forEach(match => {
    const imagePath = match.replace('src="images/', '').replace('"', '');
    checkedInFile++;
    totalChecked++;
    
    if (availableImages.has(imagePath)) {
      foundImages.add(imagePath);
    } else {
      missingImages.add(imagePath);
    }
  });
  
  // Chercher tous les liens vers les images dans data-img=""
  const dataImgMatches = content.match(/data-img="images\/[^"]+"/g) || [];
  dataImgMatches.forEach(match => {
    const imagePath = match.replace('data-img="images/', '').replace('"', '');
    checkedInFile++;
    totalChecked++;
    
    if (availableImages.has(imagePath)) {
      foundImages.add(imagePath);
    } else {
      missingImages.add(imagePath);
    }
  });
  
  console.log(`  ✓ ${checkedInFile} références d'images vérifiées`);
});

console.log('');
console.log('📊 RÉSULTATS DE LA VÉRIFICATION');
console.log('================================');
console.log(`✅ Images trouvées: ${foundImages.size}`);
console.log(`❌ Images manquantes: ${missingImages.size}`);
console.log(`🔍 Total références vérifiées: ${totalChecked}`);

if (missingImages.size > 0) {
  console.log('');
  console.log('🚨 IMAGES MANQUANTES:');
  Array.from(missingImages).sort().forEach(img => {
    console.log(`  ❌ ${img}`);
  });
  
  console.log('');
  console.log('💡 SUGGESTIONS:');
  console.log('• Vérifiez si ces images existent avec un nom légèrement différent');
  console.log('• Utilisez placeholder.webp comme image de remplacement');
  console.log('• Supprimez les références aux images inexistantes');
} else {
  console.log('');
  console.log('🎉 PARFAIT !');
  console.log('• Toutes les images référencées existent');
  console.log('• Aucune image manquante détectée');
  console.log('• Le site devrait fonctionner sans problème d\'images');
}