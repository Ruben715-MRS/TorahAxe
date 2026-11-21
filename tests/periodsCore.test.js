const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/periodsData.js');
const C = require('../js/periodsCore.js');
const H = require('../js/hebrewCalendarCore.js');

const fixed = (y, m, d) => H.fixedOfGregorian(y, m, d);
const find = (view, id) => view.groups.reduce((a, g) => a.concat(g.items), []).filter(i => i.id === id)[0];

test('les données : treize périodes, des règles bien formées, un champ review partout', () => {
    assert.deepStrictEqual(D.PERIODS.map(p => p.id), ['omer', 'troissemaines', 'kippour', 'chabbat', 'roshhodesh', 'pessah', 'roshhachana', 'souccot', 'chavouot', 'hanouka', 'pourim', 'jeunes', 'tichabav']);
    const ids = [];
    D.PERIODS.forEach(p => {
        p.rules.concat(p.days || []).forEach(r => {
            ids.push(r.id);
            assert.strictEqual(typeof r.review, 'boolean', r.id + ' : review');
            if (r.st === undefined && !p.rules.includes(r)) return;   // un jour particulier n'a pas de statut
            if (p.rules.includes(r)) {
                const check = v => assert.ok(D.STATUS[v], r.id + ' : statut ' + v);
                if (typeof r.st === 'string') check(r.st);
                else {
                    assert.ok(p.phases, r.id + ' : sous-périodes');
                    const keys = Object.keys(r.st);
                    assert.ok(keys.length > 0, r.id);
                    keys.forEach(k => { assert.ok(p.phases.some(ph => ph.id === k), r.id + ' : sous-période ' + k); check(r.st[k]); });
                }
                Object.keys(r.rite || {}).forEach(rt => {
                    assert.ok(D.RITES[rt], r.id + ' : rite ' + rt);
                    if (r.rite[rt].st && typeof r.rite[rt].st === 'object') Object.keys(r.rite[rt].st).forEach(k => assert.ok(p.phases.some(ph => ph.id === k), r.id + ' : ' + rt + ' ' + k));
                });
                // Une période sans sous-périodes n'a que des statuts simples ; chaque période a son type de calcul.
                if (!p.phases) assert.strictEqual(typeof r.st, 'string', r.id);
            }
        });
    });
    assert.strictEqual(new Set(ids).size, ids.length);
});

test('dates des Trois Semaines 5786 : 17 Tamouz au 9 Av (jeudi 23 juillet 2026), sous-périodes jointives', () => {
    const r = C.rangeOf('troissemaines', 5786, { rite: 'sefarade' });
    assert.strictEqual(r.start, fixed(2026, 7, 2));
    assert.strictEqual(r.end, fixed(2026, 7, 23));
    assert.deepStrictEqual(r.phases.map(p => [p.id, p.start, p.end]), [
        ['p1', fixed(2026, 7, 2), fixed(2026, 7, 14)],
        ['p2', fixed(2026, 7, 15), fixed(2026, 7, 18)],
        ['p3', fixed(2026, 7, 19), fixed(2026, 7, 23)]
    ]);
});

test('Omer 5786 : début le 16 Nissan ; fin au 33e jour (ashkénaze) ou au 34e (séfarade)', () => {
    const s = C.rangeOf('omer', 5786, { rite: 'sefarade' }), a = C.rangeOf('omer', 5786, { rite: 'ashkenaze' }), h = C.rangeOf('omer', 5786, { rite: 'habad' });
    assert.strictEqual(s.start, fixed(2026, 4, 3));
    assert.strictEqual(a.end, fixed(2026, 5, 5));   // Lag baOmer
    assert.strictEqual(h.end, a.end);
    assert.strictEqual(s.end, a.end + 1);
});

test('Yom Kippour 5787 : lundi 21 septembre 2026, annoncé la veille', () => {
    const r = C.rangeOf('kippour', 5787, {});
    assert.strictEqual(r.start, fixed(2026, 9, 21));
    assert.strictEqual(r.end, r.start);
    assert.strictEqual(C.stateOf('kippour', r.start - 1, {}).state, 'soon');
    assert.strictEqual(C.stateOf('kippour', r.start - 2, {}).state, 'upcoming');
    assert.strictEqual(C.stateOf('kippour', r.start, {}).state, 'active');
});

