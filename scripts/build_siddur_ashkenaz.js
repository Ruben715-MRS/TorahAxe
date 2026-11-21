// Construit le siddour ashkénaze (nusach Ashkenaz) : Sefaria « Siddur Ashkenaz », texte hébreu vocalisé de la Metsudah (1981, CC-BY),
// à défaut Daat Siddur Ashkenaz (domaine public). Écrit data/siddur/ashkenaz/index.json et une section par fichier.
// L'application l'utilise à la place du siddour d'Edot HaMizrach quand le rite choisi est ashkénaze (js/app/siddur.js, sdBase).
// Les textes que ce siddour n'a pas (zemirot, Pourim, mariage…) sont repris du siddour d'Edot HaMizrach par scripts/merge_siddur_fallback.js.
// Usage : NODE_USE_ENV_PROXY=1 node scripts/build_siddur_ashkenaz.js   (derrière un proxy ; sinon sans la variable). Idempotent.
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'data', 'siddur', 'ashkenaz');
const BOOK = 'Siddur Ashkenaz';
const VERSIONS = ['hebrew|The Metsudah siddur, 1981', 'hebrew|Daat Siddur Ashkenaz', 'hebrew|Torat Emet 357', 'hebrew'];
// Quelques textes n'ont pas de version propre à leur place dans Sefaria : on prend le même texte ailleurs dans le livre (identique mot pour mot).
const ALIAS = {
    'Shabbat/Shacharit/Amidah/Holiness of God': 'Weekday/Shacharit/Amidah/Holiness of God',
    'Shabbat/Shacharit/Pesukei Dezimra/Mizmor Letoda': 'Weekday/Shacharit/Pesukei Dezimra/Mizmor Letoda',
    'Weekday/Minchah/Post Amidah/Vidui and 13 Middot': 'Weekday/Shacharit/Post Amidah/Vidui and 13 Middot'
};

