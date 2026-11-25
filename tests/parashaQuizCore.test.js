const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const P = require('../js/parashaQuizCore.js');
const Quiz = require('../js/quizCore.js');

const DATA = JSON.parse(fs.readFileSync('data/torah/quiz/vayetse.json', 'utf8'));
function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const game = (level, seed, rounds) => P.createGame({ data: DATA, level: level, rng: seeded(seed || 1), rounds: rounds });
const right = g => P.answer(g, P.question(g).answer);
const wrong = g => P.answer(g, (P.question(g).answer + 1) % P.question(g).options.length);

test('départ : les questions du niveau choisi seulement, six au plus, jamais plus que le niveau n\'en a', () => {
    [1, 2, 3].forEach(level => {
        const g = game(level, 2);
        assert.strictEqual(g.level, level);
        assert.strictEqual(g.questions.length, Math.min(6, P.poolOf(DATA, level).length));
        g.questions.forEach(q => assert.strictEqual(q.level, level));
        assert.strictEqual(g.maxScore, Math.round(g.questions.length * level * 100 * (1 + P.BONUS)), 'classé : le maximum possible, avec le bonus de rapidité');
    });
    assert.strictEqual(game(9, 1).level, 1, 'niveau inconnu : le niveau 1');
    const small = { parasha: 'X', levels: { 1: DATA.levels['1'].slice(0, 2), 2: [], 3: [] } };
    assert.strictEqual(P.createGame({ data: small, level: 1, rng: seeded(1) }).questions.length, 2);
    assert.strictEqual(P.createGame({ data: small, level: 2, rng: seeded(1) }).empty, true);
});

test('le niveau est tenu jusqu\'au bout : toutes les questions de la partie sont du niveau choisi, sans doublon', () => {
    for (let seed = 1; seed <= 20; seed++) {
        const g = game(3, seed);
        const ids = g.questions.map(q => q.q);
        assert.strictEqual(new Set(ids).size, ids.length);
        assert.ok(g.questions.every(q => q.level === 3 && q.rashi));
    }
});

test('points : 100, 200 ou 300 par bonne réponse selon le niveau, rien pour une mauvaise', () => {
    [1, 2, 3].forEach(level => {
        const g = game(level, 3);
        assert.deepStrictEqual(right(g), ['right']);
        P.next(g);
        assert.strictEqual(g.score, level * 100);
        assert.deepStrictEqual(wrong(g), ['wrong']);
        P.next(g);
        assert.strictEqual(g.score, level * 100);
        assert.strictEqual(g.found, 1);
    });
});

test('partie solo : pas de vol de question, fin après la dernière question', () => {
    const g = game(1, 4);
    const n = g.questions.length;
    for (let i = 0; i < n; i++) {
        wrong(g);
        assert.strictEqual(g.questions.length, n);
        assert.deepStrictEqual(P.next(g), i === n - 1 ? ['done'] : []);
    }
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.score, 0);
});

test('réponses avec hébreu : le texte et l\'hébreu de chaque proposition, la bonne retrouvée par son texte', () => {
    const named = P.poolOf(DATA, 1).filter(q => P.hebrewOf(q.a));
    assert.ok(named.length >= 3);
    for (let seed = 1; seed <= 20; seed++) {
        named.forEach(raw => {
            const q = P.prepare(raw, 1, seeded(seed));
            assert.ok(q.options.every(o => o.label && /[א-ת]/.test(o.he)));
            assert.strictEqual(q.options[q.answer].label, P.textOf(raw.a));
            assert.strictEqual(q.options[q.answer].he, P.hebrewOf(raw.a));
            assert.strictEqual(q.ah, P.hebrewOf(raw.a));
        });
    }
    const plain = P.prepare(DATA.levels['2'][0], 2, seeded(1));
    assert.ok(plain.options.every(o => o.he === ''));
});

