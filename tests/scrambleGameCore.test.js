const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const S = require('../js/scrambleGameCore.js');
const V = require('../js/verseGameCore.js');
const R = require('../js/torahRefs.js');
const BOOKS = R.BOOK_IDS.map(id => JSON.parse(fs.readFileSync('data/tanakh/' + id + '.json', 'utf8')));

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const idx = (book, chapter, verse) => R.indexOf({ book, chapter, verse });
const GEN_1_1 = idx(1, 1, 1);   // « Au commencement » : 7 mots

test('words : le maqaf lie deux mots en un seul, les marques de la source sont retirées', () => {
    assert.deepStrictEqual(S.words('עַל־הָאָ֖רֶץ וַיְהִי־כֵן׃ (פ)'), ['עַל־הָאָ֖רֶץ', 'וַיְהִי־כֵן׃']);
    assert.strictEqual(S.words(V.verse(BOOKS, GEN_1_1).he).length, 7);
});

test('eligible : trois niveaux, la formule et les versets trop courts sont exclus', () => {
    assert.strictEqual(S.eligible(V.verse(BOOKS, GEN_1_1).he, 'moyen'), true);
    assert.strictEqual(S.eligible(V.verse(BOOKS, GEN_1_1).he, 'court'), false);
    assert.strictEqual(S.eligible('וַיְדַבֵּ֥ר יְהוָ֖ה אֶל־מֹשֶׁ֥ה לֵּאמֹֽר׃', 'all'), false);
    assert.strictEqual(S.eligible('אֶחָד שְׁנַיִם', 'all'), false);
    assert.strictEqual(S.eligible('אֶחָד אֶחָד אֶחָד אֶחָד', 'all'), false);   // pas trois mots différents
    const counts = { all: 0, court: 0, moyen: 0, long: 0 };
    for (let i = 0; i < R.TOTAL; i++) { const he = V.verse(BOOKS, i).he; Object.keys(counts).forEach(l => { if (S.eligible(he, l)) counts[l]++; }); }
    assert.ok(counts.court >= 300 && counts.moyen >= 1000 && counts.long >= 1000, JSON.stringify(counts));
    assert.strictEqual(counts.court + counts.moyen + counts.long, counts.all);
});

test('scramble : mêmes mots, jamais dans l\'ordre du verset', () => {
    for (let seed = 1; seed <= 200; seed++) {
        const w = S.words(V.verse(BOOKS, GEN_1_1 + seed).he);
        if (w.length < 4) continue;
        const m = S.scramble(w, seeded(seed));
        assert.deepStrictEqual(m.slice().sort(), w.slice().sort());
        assert.notStrictEqual(m.join(' '), w.join(' '));
    }
});

test('pick : des versets distincts, tous du niveau demandé', () => {
    ['all', 'court', 'moyen', 'long'].forEach(level => {
        for (let seed = 1; seed <= 20; seed++) {
            const list = S.pick(BOOKS, level, seeded(seed), S.ROUNDS);
            assert.strictEqual(list.length, S.ROUNDS);
            assert.strictEqual(new Set(list).size, S.ROUNDS);
            list.forEach(i => assert.ok(S.eligible(V.verse(BOOKS, i).he, level), level + ' ' + i));
        }
    });
});

function game(index) { return S.createGame({ books: BOOKS, indices: [index, index + 1], rng: seeded(7) }); }
const answer = g => S.question(g).words.slice();

test('une bonne réponse du premier coup : 100 points, tout est fixé', () => {
    const g = game(GEN_1_1);
    assert.strictEqual(g.points, 100);
    assert.deepStrictEqual(S.check(g, answer(g)), ['right']);
    assert.strictEqual(g.score, 100);
    assert.strictEqual(g.resolved, 'right');
    assert.strictEqual(S.lockedCount(g), S.question(g).words.length);
});

test('une vérification fausse : −20 points, les mots bien placés restent fixés, le même arrangement n\'est pas rejoué', () => {
    const g = game(GEN_1_1);
    const w = answer(g);
    const bad = w.slice(); const t = bad[0]; bad[0] = bad[1]; bad[1] = t;           // deux mots échangés
    assert.deepStrictEqual(S.check(g, bad), ['wrong']);
    assert.strictEqual(g.points, 80);
    assert.strictEqual(S.lockedCount(g), w.length - 2);
    assert.deepStrictEqual(S.fixedWords(g).map(x => x === null), w.map((_, i) => i < 2));
    assert.deepStrictEqual(S.check(g, bad), []);                                   // déjà essayé : rien ne change
    assert.strictEqual(g.points, 80);
    assert.deepStrictEqual(S.remainingPool(g).sort(), [w[0], w[1]].sort());       // il ne reste à placer que les deux mots mal posés
    assert.deepStrictEqual(S.check(g, w), ['right']);
    assert.strictEqual(g.score, 80);
});

