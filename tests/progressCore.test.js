const test = require('node:test');
const assert = require('node:assert');
const P = require('../js/progressCore.js');

const day = (y, m, d) => ({ year: y, month: m, day: d });
// Un registre où ces jours (civils) ont une partie.
function played(dates, game) {
    let s = P.emptyStore();
    dates.forEach(([y, m, d]) => { s = P.record(s, { date: day(y, m, d), game: game || 'lexgame', score: 500, max: 1000 }); });
    return s;
}
// Novembre 2026 : le 16 est un lundi, le 21 un samedi (Chabbat).

test('xpOf : 20 pour avoir terminé, 100 pour un score parfait, proportionnel entre les deux, borné', () => {
    assert.strictEqual(P.xpOf(0, 1000), 20);
    assert.strictEqual(P.xpOf(1000, 1000), 100);
    assert.strictEqual(P.xpOf(500, 1000), 60);
    assert.strictEqual(P.xpOf(5000, 1000), 100);
    assert.strictEqual(P.xpOf(-5, 1000), 20);
    assert.strictEqual(P.xpOf(10, 0), 20);
});

test('record : jours, jeux, parfaits, meilleur score ; un jeu inconnu ou un registre abîmé ne casse rien', () => {
    let s = P.emptyStore();
    s = P.record(s, { date: day(2026, 11, 16), game: 'lexgame', score: 1000, max: 1000 });
    s = P.record(s, { date: day(2026, 11, 16), game: 'lexgame', score: 300, max: 1000 });
    s = P.record(s, { date: day(2026, 11, 17), game: 'mapgame', score: 400, max: 500 });
    s = P.record(s, { date: day(2026, 11, 17), game: 'inconnu', score: 400, max: 500 });
    assert.deepStrictEqual(s.days['2026-11-16'], { n: 2, xp: 100 + 44 });
    assert.deepStrictEqual(s.days['2026-11-17'], { n: 1, xp: 84 });
    assert.deepStrictEqual(s.games.lexgame, { n: 2, perfect: 1, best: 100, xp: 144 });
    assert.deepStrictEqual(s.games.mapgame, { n: 1, perfect: 0, best: 80, xp: 84 });
    assert.ok(!s.games.inconnu);
    assert.deepStrictEqual(P.normalize('abîmé'), P.emptyStore());
    assert.deepStrictEqual(P.normalize({ days: { 'x': { n: 1 }, '2026-11-16': { n: 2, xp: 50 }, '2026-11-17': { n: 0 } }, games: { lexgame: { n: 3, perfect: 1, best: 250, xp: 10 }, truc: { n: 1 } } }),
        { v: 1, days: { '2026-11-16': { n: 2, xp: 50 } }, games: { lexgame: { n: 3, perfect: 1, best: 100, xp: 10 } } });
    assert.strictEqual(P.record(s, { date: day(2026, 11, 18), game: 'frise', xp: 80 }).days['2026-11-18'].xp, 80);        // xp imposé
});

test('chaque jeu a un domaine', () => {
    const ids = new Set(P.DOMAINS.map(d => d.id));
    Object.keys(P.GAMES).forEach(g => assert.ok(ids.has(P.GAMES[g]), g));
    assert.strictEqual(P.DOMAINS.length, 6);
    ['lexgame', 'gemgame', 'review', 'parashagame', 'mitsvagame', 'ordergame', 'whogame', 'trgame', 'purgame', 'wheel', 'dailygame', 'mapgame', 'frise'].forEach(g => assert.ok(P.GAMES[g], g));
});

test('niveaux : seuils, avancement vers le suivant, dernier niveau', () => {
    assert.deepStrictEqual(P.levelOf(0), { level: 1, xp: 0, from: 0, to: 150, pct: 0 });
    assert.strictEqual(P.levelOf(149).level, 1);
    assert.strictEqual(P.levelOf(150).level, 2);
    assert.strictEqual(P.levelOf(75).pct, 50);
    assert.strictEqual(P.levelOf(9499).level, 9);
    assert.deepStrictEqual(P.levelOf(99999), { level: 10, xp: 99999, from: 9500, to: null, pct: 100 });
    assert.strictEqual(P.levelOf(-5).level, 1);
    assert.strictEqual(P.LEVELS.length, 10);
});

test('domaines : l\'expérience d\'un jeu va à son domaine', () => {
    let s = P.emptyStore();
    s = P.record(s, { date: day(2026, 11, 16), game: 'lexgame', score: 1000, max: 1000 });
    s = P.record(s, { date: day(2026, 11, 16), game: 'gemgame', score: 1000, max: 1000 });
    s = P.record(s, { date: day(2026, 11, 16), game: 'mapgame', score: 0, max: 500 });
    const xp = P.domainXp(s);
    assert.deepStrictEqual([xp.hebreu, xp.geographie, xp.tanakh], [200, 20, 0]);
    assert.strictEqual(P.domainLevels(s).hebreu.level, 2);
    assert.strictEqual(P.domainLevels(s).tanakh.level, 1);
});

