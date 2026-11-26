#!/usr/bin/env python3
"""Génère data/kevarim/kevarim.json à partir de scripts/sources/hiloulot-majeures.xlsx (le fichier de Ruben : 180 lignes, 9 colonnes).

Ce que le script ajoute au tableur (rien d'autre n'est inventé) :
  - la date de hilloula (mois + jour hébraïques), lue dans la colonne 3 ; absente quand la ligne n'a pas de jour et de mois précis ;
  - un point sur la carte (PLACES, ci-dessous), choisi d'après la colonne 4. Les coordonnées données dans le tableur sont reprises telles quelles
    (precision « site ») ; les autres sont celles du centre de la ville, ou d'une région (precision « ville » / « region ») : elles sont APPROXIMATIVES ;
  - le statut du tombeau (documente / tradition / conteste / inconnu), lu dans la colonne 5 ;
  - l'époque et le rite, lus dans la colonne 7 (pour les filtres) ;
  - authorId : l'identifiant du maître dans la chaîne de transmission (js/transmissionCore.js), qui relie la fiche à la bibliothèque ;
  - hilId : l'identifiant de la même personne dans data/hilloulot/hilloulot.json (dates vérifiées contre Wikidata : elles priment sur le tableur).
Les lignes sans lieu précis ou avec plusieurs lieux possibles ne sont PAS placées sur la carte : elles restent dans la liste.
Usage : python3 scripts/build_kevarim.py   (nécessite openpyxl)
"""
import json, os, re, sys
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'scripts', 'sources', 'hiloulot-majeures.xlsx')
OUT = os.path.join(ROOT, 'data', 'kevarim', 'kevarim.json')

