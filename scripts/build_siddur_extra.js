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

async function main() {
    const index = await getJson('https://www.sefaria.org/api/v2/raw/index/' + encodeURIComponent(BOOK.replace(/ /g, '_')));
    const hebrew = hebrewTitles(index.schema);
    const siddur = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
    let written = 0;
    for (const group of GROUPS) {
        const entry = { id: group.id, fr: group.fr, sections: [] };
        for (const [id, fr, names] of group.sections) {
            const key = names.join('|');
            const hes = hebrew[key];
            if (!hes) throw new Error('chemin inconnu sur Sefaria : ' + key);
            const ref = BOOK + ', ' + names.join(', ');
            const data = await getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref) + '?version=' + encodeURIComponent(VERSION) + '&return_format=default');
            const version = (data.versions || [])[0];
            if (!version || !version.text) throw new Error('texte absent : ' + ref);
            const segments = flatten(version.text).map(clean).filter(s => s.length);
            // le titre hébreu : « groupe › section » pour une section rangée dans un groupe de Sefaria, le titre seul sinon
            const he = hes.length > 1 ? hes[0] + ' › ' + hes[hes.length - 1] : hes[0];
            fs.writeFileSync(path.join(DIR, id + '.json'), JSON.stringify({ v: 1, id: id, he: he, fr: fr, ref: ref, segments: segments }) + '\n');
            entry.sections.push({ id: id, he: he, fr: fr, segments: segments.length });
            written++;
            console.log(id.padEnd(28), String(segments.length).padStart(4), 'segments');
        }
        const at = siddur.groups.findIndex(g => g.id === group.id);
        if (at === -1) siddur.groups.push(entry); else siddur.groups[at] = entry;
    }
    fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(siddur));
    console.log(written + ' sections écrites.');
}

main().catch(e => { console.error(e); process.exit(1); });
