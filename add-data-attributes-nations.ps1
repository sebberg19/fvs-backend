$filePath = "maillots-nations.html"
$content = Get-Content $filePath -Raw

# Fonction pour extraire les données du bouton et les ajouter à la div image
function Update-ProductStructure($content) {
    # Pattern pour trouver un produit complet avec son bouton
    $pattern = '(<div class="product-image ratio ratio-1x1 clickable add-to-cart">[\s\S]*?</div>[\s\S]*?<button[^>]*class="[^"]*add-to-cart"[^>]*data-price="([^"]*)"[^>]*data-vintage="([^"]*)"[^>]*data-img="([^"]*)"[^>]*>)'
    
    return [regex]::Replace($content, $pattern, {
        param($match)
        
        $imageDiv = $match.Groups[1].Value
        $price = $match.Groups[2].Value
        $vintage = $match.Groups[3].Value
        $dataImg = $match.Groups[4].Value
        
        # Ajouter les attributs data à la div image
        $updatedDiv = $imageDiv -replace 
            '(<div class="product-image ratio ratio-1x1 clickable add-to-cart")', 
            "`$1 data-price=`"$price`" data-vintage=`"$vintage`" data-img=`"$dataImg`""
        
        return $updatedDiv
    })
}

$updatedContent = Update-ProductStructure $content
Set-Content $filePath $updatedContent -Encoding UTF8
Write-Host "Attributs data ajoutés à tous les produits nations!"