// Groupes : identifiant → nom français (les identifiants sont ceux des rayons de js/app/siddur.js)
const GROUPS = {
    'reveil': 'Au réveil', 'chacharit': 'Chaharit (jours de semaine)', 'minha': 'Minha (jours de semaine)', 'arvit': 'Arvit (jours de semaine)',
    'rituels': 'Omer, lune, coucher', 'repas': 'Après les repas et bénédictions',
    'chabbat-accueil': 'Accueil de Chabbat', 'chabbat-arvit': 'Arvit du vendredi soir', 'chabbat-soir': 'Kiddouch et repas du vendredi soir',
    'chabbat-chacharit': 'Cha\'harit du Chabbat', 'chabbat-moussaf': 'Moussaf du Chabbat', 'chabbat-seouda-2': 'Kiddouch et repas du matin',
    'chabbat-minha': 'Min\'ha du Chabbat', 'chabbat-seouda-3': 'Troisième repas', 'motsei-chabbat': 'Havdala et samedi soir',
    'roch-hodech': 'Roch \'Hodesh', 'regalim': 'Les trois fêtes (Pessa\'h, Chavouot, Souccot)', 'hol-hamoed': '\'Hol haMoed (Pessah, Souccot)',
    'temps': 'Hanouka, Pourim, Nissan', 'jeunes': 'Jeûnes et deuil', 'divers': 'Bénédictions et prières diverses'
};
// [groupe, identifiant, titre français, [parties], titre hébreu facultatif]
// Une partie : 'Chemin/du/nœud' (tous les textes dessous) ou 'Chemin/du/parent#Premier..Dernier' (suite de textes consécutifs).
const W = 'Weekday/', S = 'Shabbat/', F = 'Festivals/';
const PREP = W + 'Shacharit/Preparatory Prayers', SPREP = S + 'Shacharit/Preparatory Prayers';
const SECTIONS = [
    ['reveil', 'reveil-debut', 'Modé ani, ablution, bénédictions de la Torah', [PREP + '#Modeh Ani..Torah Study'], 'השכמת הבוקר'],
    ['chacharit', 'chacharit-talit-tefilin', 'Talit et téfilin', [PREP + '#Tallit..Tefillin'], 'טלית ותפילין'],
    ['chacharit', 'chacharit-debut', 'Prière du matin (Ma tovou, Adon Olam, Akéda…)', [PREP + '#Ma Tovu..Sovereignty of Heaven'], 'תפילת שחרית'],
    ['chacharit', 'chacharit-ketoret', 'Qorbanot (les offrandes)', [PREP + '/Korbanot'], 'קרבנות'],
    ['chacharit', 'chacharit-pessoukei', 'Pessoukei dézimra', [W + 'Shacharit/Pesukei Dezimra']],
    ['chacharit', 'chacharit-chema', 'Chéma et ses bénédictions', [W + 'Shacharit/Blessings of the Shema']],
    ['chacharit', 'chacharit-amida', 'Amida', [W + 'Shacharit/Amidah']],
    ['chacharit', 'chacharit-vidoui', 'Vidouï, Avinou Malkénou et Tahanoun', [W + 'Shacharit/Post Amidah'], 'וידוי ותחנון'],
    ['chacharit', 'chacharit-tora', 'Lecture de la Torah', [W + 'Shacharit/Torah Reading']],
    ['chacharit', 'chacharit-fin', 'Achré, Ouva lé-Tsion, Alénou, psaume du jour', [W + 'Shacharit/Concluding Prayers'], 'סיום שחרית'],
    ['chacharit', 'chacharit-apres', 'Six souvenirs, Dix commandements, Treize principes', [W + 'Shacharit/Post Service'], 'אחרי התפילה'],
    ['minha', 'minha-achre', 'Achré', [W + 'Minchah/Ashrei']],
    ['minha', 'minha-amida', 'Amida', [W + 'Minchah/Amida']],
    ['minha', 'minha-vidoui', 'Vidouï, Avinou Malkénou et Tahanoun', [W + 'Minchah/Post Amidah'], 'וידוי ותחנון'],
    ['minha', 'minha-alenou', 'Alénou', [W + 'Minchah/Concluding Prayers']],
    ['arvit', 'arvit-chema', 'Chéma et ses bénédictions', [W + 'Maariv#Vehu Rachum..Barchu', W + 'Maariv/Blessings of the Shema'], 'ק"ש וברכותיה'],
    ['arvit', 'arvit-amida', 'Amida', [W + 'Maariv/Amidah', W + 'Maariv#Kaddish Shalem..Kaddish Shalem'], 'עמידה'],
    ['arvit', 'arvit-alenou', 'Alénou et fin de l\'office', [W + 'Maariv#Alenu..LeDavid'], 'עלינו'],
    ['rituels', 'omer', 'Sefirat haOmer (le compte de l\'Omer)', [W + 'Maariv/Sefirat HaOmer']],
    ['rituels', 'birkat-halevana', 'Birkat haLévana (la bénédiction de la lune)', [W + 'Maariv/Birkat HaLevana']],
    ['rituels', 'chema-coucher', 'Chéma du coucher', [W + 'Maariv/Keri\'at Shema al Hamita']],
    ['chabbat-accueil', 'chabbat-kabbalat', 'Kabbalat Chabbat', [S + 'Kabbalat Shabbat'], 'קבלת שבת'],
    ['chabbat-arvit', 'chabbat-arvit-chema', 'Chéma et ses bénédictions', [S + 'Maariv#Barchu..Half Kaddish'], 'ק"ש וברכותיה'],
    ['chabbat-arvit', 'chabbat-arvit-magen-avot', 'Amida, Vaykhoulou, Magen Avot', [S + 'Maariv/Amidah', S + 'Maariv#Vay\'chulu..Kaddish Shalem'], 'עמידה'],
    ['chabbat-arvit', 'chabbat-arvit-alenou', 'Alénou et fin de l\'office', [S + 'Maariv#Sefirat HaOmer..Adon Olam'], 'עלינו'],
    ['chabbat-soir', 'chabbat-bracha-banim', 'Bénédiction des enfants', [S + 'Shabbat Evening/Blessing the Children']],
    ['chabbat-soir', 'chabbat-chalom-alekhem', 'Chalom Alékhem', [S + 'Shabbat Evening/Shalom Aleichem']],
    ['chabbat-soir', 'chabbat-kiddouch-soir', 'Kiddouch du vendredi soir', [S + 'Shabbat Evening/Kiddush']],
    ['chabbat-soir', 'chabbat-echet-hayil', 'Ribon kol haolamim et Echet \'Hayil', [S + 'Shabbat Evening#Ribon Kol HaOlamim..Eshet Chayil'], 'אשת חיל']
    ,
    ['chabbat-chacharit', 'chabbat-ch-debut', 'Prière du matin', [SPREP]],
    ['chabbat-chacharit', 'chabbat-ch-pessoukei', 'Pessoukei dézimra', [S + 'Shacharit/Pesukei Dezimra']],
    ['chabbat-chacharit', 'chabbat-ch-chema', 'Chéma et ses bénédictions', [S + 'Shacharit/Blessings of the Shema']],
    ['chabbat-chacharit', 'chabbat-ch-amida', 'Amida', [S + 'Shacharit/Amidah']],
    ['chabbat-chacharit', 'chabbat-ch-tora', 'Lecture de la Torah', [S + 'Shacharit/Torah Reading']],
    ['chabbat-chacharit', 'chabbat-ch-priere-communaute', 'Prières pour la communauté', [S + 'Shacharit/Communal Prayers'], 'תפילות לציבור'],
    ['chabbat-chacharit', 'chabbat-ch-achre', 'Achré et fin de la lecture', [S + 'Shacharit#Ashrei..Half Kaddish'], 'אשרי'],
    ['chabbat-moussaf', 'chabbat-mo-amida', 'Amida de Moussaf', [S + 'Musaf LeShabbat/Amidah']],
    ['chabbat-moussaf', 'chabbat-mo-fin', 'Ein kéloheinou, Alénou, chants de fin', [S + 'Musaf LeShabbat#Kaddish Shalem..Adon Olam'], 'סיום מוסף'],
    ['chabbat-seouda-2', 'chabbat-kiddouch-jour', 'Kiddouch du jour', [S + 'Daytime Meal/Kiddusha Rabba']],
    ['chabbat-minha', 'chabbat-mi-ouva-letsion', 'Achré, Ouva lé-Tsion', [S + 'Minchah#Ashrei..Half Kaddish'], 'אשרי ובא לציון'],
    ['chabbat-minha', 'chabbat-mi-tora', 'Lecture de la Torah', [S + 'Minchah/Torah Reading']],
    ['chabbat-minha', 'chabbat-mi-amida', 'Amida', [S + 'Minchah/Amidah']],
    ['chabbat-minha', 'chabbat-mi-fin', 'Tsidkatékha, Alénou, Barkhi nafchi', [S + 'Minchah#Tzidkatkhah Tzedek..Barchi Nafshi'], 'סיום מנחה'],
    ['chabbat-seouda-3', 'chabbat-seouda-3', 'Troisième repas de Chabbat', [S + 'Third Meal']],
    ['motsei-chabbat', 'chabbat-havdala', 'Havdala', [S + 'Havdalah']],
    ['motsei-chabbat', 'chabbat-veyiten-lekha', 'Vihi noam et Véyitén lékha', [W + 'Maariv/Additions for Motza\'ei Shabbat'], 'ויהי נועם'],
    ['roch-hodech', 'rh-hallel', 'Hallel', [F + 'Rosh Chodesh/Hallel']],
    ['roch-hodech', 'rh-moussaf', 'Moussaf de Roch \'Hodesh', [F + 'Rosh Chodesh/Musaf Amidah for Rosh Chodesh']],
    ['regalim', 'regalim-amida', 'Amida des trois fêtes', [F + 'Shalosh Regalim/Amida for Maariv, Shacharit, Mincha']],
    ['regalim', 'regalim-moussaf', 'Moussaf des trois fêtes', [F + 'Shalosh Regalim/Mussaf']],
    ['regalim', 'regalim-tal', 'Prière pour la rosée (Tal)', [F + 'Prayer for Dew']],
    ['regalim', 'regalim-guechem', 'Prière pour la pluie (Guéchem)', [F + 'Prayer for Rain']],
    ['hol-hamoed', 'souccot-soucca', 'Dans la soucca', [F + 'Sukkot/Prayers in the Sukkah']],
    ['hol-hamoed', 'souccot-loulav', 'Bénédiction du loulav', [F + 'Sukkot/Blessing on Lulav']],
    ['hol-hamoed', 'souccot-hochaanot', 'Hocha\'anot', [F + 'Sukkot/Hosha\'anot']],
    ['temps', 'hanouka-allumage', 'Hanouka : l\'allumage', [F + 'Chanukah/Service for Lighting Chanukah Candles']],
    ['jeunes', 'jeune-guedalia', 'Sélihot du jeûne de Guédalia', [F + 'Selichot/Fast of Gedalia']],
    ['jeunes', 'jeune-tevet', 'Sélihot du 10 Tévet', [F + 'Selichot/Ten of Tevet']],
    ['jeunes', 'jeune-esther', 'Sélihot du jeûne d\'Esther', [F + 'Selichot/Fast of Esther']],
    ['jeunes', 'jeune-tamouz', 'Sélihot du 17 Tamouz', [F + 'Selichot/Seventeen of Tamuz']],
    ['jeunes', 'selihot-yom-kippour-katan', 'Yom Kippour Katan', [F + 'Selichot/Yom Kippur Katan']],
    ['jeunes', 'selihot-bahab', 'Séli\'hot de Bahab', [F + 'Selichot/BaHaB']],
    ['repas', 'birkat-hamazon-ashkenaze', 'Birkat haMazon (nusach ashkénaze)', [ 'Berachot/Birkat HaMazon']],
    ['repas', 'al-hamihya-ashkenaze', 'Bérakha méeïn chalosh (nusach ashkénaze)', ['Berachot/Birkat Hanehenin/Eating/Brachot Achronot']],
    ['repas', 'birkhot-hanehenin', 'Birkhot haNéhénin (bénédictions de jouissance)', ['Berachot/Birkat Hanehenin/Eating/Barachot Rishonot', 'Berachot/Birkat Hanehenin/Blessings on Sights Sounds and Smells']],
    ['divers', 'birkhot-hamitsvot', 'Birkhot hamitsvot (bénédictions sur les commandements)', ['Berachot/Birkhot Hamitzvot']],
    ['divers', 'asher-yatsar-etchem', 'Acher yatsar (après les besoins)', ['Berachot/Asher Yatzar Etchem Badin']],
    ['divers', 'tefilat-haderekh', 'Tefilat haDérékh (la prière du voyageur)', ['Berachot/Tefillat HaDerech']],
    ['divers', 'havinenou', 'Havinénou', ['Berachot/Havinenu']],
    ['divers', 'qaddich', 'Les Qaddich', ['Kaddish']]
];

