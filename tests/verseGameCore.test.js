const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const V = require('../js/verseGameCore.js');
const R = require('../js/torahRefs.js');
const PAR = require('../data/torah/parashot.json');
const BOOKS = R.BOOK_IDS.map(id => JSON.parse(fs.readFileSync('data/tanakh/' + id + '.json', 'utf8')));

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const idx = (book, chapter, verse) => R.indexOf({ book, chapter, verse });

test('cleanVerse : sans (פ) ni (ס), le qere à la place du ketiv, sans accolades ni dièse', () => {
    assert.strictEqual(V.cleanVerse('אֶחָֽד׃ (פ)'), 'אֶחָֽד׃');
    assert.strictEqual(V.cleanVerse('אֶחָֽד׃ (ס)'), 'אֶחָֽד׃');
    assert.strictEqual(V.cleanVerse('עַל־הָאָ֖רֶץ הוצא#[הַיְצֵ֣א] אִתָּ֑ךְ'), 'עַל־הָאָ֖רֶץ הַיְצֵ֣א אִתָּ֑ךְ');
    assert.ok(!/[#\[\]{}()]/.test(V.cleanVerse(BOOKS[0].chapters[7][16])));
});

test('toute la Torah : aucun verset ne garde de marque de la source une fois nettoyé', () => {
    for (let i = 0; i < R.TOTAL; i++) {
        const v = V.verse(BOOKS, i);
        assert.ok(v.he.length > 0 && v.fr.length > 0, v.ref);
        assert.ok(!/[#\[\]{}]|\((?:פ|ס)\)/.test(v.he), v.ref + ' : ' + v.he);
    }
});

test('isFormula : seule la formule « Vayédaber Hachem El Moché Lémor » est exclue', () => {
    assert.strictEqual(V.isFormula('וַיְדַבֵּ֥ר יְהוָ֖ה אֶל־מֹשֶׁ֥ה לֵּאמֹֽר׃'), true);
    assert.strictEqual(V.isFormula('וַיְדַבֵּ֤ר יְהוָה֙ אֶל־מֹשֶׁ֔ה לֵּאמֹֽר׃ (פ)'), true);
    assert.strictEqual(V.isFormula('וַיְדַבֵּ֣ר יְהוָ֔ה אֶל־מֹשֶׁ֖ה וְאֶֽל־אַהֲרֹ֑ן לֵּאמֹֽר׃'), false);   // une autre formule
    assert.strictEqual(V.isFormula('וַיְדַבֵּ֥ר יְהוָ֖ה אֶל־מֹשֶׁ֥ה לֵּאמֹֽר דַּבֵּ֕ר אֶל־בְּנֵ֥י יִשְׂרָאֵ֖ל'), false);   // la formule suivie d'autre chose
    assert.strictEqual(V.isFormula(V.verse(BOOKS, 0).he), false);
});

test('la formule existe bien dans les données (des dizaines) et aucun verset tiré n\'en est une', () => {
    let formulas = 0;
    for (let i = 0; i < R.TOTAL; i++) if (V.isFormula(V.verse(BOOKS, i).he)) formulas++;
    assert.ok(formulas >= 40 && formulas <= 120, 'formules trouvées : ' + formulas);
    for (let seed = 1; seed <= 60; seed++) V.pick(BOOKS, seeded(seed), V.ROUNDS).forEach(i => assert.strictEqual(V.isFormula(V.verse(BOOKS, i).he), false));
});

test('eligible : pas la formule, pas les cinq derniers versets de la Torah, et le premier verset de la Torah oui', () => {
    assert.strictEqual(V.eligible(BOOKS, 0), true);
    assert.strictEqual(V.eligible(BOOKS, R.TOTAL - 1), false);
    assert.strictEqual(V.eligible(BOOKS, R.TOTAL - 5), false);
    assert.strictEqual(V.eligible(BOOKS, R.TOTAL - 6), true);
    assert.strictEqual(V.eligible(BOOKS, -1), false);
    assert.strictEqual(V.eligible(BOOKS, R.TOTAL), false);
});

test('makeQuestion : la paracha du verset (Genèse 6:9 = Noa\'h, 6:8 = Béréchit)', () => {
    assert.strictEqual(V.makeQuestion(PAR, idx(1, 6, 9)).parashaFr, "Noa'h");
    assert.strictEqual(V.makeQuestion(PAR, idx(1, 6, 8)).parashaFr, 'Béréchit');
    assert.strictEqual(V.makeQuestion(PAR, idx(5, 6, 4)).label, 'Deutéronome 6:4');
});

test('pick : cinq versets distincts, de toute la Torah (les cinq livres se rencontrent)', () => {
    const books = new Set();
    for (let seed = 1; seed <= 80; seed++) {
        const picks = V.pick(BOOKS, seeded(seed), 5);
        assert.strictEqual(new Set(picks).size, 5);
        picks.forEach(i => books.add(R.refAt(i).book));
    }
    assert.strictEqual(books.size, 5);
});

test('un verset : bonne réponse du premier coup = 100 points', () => {
    const g = V.createGame({ parashot: PAR, indices: [idx(1, 6, 9), idx(2, 20, 2)] });
    assert.strictEqual(g.points, 100);
    assert.deepStrictEqual(V.guess(g, V.question(g).parasha), ['right']);
    assert.strictEqual(g.score, 100);
    assert.strictEqual(g.found, 1);
    assert.strictEqual(g.resolved, 'right');
    assert.deepStrictEqual(V.guess(g, 0), []);          // déjà résolu
    assert.deepStrictEqual(V.hint(g), []);
});

test('les indices : le verset suivant, 20 points chacun, 6 versets au plus, la paracha dévoilée à zéro', () => {
    const g = V.createGame({ parashot: PAR, indices: [idx(1, 1, 1)] });
    assert.strictEqual(V.shownVerses(BOOKS, g).length, 1);
    const pts = [];
    for (let i = 1; i <= 4; i++) { assert.deepStrictEqual(V.hint(g), ['hint']); pts.push(g.points); }
    assert.deepStrictEqual(pts, [80, 60, 40, 20]);
    assert.strictEqual(V.shownVerses(BOOKS, g).length, 5);
    assert.strictEqual(g.resolved, null);
    assert.deepStrictEqual(V.hint(g), ['hint', 'revealed']);       // 5e indice : 0 point, dévoilée
    assert.strictEqual(g.points, 0);
    assert.strictEqual(V.shownVerses(BOOKS, g).length, 6);
    assert.strictEqual(g.resolved, 'revealed');
    assert.deepStrictEqual(V.hint(g), []);
    assert.deepStrictEqual(V.guess(g, V.question(g).parasha), []);   // trop tard
    assert.strictEqual(g.score, 0);
    assert.deepStrictEqual(g.results[0], { id: V.question(g).id, right: false, revealed: true, hints: 5, wrong: 0, points: 0 });
});

test('les versets montrés se suivent, de part et d\'autre des chapitres et des livres', () => {
    const g = V.createGame({ parashot: PAR, indices: [idx(1, 50, 24)] });   // Genèse 50:24 -> 50:25, 50:26, puis Exode 1:1, 1:2, 1:3
    for (let i = 0; i < 5; i++) V.hint(g);
    assert.deepStrictEqual(V.shownVerses(BOOKS, g).map(v => v.ref), ['Genèse 50:24', 'Genèse 50:25', 'Genèse 50:26', 'Exode 1:1', 'Exode 1:2', 'Exode 1:3']);
});

test('une erreur coûte 20 points et écarte la paracha ; la même erreur deux fois ne compte pas ; la bonne réponse rapporte ce qui reste', () => {
    const g = V.createGame({ parashot: PAR, indices: [idx(1, 6, 9)] });
    const right = V.question(g).parasha;
    const wrong = right === 0 ? 1 : 0;
    assert.deepStrictEqual(V.guess(g, wrong), ['wrong']);
    assert.strictEqual(g.points, 80);
    assert.deepStrictEqual(V.guess(g, wrong), []);
    assert.strictEqual(g.points, 80);
    V.hint(g);
    assert.strictEqual(g.points, 60);
    assert.deepStrictEqual(V.guess(g, right), ['right']);
    assert.strictEqual(g.score, 60);
});

test('cinq erreurs (ou erreurs et indices) : zéro point, la paracha est dévoilée', () => {
    const g = V.createGame({ parashot: PAR, indices: [idx(1, 6, 9)] });
    const right = V.question(g).parasha;
    const wrongs = [0, 1, 2, 3, 4, 5].filter(p => p !== right);
    assert.deepStrictEqual(V.guess(g, wrongs[0]), ['wrong']);
    V.hint(g);
    assert.deepStrictEqual(V.guess(g, wrongs[1]), ['wrong']);
    V.hint(g);
    assert.strictEqual(g.points, 20);
    assert.deepStrictEqual(V.guess(g, wrongs[2]), ['wrong', 'revealed']);
    assert.strictEqual(g.points, 0);
    assert.strictEqual(g.resolved, 'revealed');
    assert.strictEqual(g.results[0].wrong, 3);
});

test('une partie : on passe au verset suivant, les points se remettent à 100, ["done"] à la fin', () => {
    const g = V.createGame({ parashot: PAR, indices: [idx(1, 6, 9), idx(2, 20, 2), idx(5, 6, 4)] });
    assert.deepStrictEqual(V.next(g), []);                          // pas encore résolu
    V.guess(g, V.question(g).parasha);
    assert.deepStrictEqual(V.next(g), []);
    assert.strictEqual(g.points, 100);
    assert.strictEqual(g.shown, 1);
    assert.deepStrictEqual(g.wrong, []);
    V.hint(g); V.hint(g);
    V.guess(g, V.question(g).parasha);
    assert.strictEqual(g.score, 100 + 60);
    assert.deepStrictEqual(V.next(g), []);
    V.guess(g, V.question(g).parasha);
    assert.deepStrictEqual(V.next(g), ['done']);
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.score, 260);
    assert.strictEqual(g.found, 3);
});

test('createGame au hasard : cinq versets, 500 points au plus', () => {
    const g = V.createGame({ books: BOOKS, parashot: PAR, rng: seeded(21) });
    assert.strictEqual(g.questions.length, 5);
    while (!g.over) { V.guess(g, V.question(g).parasha); V.next(g); }
    assert.strictEqual(g.score, 500);
});