# Les points : clé -> (nom affiché, latitude, longitude, précision). site : lieu précis ; ville : centre de la ville ; region : zone approximative.
PLACES = {
    'hebron': ("Ma'arat HaMakhpéla, Hébron", 31.5247, 35.1107, 'site'),
    'rachel': ('Kever Ra’hel, Bethléem', 31.7188, 35.2021, 'site'),
    'nabi_samwil': ('Nabi Samwil, près de Jérusalem', 31.833, 35.180, 'site'),
    'meron': ('Méron', 32.9808, 35.4406, 'site'),
    'david': ('Mont Sion, Jérusalem', 31.7714, 35.2288, 'site'),
    'jerusalem': ('Jérusalem', 31.7683, 35.2137, 'ville'),
    'oliviers': ('Mont des Oliviers, Jérusalem', 31.7786, 35.2437, 'site'),
    'sanhedria': ('Sanhédria, Jérusalem', 31.7948, 35.2112, 'site'),
    'tiberiade': ('Tibériade', 32.7922, 35.5312, 'ville'),
    'safed': ('Safed (cimetière ancien)', 32.9646, 35.4960, 'ville'),
    'beit_shearim': ('Beit She’arim (ou Tsippori)', 32.7058, 35.1293, 'region'),
    'ezechiel': ('Al-Kifl (Irak)', 32.2167, 44.3833, 'ville'),
    'soura': ('Soura (Babylonie)', 32.05, 44.45, 'region'),
    'nehardea': ('Nehardea (Babylonie)', 33.35, 43.8, 'region'),
    'pumbedita': ('Pumbedita (Babylonie)', 33.35, 43.78, 'region'),
    'mehoza': ('Mé’hoza (Babylonie)', 33.09, 44.58, 'region'),
    'narash': ('Narash (Babylonie)', 32.0, 44.4, 'region'),
    'troyes': ('Troyes', 48.2973, 4.0744, 'ville'),
    'ramerupt': ('Ramerupt', 48.5333, 4.2167, 'ville'),
    'lucena': ('Lucena', 37.4088, -4.4851, 'ville'),
    'barcelone': ('Barcelone', 41.3874, 2.1686, 'ville'),
    'seville': ('Séville', 37.3891, -5.9845, 'ville'),
    'tolede': ('Tolède', 39.8628, -4.0273, 'ville'),
    'perpignan': ('Perpignan', 42.6887, 2.8948, 'ville'),
    'narbonne': ('Narbonne', 43.1837, 3.0035, 'ville'),
    'nuremberg': ('Nuremberg', 49.4521, 11.0767, 'ville'),
    'worms': ('Worms', 49.6341, 8.3507, 'ville'),
    'mayence': ('Mayence', 49.9929, 8.2473, 'ville'),
    'gaza': ('Gaza', 31.5017, 34.4668, 'ville'),
    'medzhybizh': ('Medzhybizh (Ukraine)', 49.4333, 27.4167, 'ville'),
    'hannopil': ('Hannopil (Annopol, Ukraine)', 50.30, 26.80, 'region'),
    'hadiach': ('Hadiach (Ukraine)', 50.3667, 34.0, 'ville'),
    'ouman': ('Ouman (Ukraine)', 48.7484, 30.2218, 'ville'),
    'lezajsk': ('Leżajsk (Pologne)', 50.2614, 22.4219, 'ville'),
    'berditchev': ('Berditchev (Ukraine)', 49.8939, 28.5986, 'ville'),
    'kozienice': ('Kozienice (Pologne)', 51.5833, 21.5667, 'ville'),
    'przysucha': ('Przysucha (Pologne)', 51.3667, 20.6167, 'ville'),
    'kock': ('Kock (Pologne)', 51.6419, 22.4386, 'ville'),
    'gora_kalwaria': ('Góra Kalwaria (Ger, Pologne)', 51.9767, 21.2194, 'ville'),
    'bobowa': ('Bobowa (Pologne)', 49.7167, 21.1667, 'ville'),
    'sanz': ('Nowy Sącz (Sanz, Pologne)', 49.6247, 20.6911, 'ville'),
    'sadagora': ('Sadagora (Ukraine)', 48.3167, 25.9833, 'ville'),
    'queens': ('Queens, New York (Ohel)', 40.7282, -73.7949, 'ville'),
    'new_york': ('New York', 40.7128, -74.0060, 'ville'),
    'volodymyr': ('Volodymyr (Ludmir, Ukraine)', 50.8472, 24.3228, 'ville'),
    'damanhur': ('Damanhur (Égypte)', 31.0341, 30.4682, 'ville'),
    'rissani': ('Rissani (Maroc)', 31.2833, -4.2667, 'ville'),
    'netivot': ('Netivot', 31.4208, 34.5886, 'ville'),
    'ramla': ('Ramla', 31.9288, 34.8704, 'ville'),
    'bagdad': ('Bagdad', 33.3152, 44.3661, 'ville'),
    'izmir': ('Izmir', 38.4237, 27.1428, 'ville'),
    'tel_aviv': ('Tel Aviv', 32.0853, 34.7818, 'ville'),
    'livourne': ('Livourne', 43.5485, 10.3106, 'ville'),
    'meknes': ('Meknès', 33.8935, -5.5473, 'ville'),
    'mogador': ('Mogador (Essaouira)', 31.5085, -9.7595, 'ville'),
    'le_caire': ('Le Caire', 30.0444, 31.2357, 'ville'),
    'marseille': ('Marseille', 43.2965, 5.3698, 'ville'),
    'paris': ('Paris', 48.8566, 2.3522, 'ville'),
    'vilnius': ('Vilnius', 54.6872, 25.2797, 'ville'),
    'radin': ('Radin (Biélorussie)', 54.0472, 25.0, 'ville'),
    'cracovie': ('Cracovie', 50.0647, 19.9450, 'ville'),
    'lviv': ('Lviv (Lwów, Ukraine)', 49.8397, 24.0297, 'ville'),
    'holesov': ('Holešov (Tchéquie)', 49.3333, 17.5833, 'ville'),
    'novardok': ('Novogroudok (Novardok, Biélorussie)', 53.5961, 25.8208, 'ville'),
    'koenigsberg': ('Königsberg (Kaliningrad)', 54.7104, 20.4522, 'ville'),
    'varsovie': ('Varsovie', 52.2297, 21.0122, 'ville'),
    'bnei_brak': ('Bnei Brak', 32.0807, 34.8338, 'ville'),
    'kovno': ('Kovno (Kaunas, Lituanie)', 54.8985, 23.9036, 'ville'),
    'kamenitz': ('Kamenitz (Kamyanyets, Biélorussie)', 52.4047, 23.8222, 'ville'),
    'grodno': ('Grodno (Biélorussie)', 53.6693, 23.8131, 'ville'),
    'dvinsk': ('Dvinsk (Daugavpils, Lettonie)', 55.8747, 26.5361, 'ville'),
    'presbourg': ('Presbourg (Bratislava)', 48.1486, 17.1077, 'ville'),
    'kairouan': ('Kairouan (Tunisie)', 35.6781, 10.0963, 'ville'),
    'regensburg': ('Ratisbonne (Regensburg, Allemagne)', 49.0134, 12.1016, 'ville'),
    'lublin': ('Lublin (Pologne)', 51.2465, 22.5684, 'ville'),
    'prague': ('Prague (Tchéquie)', 50.0755, 14.4378, 'ville'),
    'ostroh': ('Ostroh (Ukraine)', 50.9400, 26.5167, 'ville'),
    'volozhin': ('Volozhin (Biélorussie)', 54.0564, 26.9781, 'ville'),
    'posen': ('Posen (Poznań, Pologne)', 52.4064, 16.9252, 'ville'),
    'mosul': ('Mossoul (Irak)', 36.3489, 43.1577, 'ville'),
    'shush': ('Suse (Iran)', 32.1906, 48.2528, 'ville'),
    'hamadan': ('Hamadan (Iran)', 34.7983, 48.5150, 'ville'),
    'kifl_haris': ('Kfar Cheres / Kifl Haris (Shomron, près d\'Ariel)', 32.1186, 35.1570, 'ville'),
    'nizhyn': ('Nizhyn (Niezhin, Ukraine)', 51.0500, 31.8833, 'ville'),
    'hnativka': ('Hnativka (Ignatovka), près de Kiev (Ukraine)', 50.2000, 30.7000, 'region'),
}

