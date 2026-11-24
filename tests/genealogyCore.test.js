const test = require('node:test');
const assert = require('node:assert');
const G = require('../js/genealogyCore.js');

test('conjoints vus des deux côtés, sans doublon', () => {
    assert.deepStrictEqual(G.spousesOf('rebecca'), [['isaac', 'mariage']]);
    assert.deepStrictEqual(G.spousesOf('isaac'), [['rebecca', 'mariage']]);
    const jacob = G.spousesOf('jacob').map(u => u[0]);
    assert.ok(jacob.includes('lea') && jacob.includes('rachel'));
    assert.strictEqual(new Set(jacob).size, jacob.length);
});

test('une épouse sans père se range près de son conjoint', () => {
    assert.strictEqual(G.inTree('eve'), false);
    assert.strictEqual(G.anchorOf('eve'), 'adam');
    assert.deepStrictEqual(G.lineageOf('eve'), ['adam']);
    assert.strictEqual(G.generationOf('eve'), 1);
    assert.strictEqual(G.anchorOf('jacob'), 'jacob');
});

test('lignée et génération : d\'Adam à la personne', () => {
    assert.deepStrictEqual(G.lineageOf('adam'), []);
    assert.strictEqual(G.generationOf('adam'), 1);
    const l = G.lineageOf('jacob');
    assert.strictEqual(l[0], 'adam');
    assert.strictEqual(l[l.length - 1], 'isaac');
    assert.strictEqual(G.generationOf('jacob'), l.length + 1);
});

test('enfants : ceux de l\'arbre et ceux dont la personne est la mère', () => {
    assert.deepStrictEqual(G.childrenAll('eve'), ['cain', 'abel', 'seth']);
    assert.deepStrictEqual(G.childrenAll('rachel'), ['joseph', 'benjamin']);
    assert.deepStrictEqual(G.childrenAll('adam'), G.childrenOf('adam'));
    assert.ok(G.siblingsOf('jacob').includes('esau'));
    assert.deepStrictEqual(G.siblingsOf('adam'), []);
});

test('lignées : chaque personne de l\'arbre apparaît une fois, les suites père → fils unique sur une ligne', () => {
    const rows = G.outline({});
    const seen = [];
    rows.forEach(r => r.ids.forEach(id => seen.push(id)));
    const inTree = G.PEOPLE.filter(p => G.inTree(p.id)).map(p => p.id);
    assert.strictEqual(seen.length, inTree.length);
    assert.strictEqual(new Set(seen).size, inTree.length);
    assert.deepStrictEqual(rows[0], { ids: ['adam'], level: 0 });
    const seth = rows.find(r => r.ids[0] === 'seth');
    assert.ok(seth.ids.length > 1 && seth.ids.includes('enosh'));
    rows.forEach(r => assert.ok(r.ids.length <= 8));
});

test('lignées : une branche repliée cache ses enfants', () => {
    const rows = G.outline({ adam: true });
    assert.deepStrictEqual(rows, [{ ids: ['adam'], level: 0 }]);
});

test('arbre compact : toutes les personnes, une rangée par génération, sans chevauchement', () => {
    const W = 132, gap = 12;
    const L = G.compactLayout({}, { cardWidth: W, gap });
    const ids = Object.keys(L.nodes);
    assert.strictEqual(ids.length, G.PEOPLE.filter(p => G.inTree(p.id)).length);
    const byRow = {};
    ids.forEach(id => {
        const n = L.nodes[id];
        assert.ok(n.x - W / 2 >= -0.01 && n.x + W / 2 <= L.width + 0.01, 'hors cadre : ' + id);
        (byRow[n.row] = byRow[n.row] || []).push(n.x);
    });
    Object.values(byRow).forEach(xs => {
        xs.sort((a, b) => a - b);
        for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= W + gap - 0.01);
    });
    // Un enfant hors pile est sur la rangée qui suit son père.
    L.edges.filter(e => e.to).forEach(e => assert.strictEqual(L.nodes[e.to].row, L.nodes[e.from].row + 1));
    // Une pile descend d'une rangée par carte.
    L.edges.filter(e => e.pile).forEach(e => e.pile.forEach((k, i) => assert.strictEqual(L.nodes[k].row, L.nodes[e.from].row + 1 + i)));
    // Bien plus étroit que la mise en page classique.
    const classic = G.layout({}, () => W + 10, { colStep: 166, cardWidth: W, gap: 10 });
    assert.ok(L.width < classic.height / 3);
});

test('arbre compact : replier Adam ne laisse qu\'Adam', () => {
    const L = G.compactLayout({ adam: true }, { cardWidth: 100 });
    assert.deepStrictEqual(Object.keys(L.nodes), ['adam']);
    assert.strictEqual(L.width, 100);
    assert.strictEqual(L.rows, 1);
});

// --- Les notices (data/genealogie-bios.json) ---------------------------------------------------------------------------------------
const BIOS = JSON.parse(require('node:fs').readFileSync(require('node:path').resolve(__dirname, '..', 'data', 'genealogie-bios.json'), 'utf8'));

test('notices : chaque clé est une personne de l\'arbre, avec texte et référence', () => {
    Object.keys(BIOS.bios).forEach(id => {
        assert.ok(G.byId(id), 'personne inconnue : ' + id);
        assert.ok(BIOS.bios[id].t && BIOS.bios[id].ref, 'texte ou référence manquant : ' + id);
    });
});

test('notices : une à trois phrases, sans se limiter à la filiation', () => {
    Object.keys(BIOS.bios).forEach(id => {
        const t = BIOS.bios[id].t;
        const sentences = t.split(/[.!?](?:\s|$)/).filter(x => x.trim()).length;
        assert.ok(sentences >= 1 && sentences <= 3, id + ' : ' + sentences + ' phrases');
        assert.ok(t.length >= 40, id + ' : notice trop courte, une simple filiation ne justifie pas une notice');
    });
});

test('bioOf : renvoie la notice, ou null sans notice', () => {
    assert.strictEqual(G.bioOf(BIOS, 'noe').ref, 'Gn 6:9 – 9:29');
    assert.strictEqual(G.bioOf(BIOS, 'irad'), null);
    assert.strictEqual(G.bioOf(BIOS, 'constructor'), null);
    assert.strictEqual(G.bioOf(null, 'noe'), null);
});
