const test = require('node:test');
const assert = require('node:assert');
const Q = require('../js/quizCore.js');
const P = require('../js/purityGameCore.js');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('quizCore.expire : temps écoulé = faux, une seule fois, sans proposition choisie', () => {
    const s = Q.createState([{ id: 'a', type: 't', options: [{}, {}], answer: 0 }, { id: 'b', type: 't', options: [{}, {}], answer: 1 }]);
    assert.deepStrictEqual(Q.expire(s), ['timeout']);
    assert.strictEqual(s.resolved, 'wrong');
    assert.strictEqual(s.picked, null);
    assert.strictEqual(s.score, 0);
    assert.deepStrictEqual(Q.expire(s), []);
    assert.deepStrictEqual(Q.answer(s, 0), []);
    assert.deepStrictEqual(Q.next(s), []);
    assert.deepStrictEqual(s.results, [{ id: 'a', right: false, type: 't', timeout: true }]);
});

test('les animaux : statut pur ou impur, une raison, un nom, aucun doublon, aucun nom des deux côtés', () => {
    const ids = new Set(), names = {};
    P.ITEMS.forEach(it => {
        assert.ok(['pur', 'impur'].includes(it.status), it.fr);
        assert.ok(it.fr && it.why && it.group, it.id);
        assert.ok(!ids.has(it.id), 'doublon ' + it.id); ids.add(it.id);
        assert.ok(!(it.fr in names) || names[it.fr] === it.status, 'statut contradictoire : ' + it.fr);
        names[it.fr] = it.status;
    });
});

test('chaque section a de quoi remplir une partie des deux côtés', () => {
    P.SECTIONS.forEach(section => {
        const it = P.items(section);
        assert.ok(it.filter(x => x.status === 'pur').length >= 5, section + ' : purs');
        assert.ok(it.filter(x => x.status === 'impur').length >= 5, section + ' : impurs');
    });
});

test('les cas connus : le porc et le chameau sont impurs avec la bonne raison, le bœuf est pur', () => {
    const by = fr => P.ITEMS.find(x => x.fr === fr);
    assert.strictEqual(by('Le porc').status, 'impur');
    assert.match(by('Le porc').why, /pied fendu mais il ne rumine pas/);
    assert.strictEqual(by('Le chameau').status, 'impur');
    assert.match(by('Le chameau').why, /rumine mais il n’a pas le pied fendu/);
    assert.strictEqual(by('Le bœuf').status, 'pur');
    assert.strictEqual(by('La crevette').status, 'impur');
    assert.strictEqual(by('Hareng').status, 'pur');
});

test('rien de discuté n\'est posé : girafe, paon, dinde, poissons à exception, identifications perdues', () => {
    const names = P.ITEMS.map(x => x.fr).join(' | ');
    ['Girafe', 'Paon', 'Dinde', 'zémer', 'tétras', 'vallérie', 'Turbot', 'Carpe à cuir', 'Esturgeon', 'Espadon'].forEach(n => assert.ok(!names.includes(n), n));
    assert.ok(!P.ITEMS.some(x => x.id === 'f:Carpe'), 'carpe : avec exception');
    assert.ok(!P.ITEMS.some(x => x.id === 'f:Barbue'), 'barbue : avec exception');
});

test('createGame : dix animaux, moitié purs moitié impurs, deux propositions Pur / Impur, bonne réponse cohérente', () => {
    P.SECTIONS.forEach(section => {
        const g = P.createGame({ section, rng: seeded(11) });
        assert.strictEqual(g.questions.length, 10);
        assert.strictEqual(g.questions.filter(q => q.item.status === 'pur').length, 5, section);
        g.questions.forEach(q => {
            assert.deepStrictEqual(q.options.map(o => o.value), ['pur', 'impur']);
            assert.strictEqual(q.options[q.answer].value, q.item.status);
        });
        assert.strictEqual(new Set(g.questions.map(q => q.id)).size, 10, 'pas deux fois le même animal');
    });
});

test('une partie : tout juste = 1000 points ; temps écoulé = 0 ; un temps écoulé puis une réponse tardive ne compte pas', () => {
    let g = P.createGame({ section: 'all', rng: seeded(5) });
    while (!g.over) { P.answer(g, P.question(g).answer); P.next(g); }
    assert.strictEqual(g.score, 1000);
    g = P.createGame({ section: 'all', rng: seeded(5) });
    while (!g.over) { P.expire(g); P.answer(g, P.question(g).answer); P.next(g); }
    assert.strictEqual(g.score, 0);
    assert.strictEqual(g.results.every(r => r.timeout === true && r.right === false), true);
});
