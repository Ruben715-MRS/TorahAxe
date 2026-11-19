const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const P = require('../js/parashaQuizCore.js');
const Quiz = require('../js/quizCore.js');

const DATA = JSON.parse(fs.readFileSync('data/torah/quiz/vayetse.json', 'utf8'));
function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const game = (seed, rounds) => P.createGame({ data: DATA, rng: seeded(seed || 1), rounds: rounds });
const right = g => P.answer(g, P.question(g).answer);
const wrong = g => P.answer(g, (P.question(g).answer + 1) % P.question(g).options.length);

test('départ : six tours vides, aucun niveau choisi, quinze questions disponibles', () => {
    const g = game();
    assert.strictEqual(g.questions.length, 6);
    assert.strictEqual(P.pending(g), true);
    assert.strictEqual(P.question(g), null);
    assert.deepStrictEqual(P.available(g), { 1: 5, 2: 5, 3: 5 });
    assert.strictEqual(g.score, 0);
});

test('choix du niveau : la question de ce niveau est tirée, une fois, et le tour n\'attend plus', () => {
    const g = game();
    assert.deepStrictEqual(P.choose(g, 2), ['chosen']);
    const q = P.question(g);
    assert.strictEqual(q.level, 2);
    assert.strictEqual(q.options.length, 4);
    assert.strictEqual(q.options[q.answer].label, q.a);
    assert.strictEqual(P.pending(g), false);
    assert.deepStrictEqual(P.choose(g, 1), [], 'une fois la question tirée, on ne rechoisit pas');
    assert.deepStrictEqual(P.available(g), { 1: 5, 2: 4, 3: 5 });
    assert.deepStrictEqual(P.choose(game(), 4), []);
});

test('points : 100, 200 ou 300 pour une bonne réponse, rien pour une mauvaise ; le total possible suit les niveaux choisis', () => {
    const g = game(3);
    P.choose(g, 1); assert.deepStrictEqual(right(g), ['right']); P.next(g);
    P.choose(g, 2); assert.deepStrictEqual(right(g), ['right']); P.next(g);
    P.choose(g, 3); assert.deepStrictEqual(right(g), ['right']); P.next(g);
    assert.strictEqual(g.score, 600);
    P.choose(g, 3); assert.deepStrictEqual(wrong(g), ['wrong']); P.next(g);
    assert.strictEqual(g.score, 600);
    assert.strictEqual(g.maxScore, 100 + 200 + 300 + 300);
    assert.strictEqual(g.found, 3);
});

test('partie solo : pas de vol de question, six tours, fin', () => {
    const g = game(4);
    for (let i = 0; i < 6; i++) {
        P.choose(g, 1 + (i % 3));
        wrong(g);
        assert.strictEqual(g.questions.length, 6);
        const events = P.next(g);
        assert.deepStrictEqual(events, i === 5 ? ['done'] : []);
        if (i < 5) assert.strictEqual(P.pending(g), true, 'solo : le tour suivant attend un niveau');
    }
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.score, 0);
});

test('un niveau épuisé ne se choisit plus ; la partie se joue tant qu\'il reste une question', () => {
    const g = game(5, 6);
    for (let i = 0; i < 5; i++) { P.choose(g, 3); right(g); P.next(g); }
    assert.strictEqual(P.available(g)[3], 0);
    assert.deepStrictEqual(P.choose(g, 3), []);
    assert.strictEqual(P.playable(g), true);
    assert.deepStrictEqual(P.choose(g, 1), ['chosen']);
});

test('jamais plus de tours que de questions', () => {
    const small = { parasha: 'X', levels: { 1: DATA.levels['1'].slice(0, 2), 2: [], 3: [] } };
    assert.strictEqual(P.createGame({ data: small, rng: seeded(1) }).questions.length, 2);
    assert.strictEqual(P.createGame({ data: { levels: {} }, rng: seeded(1) }).empty, true);
});

test('à plusieurs : une mauvaise réponse donne la même question au joueur suivant, sans la réponse déjà essayée, aux mêmes points', () => {
    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const g = game(6);
    assert.ok(g.multi);
    assert.strictEqual(g.questions.length, 6);
    P.choose(g, 3);
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
    assert.strictEqual(P.pending(g), false, 'la question volée est déjà là : pas de choix de niveau');
    assert.strictEqual(Quiz.currentPlayer(g).name, 'Ben');
    assert.deepStrictEqual(right(g), ['right']);
    P.next(g);                                 // les points sont versés au joueur à ce moment-là (quizCore.next)
    assert.strictEqual(g.multi.players[1].score, 300, 'Ben gagne les points du niveau 3');
    assert.strictEqual(g.multi.players[0].score, 0);
    assert.strictEqual(Quiz.currentPlayer(g).name, 'Anna');
    assert.strictEqual(P.pending(g), true);
    Quiz.setPendingPlayers(null);
});

test('à plusieurs : une question volée ratée ne se vole pas une seconde fois ; le dernier tour ne vole rien ; chacun a autant de tours', () => {
    Quiz.setPendingPlayers(['Anna', 'Ben', 'Chloé']);
    const g = game(7);
    assert.strictEqual(g.questions.length, 9);
    P.choose(g, 1);
    wrong(g); P.next(g);                       // Anna rate : Ben peut voler
    assert.ok(g.questions[1].steal);
    wrong(g); P.next(g);                       // Ben rate aussi : pas de seconde vol
    assert.strictEqual(g.questions[2], null);
    assert.strictEqual(P.pending(g), true);
    // jusqu'au dernier tour : une mauvaise réponse ne crée rien
    while (g.index < g.questions.length - 1) { if (P.pending(g)) P.choose(g, 1 + (g.index % 3)); wrong(g); P.next(g); }
    P.choose(g, 1);
    const last = g.questions.length;
    wrong(g);
    assert.strictEqual(g.questions.length, last);
    P.next(g);
    assert.strictEqual(g.over, true);
    Quiz.setPendingPlayers(null);
});