test('état d\'un jour : en cours, sous-période, prochaine occurrence l\'année suivante', () => {
    const ctx = { rite: 'ashkenaze' };
    const day = fixed(2026, 7, 20);
    assert.strictEqual(C.stateOf('troissemaines', day, ctx).phase, 'p3');
    assert.strictEqual(C.stateOf('troissemaines', fixed(2026, 7, 10), ctx).phase, 'p1');
    assert.deepStrictEqual(C.todayView(day, ctx).map(s => s.id), ['troissemaines']);
    const after = C.stateOf('troissemaines', fixed(2026, 7, 25), ctx);   // le 9 Av est passé : la suivante est en 2027
    assert.strictEqual(after.state, 'upcoming');
    assert.strictEqual(after.range.year, 5787);
    const order = C.listView(fixed(2026, 11, 21), ctx).map(s => s.id);   // 21 novembre 2026 : Chabbat est le jour même, puis tout ce qui vient, par date
    assert.strictEqual(order[0], 'chabbat');
    assert.strictEqual(order.length, D.PERIODS.length);
    assert.ok(order.indexOf('hanouka') < order.indexOf('pourim') && order.indexOf('pourim') < order.indexOf('pessah') && order.indexOf('pessah') < order.indexOf('omer'));
});

test('Omer : la liste du séfarade et de l\'ashkénaze ; les femmes séfarades peuvent se couper les cheveux', () => {
    const man = C.view('omer', { rite: 'sefarade', sex: 'm' }), woman = C.view('omer', { rite: 'sefarade', sex: 'f' });
    assert.strictEqual(find(man, 'omer-cheveux').st, 'no');
    assert.strictEqual(find(woman, 'omer-cheveux').st, 'ok');
    assert.match(find(woman, 'omer-cheveux').note, /femmes séfarades/);
    assert.strictEqual(find(C.view('omer', { rite: 'ashkenaze', sex: 'f' }), 'omer-cheveux').st, 'no');
    assert.strictEqual(find(man, 'omer-musique').st, 'no');
    assert.strictEqual(find(man, 'omer-chanter').st, 'ok');
    assert.strictEqual(man.total, 11);
});

test('Trois Semaines : le rite et la sous-période changent le statut', () => {
    const v = (rite, phase) => C.view('troissemaines', { rite, phase });
    assert.strictEqual(find(v('sefarade', 'p2'), 'ts-eau-chaude').st, 'ok');
    assert.strictEqual(find(v('ashkenaze', 'p2'), 'ts-eau-chaude').st, 'no');
    assert.strictEqual(find(v('habad', 'p2'), 'ts-eau-chaude').st, 'no');   // 'Habad suit l'usage ashkénaze
    assert.strictEqual(find(v('sefarade', 'p3'), 'ts-eau-chaude').st, 'no');
    assert.match(find(v('sefarade', 'p3'), 'ts-eau-chaude').note, /malade/);
    assert.strictEqual(find(v('ashkenaze', 'p1'), 'ts-cheveux').st, 'no');
    assert.strictEqual(find(v('sefarade', 'p1'), 'ts-cheveux').st, 'ok');
    assert.strictEqual(find(v('sefarade', 'p2'), 'ts-viande-vin').st, 'no');
    assert.strictEqual(find(v('sefarade', 'p2'), 'ts-achats-habits').st, 'avoid');
    assert.strictEqual(find(v('sefarade', 'p1'), 'ts-musique').st, 'no');
    assert.strictEqual(v('sefarade', 'inconnue').phase, 'p1');
});

test('autres usages : seulement quand le statut diffère, rites identiques regroupés', () => {
    const v = C.view('troissemaines', { rite: 'sefarade', phase: 'p2' });
    const hot = find(v, 'ts-eau-chaude');
    assert.deepStrictEqual(hot.others.map(o => [o.rites, o.st]), [[['ashkenaze', 'habad'], 'no']]);
    assert.deepStrictEqual(find(v, 'ts-musique').others, []);
    const kittel = find(C.view('kippour', { rite: 'ashkenaze' }), 'ky-kittel');
    assert.strictEqual(kittel.st, 'custom');
    assert.deepStrictEqual(kittel.others.map(o => o.rites), [['sefarade']]);
});

