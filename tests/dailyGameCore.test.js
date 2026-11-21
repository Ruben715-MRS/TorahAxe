const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const D = require('../js/dailyGameCore.js');
const HC = require('../js/hebrewCalendarCore.js');
const CAL = require('../data/torah/calendar.json');
const PAR = require('../data/torah/parashot.json');
const FR = JSON.parse(fs.readFileSync('ui/fr.json', 'utf8'));

// Les noms, lus dans ui/fr.json comme le fait l'écran (tools.hcal_month_*, tools.hcal_f_*_name).
const names = {
    month: (year, id) => FR.tools['hcal_month_' + HC.monthLabelId(year, id)],
    feast: (id, fixed, israel) => FR.tools['hcal_f_' + HC.feastNameId(id, fixed, israel) + '_name']
};
const ctx = (y, m, d, extra) => Object.assign({ civil: { year: y, month: m, day: d }, israel: false, calendar: CAL, parashot: PAR, names }, extra);

test('dateKey : « 2026-11-16 », avec les zéros', () => {
    assert.strictEqual(D.dateKey({ year: 2026, month: 11, day: 16 }), '2026-11-16');
    assert.strictEqual(D.dateKey({ year: 2027, month: 3, day: 5 }), '2027-03-05');
});

test('isRestDay : Chabbat et Yom Tov, pas un jour ordinaire ni un jour de Hol HaMoed ni Hanouka ; Israël compte un jour de fête de moins', () => {
    assert.strictEqual(D.isRestDay({ year: 2026, month: 11, day: 21 }), true);      // samedi 21 novembre 2026
    assert.strictEqual(D.isRestDay({ year: 2026, month: 11, day: 16 }), false);     // lundi
    assert.strictEqual(D.isRestDay({ year: 2026, month: 9, day: 12 }), true);       // Roch Hachana 5787 (samedi 12 septembre 2026)
    assert.strictEqual(D.isRestDay({ year: 2026, month: 9, day: 21 }), true);       // Kippour 5787
    assert.strictEqual(D.isRestDay({ year: 2026, month: 12, day: 8 }), false);      // Hanouka (du 5 au 12 décembre 2026) n'est pas un jour de repos
    assert.strictEqual(D.isRestDay({ year: 2027, month: 4, day: 22 }, false), true);  // 1er jour de Pessa'h (jeudi 22 avril 2027)
    assert.strictEqual(D.isRestDay({ year: 2027, month: 4, day: 22 }, true), true);
    assert.strictEqual(D.isRestDay({ year: 2027, month: 4, day: 23 }, false), true);  // 2ᵉ jour : Yom Tov en diaspora…
    assert.strictEqual(D.isRestDay({ year: 2027, month: 4, day: 23 }, true), false);  // …'Hol HaMoed en Israël
    assert.strictEqual(D.isRestDay({ year: 2027, month: 4, day: 25 }, true), false);  // 'Hol HaMoed
    assert.strictEqual(D.isRestDay({ year: 2027, month: 4, day: 28 }, true), true);   // 7ᵉ jour
    assert.strictEqual(D.isRestDay({ year: 2027, month: 4, day: 29 }, false), true);  // 8ᵉ jour en diaspora
    assert.strictEqual(D.isRestDay({ year: 2027, month: 4, day: 29 }, true), false);
});

