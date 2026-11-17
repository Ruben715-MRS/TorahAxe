const test = require('node:test');
const assert = require('node:assert');
const IC = require('../js/interruptionsCore.js');
const data = require('../data/siddur/interruptions.json');

test('le tableau : 13 moments × 24 cas, cases bien formées', () => {
    assert.strictEqual(data.rows.length, 13);
    assert.strictEqual(data.cols.length, 24);
    const groups = new Set(data.groups.map(g => g.id));
    data.cols.forEach(c => assert.ok(groups.has(c.group), c.id));
    data.rows.forEach(r => {
        assert.strictEqual(r.cells.length, 24, r.id);
        r.cells.forEach(c => { if (c) { assert.ok(['o', 'c', 'n'].includes(c.c), r.id); assert.ok(c.t.length > 0); } });
    });
});

test('quelques cases repères du livre', () => {
    const row = id => data.rows.find(r => r.id === id);
    const col = id => data.cols.findIndex(c => c.id === id);
    assert.strictEqual(row('amida').cells[col('yehe')].t, 'Le penser');
    assert.strictEqual(row('chema').cells[col('barekhou')].c, 'o');
    assert.strictEqual(row('amida').cells[col('talit')].c, 'n');
    // « Idem » reprend la case du dessus
    const idem = row('chema').cells[col('qedoucha')];
    assert.ok(idem.idem);
    assert.strictEqual(idem.t, row('chemaEntre').cells[col('qedoucha')].t);
});

test('la ligne selon la partie lue', () => {
    assert.strictEqual(IC.rowForPlace('chacharit-amida'), 'amida');
    assert.strictEqual(IC.rowForPlace('minha-amida', 'netsor'), 'netsor');
    assert.strictEqual(IC.rowForPlace('arvit-chema'), 'chemaParagraphe');
    assert.strictEqual(IC.rowForPlace('chacharit-pessoukei'), 'pdz');
    assert.strictEqual(IC.rowForPlace('chema-coucher'), null);
    assert.strictEqual(IC.rowForPlace('zem-tsour-michelo'), null);
});

test('décompte et groupes', () => {
    const amida = data.rows.find(r => r.id === 'amida');
    const n = IC.tally(amida);
    assert.strictEqual(n.o + n.c + n.n + n.empty, 24);
    const groups = IC.byGroup(data, amida);
    assert.strictEqual(groups.reduce((s, g) => s + g.items.length, 0), 24);
});
