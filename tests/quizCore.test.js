const test = require('node:test');
const assert = require('node:assert');
const Q = require('../js/quizCore.js');

const qs = () => [
    { id: 'a', type: 't', options: [{ label: 'x' }, { label: 'y' }, { label: 'z' }, { label: 'w' }], answer: 2 },
    { id: 'b', type: 't', options: [{ label: 'x' }, { label: 'y' }, { label: 'z' }, { label: 'w' }], answer: 0 }
];

test('shuffle : copie, mêmes éléments, déterministe avec un générateur fixe', () => {
    const src = [1, 2, 3, 4, 5];
    const out = Q.shuffle(src, () => 0);
    assert.deepStrictEqual(src, [1, 2, 3, 4, 5]);
    assert.deepStrictEqual(out.slice().sort(), [1, 2, 3, 4, 5]);
    assert.deepStrictEqual(Q.shuffle(src, () => 0), out);
});

test('createState : partie neuve, champs propres recopiés, partie vide détectée', () => {
    const s = Q.createState(qs(), { section: 'all' });
    assert.strictEqual(s.section, 'all');
    assert.strictEqual(s.index, 0);
    assert.strictEqual(s.over, false);
    assert.strictEqual(Q.createState([]).empty, true);
    assert.strictEqual(Q.createState([]).over, true);
});

test('answer : bonne réponse 100 points, mauvaise 0, une seule réponse par question', () => {
    const s = Q.createState(qs());
    assert.deepStrictEqual(Q.answer(s, 1), ['wrong']);
    assert.strictEqual(s.score, 0);
    assert.strictEqual(s.picked, 1);
    assert.deepStrictEqual(Q.answer(s, 2), []);
    assert.deepStrictEqual(Q.next(s), []);
    assert.deepStrictEqual(Q.answer(s, 0), ['right']);
    assert.strictEqual(s.score, Q.POINTS);
    assert.strictEqual(s.found, 1);
    assert.deepStrictEqual(s.results.map(r => [r.id, r.right]), [['a', false], ['b', true]]);
});

test('answer : proposition hors liste ou avant la réponse, next refusé', () => {
    const s = Q.createState(qs());
    assert.deepStrictEqual(Q.answer(s, 4), []);
    assert.deepStrictEqual(Q.answer(s, -1), []);
    assert.deepStrictEqual(Q.answer(s, undefined), []);
    assert.deepStrictEqual(Q.next(s), []);
});

test('next : ["done"] à la dernière question, puis plus rien ne bouge', () => {
    const s = Q.createState(qs());
    Q.answer(s, 2); assert.deepStrictEqual(Q.next(s), []);
    Q.answer(s, 0); assert.deepStrictEqual(Q.next(s), ['done']);
    assert.strictEqual(s.over, true);
    assert.deepStrictEqual(Q.answer(s, 0), []);
    assert.strictEqual(Q.question(s), null);
});

test('answer : `describe` décide de ce que les résultats gardent', () => {
    const s = Q.createState(qs());
    Q.answer(s, 2, (q, right) => ({ strong: q.id, right }));
    assert.deepStrictEqual(s.results, [{ strong: 'a', right: true }]);
});
