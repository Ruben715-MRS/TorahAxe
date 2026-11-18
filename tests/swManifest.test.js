const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildManifest } = require('../scripts/swManifest.js');

function tree(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'swm-'));
    Object.entries(files).forEach(([f, c]) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), c); });
    return root;
}
const BASE = { 'index.html': '<html>', 'manifest.webmanifest': '{}', 'js/a.js': 'a', 'css/x.css': 'x', 'css/tailwind-input.css': '@tailwind', 'ui/fr.json': '{}', 'assets/fonts/f.woff2': 'f', 'assets/fonts/material-symbols-outlined.woff2': 'm', 'assets/fonts/LICENSE.txt': 'l', 'data/talmud/a.json': '{}' };

test('manifeste : coquille sans données, sans sources de build ni licences', () => {
    const m = buildManifest(tree(BASE));
    assert.deepStrictEqual(m.files, ['assets/fonts/f.woff2', 'css/x.css', 'index.html', 'js/a.js', 'manifest.webmanifest', 'ui/fr.json']);
});

test('version : stable à contenu égal, nouvelle si un fichier de la coquille change', () => {
    const a = buildManifest(tree(BASE)).version, b = buildManifest(tree(BASE)).version;
    assert.strictEqual(a, b);
    assert.match(a, /^[0-9a-f]{12}$/);
    assert.notStrictEqual(buildManifest(tree({ ...BASE, 'js/a.js': 'a2' })).version, a);
});

test('version : un changement dans data/ ne renouvelle pas la coquille', () => {
    const a = buildManifest(tree(BASE)).version;
    assert.strictEqual(buildManifest(tree({ ...BASE, 'data/talmud/a.json': '{"nouveau":1}' })).version, a);
});

test('manifeste du dépôt : tout fichier local que l\'index charge est dans la coquille', () => {
    const root = path.join(__dirname, '..');
    const m = buildManifest(root), set = new Set(m.files);
    // Les images de lancement iOS (apple-touch-startup-image, 4 Mo) sont lues par iOS à l'ajout à l'écran d'accueil, pas par la page : elles ne sont pas rangées.
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<link[^>]*apple-touch-startup-image[^>]*>/g, '');
    const refs = [...html.matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|webmanifest|jpg))"/g)].map(x => x[1]);
    assert.ok(refs.length > 100);
    refs.forEach(r => assert.ok(set.has(r), r + ' manque dans la coquille hors-ligne'));
    assert.ok(set.has('js/app/offline.js') && set.has('js/offlineCore.js'));
});
