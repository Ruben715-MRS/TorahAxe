const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const G = require('../js/nakhGameCore.js');
const R = require('../js/nakhRefs.js');
const Quiz = require('../js/quizCore.js');
const V = require('../js/verseGameCore.js');

const seeded = seed => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };
const bookIndex = id => R.BOOKS.findIndex(b => b.id === id);
const FILES = {};
R.FILES.forEach(id => { FILES[id] = JSON.parse(fs.readFileSync('data/tanakh/' + id + '.json', 'utf8')); });
const SUMMARIES = {};
R.FILES.forEach(id => { SUMMARIES[id] = JSON.parse(fs.readFileSync('data/tanakh/resume-' + id + '.json', 'utf8')); });

// Une partie à trois questions fixées : Josué 6:1, Isaïe 40:1, Psaumes 23:1.
const picks = () => [{ book: bookIndex('josue'), chapter: 6, verse: 1 }, { book: bookIndex('isaie'), chapter: 40, verse: 1 }, { book: bookIndex('psaumes'), chapter: 23, verse: 1 }];

// --- Le chapitre : tolérance et points -------------------------------------------------------------------------------------------------------------------
test('tolérance : un huitième du livre, entre 2 et 6 chapitres', () => {
    const t = id => G.tolerance(R.BOOKS[bookIndex(id)].chapters);
    assert.strictEqual(t('ruth'), 2);
    assert.strictEqual(t('esther'), 2);
    assert.strictEqual(t('daniel'), 2);
    assert.strictEqual(t('proverbes'), 4);
    assert.strictEqual(t('job'), 5);
    assert.strictEqual(t('isaie'), 6);
    assert.strictEqual(t('psaumes'), 6);
    R.BOOKS.forEach(b => { const w = G.tolerance(b.chapters); assert.ok(w >= 2 && w <= 6, b.id); });
});

test('part des points gardée : exacte = tout, puis une perte égale par chapitre, zéro à la tolérance', () => {
    assert.strictEqual(G.chapterShare(0, 66), 1);
    assert.ok(Math.abs(G.chapterShare(1, 66) - 5 / 6) < 1e-9);
    assert.ok(Math.abs(G.chapterShare(3, 66) - 0.5) < 1e-9);
    assert.strictEqual(G.chapterShare(6, 66), 0);
    assert.strictEqual(G.chapterShare(40, 66), 0);
    assert.strictEqual(G.chapterShare(1, 4), 0.5);       // Ruth : un chapitre d'écart, la moitié
    assert.strictEqual(G.chapterShare(2, 4), 0);         // deux, rien
    // De plus en plus loin, de moins en moins de points, jamais négatifs.
    R.BOOKS.forEach(b => { let last = 2; for (let d = 0; d <= b.chapters; d++) { const s = G.chapterShare(d, b.chapters); assert.ok(s >= 0 && s <= 1 && s <= last, b.id + ' ' + d); last = s; } });
    // Les points sont arrondis aux 5 : 100 × 5/6 = 83,3 → 85 ; 60 × 5/6 = 50.
    assert.strictEqual(G.chapterPoints(100, 0, 66), 100);
    assert.strictEqual(G.chapterPoints(100, 1, 66), 85);
    assert.strictEqual(G.chapterPoints(60, 1, 66), 50);
    assert.strictEqual(G.chapterPoints(100, 9, 66), 0);
    assert.strictEqual(G.chapterPoints(20, 0, 4), 20);
});

// --- Le résumé sans le nom du livre ---------------------------------------------------------------------------------------------------------------------
test('maskSummary : le nom du livre devient « … », mot entier, accents et majuscules', () => {
    const josue = bookIndex('josue');
    assert.strictEqual(G.maskSummary('Josué envoie deux espions à Jéricho.', josue), '… envoie deux espions à Jéricho.');
    assert.strictEqual(G.maskSummary("Dieu parle à Josué, puis josué part.", josue), 'Dieu parle à …, puis … part.');
    assert.strictEqual(G.maskSummary('Josuéen n\'est pas un nom', josue), 'Josuéen n\'est pas un nom');
    assert.strictEqual(G.maskSummary("L'histoire d'Isaïe.", bookIndex('isaie')), "L'histoire d'….");
    assert.strictEqual(G.maskSummary('Les Psaumes et un psaume.', bookIndex('psaumes')), 'Les … et un ….');
    assert.strictEqual(G.maskSummary('Ruth glane chez Boaz.', bookIndex('ruth')), '… glane chez Boaz.');
    // Un livre sans nom à cacher (Juges, Rois : des noms communs) garde son résumé tel quel ; le nom d'un AUTRE livre reste.
    assert.strictEqual(G.maskSummary('Les juges', bookIndex('juges')), 'Les juges');
    assert.strictEqual(G.maskSummary('Esdras lit la Torah.', bookIndex('nehemie')), 'Esdras lit la Torah.');
    assert.strictEqual(G.maskSummary(undefined, 0), '');
});

