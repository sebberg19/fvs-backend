# Script pour supprimer "(Équipe nationale)" des titres de produits dans maillots-nations.html

$filePath = "maillots-nations.html"
$content = Get-Content $filePath -Raw

# Liste des pays et leurs variations à nettoyer
$replacements = @{
    'Algeria1 (Équipe nationale)' = 'Algeria1'
    'Argentine (Équipe nationale)' = 'Argentine'
    'Brésil (Équipe nationale)' = 'Brésil'
    'Cameroun (Équipe nationale)' = 'Cameroun'
    'Canada (Équipe nationale)' = 'Canada'
    'Croatie (Équipe nationale)' = 'Croatie'
    'Colombie (Équipe nationale)' = 'Colombie'
    'Espagne (Équipe nationale)' = 'Espagne'
    'Etats Unis (Équipe nationale)' = 'Etats Unis'
    'France (Équipe nationale)' = 'France'
    'Allemagne (Équipe nationale)' = 'Allemagne'
    'Italie (Équipe nationale)' = 'Italie'
    'Japon (Équipe nationale)' = 'Japon'
    'Mexique (Équipe nationale)' = 'Mexique'
    'Maroc (Équipe nationale)' = 'Maroc'
    'Pays-Bas (Équipe nationale)' = 'Pays-Bas'
    'Nigeria (Équipe nationale)' = 'Nigeria'
    'Pologne (Équipe nationale)' = 'Pologne'
    'Portugal (Équipe nationale)' = 'Portugal'
    'Angleterre (Équipe nationale)' = 'Angleterre'
}

$updatedContent = $content
foreach ($replacement in $replacements.GetEnumerator()) {
    $oldText = $replacement.Key
    $newText = $replacement.Value
    $updatedContent = $updatedContent -replace [regex]::Escape($oldText), $newText
}

# Sauvegarde le fichier modifié
$updatedContent | Set-Content $filePath -Encoding UTF8

Write-Host "Suppression de '(Équipe nationale)' terminée dans $filePath"
Write-Host "Vérification des changements..."

# Vérification rapide
$remainingMatches = Select-String -Path $filePath -Pattern "\(Équipe nationale\)"
if ($remainingMatches) {
    Write-Host "ATTENTION: Des occurrences restantes trouvées:"
    $remainingMatches | ForEach-Object { Write-Host "  Ligne $($_.LineNumber): $($_.Line.Trim())" }
} else {
    Write-Host "✓ Tous les '(Équipe nationale)' ont été supprimés avec succès!"
}