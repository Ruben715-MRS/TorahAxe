// Produit data/michna/ : la Michna (63 traités) en hébreu vocalisé et ses commentateurs, depuis Sefaria.
// Michna : version « Torat Emet 357 » (domaine public ; Bikkurim 1 à 3 : édition Romm, Vilna 1913, domaine public).
// Commentateurs (COMMENTATORS ci-dessous, dans l'ordre chronologique) : Rambam, Rash de Sens, Bartenura (CC-BY-NC), Melekhet Shelomoh,
// Tosafot Yom Tov, Gra (Eliyahu Rabba sur Tohorot, commentaire sur Avot) et Tiferet Yisraël (Yachin).
// Usage : NODE_USE_ENV_PROXY=1 node scripts/build_michna.js   (derrière un proxy ; sinon sans la variable)
// Fichiers : data/michna/<traité>.json = { v, id, chapters: [ chapitre → [ texte de chaque michna ] ] } ;
//   data/michna/<préfixe><traité>.json = { v, id, commentator, chapters: [ chapitre → [ michna → [commentaires] ] ] } ;
//   data/michna/counts-<traité>.json = { v, order, chapters: [ chapitre → [ masque ] ] } (quels commentateurs ont quelque chose à dire sur la michna :
//   le bit k du masque est celui de order[k] ; sert aux pastilles « 💬 n ») ;
//   data/michna/index.json : la liste des traités (ordre, nom hébreu et français, chapitres, michnayot, `comm` : les commentateurs qui le couvrent).
// Le texte n'est pas retouché : on retire les espaces en trop, les balises autres que <b> (mot commenté), <i> (citation) et <small> (variante)
// du commentaire, et toutes les balises de la Michna. Idempotent : relancer réécrit les mêmes fichiers.

const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'data', 'michna');

