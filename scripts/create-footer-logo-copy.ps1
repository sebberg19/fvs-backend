# Copy the white FVS logo to the footer-specific filename expected by the site
$src = Join-Path $PSScriptRoot '..\assets\FVS-W.png'
$dst = Join-Path $PSScriptRoot '..\assets\FVS_LOGO_PNG_BLANC_footer.png'
if (-Not (Test-Path $src)) {
    Write-Error "Source logo not found: $src"
    exit 1
}
Copy-Item -Path $src -Destination $dst -Force
Write-Output "Created: $dst"