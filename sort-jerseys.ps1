# Script pour trier les maillots par ordre alphabétique
$htmlPath = "c:\Users\Sebas\Downloads\Futbolero_V4\Futbolero_V3\maillots.html"
$content = Get-Content $htmlPath -Raw -Encoding UTF8

# Extraire tous les blocs de produits
$pattern = '(?s)<div class="col-6 col-md-4 col-lg-3">.*?<h3 class="product-title">(.*?)</h3>.*?</div>\s*</div>\s*</div>'
$matches = [regex]::Matches($content, $pattern)

# Créer un tableau d'objets avec le titre et le bloc HTML
$products = @()
foreach ($match in $matches) {
    $products += @{
        Title = $match.Groups[1].Value.Trim()
        Html = $match.Value
    }
}

Write-Host "Nombre de produits trouvés: $($products.Count)"

# Trier par titre
$sortedProducts = $products | Sort-Object { $_.Title }

# Reconstruire le HTML
$sortedHtml = ($sortedProducts | ForEach-Object { $_.Html }) -join "`n"

# Remplacer la section des produits
$pattern = '(?s)(<!-- Grille de produits -->\s*<div class="row g-0">).*?(</div>\s*</div>\s*</main>)'
$replacement = "`$1`n$sortedHtml`n</div>`n</div>`n</main>"

$newContent = $content -replace $pattern, $replacement

# Sauvegarder
$newContent | Out-File $htmlPath -Encoding UTF8 -NoNewline

Write-Host "Produits triés et fichier mis à jour!"
Write-Host "Premiers 10 produits:"
$sortedProducts[0..9] | ForEach-Object { Write-Host "  - $($_.Title)" }
