// Ajoute au siddour (data/siddur/) des sections prises sur Sefaria : Siddur Edot HaMizrach, version « Torat Emet 357 » (domaine public).
// Usage : NODE_USE_ENV_PROXY=1 node scripts/build_siddur_extra.js   (derrière un proxy ; sinon sans la variable)
// Le texte n'est jamais retouché : on retire seulement les espaces en trop (début, fin, doubles), comme pour les sections d'origine.
// Idempotent : relancer réécrit les mêmes fichiers et ne duplique rien dans index.json.
// Les groupes ci-dessous (« Étape 1 : Chabbat ») s'ajoutent à la fin de index.json ; l'écran les range en rayons (js/app/siddur.js, SD_RAYONS).

const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'data', 'siddur');
const BOOK = 'Siddur Edot HaMizrach';
const VERSION = 'hebrew|Torat Emet 357';
// Les sources dont on extrait des tranches de segments (un chant, un passage).
const SLICE_SOURCES = {
    EV: 'Siddur Sefard, Shabbat Evening Meal, Zemirot',
    DAY: 'Siddur Sefard, Shabbat Day Meal, Zemirot',
    THIRD: 'Siddur Sefard, Third Meal, Zemirot',
    MEL: 'Siddur Sefard, Motzaei Shabbat , Melava Malka Zemirot',
    HANOUKA: 'Siddur Sefard, Chanukah, Menorah Lighting',
    HANOUKA_ZEMER: 'Siddur Sefard, Chanukah, Song for Shabbat Chanuka',
    POURIM_MEGUILA: 'Siddur Sefard, Purim, Megillah Reading',
    POURIM_QEROVETS: "Siddur Sefard, Purim, Krovetz L'Purim",
    EHCH: 'Siddur Edot HaMizrach, Shabbat Evening, Songs for Shabbat',
    EHMO: 'Siddur Edot HaMizrach, Havdalah, Motzei Shabbat Songs'
};
const sliceCache = {};