test('données : après masquage, aucun résumé de chapitre ne contient le nom de son livre', () => {
    let masked = 0, total = 0;
    R.BOOKS.forEach((b, i) => {
        const summaries = SUMMARIES[b.file].chapters;
        assert.strictEqual(summaries.length, FILES[b.file].chapters.length, b.file + ' : un résumé par chapitre');
        for (let c = 1; c <= b.chapters; c++) {
            const raw = summaries[b.first + c - 1];
            assert.ok(typeof raw === 'string' && raw.length > 10, b.id + ' ' + c);
            const out = G.maskSummary(raw, i);
            total++;
            if (out !== raw) masked++;
            b.hide.forEach(name => assert.ok(!new RegExp('(^|[^\\p{L}])' + name + '(?![\\p{L}])', 'iu').test(out), b.id + ' ' + c + ' : « ' + name + ' » dans « ' + out + ' »'));
        }
    });
    assert.strictEqual(total, 742);                                  // un résumé pour chacun des 742 chapitres
    assert.ok(masked > 100, 'des résumés masqués : ' + masked);
});

// --- Le tirage ---------------------------------------------------------------------------------------------------------------------------------------
test('pickBooks : des livres distincts, plus de livres que demandé jamais, reproductible', () => {
    for (let seed = 1; seed <= 100; seed++) {
        const books = G.pickBooks(5, seeded(seed));
        assert.strictEqual(books.length, 5);
        assert.strictEqual(new Set(books).size, 5);
        books.forEach(b => assert.ok(b >= 0 && b < 34));
    }
    assert.deepStrictEqual(G.pickBooks(5, seeded(7)), G.pickBooks(5, seeded(7)));
    assert.strictEqual(G.pickBooks(99, seeded(1)).length, 34);
});

test('pickBooks : un petit livre sort bien plus souvent que s\'il était tiré au prorata de sa taille', () => {
    const count = new Array(34).fill(0);
    const random = seeded(42);
    for (let g = 0; g < 4000; g++) G.pickBooks(5, random).forEach(b => count[b]++);
    const ruth = count[bookIndex('ruth')], psaumes = count[bookIndex('psaumes')];
    assert.ok(ruth > 0.1 * 4000 * 5 / 34, 'Ruth : ' + ruth);       // plus d'un dixième de sa part égale
    assert.ok(psaumes > ruth, 'les Psaumes sortent plus que Ruth');
    assert.ok(psaumes < 5 * ruth, 'mais pas dans le rapport des tailles (30 à 1) : ' + psaumes + ' contre ' + ruth);
});

test('pickVerse : toujours un verset qui laisse cinq indices dans le même livre', () => {
    R.BOOKS.forEach((b, i) => {
        const random = seeded(i + 1);
        for (let k = 0; k < 40; k++) {
            const v = G.pickVerse(i, random);
            const n = R.ordinal(i, v.chapter, v.verse);
            assert.ok(n >= 0 && n <= b.total - 1 - G.MAX_HINTS, b.id + ' ' + n);
        }
        assert.deepStrictEqual(G.pickVerse(i, () => 0), { chapter: 1, verse: 1 });
        assert.ok(R.ordinal(i, G.pickVerse(i, () => 0.999999).chapter, G.pickVerse(i, () => 0.999999).verse) === b.total - 1 - G.MAX_HINTS, b.id + ' : le dernier verset tirable');
    });
});

// --- Le mode « Livre » ---------------------------------------------------------------------------------------------------------------------------------
test('mode Livre : cinq questions, cent points, bonne réponse du premier coup', () => {
    const g = G.createGame({ rng: seeded(3) });
    assert.strictEqual(g.mode, 'book');
    assert.strictEqual(g.questions.length, 5);
    assert.strictEqual(g.points, 100);
    assert.strictEqual(g.shown, 1);
    assert.strictEqual(g.stage, 'book');
    const q = G.question(g);
    assert.strictEqual(q.type, 'verse');
    assert.strictEqual(G.guessBook(g, q.book).join(), 'right');
    assert.strictEqual(g.resolved, 'right');
    assert.strictEqual(g.score, 100);
    assert.strictEqual(g.found, 1);
    assert.strictEqual(G.guessBook(g, q.book).length, 0);       // déjà résolu
    assert.strictEqual(G.next(g).length, 0);
    assert.strictEqual(g.points, 100);                          // la manche suivante repart de cent
    assert.strictEqual(g.index, 1);
});

