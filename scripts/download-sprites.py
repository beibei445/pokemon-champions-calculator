import concurrent.futures, json, pathlib, re, urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
directory=root/'public'/'pokemon'
directory.mkdir(parents=True,exist_ok=True)
index=urllib.request.urlopen('https://play.pokemonshowdown.com/sprites/dex/',timeout=30).read().decode()
files=set(re.findall(r'href="([^"/]+\.png)"',index))
pokemon=json.loads((root/'src'/'dex.json').read_text(encoding='utf-8'))['pokemon']
def fetch(s):
 filename=s['sprite']+'.png'
 if filename not in files: return filename
 try:
  dest=directory/filename
  if not dest.exists(): dest.write_bytes(urllib.request.urlopen('https://play.pokemonshowdown.com/sprites/dex/'+filename,timeout=25).read())
  return None
 except Exception: return filename
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
 missing=list(filter(None,pool.map(fetch,pokemon)))
(directory/'available.json').write_text(json.dumps([p.stem for p in directory.glob('*.png')]))
print('Saved',len(list(directory.glob('*.png'))),'sprites. Missing:',missing)
