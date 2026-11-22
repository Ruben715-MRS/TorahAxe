const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/libraryCore.js');
const T = require('../js/transmissionCore.js');
const A = require('../js/authorGameCore.js');

test('œuvres : identifiants uniques, genre connu, dates ordonnées, maître de la chaîne existant', () => {
    const ids = L.WORKS.map(w => w.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    L.WORKS.forEach(w => {
        assert.ok(L.GENRES.some(g => g.id === w.genre), w.id + ' : genre');
        assert.ok(w.fr && w.author && w.desc, w.id);
        assert.ok(w.from <= w.to, w.id + ' : dates');
        if (w.authorId) assert.ok(T.byId(w.authorId), w.id + ' : maître inconnu ' + w.authorId);
        assert.ok(L.ERAS.some(e => e.id === L.eraOf(w)), w.id);
    });
});

test('complément de la bibliographie : daté par la vie de l\'auteur, jamais posé dans le jeu', () => {
    const bib = L.WORKS.filter(w => w.bib);
    assert.ok(bib.length >= 100);
    bib.forEach(w => {
        assert.ok(['life', 'died', 'contemp', ''].indexOf(w.life) !== -1, w.id);
        assert.ok(!A.authorAsked(w) && !A.eraAsked(w) && !A.dateAsked(w), w.id + ' : posée dans le jeu');
    });
    assert.strictEqual(L.dating(L.byId('maharcha')), 'auteur : 1555–1632');
    assert.strictEqual(L.dating(L.byId('beer_yitshak')), 'auteur mort en 1864');
    assert.strictEqual(L.dating(L.byId('ale_shour')), 'auteur contemporain');
    assert.strictEqual(L.eraOf(L.byId('maharcha')), 'aharonim');
    assert.strictEqual(L.eraOf(L.byId('mizrahi')), 'richonim');
});

test('recherche : titre, auteur ou hébreu ; les liens vers les maîtres de la chaîne', () => {
    assert.ok(L.search('malbim').some(w => w.id === 'malbim'));
    assert.ok(L.search('העמק דבר').some(w => w.id === 'haamek_davar'));
    assert.ok(L.worksOf('netziv').some(w => w.id === 'haamek_davar'));
    assert.ok(L.ofGenre('moussar').length >= 8);
});
