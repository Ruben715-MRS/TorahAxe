# Construit data/torah/special-readings.json : les lectures spéciales de l'année (Torah, maftir, haftara) et leur découpage en montées.
#
# Deux sources, qui se contrôlent l'une l'autre :
#  - les RÉFÉRENCES (quoi lire à chaque occasion) sont celles du tableau « Lecture de la Torah, du Maftir et des Haftarot spéciales » du
#    Houmach Artscroll, édition Edmond J. Safra (calendrier de la Diaspora) : elles sont recopiées ci-dessous, dans SPECIAL ;
#  - les MONTÉES (le découpage de chaque lecture) viennent du paquet npm @hebcal/leyning (licence BSD-2-Clause), fichier
#    dist/esm/holiday-readings.json.js, lu comme une donnée JSON (aucun code du paquet n'est exécuté).
# Le script s'arrête si les montées de Hebcal ne recouvrent pas exactement la lecture du livre (aucun verset en trop ou en moins).
# Usage : python3 -I scripts/build_special_readings.py <dossier dist/esm du paquet>. Contenu halakhique : à relire.
import json, re, sys, os

def load(name):
    txt = open(os.path.join(sys.argv[1], name), encoding='utf-8').read()
    txt = re.sub(r'//# sourceMappingURL=.*', '', txt).strip()
    txt = re.sub(r'^export default\s*', '', txt).rstrip().rstrip(';')
    txt = re.sub(r',(\s*[}\]])', r'\1', txt)
    return json.loads(txt)

HC = load('holiday-readings.json.js')

BOOK = {'Gen': 1, 'Ex': 2, 'Lev': 3, 'Nbr': 4, 'Deut': 5}

def rng(s):
    """'Nbr 29:12-16' ou 'Ex 32:11-14' ou 'Deut 33:1-34:12' → (livre, c1, v1, c2, v2)."""
    m = re.fullmatch(r'(\w+) (\d+):(\d+)-(?:(\d+):)?(\d+)', s)
    assert m, s
    b, c1, v1, c2, v2 = m.groups()
    return [BOOK[b], int(c1), int(v1), int(c2 or c1), int(v2)]

def hc_aliyot(key, kinds=None):
    """Les montées d'une entrée de Hebcal : [(clé, livre, c1, v1, c2, v2)] dans l'ordre (1 à 7, puis maftir « M »)."""
    r = HC[key]
    if r.get('alias'): r = HC[r['key']]
    fk = r['fullkriyah']
    out = []
    for k, v in fk.items():
        if k.startswith('M-'): continue
        c1, v1 = [int(x) for x in v['b'].split(':')]
        c2, v2 = [int(x) for x in v['e'].split(':')]
        out.append((k, v['k'], c1, v1, c2, v2))
    out.sort(key=lambda a: (a[0] == 'M', int(a[0]) if a[0].isdigit() else 0))
    return out

def tup(a): return [a[1], a[2], a[3], a[4], a[5]]

# ----------------------------------------------------------------------------------------------------------------------------------------
# Le tableau du livre. Chaque occasion : id, groupe, nom, la Torah (liste de blocs : plages + clé Hebcal des montées), le maftir, la haftara.
#  - torah : [{ r: plages du livre, hc: clé Hebcal des montées, upto/from: quelles montées (par position) tombent dans ce bloc, repeat: rang de la montée de reprise }] ;
#  - torah_text : texte libre quand la lecture est « la paracha hebdomadaire » ;
#  - maftir : liste d'options [{ 'r': 'Nbr 29:12-16', 'lab': 'étiquette facultative' }] ; maftir_text : « Maftir de la paracha » ;
#  - haftara : liste de références en français, telles que le livre les donne ;
#  - shabbat : clé Hebcal du découpage en sept montées quand la fête tombe un Chabbat ;
#  - notes : phrases du livre (notes 1 à 4 du tableau) ou précisions.
# ----------------------------------------------------------------------------------------------------------------------------------------
FAST_NOTE = "On lit la Torah à Cha'harit et à Min'ha, mais la haftara n'est lue qu'à Min'ha."
CHM_SOUCCOT = "La quatrième montée reprend le début de la lecture, comme l'usage le veut pour un jour de 'Hol HaMoèd."
ISAIE_55 = ['Isaïe 55:6-56:8']
FAST = {'torah': [{'r': ['Ex 32:11-14', 'Ex 34:1-10'], 'hc': 'Fast Day (Morning)'}]}

