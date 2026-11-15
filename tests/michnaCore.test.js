const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const M = require('../js/michnaCore.js');

const DIR = path.resolve(__dirname, '..', 'data', 'michna');
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));

test('numérotation hébraïque : lettres, 15 et 16, dizaines', () => {
    assert.strictEqual(M.hebrewNumber(1), 'א׳');
    assert.strictEqual(M.hebrewNumber(10), 'י׳');
    assert.strictEqual(M.hebrewNumber(15), 'ט״ו');
    assert.strictEqual(M.hebrewNumber(16), 'ט״ז');
    assert.strictEqual(M.hebrewNumber(23), 'כ״ג');
    assert.strictEqual(M.hebrewNumber(0), '0');
});

test('l\'index : 6 ordres, 63 traités, 525 chapitres', () => {
    assert.strictEqual(index.sedarim.length, 6);
    const list = M.tractates(index);
    assert.strictEqual(list.length, 63);
    assert.strictEqual(list.reduce((n, t) => n + t.chapters, 0), 525);
    assert.strictEqual(list[0].id, 'berakhot');
    assert.strictEqual(list[62].id, 'oktzin');
    assert.strictEqual(M.find(index, 'avot').sederFr, 'Nezikin');
    assert.strictEqual(M.find(index, 'inconnu'), null);
});

test('chaque traité : un fichier, le bon nombre de chapitres et de michnayot, aucune michna vide', () => {
    M.tractates(index).forEach(t => {
        const book = JSON.parse(fs.readFileSync(path.join(DIR, t.id + '.json'), 'utf8'));
        assert.strictEqual(book.chapters.length, t.chapters, t.id);
        assert.strictEqual(book.chapters.reduce((n, c) => n + c.length, 0), t.mishnayot, t.id);
        book.chapters.forEach((ch, c) => ch.forEach((m, i) => {
            assert.ok(typeof m[0] === 'string' && m[0].length > 0, t.id + ' ' + (c + 1) + ':' + (i + 1) + ' sans texte');
            assert.ok(Array.isArray(m[1]), t.id + ' commentaires');
            m[1].forEach(x => assert.ok(!/<(?!\/?(?:b|i)>)/.test(x), t.id + ' balise inattendue'));
        }));
    });
});

test('chapitre suivant et précédent : dans le traité, puis d\'un traité à l\'autre, null aux extrémités', () => {
    assert.deepStrictEqual(M.step(index, { id: 'berakhot', chapter: 1 }, 1), { id: 'berakhot', chapter: 2 });
    assert.deepStrictEqual(M.step(index, { id: 'berakhot', chapter: 9 }, 1), { id: 'peah', chapter: 1 });
    assert.deepStrictEqual(M.step(index, { id: 'peah', chapter: 1 }, -1), { id: 'berakhot', chapter: 9 });
    assert.strictEqual(M.step(index, { id: 'berakhot', chapter: 1 }, -1), null);
    const last = M.find(index, 'oktzin');
    assert.strictEqual(M.step(index, { id: 'oktzin', chapter: last.chapters }, 1), null);
});

test('un commentaire : mot commenté, citation et texte, sans HTML', () => {
    assert.deepStrictEqual(M.parseComment('<b>מאימתי</b> קורין <i>ושננתם</i>.'), [
        { s: 'מאימתי', k: 'b' }, { s: ' קורין ', k: '' }, { s: 'ושננתם', k: 'i' }, { s: '.', k: '' }
    ]);
    assert.deepStrictEqual(M.parseComment(''), []);
});

test('sans voyelles : les points et les accents partent, les lettres restent', () => {
    assert.strictEqual(M.stripMarks('מֵאֵימָתַי'), 'מאימתי');
});