async function getJson(url) {
    for (let attempt = 1; attempt <= 8; attempt++) {
        try {
            const res = await fetch(url);
            if (res.status === 404 || res.status === 400) return null;
            if (!res.ok) throw new Error('http ' + res.status);
            return await res.json();
        } catch (e) {
            console.log('  retry', attempt, e.message, url.slice(60, 140)); if (attempt === 8) throw e;
            await new Promise(r => setTimeout(r, 4000 * attempt));
        }
    }
}
function flatten(x) { return Array.isArray(x) ? x.reduce((a, y) => a.concat(flatten(y)), []) : [x]; }
function clean(s) { return String(s).replace(/<\/?em>/g, '').replace(/ {2,}/g, ' ').trim(); }
function titleOf(n, lang) { const t = (n.titles || []).find(x => x.lang === lang && x.primary); return t ? t.text : (lang === 'en' ? n.title : ''); }
function tree(n) { return { en: titleOf(n, 'en'), he: titleOf(n, 'he'), kids: (n.nodes || []).map(tree), leaf: !n.nodes }; }
function find(node, p) { let cur = node; for (const t of p.split('/')) { cur = cur.kids.find(k => k.en === t); if (!cur) throw new Error('nœud absent : ' + p); } return cur; }
function leaves(node, trail) {
    if (node.leaf) return [{ trail: trail, node: node }];
    return node.kids.reduce((a, k) => a.concat(leaves(k, trail.concat(k.en))), []);
}
function resolve(root, part) {
    const [pp, range] = part.split('#');
    if (!range) { const n = find(root, pp); const base = pp.split('/'); return n.leaf ? [{ trail: base, node: n }] : leaves(n, base); }
    const parent = find(root, pp), base = pp.split('/');
    const [a, b] = range.split('..');
    const ia = parent.kids.findIndex(k => k.en === a), ib = parent.kids.findIndex(k => k.en === b);
    if (ia < 0 || ib < 0 || ib < ia) throw new Error('plage absente : ' + part);
    return parent.kids.slice(ia, ib + 1).reduce((acc, k) => acc.concat(k.leaf ? [{ trail: base.concat(k.en), node: k }] : leaves(k, base.concat(k.en))), []);
}
async function leafText(trail) {
    const alias = ALIAS[trail.join('/')];
    const ref = BOOK + ', ' + (alias ? alias.split('/') : trail).join(', ');
    for (const v of VERSIONS) {
        await new Promise(r => setTimeout(r, 1000));
        const d = await getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref) + '?version=' + encodeURIComponent(v) + '&return_format=default');
        const ver = d && (d.versions || [])[0];
        const segs = ver && ver.text ? flatten(ver.text).map(clean).filter(x => x.length) : [];
        if (segs.length) return { segs, version: v.replace('hebrew|', '') };
    }
    return null;
}

