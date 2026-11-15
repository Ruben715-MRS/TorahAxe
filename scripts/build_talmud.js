// Produit data/talmud/ : le Talmud de Babylone (Guémara) en araméen vocalisé, depuis Sefaria.
// Texte : « William Davidson Edition - Vocalized Aramaic » (Koren Noé ; nikoud : Dicta), licence CC-BY-NC (usage non commercial).
// Commentaires : Rashi, Tosafot, Rashbam (Bava Batra, Pessahim), Ran (Nedarim) et Rabbénou Guerchom (Makkot), édition de Vilna (domaine public), alignés sur les segments de la Guémara (voir plus bas).
// Usage : NODE_USE_ENV_PROXY=1 node scripts/build_talmud.js berakhot [shabbat …]   (ou « all » pour les 37 traités ; derrière un proxy, sinon sans la variable)
//   option --check : ne rien écrire, seulement dire si Rashi et Tosafot s'alignent bien sur la Guémara.
// Fichiers :
//   data/talmud/<traité>.json = { v, id, start, pages: [ amoud → [ segment ] ] } : `start` est le premier amoud (« 2a »), `pages[0]` ; les amoudim se suivent
//     (2a, 2b, 3a…) jusqu'à la fin du traité ; un amoud que la numérotation de Vilna saute reste vide (Nazir 33b). Un segment est du texte avec <b> (les mots en gras : « Matni », « Guemara », mot d'ouverture).
//   data/talmud/<préfixe><traité>.json (rashi-, rashbam-, ran-, rabbeinu-gershom-, tosafot-) = { v, id, commentator, pages: [ amoud → [ segment → [commentaires] ] ] } : mêmes amoudim que <traité>.json ;
//     dans un amoud, le segment k de la Guémara a ses commentaires en k (les derniers segments sans commentaire sont omis). Un commentaire est du texte avec
//     <b> (le mot commenté, avant le premier « – » ou « - »), <i> (citation) et <small>.
//   data/talmud/counts-<traité>.json = { v, order, pages: [ amoud → [ masque par segment ] ] } : le bit k du masque est celui de order[k] ; sert aux pastilles « 💬 n ».
//   data/talmud/index.json : { sedarim: [ { id, he, fr, tractates: [ { id, he, fr, start, amudim, chapters: [ { he, from: [amoud, segment] } ], comm: [ commentateurs qui le couvrent ] } ] } ] }
//     (un traité n'y figure que si son fichier existe : relancer le script pour n'importe quel traité réécrit l'index entier).
// Le texte n'est pas retouché : on retire les espaces en trop, les sauts de ligne, et les balises autres que <b> (<big><strong> devient <b>).
// Idempotent : relancer réécrit les mêmes fichiers.

const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'data', 'talmud');
const VERSION = 'hebrew|William Davidson Edition - Vocalized Aramaic';
const CHECK = process.argv.includes('--check');

