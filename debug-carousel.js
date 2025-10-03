const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC DU CAROUSEL - VÉRIFICATION DES IMAGES');
console.log('==================================================');

// Lire le fichier index.html et extraire la liste des images du carousel
let indexContent;
try {
  indexContent = fs.readFileSync('index.html', 'utf8');
} catch (error) {
  console.log('❌ Erreur lors de la lecture de index.html');
  process.exit(1);
}

// Extraire les images du carousel JavaScript
const allJerseys = [];
const jerseyRegex = /{ img: '\.\/images\/([^']+)', name: '([^']+)', price: '\$36\.70' }/g;
let match;

while ((match = jerseyRegex.exec(indexContent)) !== null) {
  allJerseys.push({
    img: match[1],
    name: match[2]
  });
}

console.log(`📊 ${allJerseys.length} images trouvées dans le carousel JavaScript`);

// Vérifier l'existence de chaque image
const missingImages = [];
const existingImages = [];

allJerseys.forEach((jersey, index) => {
  const imagePath = `./images/${jersey.img}`;
  
  if (fs.existsSync(imagePath)) {
    existingImages.push(jersey);
    console.log(`  ✅ ${index + 1}. ${jersey.img} (${jersey.name})`);
  } else {
    missingImages.push(jersey);
    console.log(`  ❌ ${index + 1}. ${jersey.img} (${jersey.name}) - MANQUANTE`);
  }
});

console.log('\n📊 RÉSULTATS DU DIAGNOSTIC');
console.log('===========================');
console.log(`✅ Images existantes: ${existingImages.length}`);
console.log(`❌ Images manquantes: ${missingImages.length}`);

if (missingImages.length > 0) {
  console.log('\n🚨 IMAGES MANQUANTES DANS LE CAROUSEL:');
  missingImages.forEach((jersey, index) => {
    console.log(`  ${index + 1}. ${jersey.img} (${jersey.name})`);
  });
  
  console.log('\n🔧 SUGGESTIONS DE CORRECTION:');
  missingImages.forEach(jersey => {
    // Rechercher des images similaires
    const baseName = jersey.img.replace(/\d+\.webp$/, '').replace(/[_-]$/, '');
    const files = fs.readdirSync('./images');
    const similarImages = files.filter(file => 
      file.includes(baseName) && file.endsWith('.webp')
    ).slice(0, 3);
    
    if (similarImages.length > 0) {
      console.log(`  • ${jersey.img} → Alternatives: ${similarImages.join(', ')}`);
    } else {
      console.log(`  • ${jersey.img} → Utiliser placeholder.webp`);
    }
  });
} else {
  console.log('\n🎉 PARFAIT !');
  console.log('• Toutes les images du carousel existent');
  console.log('• Le carousel devrait fonctionner sans erreur');
  console.log('• Aucune correction nécessaire');
}

// Vérifier aussi l'HTML du carousel
const carouselHTMLRegex = /<div class="jersey-carousel-container">(.*?)<\/div>/s;
const carouselMatch = indexContent.match(carouselHTMLRegex);

if (carouselMatch) {
  console.log('\n✅ Structure HTML du carousel trouvée');
} else {
  console.log('\n❌ Structure HTML du carousel manquante');
}

// Vérifier la fonction JavaScript
const initCarouselRegex = /function initJerseyCarousel\(\)/;
if (indexContent.match(initCarouselRegex)) {
  console.log('✅ Fonction initJerseyCarousel trouvée');
} else {
  console.log('❌ Fonction initJerseyCarousel manquante');
}

// Vérifier l'appel de la fonction
const carouselCallRegex = /document\.addEventListener\('DOMContentLoaded', initJerseyCarousel\)/;
if (indexContent.match(carouselCallRegex)) {
  console.log('✅ Appel de initJerseyCarousel trouvé');
} else {
  console.log('❌ Appel de initJerseyCarousel manquant');
}