# Ligne du tableur (à partir de 0, sans l'en-tête) -> clé de PLACES. Toute ligne absente n'a pas de point : plusieurs lieux, lieu vague ou inconnu.
PLACE_OF = {}
def put(key, *rows):
    for r in rows: PLACE_OF[r] = key
put('hebron', 0, 1, 2, 4, 5, 6); put('rachel', 3); put('david', 10); put('jerusalem', 11, 15, 101, 104, 116, 117, 120, 122, 124, 132, 133, 134, 137, 162, 163, 164, 167, 171, 177)
put('nabi_samwil', 12); put('ezechiel', 17); put('tiberiade', 22, 25, 27, 32, 37, 38, 61, 125); put('meron', 20, 21, 26); put('beit_shearim', 31)
put('soura', 35, 41, 43, 52, 53); put('nehardea', 36); put('pumbedita', 39, 44, 45, 46, 50, 51, 54); put('mehoza', 40); put('narash', 47)
put('troyes', 55); put('ramerupt', 56, 57); put('lucena', 59, 60); put('barcelone', 63, 65); put('seville', 64); put('tolede', 66, 67, 73)
put('perpignan', 68); put('narbonne', 69); put('nuremberg', 76); put('worms', 77); put('mayence', 78); put('safed', 79, 80, 82, 83, 84, 86, 87)
put('gaza', 88); put('medzhybizh', 89); put('hannopil', 90); put('hadiach', 91); put('ouman', 92); put('lezajsk', 93); put('berditchev', 94)
put('kozienice', 95); put('przysucha', 96, 97); put('kock', 98); put('gora_kalwaria', 100); put('bobowa', 102); put('sanz', 103); put('sadagora', 105)
put('queens', 106); put('new_york', 107, 160); put('volodymyr', 108); put('damanhur', 109); put('rissani', 110); put('netivot', 111); put('ramla', 112, 130)
put('bagdad', 113, 121); put('sanhedria', 114); put('oliviers', 115, 123, 136, 151); put('izmir', 118); put('tel_aviv', 119); put('livourne', 126, 127)
put('meknes', 128); put('mogador', 129); put('le_caire', 135); put('marseille', 139); put('paris', 141, 144, 146, 147); put('vilnius', 149, 170)
put('radin', 150, 173); put('cracovie', 152); put('lviv', 153); put('holesov', 154); put('novardok', 155); put('koenigsberg', 156); put('varsovie', 157)
put('bnei_brak', 161, 165, 166, 168); put('kovno', 169, 176); put('kamenitz', 172); put('grodno', 174); put('dvinsk', 175); put('presbourg', 178, 179)
# Ajouts (198 lignes) : maîtres et prophètes d'époques diverses. Les points sont ceux de la ville ; « non localisée » = centre de la ville.
put('kairouan', 180); put('regensburg', 181); put('lublin', 182, 188); put('prague', 183); put('ostroh', 184); put('tiberiade', 185)
put('volozhin', 186); put('posen', 187); put('dvinsk', 190); put('jerusalem', 189); put('mosul', 192); put('shush', 193); put('hamadan', 194)
put('worms', 195); put('jerusalem', 196); put('nizhyn', 197); put('kifl_haris', 191)
put('sanhedria', 198); put('hnativka', 199)
# Les lignes 131 (maître vivant, exclu) ne figurent pas ici ; les indices de PLACE_OF suivent le tableur, 131 compris (décalage géré plus bas).

