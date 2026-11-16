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
    const lot1 = [2400, 3340];
    const c = C.clip(get('egypte'), lot1);
    assert.strictEqual(c.cutLeft, true);
    assert.strictEqual(c.from, lot1[0]);
    assert.strictEqual(C.clip(get('egypte'), M.plage).cutLeft, false, 'la plage entière commence à la création');                    // la plage du premier lot : Jérémie en déborde
    assert.strictEqual(C.clip(get('p_yirmeyahou'), lot1).cutRight, true);
    assert.strictEqual(C.clip(get('p_yirmeyahou'), M.plage).cutRight, false);
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

test('lot 2 : conversions de l\'ère commune', () => {
    assert.strictEqual(C.civilYear(3828), 68, 'la destruction du Second Temple, selon la tradition');
    assert.strictEqual(C.civilYear(3949), 189);
    assert.strictEqual(C.civilYear(get('x_aug').from), -27);
    assert.strictEqual(C.civilYear(get('x_aug').to), 14);
    assert.strictEqual(C.civilYear(get('e_pompee').from), -63);
    assert.strictEqual(C.civilYear(get('e_hegire').from), 622);
    assert.strictEqual(C.civilYear(get('e_espagne').from), 711);
});

test('lot 2 : exil, Second Temple, destruction', () => {
    assert.strictEqual(get('exil_ere').to - get('exil_ere').from, 70);
    assert.strictEqual(get('exil_ere').from, get('temple1').to);
    assert.strictEqual(get('temple2').from, get('exil_ere').to);
    assert.strictEqual(get('temple2').to - get('temple2').from, 420);
    assert.strictEqual(get('temple2').to, get('e_destruction2').from);
    assert.strictEqual(get('e_destruction').from, get('e_gedalia').from - 1);
    assert.strictEqual(get('e_cyrus').from, get('exil_ere').from + 52, 'le décret de Cyrus');
});

test('lot 2 : les époques de la Michna à la fin des Guéonim se suivent sans trou', () => {
    const chain = ['zougot_ere', 'tannaim_ere', 'transition_ere', 'amoraim_ere', 'savoraim_ere', 'geonim_ere'].map(get);
    for (let i = 1; i < chain.length; i++) assert.strictEqual(chain[i].from, chain[i - 1].to, chain[i].id);
    assert.strictEqual(get('o_michna').from, get('tannaim_ere').to - 1, 'la Michna, à la fin des Tannaïm');
    assert.ok(get('e_calendrier').from >= get('n_hillel2').from && get('e_calendrier').from <= get('n_hillel2').to);
    assert.strictEqual(get('n_gam7').to, get('e_patriarcat').from);
});

test('lot 2 : les Nessiim et les empereurs se suivent', () => {
    const nessiim = ['n_hillel', 'n_shimon_h', 'n_gam1', 'n_shimon_g1', 'n_yochanan', 'n_gam2'].map(get);
    for (let i = 1; i < nessiim.length; i++) assert.strictEqual(nessiim[i].from, nessiim[i - 1].to, nessiim[i].id);
    const rois = ['n_gam3', 'n_yehuda1', 'n_yehuda2', 'n_gam5', 'n_yehuda3', 'n_hillel2', 'n_gam6', 'n_yehuda4', 'n_gam7'].map(get);
    for (let i = 1; i < rois.length; i++) assert.strictEqual(rois[i].from, rois[i - 1].to, rois[i].id);
    const emp = ['x_rep', 'x_trium', 'x_aug', 'x_tib', 'x_cal', 'x_clau', 'x_nero', 'x_gal', 'x_vesp', 'x_titus', 'x_dom', 'x_nerva', 'x_traj', 'x_hadr', 'x_antp', 'x_marc', 'x_comm'].map(get);
    for (let i = 1; i < emp.length; i++) assert.strictEqual(emp[i].from, emp[i - 1].to, emp[i].id);
    const has = ['h_judah', 'h_jonathan', 'h_simon', 'h_hyrcan1', 'h_arist1', 'h_yannai', 'h_salome', 'h_guerre', 'h_hyrcan2', 'h_antigone', 'h_herode'].map(get);
    for (let i = 1; i < has.length; i++) assert.strictEqual(has[i].from, has[i - 1].to, has[i].id);
});