// Les six ordres, dans l'ordre de la tradition ; chaque traité : [id, titre Sefaria, hébreu, français].
const SEDARIM = [
    { id: 'zeraim', he: 'סדר זרעים', fr: 'Zeraïm', tractates: [
        ['berakhot', 'Berakhot', 'ברכות', 'Berakhot'], ['peah', 'Peah', 'פאה', 'Péa'], ['demai', 'Demai', 'דמאי', 'Demaï'],
        ['kilayim', 'Kilayim', 'כלאים', 'Kilayim'], ['sheviit', 'Sheviit', 'שביעית', 'Chevi’it'], ['terumot', 'Terumot', 'תרומות', 'Térouma'],
        ['maasrot', 'Maasrot', 'מעשרות', 'Maasserot'], ['maaser-sheni', 'Maaser Sheni', 'מעשר שני', 'Maasser Chéni'],
        ['challah', 'Challah', 'חלה', 'Halla'], ['orlah', 'Orlah', 'ערלה', 'Orla'], ['bikkurim', 'Bikkurim', 'ביכורים', 'Bikourim']] },
    { id: 'moed', he: 'סדר מועד', fr: 'Moëd', tractates: [
        ['shabbat', 'Shabbat', 'שבת', 'Chabbat'], ['eruvin', 'Eruvin', 'עירובין', 'Erouvin'], ['pesachim', 'Pesachim', 'פסחים', 'Pessahim'],
        ['shekalim', 'Shekalim', 'שקלים', 'Chekalim'], ['yoma', 'Yoma', 'יומא', 'Yoma'], ['sukkah', 'Sukkah', 'סוכה', 'Souccah'],
        ['beitzah', 'Beitzah', 'ביצה', 'Bétsa'], ['rosh-hashanah', 'Rosh Hashanah', 'ראש השנה', 'Roch Hachana'],
        ['taanit', 'Taanit', 'תענית', 'Ta’anit'], ['megillah', 'Megillah', 'מגילה', 'Méguila'], ['moed-katan', 'Moed Katan', 'מועד קטן', 'Moëd Katan'],
        ['chagigah', 'Chagigah', 'חגיגה', 'Haguiga']] },
    { id: 'nashim', he: 'סדר נשים', fr: 'Nachim', tractates: [
        ['yevamot', 'Yevamot', 'יבמות', 'Yevamot'], ['ketubot', 'Ketubot', 'כתובות', 'Ketoubot'], ['nedarim', 'Nedarim', 'נדרים', 'Nedarim'],
        ['nazir', 'Nazir', 'נזיר', 'Nazir'], ['sotah', 'Sotah', 'סוטה', 'Sota'], ['gittin', 'Gittin', 'גיטין', 'Guittin'],
        ['kiddushin', 'Kiddushin', 'קידושין', 'Kidouchin']] },
    { id: 'nezikin', he: 'סדר נזיקין', fr: 'Nezikin', tractates: [
        ['bava-kamma', 'Bava Kamma', 'בבא קמא', 'Bava Kama'], ['bava-metzia', 'Bava Metzia', 'בבא מציעא', 'Bava Metsia'],
        ['bava-batra', 'Bava Batra', 'בבא בתרא', 'Bava Batra'], ['sanhedrin', 'Sanhedrin', 'סנהדרין', 'Sanhédrin'], ['makkot', 'Makkot', 'מכות', 'Makkot'],
        ['shevuot', 'Shevuot', 'שבועות', 'Chevouot'], ['eduyot', 'Eduyot', 'עדויות', 'Édouyot'], ['avodah-zarah', 'Avodah Zarah', 'עבודה זרה', 'Avoda Zara'],
        ['avot', 'Pirkei Avot', 'אבות', 'Pirké Avot'], ['horayot', 'Horayot', 'הוריות', 'Horayot']] },
    { id: 'kodashim', he: 'סדר קדשים', fr: 'Kodachim', tractates: [
        ['zevachim', 'Zevachim', 'זבחים', 'Zevahim'], ['menachot', 'Menachot', 'מנחות', 'Menahot'], ['chullin', 'Chullin', 'חולין', 'Houlin'],
        ['bekhorot', 'Bekhorot', 'בכורות', 'Bekhorot'], ['arakhin', 'Arakhin', 'ערכין', 'Arakhin'], ['temurah', 'Temurah', 'תמורה', 'Temoura'],
        ['keritot', 'Keritot', 'כריתות', 'Keritot'], ['meilah', 'Meilah', 'מעילה', 'Méila'], ['tamid', 'Tamid', 'תמיד', 'Tamid'],
        ['middot', 'Middot', 'מידות', 'Midot'], ['kinnim', 'Kinnim', 'קינים', 'Kinim']] },
    { id: 'tohorot', he: 'סדר טהרות', fr: 'Tohorot', tractates: [
        ['kelim', 'Kelim', 'כלים', 'Kelim'], ['oholot', 'Oholot', 'אהלות', 'Ohalot'], ['negaim', 'Negaim', 'נגעים', 'Nega’im'],
        ['parah', 'Parah', 'פרה', 'Para'], ['tahorot', 'Tahorot', 'טהרות', 'Tohorot'], ['mikvaot', 'Mikvaot', 'מקוואות', 'Mikvaot'],
        ['niddah', 'Niddah', 'נידה', 'Nidda'], ['makhshirin', 'Makhshirin', 'מכשירין', 'Makhchirin'], ['zavim', 'Zavim', 'זבים', 'Zavim'],
        ['tevul-yom', 'Tevul Yom', 'טבול יום', 'Tevoul Yom'], ['yadayim', 'Yadayim', 'ידיים', 'Yadayim'], ['oktzin', 'Oktzin', 'עוקצין', 'Oktsin']] }
];

async function getJson(url) {
    let last;
    for (let i = 0; i < 5; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch (e) { last = e; await new Promise(r => setTimeout(r, 800 * (i + 1))); }
    }
    throw new Error(url + ' : ' + last.message);
}

const API = 'https://www.sefaria.org/api/v3/texts/';
const sefariaName = (title) => encodeURIComponent(title.replace(/ /g, '_'));
async function fetchText(title, version) {
    const d = await getJson(API + sefariaName(title) + '?version=' + encodeURIComponent(version));
    if (!d.versions || !d.versions[0]) throw new Error('pas de texte : ' + title);
    return d.versions[0].text;
}

// Les commentateurs, dans l'ordre chronologique d'affichage. `cat` : leur rubrique dans l'index de Sefaria (« Rishonim on Mishnah > Rambam »…) ;
// `prefix` : le préfixe de leurs fichiers. Les introductions (« Introduction ») et Ikar Tosafot Yom Tov ne sont pas retenus.
// Non disponibles sur Sefaria pour la Michna : Kehati, Saadia Gaon, Nathan Av Hayéchiva.
const COMMENTATORS = [
    { id: 'rambam', cat: 'Rambam', prefix: 'rambam-' },
    { id: 'rash', cat: 'Rash MiShantz', prefix: 'rash-' },
    { id: 'bartenura', cat: 'Bartenura', prefix: 'bartenura-' },
    { id: 'melekhet', cat: 'Melekhet Shelomoh', prefix: 'melekhet-' },
    { id: 'tosafot-yom-tov', cat: 'Tosafot Yom Tov', prefix: 'tyt-' },
    { id: 'gra', cat: 'Gra', prefix: 'gra-' },
    { id: 'tiferet-yisrael', cat: 'Yachin', prefix: 'tiferet-', flat: true }
];