# Ligne -> identifiant dans la chaîne de transmission (js/transmissionCore.js) ; vérifié par tests/kevarimCore.test.js.
AUTHOR_OF = {
    7: 'moche', 20: 'hillel', 21: 'chammai', 22: 'yohanan_zakkai', 23: 'eliezer_hyrcanus', 24: 'yehoshoua_hananya', 25: 'akiva', 26: 'chimon_yohai',
    27: 'meir', 28: 'yehouda_ilai', 29: 'yossi_halafta', 30: 'chimon_gamliel2', 31: 'yehouda_nassi', 32: 'hiyya', 33: 'ben_azzai', 34: 'ben_zoma',
    35: 'rav', 36: 'chmouel', 37: 'yohanan', 38: 'rech_lakich', 39: 'abaye', 40: 'rava', 41: 'rav_achi', 42: 'ravina', 43: 'rav_houna',
    44: 'rav_yehouda', 45: 'rabba', 46: 'rav_yossef', 47: 'rav_papa', 49: 'saadia_gaon', 50: 'sherira_gaon', 51: 'hai_gaon', 52: 'amram_gaon',
    55: 'rachi', 56: 'rachbam', 57: 'rabbenou_tam', 58: 'ri_zaken', 59: 'rif', 60: 'ri_migash', 61: 'rambam', 62: 'ramban', 63: 'rachba', 64: 'ritva',
    65: 'ran', 66: 'yaakov_acher', 67: 'rosh', 68: 'meiri', 69: 'radak', 70: 'ibn_ezra', 71: 'yehouda_halevi', 73: 'yonah_gerondi', 76: 'mordekhai',
    77: 'maharam_rothenburg', 78: 'guershom', 79: 'karo', 80: 'ari', 81: 'haim_vital', 82: 'ramak', 83: 'alkabetz', 84: 'alshich', 86: 'yaakov_berav',
    89: 'bst', 90: 'maggid', 91: 'schneur', 92: 'nahman', 93: 'elimelech', 94: 'levi_yitzhak', 96: 'yaakov_yitzhak', 97: 'simhah_bunem',
    98: 'menahem_mendel_kotzk', 99: 'yitzhak_meir_ger', 100: 'sefat_emet', 101: 'imrei_emet', 103: 'halberstam_sanz', 105: 'israel_ruzhin',
    106: 'menahem_mendel_schneerson', 107: 'yosef_yitzhak', 108: 'shlomo_karlin', 113: 'ben_ish_hai', 114: 'ovadia_yossef', 123: 'or_hahaim',
    125: 'ramhal', 149: 'gra', 150: 'chafetz_haim', 151: 'kook', 152: 'rema', 153: 'taz', 154: 'shakh', 155: 'epstein', 156: 'salanter', 157: 'netziv',
    158: 'haim_brisk', 160: 'feinstein', 168: 'chazon_ich', 178: 'hatam_sofer', 179: 'ketav_sofer',
}