test('filtres : interdits, permis, obligations', () => {
    const all = C.view('kippour', { rite: 'sefarade' });
    assert.ok(all.groups.length >= 3);
    const no = C.view('kippour', { rite: 'sefarade', filter: 'no' }), must = C.view('kippour', { rite: 'sefarade', filter: 'must' }), ok = C.view('kippour', { rite: 'sefarade', filter: 'ok' });
    const count = view => view.groups.reduce((n, g) => n + g.items.length, 0);
    assert.strictEqual(count(all), count(no) + count(must) + count(ok));
    assert.ok(no.groups.every(g => g.items.every(i => ['no', 'avoid'].includes(i.st))));
    assert.ok(find(must, 'ky-tossefet') && !find(must, 'ky-manger'));
    assert.strictEqual(count(C.view('kippour', { rite: 'sefarade', filter: 'nimporte' })), count(all));
});

test('le champ de relecture n\'est jamais rendu ; reviewList le donne', () => {
    D.PERIODS.forEach(p => {
        const text = JSON.stringify(C.view(p.id, { rite: 'ashkenaze', phase: 'p2' }));
        assert.ok(!/review/.test(text), p.id);
    });
    assert.ok(C.reviewList().length > 30);
    assert.strictEqual(C.view('inexistante', {}), null);
});

test('Chabbat : chaque samedi, annoncé le vendredi', () => {
    const friday = fixed(2026, 7, 17), saturday = fixed(2026, 7, 18), sunday = fixed(2026, 7, 19);
    assert.strictEqual(C.stateOf('chabbat', friday, {}).state, 'soon');
    assert.strictEqual(C.stateOf('chabbat', saturday, {}).state, 'active');
    const next = C.stateOf('chabbat', sunday, {});
    assert.strictEqual(next.state, 'upcoming');
    assert.strictEqual(next.daysTo, 6);
    assert.strictEqual(next.range.start, fixed(2026, 7, 25));
    const v = C.view('chabbat', { rite: 'ashkenaze' });
    assert.match(find(v, 'chb-bougies').note, /bénissent en se couvrant les yeux/);
    assert.doesNotMatch(find(C.view('chabbat', { rite: 'sefarade' }), 'chb-bougies').note, /couvrant/);
});

test('Roch \'Hodech : un ou deux jours, jamais Tichri', () => {
    const av = C.stateOf('roshhodesh', fixed(2026, 7, 10), {});   // Tamouz a 29 jours : un jour
    assert.strictEqual(av.range.month, 'Av');
    assert.strictEqual(av.range.start, fixed(2026, 7, 15));
    assert.strictEqual(av.range.end, av.range.start);
    const kislev = C.stateOf('roshhodesh', fixed(2026, 12, 1), {});   // le 30 Kislev et le 1er Tévet
    assert.strictEqual(kislev.range.month, 'Tevet');
    assert.strictEqual(kislev.range.end - kislev.range.start, 1);
    assert.strictEqual(kislev.range.start, fixed(2026, 12, 10));
    for (let year = 5786; year < 5790; year++) assert.ok(C.rangeOf('roshhodesh', year, {}).month !== 'Tishri');
    // les femmes : usage de ne pas travailler
    assert.strictEqual(find(C.view('roshhodesh', { rite: 'sefarade', sex: 'f' }), 'rh-travail').st, 'custom');
    assert.strictEqual(find(C.view('roshhodesh', { rite: 'sefarade', sex: 'm' }), 'rh-travail').st, 'ok');
});

test('Pessah 5786 : la veille, puis les jours de fête selon Israël ou la diaspora', () => {
    const d = C.rangeOf('pessah', 5786, { israel: false }), i = C.rangeOf('pessah', 5786, { israel: true });
    assert.strictEqual(d.start, fixed(2026, 4, 1));   // 14 Nissan
    assert.strictEqual(d.end, fixed(2026, 4, 9));     // 22 Nissan
    assert.strictEqual(i.end, fixed(2026, 4, 8));     // 21 Nissan
    const len = r => r.phases.map(p => p.end - p.start + 1);
    assert.deepStrictEqual(len(d), [1, 2, 4, 2]);
    assert.deepStrictEqual(len(i), [1, 1, 5, 1]);
    d.phases.reduce((prev, p) => { if (prev) assert.strictEqual(p.start, prev.end + 1); return p; }, null);
    assert.strictEqual(C.stateOf('pessah', fixed(2026, 4, 5), { israel: false }).phase, 'p2');
    assert.strictEqual(C.stateOf('pessah', fixed(2026, 4, 9), { israel: false }).phase, 'p3');
    assert.strictEqual(C.stateOf('pessah', fixed(2026, 4, 8), { israel: true }).phase, 'p3');   // en Israël, Pessah finit le 21 Nissan
});

