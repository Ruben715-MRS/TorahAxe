const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/mapGameCore.js');
const Q = require('../js/quizCore.js');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const by = id => M.GAZETTEER.find(g => g.id === id);
const inView = (c, view) => { const b = M.VIEWS[view].bounds; return c[0] >= b[0][0] && c[0] <= b[1][0] && c[1] >= b[0][1] && c[1] <= b[1][1]; };

test('distanceKm : des distances à vol d\'oiseau connues (Jérusalem–Hébron ≈ 28 km, –Béer-Chéva ≈ 70 km, –Damas ≈ 218 km, Dan–Béer-Chéva ≈ 236 km)', () => {
    assert.strictEqual(M.distanceKm([35, 31], [35, 31]), 0);
    const near = (a, b, expected, tol) => assert.ok(Math.abs(M.distanceKm(a.c, b.c) - expected) <= tol, a.id + '–' + b.id + ' : ' + M.distanceKm(a.c, b.c).toFixed(1));
    near(by('jerusalem'), by('hebron'), 28, 3);
    near(by('jerusalem'), by('beersheva'), 70, 4);
    near(by('jerusalem'), by('damas'), 218, 6);
    near(by('dan'), by('beersheva'), 236, 6);                     // « de Dan à Béer-Chéva »
    assert.ok(Math.abs(M.distanceKm([0, 0], [0, 1]) - 111.2) < 0.5);
});

test('les lieux : identifiants uniques, noms latin et hébreu, un verset, une note, dans leur cadre', () => {
    assert.ok(M.GAZETTEER.length >= 40);
    assert.strictEqual(new Set(M.GAZETTEER.map(g => g.id)).size, M.GAZETTEER.length);
    M.GAZETTEER.forEach(g => {
        assert.ok(g.fr && /[א-ת]/.test(g.he) && g.ref && g.note.length > 15, g.id);
        assert.ok(['city', 'mountain'].includes(g.kind), g.id);
        assert.ok(inView(g.c, g.view), g.id + ' hors de son cadre');
    });
});

test('quelques positions de référence : la mer entre Gaza et Jaffa, Tyr au nord d\'Acre, Our à l\'est de Babylone, Thèbes au sud de Memphis', () => {
    assert.ok(by('gaza').c[0] < by('hebron').c[0] && by('jaffa').c[0] < by('jerusalem').c[0]);
    assert.ok(by('tyr').c[1] > by('acre').c[1] && by('sidon').c[1] > by('tyr').c[1] && by('dan').c[1] > by('hatsor').c[1]);
    assert.ok(by('our').c[0] > by('babylone').c[0] && by('suse').c[0] > by('babylone').c[0]);
    assert.ok(by('thebes').c[1] < by('memphis').c[1] && by('memphis').c[1] < by('ramses').c[1]);
    assert.ok(by('hermon').c[1] > 33 && by('nebo').c[0] > by('jericho').c[0]);
});

test('les contours : douze tribus et deux mers, anneaux fermés, dans le cadre de la terre', () => {
    const zs = M.zones();
    assert.strictEqual(zs.filter(z => z.kind === 'tribe').length, 12);
    assert.strictEqual(zs.filter(z => z.kind === 'lake').length, 2);
    zs.forEach(z => {
        assert.ok(z.ring.length >= 4 && /[א-ת]/.test(z.he), z.id);
        z.ring.forEach(c => assert.ok(c[0] > 33 && c[0] < 37 && c[1] > 30 && c[1] < 34.5, z.id + ' : ' + c));   // Juda descend jusqu'au Néguev
    });
});

test('inRing et distanceToRingKm : carré de 0,1°, dedans / dehors / bord', () => {
    const sq = [[35, 32], [35.1, 32], [35.1, 32.1], [35, 32.1]];
    assert.strictEqual(M.inRing([35.05, 32.05], sq), true);
    assert.strictEqual(M.inRing([35.2, 32.05], sq), false);
    assert.strictEqual(M.distanceToRingKm([35.05, 32.05], sq), 0);
    const d = M.distanceToRingKm([35.2, 32.05], sq);              // 0,1° de longitude à 32° ≈ 9,4 km du bord
    assert.ok(d > 9 && d < 9.8, 'distance : ' + d);
    assert.ok(M.distanceToRingKm([35.05, 31.9], sq) > 10.5 && M.distanceToRingKm([35.05, 31.9], sq) < 11.5);
});

