import os

files = [
    'maillots-pays.html',
    'maillots-vintage.html', 
    'pays-vintage.html',
    'tous-les-maillots.html'
]
base = 'c:/Users/Sebas/Desktop/Futbolero_V6/'

for fn in files:
    path = base + fn
    raw = open(path, 'rb').read()
    # Strip UTF-8 BOM if present
    if raw[:3] == b'\xef\xbb\xbf':
        raw = raw[3:]
    # Decode from Windows-1252 (the actual encoding)
    content = raw.decode('windows-1252')
    # Re-save as UTF-8 with BOM (consistent with index.html)
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        f.write(content)
    # Verify
    verify = open(path, encoding='utf-8-sig').read()
    bad = verify.count('ï¿½')
    print(f"{fn}: saved as UTF-8, ï¿½={bad}, OK={'yes' if bad==0 else 'NO'}")
