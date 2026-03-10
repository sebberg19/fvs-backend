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
    c = open(path, encoding='utf-8-sig').read()
    c = c.replace('thÃ¨me', 'thème')
    c = c.replace('complÃ¨tement', 'complètement')
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        f.write(c)
    print(f"{fn}: fixed")

# Final verification of ALL html files
print("\n=== Final verification ===")
for fn in os.listdir(base):
    if fn.endswith('.html') and not fn.startswith('maillots_backup'):
        path = base + fn
        raw = open(path, 'rb').read()
        try:
            if raw[:3] == b'\xef\xbb\xbf':
                c = raw[3:].decode('utf-8')
            else:
                c = raw.decode('utf-8')
            bad = c.count('\ufffd')
            double = c.count('\xc3')  # Ã in text typically means double-encoding
            if bad > 0 or double > 0:
                print(f"  {fn}: FFFD={bad}, stray_Ã={double}")
            else:
                print(f"  {fn}: OK")
        except UnicodeDecodeError as e:
            print(f"  {fn}: NOT UTF-8 (error at {e.start})")
