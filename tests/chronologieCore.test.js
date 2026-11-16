const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../js/chronologieCore.js');
const G = require('../js/genealogyCore.js');

const DATA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data', 'chronologie.json'), 'utf8'));
const M = C.build(DATA);
const get = (id) => { assert.ok(M.byId[id], 'élément absent : ' + id); return M.byId[id]; };

test('deux calendriers : l\'année N de la création est 3761 − N av. J.-C., et 3761 est l\'an 1', () => {
    assert.strictEqual(C.civilYear(2448), -1313);
    assert.strictEqual(C.civilYear(3338), -423);
    assert.strictEqual(C.civilYear(3760), -1);
    assert.strictEqual(C.civilYear(3761), 1);
    assert.strictEqual(C.civilLabel(2448), '1313 av. J.-C.');
    assert.strictEqual(C.civilLabel(3800), '40 ap. J.-C.');
    assert.strictEqual(C.amLabel(2448), 'AM 2448');
});

test('dates d\'un élément : intervalle, point, approximation, durée', () => {
    assert.strictEqual(C.dating({ from: 2448, to: 2488 }, 'am'), 'AM 2448–2488');
    assert.strictEqual(C.dating({ from: 2448, to: 2488 }, 'civil'), '1313 av. J.-C. – 1273 av. J.-C.');
    assert.strictEqual(C.dating({ from: 2448 }, 'am'), 'AM 2448');
    assert.strictEqual(C.dating({ from: 2447, approx: true }, 'civil'), '≈ 1314 av. J.-C.');
    assert.strictEqual(C.durationLabel({ from: 2448, to: 2488 }), '40 ans');
    assert.strictEqual(C.durationLabel({ from: 2448 }), '');
});

