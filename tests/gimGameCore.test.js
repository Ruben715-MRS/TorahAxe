const test = require('node:test');
const assert = require('node:assert');
const G = require('../js/gimGameCore.js');
const Gem = require('../js/gematriaCore.js');
const Quiz = require('../js/quizCore.js');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const truth = he => Gem.compute(he, 'standard').total;

test('mots : fréquents, de 2 à 6 lettres, sans caractère étranger, sans Nom divin, valeur égale à celle de l\'outil Guématria', () => {
    assert.ok(G.WORDS.length >= 400, String(G.WORDS.length));
    const keys = G.WORDS.map(w => w.key);
    assert.strictEqual(new Set(keys).size, keys.length, 'deux entrées aux mêmes consonnes');
    G.WORDS.forEach(w => {
        assert.ok(w.letters >= 2 && w.letters <= 6, w.he);
        assert.strictEqual(Gem.compute(w.he, 'standard').ignored, 0, w.he);
        assert.strictEqual(w.value, truth(w.he), w.he);
        assert.ok(!G.DIVINE[w.key], w.he + ' : un Nom divin');
        assert.ok(!/^\[/.test(w.fr) && w.fr.length > 0, w.he);
    });
    assert.ok(!G.WORDS.some(w => w.key === 'יהוה' || w.key === 'אדני'));
});

test('calcul : valeurs des lettres et des mots connus (standard, finales comme les ordinaires)', () => {
    const v = he => G.value(he);
    assert.deepStrictEqual(['א', 'י', 'כ', 'ק', 'ת'].map(v), [1, 10, 20, 100, 400]);
    assert.strictEqual(v('ך'), 20);
    assert.strictEqual(v('ם'), 40);
    assert.strictEqual(v('שָׁלוֹם'), 376);
    assert.strictEqual(v('תּוֹרָה'), 611);
    assert.strictEqual(v('אֱלֹהִים'), 86);
    assert.strictEqual(G.breakdown('שָׁלוֹם').total, 376);
    assert.deepStrictEqual(G.breakdown('שָׁלוֹם').parts.map(p => p.value), [300, 30, 6, 40]);
});

test('séries : mots courts de 2 à 3 lettres, mots longs de 4 à 6', () => {
    assert.ok(G.wordsOf('courts').length >= 200 && G.wordsOf('courts').every(w => w.letters <= 3));
    assert.ok(G.wordsOf('longs').length >= 100 && G.wordsOf('longs').every(w => w.letters >= 4));
});

test('wrongTotals : trois totaux distincts, positifs, jamais le bon, plausibles', () => {
    for (let seed = 1; seed <= 40; seed++) {
        G.WORDS.slice(0, 80).forEach(w => {
            const wrong = G.wrongTotals(w, seeded(seed));
            assert.strictEqual(wrong.length, 3, w.he);
            assert.strictEqual(new Set(wrong).size, 3, w.he);
            wrong.forEach(n => { assert.ok(n > 0 && n !== w.value, w.he); assert.ok(Math.abs(n - w.value) <= 500, w.he); });
        });
    }
});

test('questions : quatre propositions distinctes, une seule bonne, la bonne valeur, pour chaque série et chaque tirage', () => {
    G.SECTIONS.forEach(section => {
        for (let seed = 1; seed <= 120; seed++) {
            const g = G.createGame({ section, rng: seeded(seed) });
            assert.strictEqual(g.questions.length, 10, section + ' #' + seed);
            const used = g.questions.map(q => q.id);
            assert.strictEqual(new Set(used).size, used.length, section + ' #' + seed + ' : une question revient');
            g.questions.forEach(q => {
                const where = section + ' #' + seed + ' ' + q.type + ' ' + q.id;
                assert.strictEqual(q.options.length, 4, where);
                assert.strictEqual(new Set(q.options.map(o => o.label)).size, 4, where + ' : propositions identiques');
                if (q.type === 'letter') {
                    assert.strictEqual(q.options[q.answer].value, truth(q.letter), where);
                    assert.strictEqual(q.value, truth(q.letter), where);
                } else if (q.type === 'value') {
                    assert.strictEqual(q.options[q.answer].value, truth(q.word.he), where);
                    assert.strictEqual(q.options.filter(o => o.value === truth(q.word.he)).length, 1, where);
                } else if (q.type === 'word') {
                    assert.strictEqual(truth(q.options[q.answer].label), q.value, where);
                    q.options.forEach((o, i) => { assert.strictEqual(o.value, truth(o.label), where); if (i !== q.answer) assert.notStrictEqual(o.value, q.value, where + ' : une autre proposition est aussi bonne'); });
                } else {
                    const right = q.options[q.answer];
                    assert.strictEqual(truth(right.label), truth(q.word.he), where);
                    assert.notStrictEqual(right.label.replace(/[֑-ׇ]/g, ''), q.word.he.replace(/[֑-ׇ]/g, ''), where + ' : le même mot');
                    q.options.forEach((o, i) => { if (i !== q.answer) assert.notStrictEqual(truth(o.label), truth(q.word.he), where + ' : une autre proposition est aussi bonne'); });
                }
                if (section === 'courts' && q.word) assert.ok(q.word.letters <= 3, where);
                if (section === 'longs' && q.word) assert.ok(q.word.letters >= 4, where);
                if (section === 'lettres') assert.strictEqual(q.type, 'letter', where);
            });
        }
    });
});

test('série « tout » : deux lettres, quatre valeurs, deux « lequel vaut », deux « même valeur »', () => {
    for (let seed = 1; seed <= 40; seed++) {
        const count = {};
        G.createGame({ section: 'all', rng: seeded(seed) }).questions.forEach(q => { count[q.type] = (count[q.type] || 0) + 1; });
        assert.deepStrictEqual(count, { letter: 2, value: 4, word: 2, same: 2 });
    }
});

test('chronomètre : de quoi additionner à la main, plus long pour les mots et pour les mots longs', () => {
    const g = G.createGame({ section: 'all', rng: seeded(3) });
    g.questions.forEach(q => { const t = G.timeFor(q); assert.ok(t >= 10000 && t <= 90000, q.type + ' ' + t); });
    assert.strictEqual(G.timeFor({ type: 'letter' }), 10000);
    assert.ok(G.timeFor({ type: 'word', word: { letters: 5 } }) > G.timeFor({ type: 'word', word: { letters: 3 } }));
    assert.ok(G.timeFor({ type: 'word', word: { letters: 4 } }) > G.timeFor({ type: 'value', word: { letters: 4 } }));
});

test('partie : bonne réponse 100 points, temps écoulé compté faux, fin, jouable à plusieurs', () => {
    const g = G.createGame({ section: 'courts', rng: seeded(8) });
    for (let i = 0; i < 10; i++) {
        const q = G.question(g);
        if (i === 9) assert.deepStrictEqual(G.expire(g), ['timeout']);
        else assert.deepStrictEqual(G.answer(g, i % 2 ? q.answer : (q.answer + 1) % 4), [i % 2 ? 'right' : 'wrong']);
        G.next(g);
    }
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.score, 400);
    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const m = G.createGame({ section: 'all', rng: seeded(2) });
    assert.ok(m.multi);
    assert.strictEqual(m.questions.length, 10);
    Quiz.setPendingPlayers(null);
});
