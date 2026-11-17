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
