const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const G = require('../js/glossaryCore.js');
const tools = JSON.parse(fs.readFileSync(__dirname + '/../ui/fr.json', 'utf8')).tools;

test('Glossaire : chaque entrée est complète, les identifiants sont uniques', () => {
    const ids = new Set();
    G.ENTRIES.forEach(e => {
        assert.ok(/^[a-z0-9-]+$/.test(e.id), 'identifiant : ' + e.id);
        assert.ok(!ids.has(e.id), 'doublon : ' + e.id);
        ids.add(e.id);
        assert.ok(e.he && /[א-ת]/.test(e.he), 'hébreu : ' + e.id);
        assert.ok(e.tr, 'nom : ' + e.id);
        assert.ok(e.fr && e.fr.length >= 25, 'définition : ' + e.id);
        assert.ok(G.CATEGORIES.indexOf(e.cat) >= 0, 'catégorie : ' + e.id);
    });
    assert.ok(G.ENTRIES.length >= 250, 'au moins 250 entrées, il y en a ' + G.ENTRIES.length);
});

test('Glossaire : toutes les catégories ont des entrées et un libellé', () => {
    G.CATEGORIES.forEach(c => {
        assert.ok(G.list(c).length >= 5, c);
        assert.ok(tools['glossary_cat_' + c], 'libellé de ' + c);
    });
});

test('Glossaire : les renvois pointent vers des entrées qui existent, sans renvoi à soi-même', () => {
    G.ENTRIES.forEach(e => e.see.forEach(id => {
        assert.ok(G.get(id), e.id + ' → ' + id + ' n\'existe pas');
        assert.notStrictEqual(id, e.id, e.id + ' se renvoie à lui-même');
    }));
});

test('Glossaire : les liens vers l\'app sont connus, et leur libellé existe', () => {
    const screens = fs.readFileSync(__dirname + '/../js/app/tools.js', 'utf8');
    G.ENTRIES.forEach(e => {
        if (!e.go) return;
        assert.ok(G.GO_TARGETS.indexOf(e.go) >= 0, e.id + ' : lien inconnu ' + e.go);
    });
    G.GO_TARGETS.forEach(go => {
        assert.ok(tools[G.goLabelKey(go)], 'libellé de ' + go);
        const tool = G.parseGo(go).tool;
        assert.ok(new RegExp('\\b' + tool + ':\\s*\'screen-').test(screens), 'outil ' + tool + ' absent de tools.js');
    });
    // Les onglets de « Commandements » visés existent.
    const C = require('../js/commandmentsCore.js');
    G.GO_TARGETS.filter(g => g.indexOf('commandments:') === 0).forEach(g => assert.ok(C.getSet(G.parseGo(g).tab), g));
});

test('Recherche : les différentes orthographes se rejoignent', () => {
    const first = q => (G.search(q)[0] || {}).id;
    ['chabbat', 'Shabbat', 'shabbos', 'SHABBAT', 'sabbat'].forEach(q => assert.strictEqual(first(q), 'chabbat', q));
    ['pessah', 'Pesach', "Pessa'h", 'pessa h'.replace(' ', "'")].forEach(q => assert.strictEqual(first(q), 'pessah', q));
    ['kippour', 'kippur', 'yom kippur'].forEach(q => assert.strictEqual(first(q), 'yom-kippour', q));
    ['hanouka', 'hanukkah', 'chanukah'].forEach(q => assert.strictEqual(first(q), 'hanouka', q));
    ['soukkot', 'sukkot', 'souccot'].forEach(q => assert.strictEqual(first(q), 'souccot', q));
    ['kaddish', 'kadich'].forEach(q => assert.strictEqual(first(q), 'kaddich', q));
});

test('Recherche : en hébreu, avec ou sans voyelles ; dans la définition ; sans résultat', () => {
    assert.strictEqual(G.search('שבת')[0].id, 'chabbat');
    assert.strictEqual(G.search('הַלֵּל')[0].id, 'hallel');
    assert.ok(G.search('chofar').some(e => e.id === 'chofar'));
    assert.ok(G.search('quorum').some(e => e.id === 'minyan'), 'trouvé par un autre nom');
    assert.ok(G.search('circoncision').some(e => e.id === 'brit-mila'));
    assert.ok(G.search('lait viande').some(e => e.id === 'halav-basar'), 'plusieurs mots');
    assert.deepStrictEqual(G.search('zzzzqq'), []);
    assert.strictEqual(G.search('').length, G.ENTRIES.length);
});

test('Recherche : le nom exact passe avant une simple mention dans une définition', () => {
    const ids = G.search('hallel').map(e => e.id);
    assert.strictEqual(ids[0], 'hallel');
    const rabbin = G.search('rabbin').map(e => e.id);
    assert.strictEqual(rabbin[0], 'rabbin');
});

test('Catégories et initiales', () => {
    const fetes = G.list('fetes');
    assert.ok(fetes.every(e => e.cat === 'fetes'));
    assert.ok(G.search('chabbat', 'fetes').every(e => e.cat === 'fetes'));
    const sorted = G.list().map(e => e.key);
    assert.deepStrictEqual(sorted, sorted.slice().sort());
    const ini = G.initials();
    assert.strictEqual(ini.reduce((a, b) => a + b.n, 0), G.ENTRIES.length);
    ini.forEach(i => assert.strictEqual(G.byInitial(i.letter).length, i.n));
});

test('Renvois et liens', () => {
    assert.ok(G.related('chabbat').some(e => e.id === 'havdala'));
    assert.ok(G.backlinks('chabbat').length >= 3);
    assert.deepStrictEqual(G.parseGo('commandments:peines'), { tool: 'commandments', tab: 'peines' });
    assert.deepStrictEqual(G.parseGo('siddur'), { tool: 'siddur', tab: '' });
    assert.strictEqual(G.parseGo(''), null);
    assert.strictEqual(G.goLabelKey('commandments:peines'), 'glossary_go_commandments_peines');
    // Les punitions du glossaire renvoient à l'onglet Punitions.
    ['karet', 'malkout', 'arba-mitot', 'hatraa', 'herem', 'nidoui'].forEach(id => assert.strictEqual(G.get(id).go, 'commandments:peines', id));
});