// id, titre français, chemin Sefaria (titres anglais). Les titres hébreux viennent de l'index de Sefaria.
const GROUPS = [
    { id: 'chabbat-accueil', fr: 'Accueil de Chabbat', sections: [
        ['chabbat-bougies', 'Allumage des bougies', ['Shabbat Candle Lighting']],
        ['chabbat-chir-hachirim', 'Chir haChirim', ['Song of Songs']],
        ['chabbat-kabbalat', 'Kabbalat Chabbat', ['Kabbalat Shabbat']]
    ] },
    { id: 'chabbat-arvit', fr: 'Arvit du vendredi soir', sections: [
        ['chabbat-arvit-barekhou', 'Barékhou', ['Shabbat Arvit', 'Barchu']],
        ['chabbat-arvit-chema', 'Chéma et ses bénédictions', ['Shabbat Arvit', 'The Shema']],
        ['chabbat-arvit-magen-avot', 'Magen Avot (la prière des sept)', ['Shabbat Arvit', 'Magen Avot']],
        ['chabbat-arvit-alenou', 'Alénou', ['Shabbat Arvit', 'Alenu']]
    ] },
    { id: 'chabbat-soir', fr: 'Kiddouch et repas du vendredi soir', sections: [
        ['chabbat-chalom-alekhem', 'Chalom Alékhem', ['Shabbat Evening', 'Shalom Alekhem']],
        ['chabbat-echet-hayil', "Echet 'Hayil", ['Shabbat Evening', 'Eshet Hayil']],
        ['chabbat-atkenou', 'Atkénou séoudata', ['Shabbat Evening', 'Atkenu Seudata']],
        ['chabbat-kiddouch-soir', 'Kiddouch du vendredi soir', ['Shabbat Evening', 'Kiddush']],
        ['chabbat-bracha-banim', 'Bénédiction des enfants', ['Shabbat Evening', 'Blessing of Children']],
        ['chabbat-seouda-1', 'Premier repas', ['Shabbat Evening', 'First Meal']],
        ['chabbat-zohar-seouda-1', 'Zohar du premier repas', ['Shabbat Evening', 'Zohar']]
    ] },
    { id: 'chabbat-chacharit', fr: 'Cha\'harit du Chabbat', sections: [
        ['chabbat-ch-psaumes', 'Psaumes du Chabbat', ['Shabbat Shacharit', 'Psalms for Shabbat']],
        ['chabbat-ch-pessoukei', 'Pessoukei dézimra', ['Shabbat Shacharit', 'Pesukei D\'Zimra']],
        ['chabbat-ch-chema', 'Chéma et ses bénédictions', ['Shabbat Shacharit', 'The Shema']],
        ['chabbat-ch-amida', 'Amida', ['Shabbat Shacharit', 'Amidah']],
        ['chabbat-ch-tora', 'Lecture de la Tora', ['Shabbat Shacharit', 'Torah Reading']],
        ['chabbat-ch-gomel', 'Birkat haGomel', ['Shabbat Shacharit', 'HaGomel']],
        ['chabbat-ch-zeved-habat', 'Zéved haBat (nomination d\'une fille)', ['Shabbat Shacharit', 'Zeved HaBat']],
        ['chabbat-ch-hatan', "Chabbat 'Hatan", ['Shabbat Shacharit', 'Shabbat Chatan']],
        ['chabbat-ch-haftara', 'Bénédictions de la Haftara', ['Shabbat Shacharit', 'Haftarah']],
        ['chabbat-ch-roch-hodech', 'Annonce de Roch \'Hodesh', ['Shabbat Shacharit', 'Birkat HaChodesh']],
        ['chabbat-ch-annonce-jeune', 'Annonce d\'un jeûne', ['Shabbat Shacharit', 'Announcement of Fast']],
        ['chabbat-ch-mi-cheberakh', 'Mi Chéberakh pour la communauté', ['Shabbat Shacharit', 'Mi Sheberach']],
        ['chabbat-ch-achre', 'Achré', ['Shabbat Shacharit', 'Ashrei']]
    ] },
    { id: 'chabbat-moussaf', fr: 'Moussaf du Chabbat', sections: [
        ['chabbat-mo-amida', 'Amida de Moussaf', ['Shabbat Mussaf', 'Amida']],
        ['chabbat-mo-ketoret', 'Pitoum haQétoret', ['Shabbat Mussaf', 'Incense Offering']],
        ['chabbat-mo-alenou', 'Alénou', ['Shabbat Mussaf', 'Alenu']]
    ] },
    { id: 'chabbat-seouda-2', fr: 'Kiddouch et repas du matin', sections: [
        ['chabbat-seouda-2', 'Repas du Chabbat matin', ['Daytime Meal', 'Daytime Meal']],
        ['chabbat-kiddouch-jour', 'Kiddouch du jour', ['Daytime Meal', 'Kiddush']]
    ] },
    { id: 'chabbat-minha', fr: 'Min\'ha du Chabbat', sections: [
        ['chabbat-mi-qorbanot', 'Qorbanot (les offrandes)', ['Shabbat Mincha', 'Offerings']],
        ['chabbat-mi-ouva-letsion', 'Ouva lé-Tsion', ['Shabbat Mincha', 'Uva LeSion']],
        ['chabbat-mi-amida', 'Amida', ['Shabbat Mincha', 'Amida']],
        ['chabbat-mi-alenou', 'Alénou', ['Shabbat Mincha', 'Alenu']]
    ] },
    { id: 'chabbat-seouda-3', fr: 'Troisième repas', sections: [
        ['chabbat-seouda-3', 'Troisième repas de Chabbat', ['Third Meal']]
    ] },
    { id: 'motsei-chabbat', fr: 'Havdala et samedi soir', sections: [
        ['chabbat-avant-havdala', 'Psaumes avant la Havdala', ['Havdalah', 'Before Havdalah']],
        ['chabbat-havdala', 'Havdala', ['Havdalah', 'Havdala']],
        ['chabbat-veyiten-lekha', 'Véyitén lékha', ['Havdalah', 'Veyiten Lecha']],
        ['chabbat-seouda-4', 'Quatrième repas', ['Havdalah', 'Fourth Meal']]
    ] },
    { id: 'michnayot-chabbat', fr: 'Michnayot de Chabbat', sections: [
        ['michnayot-seouda-1', 'Michnayot du premier repas', ['Mishna Study for Shabbat', 'First Meal']],
        ['michnayot-seouda-2', 'Michnayot du deuxième repas', ['Mishna Study for Shabbat', 'Second Meal']],
        ['michnayot-seouda-3', 'Michnayot du troisième repas', ['Mishna Study for Shabbat', 'Third Meal']]
    ] },
    { id: 'pirkei-avot', fr: 'Pirké Avot (Maximes des pères)', sections: [
        ['pirkei-avot', 'Pirké Avot', ['Mishna Study for Shabbat', 'Pirkei Avot']]
    ] },
    // --- Recueil des zemirot de Chabbat : un chant = une section. Source : le siddour d'Edot HaMizrach quand il a le chant, sinon le Siddur Sefard
    // (même éditeur, Torat Emet 357, domaine public). Les bornes (from, to) sont les indices des segments dans la source ; le titre hébreu est le début du chant.
    { id: 'zemirot-chabbat', fr: 'Recueil des zemirot de Chabbat', sections: [
        // vendredi soir
        { id: 'zem-kol-mekadech', fr: 'Kol Mékadech', slice: 'EV', from: 1, to: 2, he: 'כל מקדש שביעי' },
        { id: 'zem-menoucha-vesimha', fr: 'Menou\'ha vésim\'ha', slice: 'EV', from: 3, to: 4, he: 'מנוחה ושמחה' },
        { id: 'zem-mah-yedidout', fr: 'Mah yédidout', slice: 'EHCH', from: 50, to: 62, he: 'מה ידידות' },
        { id: 'zem-mah-yafit', fr: 'Mah yafit', slice: 'EV', from: 12, to: 13, he: 'מה יפית' },
        { id: 'zem-yom-chabbat-kodech', fr: 'Yom Chabbat Kodech hou', slice: 'EV', from: 14, to: 15, he: 'יום שבת קודש הוא' },
        { id: 'zem-yah-ribon', fr: 'Yah ribon \'olam', slice: 'EV', from: 16, to: 26, he: 'יה רבון עלם' },
        { id: 'zem-yom-ze-leyisrael', fr: 'Yom zé léYisraël', slice: 'EV', from: 27, to: 50, he: 'יום זה לישראל' },
        { id: 'zem-tsama-nafchi', fr: 'Tsama nafchi', slice: 'EV', from: 51, to: 77, he: 'צמאה נפשי' },
        { id: 'zem-yah-ekhsof', fr: 'Yah ekhsof noam Chabbat', slice: 'EV', from: 88, to: 121, he: 'יה אכסוף נעם שבת' },
        { id: 'zem-ode-lael', fr: 'Odé laEl', slice: 'EV', from: 122, to: 144, he: 'אודה לאל לבב חוקר' },
        { id: 'zem-bar-yohai', fr: 'Bar Yo\'haï', slice: 'EHCH', from: 1, to: 15, he: 'בר יוחאי' },
        { id: 'zem-yodoukha', fr: 'Yodoukha ra\'ayonaï', slice: 'EHCH', from: 63, to: 69, he: 'יודוך רעיוני' },
        { id: 'zem-al-ahavatekha', fr: '\'Al ahavatékha', slice: 'EHCH', from: 32, to: 42, he: 'על אהבתך' },
        { id: 'zem-yom-hachabbat', fr: 'Yom haChabbat', slice: 'EHCH', from: 79, to: 85, he: 'יום השבת' },
        { id: 'zem-tsour-michelo', fr: 'Tsour michélo akhalnou', slice: 'EHCH', from: 86, to: 92, he: 'צור משלו אכלנו' },
        // Chabbat matin
        { id: 'zem-baroukh-adonai-yom-yom', fr: 'Baroukh Adonaï yom yom', slice: 'DAY', from: 0, to: 13, he: 'ברוך אדני יום יום' },
        { id: 'zem-baroukh-el-elyon', fr: 'Baroukh El \'Elyon', slice: 'EHCH', from: 70, to: 78, he: 'ברוך אל עליון' },
        { id: 'zem-yom-ze-mekhouvad', fr: 'Yom zé mékhouvad', slice: 'DAY', from: 22, to: 28, he: 'יום זה מכבד' },
        { id: 'zem-yom-chabbaton', fr: 'Yom chabbaton', slice: 'EHCH', from: 43, to: 49, he: 'יום שבתון' },
        { id: 'zem-ki-echmera', fr: 'Ki échmera Chabbat', slice: 'EHCH', from: 16, to: 23, he: 'כי אשמרה שבת' },
        { id: 'zem-chamrou-chabbetotai', fr: 'Chamrou chabbetotaï', slice: 'DAY', from: 42, to: 47, he: 'שמרו שבתותי' },
        { id: 'zem-dror-yikra', fr: 'Dror yikra', slice: 'EHCH', from: 24, to: 31, he: 'דרור יקרא' },
        { id: 'zem-chabbat-hayom', fr: 'Chabbat hayom laAdonaï', slice: 'DAY', from: 54, to: 59, he: 'שבת היום ליהוה' },
        // troisième repas
        { id: 'zem-yedid-nefech', fr: 'Yédid néfech', slice: 'THIRD', from: 22, to: 26, he: 'ידיד נפש' },
        { id: 'zem-el-mistater', fr: 'El mistater bichfir \'havion', slice: 'THIRD', from: 41, to: 52, he: 'אל מסתתר בשפריר חביון' },
        // samedi soir
        { id: 'zem-hamavdil', fr: 'Hamavdil bein kodech lé\'hol', slice: 'EHMO', from: 1, to: 15, he: 'המבדיל בין קדש לחול' },
        { id: 'zem-amar-adonai-leyaakov', fr: 'Amar Adonaï léYa\'akov', slice: 'EHMO', from: 16, to: 23, he: 'אמר יהוה ליעקב' },
        { id: 'zem-el-eliyahou', fr: 'El Eliyahou', slice: 'EHMO', from: 24, to: 30, he: 'אל אליהו' },
        { id: 'zem-al-bayit-ze', fr: '\'Al bayit zé', slice: 'EHMO', from: 31, to: 40, he: 'על בית זה ויושביהו' },
        { id: 'zem-bamotsaei-yom-menoucha', fr: 'Bamotsaé yom ménou\'ha', slice: 'EHMO', from: 41, to: 53, he: 'במוצאי יום מנוחה' },
        { id: 'zem-lener-oulevessamim', fr: 'Lener oulevessamim', slice: 'EHMO', from: 54, to: 60, he: 'לנר ולבשמים' },
        { id: 'zem-chadech-sassoni', fr: 'Chadech sasoni', slice: 'MEL', from: 5, to: 6, he: 'חדש ששוני' },
        { id: 'zem-aguil-veesmah', fr: 'Aguil véesmah', slice: 'MEL', from: 7, to: 8, he: 'אגיל ואשמח' },
        { id: 'zem-elohim-yassadenou', fr: 'Élohim yis\'adénou', slice: 'MEL', from: 9, to: 10, he: 'אלהים יסעדנו' },
        { id: 'zem-eli-hich-goali', fr: 'Éli \'hich goali', slice: 'MEL', from: 11, to: 20, he: 'אלי חיש גואלי' },
        { id: 'zem-eliyahou-hanavi', fr: 'Eliyahou hanavi', slice: 'MEL', from: 46, to: 65, he: 'אליהו הנביא' }
    ] },
    // --- Étape 2 : fêtes, Pourim, jeûnes ---
    { id: 'regalim', fr: 'Les trois fêtes (Pessa\'h, Chavouot, Souccot)', sections: [
        ['regalim-priere', 'Prière des trois fêtes', ['Prayers for Three Festivals', 'Prayers for Three Festivals']],
        ['regalim-mizmor-pessah', 'Mizmor de Pessa\'h', ['Prayers for Three Festivals', 'Song for Passover']],
        ['regalim-mizmor-chavouot', 'Mizmor de Chavouot', ['Prayers for Three Festivals', 'Song for Shavuot']],
        ['regalim-mizmor-souccot', 'Mizmor de Souccot', ['Prayers for Three Festivals', 'Song for Sukkot']],
        ['regalim-mizmor-chemini', 'Mizmor de Chémini Atséret', ['Prayers for Three Festivals', 'Song for Shemini Atzeret']],
        ['regalim-amida', 'Amida des trois fêtes', ['Prayers for Three Festivals', 'Amidah']],
        ['regalim-moussaf', 'Moussaf des trois fêtes', ['Prayers for Three Festivals', 'Mussaf']]
    ] },
    // `extend` : on ajoute à un groupe existant (avant `before` si précisé) au lieu de le remplacer.
    { id: 'temps', extend: true, sections: [
        { id: 'pourim-zakhor', fr: 'Chabbat Zakhor', names: ['Purim', 'Shabbat Zachor'], before: 'pourim-meguila' },
        // --- Chants de Hanouka et de Pourim (Siddur Sefard, Torat Emet 357, domaine public) ---
        { id: 'hanouka-maoz-tsour', fr: 'Maoz Tsour (chant de Hanouka)', slice: 'HANOUKA', from: 12, to: 19, he: 'מעוז צור ישועתי', after: 'hanouka-allumage' },
        { id: 'hanouka-zemer-chabbat', fr: 'Zémer de Chabbat Hanouka', slice: 'HANOUKA_ZEMER', from: 0, to: 10, noTitle: true, after: 'hanouka-chacharit' },
        { id: 'pourim-chochanat-yaakov', fr: 'Chochanat Ya\'akov (après la Méguila)', slice: 'POURIM_MEGUILA', from: 19, to: 49, he: 'שושנת יעקב', after: 'pourim-meguila' },
        { id: 'pourim-qerovets', fr: 'Qerovets de Pourim (nusach Sefard)', slice: 'POURIM_QEROVETS', from: 0, to: 63, noTitle: true, after: 'pourim-jour' }
    ] },
    { id: 'jeunes', extend: true, sections: [
        { id: 'selihot-generales', fr: 'Séli\'hot (Elloul et dix jours de pénitence)', book: 'Selichot Edot HaMizrach', version: 'hebrew|Selichot Edot HaMizrach - Torat Emet', he: 'סליחות נוסח עדות המזרח' }
    ] }
];

