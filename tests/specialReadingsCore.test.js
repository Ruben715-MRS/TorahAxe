const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/specialReadingsCore.js');
const Refs = require('../js/torahRefs.js');
const data = require('../data/torah/special-readings.json');
const weekday = require('../data/torah/weekday.json');

const byId = Object.fromEntries(data.items.map(it => [it.id, it]));

// Le tableau « Lecture de la Torah, du Maftir et des Haftarot spéciales » du livre, recopié ici (sans les numéros de page, qui ne concernent que lui).
// t : la Torah ; m : le maftir ; h : la haftara. « T » = la paracha de la semaine. Les références du livre « Nbr. 28, 1 à 15 » s'écrivent ici « Nombres 28:1-15 ».
const FAST = 'Exode 32:11-14 ; 34:1-10';
const BOOK = {
    'roch-hodech': { t: 'Nombres 28:1-15', m: [], h: [] },
    'chabbat-erev-rh': { t: 'T', m: 'T', h: ['Samuel I 20:18-42'] },
    'chabbat-rh': { t: 'T', m: ['Nombres 28:9-15'], h: ['Isaïe 66:1-24'] },
    'rh-1': { t: 'Genèse 21:1-34', m: ['Nombres 29:1-6'], h: ['Samuel I 1:1-2:10'] },
    'rh-2': { t: 'Genèse 22:1-24', m: ['Nombres 29:1-6'], h: ['Jérémie 31:1-19'] },
    'guedalia': { t: FAST, m: [], h: ['Isaïe 55:6-56:8'] },
    'kippour-cha': { t: 'Lévitique 16:1-34', m: ['Nombres 29:7-11'], h: ['Isaïe 57:14-58:14'] },
    'kippour-min': { t: 'Lévitique 18:1-30', m: [], h: ['Jonas 1:1-4:11', 'Michée 7:18-20'] },
    'souccot-1': { t: 'Lévitique 22:26-23:44', m: ['Nombres 29:12-16'], h: ['Zacharie 14:1-21'] },
    'souccot-2': { t: 'Lévitique 22:26-23:44', m: ['Nombres 29:12-16'], h: ['Rois I 8:2-21'] },
    'souccot-hm-1': { t: 'Nombres 29:17-25', m: [], h: [] },
    'souccot-hm-2': { t: 'Nombres 29:20-28', m: [], h: [] },
    'souccot-hm-3': { t: 'Nombres 29:23-31', m: [], h: [] },
    'souccot-hm-4': { t: 'Nombres 29:26-34', m: [], h: [] },
    // Note 2 du livre : le maftir est celui du jour de 'Hol HaMoèd (1er, 2e et 4e jour ; le 3e jour, Nombres 29:23-28, est ajouté d'après Hebcal).
    'souccot-chabbat-hm': { t: 'Exode 33:12-34:26', m: ['Nombres 29:17-22', 'Nombres 29:20-25', 'Nombres 29:23-28', 'Nombres 29:26-31'], h: ['Ézéchiel 38:18-39:16'] },
    'hochaana-rabba': { t: 'Nombres 29:26-34', m: [], h: [] },
    'chemini-atseret': { t: 'Deutéronome 14:22-16:17', m: ['Nombres 29:35-30:1'], h: ['Rois I 8:54-9:1'] },
    'simhat-torah': { t: 'Deutéronome 33:1-34:12 / Genèse 1:1-2:3', m: ['Nombres 29:35-30:1'], h: ['Josué 1:1-18'] },
    'hanouca-1': { t: 'Nombres 7:1-17', m: [], h: [] },
    'hanouca-2': { t: 'Nombres 7:18-29', m: [], h: [] },
    'hanouca-3': { t: 'Nombres 7:24-35', m: [], h: [] },
    'hanouca-4': { t: 'Nombres 7:30-41', m: [], h: [] },
    'hanouca-5': { t: 'Nombres 7:36-47', m: [], h: [] },
    'hanouca-6': { t: 'Nombres 28:1-15 / Nombres 7:42-47', m: [], h: [] },
    'hanouca-7': { t: 'Nombres 7:48-59', m: [], h: [] },
    'hanouca-7-rh': { t: 'Nombres 28:1-15 / Nombres 7:48-53', m: [], h: [] },
    'hanouca-8': { t: 'Nombres 7:54-8:4', m: [], h: [] },
    // Note 3 du livre : le maftir est celui du jour de Hanouca.
    'chabbat-hanouca-1': { t: 'T', m: ['Nombres 7:1-17', 'Nombres 7:18-23', 'Nombres 7:24-29', 'Nombres 7:30-35', 'Nombres 7:36-41', 'Nombres 7:42-47', 'Nombres 7:48-53'], h: ['Zacharie 2:14-4:7'] },
    'chabbat-hanouca-2': { t: 'T', m: ['Nombres 7:54-8:4'], h: ['Rois I 7:40-50'] },
    'dix-tevet': { t: FAST, m: [], h: ['Isaïe 55:6-56:8'] },
    'chekalim': { t: 'T', m: ['Exode 30:11-16'], h: ['Rois II 11:17-12:17'] },
    'zakhor': { t: 'T', m: ['Deutéronome 25:17-19'], h: ['Samuel I 15:1-34'] },
    'esther': { t: FAST, m: [], h: ['Isaïe 55:6-56:8'] },
    'pourim': { t: 'Exode 17:8-16', m: [], h: [] },
    'para': { t: 'T', m: ['Nombres 19:1-22'], h: ['Ézéchiel 36:16-38'] },
    'hahodech': { t: 'T', m: ['Exode 12:1-20'], h: ['Ézéchiel 45:16-46:18'] },
    'chabbat-hagadol': { t: 'T', m: 'T', h: ['Malachie 3:4-24'] },
    'pessah-1': { t: 'Exode 12:21-51', m: ['Nombres 28:16-25'], h: ['Josué 3:5-7', 'Josué 5:2-6:1', 'Josué 6:27'] },
    'pessah-2': { t: 'Lévitique 22:26-23:44', m: ['Nombres 28:16-25'], h: ['Rois II 23:1-9', 'Rois II 23:21-25'] },
    'pessah-hm-1': { t: 'Exode 13:1-16 / Nombres 28:19-25', m: [], h: [] },
    'pessah-hm-2': { t: 'Exode 22:24-23:19 / Nombres 28:19-25', m: [], h: [] },
    'pessah-hm-3': { t: 'Exode 34:1-26 / Nombres 28:19-25', m: [], h: [] },
    'pessah-hm-4': { t: 'Nombres 9:1-14 / Nombres 28:19-25', m: [], h: [] },
    'pessah-chabbat-hm': { t: 'Exode 33:12-34:26', m: ['Nombres 28:19-25'], h: ['Ézéchiel 37:1-14'] },
    'pessah-7': { t: 'Exode 13:17-15:26', m: ['Nombres 28:19-25'], h: ['Samuel II 22:1-51'] },
    'pessah-8': { t: 'Deutéronome 15:19-16:17', m: ['Nombres 28:19-25'], h: ['Isaïe 10:32-12:6'] },
    'pessah-8-chabbat': { t: 'Deutéronome 14:22-16:17', m: ['Nombres 28:19-25'], h: ['Isaïe 10:32-12:6'] },
    'chavouot-1': { t: 'Exode 19:1-20:23', m: ['Nombres 28:26-31'], h: ['Ézéchiel 1:1-28', 'Ézéchiel 3:12'] },
    'chavouot-2': { t: 'Deutéronome 15:19-16:17', m: ['Nombres 28:26-31'], h: ['Habakkouk 2:20-3:19'] },
    'chavouot-2-chabbat': { t: 'Deutéronome 14:22-16:17', m: ['Nombres 28:26-31'], h: ['Habakkouk 2:20-3:19'] },
    'tamouz-17': { t: FAST, m: [], h: ['Isaïe 55:6-56:8'] },
    'ticha-beav-cha': { t: 'Deutéronome 4:25-40', m: [], h: ['Jérémie 8:13-9:23'] },
    'ticha-beav-min': { t: FAST, m: [], h: ['Isaïe 55:6-56:8'] }
};

