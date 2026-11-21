const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/periodsData.js');
const C = require('../js/periodsCore.js');
const H = require('../js/hebrewCalendarCore.js');

const fixed = (y, m, d) => H.fixedOfGregorian(y, m, d);
const find = (view, id) => view.groups.reduce((a, g) => a.concat(g.items), []).filter(i => i.id === id)[0];

test('les données : trois périodes, des règles bien formées, un champ review partout', () => {
    assert.deepStrictEqual(D.PERIODS.map(p => p.id), ['omer', 'troissemaines', 'kippour']);
    const ids = [];
    D.PERIODS.forEach(p => {
        p.rules.concat(p.days || []).forEach(r => {
            ids.push(r.id);
            assert.strictEqual(typeof r.review, 'boolean', r.id + ' : review');
            if (r.st === undefined && !p.rules.includes(r)) return;   // un jour particulier n'a pas de statut
            if (p.rules.includes(r)) {
                const check = v => assert.ok(D.STATUS[v], r.id + ' : statut ' + v);
                if (typeof r.st === 'string') check(r.st);
                else { assert.ok(p.phases, r.id + ' : sous-périodes'); p.phases.forEach(ph => check(r.st[ph.id])); }
                Object.keys(r.rite || {}).forEach(rt => assert.ok(D.RITES[rt], r.id + ' : rite ' + rt));
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
    assert.deepStrictEqual(C.listView(fixed(2026, 11, 21), ctx).map(s => s.id), ['omer', 'troissemaines', 'kippour']);
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