(async () => {
    fs.mkdirSync(DIR, { recursive: true });
    const idx = await getJson('https://www.sefaria.org/api/index/Siddur_Ashkenaz');
    const root = { en: '', he: '', kids: idx.schema.nodes.map(tree), leaf: false };
    const index = { v: 1, source: 'Sefaria : Siddur Ashkenaz, Metsudah 1981 (CC-BY) et Daat (domaine public)', edition: 'Siddur Ashkenaz', license: 'CC-BY / Public Domain', groups: [] };
    const missing = [];
    for (const [gid, id, fr, parts, heOpt] of SECTIONS) {
        const ls = parts.reduce((a, p) => a.concat(resolve(root, p)), []);
        const segments = [], versions = new Set();
        const he = heOpt || (ls.length ? parts[0].split('#')[0].split('/').pop() && find(root, parts[0].split('#')[0]).he : '');
        segments.push('<big><b>' + he + '</b></big>');
        for (const l of ls) {
            const r = await leafText(l.trail);
            if (!r) { missing.push(l.trail.join(' > ')); continue; }
            versions.add(r.version);
            if (ls.length > 1 && l.node.he) segments.push('<big><b>' + l.node.he + '</b></big>');
            segments.push.apply(segments, r.segs);
        }
        if (segments.length < 2) throw new Error('section vide : ' + id);
        const refs = parts.map(p => BOOK + ', ' + p.replace('#', ' : ').split('/').join(', ')).join(' ; ');
        fs.writeFileSync(path.join(DIR, id + '.json'), JSON.stringify({ v: 1, id, he, fr, ref: refs + ' — ' + Array.from(versions).join(', ') + ' (via Sefaria)', segments }) + '\n');
        let group = index.groups.find(g => g.id === gid);
        if (!group) { group = { id: gid, fr: GROUPS[gid], sections: [] }; index.groups.push(group); }
        group.sections.push({ id, he, fr, segments: segments.length });
        console.log(id.padEnd(32), String(segments.length).padStart(5), Array.from(versions).join('+'));
    }
    fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index));
    if (missing.length) console.log('TEXTES ABSENTS :', missing);
})().catch(e => { console.error(e); process.exit(1); });
