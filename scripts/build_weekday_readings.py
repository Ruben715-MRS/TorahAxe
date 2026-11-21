# Construit data/torah/weekday.json : les trois montées de la lecture du lundi et du jeudi pour chaque paracha, et les lectures des jours
# particuliers en semaine (Roch 'Hodech, jeûne public, Pourim, 9 Av). Source : le paquet npm @hebcal/leyning (licence BSD-2-Clause),
# fichiers dist/esm/aliyot.json.js et holiday-readings.json.js, lus comme des données JSON (aucun code du paquet n'est exécuté).
# Usage : python3 -I scripts/build_weekday_readings.py <dossier dist/esm du paquet>. À relire.
import json, re, sys, os

def load(name):
    txt = open(os.path.join(sys.argv[1], name), encoding='utf-8').read()
    txt = re.sub(r'//# sourceMappingURL=.*', '', txt).strip()
    txt = re.sub(r'^export default\s*', '', txt).rstrip().rstrip(';')
    txt = re.sub(r',(\s*[}\]])', r'\1', txt)
    return json.loads(txt)

aliyot = load('aliyot.json.js')
hol = load('holiday-readings.json.js')
cv = lambda s: [int(x) for x in s.split(':')]
rng = lambda b, e: cv(b) + cv(e)
pars = sorted((p for p in aliyot.values() if isinstance(p, dict) and p.get('num') and p.get('weekday')), key=lambda p: p['num'])
parashot = [{'book': p['book'], 'a': [rng(*p['weekday'][k][:2]) for k in '123']} for p in pars]
assert len(parashot) == 54, len(parashot)
def special(key):
    r = hol[key]
    if r.get('alias'): r = hol[r['key']]
    r = r['fullkriyah']
    ks = sorted(k for k in r if re.fullmatch(r'\d', k))
    return {'book': r[ks[0]]['k'], 'a': [rng(r[k]['b'], r[k]['e']) for k in ks]}
out = {'v': 1, 'source': 'Hebcal, @hebcal/leyning (BSD-2-Clause)', 'parashot': parashot,
       'special': {'rc': special('Rosh Chodesh'), 'fast': special('Tzom Gedaliah'), 'purim': special('Purim'), 'tishaBav': special("Tish'a B'Av")}}
json.dump(out, open('data/torah/weekday.json', 'w'), separators=(',', ':'))
print('ok', len(parashot), json.dumps(out['special']), parashot[0])
