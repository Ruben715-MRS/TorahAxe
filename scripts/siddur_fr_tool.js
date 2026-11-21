// Outil de traduction française du siddour (data/siddur/fr/<id>.json : { v, id, t: { indice du segment : [empreinte, texte] } }).
//   node scripts/siddur_fr_tool.js reuse            : reprend les traductions déjà faites pour un texte identique (même empreinte, ailleurs dans le siddour),
//                                                      et les lignes du compte de l'Omer.
//   node scripts/siddur_fr_tool.js todo <id>        : liste les segments sans traduction : « [indice] texte » (texte hébreu sans balises).
//   node scripts/siddur_fr_tool.js apply <id> <f>   : fusionne { "indice": "traduction" } du fichier JSON <f> (calcule l'empreinte ; refuse un indice inconnu ou un texte vide).
//   node scripts/siddur_fr_tool.js reindex          : reconstruit fr/index.json.
//   node scripts/siddur_fr_tool.js status           : le nombre de segments traduits / à traduire, par section.
// Les titres (segment 0, « <big> ») et les segments sans lettre hébraïque n'ont pas besoin de traduction.
const fs = require('fs'), path = require('path');
const S = require('../js/siddurCore.js');
// SD_RITE=ashkenaz (ou habad) : on travaille sur data/siddur/<rite>/ (textes et traductions fr/ de ce rite) ; sans lui, sur le siddour d'Edot HaMizrach.
// Les sections d'un index marquées `from` y sont reprises du siddour séfarade : elles ne sont pas dans le dossier du rite.
const ROOT = path.join(__dirname, '..', 'data', 'siddur');
const DIR = process.env.SD_RITE ? path.join(ROOT, process.env.SD_RITE) : ROOT;
if (process.env.SD_RITE) fs.mkdirSync(path.join(DIR, 'fr'), { recursive: true });
const ids = () => fs.readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'index.json').map(f => f.replace(/\.json$/, ''));
const load = id => JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8'));
function loadFr(id) { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'fr', id + '.json'), 'utf8')).t || {}; } catch (e) { return {}; } }
function saveFr(id, t) {
    const keys = Object.keys(t).sort((a, b) => a - b);
    const sorted = {}; keys.forEach(k => { sorted[k] = t[k]; });
    fs.writeFileSync(path.join(DIR, 'fr', id + '.json'), JSON.stringify({ v: 1, id: id, t: sorted }) + '\n');
}
// Reconstruit fr/index.json (le nombre de segments traduits par section) : à lancer une fois toutes les traductions écrites.
function reindex() {
    const idxPath = path.join(DIR, 'fr', 'index.json');
    const idx = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, 'utf8')) : { v: 1, sections: {} };
    ids().forEach(id => { const n = Object.keys(loadFr(id)).length; if (n) idx.sections[id] = n; });
    fs.writeFileSync(idxPath, JSON.stringify(idx) + '\n');
}
const hasHebrew = s => /[א-ת]/.test(s);
const plainOf = seg => S.plain(S.parse(seg)).replace(/\s+/g, ' ').trim();
const needs = (seg, i) => i > 0 && hasHebrew(plainOf(seg)) && !/^<big>/.test(seg.trim());

const FR_OMER = { zmr_omer_1: 'un jour', zmr_omer_days: '{n} jours', zmr_omer_week_1: 'une semaine', zmr_omer_weeks: '{n} semaines', zmr_omer_day_1: 'un jour', zmr_omer_days_n: '{n} jours', zmr_omer_exact: '{n} jours, soit {weeks}', zmr_omer_full: '{n} jours, soit {weeks} et {days}' };
const cmd = process.argv[2];
if (cmd === 'reindex') { reindex(); console.log('index reconstruit'); } else if (cmd === 'status') {
    let miss = 0, total = 0;
    ids().forEach(id => { const s = load(id), t = loadFr(id); let m = 0, n = 0; s.segments.forEach((seg, i) => { if (needs(seg, i)) { n++; if (!t[i]) m++; } }); miss += m; total += n; if (m) console.log(id, m + '/' + n); });
    console.log('À traduire :', miss, '/', total);
} else if (cmd === 'todo') {
    const id = process.argv[3], s = load(id), t = loadFr(id);
    s.segments.forEach((seg, i) => { if (needs(seg, i) && !t[i]) console.log('[' + i + '] ' + plainOf(seg)); });
} else if (cmd === 'apply') {
    const id = process.argv[3], data = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
    const s = load(id), t = loadFr(id);
    let n = 0;
    Object.keys(data).forEach(k => {
        const i = Number(k), text = typeof data[k] === 'string' ? data[k].trim() : '';
        if (!(i >= 1 && i < s.segments.length)) throw new Error(id + ' : indice inconnu ' + k);
        if (!text) throw new Error(id + ' : texte vide pour ' + k);
        t[i] = [S.fingerprint(s.segments[i]), text]; n++;
    });
    saveFr(id, t);
    console.log(id, n, 'traductions ajoutées');
} else if (cmd === 'reuse') {
    const known = {};
    const frDirs = [ROOT, path.join(ROOT, 'ashkenaz'), path.join(ROOT, 'habad')];
    frDirs.forEach(d => { try { fs.readdirSync(path.join(d, 'fr')).filter(f => f.endsWith('.json') && f !== 'index.json').forEach(f => { const t = JSON.parse(fs.readFileSync(path.join(d, 'fr', f), 'utf8')).t || {}; Object.keys(t).forEach(k => { known[t[k][0]] = t[k][1]; }); }); } catch (e) { /* pas de traductions dans ce dossier */ } });
    const OC = require('../js/zmanimReminderCore.js');
    let total = 0;
    ids().forEach(id => {
        const s = load(id), t = loadFr(id);
        let added = 0;
        const omerLine = id === 'omer';
        s.segments.forEach((seg, i) => {
            if (!needs(seg, i) || t[i]) return;
            const fp = S.fingerprint(seg);
            if (known[fp]) { t[i] = [fp, known[fp]]; added++; return; }
            if (omerLine && /^\s*<</.test(plainOf(seg)) && /לעו?מר/.test(S.stripNiqqud(plainOf(seg)))) {
                const n = S.omerSegment(s.segments, 1) === i ? 1 : (() => { let c = 0; for (let j = 0; j <= i; j++) if (/^\s*<</.test(plainOf(s.segments[j])) && /לעו?מר/.test(S.stripNiqqud(plainOf(s.segments[j])))) c++; return c; })();
                const text = OC.omerCount(n, (k, p) => FR_OMER[k.replace('tools.', '')].replace(/\{(\w+)\}/g, (m, x) => p[x]));
                t[i] = [fp, 'Aujourd’hui : ' + text + ' de l’Omer.']; added++;
            }
        });
        if (added) { saveFr(id, t); total += added; console.log(id, '+' + added); }
    });
    console.log('Total ajouté :', total);
    reindex();
} else { console.log('commande inconnue'); process.exit(1); }
