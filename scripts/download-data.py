import csv, io, json, pathlib, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parents[1]
KINDS = {'species': 'pokemon_species_names', 'moves': 'move_names', 'abilities': 'ability_names', 'items': 'item_names'}
def fetch(pair):
    key, filename = pair
    url = f'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/{filename}.csv'
    rows = list(csv.DictReader(io.StringIO(urllib.request.urlopen(url, timeout=40).read().decode('utf-8'))))
    identifiers = {}
    for row in rows:
        identifier = next(iter(row.values()))
        identifiers.setdefault(identifier, {})[row['local_language_id']] = row['name']
    normalize = lambda value: ''.join(c for c in value.lower() if c.isascii() and c.isalnum())
    names = {normalize(langs['9']): langs.get('12', langs.get('4', langs['9'])) for langs in identifiers.values() if '9' in langs}
    return key, names

with ThreadPoolExecutor(max_workers=4) as pool:
    data = dict(pool.map(fetch, KINDS.items()))
(ROOT / 'src').mkdir(exist_ok=True)
(ROOT / 'src' / 'translations.json').write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
print({key:len(value) for key,value in data.items()})
