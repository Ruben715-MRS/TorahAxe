# Construit data/siddur/interruptions.json : le « Tableau des interruptions dans la prière » du rav Yits'haq Yossef chalita,
# tel qu'imprimé dans le siddour Maguen Avot (Zmanim Diffusion), transcrit à la main depuis des photos du livre.
# Chaque case : [texte du livre, catégorie] ; catégorie o = oui (obligatoire ou permis), c = avec limite / sous condition, n = non.
# "IDEM" = « Idem » dans le livre : la case reprend celle du dessus (marquée idem: true). None = case vide dans le livre.
# Transcription et classement : **à relire sur le livre**.
import json

COLS = [
    ('talit', 'tefilot', 'Bénédiction du talit et des téfilin'),
    ('baroukhHou', 'repondre', '« Baroukh hou ouvaroukh chemo »'),
    ('amenQaddich', 'qaddich', 'Les cinq « Amen » du Qaddich'),
    ('amenTitqabal', 'qaddich', '« Amen » de « Titqabal » et « Al Israël »'),
    ('amenViqarev', 'qaddich', '« Amen » de « Viqarev méchi\'hé »'),
    ('amenBerakha', 'repondre', '« Amen » après une bénédiction'),
    ('amenChomea', 'repondre', '« Amen » de « Choméa téfila » et « HaEl haqadoch »'),
    ('yehe', 'qaddich', '« Yéhé chémé rabba »'),
    ('qedoucha', 'qedoucha', 'Répondre à la Qédoucha'),
    ('naqdichakh', 'qedoucha', '« Naqdichakh » (dans la Qédoucha)'),
    ('qedouchaYotser', 'qedoucha', 'Qédoucha du Yotser et de Ouva léTsion'),
    ('chemaVerset', 'repondre', '1er verset du Chéma avec l\'assemblée'),
    ('treize', 'repondre', 'Les treize attributs de miséricorde'),
    ('modim', 'repondre', 'Modim dérabanan'),
    ('berikh', 'tora', 'Bérikh Chémé'),
    ('vezot', 'tora', 'Vézot haTora'),
    ('acherYatsar', 'tefilot', 'Acher yatsar'),
    ('tonnerre', 'tefilot', 'Bénédiction du tonnerre et des éclairs'),
    ('barekhou', 'repondre', 'Répondre à Barékhou'),
    ('monter', 'tora', 'Monter à la Tora'),
    ('piyoutim', 'autres', 'Réciter des piyoutim'),
    ('officiant', 'autres', 'L\'officiant doit-il répondre ?'),
    ('penser', 'autres', 'Penser à des paroles de Tora, regarder un compte'),
    ('birkhotTora', 'tefilot', 'Bénédictions de la Tora'),
]
GROUPS = [
    ('qaddich', 'Qaddich'), ('qedoucha', 'Qédoucha'), ('repondre', 'Répondre à l\'officiant et à l\'assemblée'),
    ('tefilot', 'Mes propres bénédictions'), ('tora', 'Lecture de la Tora'), ('autres', 'Autres cas'),
]
I = ['Interdit', 'n']
OB = ['Obligatoire', 'o']
AU = ['Autorisé', 'o']
DR = ['On en a le droit', 'o']
REP = ['On répond', 'o']
QB = ['« Qadoch » et « baroukh » uniquement', 'c']
QBY = ['« Qadoch », « baroukh » et « Yimlokh »', 'c']
YIT = ['Jusqu\'à « Yitbarakh »', 'c']
DAA = ['Jusqu\'à « daamiran béalma »', 'c']
TROIS = ['Les trois premiers mots uniquement', 'c']
PENSE = ['On le pense uniquement', 'c']
IDEM = 'IDEM'

