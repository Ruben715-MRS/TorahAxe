// Produit data/michna/ : la Michna (63 traités) et le commentaire de Rabbénou Ovadia de Bartenura, en hébreu vocalisé, depuis Sefaria.
// Michna : version « Torat Emet 357 » (domaine public ; Bikkurim 1 à 3 : édition Romm, Vilna 1913, domaine public). Bartenura : version « Torat-Emet » (CC-BY-NC pour la plupart des traités).
// Usage : NODE_USE_ENV_PROXY=1 node scripts/build_michna.js   (derrière un proxy ; sinon sans la variable)
// Un fichier par traité : data/michna/<id>.json = { v, id, chapters: [ chapitre → [ michna → [texte, [commentaires du Bartenura]] ] ] }.
// data/michna/index.json : la liste des traités (ordre, nom hébreu et français, nombre de chapitres et de michnayot) pour l'écran.
// Le texte n'est pas retouché : on retire les espaces en trop, les balises autres que <b> (mot commenté) et <i> (citation) du commentaire,
// et toutes les balises de la Michna. Idempotent : relancer réécrit les mêmes fichiers.

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

// Si la version vocalisée a des chapitres vides (Bikkurim 1 à 3 chez Sefaria), ils viennent de l'édition Romm, Vilna 1913 (domaine public, sans voyelles).
const FALLBACK_VERSION = 'hebrew|Mishnah, ed. Romm, Vilna 1913';

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const cleanMishna = (s) => clean(String(s || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, ''));
// Le commentaire : seules <b> et <i> restent (le dibour hamatkhil et les citations) ; tout autre balise est retirée.
const cleanComment = (s) => clean(String(s || '').replace(/<(?!\/?(?:b|i)>)[^>]*>/g, ''));

async function build(sefariaTitle) {
    const bartTitle = 'Bartenura on ' + (sefariaTitle === 'Pirkei Avot' ? 'Mishnah Avot' : 'Mishnah ' + sefariaTitle);
    const mTitle = sefariaTitle === 'Pirkei Avot' ? sefariaTitle : 'Mishnah ' + sefariaTitle;
    const [m, b] = await Promise.all([fetchText(mTitle, 'hebrew'), fetchText(bartTitle, 'hebrew')]);
    if (m.some(ch => !ch || !ch.length)) {
        const alt = await fetchText(mTitle, FALLBACK_VERSION).catch(() => []);
        m.forEach((ch, c) => { if ((!ch || !ch.length) && alt[c] && alt[c].length) m[c] = alt[c]; });
        console.log('  chapitres complétés (Romm) :', mTitle);
    }
    const nbCh = Math.max(m.length, b.length);
    const chapters = [];
    for (let c = 0; c < nbCh; c++) {
        const mc = m[c] || [], bc = b[c] || [];
        const nb = Math.max(mc.length, bc.length);
        const list = [];
        for (let i = 0; i < nb; i++) {
            const comments = (Array.isArray(bc[i]) ? bc[i] : (bc[i] ? [bc[i]] : [])).map(cleanComment).filter(Boolean);
            list.push([cleanMishna(mc[i]), comments]);
        }
        chapters.push(list);
    }
    return chapters;
}

async function main() {
    fs.mkdirSync(DIR, { recursive: true });
    const flat = [];
    SEDARIM.forEach(s => s.tractates.forEach(t => flat.push({ seder: s.id, t })));
    const results = {};
    let next = 0;
    async function worker() {
        while (next < flat.length) {
            const { t } = flat[next++];
            results[t[0]] = await build(t[1]);
            console.log('✓', t[0]);
        }
    }
    await Promise.all(Array.from({ length: 5 }, worker));

    const index = { v: 1, source: 'Sefaria : Mishnah, version « Torat Emet 357 » (domaine public) ; Bartenura on Mishnah, version « Torat-Emet » (CC-BY-NC)', sedarim: [] };
    SEDARIM.forEach(s => {
        const entry = { id: s.id, he: s.he, fr: s.fr, tractates: [] };
        s.tractates.forEach(t => {
            const chapters = results[t[0]];
            const nm = chapters.reduce((n, ch) => n + ch.length, 0);
            fs.writeFileSync(path.join(DIR, t[0] + '.json'), JSON.stringify({ v: 1, id: t[0], chapters }));
            entry.tractates.push({ id: t[0], he: t[2], fr: t[3], chapters: chapters.length, mishnayot: nm });
        });
        index.sedarim.push(entry);
    });
    fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index));
    console.log('Terminé :', flat.length, 'traités.');
}

main().catch(e => { console.error(e); process.exit(1); });
