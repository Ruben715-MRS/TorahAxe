const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/studyCore.js');

test('un magasin vide ou abîmé devient un magasin sûr, désactivé', () => {
    [null, 'x', 5, { done: 3 }, { on: 'oui', done: { daf: 'a', tehilim: [1.5, -2, 'z'] } }].forEach(raw => {
        const s = S.normalize(raw);
        assert.strictEqual(s.on, false);
        S.KINDS.forEach(k => assert.deepStrictEqual(s.done[k], []));
    });
});

test('cocher puis décocher un jour', () => {
    let s = S.normalize(null);
    s = S.toggle(s, 'daf', 740000);
    assert.strictEqual(S.isDone(s, 'daf', 740000), true);
    assert.strictEqual(S.isDone(s, 'tehilim', 740000), false);
    s = S.toggle(s, 'daf', 740000);
    assert.strictEqual(S.isDone(s, 'daf', 740000), false);
});

test('une étude inconnue ou un jour invalide ne change rien', () => {
    const s = S.normalize(null);
    assert.strictEqual(S.toggle(s, 'rambam', 740000), s);
    assert.strictEqual(S.toggle(s, 'daf', 'demain'), s);
});

test('les jours anciens sont oubliés, les récents comptés', () => {
    let s = S.normalize({ on: true });
    s = S.toggle(s, 'mishna', 740000);
    s = S.toggle(s, 'mishna', 740005);
    s = S.toggle(s, 'mishna', 740500);
    assert.deepStrictEqual(s.done.mishna, [740500]);
    assert.strictEqual(s.on, true);
    s = S.toggle(s, 'mishna', 740499);
    assert.strictEqual(S.recent(s, 740500, 7).mishna, 2);
});

test('les cartes d\'étude : par défaut tout sauf la mitsva du jour ; on peut les masquer', () => {
    let s = S.normalize(null);
    ['daf', 'tehilim', 'mishna', 'aliyah'].forEach(k => assert.strictEqual(S.cardOn(s, k), true));
    assert.strictEqual(S.cardOn(s, 'mitsva'), false);
    s = S.setCard(s, 'mishna', false);
    s = S.setCard(s, 'mitsva', true);
    assert.strictEqual(S.cardOn(s, 'mishna'), false);
    assert.strictEqual(S.cardOn(s, 'mitsva'), true);
    const again = S.normalize(JSON.parse(JSON.stringify(s)));
    assert.strictEqual(S.cardOn(again, 'mishna'), false);
    assert.strictEqual(S.cardOn(S.normalize({ cards: { daf: 'non', inconnue: true } }), 'daf'), true);
    assert.strictEqual(S.setCard(s, 'rambam', true), s);
});