ROWS = [
    ('avantTora', 'Avant les bénédictions de la Tora', [
        AU, AU, OB, OB, OB, OB, OB, DAA, QB, AU, None,
        OB, OB, OB, AU, AU, AU, OB, OB, DR, ['Autorisé si on ne dit pas de verset', 'c'], AU, ['A le droit, mais il vaut mieux éviter', 'c'], None]),
    ('birkhot', 'Au milieu d\'une bénédiction longue des Birkhot hacha\'har', [
        I, I, OB, I, ['S\'abstenir', 'n'], I, I, ['Jusqu\'à « Yitbarakh » seulement', 'c'], QB, I, I,
        I, ['On ne le dit pas', 'n'], TROIS, I, PENSE, I, I, REP, ['On termine d\'abord la berakha', 'c'], I, None, ['Divré Tora : interdit · compte : éviter', 'n'], I]),
    ('elokenou', 'Depuis « Élokénou » jusqu\'à « Baroukh chéamar »', [
        AU, DR, OB, OB, OB, OB, OB, ['Obligation de répondre entièrement', 'o'], ['On a l\'obligation de répondre entièrement', 'o'], DR, DR,
        OB, OB, IDEM, DR, DR, ['On peut le dire', 'o'], OB, OB, DR, DR, ['Il en a le droit', 'o'], None, AU]),
    ('baroukhCheamar', 'Au milieu de « Baroukh chéamar »', [
        ['On les met entre « Yichtaba\'h » et le « Yotser »', 'c'], I, OB, I, ['S\'abstenir', 'n'], I, I, YIT, QB, I, I,
        I, I, ['S\'incliner uniquement', 'c'], I, PENSE, I, I, REP, I, I, ['A le droit si ceci ne le trouble pas', 'c'], ['Divré Tora : interdit · compte : éviter', 'n'], ['Pendant les « psouké dézimra »', 'c']]),
    ('pdz', 'Au milieu des Psouké dézimra (de « Mizmor létoda » à « Yichtaba\'h »)', [
        ['Permis entre les mizmorim ; mieux vaut les mettre entre « Yichtaba\'h » et le « Yotser »', 'c'], I, OB, AU, REP, AU, DR, DAA, QBY, I, I,
        ['Interdit, mais chanter les « psouké dézimra » comme si l\'on disait le Chéma', 'n'], ['Il est interdit de le dire', 'n'], TROIS, I, PENSE,
        ['On le dira entre « Yichtaba\'h » et le « Yotser »', 'n'], OB, OB, ['On peut monter et lire à voix basse', 'c'], ['Ce n\'est pas une bonne habitude', 'n'], I, I,
        ['On dit « Ba\'har banou », et les autres entre « Yichtaba\'h » et le « Yotser »', 'c']]),
    ('yichtabah', 'Au milieu de « Yichtaba\'h », après avoir commencé la berakha et dit le Nom divin', [
        I, I, AU, I, AU, I, I, ['Obligatoire jusqu\'à « daamiran béalma »', 'c'], QB, I, I,
        I, I, I, I, I, I, I, None, I, I, I, I, I]),
    ('yichtabahYotser', 'Entre « Yichtaba\'h » et le « Yotser »', [
        DR, DR, OB, DR, REP, OB, OB, IDEM, QBY, DR, None,
        ['On le récite avec l\'assemblée', 'o'], OB, ['On le dit entièrement', 'o'], DR, DR, AU, OB, OB, DR, ['Il vaut mieux ne pas suivre cette habitude', 'n'], ['Il en a le droit', 'o'], AU, DR]),
    ('barekhouYotser', 'Entre « Barékhou » et le « Yotser »', [
        I, I, AU, I, ['S\'abstenir', 'n'], ['On peut le faire', 'o'], None, YIT, QB, I, I,
        ['On met la main sur les yeux', 'c'], I, ['On s\'incline', 'c'], I, I, I, None, OB, I, I, I, AU, None]),
    ('chemaParagraphe', 'Au milieu d\'un paragraphe du Chéma et de ses bénédictions', [
        ['Attendre d\'être entre deux paragraphes', 'c'], I, OB, I, ['S\'abstenir de préférence', 'n'], I, I, ['Jusqu\'à « Yitbarakh » seulement', 'c'], QB, I, I,
        I, I, TROIS, I, PENSE, ['Le dire après la Amida, moins de 72 minutes plus tard', 'n'], I, REP, I, I, ['S\'il est certain que ceci ne le troublera pas', 'c'],
        ['Divré Tora : interdit · compte : mieux vaut éviter', 'n'], ['On attend de les dire entre les paragraphes', 'c']]),
    ('chemaEntre', 'Entre les paragraphes du Chéma', [
        ['Mettre avec la berakha', 'o'], I, OB, I, AU, I, I, DAA, IDEM, I, I,
        I, ['Pas nécessaire de les dire', 'n'], IDEM, I, IDEM, IDEM, OB, REP, I, I, I, AU, ['Avant « Ahavat ôlam », avec le paragraphe des Kohanim', 'c']]),
    ('chema', 'Au milieu du Chéma', [
        ['Les mettre, et dire la berakha après la Amida', 'c'], I, ['Obligatoire si cela ne dérange pas le Chéma', 'c'], I, ['S\'abstenir, mais on peut répondre', 'c'], I, I, YIT, IDEM, I, I,
        ['On met la main sur les yeux', 'c'], I, IDEM, I, ['Interdit, mais on le pense', 'c'], ['Interdit ; on le dira après la Amida', 'n'], I, REP, I, I,
        ['Si ceci ne le troublera pas', 'c'], ['Comme au milieu d\'un paragraphe', 'n'], ['Ne les dit plus après avoir dit « Ahavat ôlam »', 'n']]),
    ('amida', 'Au milieu de la Amida', [
        I, I, ['On se contente de les penser', 'c'], I, I, I, I, ['Le penser', 'c'], ['Le penser', 'c'], I, I,
        I, I, ['S\'incliner au milieu d\'une berakha', 'c'], I, I, I, I, I, I, I, I, I, I]),
    ('netsor', 'Au milieu d\'« Élokaï nétsor »', [
        I, I, OB, I, REP, I, I, YIT, QB, I, I,
        I, I, I, I, I, I, I, REP, I, I, None, AU, None]),
]

out_rows = []
prev = None
for rid, fr, cells in ROWS:
    assert len(cells) == len(COLS), (rid, len(cells))
    res = []
    for j, c in enumerate(cells):
        if c == IDEM:
            above = prev[j]
            assert above, (rid, j)
            res.append({'t': above['t'], 'c': above['c'], 'idem': True})
        elif c is None:
            res.append(None)
        else:
            assert c[1] in 'ocn'
            res.append({'t': c[0], 'c': c[1]})
    out_rows.append({'id': rid, 'fr': fr, 'cells': res})
    prev = res

data = {
    'v': 1,
    'source': 'Tableau des interruptions dans la prière, écrit par le rav Yits\'haq Yossef chalita (siddour Maguen Avot, Zmanim Diffusion).',
    'note': 'Transcrit pour l\'application depuis le livre imprimé ; à relire sur le livre.',
    'groups': [{'id': g, 'fr': f} for g, f in GROUPS],
    'cols': [{'id': i, 'group': g, 'fr': f} for i, g, f in COLS],
    'rows': out_rows,
}
with open('data/siddur/interruptions.json', 'w', encoding='utf-8') as fh:
    json.dump(data, fh, ensure_ascii=False, indent=1)
print('rows', len(out_rows), 'cells', sum(len(r['cells']) for r in out_rows))