// Le moment de chaque chant du recueil (onglet de l'écran) : soir = vendredi soir, matin = samedi matin, apres-midi = samedi après-midi (troisième repas), motsei = samedi soir.
// Les chants que l'édition d'Edot HaMizrach range sous « Chabbat soir » et le chant après le repas (Tsour michélo) sont avec le vendredi soir.
const ZEM_TABS = {
    matin: ['zem-baroukh-adonai-yom-yom', 'zem-baroukh-el-elyon', 'zem-yom-ze-mekhouvad', 'zem-yom-chabbaton', 'zem-ki-echmera', 'zem-chamrou-chabbetotai', 'zem-dror-yikra', 'zem-chabbat-hayom'],
    'apres-midi': ['zem-yedid-nefech', 'zem-el-mistater'],
    motsei: ['zem-hamavdil', 'zem-amar-adonai-leyaakov', 'zem-el-eliyahou', 'zem-al-bayit-ze', 'zem-bamotsaei-yom-menoucha', 'zem-lener-oulevessamim', 'zem-chadech-sassoni', 'zem-aguil-veesmah', 'zem-elohim-yassadenou', 'zem-eli-hich-goali', 'zem-eliyahou-hanavi']
};
function zemTab(id) {
    if (!/^zem-/.test(id)) return undefined;
    return Object.keys(ZEM_TABS).filter(k => ZEM_TABS[k].indexOf(id) !== -1)[0] || 'soir';
}