test('à plusieurs : une mauvaise réponse donne la même question au joueur suivant, sans la réponse déjà essayée, aux mêmes points', () => {
    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const g = game(3, 6, 6);
    assert.ok(g.multi);
    assert.ok(g.questions.length % 2 === 0);
    const original = P.question(g);
    const picked = (original.answer + 1) % 4;
    assert.deepStrictEqual(P.answer(g, picked), ['wrong']);
    const stolen = g.questions[1];
    assert.ok(stolen && stolen.steal);
    assert.strictEqual(stolen.level, 3);
    assert.strictEqual(stolen.q, original.q);
    assert.strictEqual(stolen.options.length, 3);
    assert.ok(!stolen.options.some(o => o.label === original.options[picked].label), 'la réponse déjà essayée est retirée');
    assert.strictEqual(stolen.options[stolen.answer].label, original.a);
    P.next(g);
    assert.strictEqual(Quiz.currentPlayer(g).name, 'Ben');
    assert.deepStrictEqual(right(g), ['right']);
    P.next(g);                                 // les points sont versés au joueur à ce moment-là (quizCore.next)
    assert.strictEqual(g.multi.players[1].score, 300, 'Ben gagne les points du niveau 3');
    assert.strictEqual(g.multi.players[0].score, 0);
    Quiz.setPendingPlayers(null);
});

test('à plusieurs : une question volée ratée ne se vole pas une seconde fois ; le dernier tour ne vole rien', () => {
    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const g = game(1, 7, 6);
    const n = g.questions.length;
    wrong(g); P.next(g);
    assert.ok(g.questions[1].steal);
    const second = g.questions[2];
    wrong(g); P.next(g);                       // Ben rate la question volée : rien de plus n'est volé
    assert.strictEqual(g.questions[2], second);
    while (g.index < n - 1) { wrong(g); P.next(g); }
    const before = g.questions.length;
    wrong(g);
    assert.strictEqual(g.questions.length, before);
    P.next(g);
    assert.strictEqual(g.over, true);
    Quiz.setPendingPlayers(null);
});

// --- Classé : chronomètre et bonus de rapidité -------------------------------------------------------------------------------------------------

test('classé : le temps par question dépend du niveau (30, 45, 60 s), et la partie est chronométrée', () => {
    assert.strictEqual(P.limitOf(1), 30000);
    assert.strictEqual(P.limitOf(2), 45000);
    assert.strictEqual(P.limitOf(3), 60000);
    [1, 2, 3].forEach(level => {
        const g = game(level, 5);
        assert.strictEqual(g.mode, P.CLASSE);
        assert.strictEqual(g.timed, true);
        assert.strictEqual(g.limitMs, P.limitOf(level));
    });
});

test('bonus : une réponse immédiate rapporte 50 % de plus que le niveau, une réponse à l\'instant limite les points du niveau', () => {
    [1, 2, 3].forEach(level => {
        const base = P.pointsOf(level);
        assert.strictEqual(P.bonusOf(level, P.limitOf(level)), Math.round(base * 1.5));
        assert.strictEqual(P.bonusOf(level, 0), base, 'le plancher : les points du niveau restent acquis');
        assert.strictEqual(P.bonusOf(level, null), base, 'sans temps connu : les points du niveau');
        assert.strictEqual(P.bonusOf(level, P.limitOf(level) * 2), Math.round(base * 1.5), 'pas plus que le bonus maximum');
        const half = P.bonusOf(level, P.limitOf(level) / 2);
        assert.ok(half > base && half < Math.round(base * 1.5), 'le bonus décroît avec le temps');
    });
});

test('classé : la bonne réponse rapporte les points selon le temps restant, jamais moins que le niveau', () => {
    const g = game(2, 8);
    assert.deepStrictEqual(P.answer(g, P.question(g).answer, P.limitOf(2)), ['right']);
    assert.strictEqual(g.score, Math.round(200 * 1.5));
    assert.strictEqual(g.results[0].points, Math.round(200 * 1.5));
    P.next(g);
    assert.deepStrictEqual(P.answer(g, P.question(g).answer, 0), ['right']);
    assert.strictEqual(g.score, Math.round(200 * 1.5) + 200);
    assert.strictEqual(g.found, 2);
});