# Ligne -> identifiant dans data/hilloulot/hilloulot.json.
HIL_OF = {
    55: 'rashi', 61: 'rambam', 57: 'rabbenou-tam', 79: 'mechaber', 152: 'rema', 80: 'ari', 82: 'remak', 125: 'ramhal', 123: 'or-hahaim', 89: 'baal-chem-tov',
    90: 'maggid', 149: 'gaon-vilna', 126: 'chida', 94: 'levi-yitshak', 92: 'rabbi-nahman', 91: 'baal-hatanya', 178: 'hatam-sofer',
    197: 'amitsi', 98: 'rabbi-menahem-mendel-kotzk', 99: 'gour', 113: 'ben-ish-haï', 150: 'haffetz-haim', 151: 'rav-kook', 107: 'rabbi-yossef-yitshak', 160: 'rav-feinstein',
    111: 'baba-sali', 114: 'rav-ovadia', 106: 'rebbe', 7: 'moche', 8: 'aharon', 9: 'myriam', 12: 'shmouel', 10: 'david', 3: 'rachel', 27: 'rabbi-meir',
    26: 'rachbi', 156: 'yisrael-salanter',
}

MONTHS = {'Adar II': 'AdarII', 'Nissan': 'Nisan', 'Iyar': 'Iyar', 'Sivan': 'Sivan', 'Tamouz': 'Tamuz', 'Av': 'Av', 'Eloul': 'Elul', 'Tichri': 'Tishri', "'Hechvan": 'Heshvan',
          'Hechvan': 'Heshvan', 'Kislev': 'Kislev', 'Tevet': 'Tevet', 'Chevat': 'Shevat', 'Adar': 'Adar'}
MONTH_RE = re.compile(r"(\d{1,2})\s+(" + '|'.join(re.escape(m) for m in MONTHS) + r")(?![\w'])")
EXCLUDED = {131}   # Baba Baroukh : vivant (la note du tableur demande de ne pas l'inclure comme décédé)

def clean(s):
    return re.sub(r'\s+', ' ', str(s)).strip() if s is not None else ''

def parse_hilloula(text):
    """(mois, jour) si la colonne 3 donne UN jour et un mois hébraïques sans ambiguïté, sinon None."""
    t = clean(text)
    found = {(MONTHS[m], int(d)) for d, m in MONTH_RE.findall(t)}
    m = re.search(r'Lag BaOmer', t)
    if m and not found: found = {('Iyar', 18)}
    return found.pop() if len(found) == 1 else None

def parse_years(text):
    t = clean(text)
    heb = re.search(r'\b(5\d{3})\b', t)
    t2 = re.sub(r'\b\d{3,4}\s*av\. J\.-C\.', '', t)
    greg = [int(y) for y in re.findall(r'\b([5-9]\d{2}|1\d{3}|20\d{2})\b', t2) if 500 <= int(y) <= 2100]
    return (int(heb.group(1)) if heb else None, greg[-1] if greg else None)

def status_of(col5):
    s = clean(col5).lower()
    if 'contest' in s: return 'conteste'
    if s.startswith('inconnu') or 'perdue' in s: return 'inconnu'
    if s.startswith('document'): return 'documente'
    if s.startswith('tradition'): return 'tradition'
    return 'tradition'

