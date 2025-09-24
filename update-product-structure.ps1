# Script pour mettre à jour la structure des produits
$filePath = "c:\Users\Sebas\Downloads\Futbolero_V4\Futbolero_V3\maillots.html"
$content = Get-Content $filePath -Raw

# Pattern pour trouver les divs product-image qui n'ont pas encore les classes clickable add-to-cart
$pattern = '<div class="product-image ratio ratio-1x1">(?!\s*<img[^>]*>)[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?</div>[\s\S]*?<button[^>]*data-price="([^"]*)"[^>]*data-vintage="([^"]*)"[^>]*data-img="([^"]*)"[^>]*>.*?</button>'

# Fonction pour remplacer chaque occurrence
$updatedContent = [regex]::Replace($content, $pattern, {
    param($match)
    
    $imgSrc = $match.Groups[1].Value
    $altText = $match.Groups[2].Value
    $price = $match.Groups[3].Value
    $vintage = $match.Groups[4].Value
    $dataImg = $match.Groups[5].Value
    
    # Construire la nouvelle structure
    $newStructure = @"
<div class="product-image ratio ratio-1x1 clickable add-to-cart" data-price="$price" data-vintage="$vintage" data-img="$dataImg">
      <img loading="lazy" src="$imgSrc" alt="$altText" class="w-100 h-100 object-fit-cover">
    </div>
    <div class="product-info">
      <h3 class="product-title">$altText</h3>
      <div class="product-price">$($price.Replace('.', ',')) CAD</div>
      <button class="product-btn btn btn-dark add-to-cart" data-price="$price" data-vintage="$vintage" data-img="$dataImg">Ajouter</button>
    </div>
"@
    
    return $newStructure
}, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

# Écrire le contenu mis à jour
Set-Content $filePath $updatedContent -Encoding UTF8

Write-Host "Mise à jour terminée pour $filePath"