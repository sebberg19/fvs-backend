# Script pour supprimer (Equipe nationale) des titres de produits
$filePath = "maillots-nations.html"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Remplacement simple avec regex
$updatedContent = $content -replace ' \(Équipe nationale\)', ''

# Sauvegarde
$updatedContent | Set-Content $filePath -Encoding UTF8

Write-Host "Suppression terminee"

# Verification
$remaining = Select-String -Path $filePath -Pattern "\(Équipe nationale\)"
if ($remaining) {
    Write-Host "Occurrences restantes: $($remaining.Count)"
} else {
    Write-Host "Tous les textes ont ete supprimes avec succes!"
}