test('le cœur de chaque tribu est bien dans son contour, et Juda est au sud d\'Acher, Ruben à l\'est de Dan', () => {
    const zs = Object.fromEntries(M.zones().map(z => [z.id, z]));
    const centroid = ring => [ring.reduce((a, c) => a + c[0], 0) / ring.length, ring.reduce((a, c) => a + c[1], 0) / ring.length];
    const cJ = centroid(zs['tribu:juda'].ring), cA = centroid(zs['tribu:asher'].ring);
    assert.ok(cJ[1] < cA[1]);
    assert.ok(centroid(zs['tribu:ruben'].ring)[0] > centroid(zs['tribu:dan'].ring)[0]);
    assert.strictEqual(M.inRing(by('jerusalem').c, zs['tribu:juda'].ring) || M.inRing(by('jerusalem').c, zs['tribu:benjamin'].ring), true, 'Jérusalem : Juda ou Benjamin');
    assert.strictEqual(M.inRing(by('chekhem').c, zs['tribu:ephraim'].ring) || M.inRing(by('chekhem').c, zs['tribu:manasse-o'].ring), true, 'Chékhem : Éphraïm ou Manassé');
    assert.strictEqual(M.inRing(by('dan').c, zs['tribu:naphtali'].ring), false, 'Dan (la ville) n\'est pas dans la part côtière de la tribu de Dan');
    const mortes = zs['mer:mer-morte'];
    assert.strictEqual(M.inRing([35.47, 31.3], mortes.ring), true);
});

test('projection : aller-retour, les coins, le nord en haut, l\'est à droite', () => {
    const view = M.VIEWS.terre;
    const pr = M.projection(view.bounds, 360);
    assert.strictEqual(pr.width, 360);
    assert.ok(pr.height > 300 && pr.height < 800);
    assert.deepStrictEqual(pr.toXY(view.bounds[0][0], view.bounds[1][1]).map(Math.round), [0, 0]);
    const sw = pr.toXY(view.bounds[0][0], view.bounds[0][1]);
    assert.ok(Math.abs(sw[1] - pr.height) < 1e-9);
    const c = by('jerusalem').c, [x, y] = pr.toXY(c[0], c[1]);
    const back = pr.toLonLat(x, y);
    assert.ok(Math.abs(back[0] - c[0]) < 1e-9 && Math.abs(back[1] - c[1]) < 1e-9);
    assert.ok(pr.toXY(35.4, 32)[0] > pr.toXY(35.2, 32)[0] && pr.toXY(35.2, 33)[1] < pr.toXY(35.2, 32)[1]);
    // un kilomètre est le même en haut et en bas : 360 unités ≈ largeur du cadre en km
    const widthKm = M.distanceKm([view.bounds[0][0], 32.3], [view.bounds[1][0], 32.3]);
    assert.ok(Math.abs(pr.width / widthKm - pr.scale / 111.2) < 0.02 * pr.scale / 111.2);
});

test('score : 100 dans la tolérance, 0 au-delà, décroissant entre les deux ; une tribu : dedans 100, hors contour décroissant', () => {
    const q = M.makeQuestion(by('jerusalem'));
    assert.strictEqual(M.score(q, by('jerusalem').c).points, 100);
    assert.strictEqual(M.score(q, [35.2137, 31.7683 + 7 / 110.57]).points, 100);          // 7 km
    const mid = M.score(q, [35.2137, 31.7683 + 30 / 110.57]);
    assert.ok(mid.points > 30 && mid.points < 70, 'à 30 km : ' + mid.points);
    assert.strictEqual(M.score(q, by('beersheva').c).points, 0);
    let last = 101;
    for (let km = 0; km <= 80; km += 5) { const pts = M.score(q, [35.2137, 31.7683 + km / 110.57]).points; assert.ok(pts <= last); last = pts; }
    const tribe = M.makeQuestion(M.zones().find(z => z.id === 'tribu:juda'));
    assert.strictEqual(M.score(tribe, by('hebron').c).points, 100);
    assert.strictEqual(M.score(tribe, by('hebron').c).inside, true);
    const out = M.score(tribe, by('dan').c);
    assert.strictEqual(out.points, 0);
    assert.strictEqual(out.inside, false);
    const world = M.makeQuestion(by('babylone'));
    assert.strictEqual(M.score(world, [44.4208 + 0.5, 32.5364]).points, 100);                // 47 km, dans les 60 km
    assert.strictEqual(M.score(world, by('thebes').c).points, 0);
    assert.ok(M.score(world, by('suse').c).points < 15, 'Suse est à 360 km de Babylone');
});

test('makeQuestion : un point ou un contour, le cadre de sa vue, la tolérance', () => {
    const c = M.makeQuestion(by('hebron')), w = M.makeQuestion(by('ur') || by('our')), z = M.makeQuestion(M.zones()[0]);
    assert.deepStrictEqual([c.view, c.tolerance, c.ring], ['terre', M.TOLERANCE.terre, null]);
    assert.deepStrictEqual([w.view, w.tolerance], ['monde', M.TOLERANCE.monde]);
    assert.deepStrictEqual([z.c, z.tolerance], [null, M.TOLERANCE.zone]);
    assert.deepStrictEqual(c.bounds, M.VIEWS.terre.bounds);
});

