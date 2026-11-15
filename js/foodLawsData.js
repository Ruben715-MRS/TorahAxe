// =========================================================================
// === PUR ET IMPUR : ANIMAUX ET ALIMENTS (DONNÉES) ===
// =========================================================================
// Les animaux permis et interdits (Lévitique 11, Deutéronome 14), les oiseaux interdits, les quatre sauterelles permises et les mélanges interdits
// (kilayim, viande et lait). Les noms hébreux sont ceux du texte (sans voyelles) ; les noms français sont ceux de la Bible du Rabbinat (1899), qui n'est
// qu'une des identifications possibles : pour beaucoup d'espèces (le chafan, les oiseaux, les sauterelles), l'identification s'est perdue ou est discutée,
// et la pratique n'admet que ce qu'une tradition transmise (mésora) désigne. Outil d'étude, pas une décision de halakha. À relire par une personne compétente.
// Consommé par js/foodLawsCore.js (testé dans tests/foodLawsCore.test.js) et js/app/foodlaws.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.FoodLawsData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les catégories d'animaux du tableau.
    var CATEGORIES = { terre: 'Quadrupèdes', eau: 'Animaux aquatiques', rampant: 'Rampants', insecte: 'Insectes ailés' };
    var STATUS = { pur: 'Permis (pur)', impur: 'Interdit (impur)' };
    // Les signes d'un quadrupède : le pied fendu (ongle divisé), la rumination.
    var SIGNS = { both: 'Les deux signes', hoof: 'Pied fendu seulement', cud: 'Rumine seulement', none: 'Sans objet' };

    // Une ligne : { id, cat, status, he, fr, hoof, cud (true / false / null), signs ('both' | 'hoof' | 'cud' | 'none'), ref, note }
    var ANIMALS = [
        // Les dix animaux permis (Deutéronome 14:4-5).
        { id: 'chor', cat: 'terre', status: 'pur', he: 'שור', fr: 'Le bœuf', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:4', note: 'Animal domestique.' },
        { id: 'sse-kessavim', cat: 'terre', status: 'pur', he: 'שה כשבים', fr: 'Le mouton (brebis)', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:4', note: 'Animal domestique.' },
        { id: 'sse-izim', cat: 'terre', status: 'pur', he: 'שה עזים', fr: 'La chèvre', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:4', note: 'Animal domestique.' },
        { id: 'ayal', cat: 'terre', status: 'pur', he: 'איל', fr: 'Le cerf', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:5', note: 'Animal sauvage (« haya »), dont le sang se couvre.' },
        { id: 'tsvi', cat: 'terre', status: 'pur', he: 'צבי', fr: 'Le chevreuil (gazelle)', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:5', note: 'Animal sauvage ; l’identification varie (chevreuil, gazelle).' },
        { id: 'yahmor', cat: 'terre', status: 'pur', he: 'יחמור', fr: 'Le daim', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:5', note: 'Animal sauvage ; l’identification varie.' },
        { id: 'akko', cat: 'terre', status: 'pur', he: 'אקו', fr: 'Le bouquetin', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:5', note: 'Animal sauvage ; l’identification varie.' },
        { id: 'dichon', cat: 'terre', status: 'pur', he: 'דישן', fr: 'L’antilope', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:5', note: 'Animal sauvage ; l’identification varie.' },
        { id: 'to', cat: 'terre', status: 'pur', he: 'תאו', fr: 'L’aurochs', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:5', note: 'Animal sauvage ; l’identification varie.' },
        { id: 'zemer', cat: 'terre', status: 'pur', he: 'זמר', fr: 'Le zémer', hoof: true, cud: true, signs: 'both', ref: 'Deutéronome 14:5', note: 'Animal sauvage ; l’identification est incertaine (la Bible du Rabbinat laisse le nom).' },
        // Les quatre quadrupèdes à un seul signe (Lévitique 11:4-7 ; Deutéronome 14:7-8).
        { id: 'gamal', cat: 'terre', status: 'impur', he: 'גמל', fr: 'Le chameau', hoof: false, cud: true, signs: 'cud', ref: 'Lévitique 11:4 ; Deutéronome 14:7', note: 'Il rumine, mais n’a pas le pied fendu.' },
        { id: 'chafan', cat: 'terre', status: 'impur', he: 'שפן', fr: 'Le chafan (la gerboise)', hoof: false, cud: true, signs: 'cud', ref: 'Lévitique 11:5 ; Deutéronome 14:7', note: 'Il rumine, mais n’a pas le pied fendu. L’identification varie (gerboise, daman, lapin des rochers).' },
        { id: 'arnevet', cat: 'terre', status: 'impur', he: 'ארנבת', fr: 'L’arnévet (le lièvre)', hoof: false, cud: true, signs: 'cud', ref: 'Lévitique 11:6 ; Deutéronome 14:7', note: 'Il rumine, mais n’a pas le pied fendu.' },
        { id: 'hazir', cat: 'terre', status: 'impur', he: 'חזיר', fr: 'Le porc', hoof: true, cud: false, signs: 'hoof', ref: 'Lévitique 11:7 ; Deutéronome 14:8', note: 'Il a le pied fendu, mais ne rumine pas. Il est le seul animal dans ce cas.' },
        // L'eau.
        { id: 'poisson-pur', cat: 'eau', status: 'pur', he: 'סנפיר וקשקשת', fr: 'Tout animal aquatique avec nageoires et écailles', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:9 ; Deutéronome 14:9', note: 'Mers et rivières. Il faut les deux signes ; selon la Michna (Nida 6:9), tout poisson à écailles a aussi des nageoires, mais non l’inverse.' },
        { id: 'poisson-impur', cat: 'eau', status: 'impur', he: 'שרץ המים', fr: 'Tout animal aquatique sans nageoires ou sans écailles', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:10-12 ; Deutéronome 14:10', note: 'Il est « chéketz » (abominable) : crustacés, mollusques, anguilles, etc.' },
        // Les rampants impurs (Lévitique 11:29-30), avec les noms de la Bible du Rabbinat.
        { id: 'holed', cat: 'rampant', status: 'impur', he: 'חלד', fr: 'La taupe', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:29', note: 'L’identification varie (taupe, belette).' },
        { id: 'akhbar', cat: 'rampant', status: 'impur', he: 'עכבר', fr: 'Le rat', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:29', note: 'Le mot désigne la souris ou le rat.' },
        { id: 'tsav', cat: 'rampant', status: 'impur', he: 'צב', fr: 'Le lézard (la tortue)', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:29', note: 'L’identification varie (lézard, tortue).' },
        { id: 'anaka', cat: 'rampant', status: 'impur', he: 'אנקה', fr: 'Le hérisson', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:30', note: 'L’identification varie (hérisson, furet).' },
        { id: 'koah', cat: 'rampant', status: 'impur', he: 'כח', fr: 'Le crocodile', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:30', note: 'L’identification varie (crocodile, varan, lézard).' },
        { id: 'letaa', cat: 'rampant', status: 'impur', he: 'לטאה', fr: 'La salamandre (le lézard)', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:30', note: 'L’identification varie.' },
        { id: 'homet', cat: 'rampant', status: 'impur', he: 'חמט', fr: 'La limace', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:30', note: 'L’identification varie (limace, escargot, lézard).' },
        { id: 'tinchemet', cat: 'rampant', status: 'impur', he: 'תנשמת', fr: 'Le caméléon', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:30', note: 'Le même mot désigne aussi un oiseau interdit (Lévitique 11:18).' },
        { id: 'rampants-autres', cat: 'rampant', status: 'impur', he: 'כל שרץ השרץ על הארץ', fr: 'Tout ce qui rampe sur le ventre, sur quatre pattes ou sur beaucoup de pattes', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:41-44', note: 'Interdit : « Ne vous rendez pas abominables par ces rampants ».' },
        // Les insectes ailés.
        { id: 'sauterelles', cat: 'insecte', status: 'pur', he: 'ארבה, סלעם, חרגל, חגב', fr: 'Les quatre sortes de sauterelles', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:21-22', note: 'Les seuls insectes ailés permis ; voir l’onglet « Sauterelles ».' },
        { id: 'insectes-autres', cat: 'insecte', status: 'impur', he: 'שרץ העוף', fr: 'Tout autre insecte ailé', hoof: null, cud: null, signs: 'none', ref: 'Lévitique 11:20, 23 ; Deutéronome 14:19', note: 'Interdit : « Tout insecte ailé est impur pour vous ; on n’en mangera point ».' }
    ];

    // Les oiseaux interdits : la Torah les nomme sans donner de signe. `lev` et `dt` : le verset où le nom figure (null s'il n'y figure pas).
    // `group` : les noms que le Talmud regroupe (Houlin 63b : daa, raa, ayya et daya = un seul oiseau).
    var BIRDS = [
        { id: 'nesher', he: 'נשר', fr: 'L’aigle', lev: '11:13', dt: '14:12', note: '' },
        { id: 'peres', he: 'פרס', fr: 'L’orfraie', lev: '11:13', dt: '14:12', note: '' },
        { id: 'ozniya', he: 'עזניה', fr: 'La vallérie (l’ozniya)', lev: '11:13', dt: '14:12', note: '' },
        { id: 'daa', he: 'דאה', fr: 'Le faucon', lev: '11:14', dt: null, note: 'Le Deutéronome écrit « ra’a » (ראה) : le Talmud (Houlin 63b) en fait le même oiseau que l’aya et la daya.' },
        { id: 'raa', he: 'ראה', fr: 'Le faucon (ra’a)', lev: null, dt: '14:13', note: 'Variante de « daa » (Lévitique 11:14).' },
        { id: 'ayya', he: 'איה', fr: 'Le vautour', lev: '11:14', dt: '14:13', note: '' },
        { id: 'daya', he: 'דיה', fr: 'L’autour (daya)', lev: null, dt: '14:13', note: 'Nom propre au Deutéronome.' },
        { id: 'orev', he: 'ערב', fr: 'Les corbeaux', lev: '11:15', dt: '14:14', note: '« selon leurs espèces » : toute la famille.' },
        { id: 'bat-yaana', he: 'בת היענה', fr: 'L’autruche', lev: '11:16', dt: '14:15', note: 'Littéralement « la fille de l’autruche ».' },
        { id: 'tahmas', he: 'תחמס', fr: 'L’hirondelle', lev: '11:16', dt: '14:15', note: 'L’identification varie.' },
        { id: 'chahaf', he: 'שחף', fr: 'La mouette', lev: '11:16', dt: '14:15', note: '' },
        { id: 'nets', he: 'נץ', fr: 'L’épervier', lev: '11:16', dt: '14:15', note: '« selon ses espèces ».' },
        { id: 'kos', he: 'כוס', fr: 'Le hibou', lev: '11:17', dt: '14:16', note: '' },
        { id: 'chalakh', he: 'שלך', fr: 'Le cormoran', lev: '11:17', dt: '14:17', note: 'L’ordre diffère entre les deux listes.' },
        { id: 'yanchouf', he: 'ינשוף', fr: 'La hulotte', lev: '11:17', dt: '14:16', note: '' },
        { id: 'tinchemet-oiseau', he: 'תנשמת', fr: 'Le porphyrion', lev: '11:18', dt: '14:16', note: 'Le même mot désigne aussi un rampant impur (Lévitique 11:30).' },
        { id: 'kaat', he: 'קאת', fr: 'Le pélican', lev: '11:18', dt: '14:17', note: '' },
        { id: 'rakham', he: 'רחם', fr: 'Le percnoptère', lev: '11:18', dt: '14:17', note: 'Le Deutéronome écrit « rakhama » (רחמה).' },
        { id: 'hassida', he: 'חסידה', fr: 'La cigogne', lev: '11:19', dt: '14:18', note: '« Hassida » : « la pieuse ».' },
        { id: 'anafa', he: 'אנפה', fr: 'Le héron', lev: '11:19', dt: '14:18', note: '« selon ses espèces ».' },
        { id: 'doukhifat', he: 'דוכיפת', fr: 'Le tétras (la huppe)', lev: '11:19', dt: '14:18', note: 'L’identification varie (tétras, huppe).' },
        { id: 'atalef', he: 'עטלף', fr: 'La chauve-souris', lev: '11:19', dt: '14:18', note: 'Comptée parmi les oiseaux.' }
    ];
    // Les signes des oiseaux selon la Michna (Houlin 3:6) : la Torah ne donne que la liste des oiseaux interdits, sans signe ; ces signes viennent de la tradition.
    var BIRD_SIGNS = [
        { id: 'dores', pure: false, fr: 'Il saisit sa proie avec ses serres (« dorès »)', ref: 'Michna Houlin 3:6' },
        { id: 'etsba', pure: true, fr: 'Il a un doigt supplémentaire, derrière la patte', ref: 'Michna Houlin 3:6' },
        { id: 'zefek', pure: true, fr: 'Il a un jabot', ref: 'Michna Houlin 3:6' },
        { id: 'korkevan', pure: true, fr: 'La peau de son gésier s’épluche', ref: 'Michna Houlin 3:6' }
    ];

    // Les quatre sauterelles permises (Lévitique 11:22) et les signes de la Michna (Houlin 3:7).
    var LOCUSTS = [
        { id: 'arbe', he: 'ארבה', fr: 'L’arbé', note: '' },
        { id: 'solam', he: 'סלעם', fr: 'Le solam', note: '' },
        { id: 'hargol', he: 'חרגל', fr: 'Le hargol', note: '' },
        { id: 'hagav', he: 'חגב', fr: 'Le hagav', note: '' }
    ];
    var LOCUST_SIGNS = [
        { id: 'legs', fr: 'Quatre pattes', ref: 'Lévitique 11:21 ; Michna Houlin 3:7' },
        { id: 'jump', fr: 'Deux pattes arrière articulées pour sauter (« kera’ayim »)', ref: 'Lévitique 11:21' },
        { id: 'wings', fr: 'Quatre ailes', ref: 'Michna Houlin 3:7' },
        { id: 'cover', fr: 'Les ailes couvrent la plus grande partie du corps', ref: 'Michna Houlin 3:7' },
        { id: 'name', fr: 'Il porte le nom de « hagav » (selon Rabbi Yossi)', ref: 'Michna Houlin 3:7' }
    ];

    // Les mélanges interdits. `cat` : plantes, tissus, animaux, viande.
    var MIXTURES_CATS = { plantes: 'Plantes', tissus: 'Tissus', animaux: 'Animaux', viande: 'Viande et lait' };
    var MIXTURES = [
        { id: 'zeraim', cat: 'plantes', he: 'כלאי זרעים', fr: 'Graines mélangées (kilé zéraïm)', ref: 'Lévitique 19:19 ; Deutéronome 22:9', sources: 'Michna Kilayim ; Rambam, Hilkhot Kilayim',
            text: 'On ne sème pas dans un même champ deux espèces de graines ensemble. La tradition précise ce qui compte comme espèces différentes et les distances à respecter entre elles (Michna Kilayim).' },
        { id: 'kerem', cat: 'plantes', he: 'כלאי הכרם', fr: 'Autre semence dans la vigne (kilé hakérèm)', ref: 'Deutéronome 22:9', sources: 'Michna Kilayim ; Rambam, Hilkhot Kilayim',
            text: '« N’ensemence pas ton vignoble de graines hétérogènes, si tu ne veux frapper d’interdit la production entière : le grain que tu auras semé et le produit du vignoble. » La vigne a ses propres règles, plus strictes : le produit est interdit.' },
        { id: 'chaatnez', cat: 'tissus', he: 'שעטנז', fr: 'Laine et lin (chaatnez)', ref: 'Lévitique 19:19 ; Deutéronome 22:11', sources: 'Michna Kilayim ; Rambam, Hilkhot Kilayim 10',
            text: 'On ne porte pas un vêtement tissé de laine (de mouton) et de lin. Exceptions écrites : les tsitsit et les vêtements du Cohen Gadol mêlent laine et lin sur ordre de la Torah.' },
        { id: 'behema', cat: 'animaux', he: 'כלאי בהמה', fr: 'Accouplement de deux espèces (kilé bhéma)', ref: 'Lévitique 19:19', sources: 'Michna Kilayim ; Rambam, Hilkhot Kilayim 9',
            text: '« N’accouple point tes bêtes d’espèce différente. » L’interdit vise l’accouplement fait par la main de l’homme ; la tradition en tire aussi des règles sur les mulets et les animaux sauvages.' },
        { id: 'attelage', cat: 'animaux', he: 'לא תחרש בשור ובחמור', fr: 'Bœuf et âne attelés ensemble', ref: 'Deutéronome 22:10', sources: 'Michna Kilayim ; Rambam, Hilkhot Kilayim 9',
            text: '« Ne laboure pas avec un bœuf et un âne attelés ensemble. » La tradition étend l’interdit à toute espèce pure avec toute espèce impure, et à tout travail qui les tire ensemble.' },
        { id: 'basar-halav', cat: 'viande', he: 'בשר בחלב', fr: 'Viande et lait', ref: 'Exode 23:19 ; Exode 34:26 ; Deutéronome 14:21', sources: 'Houlin 113a–115b ; Michna Houlin 8 ; Rambam, Hilkhot Maakhalot Assourot 9',
            text: '« Tu ne feras pas cuire le chevreau dans le lait de sa mère. » Dit trois fois dans la Torah, ce qui donne trois interdits (Houlin 115b) : faire cuire, manger et en tirer profit. La viande de volaille est interdite avec le lait par les Sages seulement (Houlin 113a-b). Délai entre viande et lait : de une à six heures selon les usages.' }
    ];

    // Les signes de pureté, par sorte d'animal (l'onglet « Signes »).
    var SIGN_CARDS = [
        { id: 'terre', he: 'בהמה וחיה', fr: 'Quadrupèdes', ref: 'Lévitique 11:3-8 ; Deutéronome 14:6-8',
            text: 'Deux signes réunis : le pied fendu en deux ongles (« maphris parsa, chossaat chéssa ») ET la rumination (« maalat guéra »). Il en faut les deux. Quatre animaux n’ont qu’un seul signe et sont interdits : le chameau, le chafan et le lièvre ruminent sans avoir le pied fendu ; le porc a le pied fendu sans ruminer. Le Talmud ajoute qu’il n’y en a pas d’autres au monde (Houlin 59a). Les dix espèces permises sont nommées en Deutéronome 14:4-5.' },
        { id: 'eau', he: 'מים', fr: 'Animaux aquatiques', ref: 'Lévitique 11:9-12 ; Deutéronome 14:9-10',
            text: 'Deux signes réunis : des nageoires (« snapir ») ET des écailles (« kaskéset »). Tout ce qui vit dans l’eau sans les deux est « chéketz », abominable. Selon la Michna (Nida 6:9), tout poisson à écailles a aussi des nageoires, mais non l’inverse : voir une écaille suffit à reconnaître un poisson pur.' },
        { id: 'oiseaux', he: 'עוף', fr: 'Oiseaux', ref: 'Lévitique 11:13-19 ; Deutéronome 14:11-18',
            text: 'La Torah ne donne pas de signe : elle nomme les oiseaux interdits (voir l’onglet « Oiseaux »). Les Sages en tirent des signes (Michna Houlin 3:6) : l’oiseau qui saisit sa proie avec ses serres (« dorès ») est impur ; le doigt supplémentaire, le jabot et le gésier qu’on épluche sont des signes de pureté. Aujourd’hui, on ne mange que les oiseaux dont on a une tradition transmise (Choulhan Aroukh Yoré Déa 82).' },
        { id: 'insectes', he: 'שרץ העוף', fr: 'Insectes ailés', ref: 'Lévitique 11:20-23 ; Deutéronome 14:19',
            text: 'Tout insecte ailé est interdit, sauf quatre sortes de sauterelles dont les signes sont donnés en Lévitique 11:21 : voir l’onglet « Sauterelles ».' },
        { id: 'rampants', he: 'שרץ', fr: 'Rampants', ref: 'Lévitique 11:29-31, 41-44',
            text: 'Huit rampants sont nommés comme impurs (la taupe, le rat, le lézard, le hérisson, le crocodile, la salamandre, la limace, le caméléon) ; tout ce qui rampe sur le ventre, sur quatre pattes ou sur beaucoup de pattes est interdit. Leur cadavre transmet l’impureté (Lévitique 11:31-38).' }
    ];

    // Liste contemporaine des poissons autorisés, publiée par le Consistoire de Paris (https://www.consistoire.org/poissons-autorises/).
    // Ce n'est pas le texte de la Torah : c'est la décision pratique d'une autorité, relevée telle quelle (ordre et orthographe de la page).
    // `alias` : autre nom donné sur la page ; `excl` : exception écrite sur la page ; `note` : mention de la page. Liste sans date de version affichée.
    var CONSISTOIRE_POISSONS = [
        { fr: 'Ablette', lat: 'Alburnus alburnus' },
        { fr: 'Aiglefin', lat: 'Melanogrammus aeglefinus' },
        { fr: 'Albacore', lat: 'Thunnus alalunga' },
        { fr: 'Alose', lat: 'Alosa alosa, Alosa fallax' },
        { fr: 'Anchois', lat: 'Engraulis encrasicolus' },
        { fr: 'Athérine', lat: 'Atherina boyeri' },
        { fr: 'Bar', lat: 'Dicentrarchus labrax' },
        { fr: 'Barbeau', lat: 'Barbus barbus', alias: 'Barbot' },
        { fr: 'Barbue', lat: 'Scophthalmus rhombus', excl: 'Turbot interdit' },
        { fr: 'Beryx', lat: 'Beryx decadactylus' },
        { fr: 'Bogue', lat: 'Boops boops' },
        { fr: 'Bonite', lat: 'Sarda sarda' },
        { fr: 'Brême', lat: 'Abramis brama' },
        { fr: 'Brochet', lat: 'Esox lucius' },
        { fr: 'Cabillaud', lat: 'Gadus morhua', alias: 'Cabilleau' },
        { fr: 'Capélan', lat: 'Mallotus villosus' },
        { fr: 'Capitaine', lat: 'Lethrinus spp.' },
        { fr: 'Carpe', lat: 'Cyprinus carpio', excl: 'Carpe à cuir interdite' },
        { fr: 'Carpe miroir', lat: 'Cyprinus carpio', note: 'Vérifier la présence d’écailles.' },
        { fr: 'Carpion', lat: 'Probablement Abramis ou Blicca (brème), à confirmer', note: 'Identification non confirmée : la photo du Consistoire évoque une brème.' },
        { fr: 'Carrelet', lat: 'Pleuronectes platessa' },
        { fr: 'Chinchard', lat: 'Trachurus trachurus' },
        { fr: 'Colin', lat: 'Pollachius virens', note: 'En France, « colin » désigne surtout le lieu noir ; le mot n’est autorisé que pour les filets surgelés.' },
        { fr: 'Colinot', lat: 'Trisopterus luscus' },
        { fr: 'Daurade grise, rose, royale ou sébaste', lat: 'Sparus aurata (royale), Spondyliosoma cantharus (grise), Pagellus bogaraveo (rose), Sebastes spp. (sébaste)' },
        { fr: 'Eglefin', lat: 'Melanogrammus aeglefinus' },
        { fr: 'Empereur', lat: 'Lethrinus spp.' },
        { fr: 'Eperlan', lat: 'Osmerus eperlanus' },
        { fr: 'Flet', lat: 'Platichthys flesus' },
        { fr: 'Flétan', lat: 'Hippoglossus hippoglossus' },
        { fr: 'Gardon', lat: 'Rutilus rutilus', alias: 'Rosse' },
        { fr: 'Germon', lat: 'Thunnus alalunga', alias: 'Thon blanc' },
        { fr: 'Goujon', lat: 'Gobio gobio' },
        { fr: 'Grenadier', lat: 'Coryphaenoides rupestris' },
        { fr: 'Grondin', lat: 'Eutrigla gurnardus' },
        { fr: 'Hareng', lat: 'Clupea harengus' },
        { fr: 'Hocki', lat: 'Macruronus novaezelandiae' },
        { fr: 'Julienne', lat: 'Pollachius virens' },
        { fr: 'Liche', lat: 'Lichia amia' },
        { fr: 'Lieu', lat: 'Pollachius pollachius' },
        { fr: 'Limande', lat: 'Limanda limanda' },
        { fr: 'Limande-Plie', lat: 'Probablement Limanda limanda, Pleuronectes platessa, à confirmer', note: 'Nom composé : limande et plie.' },
        { fr: 'Limande-Sole', lat: 'Probablement Limanda limanda, Solea solea, à confirmer', note: 'Nom composé : limande et sole.' },
        { fr: 'Lingue', lat: 'Molva molva' },
        { fr: 'Loup', lat: 'Probablement Dicentrarchus labrax', note: 'Probable : le loup de mer (Anarhichas lupus) est exclu par le Consistoire.', excl: 'Filet de Loup et Loup de mer interdits' },
        { fr: 'Maigre', lat: 'Argyrosomus regius' },
        { fr: 'Maquereau', lat: 'Scomber scombrus' },
        { fr: 'Merlan', lat: 'Merlangius merlangus' },
        { fr: 'Merlu', lat: 'Merluccius merluccius', alias: 'Merluche' },
        { fr: 'Merluchon', lat: 'Merluccius merluccius' },
        { fr: 'Mérou', lat: 'Epinephelus marginatus' },
        { fr: 'Morue', lat: 'Gadus morhua' },
        { fr: 'Mostelle', lat: 'Phycis blennoides' },
        { fr: 'Mulet', lat: 'Mugil cephalus', alias: 'Murge' },
        { fr: 'Ombrine', lat: 'Umbrina cirrosa' },
        { fr: 'Orphie', lat: 'Belone belone' },
        { fr: 'Pageot', lat: 'Pagellus acarne' },
        { fr: 'Pagre', lat: 'Pagrus pagrus' },
        { fr: 'Patudo', lat: 'Thunnus obesus' },
        { fr: 'Perche', lat: 'Perca fluviatilis' },
        { fr: 'Plie', lat: 'Pleuronectes platessa' },
        { fr: 'Prêtre', lat: 'Atherina presbyter' },
        { fr: 'Rascasse', lat: 'Scorpaena scrofa' },
        { fr: 'Rouget', lat: 'Mullus barbatus' },
        { fr: 'Sandre', lat: 'Sander lucioperca' },
        { fr: 'Sardine', lat: 'Sardina pilchardus' },
        { fr: 'Sar doré', lat: 'Diplodus sargus', alias: 'Sargue' },
        { fr: 'Saumon', lat: 'Salmo salar', excl: 'Saumonette interdite' },
        { fr: 'Sole', lat: 'Solea solea' },
        { fr: 'Sprat', lat: 'Sprattus sprattus' },
        { fr: 'St Pierre', lat: 'Zeus faber' },
        { fr: 'Tacaud', lat: 'Trisopterus luscus' },
        { fr: 'Tanche', lat: 'Tinca tinca' },
        { fr: 'Thon', lat: 'Thunnus thynnus' },
        { fr: 'Truite', lat: 'Salmo trutta' },
        { fr: 'Truite saumonée', lat: 'Salmo trutta' },
        { fr: 'Véron', lat: 'Probablement Phoxinus phoxinus', note: 'Terme du vairon selon l’Office québécois de la langue française.' },
        { fr: 'Vieille', lat: 'Labrus bergylta' },
        { fr: 'Vivanneau', lat: 'Lutjanus spp.' },
        { fr: 'Vive', lat: 'Trachinus draco' }
    ];

    // Animaux terrestres contemporains réputés casher : compilation de plusieurs sources (Torah, Wikipedia, My Jewish Learning, Peninei Halakha,
    // Chabad, OU, JewFAQ), non officielle et non exhaustive. Les deux signes (rumination et pied fendu) sont requis ; l'espèce ne suffit pas pour la viande
    // (shehita, bedika, certification). `lat` : nom latin tel que cité ; `note` : précision de la compilation. Relevé tel quel, ordre des groupes conservé.
    var LAND_GROUPS = { domestique: 'Domestiques', bovides: 'Bovidés sauvages', antilopes: 'Antilopes et gazelles', caprins: 'Chèvres et moutons sauvages', cervides: 'Cervidés', giraffides: 'Giraffidés', autre: 'Autre' };
    var LAND_CONTEMPORARY = [
        { group: 'domestique', fr: 'Bœuf / vache', lat: 'Bos taurus', note: 'Toutes les races bovines domestiques.' },
        { group: 'domestique', fr: 'Zébu', lat: 'Bos indicus' },
        { group: 'domestique', fr: 'Yak', lat: 'Bos grunniens' },
        { group: 'domestique', fr: 'Buffle d’eau (buffle asiatique)', lat: 'Bubalus bubalis' },
        { group: 'domestique', fr: 'Mouton', lat: 'Ovis aries', note: 'Toutes les races ovines.' },
        { group: 'domestique', fr: 'Chèvre', lat: 'Capra hircus', note: 'Toutes les races caprines.' },
        { group: 'bovides', fr: 'Bison d’Amérique', lat: 'Bison bison' },
        { group: 'bovides', fr: 'Bison d’Europe', lat: 'Bison bonasus' },
        { group: 'bovides', fr: 'Gaur', lat: 'Bos gaurus' },
        { group: 'bovides', fr: 'Banteng', lat: 'Bos javanicus' },
        { group: 'bovides', fr: 'Buffle d’Afrique', lat: 'Syncerus caffer' },
        { group: 'bovides', fr: 'Anoas', lat: 'Bubalus spp.' },
        { group: 'antilopes', fr: 'Gazelle de montagne', lat: 'Gazella gazella' },
        { group: 'antilopes', fr: 'Gazelle de Thomson, gazelle de Grant, etc.', note: 'Plusieurs espèces.' },
        { group: 'antilopes', fr: 'Impala', lat: 'Aepyceros melampus' },
        { group: 'antilopes', fr: 'Springbok', lat: 'Antidorcas marsupialis' },
        { group: 'antilopes', fr: 'Oryx', lat: 'Oryx spp.' },
        { group: 'antilopes', fr: 'Addax', lat: 'Addax nasomaculatus' },
        { group: 'antilopes', fr: 'Éland', lat: 'Taurotragus oryx' },
        { group: 'antilopes', fr: 'Koudou', lat: 'Tragelaphus strepsiceros' },
        { group: 'antilopes', fr: 'Bongo', lat: 'Tragelaphus eurycerus' },
        { group: 'antilopes', fr: 'Nilgaut', lat: 'Boselaphus tragocamelus' },
        { group: 'antilopes', fr: 'Antilope quatre cornes', lat: 'Tetracerus quadricornis' },
        { group: 'antilopes', fr: 'Gnou', lat: 'Connochaetes spp.' },
        { group: 'antilopes', fr: 'Hartebeest / bubale', lat: 'Alcelaphus buselaphus' },
        { group: 'antilopes', fr: 'Topi / tsessebe', lat: 'Damaliscus lunatus' },
        { group: 'antilopes', fr: 'Cobes, waterbuck, lechwe, etc.', lat: 'Kobus spp.' },
        { group: 'antilopes', fr: 'Dik-dik, oribi, steenbok, etc.', note: 'Petites antilopes ; plusieurs espèces.' },
        { group: 'antilopes', fr: 'Saïga', lat: 'Saiga tatarica' },
        { group: 'caprins', fr: 'Bouquetin (ibex)', lat: 'Capra ibex et espèces proches' },
        { group: 'caprins', fr: 'Chèvre de montagne', lat: 'Oreamnos americanus' },
        { group: 'caprins', fr: 'Mouflon', lat: 'Ovis orientalis / Ovis gmelini' },
        { group: 'caprins', fr: 'Argali', lat: 'Ovis ammon' },
        { group: 'caprins', fr: 'Mouton de Barbarie', lat: 'Ammotragus lervia' },
        { group: 'caprins', fr: 'Markhor', lat: 'Capra falconeri' },
        { group: 'caprins', fr: 'Chamois', lat: 'Rupicapra rupicapra' },
        { group: 'caprins', fr: 'Isard', lat: 'Rupicapra pyrenaica' },
        { group: 'caprins', fr: 'Takin', lat: 'Budorcas taxicolor' },
        { group: 'caprins', fr: 'Bœuf musqué', lat: 'Ovibos moschatus' },
        { group: 'cervides', fr: 'Cerf élaphe', lat: 'Cervus elaphus' },
        { group: 'cervides', fr: 'Cerf de Virginie', lat: 'Odocoileus virginianus' },
        { group: 'cervides', fr: 'Cerf mulet', lat: 'Odocoileus hemionus' },
        { group: 'cervides', fr: 'Daim', lat: 'Dama dama' },
        { group: 'cervides', fr: 'Chevreuil', lat: 'Capreolus capreolus' },
        { group: 'cervides', fr: 'Élan', lat: 'Alces alces' },
        { group: 'cervides', fr: 'Wapiti', lat: 'Cervus canadensis' },
        { group: 'cervides', fr: 'Renne (caribou)', lat: 'Rangifer tarandus' },
        { group: 'cervides', fr: 'Cerf sika, cerf axis, muntjacs, etc.', note: 'Nombreuses espèces asiatiques.' },
        { group: 'giraffides', fr: 'Girafe', lat: 'Giraffa camelopardalis', note: 'Généralement considérée comme casher ; identifiée par certains commentateurs au « zemer ». Très rarement abattue.' },
        { group: 'giraffides', fr: 'Okapi', lat: 'Okapia johnstoni', note: 'Possède les deux signes.' },
        { group: 'autre', fr: 'Pronghorn (antilope d’Amérique)', lat: 'Antilocapra americana', note: 'Rumine et a des sabots fendus.' }
    ];

    // Oiseaux contemporains réputés casher : compilation de plusieurs sources (Torah, Talmud Houllin 59a-63b, Choulhan Aroukh Yoré Déa 82 et Rema,
    // Peninei Halakha, Orthodox Union, Star-K, travaux de R. Zivotofsky et R. Loike), non officielle et non exhaustive. La Torah ne donne pas de signe
    // positif : on ne mange que les oiseaux dont une tradition (mesorah) continue existe, et l'oiseau doit être abattu selon la shehita. Les communautés
    // (ashkénazes, séfarades, yéménites) et l'OU ne s'accordent pas sur tous les cas. `status` : 'courant' | 'communautes' | 'litigieux' | 'sauvage' | 'refuse'.
    var BIRDS_CASHER_STATUS = {
        courant: 'Mesorah forte et universelle',
        communautes: 'Mesorah dans certaines communautés',
        litigieux: 'Cas litigieux',
        sauvage: 'Tradition locale (oiseaux sauvages)',
        refuse: 'Non accepté ou sans tradition'
    };
    var BIRDS_CASHER = [
        { status: 'courant', fr: 'Poulet / coq', lat: 'Gallus gallus domesticus', note: 'Toutes les races domestiques courantes.' },
        { status: 'courant', fr: 'Dinde / dindon', lat: 'Meleagris gallopavo', note: 'Acceptée par la très grande majorité. Origine américaine, mais acceptée depuis des siècles. Quelques individus très stricts s’en abstiennent.' },
        { status: 'courant', fr: 'Canard domestique (canard de Pékin)', lat: 'Anas platyrhynchos domesticus', note: 'Mesorah claire en Europe et ailleurs.' },
        { status: 'courant', fr: 'Oie domestique', lat: 'Anser anser domesticus', note: 'Très largement acceptée.' },
        { status: 'courant', fr: 'Pigeon / colombe, et tourterelles', lat: 'Columba livia domestica ; Streptopelia turtur', note: 'Ce sont les oiseaux des sacrifices (torim et bnei yonah).' },
        { status: 'courant', fr: 'Caille', lat: 'Coturnix coturnix et Coturnix japonica', note: 'Mentionnée dans la Torah (slav) comme ayant nourri le peuple dans le désert.' },
        { status: 'communautes', fr: 'Moineau domestique', lat: 'Passer domesticus', note: 'Tradition dans plusieurs communautés européennes et orientales.' },
        { status: 'communautes', fr: 'Faisan', lat: 'Phasianus colchicus', note: 'Tradition dans certaines communautés européennes et orientales. L’OU ne le certifie généralement pas ; certaines communautés yéménites ou orientales l’acceptent.' },
        { status: 'communautes', fr: 'Perdrix grise européenne', lat: 'Perdix perdix', note: 'Mesorah européenne attestée. Les autres espèces de perdrix (américaines, etc.) n’ont pas de mesorah.' },
        { status: 'communautes', fr: 'Pintade', lat: 'Numida meleagris', note: 'Tradition dans certaines communautés (notamment orientales et yéménites). L’OU la classe généralement comme non acceptable.' },
        { status: 'communautes', fr: 'Cygne muet', lat: 'Cygnus olor', note: 'Accepté dans certaines communautés (mentionné dans Peninei Halakha).' },
        { status: 'communautes', fr: 'Certaines oies et canards sauvages européens', note: 'Oie cendrée, canard colvert sauvage, etc., selon les traditions locales.' },
        { status: 'litigieux', fr: 'Canard de Barbarie (muscovy)', lat: 'Cairina moschata', note: 'Accepté en Israël depuis le début du XXe siècle et dans de nombreuses communautés séfarades, sud-américaines et françaises. Non accepté par la majorité des autorités américaines et de nombreuses communautés ashkénazes : absence de mesorah claire, doutes sur le comportement « dores ».' },
        { status: 'litigieux', fr: 'Mulard (hybride muscovy × pékin)', note: 'Accepté en Israël pour le foie gras ; plus contesté ailleurs.' },
        { status: 'litigieux', fr: 'Dinde sauvage', note: 'Généralement considérée comme de la même espèce que la dinde domestique : acceptée par ceux qui acceptent la dinde.' },
        { status: 'litigieux', fr: 'Paon', lat: 'Pavo cristatus', note: 'Témoignages historiques de consommation, mais la mesorah n’est plus vivante pour la plupart des autorités : non consommé.' },
        { status: 'sauvage', fr: 'Oiseaux sauvages à tradition locale', note: 'Pigeons et tourterelles sauvages traditionnels, certaines cailles et perdrix européennes, moineaux dans certaines régions, oies et canards sauvages chez les communautés qui les chassaient. Rarement consommés hors de filières certifiées, la shehita et le contrôle étant difficiles.' },
        { status: 'refuse', fr: 'Rapaces et charognards (aigles, faucons, buses, vautours, hiboux, etc.)', note: 'Interdits.' },
        { status: 'refuse', fr: 'Corvidés (corbeaux, corneilles, pies)', note: 'Interdits.' },
        { status: 'refuse', fr: 'Goélands, mouettes, cormorans, pélicans, cigognes, hérons, huppes', note: 'Interdits.' },
        { status: 'refuse', fr: 'Autruche', lat: 'Struthio camelus', note: 'Explicitement interdite dans la Torah.' },
        { status: 'refuse', fr: 'Oiseaux sans aucune tradition', note: 'La quasi-totalité des oiseaux sans tradition, y compris les oiseaux du Nouveau Monde (sauf la dinde).' }
    ];

    return { SIGN_CARDS: SIGN_CARDS, CATEGORIES: CATEGORIES, STATUS: STATUS, SIGNS: SIGNS, ANIMALS: ANIMALS, BIRDS: BIRDS, BIRD_SIGNS: BIRD_SIGNS, LOCUSTS: LOCUSTS, LOCUST_SIGNS: LOCUST_SIGNS, MIXTURES_CATS: MIXTURES_CATS, MIXTURES: MIXTURES, CONSISTOIRE_POISSONS: CONSISTOIRE_POISSONS, LAND_GROUPS: LAND_GROUPS, LAND_CONTEMPORARY: LAND_CONTEMPORARY, BIRDS_CASHER_STATUS: BIRDS_CASHER_STATUS, BIRDS_CASHER: BIRDS_CASHER };
}));