// Si la version vocalisée a des chapitres vides (Bikkurim 1 à 3 chez Sefaria), ils viennent de l'édition Romm, Vilna 1913 (domaine public, sans voyelles).
const FALLBACK_VERSION = 'hebrew|Mishnah, ed. Romm, Vilna 1913';

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const cleanMishna = (s) => clean(String(s || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, ''));
// Le commentaire : seules <b>, <i> et <small> restent ; les sauts de ligne deviennent des espaces, les images et toute autre balise sont retirées.
const cleanComment = (s) => clean(String(s || '').replace(/<br\s*\/?>/g, ' ').replace(/<(?!\/?(?:b|i|small)>)[^>]*>/g, ''));

// Une clé qui rapproche « Mishnah Maaser Sheni », « Tosefot Yom Tov on Mishnah Peah » et « Pirkei Avot » : lettres seules, sans « mishnah », Avot unifié.
function keyOf(name) {
    const k = name.replace(/^.* on /, '').replace(/^Mishnah\s+/i, '').replace(/[^A-Za-z]/g, '').toLowerCase();
    return k === 'pirkeiavot' ? 'avot' : k;
}

// Tous les textes d'une mishna, quelle que soit la profondeur de la source : une liste de chaînes.
function leaves(x) {
    if (Array.isArray(x)) return x.reduce((a, y) => a.concat(leaves(y)), []);
    return typeof x === 'string' ? [x] : [];
}

async function loadMishnah(tr) {
    const mTitle = tr.sefaria === 'Pirkei Avot' ? tr.sefaria : 'Mishnah ' + tr.sefaria;
    const m = await fetchText(mTitle, 'hebrew');
    if (m.some(ch => !ch || !ch.length)) {
        const alt = await fetchText(mTitle, FALLBACK_VERSION).catch(() => []);
        m.forEach((ch, c) => { if ((!ch || !ch.length) && alt[c] && alt[c].length) m[c] = alt[c]; });
        console.log('  chapitres complétés (Romm) :', mTitle);
    }
    return m.map(ch => (ch || []).map(cleanMishna));
}

