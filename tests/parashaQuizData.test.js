const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../js/parashaQuizCore.js');
const Refs = require('../js/torahRefs.js');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'data', 'torah', 'quiz');
const parashot = JSON.parse(fs.readFileSync(path.join(root, 'data', 'torah', 'parashot.json'), 'utf8')).parashot;
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').sort();
const BOOKS = {};
const book = n => BOOKS[n] || (BOOKS[n] = {
    text: JSON.parse(fs.readFileSync(path.join(root, 'data', 'tanakh', Refs.BOOK_IDS[n - 1] + '.json'), 'utf8')),
    rashi: JSON.parse(fs.readFileSync(path.join(root, 'data', 'tanakh', 'rashi-' + Refs.BOOK_IDS[n - 1] + '.json'), 'utf8'))
});

// Le texte comparé : sans accent, minuscules, ponctuation en espaces (français) ; consonnes seules, ponctuation en espaces (hébreu).
const fr = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const he = s => String(s).replace(/<[^>]+>/g, ' ').replace(/[֑-ׇ]/g, '').replace(/[^א-ת]+/g, ' ').trim();

// Les consonnes hébraïques d'un texte, sans espaces ni voyelles (pour chercher un nom dans un verset ou dans toute la Torah).
const heFlat = s => String(s).replace(/<[^>]+>/g, '').replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
let TORAH_FLAT = null;
const torahFlat = () => TORAH_FLAT || (TORAH_FLAT = [1, 2, 3, 4, 5].map(n => book(n).text.chapters.map(c => c.join(' ')).join(' ')).map(heFlat).join('|'));
const textOf = Core.textOf;
const hebrewOf = Core.hebrewOf;

// Les versets d'une paracha : [{ book, c, v }] du premier à celui qui précède la paracha suivante.
function versesOf(p) {
    const start = Refs.indexOf({ book: parashot[p].book, chapter: parashot[p].c, verse: parashot[p].v });
    const nextStart = p + 1 < parashot.length ? Refs.indexOf({ book: parashot[p + 1].book, chapter: parashot[p + 1].c, verse: parashot[p + 1].v }) : Refs.TOTAL;
    const out = [];
    for (let i = start; i < nextStart; i++) { const r = Refs.refAt(i); out.push({ book: r.book, c: r.chapter, v: r.verse, i: i }); }
    return out;
}

// Les versets d'une référence « c:v », « c:v-v », « c:v-c:v » dans le livre d'une paracha.
function versesOfRef(bookNumber, ref) {
    const r = Core.parseRef(ref);
    const a = Refs.indexOf({ book: bookNumber, chapter: r.from.c, verse: r.from.v });
    const b = Refs.indexOf({ book: bookNumber, chapter: r.to.c, verse: r.to.v });
    const out = [];
    for (let i = a; i <= b; i++) { const x = Refs.refAt(i); out.push({ book: x.book, c: x.chapter, v: x.verse }); }
    return out;
}

test('slug : sans accent, en minuscules, traits d\'union', () => {
    assert.strictEqual(Core.slug('Vayétsé'), 'vayetse');
    assert.strictEqual(Core.slug("Vayichla'h"), 'vayichla-h');
    assert.strictEqual(Core.slug('Lekh Lekha'), 'lekh-lekha');
});

test('parseRef : un verset, une suite de versets, un passage d\'un chapitre à l\'autre', () => {
    assert.deepStrictEqual(Core.parseRef('29:24'), { from: { c: 29, v: 24 }, to: { c: 29, v: 24 } });
    assert.deepStrictEqual(Core.parseRef('31:19-20'), { from: { c: 31, v: 19 }, to: { c: 31, v: 20 } });
    assert.deepStrictEqual(Core.parseRef('29:35-30:1'), { from: { c: 29, v: 35 }, to: { c: 30, v: 1 } });
    assert.strictEqual(Core.parseRef('Genèse 29:24'), null);
});

test('index : à jour, une entrée par fichier, les bons nombres de questions', () => {
    assert.deepStrictEqual(Object.keys(index.parashot).sort(), files.map(f => f.replace(/\.json$/, '')));
    files.forEach(f => {
        const id = f.replace(/\.json$/, '');
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        assert.deepStrictEqual(index.parashot[id].counts, Core.counts(data), id + ' : index périmé, relancer scripts/build_quiz_index.js');
        assert.strictEqual(parashot[index.parashot[id].index].fr, data.parasha, id);
        assert.strictEqual(Core.slug(data.parasha), id);
    });
});