test('Pessah : hamets, kitniyot, téfilines selon le rite et la sous-période', () => {
    const v = (rite, phase) => C.view('pessah', { rite, phase });
    assert.strictEqual(find(v('sefarade', 'p0'), 'pe-hamets-manger').st, 'ok');
    assert.strictEqual(find(v('sefarade', 'p1'), 'pe-hamets-manger').st, 'no');
    assert.strictEqual(find(v('sefarade', 'p1'), 'pe-kitniyot').st, 'ok');
    assert.strictEqual(find(v('ashkenaze', 'p1'), 'pe-kitniyot').st, 'no');
    assert.strictEqual(find(v('habad', 'p2'), 'pe-kitniyot').st, 'no');
    assert.strictEqual(find(v('sefarade', 'p2'), 'pe-tefillin').st, 'must');
    assert.strictEqual(find(v('habad', 'p2'), 'pe-tefillin').st, 'no');
    assert.strictEqual(find(v('sefarade', 'p1'), 'pe-tefillin'), undefined);   // règle sans statut hors de ses sous-périodes : masquée
    assert.ok(find(v('sefarade', 'p0'), 'pe-biour') && !find(v('sefarade', 'p1'), 'pe-biour'));
});

test('Souccot 5787 : du 15 au 21 Tichri, un ou deux jours de fête', () => {
    const d = C.rangeOf('souccot', 5787, { israel: false }), i = C.rangeOf('souccot', 5787, { israel: true });
    assert.strictEqual(d.start, fixed(2026, 9, 26));
    assert.strictEqual(d.end, fixed(2026, 10, 2));
    assert.deepStrictEqual(d.phases.map(p => p.end - p.start + 1), [2, 5]);
    assert.deepStrictEqual(i.phases.map(p => p.end - p.start + 1), [1, 6]);
});

test('Roch Hachana, Chavouot, Hanouka, Pourim : dates de 5786 et 5787', () => {
    const rosh = C.rangeOf('roshhachana', 5787, {});
    assert.strictEqual(rosh.start, fixed(2026, 9, 12));
    assert.strictEqual(rosh.end - rosh.start, 1);
    assert.strictEqual(C.rangeOf('chavouot', 5786, { israel: false }).start, fixed(2026, 5, 22));
    assert.strictEqual(C.rangeOf('chavouot', 5786, { israel: false }).end, fixed(2026, 5, 23));
    assert.strictEqual(C.rangeOf('chavouot', 5786, { israel: true }).end, fixed(2026, 5, 22));
    const han = C.rangeOf('hanouka', 5786, {});
    assert.strictEqual(han.start, fixed(2025, 12, 15));
    assert.strictEqual(han.end - han.start, 7);
    assert.strictEqual(C.rangeOf('pourim', 5786, {}).start, fixed(2026, 3, 3));
});

test('jeûnes mineurs et Tich\'a BeAv : la prochaine occurrence, le jeûne reporté', () => {
    const next = C.stateOf('jeunes', fixed(2026, 7, 10), {});
    assert.strictEqual(next.range.feast, 'guedalia');
    assert.strictEqual(next.range.start, fixed(2026, 9, 14));
    const after = C.stateOf('jeunes', fixed(2026, 9, 15), {});
    assert.strictEqual(after.range.feast, 'tevet10');
    assert.strictEqual(C.rangeOf('tichabav', 5786, {}).start, fixed(2026, 7, 23));
    // 9 Av 5785 tombait un chabbat (2 août 2025) : le jeûne est le dimanche 3 août
    assert.strictEqual(C.rangeOf('tichabav', 5785, {}).start, fixed(2025, 8, 3));
    assert.strictEqual(find(C.view('jeunes', { rite: 'sefarade' }), 'jn-privations').st, 'ok');
    assert.strictEqual(find(C.view('tichabav', { rite: 'sefarade' }), 'tb-cuir').st, 'no');
});

test('toute période a au moins une occurrence calculable pour 40 ans', () => {
    D.PERIODS.forEach(p => {
        if (p.kind === 'weekly') return;
        for (let year = 5786; year < 5826; year++) {
            [false, true].forEach(israel => ['sefarade', 'ashkenaze'].forEach(rite => {
                const occ = C.rangeOf(p.id, year, { israel, rite });
                assert.ok(occ && occ.end >= occ.start, p.id + ' ' + year);
                occ.phases.forEach(ph => assert.ok(ph.end >= ph.start, p.id + ' ' + year + ' ' + ph.id));
            }));
        }
    });
});
