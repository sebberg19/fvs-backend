# Script pour réorganiser les maillots par ordre alphabétique
$inputFile = "C:\Users\Sebas\Downloads\Futbolero_V4\Futbolero_V3\maillots.html"
$backupFile = "C:\Users\Sebas\Downloads\Futbolero_V4\Futbolero_V3\maillots_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').html"

# Créer une sauvegarde
Copy-Item $inputFile $backupFile
Write-Host "Sauvegarde créée: $backupFile"

# Lire le contenu du fichier HTML
$content = Get-Content $inputFile -Raw -Encoding UTF8

# Pattern pour trouver toute la section de produits
$startPattern = '<div class="row g-0">'
$endMarker = '<!-- ====== /FIN BLOC ====== -->'

# Trouver les indices de début et fin
$startIndex = $content.IndexOf($startPattern)
$endMarkerIndex = $content.IndexOf($endMarker)

if ($startIndex -eq -1) {
    Write-Error "Erreur: impossible de trouver la balise de début des produits"
    exit 1
}

if ($endMarkerIndex -eq -1) {
    Write-Host "Commentaire de fin non trouvé, recherche de la fermeture de div"
    # Chercher la fermeture de div après la dernière section
    $lastProductEnd = $content.LastIndexOf('</div>')
    $beforeLastProduct = $content.Substring(0, $lastProductEnd)
    $lastCompleteDiv = $beforeLastProduct.LastIndexOf('</div>')
    $endIndex = $lastCompleteDiv + 6 # longueur de "</div>"
} else {
    # Trouver la fermeture de div juste après le commentaire de fin
    $afterEndMarker = $content.Substring($endMarkerIndex + $endMarker.Length)
    $firstDivClose = $afterEndMarker.IndexOf("</div>")
    $endIndex = $endMarkerIndex + $endMarker.Length + $firstDivClose
}

Write-Host "Balises trouvées - Début: $startIndex, Fin: $endIndex"

# Extraire la section des produits
$beforeProducts = $content.Substring(0, $startIndex + $startPattern.Length)
$afterProducts = $content.Substring($endIndex)
$productsSection = $content.Substring($startIndex + $startPattern.Length, $endIndex - $startIndex - $startPattern.Length)

# Nettoyer la section des produits - enlever le commentaire de fin s'il existe
$productsSection = $productsSection -replace '<!-- ====== /FIN BLOC ====== -->\s*', ''

# Pattern pour extraire chaque produit complet
$productPattern = '(?s)<div class="col-6 col-md-4 col-lg-3">\s*<div class="product-card h-100">.*?</div>\s*</div>\s*</div>'

# Extraire tous les produits
$products = [System.Text.RegularExpressions.Regex]::Matches($productsSection, $productPattern)

Write-Host "Nombre de produits trouvés: $($products.Count)"

if ($products.Count -eq 0) {
    Write-Error "Aucun produit trouvé avec le pattern"
    exit 1
}

# Définir les corrections de noms
$nameCorrections = @{
    'Lazzio' = 'Lazio'
    'Lerverkussen' = 'Bayer Leverkusen'
    'Leverkussen' = 'Bayer Leverkusen'
    'Byern' = 'Bayern Munich'
    'Barcelone' = 'FC Barcelone'
    'SSC Napoli' = 'Napoli'
    'Napoli' = 'Napoli'
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

foreach ($match in $products) {
    $productHtml = $match.Value
    
    # Extraire le nom du produit
    if ($productHtml -match '<h3 class="product-title">([^<]+)</h3>') {
        $originalName = $matches[1].Trim()
        
        # Appliquer les corrections de nom si nécessaire
        $correctedName = $originalName
        foreach ($key in $nameCorrections.Keys) {
            if ($originalName -eq $key) {
                $correctedName = $nameCorrections[$key]
                # Remplacer dans le HTML aussi
                $productHtml = $productHtml -replace [regex]::Escape($originalName), $correctedName
                break
            }
        }
        
        $productList += @{
            'Name' = $correctedName
            'Html' = $productHtml
        }
    }
}

Write-Host "Produits extraits: $($productList.Count)"

# Trier par nom alphabétiquement
$sortedProducts = $productList | Sort-Object Name

Write-Host "Produits triés par ordre alphabétique"

# Reconstruire la section HTML
$newProductsSection = ""
foreach ($product in $sortedProducts) {
    $newProductsSection += $product.Html + "`r`n`r`n"
}

# Ajouter le commentaire de fin et fermer la div
$newProductsSection += "<!-- ====== /FIN BLOC ====== -->`r`n"

# Reconstruire le contenu complet
$newContent = $beforeProducts + "`r`n" + $newProductsSection + $afterProducts

# Sauvegarder le nouveau contenu
try {
    [System.IO.File]::WriteAllText($inputFile, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Fichier réorganisé avec succès!"
    Write-Host "Les maillots ont été triés par ordre alphabétique et les noms incorrects ont été corrigés."
} catch {
    Write-Error "Erreur lors de l'écriture du fichier: $_"
    # Restaurer la sauvegarde en cas d'erreur
    Copy-Item $backupFile $inputFile
    Write-Host "Sauvegarde restaurée"
}