// Pour comparer un mot commenté au texte de la Michna : lettres hébraïques et espaces seulement, sans voyelles ni ponctuation.
const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\u05BE/g, ' ').replace(/[\u0591-\u05C7]/g, '').replace(/[^\u05D0-\u05EA\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Une source qui ne range pas ses passages par michna (Tiferet Yisraël : une suite de mots commentés le long du chapitre ; Rash sur Chevi'it 2) :
// chaque passage va sous la michna où son mot commenté (le premier <b>) se trouve en premier à partir de la michna précédente.
function spread(texts, entries) {
    const hay = texts.map(plain);
    const out = texts.map(() => []);
    let at = 0;    // la michna courante
    let pos = 0;   // où le dernier mot commenté a été trouvé dans la michna courante : les suivants viennent après, sinon on passe à la michna suivante
    entries.forEach(raw => {
        const m = /<b>(.*?)<\/b>/.exec(raw);
        const words = m ? plain(m[1]).split(' ').filter(Boolean) : [];
        for (const n of [3, 2, 1]) {
            if (words.length < n && n > 1) continue;
            const key = words.slice(0, n).join(' ');
            if (key.length < 3) continue;
            const limit = n === 1 ? Math.min(hay.length, at + 2) : hay.length;
            let found = false;
            for (let k = at; k < limit && !found; k++) {
                const j = hay[k].indexOf(key, k === at ? pos : 0);
                if (j >= 0) { at = k; pos = j; found = true; }
            }
            if (found) break;
        }
        out[at].push(cleanComment(raw));
    });
    return out;
}

// Les commentaires d'un traité alignés sur la Michna (même nombre de chapitres et de michnayot) ; null si la source n'a pas la forme chapitre → michna → commentaires.
// `flat` : la source range ses passages en suite le long du chapitre (voir spread) ; sinon, un chapitre qui a plus d'entrées que de michnayot est traité ainsi.
function align(structure, raw, title, flat) {
    let depth = 0;
    for (let x = raw; Array.isArray(x) && x.length; x = x[0]) depth++;
    if (depth < 2) { console.log('  forme inattendue, ignoré :', title); return null; }
    let extra = 0;
    const chapters = structure.map((mishnayot, c) => {
        const rawCh = raw[c] || [];
        if (flat || rawCh.length > mishnayot.length) return spread(mishnayot, leaves(rawCh));
        return mishnayot.map((_, i) => leaves(rawCh[i]).map(cleanComment).filter(Boolean));
    });
    raw.forEach((ch, c) => { if (c >= structure.length) extra += leaves(ch).length; });
    if (extra) console.log('  ', extra, 'passage(s) hors de la Michna ignoré(s) :', title);
    return chapters;
}

async function main() {
    fs.mkdirSync(DIR, { recursive: true });
    const index0 = await getJson('https://www.sefaria.org/api/index/');
    const titles = [];
    (function walk(n, path) {
        if (n.contents) n.contents.forEach(c => walk(c, path.concat(n.category || n.title || '?')));
        else if (n.title) titles.push({ title: n.title, path });
    }({ contents: index0 }, []));
    const catalogue = {};   // commentateur -> clé de traité -> titre Sefaria
    COMMENTATORS.forEach(c => {
        catalogue[c.id] = {};
        titles.filter(x => x.path.includes('Mishnah') || x.path.some(p => /on Mishnah/.test(p)))
            .filter(x => x.path.includes(c.cat) && !/Introduction/.test(x.title) && !/^Ikar /.test(x.title))
            .forEach(x => { catalogue[c.id][keyOf(x.title)] = x.title; });
    });

    const flat = [];
    SEDARIM.forEach(s => s.tractates.forEach(t => flat.push({ seder: s.id, id: t[0], sefaria: t[1], he: t[2], fr: t[3] })));
    const meta = {};
    let next = 0;
    async function worker() {
        while (next < flat.length) {
            const tr = flat[next++];
            const structure = await loadMishnah(tr);
            fs.writeFileSync(path.join(DIR, tr.id + '.json'), JSON.stringify({ v: 1, id: tr.id, chapters: structure }));
            const have = [];
            const aligned = {};
            for (const c of COMMENTATORS) {
                const title = catalogue[c.id][keyOf(tr.sefaria)];
                if (!title) continue;
                // La version vocalisée de Sefaria n'a pas toujours la bonne forme (Yachin sur Houlin : Wikisource, à plat) : l'édition Romm la remplace alors.
                let chapters = align(structure, await fetchText(title, 'hebrew'), title, c.flat);
                if (!chapters) chapters = align(structure, await fetchText(title, FALLBACK_VERSION).catch(() => []), title, c.flat);
                if (!chapters || !chapters.some(ch => ch.some(l => l.length))) continue;
                aligned[c.id] = chapters;
                have.push(c.id);
                fs.writeFileSync(path.join(DIR, c.prefix + tr.id + '.json'), JSON.stringify({ v: 1, id: tr.id, commentator: c.id, chapters }));
            }
            const masks = structure.map((mishnayot, ch) => mishnayot.map((_, i) => have.reduce((m, id, k) => m | (aligned[id][ch][i].length ? 1 << k : 0), 0)));
            fs.writeFileSync(path.join(DIR, 'counts-' + tr.id + '.json'), JSON.stringify({ v: 1, order: have, chapters: masks }));
            meta[tr.id] = { chapters: structure.length, mishnayot: structure.reduce((n, ch) => n + ch.length, 0), comm: have };
            console.log('✓', tr.id, have.join(','));
        }
    }
    await Promise.all(Array.from({ length: 5 }, worker));

    const index = {
        v: 1,
        source: 'Sefaria : Mishnah, version « Torat Emet 357 » (domaine public) ; commentateurs : voir js/app/michna.js (MICHNA_COMMENTATORS)',
        sedarim: SEDARIM.map(s => ({
            id: s.id, he: s.he, fr: s.fr,
            tractates: s.tractates.map(t => ({ id: t[0], he: t[2], fr: t[3], chapters: meta[t[0]].chapters, mishnayot: meta[t[0]].mishnayot, comm: meta[t[0]].comm }))
        }))
    };
    fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index));
    console.log('Terminé :', flat.length, 'traités.');
}

main().catch(e => { console.error(e); process.exit(1); });