// Les six ordres, dans l'ordre de la tradition ; seuls ceux qui ont une Guémara dans le Talmud de Babylone (37 traités).
// Chaque traité : [id, titre Sefaria, hébreu, français].
const SEDARIM = [
    { id: 'zeraim', he: 'סדר זרעים', fr: 'Zeraïm', tractates: [['berakhot', 'Berakhot', 'ברכות', 'Berakhot']] },
    { id: 'moed', he: 'סדר מועד', fr: 'Moëd', tractates: [
        ['shabbat', 'Shabbat', 'שבת', 'Chabbat'], ['eruvin', 'Eruvin', 'עירובין', 'Erouvin'], ['pesachim', 'Pesachim', 'פסחים', 'Pessahim'],
        ['rosh-hashanah', 'Rosh Hashanah', 'ראש השנה', 'Roch Hachana'], ['yoma', 'Yoma', 'יומא', 'Yoma'], ['sukkah', 'Sukkah', 'סוכה', 'Souccah'],
        ['beitzah', 'Beitzah', 'ביצה', 'Bétsa'], ['taanit', 'Taanit', 'תענית', 'Ta’anit'], ['megillah', 'Megillah', 'מגילה', 'Méguila'],
        ['moed-katan', 'Moed Katan', 'מועד קטן', 'Moëd Katan'], ['chagigah', 'Chagigah', 'חגיגה', 'Haguiga']] },
    { id: 'nashim', he: 'סדר נשים', fr: 'Nachim', tractates: [
        ['yevamot', 'Yevamot', 'יבמות', 'Yevamot'], ['ketubot', 'Ketubot', 'כתובות', 'Ketoubot'], ['nedarim', 'Nedarim', 'נדרים', 'Nedarim'],
        ['nazir', 'Nazir', 'נזיר', 'Nazir'], ['sotah', 'Sotah', 'סוטה', 'Sota'], ['gittin', 'Gittin', 'גיטין', 'Guittin'],
        ['kiddushin', 'Kiddushin', 'קידושין', 'Kidouchin']] },
    { id: 'nezikin', he: 'סדר נזיקין', fr: 'Nezikin', tractates: [
        ['bava-kamma', 'Bava Kamma', 'בבא קמא', 'Bava Kama'], ['bava-metzia', 'Bava Metzia', 'בבא מציעא', 'Bava Metsia'],
        ['bava-batra', 'Bava Batra', 'בבא בתרא', 'Bava Batra'], ['sanhedrin', 'Sanhedrin', 'סנהדרין', 'Sanhédrin'], ['makkot', 'Makkot', 'מכות', 'Makkot'],
        ['shevuot', 'Shevuot', 'שבועות', 'Chevouot'], ['avodah-zarah', 'Avodah Zarah', 'עבודה זרה', 'Avoda Zara'], ['horayot', 'Horayot', 'הוריות', 'Horayot']] },
    { id: 'kodashim', he: 'סדר קדשים', fr: 'Kodachim', tractates: [
        ['zevachim', 'Zevachim', 'זבחים', 'Zevahim'], ['menachot', 'Menachot', 'מנחות', 'Menahot'], ['chullin', 'Chullin', 'חולין', 'Houlin'],
        ['bekhorot', 'Bekhorot', 'בכורות', 'Bekhorot'], ['arakhin', 'Arakhin', 'ערכין', 'Arakhin'], ['temurah', 'Temurah', 'תמורה', 'Temoura'],
        ['keritot', 'Keritot', 'כריתות', 'Keritot'], ['meilah', 'Meilah', 'מעילה', 'Méila'], ['tamid', 'Tamid', 'תמיד', 'Tamid']] },
    { id: 'tohorot', he: 'סדר טהרות', fr: 'Tohorot', tractates: [['niddah', 'Niddah', 'נידה', 'Nidda']] }
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

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
// <big><strong>…</strong></big> (le mot d'ouverture, « Matni », « Guemara », « Hadran ») devient <b>…</b> ; tout le reste est retiré.
function cleanSegment(s) {
    const out = String(s || '')
        .replace(/<br\s*\/?>/g, ' ')
        .replace(/<\/?big>/g, '')
        .replace(/<(\/?)strong>/g, '<$1b>')
        .replace(/<(?!\/?b>)[^>]*>/g, '');
    return clean(out);
}

const amoud = (i, start) => { const n = parseInt(start, 10) * 2 + (/b$/.test(start) ? 1 : 0) + i; return Math.floor(n / 2) + (n % 2 ? 'b' : 'a'); };
const amoudIndex = (label) => parseInt(label, 10) * 2 + (/b$/.test(label) ? 1 : 0);

// Les commentateurs : `title` : leur titre Sefaria (« Rashi on Berakhot ») ; `prefix` : le préfixe de leurs fichiers.
// `only` : les traités qu'il couvre (les autres n'ont pas de fichier chez Sefaria : inutile de les demander).
const COMMENTATORS = [
    { id: 'rashi', title: 'Rashi', prefix: 'rashi-' },
    { id: 'rashbam', title: 'Rashbam', prefix: 'rashbam-', only: ['bava-batra', 'pesachim'] },   // Bava Batra 29a à 176b ; Pesachim 99b à 121b (Rashi n'y est pas)
    { id: 'ran', title: 'Ran', prefix: 'ran-', only: ['nedarim'] },   // le Ran (Rabbénou Nissim) sur Nedarim, 2a à 91b
    { id: 'rabbeinu-gershom', title: 'Rabbeinu Gershom', prefix: 'rabbeinu-gershom-', only: ['makkot'] },   // Makkot 24a-24b seulement (10 commentaires) : Sefaria range le reste sous Rashi
    { id: 'tosafot', title: 'Tosafot', prefix: 'tosafot-' }
];
// L'édition de Vilna d'abord ; si elle est quasi vide (Rashi sur Roch Hachana : 8 commentaires), la version Wikisource, dans le domaine public aussi, la remplace.
const COMM_VERSIONS = ['hebrew|Vilna Edition', 'hebrew|WikiSource Rashi'];

// Un commentaire : seules <b>, <i> et <small> restent ; les sauts de ligne deviennent des espaces. Le mot commenté (avant le premier « – » ou « - », au plus 120 signes) passe en gras.
function cleanComment(raw) {
    let c = clean(String(raw || '').replace(/<br\s*\/?>/g, ' ').replace(/<(?!\/?(?:b|i|small)>)[^>]*>/g, ''));
    if (c && !/<b>/.test(c)) {
        const m = /\s[–-]\s/.exec(c);   // Rashi sépare le mot commenté par « – », Tosafot par « - » ou « – »
        if (m && m.index > 0 && m.index <= 120) c = '<b>' + c.slice(0, m.index) + '</b>' + c.slice(m.index);
    }
    return c;
}

// Les commentaires de Sefaria sont rangés amoud → segment de la Guémara → commentaire : l'alignement est celui de la source, sans deviner.
// `first` : l'indice (depuis 1a) du premier amoud du traité ; `gemara` : les amoudim de la Guémara. Rend { pages, stats } ou null si la source n'existe pas.
async function loadCommentary(tr, comm, first, gemara) {
    let best = null;
    for (const version of COMM_VERSIONS) {
        if (best && best.stats.comments >= gemara.length / 3) break;
        if (version !== COMM_VERSIONS[0] && comm.id !== 'rashi') break;
        const got = await loadVersion(tr, comm, version, first, gemara);
        if (got && (!best || got.stats.comments > best.stats.comments)) best = got;
    }
    return best;
}

async function loadVersion(tr, comm, version, first, gemara) {
    let d;
    try { d = await getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent((comm.title + ' on ' + tr.sefaria).replace(/ /g, '_')) + '?version=' + encodeURIComponent(version)); }
    catch (e) { return null; }
    if (!d.versions || !d.versions[0] || !Array.isArray(d.versions[0].text)) return null;
    const raw = d.versions[0].text;
    const stats = { comments: 0, beyondSegments: 0, beyondPages: 0, malformed: 0, version };
    raw.forEach((p, i) => { if (i >= first + gemara.length) (p || []).forEach(seg => { stats.beyondPages += Array.isArray(seg) ? seg.length : 1; }); });
    const pages = gemara.map((segments, i) => {
        const rawPage = raw[first + i] || [];
        const out = [];
        rawPage.forEach((list, k) => {
            if (!Array.isArray(list)) { if (list) stats.malformed++; return; }
            const comments = list.map(cleanComment).filter(Boolean);
            stats.comments += comments.length;
            if (k >= segments.length) { stats.beyondSegments += comments.length; return; }
            out[k] = comments;
        });
        for (let k = 0; k < out.length; k++) if (!out[k]) out[k] = [];
        return out;
    });
    if (!stats.comments) return null;
    return { pages, stats };
}

