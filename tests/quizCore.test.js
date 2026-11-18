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

// --- À plusieurs -------------------------------------------------------------------------------------------------------------------------------
const Q10 = () => Array.from({ length: 10 }, (_, i) => ({ id: 'q' + i, type: 't', options: [{ label: 'a' }, { label: 'b' }, { label: 'c' }, { label: 'd' }], answer: 0 }));

// Joue la partie : `picks[i]` est l'indice choisi à la question i (0 = bonne réponse).
function playAll(state, picks) {
    let i = 0;
    while (!state.over) { Q.answer(state, picks[i++] ?? 0); Q.next(state); }
    return state;
}

test('à plusieurs : noms nettoyés, de 2 à 6 joueurs', () => {
    assert.deepStrictEqual(Q.setPendingPlayers(['  Anna  ', '', 'x'.repeat(40)]), ['Anna', 'Joueur 2', 'x'.repeat(20)]);
    assert.strictEqual(Q.setPendingPlayers(['seul']), null);
    assert.strictEqual(Q.setPendingPlayers(['a', 'b', 'c', 'd', 'e', 'f', 'g']), null);
    assert.strictEqual(Q.setPendingPlayers(null), null);
});

test('à plusieurs : la partie suivante est rattachée une seule fois, les questions ramenées à un multiple du nombre de joueurs', () => {
    Q.setPendingPlayers(['Anna', 'Ben', 'Chloé']);
    const g = Q.createState(Q10(), {});
    assert.ok(g.multi);
    assert.strictEqual(g.questions.length, 9);
    assert.deepStrictEqual(g.multi.players.map(p => p.name), ['Anna', 'Ben', 'Chloé']);
    const solo = Q.createState(Q10(), {});
    assert.strictEqual(solo.multi, undefined);
    assert.strictEqual(solo.questions.length, 10);
});

test('à plusieurs : pas assez de questions pour tout le monde, la partie reste en solo', () => {
    Q.setPendingPlayers(['a', 'b', 'c']);
    const g = Q.createState(Q10().slice(0, 2), {});
    assert.strictEqual(g.multi, undefined);
    assert.strictEqual(g.questions.length, 2);
    Q.setPendingPlayers(null);
});

test('à plusieurs : les questions vont aux joueurs à tour de rôle, les points à celui qui a répondu', () => {
    Q.setPendingPlayers(['Anna', 'Ben']);
    const g = Q.createState(Q10(), {});
    assert.strictEqual(Q.currentPlayer(g).name, 'Anna');
    // Anna juste, Ben faux, et ainsi de suite : Anna a tout bon, Ben tout faux.
    playAll(g, Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? 0 : 1)));
    assert.strictEqual(g.multi.players[0].score, 500);
    assert.strictEqual(g.multi.players[0].found, 5);
    assert.strictEqual(g.multi.players[1].score, 0);
    assert.strictEqual(g.score, 500);
    const st = Q.standings(g);
    assert.deepStrictEqual(st.rows.map(r => [r.name, r.rank]), [['Anna', 1], ['Ben', 2]]);
    assert.deepStrictEqual(st.winners, ['Anna']);
    assert.strictEqual(st.tie, false);
});

test('à plusieurs : égalité, même rang, l\'ordre de jeu départage l\'affichage seulement', () => {
    Q.setPendingPlayers(['Anna', 'Ben', 'Chloé']);
    const g = Q.createState(Q10().slice(0, 6), {});
    playAll(g, [0, 0, 1, 1, 1, 1]);          // Anna 1 bonne, Ben 1 bonne, Chloé 0
    const st = Q.standings(g);
    assert.deepStrictEqual(st.rows.map(r => [r.name, r.score, r.rank]), [['Anna', 100, 1], ['Ben', 100, 1], ['Chloé', 0, 3]]);
    assert.deepStrictEqual(st.winners, ['Anna', 'Ben']);
    assert.strictEqual(st.tie, true);
});

test('à plusieurs : les manches à indices (points variables) sont aussi attribuées au bon joueur', () => {
    const CFG = { start: 100, hintCost: 20, wrongCost: 20, maxHints: 3 };
    Q.setPendingPlayers(['Anna', 'Ben']);
    const g = Q.createState([{ id: 'a' }, { id: 'b' }], {});
    Q.resetRound(g, CFG);
    Q.roundHint(g, CFG);                              // Anna prend un indice : 80 points en jeu
    Q.roundGuess(g, 'x', true, CFG);
    Q.next(g); Q.resetRound(g, CFG);
    Q.roundGuess(g, 'y', true, CFG);                  // Ben répond du premier coup : 100 points
    Q.next(g);
    assert.deepStrictEqual(g.multi.players.map(p => p.score), [80, 100]);
    assert.deepStrictEqual(Q.standings(g).winners, ['Ben']);
});

test('à plusieurs : le temps écoulé ne rapporte rien et la partie continue', () => {
    Q.setPendingPlayers(['Anna', 'Ben']);
    const g = Q.createState(Q10().slice(0, 2), {});
    Q.expire(g); Q.next(g);
    Q.answer(g, 0); Q.next(g);
    assert.deepStrictEqual(g.multi.players.map(p => p.score), [0, 100]);
    assert.strictEqual(g.over, true);
});

test('à plusieurs : roundsFor donne au moins trois questions à chacun, sans toucher aux parties solo', () => {
    assert.strictEqual(Q.roundsFor(5), 5);
    Q.setPendingPlayers(['a', 'b']);
    assert.strictEqual(Q.roundsFor(5), 6);
    assert.strictEqual(Q.roundsFor(10), 10);
    Q.setPendingPlayers(['a', 'b', 'c', 'd']);
    assert.strictEqual(Q.roundsFor(10), 12);
    Q.setPendingPlayers(null);
    assert.strictEqual(Q.roundsFor(5), 5);
});