test('série : jours consécutifs, aujourd\'hui joué = « active »', () => {
    const s = played([[2026, 11, 16], [2026, 11, 17], [2026, 11, 18]]);
    const r = P.streak(s, day(2026, 11, 18));
    assert.deepStrictEqual([r.current, r.longest, r.status], [3, 3, 'active']);
});

test('série : aujourd\'hui pas encore joué = « en attente », la série d\'hier tient ; un jour ordinaire sans partie la casse', () => {
    const s = played([[2026, 11, 16], [2026, 11, 17]]);
    const r = P.streak(s, day(2026, 11, 18));
    assert.deepStrictEqual([r.current, r.status], [2, 'pending']);
    const broken = P.streak(s, day(2026, 11, 19));
    assert.deepStrictEqual([broken.current, broken.status, broken.longest], [0, 'none', 2]);
});

test('série : le Chabbat est sauté — vendredi et dimanche jouées, pas samedi : la série continue ; jouer le samedi ne l\'allonge pas', () => {
    const s = played([[2026, 11, 19], [2026, 11, 20], [2026, 11, 22]]);          // jeudi, vendredi, dimanche
    assert.deepStrictEqual([P.streak(s, day(2026, 11, 22)).current, P.streak(s, day(2026, 11, 22)).status], [3, 'active']);
    const withShabbat = played([[2026, 11, 19], [2026, 11, 20], [2026, 11, 21], [2026, 11, 22]]);   // jeudi à dimanche, samedi joué
    assert.strictEqual(P.streak(withShabbat, day(2026, 11, 22)).current, 3);        // le samedi ne compte pas
    assert.strictEqual(P.streak(withShabbat, day(2026, 11, 22)).longest, 3);
});

test('série : le jour de Chabbat lui-même, la série est « gelée » (ni cassée ni allongée), même si l\'on joue', () => {
    const s = played([[2026, 11, 19], [2026, 11, 20]]);
    const sat = P.streak(s, day(2026, 11, 21));
    assert.deepStrictEqual([sat.current, sat.status], [2, 'frozen']);
    const playedOnShabbat = played([[2026, 11, 19], [2026, 11, 20], [2026, 11, 21]]);
    assert.deepStrictEqual([P.streak(playedOnShabbat, day(2026, 11, 21)).current, P.streak(playedOnShabbat, day(2026, 11, 21)).status], [2, 'frozen']);
    // dimanche, pas encore joué : « en attente », toujours 2
    const sun = P.streak(s, day(2026, 11, 22));
    assert.deepStrictEqual([sun.current, sun.status], [2, 'pending']);
    // lundi sans avoir joué le dimanche : cassée
    assert.strictEqual(P.streak(s, day(2026, 11, 23)).current, 0);
});

test('série : un jour de fête est sauté comme un Chabbat (Kippour, lundi 21 septembre 2026 ; Roch Hachana, samedi 12)', () => {
    const s = played([[2026, 9, 18], [2026, 9, 20], [2026, 9, 22]]);                // vendredi 18, dimanche 20, mardi 22 : le lundi 21 (Kippour) et le samedi 19 sont sautés
    assert.deepStrictEqual([P.streak(s, day(2026, 9, 22)).current, P.streak(s, day(2026, 9, 22)).status], [3, 'active']);
    assert.strictEqual(P.streak(s, day(2026, 9, 21)).status, 'frozen');
    // le dimanche 20 manqué casse bien
    const gap = played([[2026, 9, 18], [2026, 9, 22]]);
    assert.strictEqual(P.streak(gap, day(2026, 9, 22)).current, 1);
});

test('série : en Israël, le deuxième jour de fête n\'est pas un jour de repos (vendredi 23 avril 2027, 2ᵉ jour de Pessa\'h)', () => {
    const s = played([[2027, 4, 21], [2027, 4, 23]]);
    assert.strictEqual(P.streak(s, day(2027, 4, 23), true).current, 2);              // Israël : le 23 est 'Hol HaMoed, il compte ; le 22 (1er jour) est sauté
    const diaspora = P.streak(played([[2027, 4, 21], [2027, 4, 23]]), day(2027, 4, 23), false);
    assert.strictEqual(diaspora.status, 'frozen');                                    // diaspora : Yom Tov, gelée
    assert.strictEqual(diaspora.current, 1);
});