// Traductions françaises et paratextes des zemirot (scripts/zemirot-fr.json : { id: { about: {auteur, contexte, sens}, tr: { indice du segment: texte } } }).
// `about` entre dans le fichier de la section ; `tr` devient data/siddur/fr/<id>.json, rattaché à chaque segment par son empreinte (SiddurCore.fingerprint).
const SiddurCore = require('../js/siddurCore.js');
let ZEM_FR = {};
try { ZEM_FR = JSON.parse(fs.readFileSync(path.join(__dirname, 'zemirot-fr.json'), 'utf8')); } catch (e) { /* pas de traductions */ }
const frCounts = {};

function writeFr(id, segments) {
    const entry = ZEM_FR[id];
    if (!entry || !entry.tr) return;
    const t = {};
    Object.keys(entry.tr).forEach(k => {
        const i = Number(k);
        if (!(i >= 1 && i < segments.length)) throw new Error(id + ' : traduction pour un segment qui n\'existe pas (' + k + ' / ' + segments.length + ')');
        t[k] = [SiddurCore.fingerprint(segments[i]), entry.tr[k]];
    });
    fs.mkdirSync(path.join(DIR, 'fr'), { recursive: true });
    fs.writeFileSync(path.join(DIR, 'fr', id + '.json'), JSON.stringify({ v: 1, id: id, t: t }) + '\n');
    frCounts[id] = Object.keys(t).length;
}

