const fs = require('fs');

// Lire le fichier
const filePath = 'maillots-nations.html';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fichier lu avec succès');

// Chercher toutes les variations possibles
const patterns = [
    / \(Équipe nationale\)/g,
    / \(Équipe nationale\)/g,
    / \(Equipe nationale\)/g,
    / \(ÉQUIPE NATIONALE\)/g
];

let totalReplacements = 0;

patterns.forEach((pattern, index) => {
    const matches = content.match(pattern) || [];
    console.log(`Pattern ${index + 1}: ${matches.length} matches`);
    if (matches.length > 0) {
        content = content.replace(pattern, '');
        totalReplacements += matches.length;
    }
});

// Chercher également sans l'espace avant
const morePatterns = [
    /\(Équipe nationale\)/g,
    /\(Équipe nationale\)/g,
    /\(Equipe nationale\)/g
];

morePatterns.forEach((pattern, index) => {
    const matches = content.match(pattern) || [];
    console.log(`No space pattern ${index + 1}: ${matches.length} matches`);
    if (matches.length > 0) {
        content = content.replace(pattern, '');
        totalReplacements += matches.length;
    }
});

console.log(`Total replacements: ${totalReplacements}`);

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fichier sauvegardé avec succès');