import re

files = ['maillots-pays.html', 'maillots-vintage.html', 'pays-vintage.html', 'tous-les-maillots.html']
base = 'c:/Users/Sebas/Desktop/Futbolero_V6/'

for fn in files:
    raw = open(base + fn, 'rb').read()
    # Decode as Windows-1252 (superset of Latin-1, handles all 0x80-0xFF correctly)
    c = raw.decode('windows-1252')
    # Check declared charset
    m = re.search(r'charset[^\">]*', c[:500])
    print(f"{fn}: charset={m.group() if m else 'none'}")
    # Count accented chars
    accents = len(re.findall(r'[éèêàâçïœùûôîäëü]', c))
    print(f"  accents: {accents}")
    # Show a snippet with accents
    idx = c.find('Ã')
    if idx >= 0:
        print(f"  Ã context: {repr(c[max(0,idx-30):idx+30])}")
    print()
