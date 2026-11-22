const test = require('node:test');
const assert = require('node:assert');
const A = require('../js/authorGameCore.js');
const L = require('../js/libraryCore.js');
const Quiz = require('../js/quizCore.js');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('auteurs : chaque auteur du jeu a au moins une œuvre dans la Bibliothèque, chaque œuvre posée a son auteur dans le jeu', () => {
    Object.keys(A.AUTHORS).forEach(id => assert.ok(L.WORKS.some(w => w.authorId === id), id + ' : aucune œuvre'));
    L.WORKS.filter(A.authorAsked).forEach(w => assert.ok(A.AUTHORS[w.authorId], w.id));
    const names = Object.values(A.AUTHORS).map(a => a.name);
    assert.strictEqual(new Set(names).size, names.length);
    Object.values(A.AUTHORS).forEach(a => assert.ok(a.alias.length >= 1 && a.alias.every(x => x === x.toLowerCase())));
});

test('œuvres posées : un auteur unique et connu, sans attribution traditionnelle à part, sans nom d\'auteur dans le titre', () => {
    const asked = L.WORKS.filter(A.authorAsked);
    assert.ok(asked.length >= 28);
    asked.forEach(w => {
        assert.ok(!w.trad, w.id);
        assert.ok(!A.EXCLUDED[w.id], w.id);
        assert.ok(!A.leaks(w), w.id + ' : le titre donne l\'auteur');
    });
    ['zohar', 'sefer_hinoukh', 'bahir', 'tosafot', 'taz_shakh', 'bavli', 'yerouchalmi', 'onkelos'].forEach(id => assert.ok(!asked.some(w => w.id === id), id));
});

test('titre qui donne l\'auteur : reconnu (avec ou sans « Ha » collé), jamais à tort', () => {
    const w = id => L.byId(id);
    ['rachi_torah', 'rif_halakhot', 'piskei_rosh', 'biur_hagra', 'ritva_hidushim', 'radak_neviim', 'responsa_rachba', 'likoute_moharan', 'sefat_emet', 'chazon_ich', 'hidushei_haim', 'tosafot_yomtov', 'shelah'].forEach(id => {
        assert.ok(A.leaks(w(id)), id);
    });
    ['mishne_torah', 'shulhan_aroukh', 'tanya', 'kuzari', 'mishna_berura', 'etz_haim', 'tur', 'mesillat_yesharim'].forEach(id => assert.ok(!A.leaks(w(id)), id + ' : à tort'));
});

test('faits : des attributions qui ne se discutent pas, vérifiées dans les données', () => {
    const by = id => L.byId(id).authorId;
    assert.strictEqual(by('mishne_torah'), 'rambam');
    assert.strictEqual(by('moreh'), 'rambam');
    assert.strictEqual(by('shulhan_aroukh'), 'karo');
    assert.strictEqual(by('beit_yossef'), 'karo');
    assert.strictEqual(by('tanya'), 'schneur');
    assert.strictEqual(by('kuzari'), 'yehouda_halevi');
    assert.strictEqual(by('mishna_berura'), 'chafetz_haim');
    assert.strictEqual(by('tur'), 'yaakov_acher');
    assert.strictEqual(by('mesillat_yesharim'), 'ramhal');
    assert.strictEqual(by('emounot'), 'saadia_gaon');
    assert.strictEqual(by('michna'), 'yehouda_nassi');
    assert.strictEqual(by('pardes_rimonim'), 'ramak');
});

test('époque : seules les œuvres sûres sont posées (datées sur moins de soixante ans, loin des frontières)', () => {
    assert.ok(A.eraAsked(L.byId('rachi_torah')));
    assert.ok(A.eraAsked(L.byId('shulhan_aroukh')));
    assert.ok(!A.eraAsked(L.byId('abarbanel')), 'à cheval sur 1500');
    assert.ok(!A.eraAsked(L.byId('bartenura')), 'vers 1490 : classé des deux côtés de 1500');
    assert.ok(!A.eraAsked(L.byId('michna')), 'tout près de 220');
    assert.ok(!A.eraAsked(L.byId('tosafot')), 'deux siècles');
    assert.ok(!A.eraAsked(L.byId('zohar')), 'attribution traditionnelle');
    L.WORKS.filter(A.eraAsked).forEach(w => assert.ok(w.bib || w.to - w.from <= A.MAX_SPAN, w.id));
    // Une œuvre datée par la vie de son auteur : posée seulement si cette vie tient dans une époque, sans « vers » ; jamais pour « le plus ancien ».
    assert.ok(A.eraAsked(L.byId('haamek_davar')));
    assert.ok(!A.eraAsked(L.byId('tsror_hamor')), 'vers : jamais posée');
    assert.ok(!A.eraAsked(L.byId('beer_yitshak')), 'mort en : pas de vie');
    assert.ok(!A.eraAsked(L.byId('ale_shour')), 'contemporain');
    L.WORKS.filter(w => w.bib).forEach(w => assert.ok(!A.dateAsked(w), w.id));
    assert.ok(A.authorAsked(L.byId('adderet_eliyahu')) && A.authorAsked(L.byId('magen_avraham')) && A.authorAsked(L.byId('mikhtav_meeliyahou')));
    assert.ok(!A.authorAsked(L.byId('beer_mayim_haim_czernowitz')), 'deux œuvres du même titre');
    assert.ok(!A.authorAsked(L.byId('malbim')), 'le titre donne l\'auteur');
});