test('les données : identifiants uniques, voies connues, dates cohérentes, texte présent', () => {
    const voies = new Set(DATA.voies.map(v => v.id));
    const seen = new Set();
    M.items.forEach(x => {
        assert.ok(!seen.has(x.id), 'identifiant en double : ' + x.id);
        seen.add(x.id);
        assert.ok(voies.has(x.voie), x.id + ' : voie inconnue ' + x.voie);
        assert.ok(x.fr && x.fr.length > 2, x.id + ' : nom vide');
        assert.ok(Number.isInteger(x.from), x.id + ' : début');
        if (x.to !== undefined) assert.ok(Number.isInteger(x.to) && x.to > x.from, x.id + ' : fin avant le début');
        if (x.he) assert.ok(/^[א-ת׳״"' ]+$/.test(x.he), x.id + ' : hébreu attendu, sans voyelles');
        if (x.kind) assert.ok(['detail', 'oppression'].includes(x.kind), x.id + ' : kind');
        if (x.outil) assert.ok(['mishkan'].includes(x.outil), x.id + ' : outil');
        // Tout élément touche la plage affichée.
        const c = C.clip(x, M.plage);
        assert.ok(c.to >= M.plage[0] && c.from <= M.plage[1], x.id + ' : hors de la plage');
    });
    DATA.voies.forEach(v => assert.ok(M.voies.find(w => w.id === v.id).items.length > 0, 'voie vide : ' + v.id));
});

test('chaque lien vers la généalogie désigne une personne de l\'arbre', () => {
    M.items.filter(x => x.gen).forEach(x => assert.ok(G.byId(x.gen), x.id + ' : personne inconnue ' + x.gen));
});

test('les rois viennent de la généalogie : 20 rois de Juda, ceux d\'Israël jusqu\'à Jéroboam II', () => {
    const juda = M.voies.find(v => v.id === 'juda').items;
    assert.strictEqual(juda.length, 20);
    assert.strictEqual(get('k_rehoboam').from, 2964);
    assert.strictEqual(get('k_zedekiah').to, 3337);
    assert.strictEqual(get('k_shallum_josias').to, undefined, 'trois mois : un repère, pas une barre');
    const israel = M.voies.find(v => v.id === 'israel').items.map(x => x.id);
    assert.ok(israel.includes('k_jeroboam') && israel.includes('k_jeroboam_ii') && israel.includes('i_hochea'));
    assert.strictEqual(get('k_jeroboam').from, 2964);
    // Chaque roi d'Israël finit au plus tard quand le suivant commence.
    const kings = M.voies.find(v => v.id === 'israel').items.filter(x => x.id.indexOf('k_') === 0 && x.to !== undefined);
    kings.forEach((x, i) => { if (kings[i + 1]) assert.ok(x.to <= kings[i + 1].from || kings[i + 1].from < x.from, x.id); });
});

test('les totaux du Séder Olam : 480 ans, 410 ans, 369 ans, 300 ans, 155 ans, 218 ans', () => {
    assert.strictEqual(get('e_sortie').from + 480, get('e_temple_debut').from);
    assert.strictEqual(get('temple1').from, get('e_temple_debut').from);
    assert.strictEqual(get('temple1').to - get('temple1').from, 410);
    assert.strictEqual(get('temple1').to, get('e_destruction').from);
    assert.strictEqual(get('silo').to - get('silo').from, 369);
    assert.strictEqual(get('desert').to - get('desert').from, 40);
    assert.strictEqual(get('egypte').to - get('egypte').from, 210);
    assert.strictEqual(get('e_300ans').from, get('e_jourdain').from + 300);
    assert.strictEqual(get('e_temple_debut').from + 155, get('e_joas_temple').from);
    assert.strictEqual(get('e_joas_temple').from + 218, get('e_josias_temple').from);
    assert.strictEqual(get('e_division').from, get('k_rehoboam').from);
    assert.strictEqual(get('e_josias_temple').from, get('k_josias').from + 17, 'la 18e année de Josias');
});

test('le Michkan se suit sans trou, du désert au Temple', () => {
    const chain = ['michkan_desert', 'guilgal', 'silo', 'nov', 'gabaon', 'temple1'].map(get);
    for (let i = 1; i < chain.length; i++) assert.strictEqual(chain[i].from, chain[i - 1].to, chain[i].id);
    assert.strictEqual(get('guilgal').to - get('guilgal').from, 14);
    assert.strictEqual(get('arche_kiryat').to - get('arche_kiryat').from, 20);
    assert.strictEqual(get('arche_kiryat').to, get('e_david_jerusalem').from);
});

test('les juges se suivent, avec les durées du texte', () => {
    const dur = { j_otniel: 40, j_ehoud: 80, j_debora: 40, j_midian: 7, j_guideon: 40, j_avimelekh: 3, j_oppression: 18, j_yiftah: 6, j_ivtsan: 7, j_elon: 10, j_avdon: 8 };
    Object.keys(dur).forEach(id => { if (M.byId[id]) assert.strictEqual(M.byId[id].to - M.byId[id].from, dur[id], id); });
    assert.strictEqual(get('j_chimchon').to - get('j_chimchon').from, 20);
    const suite = ['j_otniel', 'j_ehoud', 'j_debora', 'j_midian', 'j_guideon', 'j_avimelekh', 'j_tola', 'j_yair', 'j_oppression'].map(get);
    for (let i = 1; i < suite.length; i++) assert.strictEqual(suite[i].from, suite[i - 1].to, suite[i].id);
    assert.strictEqual(get('j_otniel').from, get('e_josue_mort').from);
    assert.strictEqual(get('j_eli').to, get('e_eli_mort').from);
    assert.strictEqual(get('r_david').to - get('r_david').from, 40);
    assert.strictEqual(get('r_salomon').to - get('r_salomon').from, 40);
});

test('mise en rangées : deux éléments d\'une même rangée ne se recouvrent jamais, étiquettes comprises', () => {
    const opts = { scale: 8, charW: 6.5, pad: 10, minW: 14, gap: 6, point: 12 };
    M.voies.forEach(v => {
        const L = C.layout(v.items, M.plage, opts);
        assert.ok(L.rows >= 1);
        for (let r = 0; r < L.rows; r++) {
            const row = L.placed.filter(p => p.row === r).sort((a, b) => a.x - b.x);
            for (let i = 1; i < row.length; i++) {
                const a = row[i - 1];
                const labelW = a.item.fr.length * 6.5 + 10;
                const end = a.point ? a.x + 12 + 4 + labelW : (a.inside ? a.x + a.w : a.x + a.w + 4 + labelW);
                assert.ok(row[i].x >= end + 6 - 0.001, v.id + ' rangée ' + r + ' : ' + a.item.id + ' recouvre ' + row[i].item.id);
            }
        }
    });
});

test('les éléments coupés par la plage sont signalés', () => {
    const c = C.clip(get('egypte'), M.plage);
    assert.strictEqual(c.cutLeft, true);
    assert.strictEqual(c.from, M.plage[0]);
    assert.strictEqual(C.clip(get('p_yirmeyahou'), M.plage).cutRight, true);
    assert.strictEqual(C.clip(get('silo'), M.plage).cutLeft, false);
});

test('recherche : sans accent, sans apostrophe, en français ou en hébreu', () => {
    assert.ok(C.search(M, 'moise').some(x => x.id === 'p_moise'));
    assert.ok(C.search(M, 'Élie').some(x => x.id === 'p_eliyahou'));
    assert.ok(C.search(M, 'שמשון').some(x => x.id === 'j_chimchon'));
    assert.ok(C.search(M, 'chichak').some(x => x.id === 'e_chichak'));
    assert.deepStrictEqual(C.search(M, ''), []);
    assert.deepStrictEqual(C.search(M, 'zzzzzz'), []);
});

test('graduations : de 10 en 10 dans la plage', () => {
    const t = C.ticks([2400, 2430]);
    assert.deepStrictEqual(t, [2400, 2410, 2420, 2430]);
    assert.deepStrictEqual(C.ticks([2405, 2431]), [2410, 2420, 2430]);
});

test('les sauts d\'époque existent et sont dans l\'ordre', () => {
    assert.ok(M.sauts.length >= 5);
    for (let i = 1; i < M.sauts.length; i++) assert.ok(M.sauts[i].from >= M.sauts[i - 1].from);
});

test('à la même époque : les autres voies seulement, ni les époques ni les détails', () => {
    const near = C.contemporains(M, get('e_siege'), 20);
    assert.ok(near.some(x => x.id === 'k_zedekiah'), 'le roi du siège');
    assert.ok(near.some(x => x.id === 'p_yirmeyahou'), 'Jérémie');
    assert.ok(near.every(x => x.voie !== 'evenements' && x.voie !== 'eres' && x.kind !== 'detail'));
    const david = C.contemporains(M, get('r_david'), 30).map(x => x.id);
    assert.ok(david.includes('p_natan') && david.includes('gabaon'));
    assert.ok(!david.includes('r_david'), 'jamais lui-même');
    assert.strictEqual(C.contemporains(M, get('e_siege'), 3).length, 3);
});

test('graduations civiles : des années rondes, sans année zéro', () => {
    const t = C.ticks([3330, 3340], 10, 'civil');
    assert.deepStrictEqual(t.map(C.civilYear), [-430]);
    assert.deepStrictEqual(t, [3331]);
    const across = C.ticks([3755, 3765], 5, 'civil');
    assert.deepStrictEqual(across.map(C.civilYear), [-5, 5], 'on saute 0');
});
