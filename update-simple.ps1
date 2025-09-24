# Script simple pour ajouter les classes clickable add-to-cart à tous les product-image
$filePath = "c:\Users\Sebas\Downloads\Futbolero_V4\Futbolero_V3\maillots.html"
$content = Get-Content $filePath -Raw

# Remplacer toutes les divs product-image qui n'ont pas encore les classes
$content = $content -replace '<div class="product-image ratio ratio-1x1">(?![^<]*clickable)', '<div class="product-image ratio ratio-1x1 clickable add-to-cart" data-price="36.70" data-vintage="true" data-img="">'

# Pour avoir les bonnes données, on va d'abord extraire les infos des boutons
# Pattern plus spécifique pour chaque produit complet
$productPattern = '(<div class="product-image ratio ratio-1x1 clickable add-to-cart" data-price="" data-vintage="" data-img="">[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?</div>[\s\S]*?<button[^>]*data-price="([^"]*)"[^>]*data-vintage="([^"]*)"[^>]*data-img="([^"]*)"[^>]*>)'

$content = [regex]::Replace($content, $productPattern, {
    param($match)
    $fullMatch = $match.Groups[1].Value
    $imgSrc = $match.Groups[2].Value
    $price = $match.Groups[3].Value
    $vintage = $match.Groups[4].Value
    $dataImg = $match.Groups[5].Value
    
    # Remplacer les attributs vides par les bonnes valeurs
    $updated = $fullMatch -replace 'data-price=""', "data-price=`"$price`""
    $updated = $updated -replace 'data-vintage=""', "data-vintage=`"$vintage`""
    $updated = $updated -replace 'data-img=""', "data-img=`"$dataImg`""
    
    return $updated
}, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

Set-Content $filePath $content -Encoding UTF8
Write-Host "Mise à jour terminée!"