test('classé : un temps écoulé est une mauvaise réponse, sans point ; à plusieurs, la question est volée', () => {
    const solo = game(1, 9);
    assert.deepStrictEqual(P.timeout(solo), ['timeout']);
    assert.strictEqual(solo.resolved, 'wrong');
    assert.strictEqual(solo.results[0].timeout, true);
    assert.strictEqual(solo.score, 0);
    assert.deepStrictEqual(P.timeout(solo), [], 'pas deux fois sur la même question');
    assert.deepStrictEqual(P.answer(solo, 0), [], 'une question expirée ne se répond plus');

    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const multi = game(1, 10, 6);
    const original = P.question(multi);
    P.timeout(multi);
    const stolen = multi.questions[1];
    assert.ok(stolen.steal);
    assert.strictEqual(stolen.q, original.q);
    assert.strictEqual(stolen.options.length, original.options.length, 'un temps écoulé ne retire aucune proposition');
    Quiz.setPendingPlayers(null);
});

// --- Entraînement : tentatives illimitées, sans chrono ni score ------------------------------------------------------------------------------

const practice = (level, seed) => P.createGame({ data: DATA, level: level, mode: P.PRACTICE, rng: seeded(seed || 1) });

test('entraînement : toutes les questions du niveau, sans chrono, sans score ni maximum', () => {
    [1, 2, 3].forEach(level => {
        const g = practice(level, 3);
        assert.strictEqual(g.practice, true);
        assert.strictEqual(g.timed, false);
        assert.strictEqual(g.limitMs, null);
        assert.strictEqual(g.questions.length, P.poolOf(DATA, level).length);
        assert.strictEqual(g.maxScore, 0);
    });
});

test('entraînement : une mauvaise réponse retire la proposition, on réessaie jusqu\'à la bonne ; la bonne résout la question', () => {
    const g = practice(1, 4);
    const q = P.question(g);
    const picked = (q.answer + 1) % q.options.length;
    assert.deepStrictEqual(P.tryAnswer(g, picked), ['wrong']);
    assert.strictEqual(g.resolved, null, 'une erreur ne résout pas la question');
    assert.deepStrictEqual(P.tryAnswer(g, picked), [], 'une proposition déjà essayée ne compte pas deux fois');
    assert.deepStrictEqual(P.answer(g, picked), [], 'answer suit les mêmes règles qu\'en entraînement : une proposition déjà essayée ne compte pas');
    assert.deepStrictEqual(P.tryAnswer(g, q.answer), ['right']);
    assert.strictEqual(g.resolved, 'right');
    assert.strictEqual(g.score, 0, 'pas de points en entraînement');
    assert.strictEqual(g.found, 0, 'trouvée après une erreur : pas une bonne réponse du premier coup');
    assert.strictEqual(g.results[0].attempts, 1);
});

test('entraînement : « trouvées du premier coup » compte les bonnes réponses sans erreur, et les essais repartent à zéro', () => {
    const g = practice(2, 5);
    P.tryAnswer(g, P.question(g).answer);
    assert.strictEqual(g.found, 1);
    P.next(g);
    const q = P.question(g);
    P.tryAnswer(g, (q.answer + 1) % q.options.length);
    P.tryAnswer(g, q.answer);
    P.next(g);
    assert.strictEqual(g.found, 1);
    assert.strictEqual(g.attempts, 0);
    assert.deepStrictEqual(g.tried, []);
});

test('entraînement : jamais à plusieurs, même si une partie à plusieurs était annoncée ; la fin donne « over »', () => {
    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const g = practice(1, 6);
    assert.strictEqual(g.multi, undefined, 'pas de joueurs rattachés');
    assert.strictEqual(Quiz.roundsFor(6), 6, 'l\'annonce a été annulée');
    while (!g.over) {
        P.tryAnswer(g, P.question(g).answer);
        P.next(g);
    }
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.found, g.questions.length);
});
