// Ajoute au siddour des sections de bénédictions « de circonstance » : data/siddur/<id>.json, leur traduction française (data/siddur/fr/<id>.json) et leurs
// entrées dans data/siddur/index.json (groupe « divers », à la suite de « Éclairs et tonnerre ») et fr/index.json.
//  - birkhot-hareiyot : « À la vue de… » ; birkhot-hareach : « À l'odorat » ; dayan-haemet : nouvelle triste ou heureuse (Dayan haEmet, Hatov véhaMétiv) ;
//    chehehyanou : Chéhé'héyanou, avec ses quatre occasions (une seule bénédiction, d'où des occasions en liste : `it[0]` et `it[1]` peuvent être des tableaux).
// Les textes sont les bénédictions traditionnelles (hébreu vocalisé, usage séfarade) ; la liste des occasions suit la « Liste des bénédictions » de Torah-Box,
// et la traduction française est celle de l'application (à faire relire). Idempotent : relancer réécrit les mêmes fichiers sans rien dupliquer.
// Usage : node scripts/build_siddur_birkhot.js

const fs = require('fs');
const path = require('path');
const SiddurCore = require('../js/siddurCore.js');
const DIR = path.resolve(__dirname, '..', 'data', 'siddur');
const START = 'אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם,';     // après « בָּרוּךְ », mis en gras
const START_FR = 'Béni sois-Tu, Éternel notre Dieu, Roi de l\'univers, ';

// [occasion en hébreu (sans voyelles), occasion en français, fin de la bénédiction en hébreu, fin en français]
const REIYOT = [
    ['הרואה שישים ריבוא מישראל ביחד בארץ ישראל מברך', 'En voyant au moins 600 000 Juifs rassemblés en Israël :', 'חֲכַם הָרָזִים:', 'Toi dont la sagesse pénètre les secrets.'],
    ['הרואה בית המקדש בירושלים או בית כנסת בנוי מחדש מברך', 'En voyant le Temple de Jérusalem ou une synagogue restaurée :', 'מַצִּיב גְּבוּל אַלְמָנָה:', 'qui rétablis le territoire de la veuve.'],
    ['הרואה מקום שנעשה בו נס לישראל מברך', 'En regardant un lieu où le peuple d\'Israël a bénéficié d\'un miracle :', 'שֶׁעָשָׂה נִסִּים לַאֲבוֹתֵינוּ בַּמָּקוֹם הַזֶּה:', 'qui as fait des miracles à nos ancêtres en ce lieu.'],
    ['הרואה אילנות נאים, בהמות נאות או בני אדם יפים מברך', 'En contemplant de beaux arbres, de beaux animaux, de beaux hommes :', 'שֶׁכָּכָה לּוֹ בְּעוֹלָמוֹ:', 'qui en a de tels dans Son monde.'],
    ['הרואה אדם משונה בצבע, בגודל או בצורה מברך', 'En voyant une personne anormalement constituée (couleur, taille, physique…) :', 'מְשַׁנֶּה הַבְּרִיּוֹת:', 'qui diversifies les créatures.'],
    ['הרואה בית קברות של ישראל מברך', 'En voyant un cimetière juif :',
        'אֲשֶׁר יָצַר אֶתְכֶם בַּדִּין, וְזָן וְכִלְכֵּל אֶתְכֶם בַּדִּין, וְהֵמִית אֶתְכֶם בַּדִּין, וְיוֹדֵעַ מִסְפַּר כֻּלְּכֶם בַּדִּין, וְהוּא עָתִיד לְהַחֲיוֹתְכֶם וּלְקַיֵּם אֶתְכֶם בַּדִּין. בָּרוּךְ אַתָּה יְהֹוָה, מְחַיֵּה הַמֵּתִים:',
        'qui vous a formés avec justice, qui vous a nourris et soutenus avec justice, qui vous a fait mourir avec justice, qui connais le nombre de vous tous avec justice, et qui vous ressusciteras et vous ramèneras à l\'existence avec justice. Béni sois-Tu, Éternel, qui ressuscites les morts.'],
    ['הרואה ברקים, כוכב נופל או הרים גבוהים מברך', 'En apercevant des éclairs, des étoiles filantes, de hautes montagnes :', 'עוֹשֶׂה מַעֲשֵׂה בְרֵאשִׁית:', 'qui fais l\'œuvre de la Création.'],
    ['הרואה את הים הגדול מברך', 'En voyant la Méditerranée (le Grand Océan) :', 'עֹשֶׂה אֶת הַיָּם הַגָּדוֹל:', 'qui fais le Grand Océan.'],
    ['הרואה חכם גדול בתורה מברך', 'En regardant un grand maître de la Torah :', 'שֶׁחָלַק מֵחָכְמָתוֹ לִירֵאָיו:', 'qui as donné de Ta sagesse en partage à ceux qui Te craignent.'],
    ['הרואה חכם גדול מאומות העולם מברך', 'En voyant un éminent sage des autres nations :', 'שֶׁנָּתַן מֵחָכְמָתוֹ לְבָשָׂר וָדָם:', 'qui as donné de Ta sagesse à un être de chair et de sang.'],
    ['הרואה מלך מישראל מברך', 'En voyant un roi d\'Israël :', 'שֶׁחָלַק מִכְּבוֹדוֹ לִירֵאָיו:', 'qui as donné de Ta gloire en partage à ceux qui Te craignent.'],
    ['הרואה מלך מאומות העולם מברך', 'En voyant un roi des autres nations :', 'שֶׁנָּתַן מִכְּבוֹדוֹ לְבָשָׂר וָדָם:', 'qui as donné de Ta gloire à un être de chair et de sang.']
];