const REMOVED = ['chabbat-chirei', 'chabbat-chants-motsei', 'tichabav-eikha', 'zem-kol-chomer-chabbat'];

async function getJson(url) {
    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('http ' + res.status);
            return await res.json();
        } catch (e) {
            if (attempt === 4) throw e;
            await new Promise(r => setTimeout(r, 800 * attempt));
        }
    }
}

function titleOf(node, lang) {
    const t = (node.titles || []).filter(x => x.lang === lang && x.primary)[0];
    return t ? t.text.trim() : '';
}

// Les titres hébreux de chaque nœud, par chemin anglais.
function hebrewTitles(schema) {
    const out = {};
    (function walk(node, names, hes) {
        if (node.nodes) node.nodes.forEach(k => walk(k, names.concat(titleOf(k, 'en')), hes.concat(titleOf(k, 'he'))));
        else out[names.join('|')] = hes;
    })({ nodes: schema.nodes }, [], []);
    return out;
}

function flatten(x) { return Array.isArray(x) ? x.reduce((a, y) => a.concat(flatten(y)), []) : [x]; }
function clean(s) { return String(s).replace(/ {2,}/g, ' ').trim(); }

// Les numéros de versets en lettres hébraïques (1 → א, 15 → טו, 66 → סו).
function hebrewNumeral(n) {
    const U = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], T = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    if (n === 15) return 'טו';
    if (n === 16) return 'טז';
    return T[Math.floor(n / 10)] + U[n % 10];
}

