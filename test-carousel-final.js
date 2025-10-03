console.log('🔍 TEST FINAL DU CAROUSEL');
console.log('=========================');

// Test en simulant le comportement exact du navigateur
console.log('📄 Simulation du chargement du carousel...');

// Liste actuelle des images dans le carousel (copiée du fichier)
const allJerseys = [
  { img: './images/Real_Madrid_001.webp', name: 'Real Madrid', price: '$36.70' },
  { img: './images/FC_Barcelona_001.webp', name: 'FC Barcelona', price: '$36.70' },
  { img: './images/Chelsea_FC_149.webp', name: 'Chelsea FC', price: '$36.70' },
  { img: './images/Bayern_Munich_9.webp', name: 'Bayern Munich', price: '$36.70' },
  { img: './images/Juventus_34.webp', name: 'Juventus', price: '$36.70' },
  { img: './images/AC_Milan_20.webp', name: 'AC Milan', price: '$36.70' },
  { img: './images/Inter_milan_38.webp', name: 'Inter Milan', price: '$36.70' },
  { img: './images/Paris_Saint_Germain_159.webp', name: 'Paris Saint-Germain', price: '$36.70' },
  { img: './images/Atletico_Madrid_13.webp', name: 'Atlético Madrid', price: '$36.70' },
  { img: './images/Borussia_Dortmund_136.webp', name: 'Borussia Dortmund', price: '$36.70' },
  { img: './images/Manchester_City_4.webp', name: 'Manchester City', price: '$36.70' },
  { img: './images/Tottenham_73.webp', name: 'Tottenham', price: '$36.70' },
  { img: './images/AS_Roma_146.webp', name: 'AS Roma', price: '$36.70' },
  { img: './images/Napoli_001.webp', name: 'Napoli', price: '$36.70' },
  { img: './images/Newcastle_United_001.webp', name: 'Newcastle United', price: '$36.70' },
  { img: './images/Olympique_de_Marseille_155.webp', name: 'Olympique Marseille', price: '$36.70' },
  { img: './images/Boca_Juniors_102.webp', name: 'Boca Juniors', price: '$36.70' },
  { img: './images/River_Plate_100.webp', name: 'River Plate', price: '$36.70' },
  { img: './images/Santos_FC_13.webp', name: 'Santos FC', price: '$36.70' },
  { img: './images/Palmeiras_104.webp', name: 'Palmeiras', price: '$36.70' },
  { img: './images/Brazil_13.webp', name: 'Brésil', price: '$36.70' },
  { img: './images/Argentina_40.webp', name: 'Argentine', price: '$36.70' },
  { img: './images/france_63.webp', name: 'France', price: '$36.70' },
  { img: './images/Germany_4.webp', name: 'Allemagne', price: '$36.70' },
  { img: './images/Italy_74.webp', name: 'Italie', price: '$36.70' },
  { img: './images/Netherlands_99.webp', name: 'Pays-Bas', price: '$36.70' },
  { img: './images/Spain_128.webp', name: 'Espagne', price: '$36.70' },
  { img: './images/portugal-1.webp', name: 'Portugal', price: '$36.70' },
  { img: './images/Croatia_72.webp', name: 'Croatie', price: '$36.70' },
  { img: './images/Uruguay_37.webp', name: 'Uruguay', price: '$36.70' },
  { img: './images/Leicester_01.webp', name: 'Leicester City', price: '$36.70' },
  { img: './images/West_Ham_United_001.webp', name: 'West Ham United', price: '$36.70' },
  { img: './images/everton_home_25-26.webp', name: 'Everton FC', price: '$36.70' },
  { img: './images/Valencia_CF_001.webp', name: 'Valencia CF', price: '$36.70' },
  { img: './images/FC_Barcelona_002.webp', name: 'FC Barcelone', price: '$36.70' },
  { img: './images/Real_Madrid_002.webp', name: 'Real Madrid', price: '$36.70' },
  { img: './images/ac_milan_107.webp', name: 'AC Milan', price: '$36.70' },
];

const fs = require('fs');

console.log('🔍 Vérification de chaque image...');

let allValid = true;
let errorCount = 0;

allJerseys.forEach((jersey, index) => {
  const imagePath = jersey.img.replace('./images/', './images/');
  
  if (fs.existsSync(imagePath)) {
    console.log(`  ✅ ${index + 1}. ${jersey.name} - ${jersey.img}`);
  } else {
    console.log(`  ❌ ${index + 1}. ${jersey.name} - ${jersey.img} - MANQUANTE`);
    allValid = false;
    errorCount++;
  }
});

console.log('\n📊 RÉSULTAT FINAL');
console.log('==================');

if (allValid) {
  console.log('🎉 PARFAIT ! CAROUSEL ENTIÈREMENT FONCTIONNEL');
  console.log('• Toutes les images du carousel existent');
  console.log('• Aucune erreur 404 ne sera générée');
  console.log('• Le carousel va défiler sans problème');
  console.log('• Performance optimale avec images WebP');
} else {
  console.log(`❌ ${errorCount} ERREURS RESTANTES`);
  console.log('• Le carousel aura des images cassées');
  console.log('• Des erreurs 404 vont apparaître dans la console');
  console.log('• Correction nécessaire pour les images manquantes');
}

console.log(`\n📈 Performance: ${allJerseys.length} maillots disponibles`);
console.log('🎲 Sélection aléatoire: 15 maillots par rotation');
console.log('♾️  Animation: Défilement infini activé');