const REACH = [
    ['על ריח טוב שאינו עץ ולא עשב, או שהוא מסופק בו בין עץ לעשב, מברך', 'Avant de sentir un parfum qui ne vient ni d\'un arbuste ni d\'une herbe aromatique (ou dont on ne sait pas lequel des deux) :', 'בּוֹרֵא מִינֵי בְשָׂמִים:', 'qui crées toutes sortes d\'aromates.'],
    ['על ריח טוב שבעצים מברך', 'Avant de sentir le parfum d\'un arbuste aromatique ou de sa fleur :', 'בּוֹרֵא עֲצֵי בְשָׂמִים:', 'qui crées des arbustes aromatiques.'],
    ['על ריח טוב שבעשבים מברך', 'Avant de sentir le parfum d\'une herbe aromatique :', 'בּוֹרֵא עִשְׂבֵּי בְשָׂמִים:', 'qui crées des herbes aromatiques.'],
    ['על ריח טוב שבפירות מברך', 'Avant de sentir le parfum d\'un fruit odoriférant (de préférence, on ne sent pas un étrog) :', 'הַנּוֹתֵן רֵיחַ טוֹב בַּפֵּרוֹת:', 'qui donnes une bonne odeur aux fruits.']
];

const NEWS = [
    ['השומע על פטירת קרוב שחייב להתאבל עליו מברך', 'En apprenant un décès (pour les personnes concernées par le deuil) :', 'דַּיַּן הָאֱמֶת:', 'Juge de vérité.'],
    ['על דבר טוב שיש בו הנאה לו ולאחרים, כגון כלי חדש או בשורה טובה, מברך', 'Quand un objet nouvellement acquis ou un heureux événement procure de la satisfaction à plusieurs personnes :', 'הַטּוֹב וְהַמֵּטִיב:', 'Toi qui es bon et bienfaisant.']
];

const CHEHEHYANOU = [
    [['מברכים שהחיינו על בגד חדש בלבישה ראשונה', 'על פרי חדש של העונה', 'בחנוכת בית חדש', 'על לידת בת, לדעת יש מי שאומרים'],
        ['En revêtant pour la première fois un vêtement neuf :', 'En mangeant un nouveau fruit de saison :', 'En inaugurant une nouvelle habitation :', 'À la naissance d\'une fille (selon certains décisionnaires) :'],
        'שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה:', 'qui nous as maintenus en vie, nous as soutenus et nous as permis d\'atteindre ce temps.']
];

