const fs = require('fs');

// Lire le fichier
const filePath = 'maillots-nations.html';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fichier lu avec succès');
console.log('Nombre de matches avant:', (content.match(/ \(Équipe nationale\)/g) || []).length);

// Remplacer tous les '(Équipe nationale)'
content = content.replace(/ \(Équipe nationale\)/g, '');

console.log('Nombre de matches après:', (content.match(/ \(Équipe nationale\)/g) || []).length);

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fichier sauvegardé avec succès');