SPECIAL = [
    # --- Roch 'Hodech ---------------------------------------------------------------------------------------------------------------
    {'id': 'roch-hodech', 'g': 'rh', 'fr': "Roch 'Hodech", 'he': 'ראש חודש',
     'torah': [{'r': ['Nbr 28:1-15'], 'hc': 'Rosh Chodesh'}], 'maftir': [], 'haftara': []},
    {'id': 'chabbat-erev-rh', 'g': 'rh', 'fr': "Chabbat Érev Roch 'Hodech", 'he': 'שבת מברכין',
     'torah_text': 'Paracha de la semaine', 'maftir_text': 'Celui de la paracha', 'haftara': ['Samuel I 20:18-42']},
    {'id': 'chabbat-rh', 'g': 'rh', 'fr': "Chabbat Roch 'Hodech", 'he': 'שבת ראש חודש',
     'torah_text': 'Paracha de la semaine', 'maftir': [{'r': 'Nbr 28:9-15'}], 'haftara': ['Isaïe 66:1-24']},
    # --- Tichri ---------------------------------------------------------------------------------------------------------------------
    {'id': 'rh-1', 'g': 'tichri', 'fr': 'Roch Hachana, 1er jour', 'he': 'ראש השנה',
     'torah': [{'r': ['Gen 21:1-34'], 'hc': 'Rosh Hashana I', 'shabbat': 'Rosh Hashana I (on Shabbat)'}],
     'maftir': [{'r': 'Nbr 29:1-6'}], 'haftara': ['Samuel I 1:1-2:10']},
    {'id': 'rh-2', 'g': 'tichri', 'fr': 'Roch Hachana, 2e jour', 'he': 'ראש השנה',
     'torah': [{'r': ['Gen 22:1-24'], 'hc': 'Rosh Hashana II'}],
     'maftir': [{'r': 'Nbr 29:1-6'}], 'haftara': ['Jérémie 31:1-19']},
    {'id': 'guedalia', 'g': 'tichri', 'fr': 'Jeûne de Guédalia', 'he': 'צום גדליה',
     'torah': FAST['torah'], 'maftir': [], 'haftara': ISAIE_55, 'notes': [FAST_NOTE]},
    {'id': 'kippour-cha', 'g': 'tichri', 'fr': "Yom Kippour, Cha'harit", 'he': 'יום כיפור',
     'torah': [{'r': ['Lev 16:1-34'], 'hc': 'Yom Kippur', 'shabbat': 'Yom Kippur (on Shabbat)'}],
     'maftir': [{'r': 'Nbr 29:7-11'}], 'haftara': ['Isaïe 57:14-58:14']},
    {'id': 'kippour-min', 'g': 'tichri', 'fr': "Yom Kippour, Min'ha", 'he': 'יום כיפור',
     'torah': [{'r': ['Lev 18:1-30'], 'hc': 'Yom Kippur (Mincha, Traditional)'}], 'maftir': [],
     'haftara': ['Jonas 1:1-4:11', 'Michée 7:18-20'],
     'notes': ["La troisième montée est celle du maftir : c'est elle qui lit la haftara."]},
    {'id': 'souccot-1', 'g': 'tichri', 'fr': 'Souccot, 1er jour', 'he': 'סוכות',
     'torah': [{'r': ['Lev 22:26-23:44'], 'hc': 'Sukkot I', 'shabbat': 'Sukkot I (on Shabbat)'}],
     'maftir': [{'r': 'Nbr 29:12-16'}], 'haftara': ['Zacharie 14:1-21']},
    {'id': 'souccot-2', 'g': 'tichri', 'fr': 'Souccot, 2e jour', 'he': 'סוכות',
     'torah': [{'r': ['Lev 22:26-23:44'], 'hc': 'Sukkot II'}],
     'maftir': [{'r': 'Nbr 29:12-16'}], 'haftara': ['Rois I 8:2-21']},
    {'id': 'souccot-hm-1', 'g': 'tichri', 'fr': "Souccot, 1er jour de 'Hol HaMoèd", 'he': "חול המועד",
     'torah': [{'r': ['Nbr 29:17-25'], 'hc': 'Sukkot Chol ha-Moed Day 1', 'repeat': 4}], 'maftir': [], 'haftara': [], 'notes': [CHM_SOUCCOT]},
    {'id': 'souccot-hm-2', 'g': 'tichri', 'fr': "Souccot, 2e jour de 'Hol HaMoèd", 'he': "חול המועד",
     'torah': [{'r': ['Nbr 29:20-28'], 'hc': 'Sukkot Chol ha-Moed Day 2', 'repeat': 4}], 'maftir': [], 'haftara': [], 'notes': [CHM_SOUCCOT]},
    {'id': 'souccot-hm-3', 'g': 'tichri', 'fr': "Souccot, 3e jour de 'Hol HaMoèd", 'he': "חול המועד",
     'torah': [{'r': ['Nbr 29:23-31'], 'hc': 'Sukkot Chol ha-Moed Day 3', 'repeat': 4}], 'maftir': [], 'haftara': [], 'notes': [CHM_SOUCCOT]},
    {'id': 'souccot-hm-4', 'g': 'tichri', 'fr': "Souccot, 4e jour de 'Hol HaMoèd", 'he': "חול המועד",
     'torah': [{'r': ['Nbr 29:26-34'], 'hc': 'Sukkot Chol ha-Moed Day 4', 'repeat': 4}], 'maftir': [], 'haftara': [], 'notes': [CHM_SOUCCOT]},
    {'id': 'souccot-chabbat-hm', 'g': 'tichri', 'fr': "Souccot, Chabbat 'Hol HaMoèd", 'he': "שבת חול המועד",
     'torah': [{'r': ['Ex 33:12-34:26'], 'hc': 'Sukkot Shabbat Chol ha-Moed'}],
     'maftir': [{'r': 'Nbr 29:17-22', 'lab': '1er jour'}, {'r': 'Nbr 29:20-25', 'lab': '2e jour'},
                {'r': 'Nbr 29:23-28', 'lab': '3e jour'}, {'r': 'Nbr 29:26-31', 'lab': '4e jour'}],
     'haftara': ['Ézéchiel 38:18-39:16'],
     'notes': ["Le maftir est celui du jour de 'Hol HaMoèd où tombe le Chabbat. Le livre (note 2) cite le premier, le deuxième et le quatrième jour ; celui du troisième jour a été ajouté d'après Hebcal."]},
    {'id': 'hochaana-rabba', 'g': 'tichri', 'fr': 'Hochaana Rabba', 'he': 'הושענא רבה',
     'torah': [{'r': ['Nbr 29:26-34'], 'hc': 'Sukkot Final Day (Hoshana Raba)', 'repeat': 4}], 'maftir': [], 'haftara': [], 'notes': [CHM_SOUCCOT]},
    {'id': 'chemini-atseret', 'g': 'tichri', 'fr': 'Chemini Atséret', 'he': 'שמיני עצרת',
     'torah': [{'r': ['Deut 14:22-16:17'], 'hc': 'Shmini Atzeret', 'shabbat': 'Shmini Atzeret (on Shabbat)'}],
     'maftir': [{'r': 'Nbr 29:35-30:1'}], 'haftara': ['Rois I 8:54-9:1']},
    {'id': 'simhat-torah', 'g': 'tichri', 'fr': "Sim'hat Torah", 'he': 'שמחת תורה',
     'torah': [{'r': ['Deut 33:1-34:12'], 'hc': 'Simchat Torah', 'shabbat': 'Simchat Torah (on Shabbat)', 'only_book': 5},
               {'r': ['Gen 1:1-2:3'], 'hc': 'Simchat Torah', 'only_book': 1, 'lab': 'Hatan Béréchit'}],
     'maftir': [{'r': 'Nbr 29:35-30:1'}], 'haftara': ['Josué 1:1-18']},
    # --- Hanouca et 10 Tévet --------------------------------------------------------------------------------------------------------
    {'id': 'hanouca-1', 'g': 'hanouca', 'fr': 'Hanouca, 1er jour', 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 7:1-17'], 'hc': 'Chanukah Day 1'}], 'maftir': [], 'haftara': []},
    {'id': 'hanouca-2', 'g': 'hanouca', 'fr': 'Hanouca, 2e jour', 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 7:18-29'], 'hc': 'Chanukah Day 2'}], 'maftir': [], 'haftara': []},
    {'id': 'hanouca-3', 'g': 'hanouca', 'fr': 'Hanouca, 3e jour', 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 7:24-35'], 'hc': 'Chanukah Day 3'}], 'maftir': [], 'haftara': []},
    {'id': 'hanouca-4', 'g': 'hanouca', 'fr': 'Hanouca, 4e jour', 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 7:30-41'], 'hc': 'Chanukah Day 4'}], 'maftir': [], 'haftara': []},
    {'id': 'hanouca-5', 'g': 'hanouca', 'fr': 'Hanouca, 5e jour', 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 7:36-47'], 'hc': 'Chanukah Day 5'}], 'maftir': [], 'haftara': []},
    {'id': 'hanouca-6', 'g': 'hanouca', 'fr': "Hanouca, 6e jour (Roch 'Hodech)", 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 28:1-15'], 'hc': 'Chanukah Day 6', 'upto': 3}, {'r': ['Nbr 7:42-47'], 'hc': 'Chanukah Day 6', 'from': 3}], 'maftir': [], 'haftara': [],
     'notes': ["Roch 'Hodech et Hanouca : on sort deux Sifré Torah. Trois personnes sont appelées pour lire le passage des sacrifices quotidiens et de Moussaf de Roch 'Hodech ; le quatrième lit dans le second Séfer Torah les offrandes des Nessiim propres au jour, puis il dit le Kadich abrégé."]},
    {'id': 'hanouca-7', 'g': 'hanouca', 'fr': 'Hanouca, 7e jour', 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 7:48-59'], 'hc': 'Chanukah Day 7'}], 'maftir': [], 'haftara': []},
    {'id': 'hanouca-7-rh', 'g': 'hanouca', 'fr': "Hanouca, 7e jour (Roch 'Hodech)", 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 28:1-15'], 'hc': 'Chanukah Day 7 (on Rosh Chodesh)', 'upto': 3}, {'r': ['Nbr 7:48-53'], 'hc': 'Chanukah Day 7 (on Rosh Chodesh)', 'from': 3}], 'maftir': [], 'haftara': []},
    {'id': 'hanouca-8', 'g': 'hanouca', 'fr': 'Hanouca, 8e jour', 'he': 'חנוכה',
     'torah': [{'r': ['Nbr 7:54-8:4'], 'hc': 'Chanukah Day 8'}], 'maftir': [], 'haftara': []},
    {'id': 'chabbat-hanouca-1', 'g': 'hanouca', 'fr': 'Chabbat Hanouca (I)', 'he': 'שבת חנוכה',
     'torah_text': 'Paracha de la semaine',
     'maftir': [{'r': 'Nbr 7:1-17', 'lab': '1er jour'}, {'r': 'Nbr 7:18-23', 'lab': '2e jour'}, {'r': 'Nbr 7:24-29', 'lab': '3e jour'},
                {'r': 'Nbr 7:30-35', 'lab': '4e jour'}, {'r': 'Nbr 7:36-41', 'lab': '5e jour'}, {'r': 'Nbr 7:42-47', 'lab': '6e jour'},
                {'r': 'Nbr 7:48-53', 'lab': '7e jour'}],
     'haftara': ['Zacharie 2:14-4:7'],
     'notes': ["Le maftir est celui du jour de Hanouca où tombe le Chabbat (note 3 du livre).",
               "On sort deux Sifré Torah. Dans le premier, sept personnes sont appelées pour la paracha de la semaine ; le maftir lit dans le second les offrandes des Nessiim propres au jour, puis il dit le Kadich abrégé et lit la haftara. S'il y a deux Chabbat de Hanouca, on lit au premier la haftara « Roni vessim'hi » (Zacharie 2) et au second « Vaya'ass 'hiram » (Rois I 7).",
               "Si Roch 'Hodech Tévet tombe ce Chabbat (6e jour) : on sort trois Sifré Torah. Dans le premier, six personnes sont appelées pour la paracha, sans Kadich abrégé (si l'on en a appelé plus de six, on le dit). Le septième lit dans le second le passage des sacrifices de Chabbat et de Roch 'Hodech (Nombres 28:9-15), puis dit le Kadich abrégé. Le maftir lit dans le troisième les Nessiim du jour (Nombres 7:42-47), puis il dit le Kadich abrégé et lit la haftara « Roni vessim'hi ». On a l'habitude de lire aussi le premier et le dernier verset de la haftara de Chabbat Roch 'Hodech, « Hachamayim kissi » (Isaïe 66:1 et 66:23)."]},
    {'id': 'chabbat-hanouca-2', 'g': 'hanouca', 'fr': 'Chabbat Hanouca (II)', 'he': 'שבת חנוכה',
     'torah_text': 'Paracha de la semaine', 'maftir': [{'r': 'Nbr 7:54-8:4'}], 'haftara': ['Rois I 7:40-50'],
     'notes': ["Deux Sifré Torah : la paracha de la semaine dans le premier, puis le maftir lit dans le second les offrandes des Nessiim du jour. Haftara « Vaya'ass 'hiram » : on la lit quand il y a deux Chabbat de Hanouca."]},
    {'id': 'dix-tevet', 'g': 'hanouca', 'fr': 'Jeûne du 10 Tévet', 'he': 'עשרה בטבת',
     'torah': FAST['torah'], 'maftir': [], 'haftara': ISAIE_55, 'notes': [FAST_NOTE]},
    # --- Adar : les Chabbatot spéciaux et Pourim ------------------------------------------------------------------------------------
    {'id': 'chekalim', 'g': 'adar', 'fr': 'Parachat Chekalim', 'he': 'פרשת שקלים',
     'torah_text': 'Paracha de la semaine', 'maftir': [{'r': 'Ex 30:11-16'}], 'haftara': ['Rois II 11:17-12:17'], 'notes': ['RH_NOTE']},
    {'id': 'zakhor', 'g': 'adar', 'fr': 'Parachat Zakhor', 'he': 'פרשת זכור',
     'torah_text': 'Paracha de la semaine', 'maftir': [{'r': 'Deut 25:17-19'}], 'haftara': ['Samuel I 15:1-34']},
    {'id': 'esther', 'g': 'adar', 'fr': "Jeûne d'Esther", 'he': 'תענית אסתר',
     'torah': FAST['torah'], 'maftir': [], 'haftara': ISAIE_55, 'notes': [FAST_NOTE]},
    {'id': 'pourim', 'g': 'adar', 'fr': 'Pourim', 'he': 'פורים',
     'torah': [{'r': ['Ex 17:8-16'], 'hc': 'Purim'}], 'maftir': [], 'haftara': []},
    {'id': 'para', 'g': 'adar', 'fr': 'Parachat Para', 'he': 'פרשת פרה',
     'torah_text': 'Paracha de la semaine', 'maftir': [{'r': 'Nbr 19:1-22'}], 'haftara': ['Ézéchiel 36:16-38']},
    {'id': 'hahodech', 'g': 'adar', 'fr': "Parachat Ha'hodech", 'he': 'פרשת החודש',
     'torah_text': 'Paracha de la semaine', 'maftir': [{'r': 'Ex 12:1-20'}], 'haftara': ['Ézéchiel 45:16-46:18'], 'notes': ['RH_NOTE']},
    {'id': 'chabbat-hagadol', 'g': 'adar', 'fr': 'Chabbat Hagadol', 'he': 'שבת הגדול',
     'torah_text': 'Paracha de la semaine', 'maftir_text': 'Celui de la paracha', 'haftara': ['Malachie 3:4-24']},
    # --- Pessa'h --------------------------------------------------------------------------------------------------------------------
    {'id': 'pessah-1', 'g': 'pessah', 'fr': "Pessa'h, 1er jour", 'he': 'פסח',
     'torah': [{'r': ['Ex 12:21-51'], 'hc': 'Pesach I', 'shabbat': 'Pesach I (on Shabbat)'}],
     'maftir': [{'r': 'Nbr 28:16-25'}], 'haftara': ['Josué 3:5-7', 'Josué 5:2-6:1', 'Josué 6:27']},
    {'id': 'pessah-2', 'g': 'pessah', 'fr': "Pessa'h, 2e jour", 'he': 'פסח',
     'torah': [{'r': ['Lev 22:26-23:44'], 'hc': 'Pesach II'}],
     'maftir': [{'r': 'Nbr 28:16-25'}], 'haftara': ['Rois II 23:1-9', 'Rois II 23:21-25']},
    {'id': 'pessah-hm-1', 'g': 'pessah', 'fr': "Pessa'h, 1er jour de 'Hol HaMoèd", 'he': "חול המועד",
     'torah': [{'r': ['Ex 13:1-16'], 'hc': 'Pesach Chol ha-Moed Day 1', 'upto': 3}, {'r': ['Nbr 28:19-25'], 'hc': 'Pesach Chol ha-Moed Day 1', 'from': 3}], 'maftir': [], 'haftara': []},
    {'id': 'pessah-hm-2', 'g': 'pessah', 'fr': "Pessa'h, 2e jour de 'Hol HaMoèd", 'he': "חול המועד",
     'torah': [{'r': ['Ex 22:24-23:19'], 'hc': 'Pesach Chol ha-Moed Day 2', 'upto': 3}, {'r': ['Nbr 28:19-25'], 'hc': 'Pesach Chol ha-Moed Day 2', 'from': 3}], 'maftir': [], 'haftara': []},
    {'id': 'pessah-hm-3', 'g': 'pessah', 'fr': "Pessa'h, 3e jour de 'Hol HaMoèd", 'he': "חול המועד",
     'torah': [{'r': ['Ex 34:1-26'], 'hc': 'Pesach Chol ha-Moed Day 3', 'upto': 3}, {'r': ['Nbr 28:19-25'], 'hc': 'Pesach Chol ha-Moed Day 3', 'from': 3}], 'maftir': [], 'haftara': []},
    {'id': 'pessah-hm-4', 'g': 'pessah', 'fr': "Pessa'h, 4e jour de 'Hol HaMoèd", 'he': "חול המועד",
     'torah': [{'r': ['Nbr 9:1-14'], 'hc': 'Pesach Chol ha-Moed Day 4', 'upto': 3}, {'r': ['Nbr 28:19-25'], 'hc': 'Pesach Chol ha-Moed Day 4', 'from': 3}], 'maftir': [], 'haftara': []},
    {'id': 'pessah-chabbat-hm', 'g': 'pessah', 'fr': "Pessa'h, Chabbat 'Hol HaMoèd", 'he': "שבת חול המועד",
     'torah': [{'r': ['Ex 33:12-34:26'], 'hc': 'Pesach Shabbat Chol ha-Moed'}],
     'maftir': [{'r': 'Nbr 28:19-25'}], 'haftara': ['Ézéchiel 37:1-14']},
    {'id': 'pessah-7', 'g': 'pessah', 'fr': "Pessa'h, 7e jour", 'he': 'שביעי של פסח',
     'torah': [{'r': ['Ex 13:17-15:26'], 'hc': 'Pesach VII', 'shabbat': 'Pesach VII (on Shabbat)'}],
     'maftir': [{'r': 'Nbr 28:19-25'}], 'haftara': ['Samuel II 22:1-51']},
    {'id': 'pessah-8', 'g': 'pessah', 'fr': "Pessa'h, 8e jour (en semaine)", 'he': 'אחרון של פסח',
     'torah': [{'r': ['Deut 15:19-16:17'], 'hc': 'Pesach VIII'}],
     'maftir': [{'r': 'Nbr 28:19-25'}], 'haftara': ['Isaïe 10:32-12:6']},
    {'id': 'pessah-8-chabbat', 'g': 'pessah', 'fr': "Pessa'h, 8e jour (un Chabbat)", 'he': 'אחרון של פסח',
     'torah': [{'r': ['Deut 14:22-16:17'], 'hc': 'Pesach VIII (on Shabbat)'}],
     'maftir': [{'r': 'Nbr 28:19-25'}], 'haftara': ['Isaïe 10:32-12:6']},
    # --- Chavouot -------------------------------------------------------------------------------------------------------------------
    {'id': 'chavouot-1', 'g': 'chavouot', 'fr': 'Chavouot, 1er jour', 'he': 'שבועות',
     'torah': [{'r': ['Ex 19:1-20:23'], 'hc': 'Shavuot I'}],
     'maftir': [{'r': 'Nbr 28:26-31'}], 'haftara': ['Ézéchiel 1:1-28', 'Ézéchiel 3:12']},
    {'id': 'chavouot-2', 'g': 'chavouot', 'fr': 'Chavouot, 2e jour (en semaine)', 'he': 'שבועות',
     'torah': [{'r': ['Deut 15:19-16:17'], 'hc': 'Shavuot II'}],
     'maftir': [{'r': 'Nbr 28:26-31'}], 'haftara': ['Habakkouk 2:20-3:19']},
    {'id': 'chavouot-2-chabbat', 'g': 'chavouot', 'fr': 'Chavouot, 2e jour (un Chabbat)', 'he': 'שבועות',
     'torah': [{'r': ['Deut 14:22-16:17'], 'hc': 'Shavuot II (on Shabbat)'}],
     'maftir': [{'r': 'Nbr 28:26-31'}], 'haftara': ['Habakkouk 2:20-3:19']},
    # --- 17 Tamouz et Ticha BeAv ----------------------------------------------------------------------------------------------------
    {'id': 'tamouz-17', 'g': 'ete', 'fr': '17 Tamouz', 'he': 'י״ז בתמוז',
     'torah': FAST['torah'], 'maftir': [], 'haftara': ISAIE_55, 'notes': [FAST_NOTE]},
    {'id': 'ticha-beav-cha', 'g': 'ete', 'fr': "Ticha BeAv, Cha'harit", 'he': 'תשעה באב',
     'torah': [{'r': ['Deut 4:25-40'], 'hc': "Tish'a B'Av"}], 'maftir': [], 'haftara': ['Jérémie 8:13-9:23']},
    {'id': 'ticha-beav-min', 'g': 'ete', 'fr': "Ticha BeAv, Min'ha", 'he': 'תשעה באב',
     'torah': FAST['torah'], 'maftir': [], 'haftara': ISAIE_55},
]
RH_NOTE = "Si ce Chabbat tombe un Roch 'Hodech, on divise la paracha en six montées, puis la septième est Nombres 28:9-15 (note 4 du livre)."

# Le nom hébreu de chaque moment, avec le jour quand le nom français le précise (א׳ = 1er jour…).
HE = {
    'roch-hodech': 'ראש חודש', 'chabbat-erev-rh': 'שבת מברכין', 'chabbat-rh': 'שבת ראש חודש',
    'rh-1': 'ראש השנה – יום א׳', 'rh-2': 'ראש השנה – יום ב׳', 'guedalia': 'צום גדליה',
    'kippour-cha': 'יום כיפור – שחרית', 'kippour-min': 'יום כיפור – מנחה',
    'souccot-1': 'סוכות – יום א׳', 'souccot-2': 'סוכות – יום ב׳',
    'souccot-hm-1': 'חול המועד סוכות – יום א׳', 'souccot-hm-2': 'חול המועד סוכות – יום ב׳',
    'souccot-hm-3': 'חול המועד סוכות – יום ג׳', 'souccot-hm-4': 'חול המועד סוכות – יום ד׳',
    'souccot-chabbat-hm': 'שבת חול המועד סוכות', 'hochaana-rabba': 'הושענא רבה', 'chemini-atseret': 'שמיני עצרת', 'simhat-torah': 'שמחת תורה',
    'hanouca-1': 'חנוכה – יום א׳', 'hanouca-2': 'חנוכה – יום ב׳', 'hanouca-3': 'חנוכה – יום ג׳', 'hanouca-4': 'חנוכה – יום ד׳', 'hanouca-5': 'חנוכה – יום ה׳',
    'hanouca-6': 'חנוכה – יום ו׳ (ראש חודש)', 'hanouca-7': 'חנוכה – יום ז׳', 'hanouca-7-rh': 'חנוכה – יום ז׳ (ראש חודש)', 'hanouca-8': 'חנוכה – יום ח׳',
    'chabbat-hanouca-1': 'שבת חנוכה (א׳)', 'chabbat-hanouca-2': 'שבת חנוכה (ב׳)', 'dix-tevet': 'עשרה בטבת',
    'chekalim': 'פרשת שקלים', 'zakhor': 'פרשת זכור', 'esther': 'תענית אסתר', 'pourim': 'פורים', 'para': 'פרשת פרה', 'hahodech': 'פרשת החודש', 'chabbat-hagadol': 'שבת הגדול',
    'pessah-1': 'פסח – יום א׳', 'pessah-2': 'פסח – יום ב׳',
    'pessah-hm-1': 'חול המועד פסח – יום א׳', 'pessah-hm-2': 'חול המועד פסח – יום ב׳', 'pessah-hm-3': 'חול המועד פסח – יום ג׳', 'pessah-hm-4': 'חול המועד פסח – יום ד׳',
    'pessah-chabbat-hm': 'שבת חול המועד פסח', 'pessah-7': 'שביעי של פסח', 'pessah-8': 'אחרון של פסח (בחול)', 'pessah-8-chabbat': 'אחרון של פסח (בשבת)',
    'chavouot-1': 'שבועות – יום א׳', 'chavouot-2': 'שבועות – יום ב׳ (בחול)', 'chavouot-2-chabbat': 'שבועות – יום ב׳ (בשבת)',
    'tamouz-17': 'י״ז בתמוז', 'ticha-beav-cha': 'תשעה באב – שחרית', 'ticha-beav-min': 'תשעה באב – מנחה',
}

GROUPS = [
    {'id': 'rh', 'fr': "Roch 'Hodech", 'he': 'ראש חודש'},
    {'id': 'tichri', 'fr': 'Tichri : Roch Hachana, Kippour, Souccot', 'short': 'Tichri', 'he': 'תשרי'},
    {'id': 'hanouca', 'fr': 'Hanouca et 10 Tévet', 'short': 'Hanouca', 'he': 'חנוכה'},
    {'id': 'adar', 'fr': 'Adar : Chabbatot spéciaux et Pourim', 'short': 'Adar', 'he': 'אדר'},
    {'id': 'pessah', 'fr': "Pessa'h", 'he': 'פסח'},
    {'id': 'chavouot', 'fr': 'Chavouot', 'he': 'שבועות'},
    {'id': 'ete', 'fr': 'Été : 17 Tamouz et Ticha BeAv', 'short': 'Été', 'he': 'תמוז ואב'},
]

def inside(a, ranges):
    """La montée `a` (clé, livre, c1, v1, c2, v2) tombe-t-elle dans l'une des plages du livre ?"""
    return any(r[0] == a[1] and (r[1], r[2]) <= (a[2], a[3]) and (a[4], a[5]) <= (r[3], r[4]) for r in ranges)

def build_block(block):
    """Un bloc de Torah : { r: [plages], a: [montées], rep?: reprise de la 4e montée, s?: [montées d'un Chabbat], lab? }.
    Les montées de Hebcal qui sortent des plages du livre (le maftir, que le livre donne à part) sont écartées."""
    ranges = [rng(x) for x in block['r']]
    al = hc_aliyot(block['hc'])
    if 'only_book' in block:
        al = [a for a in al if a[1] == block['only_book']]
    if 'upto' in block: al = al[:block['upto']]
    if 'from' in block: al = al[block['from']:]
    repeat = None
    if block.get('repeat') and len(al) >= block['repeat']:
        repeat = tup(al[block['repeat'] - 1]); al = al[:block['repeat'] - 1]
    out = {'r': ranges, 'a': [tup(a) for a in al if inside(a, ranges)]}
    if repeat: out['rep'] = repeat
    if 'shabbat' in block:
        sa = hc_aliyot(block['shabbat'])
        if 'only_book' in block: sa = [a for a in sa if a[1] == block['only_book']]
        out['s'] = [tup(a) for a in sa if inside(a, ranges)]
    if block.get('lab'): out['lab'] = block['lab']
    return out

def check_cover(block, where):
    """Les montées recouvrent exactement les plages du livre : la première commence où commence la plage, la dernière finit où elle finit,
    et chaque montée suivante commence juste après la précédente (le verset suivant : on vérifie en comparant avec la plage, pas la longueur des chapitres)."""
    for variant in ('a', 's'):
        al = block.get(variant)
        if not al: continue
        starts = [(a[0], a[1], a[2]) for a in al]
        ends = [(a[0], a[3], a[4]) for a in al]
        exp_start, exp_end = [], []
        for r in block['r']:
            exp_start.append((r[0], r[1], r[2])); exp_end.append((r[0], r[3], r[4]))
        assert starts[0] == exp_start[0], (where, variant, 'début', starts[0], exp_start[0])
        assert ends[-1] == exp_end[-1], (where, variant, 'fin', ends[-1], exp_end[-1])
        # Les plages multiples (Ex 32:11-14 ; 34:1-10) : chaque début de plage et chaque fin de plage doit être une borne de montée.
        for s in exp_start: assert s in starts, (where, variant, 'borne de début absente', s)
        for e in exp_end: assert e in ends, (where, variant, 'borne de fin absente', e)

out_items = []
for it in SPECIAL:
    o = {'id': it['id'], 'g': it['g'], 'fr': it['fr'], 'he': HE[it['id']]}
    if 'torah_text' in it: o['torahText'] = it['torah_text']
    if 'torah' in it:
        o['torah'] = []
        for b in it['torah']:
            blk = build_block(b)
            check_cover(blk, it['id'])
            o['torah'].append(blk)
    if it.get('maftir'):
        o['maftir'] = [{'r': rng(m['r'])} | ({'lab': m['lab']} if m.get('lab') else {}) for m in it['maftir']]
    if 'maftir_text' in it: o['maftirText'] = it['maftir_text']
    o['haftara'] = it.get('haftara', [])
    notes = [RH_NOTE if n == 'RH_NOTE' else n for n in it.get('notes', [])]
    if notes: o['notes'] = notes
    out_items.append(o)

ids = [o['id'] for o in out_items]
assert len(ids) == len(set(ids)), 'identifiants en double'
data = {'v': 1, 'source': "Références : tableau des lectures spéciales du Houmach Artscroll, édition Edmond J. Safra (Diaspora) ; montées : Hebcal, @hebcal/leyning (BSD-2-Clause)",
        'groups': GROUPS, 'items': out_items}
json.dump(data, open('data/torah/special-readings.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('ok', len(out_items), 'occasions')