test('questions : quatre propositions distinctes, une seule bonne, de la bonne façon, pour chaque série et chaque tirage', () => {
    A.SECTIONS.forEach(section => {
        for (let seed = 1; seed <= 150; seed++) {
            const g = A.createGame({ section, rng: seeded(seed) });
            assert.ok(g.questions.length >= 7, section + ' #' + seed + ' : ' + g.questions.length + ' questions');
            const works = g.questions.map(q => q.work.id);
            assert.strictEqual(new Set(works).size, works.length, section + ' #' + seed + ' : une œuvre revient');
            g.questions.forEach(q => {
                const where = section + ' #' + seed + ' ' + q.type + ' ' + q.id;
                assert.strictEqual(q.options.length, 4, where);
                assert.strictEqual(new Set(q.options.map(o => o.label)).size, 4, where + ' : propositions identiques');
                assert.ok(q.answer >= 0 && q.answer < 4, where);
                if (q.type === 'author') {
                    assert.ok(A.authorAsked(q.work), where);
                    assert.strictEqual(q.options[q.answer].id, q.work.authorId, where);
                    assert.strictEqual(new Set(q.options.map(o => o.id)).size, 4, where);
                } else if (q.type === 'work') {
                    assert.strictEqual(q.options[q.answer].id, q.work.id, where);
                    const authors = q.options.map(o => L.byId(o.id).authorId);
                    assert.strictEqual(authors.filter(a => a === q.authorId).length, 1, where + ' : deux livres du même auteur');
                    assert.strictEqual(new Set(authors).size, 4, where);
                    q.options.forEach(o => assert.ok(A.authorAsked(L.byId(o.id)), where + ' ' + o.id));
                } else if (q.type === 'era') {
                    assert.ok(A.eraAsked(q.work), where);
                    const era = L.eraOf(q.work);
                    assert.strictEqual(q.options[q.answer].id, era, where);
                    assert.strictEqual(L.eraOf({ from: q.work.to }), era, where + ' : à cheval');
                } else {
                    const ws = q.options.map(o => L.byId(o.id)).sort((a, b) => a.from - b.from);
                    ws.forEach(w => assert.ok(A.dateAsked(w), where + ' ' + w.id));
                    ws.forEach((w, i) => { if (i) assert.ok(w.from - ws[i - 1].to >= A.OLDEST_GAP, where + ' : œuvres trop proches'); });
                    assert.strictEqual(q.options[q.answer].id, q.last ? ws[3].id : ws[0].id, where);
                }
            });
        }
    });
});

test('parties : dix questions sauf dans une série trop courte, les quatre types présents dans la série « Toutes les époques »', () => {
    for (let seed = 1; seed <= 60; seed++) {
        const g = A.createGame({ section: 'all', rng: seeded(seed) });
        assert.strictEqual(g.questions.length, 10);
        const count = {};
        g.questions.forEach(q => { count[q.type] = (count[q.type] || 0) + 1; });
        assert.deepStrictEqual(count, { author: 4, work: 3, era: 2, oldest: 1 });
    }
});

test('partie : bonne réponse 100 points, fin, et jouable à plusieurs', () => {
    const g = A.createGame({ section: 'aharonim', rng: seeded(9) });
    for (let i = 0; i < 10; i++) {
        const q = A.question(g);
        assert.deepStrictEqual(A.answer(g, i < 7 ? q.answer : (q.answer + 1) % 4), [i < 7 ? 'right' : 'wrong']);
        A.next(g);
    }
    assert.strictEqual(g.over, true);
    assert.strictEqual(g.score, 700);
    Quiz.setPendingPlayers(['Anna', 'Ben']);
    const m = A.createGame({ section: 'all', rng: seeded(2) });
    assert.ok(m.multi);
    Quiz.setPendingPlayers(null);
});