function torahLabel(item) {
    if (item.torahText) return 'T';
    return item.torah.map(b => C.rangesLabel(b.r)).join(' / ');
}
function maftirLabels(item) {
    if (item.maftirText) return 'T';
    return (item.maftir || []).map(m => C.refLabel(m.r));
}

test('les données : tous les moments du tableau du livre, ni plus ni moins', () => {
    assert.deepStrictEqual(data.items.map(i => i.id).sort(), Object.keys(BOOK).sort());
    data.items.forEach(it => assert.ok(data.groups.some(g => g.id === it.g), it.id + ' : groupe inconnu'));
});

test('les références : celles du livre, pour la Torah, le maftir et la haftara', () => {
    data.items.forEach(it => {
        const b = BOOK[it.id];
        assert.strictEqual(torahLabel(it), b.t, it.id + ' : Torah');
        assert.deepStrictEqual(maftirLabels(it), b.m, it.id + ' : maftir');
        assert.deepStrictEqual(it.haftara, b.h, it.id + ' : haftara');
    });
});

// Les versets d'une plage, par numéro d'ordre dans toute la Torah : sert à comparer des plages sans compter les chapitres à la main.
function indices(r) {
    const a = Refs.indexOf({ book: r[0], chapter: r[1], verse: r[2] }), b = Refs.indexOf({ book: r[0], chapter: r[3], verse: r[4] });
    assert.ok(a >= 0 && b >= 0, 'verset inexistant : ' + C.refLabel(r));
    assert.ok(a <= b, 'plage à l\'envers : ' + C.refLabel(r));
    const out = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
}

