const test = require('node:test');
const assert = require('node:assert');
const SRS = require('../js/srs.js');
const Lex = require('../js/lexiconGameCore.js');
const Gem = require('../js/gemaraGameCore.js');
const R = require('../js/reviewCore.js');

const NOW = Date.UTC(2026, 10, 16, 12);
const DAY = 86400000;
function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

// Une progression où 7 mots et 6 cartes sont vus il y a longtemps (donc dus), 1 mot et 1 carte vus à l'instant (pas dus).
function progress() {
    const words = Lex.poolOf(3).slice(0, 8).map(e => e.strong);
    const cards = Gem.cards('all').slice(0, 7).map(c => c.id);
    const old = { box: 1, lastReviewed: NOW - 10 * DAY, failCount: 1, successCount: 0 };
    const fresh = { box: 1, lastReviewed: NOW, failCount: 0, successCount: 1 };
    const lexicon = { v: 1, words: {} }, gemara = { v: 1, cards: {} };
    words.forEach((id, i) => { lexicon.words[id] = i < 7 ? old : fresh; });
    cards.forEach((id, i) => { gemara.cards[id] = i < 6 ? old : fresh; });
    return { lexicon, gemara };
}

test('summary : ne compte que ce qui est vu et à réviser, jeu par jeu', () => {
    const s = R.summary(progress(), NOW);
    assert.deepStrictEqual([s.lexicon, s.gemara, s.total, s.session], [7, 6, 13, 10]);
});

test('summary : rien de vu, rien à réviser ; progression absente ou abîmée sans effet', () => {
    assert.strictEqual(R.summary({}, NOW).total, 0);
    assert.strictEqual(R.summary({ lexicon: 'x', gemara: { cards: 5 } }, NOW).total, 0);
    assert.strictEqual(R.summary(undefined, NOW).total, 0);
});

test('createGame : 10 questions des deux jeux, quatre propositions, uniquement des éléments dus', () => {
    const g = R.createGame({ progress: progress(), now: NOW, rng: seeded(7) });
    assert.strictEqual(g.questions.length, 10);
    assert.strictEqual(g.mode, 'review');
    const dueIds = new Set(R.due(progress(), NOW).map(it => it.game + ':' + it.id));
    g.questions.forEach(q => {
        assert.strictEqual(q.options.length, 4);
        assert.ok(['lexicon', 'gemara'].includes(q.game));
        assert.ok(dueIds.has(q.game + ':' + (q.game === 'lexicon' ? q.strong : q.id)));
    });
});

test('createGame : les plus fragiles d\'abord quand il y a plus de dus que de places', () => {
    const p = progress();
    const ids = Object.keys(p.lexicon.words);
    p.lexicon.words[ids[0]] = { box: 1, lastReviewed: NOW - 90 * DAY, failCount: 3, successCount: 0 };   // le plus en retard
    const g = R.createGame({ progress: p, now: NOW, rng: seeded(1), rounds: 3 });
    assert.strictEqual(g.questions.length, 3);
    assert.ok(g.questions.some(q => q.game === 'lexicon' && q.strong === ids[0]));
});

test('createGame : rien à réviser → partie vide', () => {
    const g = R.createGame({ progress: {}, now: NOW });
    assert.strictEqual(g.empty, true);
    assert.strictEqual(g.over, true);
});

test('answer : le résultat garde le jeu et l\'identifiant, 100 points la bonne réponse', () => {
    const g = R.createGame({ progress: progress(), now: NOW, rng: seeded(3) });
    while (!g.over) { const q = R.question(g); R.answer(g, q.answer); R.next(g); }
    assert.strictEqual(g.score, 1000);
    g.results.forEach(r => { assert.ok(r.game && r.id && r.right === true); });
    assert.ok(g.results.some(r => r.game === 'lexicon') && g.results.some(r => r.game === 'gemara'));
});

test('SRS : une réussite éloigne l\'échéance, donc la révision ne revient pas le jour même', () => {
    const p = progress();
    const id = Object.keys(p.lexicon.words)[0];
    p.lexicon.words[id] = SRS.applyResult(p.lexicon.words[id], true, NOW);
    assert.strictEqual(R.summary(p, NOW).lexicon, 6);
});
