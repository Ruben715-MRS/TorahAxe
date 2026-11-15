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
        ['chabbat-zohar-seouda-1', 'Zohar du premier repas', ['Shabbat Evening', 'Zohar']],
        ['chabbat-chirei', 'Chants de Chabbat', ['Shabbat Evening', 'Songs for Shabbat']]
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
        ['chabbat-chants-motsei', 'Cantiques du samedi soir', ['Havdalah', 'Motzei Shabbat Songs']],
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
        { id: 'pourim-zakhor', fr: 'Chabbat Zakhor', names: ['Purim', 'Shabbat Zachor'], before: 'pourim-meguila' }
    ] },
    { id: 'jeunes', extend: true, sections: [
        { id: 'selihot-generales', fr: 'Séli\'hot (Elloul et dix jours de pénitence)', book: 'Selichot Edot HaMizrach', version: 'hebrew|Selichot Edot HaMizrach - Torat Emet', he: 'סליחות נוסח עדות המזרח' },
        { id: 'tichabav-eikha', fr: 'Méguilat Eikha (Tich\'a beAv)', book: 'Lamentations', version: 'hebrew|Tanach with Nikkud', he: 'מגילת איכה', transform: 'eikha' }
    ] }
];

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
    if (spec.names) {
        const hes = hebrew[spec.names.join('|')];
        if (!hes) throw new Error('chemin inconnu sur Sefaria : ' + spec.names.join('|'));
        return fetchText({ id: spec.id, fr: spec.fr, ref: BOOK + ', ' + spec.names.join(', '), version: VERSION, he: hes.length > 1 ? hes[0] + ' › ' + hes[hes.length - 1] : hes[0] });
    }
    return fetchText({ id: spec.id, fr: spec.fr, ref: spec.book, version: spec.version, he: spec.he, transform: spec.transform });
}

async function fetchText(s) {
    const data = await getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(s.ref) + '?version=' + encodeURIComponent(s.version) + '&return_format=default');
    const version = (data.versions || [])[0];
    if (!version || !version.text) throw new Error('texte absent : ' + s.ref);
    const segments = s.transform === 'eikha' ? eikhaSegments(version.text) : flatten(version.text).map(clean).filter(x => x.length);
    fs.writeFileSync(path.join(DIR, s.id + '.json'), JSON.stringify({ v: 1, id: s.id, he: s.he, fr: s.fr, ref: s.ref, segments: segments }) + '\n');
    console.log(s.id.padEnd(28), String(segments.length).padStart(4), 'segments');
    return { id: s.id, he: s.he, fr: s.fr, segments: segments.length };
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
                if (before !== -1) sections.splice(before, 0, entry); else sections.push(entry);
            });
        } else {
            const entry = { id: group.id, fr: group.fr, sections: fetched.map(f => f.entry) };
            if (at === -1) siddur.groups.push(entry); else siddur.groups[at] = entry;
        }
    }
    fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(siddur));
    console.log(written + ' sections écrites.');
}

main().catch(e => { console.error(e); process.exit(1); });