test('mode Livre : une mauvaise réponse coûte 20 points et écarte le livre ; un livre essayé ne compte pas deux fois', () => {
    const g = G.createGame({ picks: picks() });
    const q = G.question(g);
    const josue = bookIndex('josue'), wrong = bookIndex('juges');
    assert.strictEqual(G.guessBook(g, wrong).join(), 'wrong');
    assert.strictEqual(g.points, 80);
    assert.deepStrictEqual(g.wrong, [wrong]);
    assert.strictEqual(G.guessBook(g, wrong).length, 0);
    assert.strictEqual(g.points, 80);
    assert.strictEqual(G.guessBook(g, josue).join(), 'right');
    assert.strictEqual(q.book, josue);
    assert.strictEqual(g.score, 80);
});

test('mode Livre : un indice coûte 20 points, montre le verset suivant, cinq au plus ; à zéro le livre est dévoilé', () => {
    const g = G.createGame({ picks: picks() });
    for (let k = 1; k <= 4; k++) { assert.strictEqual(G.hint(g).join(), 'hint'); assert.strictEqual(g.shown, 1 + k); assert.strictEqual(g.points, 100 - 20 * k); }
    assert.strictEqual(G.hint(g).join(), 'hint,revealed');
    assert.strictEqual(g.points, 0);
    assert.strictEqual(g.resolved, 'revealed');
    assert.strictEqual(g.score, 0);
    assert.strictEqual(g.found, 0);
    assert.strictEqual(G.hint(g).length, 0);
    assert.strictEqual(G.guessBook(g, 0).length, 0);
    const h = G.createGame({ picks: picks() });
    const wrong = [0, 1, 2, 3, 4, 5].filter(i => i !== G.question(h).book).slice(0, 5);
    const events = wrong.map(b => G.guessBook(h, b).join());
    assert.deepStrictEqual(events, ['wrong', 'wrong', 'wrong', 'wrong', 'wrong,revealed']);
    assert.strictEqual(h.resolved, 'revealed');
});

test('shownVerses : le verset tiré, puis les suivants, le chapitre suivant compris ; jamais en dehors du livre', () => {
    const g = G.createGame({ picks: [{ book: bookIndex('josue'), chapter: 1, verse: 17 }] });
    let shown = G.shownVerses(FILES, g);
    assert.strictEqual(shown.length, 1);
    assert.strictEqual(shown[0].ref, 'Josué 1:17');
    assert.ok(shown[0].he.length > 0 && shown[0].fr.length > 0);
    G.hint(g); G.hint(g);
    shown = G.shownVerses(FILES, g);
    assert.deepStrictEqual(shown.map(v => v.ref), ['Josué 1:17', 'Josué 1:18', 'Josué 2:1']);
    // Tout verset tirable donne ses cinq indices dans le même livre.
    R.BOOKS.forEach((b, i) => {
        const v = G.pickVerse(i, () => 0.999999);
        const s = G.createGame({ picks: [{ book: i, chapter: v.chapter, verse: v.verse }] });
        for (let k = 0; k < 4; k++) G.hint(s);
        const refs = G.shownVerses(FILES, s);
        assert.strictEqual(refs.length, 5, b.id);
        refs.forEach(r => assert.ok(r.ref.startsWith(b.fr + ' '), b.id + ' : ' + r.ref));
    });
});

