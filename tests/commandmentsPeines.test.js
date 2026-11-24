const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const C = require('../js/commandmentsCore.js');
const tools = JSON.parse(fs.readFileSync(__dirname + '/../ui/fr.json', 'utf8')).tools;

test('Punitions : 39 éléments en dix thèmes, tous leurs textes existent', () => {
    const set = C.getSet('peines');
    assert.ok(set);
    assert.deepStrictEqual(set.groups.map(g => g.id),
        ['garde', 'mort', 'malkout', 'karet', 'karet36', 'ciel', 'exil', 'reparations', 'expiation', 'rabbinique']);
    const items = C.itemsOf('peines');
    assert.strictEqual(items.length, 39);
    assert.strictEqual(set.count, items.length);
    assert.strictEqual(new Set(items.map(i => i.id)).size, items.length, 'identifiants uniques');
    items.forEach(it => C.fieldsOf('peines').forEach(f => {
        const key = C.itemKey('peines', it.id, f).replace('tools.', '');
        assert.ok(tools[key] && tools[key].length >= 3, key);
    }));
    set.groups.forEach(g => assert.ok(tools['cmd_peines_group_' + g.id], g.id));
    ['title', 'subtitle', 'he', 'lead', 'know_1'].forEach(k => assert.ok(tools['cmd_peines_' + k], k));
    assert.ok(tools.commandments_tab_peines && tools.commandments_cond);
});

test('Punitions : quatre peines de mort, dans l\'ordre de la Michna (Sanhédrin 7:1)', () => {
    const mort = C.getSet('peines').groups.find(g => g.id === 'mort');
    assert.deepStrictEqual(mort.items, ['sekila', 'serefa', 'hereg', 'henek']);
});

test('Punitions : les cas de karet font trente-six (Kritout 1:1) et chacun a son élément', () => {
    const total = Object.values(C.KARET_CASES).reduce((a, b) => a + b, 0);
    assert.strictEqual(total, 36);
    const karet36 = C.getSet('peines').groups.find(g => g.id === 'karet36');
    assert.deepStrictEqual(karet36.items.slice().sort(), Object.keys(C.KARET_CASES).sort());
});

test('Punitions : « À savoir » en numérotation continue, et rien de cassé dans les autres listes', () => {
    let n = 0;
    while (tools['cmd_peines_know_' + (n + 1)]) n++;
    assert.ok(n >= 3);
    assert.strictEqual(Object.keys(tools).filter(k => k.indexOf('cmd_peines_know_') === 0).length, n);
    assert.strictEqual(C.list613('pos').length, 248);
    assert.strictEqual(C.list613('neg').length, 365);
    assert.strictEqual(C.neighbor('peines', -1).id, 'mitzvot');
});
