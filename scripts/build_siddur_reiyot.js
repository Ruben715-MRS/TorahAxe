// Ajoute au siddour la section « Birkhot haRéyiyot » (bénédictions « À la vue de… ») : data/siddur/birkhot-hareiyot.json, sa traduction française
// (data/siddur/fr/birkhot-hareiyot.json) et ses entrées dans data/siddur/index.json (groupe « divers », après « Éclairs et tonnerre ») et fr/index.json.
// Les textes sont les bénédictions traditionnelles (hébreu vocalisé, usage séfarade) ; la liste des occasions suit la « Liste des bénédictions » de Torah-Box,
// et la traduction française est celle de l'application (à faire relire). Idempotent : relancer réécrit les mêmes fichiers sans rien dupliquer.
// Usage : node scripts/build_siddur_reiyot.js

const fs = require('fs');
const path = require('path');
const SiddurCore = require('../js/siddurCore.js');
const DIR = path.resolve(__dirname, '..', 'data', 'siddur');
const ID = 'birkhot-hareiyot';
const START = 'בָּרוּךְ אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם,';
const START_FR = 'Béni sois-Tu, Éternel notre Dieu, Roi de l\'univers, ';

// [occasion en hébreu (sans voyelles), occasion en français, fin de la bénédiction en hébreu, fin en français]
const ITEMS = [
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

const HE = 'ברכות ותפילות שונות › ברכות הראייה';
const FR = 'Birkhot haRéyiyot (bénédictions « à la vue de… »)';
const segments = ['<b><big><b>בִּרְכוֹת הָרְאִיָּה</b></big></b>'];
const fr = {};
ITEMS.forEach((it) => {
    segments.push('<b><small>' + it[0] + ':</small></b>');
    fr[segments.length - 1] = it[1];
    segments.push('<b>בָּרוּךְ</b> ' + START.slice('בָּרוּךְ '.length) + ' ' + it[2]);
    fr[segments.length - 1] = START_FR + it[3];
});

const section = { v: 1, id: ID, he: HE, fr: FR, ref: 'Bénédictions traditionnelles ; occasions d\'après la « Liste des bénédictions » de Torah-Box', segments: segments };
fs.writeFileSync(path.join(DIR, ID + '.json'), JSON.stringify(section) + '\n');

const t = {};
Object.keys(fr).forEach(k => { t[k] = [SiddurCore.fingerprint(segments[Number(k)]), fr[k]]; });
fs.mkdirSync(path.join(DIR, 'fr'), { recursive: true });
fs.writeFileSync(path.join(DIR, 'fr', ID + '.json'), JSON.stringify({ v: 1, id: ID, t: t }) + '\n');

// index.json : après « Éclairs et tonnerre » dans le groupe « divers ».
const indexPath = path.join(DIR, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const group = index.groups.filter(g => g.id === 'divers')[0];
const entry = { id: ID, he: HE, fr: FR, segments: segments.length };
const same = group.sections.findIndex(s => s.id === ID);
if (same !== -1) group.sections[same] = entry;
else group.sections.splice(group.sections.findIndex(s => s.id === 'eclairs-tonnerre') + 1, 0, entry);
fs.writeFileSync(indexPath, JSON.stringify(index));     // sans retour à la ligne final, comme le fichier d'origine

const frIndexPath = path.join(DIR, 'fr', 'index.json');
const frIndex = JSON.parse(fs.readFileSync(frIndexPath, 'utf8'));
frIndex.sections[ID] = Object.keys(t).length;
// L'ordre du fichier d'origine n'est pas alphabétique : on place la clé après « birkhot-hanehenin » (ou à la fin) et on ne touche à rien d'autre.
const ordered = {};
Object.keys(frIndex.sections).forEach(k => {
    if (k === ID) return;
    ordered[k] = frIndex.sections[k];
    if (k === 'birkhot-hanehenin') ordered[ID] = Object.keys(t).length;
});
if (!(ID in ordered)) ordered[ID] = Object.keys(t).length;
frIndex.sections = ordered;
fs.writeFileSync(frIndexPath, JSON.stringify(frIndex));
console.log(ID + ' : ' + segments.length + ' segments, ' + Object.keys(t).length + ' traductions');