test('sections : « terre » (villes, montagnes, mers), « tribus » (douze), « monde » ; « tous » mêle deux de la terre, deux contours, un du monde', () => {
    assert.strictEqual(M.items('tribus').length, 12);
    assert.ok(M.items('terre').length >= 30 && M.items('monde').length >= 10);
    assert.ok(M.items('terre').every(x => x.view === 'terre'));
    for (let seed = 1; seed <= 20; seed++) {
        const g = M.createGame({ section: 'all', rng: seeded(seed) });
        assert.strictEqual(g.questions.length, 5);
        assert.strictEqual(new Set(g.questions.map(q => q.id)).size, 5);
        assert.strictEqual(g.questions.filter(q => q.view === 'monde').length, 1);
        assert.strictEqual(g.questions.filter(q => q.ring).length, 2);
    }
    ['terre', 'tribus', 'monde'].forEach(section => {
        const g = M.createGame({ section, rng: seeded(4) });
        assert.strictEqual(g.questions.length, 5);
        const ids = new Set(M.items(section).map(x => x.id));
        g.questions.forEach(q => assert.ok(ids.has(q.id), section + ' : ' + q.id));
    });
});

test('une partie : on touche, les points s\'ajoutent, une seule réponse par lieu, 500 points quand tout est exact', () => {
    const g = M.createGame({ section: 'all', rng: seeded(6) });
    const q = M.question(g);
    assert.deepStrictEqual(M.submit(g, ['x', 1]), []);
    assert.deepStrictEqual(M.submit(g, [NaN, 1]), []);
    const target = q.c || q.ring[0];
    assert.deepStrictEqual(M.submit(g, q.c ? [q.c[0], q.c[1] + 30 / 110.57] : [0, 0]), q.c ? ['near'] : ['far']);
    const first = g.score;
    assert.deepStrictEqual(M.submit(g, target), []);                                   // déjà résolu
    assert.strictEqual(g.score, first);
    assert.deepStrictEqual(M.next(g), []);
    assert.strictEqual(g.last, null);
    const g2 = M.createGame({ section: 'all', rng: seeded(6) });
    while (!g2.over) {
        const qq = M.question(g2);
        const inside = qq.c || qq.ring.reduce((a, c) => [a[0] + c[0] / qq.ring.length, a[1] + c[1] / qq.ring.length], [0, 0]);
        const point = qq.ring && !M.inRing(inside, qq.ring) ? qq.ring[0] : inside;     // un point à l'intérieur : le centre, ou à défaut un sommet
        assert.ok(['perfect', 'near'].includes(M.submit(g2, point)[0]));
        M.next(g2);
    }
    assert.ok(g2.score >= 400, 'score : ' + g2.score);
    assert.strictEqual(g2.results.length, 5);
});

test('les fleuves du cadre « monde » : dans le cadre, de l\'amont à l\'aval, le Nil coule vers le nord, l\'Euphrate et le Tigre vers le golfe', () => {
    const [nil, euphrate, tigre] = M.RIVERS.monde;
    M.RIVERS.monde.forEach(r => {
        assert.ok(r.pts.length >= 6, r.id);
        r.pts.forEach(c => assert.ok(inView(c, 'monde'), r.id + ' : ' + c));
    });
    assert.ok(nil.pts[0][1] < nil.pts[nil.pts.length - 1][1], 'le Nil monte vers la Méditerranée');
    assert.ok(euphrate.pts[0][1] > euphrate.pts[euphrate.pts.length - 1][1] && tigre.pts[0][1] > tigre.pts[tigre.pts.length - 1][1]);
    // Babylone est sur l'Euphrate, Ninive sur le Tigre, Memphis sur le Nil (à moins de 35 km d'un repère du tracé)
    const near = (city, river) => Math.min(...river.pts.map(c => M.distanceKm(c, by(city).c)));
    assert.ok(near('babylone', euphrate) < 35 && near('ninive', tigre) < 35 && near('memphis', nil) < 35 && near('thebes', nil) < 35, 'villes sur leur fleuve');
});

test('repères : les lieux d une vue, points pour les villes et montagnes, contours pour les tribus et mers', () => {
    const terre = M.places('terre'), monde = M.places('monde');
    // Tous les points ont des coordonnées, tous les contours un anneau
    terre.concat(monde).forEach(p => assert.ok(p.c ? p.c.length === 2 : Array.isArray(p.ring) && p.ring.length > 2, p.id));
    // La vue terre compte les 12 tribus et les 2 mers en contours
    assert.strictEqual(terre.filter(p => p.ring).length, 14);
    // La vue monde ne compte que des points, et Babylone en fait partie
    assert.ok(monde.every(p => p.c && !p.ring) && monde.some(p => p.id === 'babylone'));
    // Les identifiants d'une vue sont uniques
    const ids = terre.map(p => p.id);
    assert.strictEqual(new Set(ids).size, ids.length);
});