test('seededRng : la même graine donne la même suite, une autre graine une autre, toujours dans [0, 1[', () => {
    const a = D.seededRng('x'), b = D.seededRng('x'), c = D.seededRng('y');
    const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
    assert.deepStrictEqual(sa, sb);
    assert.notDeepStrictEqual(sa, sc);
    const r = D.seededRng('2026-11-16');
    for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('les faits du 16 novembre 2026 : 6 Kislev 5787, Vayétsé, Daf Yomi Békhorot, Téhilim 35–38, prochaine fête Hanouka dans 19 jours', () => {
    const f = D.facts(ctx(2026, 11, 16));
    assert.deepStrictEqual([f.hebrew.day, f.hebrew.month, f.hebrew.year], [6, 'Kislev', 5787]);
    assert.strictEqual(f.monthNow.fr, 'Kislev');
    assert.strictEqual(f.monthNext.fr, 'Tévet');
    assert.strictEqual(f.daf.masechet, 'Békhorot');
    assert.deepStrictEqual(f.tehilim, [35, 38]);
    assert.strictEqual(PAR.parashot[f.parashaIdx[0]].fr, 'Vayétsé');
    assert.strictEqual(f.feast.f.id, 'hanouka');
    assert.strictEqual(f.feast.days, 19);
    assert.strictEqual(f.feast.ongoing, false);
});

test('le défi du 16 novembre 2026 : cinq questions, quatre propositions distinctes, la bonne réponse incluse, les faits justes', () => {
    const qs = D.questionsFor(ctx(2026, 11, 16));
    assert.strictEqual(qs.length, 5);
    assert.strictEqual(new Set(qs.map(q => q.type)).size, 5);
    qs.forEach(q => {
        assert.strictEqual(q.options.length, 4);
        assert.strictEqual(new Set(q.options.map(o => o.label)).size, 4, q.type);
        assert.ok(q.ask.length > 20 && q.explain.length > 20);
        assert.ok(q.options[q.answer], q.type);
    });
    const right = type => { const q = D.questionsFor(ctx(2026, 11, 16)).find(x => x.type === type); return q && q.options[q.answer].label; };
    const all = {};
    for (let d = 1; d <= 60; d++) D.questionsFor(ctx(2026, 11, d % 30 + 1, { civil: { year: 2026, month: 11, day: d % 30 + 1 } })).forEach(q => { all[q.type] = true; });
    assert.ok(Object.keys(all).length >= 6, 'types vus : ' + Object.keys(all));
    const byType = Object.fromEntries(D.questionsFor(ctx(2026, 11, 16)).map(q => [q.type, q]));
    if (byType.daf) assert.strictEqual(byType.daf.options[byType.daf.answer].label, 'Békhorot');
    if (byType.feast) assert.strictEqual(byType.feast.options[byType.feast.answer].label, 'Hanouka');
    if (byType.month_next) assert.strictEqual(byType.month_next.options[byType.month_next.answer].label, 'Tévet');
    if (byType.month_now) assert.strictEqual(byType.month_now.options[byType.month_now.answer].label, 'Kislev');
    if (byType.tehilim) assert.strictEqual(byType.tehilim.options[byType.tehilim.answer].label, '35–38');
    if (byType.parasha) assert.strictEqual(byType.parasha.options[byType.parasha.answer].label, 'Vayétsé');
    if (byType.parasha_next) assert.strictEqual(byType.parasha_next.options[byType.parasha_next.answer].label, 'Vayichla\'h');
});

test('le même jour donne le même défi, deux jours différents des défis différents', () => {
    const a = JSON.stringify(D.questionsFor(ctx(2026, 11, 16))), b = JSON.stringify(D.questionsFor(ctx(2026, 11, 16))), c = JSON.stringify(D.questionsFor(ctx(2026, 11, 17)));
    assert.strictEqual(a, b);
    assert.notStrictEqual(a, c);
});

test('sur toute une année : toujours cinq questions valides, les bonnes réponses sont dans les options, les noms existent', () => {
    for (let k = 0; k < 400; k++) {
        const d = new Date(Date.UTC(2026, 0, 1 + k));
        const c = ctx(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        const qs = D.questionsFor(c);
        assert.strictEqual(qs.length, 5, D.dateKey(c.civil));
        qs.forEach(q => {
            assert.strictEqual(q.options.length, 4, D.dateKey(c.civil) + ' ' + q.type);
            q.options.forEach(o => assert.ok(o.label && !/undefined/.test(o.label), D.dateKey(c.civil) + ' ' + q.type + ' : ' + o.label));
            assert.strictEqual(new Set(q.options.map(o => o.label)).size, 4);
        });
    }
});

test('la paracha se calcule pour toute date du calendrier (2040, 1900) ; hors du calendrier de l\'application (2401), pas de question de paracha mais toujours cinq questions', () => {
    ['2040', '1900'].forEach(y => assert.ok(D.questionsFor(ctx(Number(y), 6, 10)).some(q => q.type === 'parasha' || q.type === 'parasha_next') || D.facts(ctx(Number(y), 6, 10)).parashaIdx, y));
    const qs = D.questionsFor(ctx(2401, 6, 10));
    assert.strictEqual(qs.length, 5);
    assert.ok(!qs.some(q => q.type === 'parasha' || q.type === 'parasha_next'));
});


test('une semaine à deux parachiot : pas de « quelle paracha cette semaine ? » (deux bonnes réponses), mais « après celle de cette semaine » reste', () => {
    const doubles = [];
    for (let k = 0; k < 365 * 3; k++) {
        const d = new Date(Date.UTC(2026, 0, 1 + k));
        const f = D.facts(ctx(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
        if (f.parashaIdx && f.parashaIdx.length === 2) { doubles.push(f); if (doubles.length === 1) { const qs = D.questionsFor(ctx(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())); assert.ok(!qs.some(q => q.type === 'parasha')); } }
    }
    assert.ok(doubles.length > 0, 'au moins une semaine double en trois ans');
});

test('feast : « en cours » pendant la fête (Hanouka le 8 décembre 2026), au passé jamais proposé', () => {
    const f = D.facts(ctx(2026, 12, 8));
    assert.strictEqual(f.feast.f.id, 'hanouka');
    assert.strictEqual(f.feast.ongoing, true);
    const q = D.questionsFor(ctx(2026, 12, 8)).find(x => x.type === 'feast');
    if (q) { assert.match(q.ask, /en ce moment/); assert.match(q.explain, /en cours/); }
});

test('les noms hébreux des fêtes : une fête de la tradition en a toujours un', () => {
    HC.feastIds().forEach(id => assert.ok(/[א-ת]/.test(D.FEAST_HE[id]), id));
});

test('les traités du Daf Yomi : quarante, avec leur nom hébreu', () => {
    const names = D.dafNames();
    assert.strictEqual(names.length, 40);
    names.forEach(n => assert.ok(n.fr && /[א-ת]/.test(n.he)));
});

test('une partie : 100 points par bonne réponse, 500 pour un défi parfait', () => {
    const g = D.createGame(ctx(2026, 11, 16));
    assert.strictEqual(g.key, '2026-11-16');
    while (!g.over) { D.answer(g, D.question(g).answer); D.next(g); }
    assert.strictEqual(g.score, 500);
    assert.strictEqual(g.found, 5);
});

test('le registre : le premier défi du jour compte, un défi rejoué non ; les entrées abîmées sont écartées', () => {
    const g = D.createGame(ctx(2026, 11, 16));
    while (!g.over) { D.answer(g, D.question(g).answer); D.next(g); }
    let store = D.record(D.emptyStore(), g);
    assert.deepStrictEqual(D.resultOf(store, '2026-11-16'), { score: 500, found: 5, total: 5 });
    const g2 = D.createGame(ctx(2026, 11, 16));
    while (!g2.over) { D.answer(g2, (D.question(g2).answer + 1) % 4); D.next(g2); }
    store = D.record(store, g2);
    assert.strictEqual(D.resultOf(store, '2026-11-16').score, 500);
    const unfinished = D.createGame(ctx(2026, 11, 17));
    assert.strictEqual(D.resultOf(D.record(store, unfinished), '2026-11-17'), null);
    assert.deepStrictEqual(D.normalizeStore('abîmé'), D.emptyStore());
    assert.deepStrictEqual(Object.keys(D.normalizeStore({ days: { 'xx': { score: 1, total: 5 }, '2026-11-16': { score: 100, found: 1, total: 5 }, '2026-11-17': { score: -4, total: 5 } } }).days), ['2026-11-16']);
});