// Méguilat Eikha : un chapitre = un titre, puis un segment par verset précédé de son numéro. Texte : Tanach with Nikkud (Sefaria, domaine public).
function eikhaSegments(chapters) {
    const out = ['<big><b>מגילת איכה</b></big>'];
    chapters.forEach((verses, c) => {
        out.push('<b>פרק ' + hebrewNumeral(c + 1) + '</b>');
        verses.forEach((v, i) => out.push('<small>' + hebrewNumeral(i + 1) + '</small> ' + clean(String(v).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' '))));
    });
    return out;
}

async function fetchSection(spec, hebrew) {
    // [id, fr, chemin Sefaria dans le siddour d'Edot HaMizrach]  ou  { id, fr, book, version, he, transform } pour un autre livre
    if (Array.isArray(spec)) {
        const [id, fr, names] = spec;
        const hes = hebrew[names.join('|')];
        if (!hes) throw new Error('chemin inconnu sur Sefaria : ' + names.join('|'));
        return fetchText({ id: id, fr: fr, ref: BOOK + ', ' + names.join(', '), version: VERSION, he: hes.length > 1 ? hes[0] + ' › ' + hes[hes.length - 1] : hes[0] });
    }
    if (spec.slice) return fetchSlice(spec);
    if (spec.names) {
        const hes = hebrew[spec.names.join('|')];
        if (!hes) throw new Error('chemin inconnu sur Sefaria : ' + spec.names.join('|'));
        return fetchText({ id: spec.id, fr: spec.fr, ref: BOOK + ', ' + spec.names.join(', '), version: VERSION, he: hes.length > 1 ? hes[0] + ' › ' + hes[hes.length - 1] : hes[0] });
    }
    return fetchText({ id: spec.id, fr: spec.fr, ref: spec.book, version: spec.version, he: spec.he, transform: spec.transform });
}