test('lot 2 : chaque voie a de la matière, et la recherche trouve les nouveaux noms', () => {
    ['empires', 'judee', 'sages', 'bavel', 'babylonie', 'oeuvres'].forEach(id => assert.ok(M.voies.find(v => v.id === id).items.length >= 8, id));
    assert.ok(C.search(M, 'Rabbi Akiva').some(x => x.id === 't_akiva'));
    assert.ok(C.search(M, 'Saadia').some(x => x.id === 'v_saadia'));
    assert.ok(C.search(M, 'hanouka').some(x => x.id === 'e_hanouka'));
    assert.ok(C.search(M, 'Pompee').some(x => x.id === 'e_pompee'));
});

test('lot 3 : conversions et repères des Richonim aux Aharonim', () => {
    assert.strictEqual(C.civilYear(get('e3_expulsion_espagne').from), 1492);
    assert.strictEqual(C.civilYear(get('e3_etat').from), 1948);
    assert.strictEqual(get('e3_etat').from, 5708);
    assert.strictEqual(get('richonim_ere').to, get('acharonim_ere').from);
    assert.strictEqual(get('geonim_ere').to, get('richonim_ere').from);
    assert.strictEqual(get('e3_expulsion_espagne').from, get('richonim_ere').to, '1492 = AM 5252');
});

test('lot 3 : les durées d\'exil et les vies sont cohérentes', () => {
    assert.ok(Math.abs((get('e3_cromwell').from - get('e3_angleterre_expulsion').from) - 366) <= 1, 'expulsion d\'Angleterre : environ 367 ans');
    assert.strictEqual(get('m_rambam').to - get('m_rambam').from, 66);
    assert.strictEqual(get('m_rachi').to - get('m_rachi').from, 65);
    assert.strictEqual(get('hs_besht').to - get('hs_besht').from, 62);
    assert.ok(get('m_caro').from < get('o3_beit_yosef').from && get('o3_beit_yosef').from < get('m_caro').to);
    assert.ok(get('e3_oct7').from === 5784 && get('e3_oct7').he);
});

test('lot 3 : la frise va jusqu\'à aujourd\'hui, et la plage couvre tout', () => {
    assert.ok(M.plage[1] >= 5787);
    const last = Math.max.apply(null, M.items.map(x => x.to === undefined ? x.from : x.to));
    assert.ok(last <= M.plage[1] + 50, 'rien ne dépasse la plage de plus de 50 ans');
    ['maitres', 'hassidim'].forEach(id => assert.ok(M.voies.find(v => v.id === id).items.length >= 25, id));
    assert.ok(C.search(M, 'Rachi').some(x => x.id === 'm_rachi'));
    assert.ok(C.search(M, 'Baal Chem').some(x => x.id === 'hs_besht'));
    assert.ok(C.search(M, 'Pittsburgh').some(x => x.id === 'e3_pittsburgh'));
});


test('lot 4 : la plage commence à la création du monde', () => {
    assert.strictEqual(M.plage[0], 1);
    assert.strictEqual(get('e0_creation').from, 1);
    assert.strictEqual(get('g_adam').from, 1);
});

test('lot 4 : les âges de la Genèse (durée de vie de chaque patriarche)', () => {
    const vie = { g_adam: 929, g_seth: 912, g_enosh: 905, g_kenan: 910, g_mahalalel: 895, g_yered: 962, g_hanoch: 365, g_metushelah: 969, g_lamech: 777, g_noah: 950,
        g_shem: 600, g_arpachshad: 438, g_shelah: 433, g_ever: 464, g_peleg: 239, g_reu: 239, g_serug: 230, g_nahor: 148, g_terah: 205, g_abraham: 175, g_sarah: 127,
        g_ishmael: 137, g_isaac: 180, g_jacob: 147, g_joseph: 110 };
    // Adam : créé en l'an 1 (début de l'an 1), mort en 930 → 929 ans entre les deux repères.
    Object.keys(vie).forEach(id => assert.strictEqual(get(id).to - get(id).from, vie[id], id));
});