test('chaque plage existe dans la Torah (livre, chapitre, verset) et va dans le bon sens', () => {
    data.items.forEach(it => C.allRanges(it).forEach(r => indices(r)));
});

test('les montées recouvrent exactement la lecture du livre : aucun verset en trop, en moins ou en double', () => {
    // Seul chevauchement connu : à Roch 'Hodech, le verset 28:3 est lu par le Cohen (28:1-3) et par le Lévi (28:3-5).
    const OVERLAP = { 'roch-hodech': 1 };
    data.items.forEach(it => (it.torah || []).forEach(b => {
        const wanted = [].concat(...b.r.map(indices));
        [b.a, b.s].filter(Boolean).forEach(list => {
            const got = [].concat(...list.map(indices));
            assert.deepStrictEqual([...new Set(got)], wanted, it.id + ' : ' + C.rangesLabel(b.r));
            assert.strictEqual(got.length - wanted.length, OVERLAP[it.id] || 0, it.id + ' : versets lus deux fois');
        });
        if (b.rep) {
            const set = new Set(wanted);
            indices(b.rep).forEach(i => assert.ok(set.has(i), it.id + ' : la reprise sort de la lecture'));
        }
    }));
});

test('le maftir est une plage unique, hors de la lecture quand elle est dans un autre livre', () => {
    data.items.forEach(it => (it.maftir || []).forEach(m => assert.strictEqual(m.r.length, 5)));
});

test('le nombre de montées : 3 pour un jeûne, 4 à Roch \'Hodech, 5 un jour de fête, 7 quand la fête tombe un Chabbat', () => {
    const n = (id, shabbat) => byId[id].torah.reduce((s, b) => s + C.aliyot(b, shabbat, s).length, 0);
    ['guedalia', 'dix-tevet', 'esther', 'tamouz-17', 'ticha-beav-cha', 'ticha-beav-min', 'pourim'].forEach(id => assert.strictEqual(n(id), 3, id));
    assert.strictEqual(n('roch-hodech'), 4);
    ['rh-1', 'rh-2', 'souccot-1', 'souccot-2', 'chemini-atseret', 'pessah-1', 'pessah-2', 'pessah-8', 'chavouot-1', 'chavouot-2', 'pessah-7'].forEach(id => assert.strictEqual(n(id), 5, id));
    ['rh-1', 'souccot-1', 'chemini-atseret', 'pessah-1', 'pessah-7'].forEach(id => assert.strictEqual(n(id, true), 7, id));
    assert.strictEqual(n('kippour-cha'), 6);
    assert.strictEqual(n('kippour-cha', true), 7);
    ['pessah-chabbat-hm', 'souccot-chabbat-hm', 'pessah-8-chabbat', 'chavouot-2-chabbat'].forEach(id => assert.strictEqual(n(id), 7, id));
});

test('Hol HaMoèd : trois montées, puis la quatrième (reprise à Souccot, Nombres 28:19-25 à Pessa\'h)', () => {
    const sou = byId['souccot-hm-1'].torah[0];
    const a = C.aliyot(sou, false, 0);
    assert.strictEqual(a.length, 4);
    assert.ok(a[3].repeat);
    assert.strictEqual(C.refLabel(a[3].range), 'Nombres 29:17-22');
    const pes = byId['pessah-hm-1'];
    assert.strictEqual(C.baseOf(pes, 1, false), 3);
    assert.strictEqual(C.aliyot(pes.torah[1], false, 3)[0].name, '4e');
});

test('les noms des montées : Cohen, Lévi, Israël, puis le numéro', () => {
    assert.deepStrictEqual([1, 2, 3, 4, 7].map(C.aliyahName), ['Cohen', 'Lévi', 'Israël', '4e', '7e']);
});

