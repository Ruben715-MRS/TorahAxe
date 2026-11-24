const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const R = require('../js/nakhRefs.js');

const file = id => JSON.parse(fs.readFileSync('data/tanakh/' + id + '.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('data/tanakh/index.json', 'utf8'));

test('34 livres : 21 Neviim et 13 Ketouvim, dans l\'ordre du Tanakh', () => {
    assert.strictEqual(R.BOOKS.length, 34);
    assert.strictEqual(R.inGroup('nevi').length, 21);
    assert.strictEqual(R.inGroup('ketouvim').length, 13);
    assert.deepStrictEqual(R.BOOKS.slice(0, 9).map(b => b.fr), ['Josué', 'Juges', 'I Samuel', 'II Samuel', 'I Rois', 'II Rois', 'Isaïe', 'Jérémie', 'Ézéchiel']);
    assert.deepStrictEqual(R.BOOKS.slice(9, 21).map(b => b.fr), ['Osée', 'Joël', 'Amos', 'Abdias', 'Jonas', 'Michée', 'Nahum', 'Habacuc', 'Sophonie', 'Aggée', 'Zacharie', 'Malachie']);
    assert.strictEqual(R.BOOKS[21].fr, 'Psaumes');
    assert.strictEqual(R.BOOKS[33].fr, 'II Chroniques');
    assert.strictEqual(new Set(R.BOOKS.map(b => b.id)).size, 34);
    // Les groupes se suivent : tous les Neviim, puis tous les Ketouvim.
    assert.ok(R.BOOKS.every((b, i) => b.group === (i < 21 ? 'nevi' : 'ketouvim')));
    R.BOOKS.forEach(b => { assert.ok(b.he && /[א-ת]/.test(b.he), b.id + ' : hébreu'); assert.ok(Array.isArray(b.hide), b.id + ' : hide'); });
});

test('la disposition des chapitres et des versets est celle des fichiers de data/tanakh/', () => {
    R.FILES.forEach(id => {
        const json = file(id);
        const books = R.BOOKS.filter(b => b.file === id);
        // Les livres d'un fichier se suivent sans trou ni recouvrement et couvrent tous ses chapitres.
        let expected = 0;
        books.forEach(b => {
            assert.strictEqual(b.first, expected, b.id + ' : premier chapitre');
            assert.deepStrictEqual(b.verses, json.chapters.slice(b.first, b.first + b.chapters).map(c => c.length), b.id);
            expected += b.chapters;
        });
        assert.strictEqual(expected, json.chapters.length, id + ' : chapitres');
        assert.strictEqual(json.french.length, json.chapters.length, id + ' : traduction');
        json.chapters.forEach((c, ci) => assert.strictEqual(json.french[ci].length, c.length, id + ' ' + (ci + 1)));
        // Les noms et les parties du fichier.
        if (json.parts) json.parts.forEach((p, i) => { assert.strictEqual(books[i].fr, p.fr); assert.strictEqual(books[i].he, p.he); assert.strictEqual(books[i].first, p.first); });
        else { assert.strictEqual(books.length, 1); assert.strictEqual(books[0].fr, json.fr); }
    });
    // Tous les fichiers des Prophètes et des Hagiographes sont couverts.
    const wanted = index.books.filter(b => b.group !== 'torah').map(b => b.id);
    assert.deepStrictEqual(R.FILES.slice().sort(), wanted.slice().sort());
    assert.strictEqual(R.BOOKS.reduce((n, b) => n + b.total, 0), 17360);
});

test('ordinal, at et next : aller-retour sur tous les versets de chaque livre, bornes, versets inexistants', () => {
    R.BOOKS.forEach((b, i) => {
        for (let n = 0; n < b.total; n++) {
            const r = R.at(i, n);
            assert.strictEqual(R.ordinal(i, r.chapter, r.verse), n, b.id + ' ' + n);
        }
        assert.strictEqual(R.at(i, -1), null);
        assert.strictEqual(R.at(i, b.total), null);
        assert.strictEqual(R.next(i, b.chapters, b.verses[b.chapters - 1]), null, b.id + ' : rien après le dernier verset');
        assert.strictEqual(R.ordinal(i, 1, b.verses[0] + 1), -1);
        assert.strictEqual(R.ordinal(i, b.chapters + 1, 1), -1);
    });
    assert.strictEqual(R.ordinal(99, 1, 1), -1);
    assert.deepStrictEqual(R.next(0, 1, 1), { chapter: 1, verse: 2 });
    assert.deepStrictEqual(R.next(0, 1, 18), { chapter: 2, verse: 1 });     // Josué 1:18 → 2:1 : il passe au chapitre suivant
});

test('numérotation des chapitres : II Samuel 1 est le chapitre 32 du fichier, I Samuel 31 le 31e', () => {
    const iSam = R.BOOKS.findIndex(b => b.id === 'samuel-1');
    const iiSam = R.BOOKS.findIndex(b => b.id === 'samuel-2');
    assert.strictEqual(R.fileChapter(iSam, 31), 30);
    assert.strictEqual(R.fileChapter(iiSam, 1), 31);
    assert.strictEqual(R.bookOf('samuel', 30), iSam);
    assert.strictEqual(R.bookOf('samuel', 31), iiSam);
    assert.strictEqual(R.bookOf('samuel', 55), -1);
    assert.strictEqual(R.bookOf('inconnu', 0), -1);
    // Chaque chapitre de chaque fichier appartient à un livre, et un seul.
    R.FILES.forEach(id => {
        const n = file(id).chapters.length;
        for (let c = 0; c < n; c++) assert.ok(R.bookOf(id, c) >= 0, id + ' ' + c);
    });
});

test('label et poids', () => {
    assert.strictEqual(R.label(6, 40, 1), 'Isaïe 40:1');
    const ruth = R.BOOKS.findIndex(b => b.id === 'ruth');
    const psaumes = R.BOOKS.findIndex(b => b.id === 'psaumes');
    assert.ok(R.weight(ruth) < R.weight(psaumes));
    assert.ok(R.weight(psaumes) / R.weight(ruth) < 6);     // et non 30 (le rapport des tailles) : les petits livres sortent
});
