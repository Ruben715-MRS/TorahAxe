const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const C = require('../js/commandmentsCore.js');
const S = require('../js/commandmentsSanctionsData.js');
const D = require('../js/commandments613Data.js');
const tools = JSON.parse(fs.readFileSync(__dirname + '/../ui/fr.json', 'utf8')).tools;

test('Sanctions : un jeton pour chacun des 365 négatifs, tous valides', () => {
    assert.strictEqual(S.NEGATIVE.length, D.NEGATIVE.length);
    assert.strictEqual(S.NEGATIVE.length, 365);
    S.NEGATIVE.forEach((token, i) => {
        const sanction = C.sanctionOf('neg', i + 1);
        assert.ok(sanction && sanction.codes.length >= 1, 'n°' + (i + 1) + ' : ' + token);
        sanction.codes.forEach(code => assert.ok(C.SANCTION_CODES.indexOf(code) >= 0, 'n°' + (i + 1) + ' code ' + code));
        assert.ok(sanction.codes.indexOf('E') < 0, 'n°' + (i + 1) + ' : « E » est réservé aux positifs');
    });
});

test('Sanctions : les positifs n\'ont aucune peine, sauf quatre cas de karet', () => {
    const karet = [];
    for (let n = 1; n <= D.POSITIVE.length; n++) {
        const s = C.sanctionOf('pos', n);
        if (s.codes[0] === 'K') karet.push(n); else assert.deepStrictEqual(s.codes, ['E'], 'positif ' + n);
    }
    assert.deepStrictEqual(karet, [55, 57, 164, 215]);
    assert.ok(/pascal/.test(D.POSITIVE[54][0]) && /pascal/.test(D.POSITIVE[56][0]), 'sacrifice pascal et second Pessa\'h');
    assert.ok(/Jeûner/.test(D.POSITIVE[163][0]), 'jeûne de Yom Kippour');
    assert.ok(/Circoncire/.test(D.POSITIVE[214][0]), 'circoncision');
});

test('Sanctions : repères connus de la Michna', () => {
    const codes = n => C.sanctionOf('neg', n).codes.join('+');
    assert.strictEqual(codes(330), 'S+K', 'avec sa mère : lapidation et karet');
    assert.strictEqual(codes(347), 'N+K', 'femme mariée : strangulation et karet');
    assert.strictEqual(codes(346), 'K', 'niddah : karet');
    assert.strictEqual(codes(337), 'B', 'une femme et sa fille : bûcher');
    assert.strictEqual(codes(289), 'H', 'meurtre : décapitation');
    assert.strictEqual(codes(319), 'N', 'frapper son père ou sa mère : strangulation');
    assert.strictEqual(codes(318), 'S', 'maudire son père ou sa mère : lapidation');
    assert.strictEqual(codes(320), 'S+K', 'Chabbat');
    assert.strictEqual(codes(327), 'K', 'travail à Yom Kippour');
    assert.strictEqual(codes(196), 'K', 'manger à Yom Kippour');
    assert.strictEqual(codes(197), 'K', 'hamets à Pessa\'h');
    assert.strictEqual(codes(184), 'K', 'sang');
    assert.strictEqual(codes(185), 'K', 'graisse (hélev)');
    assert.strictEqual(codes(172), 'M', 'animaux impurs');
    assert.strictEqual(codes(186), 'M', 'viande et lait');
    assert.strictEqual(codes(244), 'P', 'vol : paiement');
    assert.strictEqual(codes(306), '0b', 'la mère avec les petits');
    assert.strictEqual(codes(285), 'Z', 'faux témoin');
    assert.strictEqual(codes(232), '0a', 'refuser de donner au pauvre : sans acte');
});

test('Sanctions : cohérence avec les 36 cas de karet (Kritout 1:1) et les peines de mort', () => {
    // Les 14 relations interdites de Kritout 1:1 sont toutes passibles du karet (la mère, la femme du père, la belle-fille, l'homme, l'animal pour lui et pour elle, la femme mariée, la nidda, quatre sœurs/tantes, deux belles-sœurs).
    [330, 331, 332, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350].forEach(n => assert.ok(C.sanctionOf('neg', n).codes.includes('K'), 'karet n°' + n));
    // La Michna (Sanhédrin 7:1) : quatre peines de mort, toutes présentes dans les données.
    ['S', 'B', 'H', 'N'].forEach(code => assert.ok(S.NEGATIVE.some(t => t.replace('?', '').split('+').includes(code)), code));
    // Les peines du Ciel : karet et mort par le Ciel sont distincts.
    assert.ok(S.NEGATIVE.some(t => t === 'C'));
});

test('Sanctions : filtre et recherche', () => {
    const all = C.list613('all');
    assert.ok(all.every(c => c.sanction && c.sanction.codes.length));
    const death = C.search613('all', '', 'death');
    assert.ok(death.length > 20 && death.every(c => c.sanction.codes.some(x => 'SBHN'.includes(x))));
    assert.ok(C.search613('all', '', 'karet').some(c => c.kind === 'pos' && c.n === 215));
    assert.strictEqual(C.search613('all', '', 'aucune').length, 248 - 4);
    assert.strictEqual(C.search613('all', '', 'all').length, 613);
    // Par un mot de la sanction.
    assert.ok(C.search613('neg', 'karet').every(c => c.sanction.codes.includes('K')));
    assert.ok(C.search613('neg', 'lapidation').some(c => c.n === 330));
    // Les recherches d'avant continuent de marcher.
    assert.ok(C.search613('neg', 'chabbat').length > 0);
});

test('Sanctions : tous les libellés existent', () => {
    ['label', 'uncertain', 'filter_label', 'filter_all', 'legend', 'legend_intro', 'legend_see', 'note'].forEach(k => assert.ok(tools['cmd_sanction_' + k], k));
    C.SANCTION_CODES.forEach(code => {
        assert.ok(tools['cmd_sanction_' + code], code);
        assert.ok(tools['cmd_sanction_help_' + code], 'aide ' + code);
    });
    C.SANCTION_FILTERS.forEach(f => assert.ok(tools['cmd_sanction_filter_' + f.id], f.id));
});