async function buildTractate(tr) {
    const d = await getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(tr.sefaria.replace(/ /g, '_')) + '?version=' + encodeURIComponent(VERSION));
    if (!d.versions || !d.versions[0]) throw new Error('pas de texte : ' + tr.sefaria);
    const raw = d.versions[0].text;
    // Sefaria compte depuis 1a : les amoudim vides du début (2a pour Berakhot) sont retirés, et on retient le premier amoud réel.
    let first = raw.findIndex(p => p && p.length);
    if (first < 0) throw new Error('texte vide : ' + tr.sefaria);
    let last = raw.length - 1;
    while (last > first && !(raw[last] && raw[last].length)) last--;
    const pages = raw.slice(first, last + 1).map(p => (p || []).map(cleanSegment).filter(Boolean));
    const start = amoud(first, '1a');
    // Un amoud vide au milieu n'est pas une lacune de la source : l'édition de Vilna saute parfois un amoud dans sa numérotation (Nazir 33b). On le garde vide, signalé.
    pages.forEach((p, i) => { if (!p.length) console.log('  amoud vide (numérotation de Vilna) :', tr.id, amoud(first, '1a') && amoud(first + i, '1a')); });
    // Les chapitres, d'après la structure « Chapters » de l'index de Sefaria : « Berakhot 2a:1-13a:15 » → commence à 2a, segment 1.
    const idx = await getJson('https://www.sefaria.org/api/v2/index/' + encodeURIComponent(tr.sefaria.replace(/ /g, '_')));
    const nodes = ((idx.alts || {}).Chapters || {}).nodes || [];
    const chapters = nodes.map(n => {
        const m = /(\d+[ab])(?::(\d+))?/.exec(String(n.wholeRef).replace(tr.sefaria, ''));
        if (!m) throw new Error('chapitre illisible : ' + n.wholeRef);
        const he = (n.titles.find(t => t.lang === 'he') || {}).text || '';
        return { he, from: [amoudIndex(m[1]) - amoudIndex(start), m[2] ? parseInt(m[2], 10) - 1 : 0] };
    });
    chapters.forEach(c => { if (c.from[0] < 0 || c.from[0] >= pages.length || c.from[1] >= pages[c.from[0]].length) throw new Error('chapitre hors du texte : ' + JSON.stringify(c) + ' ' + tr.sefaria); });
    if (!CHECK) fs.writeFileSync(path.join(DIR, tr.id + '.json'), JSON.stringify({ v: 1, id: tr.id, start, pages, chapters }));
    // Rashi et Tosafot : les fichiers de chaque commentateur et les masques des pastilles.
    const have = [];
    const loaded = {};
    for (const comm of COMMENTATORS.filter(c => !c.only || c.only.includes(tr.id))) {
        const got = await loadCommentary(tr, comm, first, pages);
        if (!got) { if (!CHECK) { const f = path.join(DIR, comm.prefix + tr.id + '.json'); if (fs.existsSync(f)) fs.unlinkSync(f); } continue; }
        loaded[comm.id] = got;
        have.push(comm.id);
        const s = got.stats;
        console.log('   ', comm.id, ':', s.comments, 'commentaires' + (s.version !== COMM_VERSIONS[0] ? ' (' + s.version + ')' : '') + (s.beyondSegments ? ' ; ' + s.beyondSegments + ' sur un segment qui n\'existe pas (ignorés)' : '') + (s.beyondPages ? ' ; ' + s.beyondPages + ' hors du traité' : '') + (s.malformed ? ' ; ' + s.malformed + ' mal formés' : ''));
        if (!CHECK) fs.writeFileSync(path.join(DIR, comm.prefix + tr.id + '.json'), JSON.stringify({ v: 1, id: tr.id, commentator: comm.id, pages: got.pages }));
    }
    const order = COMMENTATORS.map(c => c.id).filter(id => have.includes(id));
    if (order.length && !CHECK) {
        const masks = pages.map((segments, p) => {
            const row = segments.map((_, k) => order.reduce((m, id, bit) => m | (((loaded[id].pages[p][k] || []).length ? 1 : 0) << bit), 0));
            while (row.length && !row[row.length - 1]) row.pop();
            return row;
        });
        fs.writeFileSync(path.join(DIR, 'counts-' + tr.id + '.json'), JSON.stringify({ v: 1, order, pages: masks }));
    }
    const words = pages.reduce((n, p) => n + p.join(' ').split(' ').length, 0);
    console.log(CHECK ? '·' : '✓', tr.id, ': amoudim', pages.length, '; chapitres', chapters.length, '; mots', words, '; commentateurs', have.join(', ') || '—');
}