// id, titre hébreu de l'index, titre français, titre de la première ligne (hébreu), occasions.
const SECTIONS = [
    { id: 'birkhot-hareiyot', he: 'ברכות ותפילות שונות › ברכות הראייה', fr: 'Birkhot haRéyiyot (bénédictions « à la vue de… »)', title: 'בִּרְכוֹת הָרְאִיָּה', items: REIYOT, after: 'eclairs-tonnerre' },
    { id: 'birkhot-hareach', he: 'ברכות ותפילות שונות › ברכות הריח', fr: 'Birkhot haRéa\'h (bénédictions de l\'odorat)', title: 'בִּרְכוֹת הָרֵיחַ', items: REACH, after: 'birkhot-hareiyot' },
    { id: 'dayan-haemet', he: 'ברכות ותפילות שונות › דיין האמת והטוב והמטיב', fr: 'Dayan haEmet et Hatov véhaMétiv', title: 'דַּיַּן הָאֱמֶת וְהַטּוֹב וְהַמֵּטִיב', items: NEWS, after: 'birkhot-hareach' },
    { id: 'chehehyanou', he: 'ברכות ותפילות שונות › שהחיינו', fr: 'Chéhé\'héyanou', title: 'בִּרְכַּת שֶׁהֶחֱיָנוּ', items: CHEHEHYANOU, after: 'dayan-haemet' }
];

const indexPath = path.join(DIR, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const group = index.groups.filter(g => g.id === 'divers')[0];
const frIndexPath = path.join(DIR, 'fr', 'index.json');
const frIndex = JSON.parse(fs.readFileSync(frIndexPath, 'utf8'));
fs.mkdirSync(path.join(DIR, 'fr'), { recursive: true });

SECTIONS.forEach(sec => {
    const segments = ['<b><big><b>' + sec.title + '</b></big></b>'];
    const fr = {};
    sec.items.forEach((it) => {
        [].concat(it[0]).forEach((line, i) => {
            segments.push('<b><small>' + line + (i === [].concat(it[0]).length - 1 ? ':' : '') + '</small></b>');
            fr[segments.length - 1] = [].concat(it[1])[i];
        });
        segments.push('<b>בָּרוּךְ</b> ' + START + ' ' + it[2]);
        fr[segments.length - 1] = START_FR + it[3];
    });
    const section = { v: 1, id: sec.id, he: sec.he, fr: sec.fr, ref: 'Bénédictions traditionnelles ; occasions d\'après la « Liste des bénédictions » de Torah-Box', segments: segments };
    fs.writeFileSync(path.join(DIR, sec.id + '.json'), JSON.stringify(section) + '\n');
    const t = {};
    Object.keys(fr).forEach(k => { t[k] = [SiddurCore.fingerprint(segments[Number(k)]), fr[k]]; });
    fs.writeFileSync(path.join(DIR, 'fr', sec.id + '.json'), JSON.stringify({ v: 1, id: sec.id, t: t }) + '\n');

    // index.json : à la suite de la section `after`, dans le groupe « divers ».
    const entry = { id: sec.id, he: sec.he, fr: sec.fr, segments: segments.length };
    const same = group.sections.findIndex(s => s.id === sec.id);
    if (same !== -1) group.sections[same] = entry;
    else group.sections.splice(group.sections.findIndex(s => s.id === sec.after) + 1, 0, entry);

    // fr/index.json : l'ordre du fichier d'origine n'est pas alphabétique ; on place la clé après « birkhot-hanehenin » (ou à la fin) sans toucher au reste.
    const ordered = {};
    Object.keys(frIndex.sections).forEach(k => {
        if (k === sec.id) return;
        ordered[k] = frIndex.sections[k];
        if (k === 'birkhot-hanehenin' && !(sec.id in ordered)) ordered[sec.id] = Object.keys(t).length;
    });
    if (!(sec.id in ordered)) ordered[sec.id] = Object.keys(t).length;
    frIndex.sections = ordered;
    console.log(sec.id + ' : ' + segments.length + ' segments, ' + Object.keys(t).length + ' traductions');
});

// Sans retour à la ligne final, comme les fichiers d'origine.
fs.writeFileSync(indexPath, JSON.stringify(index));
fs.writeFileSync(frIndexPath, JSON.stringify(frIndex));