def era_of(col7):
    s = clean(col7)
    for needle, era in (('Biblique', 'biblique'), ('Zugot', 'talmud'), ('Tanna', 'talmud'), ('Amora', 'talmud'), ('Gaon', 'gueonim'), ('Rishon', 'richonim')):
        if s.startswith(needle): return era
    return 'aharonim'

def rite_of(col7):
    s = clean(col7)
    if re.search(r'Hassidout|Chabad', s): return 'hassidout'
    if 'Ashkénaze' in s: return 'ashkenaze'
    if re.search(r'Séfarade|Mizrahi|Marocain|Irakien|Yéménite|Italien', s): return 'sefarade'
    return ''

def slug(s):
    s = s.lower()
    for a, b in (('é', 'e'), ('è', 'e'), ('ï', 'i'), ('ô', 'o'), ('î', 'i'), ('à', 'a')): s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def main():
    ws = openpyxl.load_workbook(SRC).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))[1:]
    hil = {e['id']: e for e in json.load(open(os.path.join(ROOT, 'data', 'hilloulot', 'hilloulot.json'), encoding='utf-8'))['entries']}
    entries, ids, conflicts = [], set(), []
    for i, r in enumerate(rows):
        if i in EXCLUDED: continue
        he, fr, date, tomb, status, bio, group, born, works = [clean(x) for x in r]
        p = PLACES[PLACE_OF[i]] if i in PLACE_OF else None
        st = status_of(status)
        if i == 55: st = 'inconnu'          # Rachi : mort à Troyes, mais « tombe perdue »
        hid = HIL_OF.get(i)
        hl = parse_hilloula(date)
        heb, greg = parse_years(date)
        era = era_of(group)
        kind = 'tradition' if (re.search(r'tradition', date, re.I) or (heb is None and era in ('biblique', 'talmud'))) else 'documente'
        if hid:
            h = hil[hid]
            if hl and (h['month'].replace('II', '') != hl[0] or h['day'] != hl[1]):
                conflicts.append((fr, date, h['month'], h['day']))
            hl = (h['month'], h['day']); heb = h.get('year') or heb; greg = h.get('gregYear') or greg; kind = h['kind']
        if hl is None: kind = ''
        base = slug(re.sub(r'\(.*?\)', '', fr)) or 'x'
        eid = base
        n = 2
        while eid in ids: eid = base + '-' + str(n); n += 1
        ids.add(eid)
        e = {'id': eid, 'he': he, 'fr': fr, 'dateText': date, 'hilloula': {'month': hl[0], 'day': hl[1], 'kind': kind, 'year': heb, 'gregYear': greg} if hl else None,
             'hilId': hid, 'authorId': AUTHOR_OF.get(i),
             'place': {'key': PLACE_OF[i], 'name': p[0], 'lat': p[1], 'lon': p[2], 'precision': p[3]} if p else None,
             'tombText': tomb, 'status': st, 'statusText': status, 'bio': bio, 'groupText': group, 'era': era, 'rite': rite_of(group), 'born': born, 'works': works}
        entries.append(e)
    out = {'v': 1, 'source': 'Fichier de Ruben (Hiloulot majeures, 200 lignes) ; points de la carte approximatifs ; dates de hilloula vérifiées contre data/hilloulot/hilloulot.json quand la personne y figure', 'entries': entries}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    placed = sum(1 for e in entries if e['place'])
    print('entrées :', len(entries), '| sur la carte :', placed, '| avec hilloula :', sum(1 for e in entries if e['hilloula']), '| avec authorId :', sum(1 for e in entries if e['authorId']))
    for c in conflicts: print('CONFLIT de date (tableur / hilloulot.json) :', c)
    # Les points dont le nom d'un lieu cité par le tableur n'a pas été repris : à relire.
    return 0

if __name__ == '__main__':
    sys.exit(main())
