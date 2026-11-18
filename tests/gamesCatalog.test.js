const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/gamesCatalog.js');
const P = require('../js/progressCore.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appSource = fs.readdirSync(path.join(root, 'js', 'app')).map(f => fs.readFileSync(path.join(root, 'js', 'app', f), 'utf8')).join('\n');
const ui = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));

test('catalogue : identifiants uniques, entrées d\'accueil complètes', () => {
    const ids = C.GAMES.map(g => g.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    C.GAMES.filter(g => g.home !== false).forEach(g => {
        ['open', 'section', 'he', 'fr', 'desc', 'kw'].forEach(k => assert.ok(g[k] && typeof g[k] === 'string', g.id + ' : ' + k + ' manque'));
        assert.ok(g.desc.length > 20, g.id + ' : description trop courte');
    });
});

test('catalogue : chaque domaine est un domaine de la progression, chaque rayon existe', () => {
    const domains = P.DOMAINS.map(d => d.id);
    const sections = C.SECTIONS.map(s => s.id);
    assert.strictEqual(new Set(sections).size, sections.length);
    C.GAMES.forEach(g => {
        assert.ok(domains.includes(g.domain), g.id + ' : domaine « ' + g.domain + ' » inconnu');
        if (g.home !== false) assert.ok(sections.includes(g.section), g.id + ' : rayon « ' + g.section + ' » inconnu');
    });
});

test('catalogue : la progression connaît exactement les jeux du catalogue', () => {
    C.GAMES.forEach(g => {
        const next = P.record(P.normalize(null), { game: g.id, score: 300, max: 500, date: '2026-11-18' });
        assert.ok(next.games[g.id], g.id + ' : une partie n\'est pas enregistrée');
    });
    assert.strictEqual(P.normalize({ v: 1, days: {}, games: { inconnu: { n: 3, perfect: 0, best: 50, xp: 10 } } }).games.inconnu, undefined);
});

test('catalogue : chaque jeu de l\'accueil a une fonction d\'ouverture et un écran', () => {
    C.GAMES.filter(g => g.home !== false).forEach(g => {
        assert.match(appSource, new RegExp('function ' + g.open + '\\('), g.id + ' : la fonction ' + g.open + ' n\'existe pas');
        const screenId = (g.screen && g.screen.id) || 'screen-' + g.id;
        const hasStatic = html.includes('id="' + screenId + '"');
        assert.ok(hasStatic || g.screen, g.id + ' : ni écran dans index.html ni plan d\'écran dans le catalogue');
    });
});

test('catalogue : rayons de l\'accueil, dans l\'ordre, sans jeu en double', () => {
    const seen = [];
    C.SECTIONS.forEach(s => C.inSection(s.id).forEach(g => seen.push(g.id)));
    assert.strictEqual(new Set(seen).size, seen.length);
    assert.deepStrictEqual(C.inSection('tanakh').map(g => g.id), ['parashagame', 'scrgame', 'mitsvagame']);
    assert.ok(!seen.includes('frise'));
});

test('catalogue : chaque jeu a ses chaînes de traduction (clé = identifiant), avec au moins un titre', () => {
    C.GAMES.filter(g => g.home !== false && g.id !== 'wheel').forEach(g => {
        assert.ok(ui[g.id] && typeof ui[g.id] === 'object', g.id + ' : bloc « ' + g.id + ' » absent de ui/fr.json');
    });
});
