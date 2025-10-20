// Fonction pour mélanger un tableau en utilisant l'algorithme de Fisher-Yates
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Fonction pour obtenir un sous-ensemble varié de maillots
function getVariedJerseys(jerseys) {
    // Grouper les maillots par équipe
    const teamGroups = {};
    jerseys.forEach(jersey => {
        const team = jersey.name;
        if (!teamGroups[team]) {
            teamGroups[team] = [];
        }
        teamGroups[team].push(jersey);
    });

    // Limiter le nombre de maillots par équipe
    const maxPerTeam = 2; // Maximum 2 maillots par équipe
    const selectedJerseys = [];
    
    Object.values(teamGroups).forEach(teamJerseys => {
        // Mélanger les maillots de l'équipe
        shuffleArray(teamJerseys);
        // Prendre un nombre limité de maillots
        selectedJerseys.push(...teamJerseys.slice(0, maxPerTeam));
    });

    // Mélanger le résultat final
    return shuffleArray(selectedJerseys);
}

// Lire le contenu du fichier index.html
const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Extraire la liste actuelle des maillots
const jerseyMatch = content.match(/const allJerseys = \[([\s\S]*?)\];/);
if (!jerseyMatch) {
    console.error('Liste des maillots non trouvée');
    process.exit(1);
}

// Parser les maillots
const jerseyStrings = jerseyMatch[1].match(/{\s*img:[^}]+}/g);
const jerseys = jerseyStrings.map(str => {
    const imgMatch = str.match(/img: '([^']+)'/);
    const nameMatch = str.match(/name: '([^']+)'/);
    const priceMatch = str.match(/price: '([^']+)'/);
    return {
        img: imgMatch[1],
        name: nameMatch[1],
        price: priceMatch[1]
    };
});

// Obtenir une sélection variée de maillots
const variedJerseys = getVariedJerseys(jerseys);

// Formater les maillots en string
const newJerseyList = variedJerseys
    .map(jersey => `          { img: '${jersey.img}', name: '${jersey.name}', price: '${jersey.price}' }`)
    .join(',\n');

// Mettre à jour le fichier
const updatedContent = content.replace(
    /const allJerseys = \[([\s\S]*?)\];/,
    `const allJerseys = [\n${newJerseyList}\n        ];`
);

fs.writeFileSync('index.html', updatedContent);

console.log(`✨ Carousel mis à jour avec ${variedJerseys.length} maillots variés !`);
console.log('🏃 Nombre d\'équipes représentées:', new Set(variedJerseys.map(j => j.name)).size);