test('la plus longue série est gardée même après une interruption', () => {
    const s = played([[2026, 11, 2], [2026, 11, 3], [2026, 11, 4], [2026, 11, 5], [2026, 11, 6], [2026, 11, 10], [2026, 11, 11]]);   // lundi 2 à vendredi 6, puis mardi 10 et mercredi 11 (le lundi 9 manque)
    const r = P.streak(s, day(2026, 11, 11));
    assert.deepStrictEqual([r.current, r.longest], [2, 5]);
    assert.strictEqual(P.streak(played([[2026, 11, 2], [2026, 11, 3], [2026, 11, 4], [2026, 11, 5], [2026, 11, 6], [2026, 11, 8], [2026, 11, 9]]), day(2026, 11, 9)).longest, 7);   // le samedi 7 est sauté : sept jours de suite
});

test('série : rien joué = pas de série ; un registre abîmé aussi', () => {
    assert.deepStrictEqual(P.streak(P.emptyStore(), day(2026, 11, 18)), { current: 0, longest: 0, status: 'none', lastActive: null });
    assert.strictEqual(P.streak('abîmé', day(2026, 11, 18)).current, 0);
});

test('série sur un long historique : deux ans de jours joués, calcul rapide', () => {
    const dates = [];
    for (let k = 0; k < 730; k++) { const d = new Date(Date.UTC(2024, 10, 17 + k)); dates.push([d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]); }
    const s = played(dates);
    const t0 = Date.now();
    const r = P.streak(s, day(2026, 11, 16));
    assert.ok(Date.now() - t0 < 1500, 'durée : ' + (Date.now() - t0) + ' ms');
    assert.ok(r.current >= 600 && r.longest === r.current, 'série : ' + r.current);
});

test('badges : première partie, parties, parfait, série, défi, variété, niveaux', () => {
    const none = P.badges(P.emptyStore(), P.streak(P.emptyStore(), day(2026, 11, 16)));
    assert.ok(none.every(b => !b.earned));
    let s = P.emptyStore();
    s = P.record(s, { date: day(2026, 11, 16), game: 'dailygame', score: 500, max: 500 });
    const ids = bs => bs.filter(b => b.earned).map(b => b.id).sort();
    assert.deepStrictEqual(ids(P.badges(s, P.streak(s, day(2026, 11, 16)))), ['daily1', 'first', 'perfect1']);
    ['lexgame', 'gemgame', 'review', 'parashagame', 'mitsvagame'].forEach(g => { s = P.record(s, { date: day(2026, 11, 16), game: g, score: 0, max: 100 }); });
    const b = P.badges(s, P.streak(s, day(2026, 11, 16)));
    assert.ok(ids(b).includes('variety5') && !ids(b).includes('variety10'));
    const prog = b.find(x => x.id === 'games10');
    assert.deepStrictEqual([prog.value, prog.target, prog.earned], [6, 10, false]);
    const long = played(Array.from({ length: 8 }, (_, i) => [2026, 11, 2 + i].map((v, j) => (j === 2 && v === 7 ? 8 : v))));
    assert.ok(ids(P.badges(long, P.streak(long, day(2026, 11, 9)))).includes('streak7'));
    let lv = P.emptyStore();
    for (let i = 0; i < 4; i++) lv = P.record(lv, { date: day(2026, 11, 16), game: 'lexgame', score: 1000, max: 1000 });      // 400 xp : niveau 3
    assert.ok(ids(P.badges(lv, P.streak(lv, day(2026, 11, 16)))).includes('level3'));
});

test('changes : les badges et niveaux gagnés par une partie, et la série', () => {
    let before = P.emptyStore();
    const after = P.record(before, { date: day(2026, 11, 16), game: 'lexgame', score: 1000, max: 1000 });
    const c = P.changes(before, after, day(2026, 11, 16), day(2026, 11, 16));
    assert.deepStrictEqual(c.newBadges.sort(), ['first', 'perfect1']);
    assert.deepStrictEqual(c.levelUps, []);
    assert.deepStrictEqual([c.streak.current, c.streak.status, c.streakBefore.status], [1, 'active', 'none']);
    let mid = P.emptyStore();
    for (let i = 0; i < 1; i++) mid = P.record(mid, { date: day(2026, 11, 16), game: 'lexgame', score: 1000, max: 1000 });
    const up = P.record(mid, { date: day(2026, 11, 16), game: 'lexgame', score: 1000, max: 1000 });
    assert.deepStrictEqual(P.changes(mid, up, day(2026, 11, 16), day(2026, 11, 16)).levelUps, [{ domain: 'hebreu', level: 2 }]);
});
