# Script pour réorganiser les maillots par ordre alphabétique
# et corriger les noms incohérents

$htmlFile = "maillots.html"
$backupFile = "maillots_backup.html"

Write-Host "Création d'une sauvegarde..." -ForegroundColor Yellow
Copy-Item $htmlFile $backupFile -Force

Write-Host "Lecture du fichier HTML..." -ForegroundColor Green
$content = Get-Content $htmlFile -Raw -Encoding UTF8

# Corrections des noms incohérents
Write-Host "Correction des noms de clubs..." -ForegroundColor Cyan
$corrections = @{
    "Lazzio" = "Lazio"
    "Lerverkussen" = "Bayer Leverkusen"
    "Leverkussen" = "Bayer Leverkusen"
    "Byern" = "Bayern Munich"
    "Barcelone" = "FC Barcelone"
    "Bayer Leverkussen" = "Bayer Leverkusen"
}

foreach ($incorrect in $corrections.Keys) {
    $correct = $corrections[$incorrect]
    $pattern = "<h3 class=`"product-title`">$incorrect</h3>"
    $replacement = "<h3 class=`"product-title`">$correct</h3>"
    $content = $content -replace [regex]::Escape($pattern), $replacement
    Write-Host "  $incorrect -> $correct" -ForegroundColor Yellow
}

# Extraction de tous les blocs de produits
Write-Host "Extraction des blocs de produits..." -ForegroundColor Green
$productPattern = '(?s)(<div class="col-6 col-md-4 col-lg-3">.*?</div>\s*</div>\s*</div>)'
$matches = [regex]::Matches($content, $productPattern)

Write-Host "Trouvé $($matches.Count) produits" -ForegroundColor Cyan

# Créer un tableau avec les produits et leurs titres pour le tri
$products = @()
foreach ($match in $matches) {
    $productHtml = $match.Value
    $titleMatch = [regex]::Match($productHtml, '<h3 class="product-title">([^<]+)</h3>')
    if ($titleMatch.Success) {
        $title = $titleMatch.Groups[1].Value.Trim()
        $products += [PSCustomObject]@{
            Title = $title
            Html = $productHtml
        }
    }
}

Write-Host "Tri alphabétique des produits..." -ForegroundColor Green
$sortedProducts = $products | Sort-Object Title

# Reconstruction du contenu
Write-Host "Reconstruction du fichier HTML..." -ForegroundColor Green

# Trouver le début et la fin de la section des produits
$startPattern = '(?s)(<div class="row g-0">)'
$endPattern = '(?s)(</div>\s*</div>\s*<script src="https://cdn\.jsdelivr\.net)'

$startMatch = [regex]::Match($content, $startPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
$endMatch = [regex]::Match($content, $endPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

if ($startMatch.Success -and $endMatch.Success) {
    $beforeProducts = $content.Substring(0, $startMatch.Index + $startMatch.Length)
    $afterProducts = $content.Substring($endMatch.Index)
    
    # Construire la section des produits triés
    $productsSection = ""
    $groupCount = 0
    
    foreach ($product in $sortedProducts) {
        $productsSection += "`r`n      " + $product.Html
        $groupCount++
        
        # Ajouter un commentaire tous les 10 produits pour la lisibilité
        if ($groupCount % 10 -eq 0) {
            $productsSection += "`r`n      <!-- $groupCount produits -->"
        }
    }
    
    # Assemblage final
    $newContent = $beforeProducts + $productsSection + "`r`n    " + $afterProducts
    
    Write-Host "Écriture du nouveau fichier..." -ForegroundColor Green
    Set-Content $htmlFile $newContent -Encoding UTF8
    
    Write-Host "Réorganisation terminée !" -ForegroundColor Green
    Write-Host "Total: $($sortedProducts.Count) produits triés alphabétiquement" -ForegroundColor Cyan
    Write-Host "Sauvegarde créée: $backupFile" -ForegroundColor Yellow
    
    # Afficher les premiers clubs pour vérification
    Write-Host "`nPremiers clubs (vérification):" -ForegroundColor Magenta
    $sortedProducts | Select-Object -First 10 | ForEach-Object { 
        Write-Host "  - $($_.Title)" -ForegroundColor White
    }
    
} else {
    Write-Host "Erreur: impossible de trouver les balises de début/fin des produits" -ForegroundColor Red
}