test('quelles fêtes ont un découpage particulier un Chabbat', () => {
    assert.deepStrictEqual(data.items.filter(C.hasShabbat).map(i => i.id).sort(),
        ['chemini-atseret', 'kippour-cha', 'pessah-1', 'pessah-7', 'rh-1', 'simhat-torah', 'souccot-1']);
});

test('étiquettes de références', () => {
    assert.strictEqual(C.refLabel([4, 29, 12, 29, 16]), 'Nombres 29:12-16');
    assert.strictEqual(C.refLabel([5, 33, 1, 34, 12]), 'Deutéronome 33:1-34:12');
    assert.strictEqual(C.refLabel([2, 12, 3, 12, 3]), 'Exode 12:3');
    assert.strictEqual(C.rangesLabel([[2, 32, 11, 32, 14], [2, 34, 1, 34, 10]]), 'Exode 32:11-14 ; 34:1-10');
    assert.deepStrictEqual(C.tanakhRefs([[4, 29, 12, 29, 16]]), [['Numbers', '29:12', '29:16']]);
});

test('segments : une plage coupée par chapitre', () => {
    const lengths = [[31, 25], [22, 25, 22], [], [54, 34, 51, 49, 31, 27, 89], []];
    assert.deepStrictEqual(C.segments([4, 3, 40, 4, 2], lengths.map(() => [0, 0, 51, 49])), [{ c: 3, from: 40, to: 51 }, { c: 4, from: 1, to: 2 }]);
    assert.deepStrictEqual(C.segments([4, 1, 5, 1, 9], lengths), [{ c: 1, from: 5, to: 9 }]);
});

// Ce que l'application affiche déjà pour les jours de semaine (data/torah/weekday.json : Roch 'Hodech, jeûne public, Pourim, 9 Av) doit être ce qu'indique le livre.
test('concordance avec les lectures de semaine déjà dans l\'application (weekday.json)', () => {
    const same = (special, id) => {
        const a = C.aliyot(byId[id].torah[0], false, 0).map(x => x.range);
        assert.deepStrictEqual(a, special.a.map(r => [special.book, r[0], r[1], r[2], r[3]]), id);
    };
    same(weekday.special.rc, 'roch-hodech');
    ['guedalia', 'dix-tevet', 'esther', 'tamouz-17', 'ticha-beav-min'].forEach(id => same(weekday.special.fast, id));
    same(weekday.special.purim, 'pourim');
    same(weekday.special.tishaBav, 'ticha-beav-cha');
});

test('hébreu : chiffres, livres et références', () => {
    assert.deepStrictEqual([1, 15, 16, 21, 34, 12].map(C.numeral), ['א', 'טו', 'טז', 'כא', 'לד', 'יב']);
    assert.strictEqual(C.refLabelHe([4, 29, 12, 29, 16]), 'במדבר כט:יב-טז');
    assert.strictEqual(C.rangesLabelHe([[5, 33, 1, 34, 12]]), 'דברים לג:א-לד:יב');
    assert.strictEqual(C.rangesLabelHe([[2, 32, 11, 32, 14], [2, 34, 1, 34, 10]]), 'שמות לב:יא-יד ; לד:א-י');
});

test('chaque moment a un nom hébreu propre (le jour est distingué)', () => {
    const names = data.items.map(i => i.he);
    assert.strictEqual(new Set(names).size, names.length - names.filter((n, i) => names.indexOf(n) !== i).length);
    assert.notStrictEqual(byId['rh-1'].he, byId['rh-2'].he);
    assert.notStrictEqual(byId['hanouca-1'].he, byId['hanouca-8'].he);
});

test('haftarot : chaque référence se lit et existe dans le Tanakh de l\'application', () => {
    const H = require('../js/haftarotCore.js');
    data.items.forEach(it => it.haftara.forEach(text => {
        const p = C.parseHaftara(text);
        assert.ok(p, it.id + ' : ' + text);
        const info = H.parseRef(p.ref);
        assert.ok(info, text + ' : livre inconnu du Tanakh');
        const book = require('../data/tanakh/' + info.id + '.json');
        const first = info.part && book.parts ? book.parts.find(x => x.fr === info.part).first : 0;
        const segs = H.segments(p.ref, first, book.chapters.map(c => c.length));
        segs.forEach(s => { assert.ok(book.chapters[s.c], text); assert.ok(s.to <= book.chapters[s.c].length && s.from < s.to, text); });
    }));
    assert.deepStrictEqual(C.haftaraRefs(['Jérémie 31:1-19'])[0], ['Jeremiah', '31:1', '31:19']);
    assert.strictEqual(C.haftaraLabel(['Michée 7:18-20'], true), 'מיכה ז:יח-כ');
});