files.forEach(f => {
    const id = f.replace(/\.json$/, '');
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const p = parashot.findIndex(x => Core.slug(x.fr) === id);

    test(id + ' : au moins cinq questions par niveau, forme de chaque question', () => {
        assert.ok(p >= 0);
        assert.strictEqual(data.v, 1);
        const all = [];
        Core.LEVELS.forEach(level => {
            const pool = Core.poolOf(data, level);
            assert.ok(pool.length >= 5, 'niveau ' + level + ' : ' + pool.length + ' questions');
            pool.forEach(q => {
                const where = 'niveau ' + level + ' « ' + q.q + ' »';
                ['q', 'x', 'ref'].forEach(k => assert.ok(typeof q[k] === 'string' && q[k].trim().length > 0, where + ' : ' + k));
                [q.a].concat(q.w || []).forEach(x => assert.ok(x && (typeof x === 'string' ? x : x.t) && String(textOf(x)).trim().length > 0, where + ' : une réponse est vide'));
                assert.ok(q.q.trim().endsWith('?'), where + ' : pas une question');
                assert.ok(Array.isArray(q.w) && q.w.length === 3, where + ' : trois mauvaises réponses');
                const four = [q.a].concat(q.w).map(x => fr(textOf(x)));
                assert.strictEqual(new Set(four).size, 4, where + ' : réponses identiques');
                [q.a].concat(q.w).map(textOf).forEach(x => assert.ok(x.length >= 2 && x.length <= 140, where + ' : réponse trop courte ou trop longue : ' + x));
                // L'hébreu des noms : sur les quatre réponses ou sur aucune ; écrit en lettres, voyelles et maqaf ; chaque nom existe dans la Torah (une faute de frappe y serait introuvable).
                const hes = [q.a].concat(q.w).map(hebrewOf);
                assert.ok(hes.every(Boolean) || hes.every(h => !h), where + ' : l\'hébreu doit figurer sur les quatre réponses ou sur aucune');
                hes.filter(Boolean).forEach(h => {
                    assert.ok(/^[א-תְ-ׇ־]+$/.test(h), where + ' : hébreu mal écrit : ' + h);
                    assert.ok(torahFlat().includes(heFlat(h)), where + ' : « ' + h + ' » ne se trouve pas dans la Torah');
                });
                assert.ok(Array.isArray(q.proof) && q.proof.length >= 1 && q.proof.every(w => typeof w === 'string' && w.trim()), where + ' : mots-preuves');
                if (level === 3) {
                    assert.ok(/^Selon Rachi/.test(q.q), where + ' : le niveau 3 s\'appuie sur Rachi');
                    assert.ok(/^Rachi sur /.test(q.x), where + ' : l\'explication cite Rachi');
                }
                all.push(q);
            });
        });
        const questions = all.map(q => fr(q.q));
        assert.strictEqual(new Set(questions).size, questions.length, 'deux questions identiques');
        // La bonne réponse n'est pas toujours la plus longue (on ne la trouverait pas sans lire la question).
        const longest = all.filter(q => q.w.every(x => textOf(q.a).length > textOf(x).length)).length;
        assert.ok(longest / all.length <= 0.6, 'la bonne réponse est la plus longue dans ' + longest + ' questions sur ' + all.length);
    });

    test(id + ' : chaque référence est dans la paracha, chaque mot-preuve est dans le verset (niveaux 1 et 2) ou dans Rachi (niveau 3)', () => {
        const range = new Set(versesOf(p).map(v => v.i));
        const bookNumber = parashot[p].book;
        const problems = [];                    // tous les défauts d'un coup : on les corrige ensemble
        Core.LEVELS.forEach(level => Core.poolOf(data, level).forEach(q => {
            const where = 'niveau ' + level + ' « ' + q.q + ' » (' + q.ref + ')';
            if (!Core.parseRef(q.ref)) { problems.push(where + ' : référence illisible'); return; }
            const verses = versesOfRef(bookNumber, q.ref);
            if (!(verses.length >= 1 && verses.length <= 6)) problems.push(where + ' : référence trop large');
            if (verses.some(v => !range.has(Refs.indexOf({ book: v.book, chapter: v.c, verse: v.v })))) { problems.push(where + ' : hors de la paracha'); return; }
            // Le nom de la bonne réponse s'écrit, en hébreu, dans les versets cités (ou, au niveau 3, dans Rachi).
            if (hebrewOf(q.a)) {
                const hebrew = heFlat(verses.map(v => book(v.book).text.chapters[v.c - 1][v.v - 1]).join(' ') + (level === 3 ? verses.map(v => ((book(v.book).rashi.chapters[v.c - 1] || [])[v.v - 1] || []).join(' ')).join(' ') : ''));
                if (!hebrew.includes(heFlat(hebrewOf(q.a)))) problems.push(where + ' : « ' + hebrewOf(q.a) + ' » absent des versets cités');
            }
            if (level < 3) {
                const text = fr(verses.map(v => book(v.book).text.french[v.c - 1][v.v - 1]).join(' '));
                q.proof.forEach(w => { if (!text.includes(fr(w))) problems.push(where + ' : « ' + w + ' » absent du verset'); });
            } else {
                const text = he(verses.map(v => ((book(v.book).rashi.chapters[v.c - 1] || [])[v.v - 1] || []).join(' ')).join(' '));
                if (!text.length) problems.push(where + ' : pas de Rachi sur ces versets');
                q.proof.forEach(w => { if (!text.includes(he(w))) problems.push(where + ' : « ' + w + ' » absent de Rachi'); });
            }
        }));
        assert.deepStrictEqual(problems, []);
    });
});
