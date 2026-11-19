const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const C = require('../js/commandmentsCore.js');
const ui = JSON.parse(fs.readFileSync(__dirname + '/../ui/fr.json', 'utf8'));
const tools = ui.tools;

test('Mitsvot des femmes : 13 éléments en quatre thèmes, tous leurs textes existent', () => {
    const set = C.getSet('femmes');
    assert.ok(set);
    assert.deepStrictEqual(set.groups.map(g => g.id), ['mishna', 'temps', 'quotidien', 'coutumes']);
    const items = C.itemsOf('femmes');
    assert.strictEqual(items.length, 13);
    assert.strictEqual(set.count, items.length);
    items.forEach(it => C.fieldsOf('femmes').forEach(f => {
        const key = C.itemKey('femmes', it.id, f).replace('tools.', '');
        assert.ok(tools[key] && tools[key].length >= 3, key);
    }));
    set.groups.forEach(g => assert.ok(tools['cmd_femmes_group_' + g.id], g.id));
    ['title', 'subtitle', 'he', 'lead', 'know_1'].forEach(k => assert.ok(tools['cmd_femmes_' + k], k));
    assert.ok(tools.commandments_tab_femmes);
});

test('Mitsvot pratiques : les femmes en sont sorties, les effectifs suivent', () => {
    const p = C.getSet('pratiques');
    assert.ok(!p.groups.some(g => g.id === 'women'));
    assert.strictEqual(C.itemsOf('pratiques').length, p.count);
    assert.ok(tools.cmd_pratiques_know_1);
});

test('« À savoir » : numérotation continue (l\'écran s\'arrête à la première clé manquante)', () => {
    ['femmes', 'pratiques'].forEach(id => {
        let n = 0;
        while (tools['cmd_' + id + '_know_' + (n + 1)]) n++;
        const total = Object.keys(tools).filter(k => k.indexOf('cmd_' + id + '_know_') === 0).length;
        assert.strictEqual(n, total, id);
    });
});
