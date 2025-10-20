const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION DES IMAGES DU CAROUSEL');
console.log('=====================================');

// Lire le contenu du fichier index.html
const indexContent = fs.readFileSync('index.html', 'utf8');

// Extraire la liste des maillots du carousel
const carouselMatch = indexContent.match(/const allJerseys = \[([\s\S]*?)\];/);
if (!carouselMatch) {
    console.error('❌ Liste des maillots non trouvée dans index.html');
    process.exit(1);
}

// Parser la liste des maillots
const jerseyListStr = carouselMatch[1];
const jerseyRegex = /{\s*img:\s*'(.\/images\/[^']+)',\s*name:\s*'([^']+)',\s*price:\s*'([^']+)'\s*}/g;
let match;
const jerseys = [];

while ((match = jerseyRegex.exec(jerseyListStr)) !== null) {
    jerseys.push({
        img: match[1].replace('./images/', ''),
        name: match[2],
        price: match[3]
    });
}

console.log(`📋 ${jerseys.length} maillots trouvés dans le carousel`);

// Vérifier les images disponibles
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
    console.error('❌ Erreur lors de la lecture du dossier images/:', error);
    process.exit(1);
}

// Vérifier chaque maillot
const validJerseys = jerseys.filter(jersey => {
    const hasImage = availableImages.has(jersey.img);
    if (!hasImage) {
        console.log(`❌ Image manquante: ${jersey.img} (${jersey.name})`);
    }
    return hasImage;
});

console.log(`\n✅ ${validJerseys.length}/${jerseys.length} maillots valides`);

// Générer le nouveau code pour le carousel
const newJerseyList = validJerseys
    .map(jersey => `          { img: './images/${jersey.img}', name: '${jersey.name}', price: '${jersey.price}' }`)
    .join(',\n');

// Mettre à jour index.html
const updatedContent = indexContent.replace(
    /const allJerseys = \[([\s\S]*?)\];/,
    `const allJerseys = [\n${newJerseyList}\n        ];`
);

fs.writeFileSync('index.html', updatedContent);

console.log('\n🎉 MISE À JOUR TERMINÉE !');
console.log('========================');
console.log(`✅ ${validJerseys.length} maillots conservés dans le carousel`);
console.log(`❌ ${jerseys.length - validJerseys.length} maillots retirés`);