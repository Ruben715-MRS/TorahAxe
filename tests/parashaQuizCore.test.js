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
        assert.strictEqual(g.maxScore, g.questions.length * level * 100);
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