// Une tranche [from, to] (inclus) d'un texte source : un chant. Un titre hébreu est ajouté en tête (sauf `noTitle`) ; le texte lui-même n'est pas retouché.
async function fetchSlice(spec) {
    const ref = SLICE_SOURCES[spec.slice];
    if (!ref) throw new Error('source inconnue : ' + spec.slice);
    if (!sliceCache[ref]) {
        const data = await getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref) + '?version=' + encodeURIComponent(ref.indexOf('Edot HaMizrach') !== -1 ? VERSION : VERSION) + '&return_format=default');
        const version = (data.versions || [])[0];
        if (!version || !version.text) throw new Error('texte absent : ' + ref);
        sliceCache[ref] = flatten(version.text).map(x => String(x).replace(/ {2,}/g, ' ').trim());
    }
    const all = sliceCache[ref];
    if (spec.to >= all.length) throw new Error(spec.id + ' : tranche hors du texte (' + spec.to + ' / ' + all.length + ')');
    const part = all.slice(spec.from, spec.to + 1).filter(x => x.length);
    const segments = spec.noTitle ? part : ['<big><b>' + spec.he + '</b></big>'].concat(part);
    const he = spec.noTitle ? (part[0] || '').replace(/<[^>]+>/g, '').trim() : spec.he;
    const about = ZEM_FR[spec.id] && ZEM_FR[spec.id].about;
    const doc = { v: 1, id: spec.id, he: he, fr: spec.fr, ref: ref + ' [' + spec.from + '–' + spec.to + ']', segments: segments };
    if (about) doc.about = about;
    fs.writeFileSync(path.join(DIR, spec.id + '.json'), JSON.stringify(doc) + '\n');
    writeFr(spec.id, segments);
    console.log(spec.id.padEnd(30), String(segments.length).padStart(4), 'segments');
    return { id: spec.id, he: he, fr: spec.fr, segments: segments.length, tab: zemTab(spec.id) };
}

async function fetchText(s) {
    const data = await getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(s.ref) + '?version=' + encodeURIComponent(s.version) + '&return_format=default');
    const version = (data.versions || [])[0];
    if (!version || !version.text) throw new Error('texte absent : ' + s.ref);
    const segments = s.transform === 'eikha' ? eikhaSegments(version.text) : flatten(version.text).map(clean).filter(x => x.length);
    fs.writeFileSync(path.join(DIR, s.id + '.json'), JSON.stringify({ v: 1, id: s.id, he: s.he, fr: s.fr, ref: s.ref, segments: segments }) + '\n');
    console.log(s.id.padEnd(28), String(segments.length).padStart(4), 'segments');
    return { id: s.id, he: s.he, fr: s.fr, segments: segments.length, tab: zemTab(s.id) };
}

async function main() {
    const index = await getJson('https://www.sefaria.org/api/v2/raw/index/' + encodeURIComponent(BOOK.replace(/ /g, '_')));
    const hebrew = hebrewTitles(index.schema);
    const siddur = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
    let written = 0;
    for (const group of GROUPS) {
        const fetched = [];
        for (const spec of group.sections) { fetched.push({ spec: spec, entry: await fetchSection(spec, hebrew) }); written++; }
        const at = siddur.groups.findIndex(g => g.id === group.id);
        if (group.extend) {
            if (at === -1) throw new Error('groupe à étendre introuvable : ' + group.id);
            const sections = siddur.groups[at].sections;
            fetched.forEach(({ spec, entry }) => {
                const same = sections.findIndex(x => x.id === entry.id);
                if (same !== -1) { sections[same] = entry; return; }
                const before = !Array.isArray(spec) && spec.before ? sections.findIndex(x => x.id === spec.before) : -1;
                const after = !Array.isArray(spec) && spec.after ? sections.findIndex(x => x.id === spec.after) : -1;
                if (before !== -1) sections.splice(before, 0, entry);
                else if (after !== -1) sections.splice(after + 1, 0, entry);
                else sections.push(entry);
            });
        } else {
            const entry = { id: group.id, fr: group.fr, sections: fetched.map(f => f.entry) };
            if (at === -1) siddur.groups.push(entry); else siddur.groups[at] = entry;
        }
    }
    // Sections retirées : leur texte est ailleurs (les chants sont dans le recueil ; l'Eikha est dans le Tanakh).
    REMOVED.forEach(id => {
        siddur.groups.forEach(g => { g.sections = g.sections.filter(x => x.id !== id); });
        try { fs.unlinkSync(path.join(DIR, id + '.json')); } catch (e) { /* déjà retirée */ }
    });
    fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(siddur));
    // l'index des traductions (le téléchargement pour la lecture hors réseau en dépend)
    const frIndexPath = path.join(DIR, 'fr', 'index.json');
    const frIndex = JSON.parse(fs.readFileSync(frIndexPath, 'utf8'));
    Object.keys(frCounts).forEach(id => { frIndex.sections[id] = frCounts[id]; });
    fs.writeFileSync(frIndexPath, JSON.stringify(frIndex));
    console.log(written + ' sections écrites.');
}

main().catch(e => { console.error(e); process.exit(1); });
