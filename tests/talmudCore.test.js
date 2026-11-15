const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const T = require('../js/talmudCore.js');

const DIR = path.resolve(__dirname, '..', 'data', 'talmud');
const index = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));
const read = (id) => JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8'));

test('amoudim : étiquettes, rang et écriture hébraïque', () => {
    assert.strictEqual(T.amoudLabel('2a', 0), '2a');
    assert.strictEqual(T.amoudLabel('2a', 1), '2b');
    assert.strictEqual(T.amoudLabel('2a', 124), '64a');
    assert.strictEqual(T.amoudLabel('2b', 1), '3a');
    assert.strictEqual(T.hebrewAmoud('2a'), 'ב׳ ע״א');
    assert.strictEqual(T.hebrewAmoud('13b'), 'י״ג ע״ב');
    assert.strictEqual(T.hebrewAmoud('15a'), 'ט״ו ע״א');
    assert.strictEqual(T.dafOf('13b'), 13);
});

test('chaque traité de l\'index : le fichier a autant d\'amoudim, aucun segment vide, des balises <b> seulement', () => {
    const list = T.tractates(index);
    assert.ok(list.length >= 1);
    list.forEach(tr => {
        const book = read(tr.id);
        assert.strictEqual(book.id, tr.id);
        assert.strictEqual(book.start, tr.start, tr.id);
        assert.strictEqual(book.pages.length, tr.amudim, tr.id);
        assert.strictEqual(book.chapters.length, tr.chapters.length, tr.id);
        book.pages.forEach((page, p) => {
            assert.ok(page.length > 0, tr.id + ' ' + T.amoudLabel(tr.start, p) + ' vide');
            page.forEach(seg => {
                assert.ok(typeof seg === 'string' && seg.trim() === seg && seg.length > 0, tr.id + ' segment vide ou mal rogné');
                assert.ok(!/<(?!\/?b>)/.test(seg), tr.id + ' balise inattendue : ' + seg.slice(0, 60));
                assert.ok(!/\s{2,}/.test(seg), tr.id + ' espaces doubles');
            });
        });
        // Les chapitres se suivent dans l'ordre et tombent sur un segment qui existe.
        let prev = [-1, -1];
        book.chapters.forEach(c => {
            assert.ok(c.he, tr.id + ' chapitre sans nom');
            assert.ok(c.from[0] > prev[0] || (c.from[0] === prev[0] && c.from[1] > prev[1]), tr.id + ' chapitres dans le désordre');
            assert.ok(c.from[1] < book.pages[c.from[0]].length, tr.id + ' chapitre hors du texte');
            prev = c.from;
        });
        // Le texte est de l'hébreu/araméen : lettres, voyelles, ponctuation de base, et rien d'autre.
        const text = book.pages.map(p => p.join(' ')).join(' ').replace(/<\/?b>/g, '');
        assert.ok(!/[A-Za-z0-9]/.test(text), tr.id + ' caractères latins dans le texte');
    });
});

test('Berakhot : 64 dapim (2a à 64a), 9 chapitres, un « Hadran » à la fin de chacun', () => {
    const tr = T.find(index, 'berakhot');
    assert.ok(tr);
    assert.strictEqual(tr.start, '2a');
    assert.strictEqual(tr.amudim, 125);
    assert.strictEqual(T.amoudLabel(tr.start, tr.amudim - 1), '64a');
    assert.strictEqual(tr.chapters.length, 9);
    assert.strictEqual(T.pageOf(tr, '64a'), 124);
    assert.strictEqual(T.pageOf(tr, '64b'), -1);
    assert.strictEqual(T.pageOf(tr, '1b'), -1);
    const book = read('berakhot');
    const hadran = [];
    book.pages.forEach(page => page.forEach(seg => { if (T.isHadran(seg)) hadran.push(seg); }));
    assert.strictEqual(hadran.length, 9);
    assert.strictEqual(book.pages[0][0].indexOf('<b>'), 0);
});

test('chapitres : où commence chacun, et quel chapitre contient un segment', () => {
    const tr = T.find(index, 'berakhot');
    assert.deepStrictEqual(T.chaptersStartingIn(tr, 0).map(c => c.n), [1]);
    assert.deepStrictEqual(T.chaptersStartingIn(tr, 1), []);
    const second = tr.chapters[1];
    assert.strictEqual(T.chapterAt(tr, 0, 0), 0);
    assert.strictEqual(T.chapterAt(tr, second.from[0], second.from[1]), 1);
    assert.strictEqual(T.chapterAt(tr, second.from[0], second.from[1] - 1), 0);
    assert.strictEqual(T.chapterAt(tr, tr.amudim - 1, 0), 8);
});

test('navigation : amoud suivant et précédent, arrêt aux extrémités', () => {
    const tr = T.find(index, 'berakhot');
    assert.deepStrictEqual(T.step(index, { id: 'berakhot', page: 0 }, 1), { id: 'berakhot', page: 1 });
    assert.strictEqual(T.step(index, { id: 'berakhot', page: 0 }, -1), null);   // Berakhot ouvre toujours le Talmud
    const list = T.tractates(index);
    const lastTr = list[list.length - 1];
    assert.strictEqual(T.step(index, { id: lastTr.id, page: lastTr.amudim - 1 }, 1), null);
    assert.strictEqual(T.step(index, { id: 'inconnu', page: 0 }, 1), null);
    assert.ok(tr);
});

test('les segments se découpent en morceaux gras / normaux', () => {
    const parts = T.parseComment('<b>מַתְנִי׳</b> מֵאֵימָתַי');
    assert.deepStrictEqual(parts.map(p => p.k), ['b', '']);
    assert.strictEqual(T.stripMarks('מֵאֵימָתַי'), 'מאימתי');
});
