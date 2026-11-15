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

const COMMENTATORS = ['rambam', 'rash', 'bartenura', 'melekhet', 'tosafot-yom-tov', 'gra', 'tiferet-yisrael'];
const PREFIX = { rambam: 'rambam-', rash: 'rash-', bartenura: 'bartenura-', melekhet: 'melekhet-', 'tosafot-yom-tov': 'tyt-', gra: 'gra-', 'tiferet-yisrael': 'tiferet-' };
const read = (name) => JSON.parse(fs.readFileSync(path.join(DIR, name + '.json'), 'utf8'));

test('chaque traité : le bon nombre de chapitres et de michnayot, aucune michna vide', () => {
    M.tractates(index).forEach(t => {
        const book = read(t.id);
        assert.strictEqual(book.chapters.length, t.chapters, t.id);
        assert.strictEqual(book.chapters.reduce((n, c) => n + c.length, 0), t.mishnayot, t.id);
        book.chapters.forEach((ch, c) => ch.forEach((text, i) => {
            assert.ok(typeof text === 'string' && text.length > 0, t.id + ' ' + (c + 1) + ':' + (i + 1) + ' sans texte');
            assert.ok(!/</.test(text), t.id + ' balise dans la Michna');
        }));
    });
});

test('commentateurs : fichiers déclarés par l\'index, alignés sur la Michna, balises limitées', () => {
    const seen = {};
    M.tractates(index).forEach(t => {
        const book = read(t.id);
        assert.ok(Array.isArray(t.comm) && t.comm.length > 0, t.id + ' : aucun commentateur');
        t.comm.forEach(id => {
            assert.ok(COMMENTATORS.includes(id), 'commentateur inconnu ' + id);
            seen[id] = (seen[id] || 0) + 1;
            const data = read(PREFIX[id] + t.id);
            assert.strictEqual(data.chapters.length, book.chapters.length, id + ' ' + t.id + ' : chapitres');
            data.chapters.forEach((ch, c) => {
                assert.strictEqual(ch.length, book.chapters[c].length, id + ' ' + t.id + ' ' + (c + 1) + ' : michnayot');
                ch.forEach(list => list.forEach(x => {
                    assert.ok(typeof x === 'string' && x.length > 0);
                    assert.ok(!/<(?!\/?(?:b|i|small)>)/.test(x), id + ' ' + t.id + ' balise inattendue');
                }));
            });
        });
    });
    assert.strictEqual(seen.rambam, 63);
    assert.strictEqual(seen.bartenura, 63);
    assert.strictEqual(seen['tosafot-yom-tov'], 63);
    assert.strictEqual(seen.melekhet, 63);
    assert.strictEqual(seen['tiferet-yisrael'], 63);
    assert.strictEqual(seen.rash, 21);
    assert.strictEqual(seen.gra, 13);
});

test('les masques des pastilles disent exactement quelles michnayot ont un commentaire', () => {
    M.tractates(index).forEach(t => {
        const counts = read('counts-' + t.id);
        assert.deepStrictEqual(counts.order, t.comm, t.id);
        const books = counts.order.map(id => read(PREFIX[id] + t.id));
        counts.chapters.forEach((ch, c) => ch.forEach((mask, i) => {
            const ids = M.maskIds(counts.order, mask);
            counts.order.forEach((id, k) => {
                const has = books[k].chapters[c][i].length > 0;
                assert.strictEqual(ids.includes(id), has, t.id + ' ' + (c + 1) + ':' + (i + 1) + ' ' + id);
            });
        }));
    });
});

test('maskIds : les bits du masque donnent les commentateurs dans l\'ordre', () => {
    assert.deepStrictEqual(M.maskIds(['a', 'b', 'c'], 5), ['a', 'c']);
    assert.deepStrictEqual(M.maskIds(['a', 'b'], 0), []);
    assert.deepStrictEqual(M.maskIds(null, 3), []);
});

test('chapitre suivant et précédent : dans le traité, puis d\'un traité à l\'autre, null aux extrémités', () => {
    assert.deepStrictEqual(M.step(index, { id: 'berakhot', chapter: 1 }, 1), { id: 'berakhot', chapter: 2 });
    assert.deepStrictEqual(M.step(index, { id: 'berakhot', chapter: 9 }, 1), { id: 'peah', chapter: 1 });
    assert.deepStrictEqual(M.step(index, { id: 'peah', chapter: 1 }, -1), { id: 'berakhot', chapter: 9 });
    assert.strictEqual(M.step(index, { id: 'berakhot', chapter: 1 }, -1), null);
    const last = M.find(index, 'oktzin');
    assert.strictEqual(M.step(index, { id: 'oktzin', chapter: last.chapters }, 1), null);
});

test('un commentaire : mot commenté, citation, variante et texte, sans HTML', () => {
    assert.deepStrictEqual(M.parseComment('<b>מאימתי</b> קורין <i>ושננתם</i>.'), [
        { s: 'מאימתי', k: 'b' }, { s: ' קורין ', k: '' }, { s: 'ושננתם', k: 'i' }, { s: '.', k: '' }
    ]);
    assert.deepStrictEqual(M.parseComment('א <small>ב</small> ג'), [{ s: 'א ', k: '' }, { s: 'ב', k: 'small' }, { s: ' ג', k: '' }]);
    assert.deepStrictEqual(M.parseComment(''), []);
});

test('sans voyelles : les points et les accents partent, les lettres restent', () => {
    assert.strictEqual(M.stripMarks('מֵאֵימָתַי'), 'מאימתי');
});

test('les résumés : un par ordre, par traité et par chapitre, tous écrits', () => {
    const resume = JSON.parse(fs.readFileSync(path.join(DIR, 'resume.json'), 'utf8'));
    index.sedarim.forEach(s => assert.ok(resume.sedarim[s.id] && resume.sedarim[s.id].length > 20, 'ordre ' + s.id));
    M.tractates(index).forEach(t => {
        const r = resume.tractates[t.id];
        assert.ok(r && r.book.length > 20, t.id + ' : résumé du traité');
        assert.strictEqual(r.chapters.length, t.chapters, t.id + ' : un résumé par chapitre');
        r.chapters.forEach((c, i) => assert.ok(typeof c === 'string' && c.length > 15, t.id + ' ' + (i + 1)));
    });
    assert.strictEqual(Object.keys(resume.tractates).length, 63);
});

test('summaryOf : l\'ordre, le traité et le chapitre ; vide si inconnu', () => {
    const resume = JSON.parse(fs.readFileSync(path.join(DIR, 'resume.json'), 'utf8'));
    const s = M.summaryOf(resume, index, 'berakhot', 1);
    assert.strictEqual(s.seder, resume.sedarim.zeraim);
    assert.strictEqual(s.book, resume.tractates.berakhot.book);
    assert.strictEqual(s.chapter, resume.tractates.berakhot.chapters[0]);
    assert.deepStrictEqual(M.summaryOf(resume, index, 'inconnu', 1), { seder: '', book: '', chapter: '' });
    assert.strictEqual(M.summaryOf(null, index, 'berakhot', 1).book, '');
    assert.strictEqual(M.summaryOf(resume, index, 'berakhot', 99).chapter, '');
});
