// Les trois jeux à choix multiples, de bout en bout (questions réelles, générateur fixe) : ils partagent le moteur js/quizCore.js.
const test = require('node:test');
const assert = require('node:assert');
const Q = require('../js/quizCore.js');
const Lex = require('../js/lexiconGameCore.js');
const Gem = require('../js/gemaraGameCore.js');
const Tr = require('../js/transmissionGameCore.js');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

const games = {
    lexicon: () => Lex.createGame({ level: 3, rng: seeded(1) }),
    gemara: () => Gem.createGame({ section: 'all', rng: seeded(2) }),
    transmission: () => Tr.createGame({ section: 'all', rng: seeded(3) })
};
const cores = { lexicon: Lex, gemara: Gem, transmission: Tr };

Object.keys(games).forEach(name => {
    test(name + ' : une partie parfaite fait 10 questions, quatre propositions chacune, 1000 points', () => {
        const core = cores[name], g = games[name]();
        assert.strictEqual(g.questions.length, Q.ROUNDS);
        for (let i = 0; i < Q.ROUNDS; i++) {
            const q = core.question(g);
            assert.strictEqual(q.options.length, Q.CHOICES);
            assert.ok(q.answer >= 0 && q.answer < Q.CHOICES);
            assert.deepStrictEqual(core.answer(g, q.answer), ['right']);
            assert.deepStrictEqual(core.next(g), i === Q.ROUNDS - 1 ? ['done'] : []);
        }
        assert.strictEqual(g.score, Q.ROUNDS * core.POINTS);
        assert.strictEqual(g.found, Q.ROUNDS);
        assert.strictEqual(g.over, true);
    });

    test(name + ' : toutes les mauvaises réponses font 0, et une bonne réponse existe à chaque question', () => {
        const core = cores[name], g = games[name]();
        while (!g.over) {
            const q = core.question(g);
            const labels = q.options.map(o => o.label);
            assert.strictEqual(new Set(labels).size, labels.length, 'propositions distinctes : ' + labels.join(' | '));
            core.answer(g, (q.answer + 1) % q.options.length);
            core.next(g);
        }
        assert.strictEqual(g.score, 0);
        assert.strictEqual(g.results.every(r => r.right === false), true);
    });
});

test('mots du Tanakh et de la Guémara : les résultats portent l\'identifiant de la carte', () => {
    const l = games.lexicon(); Lex.answer(l, Lex.question(l).answer);
    assert.ok(l.results[0].strong);
    const g = games.gemara(); Gem.answer(g, Gem.question(g).answer);
    assert.ok(g.results[0].id);
});

test('Maîtres et élèves : chaque nom proposé porte aussi son écriture hébraïque', () => {
    for (let seed = 1; seed <= 20; seed++) {
        const g = Tr.createGame({ section: 'all', rng: seeded(seed) });
        g.questions.forEach(q => q.options.forEach(o => assert.ok(/[א-ת]/.test(o.he), o.label)));
    }
});
