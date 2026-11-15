const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const T = require('../js/talmudCore.js');
const Z = require('../js/zmanimCore.js');

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

test('chaque traité de l\'index : le fichier a autant d\'amoudim, aucun segment vide (hors Nazir 33b), des balises <b> seulement', () => {
    const list = T.tractates(index);
    assert.ok(list.length >= 1);
    list.forEach(tr => {
        const book = read(tr.id);
        assert.strictEqual(book.id, tr.id);
        assert.strictEqual(book.start, tr.start, tr.id);
        assert.strictEqual(book.pages.length, tr.amudim, tr.id);
        assert.strictEqual(book.chapters.length, tr.chapters.length, tr.id);
        book.pages.forEach((page, p) => {
            // Seul amoud vide : Nazir 33b, que l'édition de Vilna saute dans sa numérotation.
            if (!page.length) assert.strictEqual(tr.id + ' ' + T.amoudLabel(tr.start, p), 'nazir 33b', tr.id + ' ' + T.amoudLabel(tr.start, p) + ' vide');
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

test('le Talmud complet : 37 traités, 5 350 amoudim, le dernier daf de chacun est celui de l\'édition de Vilna', () => {
    const last = { berakhot: 64, shabbat: 157, eruvin: 105, pesachim: 121, 'rosh-hashanah': 35, yoma: 88, sukkah: 56, beitzah: 40, taanit: 31, megillah: 32, 'moed-katan': 29, chagigah: 27,
        yevamot: 122, ketubot: 112, nedarim: 91, nazir: 66, sotah: 49, gittin: 90, kiddushin: 82, 'bava-kamma': 119, 'bava-metzia': 119, 'bava-batra': 176, sanhedrin: 113, makkot: 24,
        shevuot: 49, 'avodah-zarah': 76, horayot: 14, zevachim: 120, menachot: 110, chullin: 142, bekhorot: 61, arakhin: 34, temurah: 34, keritot: 28, meilah: 22, tamid: 33, niddah: 73 };
    const list = T.tractates(index);
    assert.strictEqual(list.length, 37);
    assert.strictEqual(list.reduce((n, t) => n + t.amudim, 0), 5350);
    list.forEach(t => assert.strictEqual(T.dafOf(T.amoudLabel(t.start, t.amudim - 1)), last[t.id], t.id));
    assert.deepStrictEqual(list.map(t => t.seder).filter((s, i, a) => a.indexOf(s) === i), ['zeraim', 'moed', 'nashim', 'nezikin', 'kodashim', 'tohorot']);
    assert.strictEqual(T.find(index, 'tamid').start, '25b');
});

test('navigation entre traités : de la fin de Berakhot au début de Chabbat, et retour', () => {
    const tr = T.find(index, 'berakhot');
    assert.deepStrictEqual(T.step(index, { id: 'berakhot', page: tr.amudim - 1 }, 1), { id: 'shabbat', page: 0 });
    const sh = T.find(index, 'shabbat');
    assert.deepStrictEqual(T.step(index, { id: 'shabbat', page: 0 }, -1), { id: 'berakhot', page: tr.amudim - 1 });
    assert.ok(sh.amudim > 300);
});

test('commentaires (Rachi, Rachbam, Ran, Rabbénou Guerchom, Tossafot) : alignés sur les amoudim et les segments de la Guémara, masques des pastilles cohérents', () => {
    const PREFIX = { rashi: 'rashi-', rashbam: 'rashbam-', ran: 'ran-', 'rabbeinu-gershom': 'rabbeinu-gershom-', tosafot: 'tosafot-' };
    let withComm = 0;
    T.tractates(index).forEach(tr => {
        const info = tr;
        if (!info.comm || !info.comm.length) return;
        withComm++;
        const book = read(tr.id);
        const counts = read('counts-' + tr.id);
        assert.deepStrictEqual(counts.order, info.comm, tr.id + ' : ordre des masques = commentateurs de l\'index');
        assert.strictEqual(counts.pages.length, tr.amudim, tr.id);
        info.comm.forEach((id, bit) => {
            const file = read(PREFIX[id] + tr.id);
            assert.strictEqual(file.id, tr.id);
            assert.strictEqual(file.commentator, id);
            assert.strictEqual(file.pages.length, tr.amudim, tr.id + ' ' + id);
            file.pages.forEach((page, p) => {
                assert.ok(page.length <= book.pages[p].length, tr.id + ' ' + id + ' ' + T.amoudLabel(tr.start, p) + ' : plus de segments que la Guémara');
                page.forEach((list, k) => {
                    assert.ok(Array.isArray(list), tr.id + ' ' + id);
                    list.forEach(c => {
                        assert.ok(typeof c === 'string' && c.trim() === c && c.length > 0, tr.id + ' ' + id + ' commentaire vide');
                        assert.ok(!/<(?!\/?(?:b|i|small)>)/.test(c), tr.id + ' ' + id + ' balise inattendue : ' + c.slice(0, 60));
                    });
                    const bitSet = ((counts.pages[p][k] || 0) >> bit) & 1;
                    assert.strictEqual(bitSet, list.length ? 1 : 0, tr.id + ' ' + id + ' ' + T.amoudLabel(tr.start, p) + ':' + (k + 1) + ' : masque');
                });
            });
        });
    });
    assert.ok(withComm >= 1);
});

test('Berakhot : Rachi (3 138 commentaires) et Tossafot (501), le mot commenté en gras', () => {
    const rashi = read('rashi-berakhot');
    const tosafot = read('tosafot-berakhot');
    const all = (f) => f.pages.flatMap(p => p.flatMap(l => l));
    assert.strictEqual(all(rashi).length, 3138);
    assert.strictEqual(all(tosafot).length, 501);
    assert.ok(all(rashi).filter(c => c.startsWith('<b>')).length > 3000);
    assert.ok(all(tosafot).filter(c => c.startsWith('<b>')).length > 450);
    // Le premier commentaire de Rachi porte sur le premier segment de la Guémara : « Meéimatai korin et Chema ».
    assert.ok(/^<b>מאימתי קורין/.test(rashi.pages[0][0][0]));
    assert.ok(/^<b>מאימתי קורין/.test(tosafot.pages[0][0][0]));
    assert.deepStrictEqual(T.maskIds(['rashi', 'tosafot'], 3), ['rashi', 'tosafot']);
    assert.deepStrictEqual(T.maskIds(['rashi', 'tosafot'], 2), ['tosafot']);
});

test('Rachbam : seulement Bava Batra (dès 29a) et Pessahim (99b à 121b), là où Rachi ne commente plus', () => {
    const withRashbam = T.tractates(index).filter(t => t.comm.includes('rashbam')).map(t => t.id);
    assert.deepStrictEqual(withRashbam, ['pesachim', 'bava-batra']);
    const range = (id) => {
        const tr = T.find(index, id);
        const pages = read('rashbam-' + id).pages.map((p, i) => (p.some(l => l.length) ? T.amoudLabel(tr.start, i) : null)).filter(Boolean);
        return [pages[0], pages[pages.length - 1]];
    };
    assert.deepStrictEqual(range('bava-batra'), ['29a', '176b']);
    assert.deepStrictEqual(range('pesachim'), ['99b', '121b']);
    // Bava Batra : Rachi s'arrête à 29a.
    const bb = T.find(index, 'bava-batra');
    const rashi = read('rashi-bava-batra');
    const lastRashi = rashi.pages.map((p, i) => (p.some(l => l.length) ? i : -1)).filter(i => i >= 0).pop();
    assert.strictEqual(T.amoudLabel(bb.start, lastRashi), '29a');
});

test('Ran sur Nedarim (2a à 91b) et Rabbénou Guerchom sur Makkot (24a-24b) : seulement là', () => {
    assert.deepStrictEqual(T.tractates(index).filter(t => t.comm.includes('ran')).map(t => t.id), ['nedarim']);
    assert.deepStrictEqual(T.tractates(index).filter(t => t.comm.includes('rabbeinu-gershom')).map(t => t.id), ['makkot']);
    const labels = (id, file) => {
        const tr = T.find(index, id);
        return read(file).pages.map((p, i) => (p.some(l => l.length) ? T.amoudLabel(tr.start, i) : null)).filter(Boolean);
    };
    const ran = labels('nedarim', 'ran-nedarim');
    assert.strictEqual(ran[0], '2a');
    assert.strictEqual(ran[ran.length - 1], '91b');
    assert.deepStrictEqual(labels('makkot', 'rabbeinu-gershom-makkot'), ['24a', '24b']);
    const count = (f) => read(f).pages.flatMap(p => p.flatMap(l => l)).length;
    assert.strictEqual(count('rabbeinu-gershom-makkot'), 10);
    assert.ok(count('ran-nedarim') > 1900);
});

test('Daf Yomi : chaque jour du cycle (2 711) pointe sur un amoud qui existe, hors Chekalim, Kinnim et Midot', () => {
    assert.strictEqual(T.DAF_YOMI.length, Z.MASECHTOT.length);
    // Chaque traité du Daf Yomi a le même dernier daf que dans l'index (le Daf Yomi compte des dapim, l'index des amoudim).
    T.DAF_YOMI.forEach((id, i) => {
        if (!id) return;
        const tr = T.find(index, id);
        assert.ok(tr, id);
        assert.strictEqual(T.dafOf(T.amoudLabel(tr.start, tr.amudim - 1)), Z.MASECHTOT[i][2], id + ' : dernier daf');
    });
    const noText = new Set([4, 36, 38]);   // Chekalim (Talmud de Jérusalem), Kinnim, Midot
    T.DAF_YOMI.forEach((id, i) => assert.strictEqual(id === null, noText.has(i), 'traité n°' + i));
    assert.strictEqual(Z.dafYomi(1), null);   // avant le cycle de 2020
    // Le jour 1 du 14e cycle : Berakhot 2a ; puis tous les jours, un par un.
    const CY = require('../js/calendarYearCore.js');
    const first = CY.gregorianToFixed(2020, 1, 5);
    let missing = 0, opened = 0;
    for (let k = 0; k < Z.DAF_CYCLE_LENGTH; k++) {
        const d = Z.dafYomi(first + k);
        assert.ok(d, 'jour ' + k);
        const target = T.dafYomiTarget(index, d);
        if (noText.has(d.id)) { assert.strictEqual(target, null); missing++; continue; }
        assert.ok(target, d.masechet + ' ' + d.daf + ' : pas d\'amoud');
        assert.strictEqual(target.label, d.daf + 'a');
        opened++;
    }
    assert.strictEqual(opened + missing, 2711);
    assert.strictEqual(missing, 21 + 3 + 4);   // Chekalim 2-22, Kinnim 23-25, Midot 34-37
    assert.deepStrictEqual(T.dafYomiTarget(index, Z.dafYomi(first)), { id: 'berakhot', label: '2a', page: 0 });
    assert.deepStrictEqual(T.dafYomiTarget(null, Z.dafYomi(first)), { id: 'berakhot', label: '2a', page: -1 });
});
