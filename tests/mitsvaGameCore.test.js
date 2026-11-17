const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/mitsvaGameCore.js');
const PAR = require('../data/torah/parashot.json');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('parashaOf : les débuts et fins de paracha, aux frontières', () => {
    const name = (b, c, v) => PAR.parashot[M.parashaOf(PAR, b, c, v)].fr;
    assert.strictEqual(name(1, 1, 1), 'Béréchit');
    assert.strictEqual(name(1, 6, 8), 'Béréchit');          // dernier verset avant Noa'h
    assert.strictEqual(name(1, 6, 9), "Noa'h");
    assert.strictEqual(name(2, 20, 2), 'Yitro');            // « Je suis l'Éternel ton Dieu »
    assert.strictEqual(name(5, 6, 4), "Va'et'hanan");       // le Chéma
});

test('items : seuls les versets simples d\'une seule paracha ; les trois références multiples sont écartées', () => {
    const it = M.items(PAR);
    assert.strictEqual(it.length, 610);
    assert.strictEqual(it.filter(x => x.kind === 'pos').length + it.filter(x => x.kind === 'neg').length, 610);
    assert.ok(!it.some(x => /[,;]/.test(x.ref)));
    it.forEach(x => { assert.ok(x.parasha >= 0 && x.parasha < 54); assert.strictEqual(PAR.parashot[x.parasha].book, x.book); });
});

test('items : des commandements connus tombent dans la bonne paracha (le verset cité par le Rambam)', () => {
    const it = M.items(PAR);
    const par = (kind, n) => PAR.parashot[it.find(x => x.kind === kind && x.n === n).parasha].fr;
    assert.strictEqual(par('pos', 2), "Va'et'hanan");       // Proclamer son unité : Deutéronome 6:4
    assert.strictEqual(par('pos', 155), 'Yitro');           // Sanctifier le Chabbat : Exode 20:8
    assert.strictEqual(par('pos', 154), 'Michpatim');       // Se reposer le Chabbat : Exode 23:12 (autre verset, autre paracha)
    assert.strictEqual(par('pos', 156), 'Bo');              // Détruire le 'hamets : Exode 12:15
    assert.strictEqual(par('pos', 151), 'Chemini');         // Les signes des sauterelles : Lévitique 11:21
});

test('les pièges : seuls les positifs formulés à la forme négative sont posés en « positif ou négatif »', () => {
    const traps = M.items(PAR).filter(x => x.trap);
    assert.deepStrictEqual(traps.map(x => x.n), [60, 61, 84, 135]);
    traps.forEach(x => assert.strictEqual(x.kind, 'pos'));
});

test('makeQuestion « parasha » : quatre parachiot du même livre, dans l\'ordre de la Torah, la bonne incluse', () => {
    const rng = seeded(3);
    M.items(PAR).slice(0, 80).forEach(item => {
        const q = M.makeQuestion(PAR, item, 'parasha', rng);
        assert.strictEqual(q.options.length, 4);
        assert.strictEqual(q.options[q.answer].value, item.parasha);
        assert.strictEqual(new Set(q.options.map(o => o.value)).size, 4);
        q.options.forEach(o => assert.strictEqual(PAR.parashot[o.value].book, item.book));
        assert.deepStrictEqual(q.options.map(o => o.value), q.options.map(o => o.value).slice().sort((a, b) => a - b));
    });
});

test('makeQuestion « book » : quatre livres sur cinq, la bonne incluse ; « kind » : deux propositions', () => {
    const rng = seeded(4);
    M.items(PAR).slice(100, 160).forEach(item => {
        const q = M.makeQuestion(PAR, item, 'book', rng);
        assert.strictEqual(q.options.length, 4);
        assert.strictEqual(q.options[q.answer].value, item.bookFr);
    });
    const trap = M.items(PAR).find(x => x.trap);
    const k = M.makeQuestion(PAR, trap, 'kind', rng);
    assert.deepStrictEqual(k.options.map(o => o.value), ['pos', 'neg']);
    assert.strictEqual(k.answer, 0);
});

test('createGame : dix commandements distincts, au plus une question « positif ou négatif », temps selon la sorte', () => {
    for (let seed = 1; seed <= 30; seed++) {
        const g = M.createGame({ parashot: PAR, rng: seeded(seed) });
        assert.strictEqual(g.questions.length, 10);
        assert.strictEqual(new Set(g.questions.map(q => q.id)).size, 10);
        assert.ok(g.questions.filter(q => q.type === 'kind').length <= 1);
        g.questions.forEach(q => assert.strictEqual(q.timeMs, M.TIMES[q.type]));
        const nonTrap = g.questions.filter(q => q.type !== 'kind');
        assert.ok(nonTrap.filter(q => q.item.kind === 'pos').length >= 4 && nonTrap.filter(q => q.item.kind === 'neg').length >= 4);
    }
});

test('une partie : tout juste = 1000 points ; temps écoulé = 0', () => {
    let g = M.createGame({ parashot: PAR, rng: seeded(9) });
    while (!g.over) { M.answer(g, M.question(g).answer); M.next(g); }
    assert.strictEqual(g.score, 1000);
    g = M.createGame({ parashot: PAR, rng: seeded(9) });
    while (!g.over) { M.expire(g); M.next(g); }
    assert.strictEqual(g.score, 0);
});