test('lot 4 : l\'âge du père à la naissance du fils, d\'Adam à Abraham', () => {
    const chaine = [['g_adam', 'g_seth', 129], ['g_seth', 'g_enosh', 105], ['g_enosh', 'g_kenan', 90], ['g_kenan', 'g_mahalalel', 70], ['g_mahalalel', 'g_yered', 65],
        ['g_yered', 'g_hanoch', 162], ['g_hanoch', 'g_metushelah', 65], ['g_metushelah', 'g_lamech', 187], ['g_lamech', 'g_noah', 182],
        ['g_arpachshad', 'g_shelah', 35], ['g_shelah', 'g_ever', 30], ['g_ever', 'g_peleg', 34], ['g_peleg', 'g_reu', 30], ['g_reu', 'g_serug', 32], ['g_serug', 'g_nahor', 30],
        ['g_nahor', 'g_terah', 29], ['g_terah', 'g_abraham', 70], ['g_abraham', 'g_isaac', 100], ['g_isaac', 'g_jacob', 60], ['g_abraham', 'g_ishmael', 86]];
    chaine.forEach(([p, f, age]) => assert.strictEqual(get(f).from - get(p).from, age, p + ' → ' + f));
    assert.strictEqual(get('g_adam').to, 930);
    assert.strictEqual(get('g_shem').from - get('g_noah').from, 502);
    assert.strictEqual(get('e0_deluge').from - get('g_noah').from, 600, 'Noé a 600 ans au Déluge');
    assert.strictEqual(get('g_arpachshad').from, get('e0_deluge').from + 2, 'Arpakhchad naît deux ans après le Déluge');
    assert.strictEqual(get('g_arpachshad').from - get('g_shem').from, 100);
    assert.strictEqual(get('g_joseph').from - get('g_jacob').from, 91);
    assert.strictEqual(get('g_levi').to, get('e0_levi_mort').from);
    assert.strictEqual(get('g_metushelah').to, get('e0_deluge').from, 'Métouchélah meurt l\'année du Déluge');
});

test('lot 4 : les totaux avant la sortie d\'Égypte : 400, 430, 500, 210 ans, 120 ans avant le Déluge', () => {
    assert.strictEqual(get('g_isaac').from + 400, get('e_sortie').from);
    assert.strictEqual(get('e0_alliance').from + 430, get('e_sortie').from);
    assert.strictEqual(get('g_abraham').from + 500, get('e_sortie').from);
    assert.strictEqual(get('e0_descente').from, get('g_jacob').from + 130);
    assert.strictEqual(get('e0_descente').from + 210, get('e_sortie').from);
    assert.strictEqual(get('e0_arche').from + 120, get('e0_deluge').from);
    ['d400', 'd430', 'd500'].forEach(id => assert.strictEqual(get(id).to, get('e_sortie').from, id));
    assert.strictEqual(get('e0_moise').from + 80, get('e_sortie').from, 'Moïse a 80 ans à la sortie');
    assert.strictEqual(get('e0_aharon').from + 83, get('e_sortie').from);
    assert.strictEqual(get('e0_yaakov_mort').from, get('g_jacob').to);
    assert.strictEqual(get('e0_yossef_mort').from, get('g_joseph').to);
});

test('lot 4 : la vie de Yaakov chez Laban et de Yossef', () => {
    assert.strictEqual(get('e0_charan').from - get('e0_beer_cheva').from, 14, 'quatorze ans chez Ever');
    assert.strictEqual(get('e0_beer_cheva').from - get('g_jacob').from, 63);
    assert.strictEqual(get('e0_fuite').from - get('e0_charan').from, 20, 'vingt ans chez Laban');
    assert.strictEqual(get('e0_vente').from - get('g_joseph').from, 17);
    assert.strictEqual(get('e0_vice_roi').from - get('g_joseph').from, 30);
    assert.strictEqual(get('e0_descente').from - get('e0_vente').from, 22, 'vingt-deux ans de séparation');
    assert.strictEqual(get('e0_sept_ans').to - get('e0_sept_ans').from, 7);
    assert.strictEqual(get('e0_isaac_mort').from, get('g_isaac').to);
    assert.strictEqual(get('e0_abraham_mort').from, get('g_abraham').to);
});

const T = require('../js/transmissionCore.js');

test('liens vers les autres outils : chaque `sage` désigne un maître de la chaîne', () => {
    const liens = M.items.filter(x => x.sage);
    assert.ok(liens.length >= 30);
    liens.forEach(x => [].concat(x.sage).forEach(id => assert.ok(T.byId(id), x.id + ' : maître inconnu ' + id)));
});

test('situer une personne de la généalogie : l\'élément le plus parlant', () => {
    assert.strictEqual(C.forGen(M, 'david').item.voie, 'chefs', 'le règne plutôt que la vie ou l\'événement');
    assert.strictEqual(C.forGen(M, 'adam').item.voie, 'patriarches');
    assert.strictEqual(C.forGen(M, 'rehoboam').item.id, 'k_rehoboam');
    assert.strictEqual(C.forGen(M, 'personne_inconnue'), null);
});

