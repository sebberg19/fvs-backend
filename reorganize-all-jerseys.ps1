# Script pour réorganiser TOUS les maillots par ordre alphabétique
$inputFile = "C:\Users\Sebas\Downloads\Futbolero_V4\Futbolero_V3\maillots.html"
$backupFile = "C:\Users\Sebas\Downloads\Futbolero_V4\Futbolero_V3\maillots_backup_complete_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"

# Créer une sauvegarde
Copy-Item $inputFile $backupFile
Write-Host "Sauvegarde créée: $backupFile"

# Lire le contenu du fichier HTML
$content = Get-Content $inputFile -Raw -Encoding UTF8

# Pattern pour trouver toute la section de produits
$startPattern = '<div class="row g-0">'

# Trouver le début
$startIndex = $content.IndexOf($startPattern)
if ($startIndex -eq -1) {
    Write-Error "Erreur: impossible de trouver la balise de début des produits"
    exit 1
}

# Trouver la fin - chercher la fermeture de la grille
$gridStart = $startIndex + $startPattern.Length
$remainingContent = $content.Substring($gridStart)

# Chercher la fermeture: </div> <!-- /row g-0 -->
$endPattern = '</div> <!-- /row g-0 -->'
$endIndex = $remainingContent.IndexOf($endPattern)

if ($endIndex -eq -1) {
    # Alternative: chercher juste avant le </div> de fermeture du container
    $containerEnd = $remainingContent.IndexOf('</div>')
    if ($containerEnd -ne -1) {
        $endIndex = $containerEnd
    } else {
        Write-Error "Impossible de trouver la fin des produits"
        exit 1
    }
}

$realEndIndex = $gridStart + $endIndex

Write-Host "Section des produits trouvée - Début: $startIndex, Fin: $realEndIndex"

# Extraire les parties
$beforeProducts = $content.Substring(0, $startIndex + $startPattern.Length)
$afterProducts = $content.Substring($realEndIndex)
$productsSection = $content.Substring($startIndex + $startPattern.Length, $endIndex)

Write-Host "Longueur de la section des produits: $($productsSection.Length) caractères"

# Pattern amélioré pour capturer chaque div de produit
# On utilise un pattern plus simple qui capture chaque col-6 col-md-4 col-lg-3
$lines = $productsSection -split "`n"
$products = @()
$currentProduct = @()
$inProduct = $false

foreach ($line in $lines) {
    $trimmedLine = $line.Trim()
    
    # Début d'un produit
    if ($trimmedLine -match '^<div class="col-6 col-md-4 col-lg-3">') {
        if ($currentProduct.Count -gt 0) {
            # Sauvegarder le produit précédent
            $products += ,@($currentProduct)
        }
        $currentProduct = @($line)
        $inProduct = $true
    }
    elseif ($inProduct) {
        $currentProduct += $line
        
        # Fin d'un produit (3 </div> consécutives)
        if ($trimmedLine -eq '</div>' -and $currentProduct.Count -gt 10) {
            # Vérifier les 2 lignes précédentes
            $prevLine1 = if ($currentProduct.Count -ge 2) { $currentProduct[-2].Trim() } else { "" }
            $prevLine2 = if ($currentProduct.Count -ge 3) { $currentProduct[-3].Trim() } else { "" }
            
            if ($prevLine1 -eq '</div>' -and ($prevLine2 -eq '</div>' -or $prevLine2 -match '</button>')) {
                $inProduct = $false
            }
        }
    }
}

# Ajouter le dernier produit si nécessaire
if ($currentProduct.Count -gt 0) {
    $products += ,@($currentProduct)
}

Write-Host "Nombre de produits trouvés: $($products.Count)"

# Définir les corrections de noms
$nameCorrections = @{
    'Lazzio' = 'Lazio'
    'Lerverkussen' = 'Bayer Leverkusen'
    'Leverkussen' = 'Bayer Leverkusen'
    'Byern' = 'Bayern Munich'
    'Barcelone' = 'FC Barcelone'
    'SSC Napoli' = 'Napoli'
    'Atlético de Madrid' = 'Atlético Madrid'
    'Bayer Leverkussen' = 'Bayer Leverkusen'
    'Venezia Fc' = 'Venezia'
    'Malaga Fc' = 'Málaga'
    'UD Las Palmas' = 'Las Palmas'
    'VfB Stuttgart' = 'Stuttgart'
    'Werder Brême' = 'Werder Bremen'
    'Eintracht Francfort' = 'Eintracht Frankfurt'
    'Brighton & Hove Albion' = 'Brighton'
}

# Créer une liste d'objets produit avec leurs noms pour le tri
$productList = @()

foreach ($product in $products) {
    $productHtml = $product -join "`n"
    
    # Extraire le nom du produit
    if ($productHtml -match '<h3 class="product-title">([^<]+)</h3>') {
        $originalName = $matches[1].Trim()
        
        # Appliquer les corrections de nom si nécessaire
        $correctedName = $originalName
        foreach ($key in $nameCorrections.Keys) {
            if ($originalName -eq $key) {
                $correctedName = $nameCorrections[$key]
                # Remplacer dans le HTML aussi
                $productHtml = $productHtml -replace [regex]::Escape("<h3 class=`"product-title`">$originalName</h3>"), "<h3 class=`"product-title`">$correctedName</h3>"
                break
            }
        }
        
        $productList += @{
            'Name' = $correctedName
            'Html' = $productHtml
        }
    } else {
        Write-Warning "Nom de produit non trouvé dans: $($productHtml.Substring(0, [Math]::Min(100, $productHtml.Length)))"
    }
}

Write-Host "Produits extraits: $($productList.Count)"

if ($productList.Count -eq 0) {
    Write-Error "Aucun produit extrait"
    exit 1
}

# Trier par nom alphabétiquement
$sortedProducts = $productList | Sort-Object Name

Write-Host "Produits triés par ordre alphabétique"

# Reconstruire la section HTML
$newProductsSection = ""
foreach ($product in $sortedProducts) {
    $newProductsSection += $product.Html + "`r`n`r`n"
}

# Reconstruire le contenu complet
$newContent = $beforeProducts + "`r`n" + $newProductsSection + $afterProducts

# Sauvegarder le nouveau contenu
try {
    [System.IO.File]::WriteAllText($inputFile, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Fichier réorganisé avec succès!"
    Write-Host "Les maillots ont été triés par ordre alphabétique et les noms incorrects ont été corrigés."
    Write-Host "Nombre total de produits traités: $($sortedProducts.Count)"
} catch {
    Write-Error "Erreur lors de l'écriture du fichier: $_"
    # Restaurer la sauvegarde en cas d'erreur
    Copy-Item $backupFile $inputFile
    Write-Host "Sauvegarde restaurée"
}