// L'index : tous les traités dont le fichier existe, dans l'ordre de la tradition.
function writeIndex() {
    const sedarim = [];
    SEDARIM.forEach(s => {
        const tractates = [];
        s.tractates.forEach(t => {
            const file = path.join(DIR, t[0] + '.json');
            if (!fs.existsSync(file)) return;
            const book = JSON.parse(fs.readFileSync(file, 'utf8'));
            const comm = COMMENTATORS.filter(c => fs.existsSync(path.join(DIR, c.prefix + t[0] + '.json'))).map(c => c.id);
            tractates.push({ id: t[0], he: t[2], fr: t[3], start: book.start, amudim: book.pages.length, chapters: book.chapters.map(c => ({ he: c.he, from: c.from })), comm });
        });
        if (tractates.length) sedarim.push({ id: s.id, he: s.he, fr: s.fr, tractates });
    });
    fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify({
        v: 1,
        source: 'Sefaria : Talmud de Babylone, William Davidson Edition (Koren Noé), araméen vocalisé (nikoud : Dicta), CC-BY-NC',
        sedarim
    }));
    console.log('index :', sedarim.reduce((n, s) => n + s.tractates.length, 0), 'traité(s)');
}

async function main() {
    fs.mkdirSync(DIR, { recursive: true });
    const flat = [];
    SEDARIM.forEach(s => s.tractates.forEach(t => flat.push({ id: t[0], sefaria: t[1] })));
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const wanted = args.includes('all') ? flat : args.map(a => flat.find(t => t.id === a) || (() => { throw new Error('traité inconnu : ' + a); })());
    for (const tr of wanted) await buildTractate(tr);
    if (!CHECK) writeIndex();
}

main().catch(e => { console.error(e); process.exit(1); });
