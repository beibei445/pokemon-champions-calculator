from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

folder=(Path(__file__).resolve().parents[1]/'public'/'pokemon').resolve()
def optimize(source):
    assert source.resolve().parent==folder
    target=source.with_suffix('.webp')
    with Image.open(source) as image:
        image=image.convert('RGBA')
        image.thumbnail((384,384),Image.Resampling.LANCZOS)
        image.save(target,'WEBP',quality=85,method=1)
    if target.stat().st_size>0:
        source.unlink()
        return 1
    return 0
with ThreadPoolExecutor(max_workers=8) as pool:
    saved=sum(pool.map(optimize,list(folder.glob('*.png'))))
print('Optimized',saved,'generated image assets.')
