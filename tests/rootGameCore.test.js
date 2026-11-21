const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/rootGameCore.js');
const L = require('../js/lexiconCore.js');
const Quiz = require('../js/quizCore.js');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const ENTRIES = L.search('').results;
const nfc = s => s.normalize('NFC');

test('familles : chaque mot existe dans le dictionnaire, avec cette racine ; au moins trois mots par famille ; aucun mot dans deux familles', () => {
    assert.ok(R.ROOTS.length >= 20);
    const seen = new Set();
    R.ROOTS.forEach(r => {
        assert.strictEqual(r.length, 3, r);
        assert.ok(R.FAMILIES[r].length >= 3, r + ' : moins de trois mots');
        assert.strictEqual(R.family(r).length, R.FAMILIES[r].length, r + ' : un mot est absent du dictionnaire ou d\'une autre racine');
        R.FAMILIES[r].forEach(he => {
            const found = ENTRIES.filter(e => nfc(e.he) === nfc(he));
            assert.ok(found.length >= 1, he + ' : absent du dictionnaire');
            assert.ok(found.some(e => e.root && R.consonants(e.root) === r), he + ' : racine ' + r + ' absente du dictionnaire');
            assert.ok(!seen.has(nfc(he)), he + ' : dans deux familles');
            seen.add(nfc(he));
        });
        // Le mot montre sa racine : les trois lettres s'y suivent (pas de verbe à lettre faible, dont la racine disparaît).
        R.family(r).forEach(w => assert.ok(R.contains(w.key, r), w.he + ' : la racine ' + r + ' n\'apparaît pas dans le mot'));
    });
});

test('familles : les racines homonymes du dictionnaire (SHVA, AREV, SHAR, ASAR, KRA) et les verbes à lettre faible ne sont pas posés', () => {
    ['שבע', 'ערב', 'שאר', 'עשר', 'קרא', 'שכר', 'קומ', 'בוא', 'רומ', 'נוח', 'לונ'].forEach(r => assert.ok(!R.ROOTS.includes(r), r));
});

test('familles : glose sans rapport écartée (« mâle » et « feuille » ne sont pas de la famille de « se souvenir » et « monter »)', () => {
    const he = r => R.family(r).map(w => nfc(w.he));
    assert.ok(!he('זכר').includes(nfc('זָכָר')) && !he('זכר').includes(nfc('זָכוּר')));
    assert.ok(!he('עלה').includes(nfc('עָלֶה')));
    assert.ok(!he('קרב').includes(nfc('קָרָא')));
});

test('contains : les lettres de la racine se suivent dans le mot', () => {
    assert.ok(R.contains('מקדש', 'קדש'));
    assert.ok(!R.contains('מקדש', 'פקד'));
    assert.ok(R.contains('עלה', 'עלה'));
    assert.ok(!R.contains('שמ', 'שמר'));
});

test('questions : quatre propositions distinctes, une seule bonne, de la bonne façon, pour chaque série et chaque tirage', () => {
    R.SECTIONS.forEach(section => {
        for (let seed = 1; seed <= 200; seed++) {
            const g = R.createGame({ section, rng: seeded(seed) });
            assert.strictEqual(g.questions.length, 10, section + ' #' + seed);
            const roots = g.questions.map(q => q.root);
            assert.strictEqual(new Set(roots).size, roots.length, section + ' #' + seed + ' : une racine revient');
            g.questions.forEach(q => {
                const where = section + ' #' + seed + ' ' + q.type + ' ' + q.root;
                assert.strictEqual(q.options.length, 4, where);
                assert.strictEqual(new Set(q.options.map(o => nfc(o.label))).size, 4, where + ' : propositions identiques');
                if (q.type === 'root') {
                    assert.strictEqual(q.options[q.answer].root, q.root, where);
                    assert.ok(q.options.every(o => o.kind === 'root'), where);
                    q.options.forEach((o, i) => { if (i !== q.answer) assert.ok(!R.contains(q.word.key, o.root), where + ' : une autre racine tient dans le mot'); });
                    assert.strictEqual(q.word.root, q.root, where);
                } else if (q.type === 'family') {
                    assert.strictEqual(q.options[q.answer].root, q.root, where);
                    q.options.forEach((o, i) => {
                        if (i === q.answer) return;
                        assert.notStrictEqual(o.root, q.root, where);
                        assert.ok(!R.contains(R.consonants(o.label), q.root), where + ' : la racine se lit dans une mauvaise proposition');
                    });
                    assert.strictEqual(new Set(q.options.map(o => o.root)).size, 4, where + ' : deux mots de la même famille');
                } else {
                    const same = q.options.filter(o => o.root === q.root);
                    assert.strictEqual(same.length, 3, where + ' : trois mots de la famille');
                    assert.notStrictEqual(q.options[q.answer].root, q.root, where);
                    assert.ok(!R.contains(R.consonants(q.options[q.answer].label), q.root), where + ' : l\'intrus peut se lire de la famille');
                }
            });
        }
    });
});

test('séries : les types de chaque série', () => {
    const count = section => { const c = {}; R.createGame({ section, rng: seeded(4) }).questions.forEach(q => { c[q.type] = (c[q.type] || 0) + 1; }); return c; };
    assert.deepStrictEqual(count('all'), { intruder: 4, family: 3, root: 3 });
    assert.deepStrictEqual(count('racines'), { root: 10 });
    assert.deepStrictEqual(count('familles'), { intruder: 5, family: 5 });
});

test('partie : bonne réponse 100 points, fin, et jouable à plusieurs', () => {
    const g = R.createGame({ section: 'all', rng: seeded(9) });
    for (let i = 0; i < 10; i++) {
        const q = R.question(g);
        assert.deepStrictEqual(R.answer(g, i < 6 ? q.answer : (q.answer + 1) % 4), [i < 6 ? 'right' : 'wrong']);
        R.next(g);
    }
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.score, 600);
    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const m = R.createGame({ section: 'all', rng: seeded(2) });
    assert.ok(m.multi);
    Quiz.setPendingPlayers(null);
});