test('une liste incomplète ou abîmée ne compte pas', () => {
    const g = game(GEN_1_1);
    assert.deepStrictEqual(S.check(g, answer(g).slice(1)), []);
    assert.deepStrictEqual(S.check(g, answer(g).map((x, i) => (i === 0 ? null : x))), []);
    assert.strictEqual(g.points, 100);
});

test('indice : le premier mot se place seul pour 20 points, trois au plus, jamais jusqu\'au dernier mot', () => {
    const g = game(idx(1, 1, 3));
    const w = answer(g);
    assert.deepStrictEqual(S.hint(g), ['hint']);
    assert.strictEqual(g.points, 80);
    assert.strictEqual(S.fixedWords(g)[0], w[0]);
    assert.strictEqual(S.lockedCount(g), 1);
    S.hint(g); S.hint(g);
    assert.strictEqual(S.lockedCount(g), 3);
    assert.deepStrictEqual(S.hint(g), []);                                          // trois indices au plus
    const g2 = S.createGame({ books: BOOKS, indices: [idx(1, 1, 5)], rng: seeded(1) });   // 4 mots : un seul indice possible avant qu'il ne reste que deux places
    assert.ok(S.question(g2).words.length >= 4);
    S.hint(g2); S.hint(g2);
    assert.ok(S.question(g2).words.length - S.lockedCount(g2) >= 2);
});

test('à zéro point, le verset est dévoilé : rien n\'est gagné, tout est fixé', () => {
    const g = game(GEN_1_1);
    const w = answer(g);
    assert.strictEqual(new Set(w).size, w.length);
    S.hint(g); S.hint(g); S.hint(g);                                                // 40 points en jeu, trois mots fixés
    const rotate = k => w.slice(0, 3).concat(w.slice(3).map((_, i, r) => r[(i + k) % r.length]));   // les quatre mots libres décalés : aucun à sa place
    assert.deepStrictEqual(S.check(g, rotate(1)), ['wrong']);
    assert.strictEqual(g.points, 20);
    assert.strictEqual(S.lockedCount(g), 3);
    assert.deepStrictEqual(S.check(g, rotate(2)), ['wrong', 'revealed']);
    assert.strictEqual(g.points, 0);
    assert.strictEqual(g.resolved, 'revealed');
    assert.strictEqual(g.score, 0);
    assert.strictEqual(S.lockedCount(g), w.length);
    assert.deepStrictEqual(g.results[0], { id: S.question(g).id, right: false, revealed: true, hints: 3, wrong: 2, points: 0 });
});

test('partie complète : deux versets, suite, fin et score', () => {
    const g = game(GEN_1_1);
    assert.deepStrictEqual(S.next(g), []);                                          // pas résolu : rien
    S.check(g, answer(g));
    assert.deepStrictEqual(S.next(g), []);
    assert.strictEqual(g.index, 1);
    assert.strictEqual(g.points, 100);                                              // manche remise à neuf
    assert.strictEqual(S.lockedCount(g), 0);
    S.check(g, answer(g));
    assert.deepStrictEqual(S.next(g), ['done']);
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.score, 200);
    assert.strictEqual(g.found, 2);
});

test('mots en double : le tas retire la bonne pièce, et l\'ordre exact est exigé', () => {
    // Un verset avec un mot répété : le tas garde le doublon tant qu\'il n\'est pas fixé deux fois.
    let found = null;
    for (let i = 0; i < R.TOTAL && !found; i++) {
        const he = V.verse(BOOKS, i).he;
        if (!S.eligible(he, 'all')) continue;
        const w = S.words(he);
        if (w[0] === w[w.length - 1] || w.some((x, k) => w.indexOf(x) !== k)) found = i;
    }
    assert.ok(found !== null);
    const g = game(found);
    const w = answer(g);
    const dup = w.find((x, k) => w.indexOf(x) !== k);
    assert.ok(S.remainingPool(g).filter(x => x === dup).length >= 2);
    assert.deepStrictEqual(S.check(g, w), ['right']);
});

test('à plusieurs : assez de versets pour que chacun en ait trois', () => {
    const Q = require('../js/quizCore.js');
    Q.setPendingPlayers(['Anna', 'Ben']);
    const g = S.createGame({ books: BOOKS, rng: seeded(3) });
    assert.strictEqual(g.questions.length, 6);
    assert.strictEqual(g.multi.players.length, 2);
    const solo = S.createGame({ books: BOOKS, rng: seeded(3) });
    assert.strictEqual(solo.questions.length, 5);
    assert.strictEqual(solo.multi, undefined);
});