test('situer un maître : son élément, sa vie, ou son époque', () => {
    assert.strictEqual(C.forSage(M, T.byId('akiva')).item.id, 't_akiva');
    assert.strictEqual(C.forSage(M, T.byId('hillel')).item.id, 's_zug5');
    assert.strictEqual(C.forSage(M, T.byId('moche')).item.id, 'p_moise');
    const rachi = C.forSage(M, T.byId('rachi'));              // pas d'élément lié : sa vie, en années de la création
    assert.strictEqual(rachi.from, 1040 + 3760);
    assert.strictEqual(rachi.to, 1105 + 3760);
    const bst = C.forSage(M, T.byId('bst'));                  // un maître du hassidisme : « c. 1698 » → 1698
    assert.strictEqual(bst.from, 1698 + 3760);
    assert.strictEqual(bst.to, 1760 + 3760);
    const tarfon = C.forSage(M, T.byId('tarfon'));            // un tanna sans date : l'époque des Tannaïm
    assert.strictEqual(tarfon.item.id, 'tannaim_ere');
});

test('situer un maître : tous les maîtres de la chaîne ont une cible', () => {
    const sans = T.SAGES.filter(s => !C.forSage(M, s));
    assert.deepStrictEqual(sans.map(s => s.id), [], 'maîtres sans cible : ' + sans.map(s => s.id).join(', '));
});

test('situer une œuvre : la période d\'écriture, en années de la création', () => {
    const L = require('../js/libraryCore.js');
    const michna = L.byId('michna');
    const cible = C.forYears(michna.fr, michna.from, michna.to);
    assert.strictEqual(cible.from, 200 + 3760);
    assert.strictEqual(cible.to, 220 + 3760);
    assert.strictEqual(C.forYears('x', 0, 0), null);
    L.WORKS.forEach(w => { const c = C.forYears(w.fr, w.from, w.to); assert.ok(c && c.from <= c.to, w.id); });
});

test('recherche : tous les mots, les noms avant les notes, le nom qui commence par la requête en premier', () => {
    const hillel = C.search(M, 'hillel').map(x => x.id);
    assert.ok(['n_hillel', 'n_hillel2', 's_zug5'].some(id => hillel.indexOf(id) !== -1 && hillel.indexOf(id) < hillel.indexOf('j_avdon')), 'Hillel avant Avdon ben Hillel');
    assert.ok(/^hillel/i.test(M.byId[hillel[0]].fr), 'le premier résultat commence par Hillel : ' + M.byId[hillel[0]].fr);
    const destruction = C.search(M, 'destruction du temple').map(x => x.id);
    assert.ok(destruction.indexOf('e_destruction') !== -1 && destruction.indexOf('e_destruction2') !== -1);
    assert.ok(['e_destruction', 'e_destruction2'].indexOf(destruction[0]) !== -1, 'les destructions en tête');
    assert.deepStrictEqual(C.search(M, 'destruction zzzz'), []);
});

test('liens vers le Tanakh et les fêtes : livres du Tanakh, éléments et plages existants', () => {
    const index = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data', 'tanakh', 'index.json'), 'utf8'));
    index.books.forEach(b => {
        if (b.id === 'job') return;                          // Job : l'époque est discutée, pas de lien
        assert.ok(M.livres[b.id], 'livre sans lien : ' + b.id);
    });
    Object.keys(M.livres).forEach(id => {
        assert.ok(index.books.some(b => b.id === id), 'livre inconnu : ' + id);
        const l = M.livres[id];
        if (l.item) assert.ok(M.byId[l.item], id + ' : élément ' + l.item);
        else assert.ok(l.from >= M.plage[0] && l.to <= M.plage[1] && l.from <= l.to, id + ' : plage');
    });
    const feasts = require('../js/hebrewCalendarCore.js').feastIds();
    Object.keys(M.fetes).forEach(id => {
        assert.ok(feasts.indexOf(id) !== -1, 'fête inconnue : ' + id);
        assert.ok(M.byId[M.fetes[id]], id + ' : élément ' + M.fetes[id]);
    });
});

test('situer un livre et une fête', () => {
    assert.deepStrictEqual(C.forBook(M, 'exode', 'Exode'), { from: 2238, to: 2449, label: 'Exode' });
    assert.strictEqual(C.forBook(M, 'isaie', 'Isaïe').item.id, 'p_yeshayahou');
    assert.strictEqual(C.forBook(M, 'job', 'Job'), null);
    assert.strictEqual(C.forFeast(M, 'pessah').item.id, 'e_sortie');
    assert.strictEqual(C.forFeast(M, 'chavouot').item.id, 'e_sinai');
    assert.strictEqual(C.forFeast(M, 'tichabav').item.id, 'e_destruction');
    assert.strictEqual(C.forFeast(M, 'tubichvat'), null);
});