test('texte des versets : sur tout le Nakh, aucun verset ne garde de marque de la source ; seuls Josué 21:36-37 n\'ont pas de traduction', () => {
    const noFrench = [];
    R.BOOKS.forEach((b, i) => {
        for (let n = 0; n < b.total; n++) {
            const r = R.at(i, n);
            const v = G.verseText(FILES, i, r.chapter, r.verse);
            assert.ok(v.he.length > 0, v.ref);
            assert.ok(!/[#\[\]{}]|\((?:פ|ס)\)/.test(v.he), v.ref + ' : ' + v.he);
            if (!v.fr.trim()) noFrench.push(v.ref);
        }
    });
    // La Bible du Rabbinat omet ces deux versets : le jeu les montre en hébreu seul (l'écran n'affiche pas de ligne vide).
    assert.deepStrictEqual(noFrench, ['Josué 21:36', 'Josué 21:37']);
});

// --- Le mode « Livre et chapitre » -------------------------------------------------------------------------------------------------------------------
test('mode Livre et chapitre : le bon livre ne termine pas la question, il ouvre le chapitre', () => {
    const g = G.createGame({ mode: 'chapter', picks: picks() });
    const q = G.question(g);
    assert.strictEqual(G.guessChapter(g, 6).length, 0);                // pas avant le livre
    assert.strictEqual(G.guessBook(g, q.book).join(), 'book');
    assert.strictEqual(g.stage, 'chapter');
    assert.strictEqual(g.resolved, null);
    assert.strictEqual(g.score, 0);
    assert.strictEqual(G.guessBook(g, q.book).length, 0);              // on ne redonne pas le livre
    assert.strictEqual(G.guessBook(g, 0).length, 0);
});

test('mode Livre et chapitre : chapitre exact, tous les points restants', () => {
    const g = G.createGame({ mode: 'chapter', picks: picks() });
    G.guessBook(g, bookIndex('juges'));                                // −20
    G.guessBook(g, bookIndex('josue'));
    assert.strictEqual(G.guessChapter(g, 6).join(), 'right');
    assert.strictEqual(g.distance, 0);
    assert.strictEqual(g.kept, 1);
    assert.strictEqual(g.points, 80);
    assert.strictEqual(g.score, 80);
    assert.strictEqual(g.found, 1);
    assert.strictEqual(g.resolved, 'right');
    assert.strictEqual(G.guessChapter(g, 6).length, 0);                // un seul essai
    assert.strictEqual(g.results[0].points, 80);
});

test('mode Livre et chapitre : un chapitre voisin garde une part des points, plus loin moins, très loin rien mais le livre compte', () => {
    const play = (id, chapter, verse, guess, setup) => {
        const g = G.createGame({ mode: 'chapter', picks: [{ book: bookIndex(id), chapter, verse }] });
        if (setup) setup(g);
        G.guessBook(g, bookIndex(id));
        G.guessChapter(g, guess);
        return g;
    };
    // Isaïe (66 chapitres, tolérance 6) : à un chapitre 85, à deux 67 → 65, à trois 50, à six rien.
    assert.strictEqual(play('isaie', 40, 1, 41).score, 85);
    assert.strictEqual(play('isaie', 40, 1, 38).score, 65);
    assert.strictEqual(play('isaie', 40, 1, 43).score, 50);
    const far = play('isaie', 40, 1, 46);
    assert.strictEqual(far.score, 0);
    assert.strictEqual(far.found, 1);                                  // le livre est trouvé
    assert.strictEqual(far.resolved, 'right');
    assert.strictEqual(far.distance, 6);
    // Ruth (4 chapitres, tolérance 2) : à un chapitre la moitié, à deux rien.
    assert.strictEqual(play('ruth', 2, 3, 3).score, 50);
    assert.strictEqual(play('ruth', 1, 3, 3).score, 0);
    // La perte de points du livre (un indice) s'applique d'abord, la part du chapitre ensuite : 80 × 5/6 = 66,7 → 65.
    const hinted = play('isaie', 40, 1, 41, g => G.hint(g));
    assert.strictEqual(hinted.score, 65);
    // Jamais plus de 100, jamais de négatif.
    R.BOOKS.forEach((b, i) => { const g = G.createGame({ mode: 'chapter', picks: [{ book: i, chapter: 1, verse: 1 }] }); G.guessBook(g, i); G.guessChapter(g, b.chapters); assert.ok(g.score >= 0 && g.score <= 100, b.id); });
});

test('mode Livre et chapitre : chapitre hors du livre refusé ; mauvais livre comme en mode Livre ; indice après le livre permis', () => {
    const g = G.createGame({ mode: 'chapter', picks: picks() });
    const q = G.question(g);
    assert.strictEqual(G.guessBook(g, bookIndex('amos')).join(), 'wrong');
    assert.strictEqual(g.points, 80);
    G.guessBook(g, q.book);
    assert.strictEqual(G.guessChapter(g, 0).length, 0);
    assert.strictEqual(G.guessChapter(g, 25).length, 0);                // Josué n'a que 24 chapitres
    assert.strictEqual(G.guessChapter(g, 2.5).length, 0);
    assert.strictEqual(G.hint(g).join(), 'hint');
    assert.strictEqual(g.points, 60);
    assert.strictEqual(G.guessChapter(g, 6).join(), 'right');
    assert.strictEqual(g.score, 60);
});

test('mode Livre et chapitre : un indice qui fait tomber les points à zéro dévoile la réponse', () => {
    const g = G.createGame({ mode: 'chapter', picks: picks() });
    G.guessBook(g, G.question(g).book);
    ['hint', 'hint', 'hint', 'hint'].forEach(() => G.hint(g));
    assert.strictEqual(g.points, 20);
    assert.strictEqual(G.hint(g).join(), 'hint,revealed');
    assert.strictEqual(g.resolved, 'revealed');
    assert.strictEqual(G.guessChapter(g, 6).length, 0);
    assert.strictEqual(g.score, 0);
});

test('une partie complète en mode Livre et chapitre : cinq questions, le score est la somme des points', () => {
    const g = G.createGame({ mode: 'chapter', rng: seeded(11) });
    let events;
    do {
        const q = G.question(g);
        G.guessBook(g, q.book);
        G.guessChapter(g, q.chapter);
        events = G.next(g);
    } while (!events.includes('done'));
    assert.strictEqual(g.score, 500);
    assert.strictEqual(g.found, 5);
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.results.length, 5);
});

// --- Le mode « Contenu » -------------------------------------------------------------------------------------------------------------------------------
test('mode Contenu : le résumé du chapitre sans le nom du livre, cinq essais à 100, 80, 60, 40, 20 points', () => {
    const g = G.createContentGame({ summaries: SUMMARIES, picks: [{ book: bookIndex('josue'), chapter: 2 }, { book: bookIndex('ruth'), chapter: 1 }] });
    assert.strictEqual(g.mode, 'content');
    const q = G.question(g);
    assert.strictEqual(q.type, 'content');
    assert.ok(q.summary.includes('espions') && !/Josué/.test(q.summary), q.summary);
    assert.strictEqual(G.hint(g).length, 0);                            // pas d'indice
    const wrong = [0, 1, 2, 3].filter(i => i !== q.book).slice(0, 3);
    wrong.forEach((b, k) => { assert.strictEqual(G.guessBook(g, b).join(), 'wrong'); assert.strictEqual(g.points, 80 - 20 * k); });
    assert.strictEqual(G.guessBook(g, wrong[0]).length, 0);
    assert.strictEqual(G.guessBook(g, q.book).join(), 'right');
    assert.strictEqual(g.score, 40);
    G.next(g);
    const q2 = G.question(g);
    assert.ok(!/Ruth/.test(q2.summary), q2.summary);
    const tries = [0, 1, 2, 3, 4].filter(i => i !== q2.book).slice(0, 4).map(b => G.guessBook(g, b).join());
    assert.deepStrictEqual(tries, ['wrong', 'wrong', 'wrong', 'wrong']);
    assert.strictEqual(g.points, 20);
    assert.strictEqual(G.guessBook(g, [5, 6, 7, 8].find(i => i !== q2.book && g.wrong.indexOf(i) < 0)).join(), 'wrong,revealed');
    assert.strictEqual(g.resolved, 'revealed');
    assert.strictEqual(g.score, 40);
});

test('mode Contenu : le tirage donne cinq livres distincts, un chapitre valable de chacun', () => {
    for (let seed = 1; seed <= 80; seed++) {
        const g = G.createContentGame({ summaries: SUMMARIES, rng: seeded(seed) });
        assert.strictEqual(g.questions.length, 5);
        assert.strictEqual(new Set(g.questions.map(q => q.book)).size, 5);
        g.questions.forEach(q => {
            assert.ok(q.chapter >= 1 && q.chapter <= R.BOOKS[q.book].chapters);
            assert.ok(q.summary.length > 10, q.id);
        });
    }
});

// --- À plusieurs ------------------------------------------------------------------------------------------------------------------------------------
test('à plusieurs : au moins trois tours par joueur, les points vont à celui qui répond', () => {
    Quiz.setPendingPlayers(['Ana', 'Ben']);
    const g = G.createGame({ rng: seeded(5) });
    assert.ok(g.multi);
    assert.strictEqual(g.questions.length, 6);
    assert.strictEqual(new Set(g.questions.map(q => q.book)).size, 6);
    G.guessBook(g, G.question(g).book);             // Ana : 100
    G.next(g);
    G.hint(g);                                      // Ben : un indice, puis le bon livre
    G.guessBook(g, G.question(g).book);             // 80
    G.next(g);
    assert.strictEqual(g.multi.players[0].score, 100);
    assert.strictEqual(g.multi.players[1].score, 80);
    Quiz.setPendingPlayers(null);
    Quiz.setPendingPlayers(['Ana', 'Ben', 'Cal']);
    const c = G.createContentGame({ summaries: SUMMARIES, rng: seeded(6) });
    assert.strictEqual(c.questions.length, 9);
    Quiz.setPendingPlayers(null);
});
