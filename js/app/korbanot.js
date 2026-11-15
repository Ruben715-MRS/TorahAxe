// =========================================================================
// === LES KORBANOT : OFFRANDES ET SACRIFICES (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// Huit onglets, comme « Textes de référence » : (1) le tableau des offrandes, à filtrer ; (2) le moussaf, où l'on coche des jours pour obtenir les
// totaux ; (3) les mena'hot et les libations : ce qui accompagne chaque animal (farine, huile, vin), à additionner, et les quatorze offrandes de farine,
// à filtrer ; (4) les animaux, espèces et âges ; (5) les princes de l'inauguration de l'autel ; (6) les vingt-quatre dons au cohen, avec le calcul des
// prélèvements et dîmes et celui du rachat des premiers-nés ; (7) les prémices, avec la procession pas à pas ; (8) le rituel : où et comment (js/korbanotRitualData.js, js/app/korbanot-ritual.js). Les données sont dans
// js/korbanotData.js, les calculs dans js/korbanotCore.js (testés), les textes de l'écran sous `tools.korbanot_*` de ui/fr.json. Les mots hébreux
// qui ont une fiche dans le dictionnaire (js/app/lexicon.js) y renvoient ; le retour ramène ici. Tout passe par textContent, jamais par du HTML.

const KOR_TABS = ['offrandes', 'moussaf', 'menahot', 'animaux', 'princes', 'dons', 'premices', 'rituel'];
let korTab = 'offrandes';
const korState = {
    filters: { type: 'all', scope: 'all', species: 'all', sex: 'all', duty: 'all', holiness: 'all', query: '' },
    moussaf: [], tamid: false,
    acc: { bull: 1, ram: 1, lamb: 1, kid: 0, 'metsora-hatat': 0, 'metsora-acham': 0 },
    menahot: { flour: 'all', incense: 'all', burned: 'all', scope: 'all', query: '' },
    animals: 'all',
    princes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    gifts: 'all',
    tithe: { total: 100, den: 50, kind: 'sheni' },
    step: 0, allSteps: false
};

function toolKorbanotInit() {
    korTab = 'offrandes';
    korRender();
}

function korPick(tab) {
    korTab = KOR_TABS.indexOf(tab) >= 0 ? tab : 'offrandes';
    korRender();
    const screen = toolEl('screen-tool-korbanot');
    if (screen) screen.scrollTop = 0;
}

// --- Briques communes -------------------------------------------------------------------------------------------------------------
function korNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function korHebrew(tag, text, className) {
    const el = korNode(tag, className, text);
    el.lang = 'he';
    el.dir = 'rtl';
    return el;
}

// « 1 taureau », « 7 agneaux » : le singulier pour 0 et 1.
function korN(n, one, many) { return n.toLocaleString('fr-FR') + ' ' + (n > 1 ? many : one); }

// Une liste d'animaux accordée : [[1, 'taureau', 'taureaux'], [2, 'bélier', 'béliers']] → « 1 taureau, 2 béliers ».
function korAnimalList(items) {
    return items.filter(i => i[0] > 0).map(i => korN(i[0], i[1], i[2])).join(', ');
}

// Un bouton vers la fiche du mot dans le dictionnaire ; rien si le dictionnaire n'a pas ce mot.
function korDictButton(key) {
    if (!key || typeof LexiconCore === 'undefined' || !LexiconCore.search(key).results.length) return null;
    const btn = korNode('button', 'tool-history-chip kor-dict', t('tools.korbanot_dict'));
    btn.type = 'button';
    btn.onclick = () => { openTool('lexicon', 'screen-tool-korbanot'); toolLexiconSearch(key); };
    return btn;
}

// Un groupe de boutons exclusifs (« chips ») : options [{ id, label }], la valeur choisie, ce qu'on fait au choix.
function korChips(options, current, onPick, ariaLabel) {
    const box = korNode('div', 'tool-history-chips kor-chips');
    box.setAttribute('role', 'group');
    if (ariaLabel) box.setAttribute('aria-label', ariaLabel);
    options.forEach(o => {
        const btn = korNode('button', 'tool-history-chip', o.label);
        btn.type = 'button';
        btn.setAttribute('aria-pressed', o.id === current ? 'true' : 'false');
        btn.onclick = () => onPick(o.id);
        box.appendChild(btn);
    });
    return box;
}

function korRender() {
    const tabs = toolEl('tool-korbanot-tabs');
    toolClear(tabs);
    KOR_TABS.forEach(id => {
        const btn = korNode('button', 'tool-history-chip', t('tools.korbanot_tab_' + id));
        btn.type = 'button';
        btn.id = 'tool-korbanot-tab-' + id;
        btn.setAttribute('aria-pressed', id === korTab ? 'true' : 'false');
        btn.onclick = () => korPick(id);
        tabs.appendChild(btn);
    });
    const body = toolEl('tool-korbanot-body');
    toolClear(body);
    body.appendChild(korNode('p', 'tool-small', t('tools.korbanot_lead_' + korTab)));
    ({ offrandes: korRenderOfferings, moussaf: korRenderMoussaf, menahot: korRenderMenahot, animaux: korRenderAnimals, princes: korRenderPrinces, dons: korRenderGifts, premices: korRenderFirstFruits, rituel: korRenderRitual })[korTab](body);
}

// =====================================================================================================================================
// === 1. LE TABLEAU DES OFFRANDES ===
// =====================================================================================================================================
function korSelect(id, labelKey, options, current, onChange) {
    const wrap = korNode('label', 'kor-filter');
    wrap.appendChild(korNode('span', 'tool-small', t(labelKey)));
    const select = korNode('select', 'tool-input');
    select.id = id;
    options.forEach(o => {
        const opt = korNode('option', '', o.label);
        opt.value = o.id;
        select.appendChild(opt);
    });
    select.value = current;
    select.onchange = () => onChange(select.value);
    wrap.appendChild(select);
    return wrap;
}

function korOptions(map, allKey) {
    return [{ id: 'all', label: t(allKey) }].concat(Object.keys(map).map(id => ({ id: id, label: map[id] })));
}

function korRenderOfferings(body) {
    const D = KorbanotData;
    // Les sept sortes d'offrandes, repliées.
    const details = korNode('details', 'kor-details');
    details.appendChild(korNode('summary', '', t('tools.korbanot_types_title')));
    D.TYPES.forEach(type => {
        const item = korNode('article', 'tool-result kor-type');
        const head = korNode('div', 'kor-type-head');
        head.appendChild(korHebrew('strong', type.he, 'kor-he'));
        head.appendChild(korNode('span', 'kor-type-name', type.fr));
        item.appendChild(head);
        item.appendChild(korNode('p', 'tool-small', type.summary));
        item.appendChild(korNode('p', 'tool-small kor-ref', t('tools.korbanot_holiness') + ' : ' + D.HOLINESS[type.holiness] + ' · ' + type.ref));
        const dict = korDictButton(type.key);
        if (dict) item.appendChild(dict);
        details.appendChild(item);
    });
    body.appendChild(details);

    // Les filtres.
    const f = korState.filters;
    const typeOptions = [{ id: 'all', label: t('tools.korbanot_all') }].concat(D.TYPES.map(x => ({ id: x.id, label: x.fr })));
    const grid = korNode('div', 'kor-filters');
    const set = key => value => { f[key] = value; korRenderRows(); };
    grid.appendChild(korSelect('kor-f-type', 'tools.korbanot_f_type', typeOptions, f.type, set('type')));
    grid.appendChild(korSelect('kor-f-scope', 'tools.korbanot_f_scope', korOptions(D.SCOPES, 'tools.korbanot_all'), f.scope, set('scope')));
    grid.appendChild(korSelect('kor-f-species', 'tools.korbanot_f_species', korOptions(D.SPECIES, 'tools.korbanot_all'), f.species, set('species')));
    grid.appendChild(korSelect('kor-f-sex', 'tools.korbanot_f_sex', korOptions({ M: D.SEXES.M, F: D.SEXES.F }, 'tools.korbanot_all'), f.sex, set('sex')));
    grid.appendChild(korSelect('kor-f-duty', 'tools.korbanot_f_duty', korOptions({ obligatoire: D.DUTIES.obligatoire, spontane: D.DUTIES.spontane }, 'tools.korbanot_all'), f.duty, set('duty')));
    grid.appendChild(korSelect('kor-f-holiness', 'tools.korbanot_f_holiness', korOptions(D.HOLINESS, 'tools.korbanot_all'), f.holiness, set('holiness')));
    body.appendChild(grid);

    const searchWrap = korNode('label', 'kor-filter kor-search');
    searchWrap.appendChild(korNode('span', 'tool-small', t('tools.korbanot_f_search')));
    const input = korNode('input', 'tool-input');
    input.type = 'search';
    input.id = 'kor-f-query';
    input.autocomplete = 'off';
    input.placeholder = t('tools.korbanot_search_placeholder');
    input.value = f.query;
    input.oninput = () => { f.query = input.value; korRenderRows(); };
    searchWrap.appendChild(input);
    body.appendChild(searchWrap);

    const reset = korNode('button', 'tool-history-chip kor-reset', t('tools.korbanot_reset'));
    reset.type = 'button';
    reset.id = 'kor-reset';
    reset.onclick = () => { Object.assign(f, { type: 'all', scope: 'all', species: 'all', sex: 'all', duty: 'all', holiness: 'all', query: '' }); korRender(); };
    body.appendChild(reset);

    body.appendChild(korNode('p', 'tool-msg', ''));
    body.lastChild.id = 'kor-msg';
    body.lastChild.setAttribute('role', 'status');
    const list = korNode('div', 'kor-list');
    list.id = 'kor-rows';
    body.appendChild(list);
    korRenderRows();
}

function korRowCard(row) {
    const D = KorbanotData;
    const type = KorbanotCore.TYPE_BY_ID[row.type];
    const card = korNode('article', 'tool-result kor-card');
    card.dataset.row = row.id;
    const head = korNode('div', 'kor-card-head');
    head.appendChild(korNode('strong', 'kor-situation', row.situation));
    const sub = korNode('span', 'tool-small', type.fr + (row.part ? ' ' + row.part : ''));
    head.appendChild(sub);
    card.appendChild(head);
    const tags = korNode('div', 'kor-tags');
    [[D.SCOPES[row.scope], 'scope'], [row.animal, 'animal'], [D.SEXES[row.sex], 'sex'], [D.DUTIES[row.duty], 'duty'], [D.HOLINESS[KorbanotCore.holinessOf(row)], 'holiness']].forEach(pair => {
        tags.appendChild(korNode('span', 'kor-tag kor-tag-' + pair[1], pair[0]));
    });
    card.appendChild(tags);
    card.appendChild(korNode('p', 'tool-small kor-ref', row.ref));
    return card;
}

function korRenderRows() {
    const rows = KorbanotCore.filterRows(korState.filters);
    const list = toolEl('kor-rows');
    toolClear(list);
    rows.forEach(r => list.appendChild(korRowCard(r)));
    toolEl('kor-msg').textContent = rows.length
        ? t('tools.korbanot_count', { n: rows.length, total: KorbanotData.ROWS.length })
        : t('tools.korbanot_none');
}

// =====================================================================================================================================
// === 2. LE MOUSSAF ===
// =====================================================================================================================================
function korDayCounts(day) {
    const parts = [];
    if (day.bulls) parts.push(korN(day.bulls, 'taureau', 'taureaux'));
    if (day.rams) parts.push(korN(day.rams, 'bélier', 'béliers'));
    if (day.lambs) parts.push(korN(day.lambs, 'agneau', 'agneaux'));
    if (day.goats) parts.push(korN(day.goats, 'bouc', 'boucs'));
    return parts.join(' · ');
}

function korRenderMoussaf(body) {
    const presets = KorbanotCore.moussafPresets();
    const bar = korNode('div', 'tool-history-chips kor-presets');
    [['pessah', 'tools.korbanot_p_pessah'], ['souccot', 'tools.korbanot_p_souccot'], ['souccot8', 'tools.korbanot_p_souccot8'],
        ['hautesFetes', 'tools.korbanot_p_hautes'], ['all', 'tools.korbanot_p_all'], ['none', 'tools.korbanot_p_none']].forEach(p => {
        const btn = korNode('button', 'tool-history-chip', t(p[1]));
        btn.type = 'button';
        btn.id = 'kor-preset-' + p[0];
        btn.onclick = () => { korState.moussaf = presets[p[0]].slice(); korSyncMoussaf(); };
        bar.appendChild(btn);
    });
    body.appendChild(bar);

    const tamid = korNode('label', 'gem-reduce');
    const tamidBox = korNode('input');
    tamidBox.type = 'checkbox';
    tamidBox.id = 'kor-tamid';
    tamidBox.checked = korState.tamid;
    tamidBox.onchange = () => { korState.tamid = tamidBox.checked; korRenderMoussafTotals(); };
    tamid.appendChild(tamidBox);
    tamid.appendChild(korNode('span', '', ' ' + t('tools.korbanot_tamid')));
    body.appendChild(tamid);

    const list = korNode('div', 'kor-days');
    list.id = 'kor-days';
    KorbanotData.MOUSSAF.forEach(day => {
        const row = korNode('label', 'kor-day');
        const box = korNode('input');
        box.type = 'checkbox';
        box.dataset.day = day.id;
        box.checked = korState.moussaf.indexOf(day.id) >= 0;
        box.onchange = () => {
            const at = korState.moussaf.indexOf(day.id);
            if (box.checked && at < 0) korState.moussaf.push(day.id);
            if (!box.checked && at >= 0) korState.moussaf.splice(at, 1);
            korRenderMoussafTotals();
        };
        const text = korNode('span', 'kor-day-text');
        text.appendChild(korNode('strong', '', day.fr));
        const extra = day.includes.length ? ' + ' + t('tools.korbanot_includes_rh') : '';
        text.appendChild(korNode('small', 'tool-small', korDayCounts(day) + extra));
        text.appendChild(korNode('small', 'tool-small kor-ref', day.ref));
        row.append(box, text);
        list.appendChild(row);
    });
    body.appendChild(list);

    const totals = korNode('div', 'tool-result kor-totals');
    totals.id = 'kor-totals';
    totals.setAttribute('role', 'status');
    totals.setAttribute('aria-live', 'polite');
    body.appendChild(totals);
    body.appendChild(korNode('p', 'tool-small', t('tools.korbanot_moussaf_note')));
    korRenderMoussafTotals();
}

// Après un préréglage : on recoche les cases, puis on recalcule.
function korSyncMoussaf() {
    document.querySelectorAll('#kor-days input[data-day]').forEach(box => { box.checked = korState.moussaf.indexOf(box.dataset.day) >= 0; });
    korRenderMoussafTotals();
}

function korRenderMoussafTotals() {
    const box = toolEl('kor-totals');
    toolClear(box);
    const t0 = KorbanotCore.moussafTotals(korState.moussaf, { tamid: korState.tamid });
    if (!t0.occasions) {
        box.appendChild(korNode('p', 'tool-small', t('tools.korbanot_totals_empty')));
        return;
    }
    box.appendChild(korNode('strong', 'kor-total-big', korN(t0.animals, 'animal', 'animaux') + ' · ' + korN(t0.days, 'jour', 'jours')));
    const lines = [];
    if (t0.bulls) lines.push(korN(t0.bulls, 'taureau', 'taureaux'));
    if (t0.rams) lines.push(korN(t0.rams, 'bélier', 'béliers'));
    if (t0.lambs) lines.push(korN(t0.lambs, 'agneau', 'agneaux'));
    if (t0.goats) lines.push(korN(t0.goats, 'bouc de \'hatat', 'boucs de \'hatat'));
    box.appendChild(korNode('p', 'kor-total-line', lines.join(' · ')));
    box.appendChild(korNode('p', 'tool-small', t('tools.korbanot_totals_sides', {
        flour: KorbanotCore.ephaText(t0.flour), oil: KorbanotCore.hinText(t0.oil), wine: KorbanotCore.hinText(t0.wine)
    })));
}

// =====================================================================================================================================
// === 3. LES MENA'HOT ET LES LIBATIONS ===
// =====================================================================================================================================
function korRenderMenahot(body) {
    const D = KorbanotData;
    // Ce qui accompagne chaque animal : des compteurs, un total.
    const acc = korNode('section', 'kor-section');
    acc.appendChild(korNode('h3', 'tool-h', t('tools.korbanot_acc_title')));
    acc.appendChild(korNode('p', 'tool-small', t('tools.korbanot_acc_lead')));
    const grid = korNode('div', 'kor-counters');
    D.ACCOMPANIMENTS.forEach(a => {
        const wrap = korNode('label', 'kor-filter');
        wrap.appendChild(korNode('span', 'tool-small', a.fr));
        const input = korNode('input', 'tool-input');
        input.type = 'number';
        input.inputMode = 'numeric';
        input.min = '0';
        input.max = '999';
        input.step = '1';
        input.dataset.acc = a.id;
        input.value = String(korState.acc[a.id] || 0);
        input.oninput = () => { korState.acc[a.id] = Math.max(0, Math.floor(Number(input.value) || 0)); korRenderAccTotals(); };
        wrap.appendChild(input);
        wrap.appendChild(korNode('small', 'tool-small kor-ref', t('tools.korbanot_acc_each', { flour: a.flour, oil: a.oil, wine: a.wine })));
        grid.appendChild(wrap);
    });
    acc.appendChild(grid);
    const bar = korNode('div', 'tool-history-chips kor-presets');
    const fromMoussaf = korNode('button', 'tool-history-chip', t('tools.korbanot_acc_from_moussaf'));
    fromMoussaf.type = 'button';
    fromMoussaf.id = 'kor-acc-moussaf';
    fromMoussaf.onclick = () => {
        const m = KorbanotCore.moussafTotals(korState.moussaf, { tamid: korState.tamid });
        Object.keys(korState.acc).forEach(k => { korState.acc[k] = 0; });
        Object.assign(korState.acc, { bull: m.bulls, ram: m.rams, lamb: m.lambs });
        korSyncAcc();
    };
    const zero = korNode('button', 'tool-history-chip', t('tools.korbanot_acc_zero'));
    zero.type = 'button';
    zero.id = 'kor-acc-zero';
    zero.onclick = () => { Object.keys(korState.acc).forEach(k => { korState.acc[k] = 0; }); korSyncAcc(); };
    bar.append(fromMoussaf, zero);
    acc.appendChild(bar);
    const totals = korNode('div', 'tool-result kor-totals');
    totals.id = 'kor-acc-totals';
    totals.setAttribute('role', 'status');
    totals.setAttribute('aria-live', 'polite');
    acc.appendChild(totals);
    body.appendChild(acc);
    korRenderAccTotals();

    // Les quatorze offrandes de farine.
    const sec = korNode('section', 'kor-section');
    sec.appendChild(korNode('h3', 'tool-h', t('tools.korbanot_menahot_title')));
    const f = korState.menahot;
    const filters = korNode('div', 'kor-filters');
    const set = key => value => { f[key] = value; korRenderMenahotRows(); };
    filters.appendChild(korSelect('kor-m-flour', 'tools.korbanot_m_flour', korOptions({ 'blé': D.MENAHOT_LABELS.flour['blé'], orge: D.MENAHOT_LABELS.flour.orge }, 'tools.korbanot_all'), f.flour, set('flour')));
    filters.appendChild(korSelect('kor-m-incense', 'tools.korbanot_m_incense', [{ id: 'all', label: t('tools.korbanot_all') }, { id: 'oui', label: t('tools.korbanot_m_incense_yes') }, { id: 'non', label: t('tools.korbanot_m_incense_no') }], f.incense, set('incense')));
    filters.appendChild(korSelect('kor-m-burned', 'tools.korbanot_m_burned', korOptions(D.MENAHOT_LABELS.burned, 'tools.korbanot_all'), f.burned, set('burned')));
    filters.appendChild(korSelect('kor-m-scope', 'tools.korbanot_m_scope', korOptions({ individuel: 'Individuel', collectif: 'Collectif' }, 'tools.korbanot_all'), f.scope, set('scope')));
    sec.appendChild(filters);
    const msg = korNode('p', 'tool-msg', '');
    msg.id = 'kor-m-msg';
    msg.setAttribute('role', 'status');
    sec.appendChild(msg);
    const list = korNode('div', 'kor-list');
    list.id = 'kor-m-rows';
    sec.appendChild(list);
    D.MENAHOT_NOTES.forEach(note => sec.appendChild(korNode('p', 'tool-small', note)));
    body.appendChild(sec);
    korRenderMenahotRows();
}

function korSyncAcc() {
    document.querySelectorAll('#tool-korbanot-body input[data-acc]').forEach(input => { input.value = String(korState.acc[input.dataset.acc] || 0); });
    korRenderAccTotals();
}

function korRenderAccTotals() {
    const box = toolEl('kor-acc-totals');
    toolClear(box);
    const s = KorbanotCore.accompanimentTotals(korState.acc);
    if (!s.animals) { box.appendChild(korNode('p', 'tool-small', t('tools.korbanot_acc_empty'))); return; }
    box.appendChild(korNode('strong', 'kor-total-big', korN(s.animals, 'animal', 'animaux')));
    const ul = korNode('ul', 'kor-lines');
    ul.appendChild(korNode('li', '', t('tools.korbanot_acc_flour', { n: s.flour.toLocaleString('fr-FR'), epha: KorbanotCore.ephaText(s.flour) })));
    ul.appendChild(korNode('li', '', t('tools.korbanot_acc_oil', { n: s.oil.toLocaleString('fr-FR'), hin: KorbanotCore.hinText(s.oil) })));
    ul.appendChild(korNode('li', '', t('tools.korbanot_acc_wine', { n: s.wine.toLocaleString('fr-FR'), hin: KorbanotCore.hinText(s.wine) })));
    box.appendChild(ul);
}

function korMenahotCard(m) {
    const D = KorbanotData, L = D.MENAHOT_LABELS;
    const card = korNode('article', 'tool-result kor-card');
    card.dataset.menaha = m.id;
    const head = korNode('div', 'kor-type-head');
    head.appendChild(korHebrew('strong', m.he, 'kor-he kor-he-small'));
    head.appendChild(korNode('span', 'kor-type-name', m.fr));
    card.appendChild(head);
    const tags = korNode('div', 'kor-tags');
    [[L.flour[m.flour], 'flour'], [t('tools.korbanot_m_measure', { n: m.measure }), 'measure'],
        [m.oil ? t('tools.korbanot_m_oil', { n: m.oil }) : t('tools.korbanot_m_no_oil'), 'oil'], [L.incense[m.incense], 'incense'],
        [L.burned[m.burned], 'burned'], [L.scope[m.scope], 'scope']].forEach(pair => tags.appendChild(korNode('span', 'kor-tag kor-tag-' + pair[1], pair[0])));
    card.appendChild(tags);
    card.appendChild(korNode('p', 'tool-small', m.note));
    card.appendChild(korNode('p', 'tool-small kor-ref', m.ref));
    const dict = korDictButton(m.key);
    if (dict) card.appendChild(dict);
    return card;
}

function korRenderMenahotRows() {
    const rows = KorbanotCore.filterMenahot(korState.menahot);
    const list = toolEl('kor-m-rows');
    toolClear(list);
    rows.forEach(m => list.appendChild(korMenahotCard(m)));
    toolEl('kor-m-msg').textContent = rows.length
        ? t('tools.korbanot_m_count', { n: rows.length, total: KorbanotData.MENAHOT.length })
        : t('tools.korbanot_none');
}

// =====================================================================================================================================
// === 4. LES ANIMAUX ===
// =====================================================================================================================================
function korRenderAnimals(body) {
    const D = KorbanotData;
    const options = [{ id: 'all', label: t('tools.korbanot_all') }].concat(Object.keys(D.ANIMAL_GROUPS).map(id => ({ id: id, label: D.ANIMAL_GROUPS[id] })));
    body.appendChild(korChips(options, korState.animals, id => { korState.animals = id; korRender(); }, t('tools.korbanot_animals_aria')));
    Object.keys(D.ANIMAL_GROUPS).forEach(group => {
        if (korState.animals !== 'all' && korState.animals !== group) return;
        const section = korNode('section', 'kor-group');
        const h = korNode('h3', 'tool-h kor-group-title', D.ANIMAL_GROUPS[group] + ' ');
        h.appendChild(korHebrew('span', D.ANIMAL_GROUP_HE[group], 'kor-he-inline'));
        section.appendChild(h);
        D.ANIMALS.filter(a => a.group === group).forEach(a => {
            const card = korNode('article', 'tool-result kor-animal');
            const head = korNode('div', 'kor-type-head');
            head.appendChild(korHebrew('strong', a.he, 'kor-he'));
            head.appendChild(korNode('span', 'kor-type-name', a.fr));
            card.appendChild(head);
            card.appendChild(korNode('p', 'tool-small', a.note));
            const dict = korDictButton(a.key);
            if (dict) card.appendChild(dict);
            section.appendChild(card);
        });
        body.appendChild(section);
    });
    body.appendChild(korNode('p', 'tool-small', D.ANIMAL_NOTE));
}

// =====================================================================================================================================
// === 5. LES PRINCES ===
// =====================================================================================================================================
function korRenderPrinces(body) {
    const D = KorbanotData, o = D.PRINCE_OFFERING;
    const card = korNode('article', 'tool-result kor-offering');
    card.appendChild(korNode('strong', '', t('tools.korbanot_prince_each')));
    const ul = korNode('ul', 'kor-lines');
    [
        t('tools.korbanot_prince_silver', { bowl: o.silverBowl, basin: o.silverBasin }),
        t('tools.korbanot_prince_gold', { n: o.goldLadle }),
        t('tools.korbanot_prince_ola', { list: korAnimalList([[o.olaBulls, 'taureau', 'taureaux'], [o.olaRams, 'bélier', 'béliers'], [o.olaLambs, 'agneau', 'agneaux']]) }),
        t('tools.korbanot_prince_hatat', { list: korAnimalList([[o.hatatGoats, 'bouc', 'boucs']]) }),
        t('tools.korbanot_prince_chelamim', { list: korAnimalList([[o.chelamimOxen, 'bœuf', 'bœufs'], [o.chelamimRams, 'bélier', 'béliers'], [o.chelamimGoats, 'bouc', 'boucs'], [o.chelamimLambs, 'agneau', 'agneaux']]) })
    ].forEach(line => ul.appendChild(korNode('li', '', line)));
    card.appendChild(ul);
    body.appendChild(card);

    const bar = korNode('div', 'tool-history-chips kor-presets');
    [['all', 'tools.korbanot_p_all'], ['none', 'tools.korbanot_p_none']].forEach(p => {
        const btn = korNode('button', 'tool-history-chip', t(p[1]));
        btn.type = 'button';
        btn.id = 'kor-princes-' + p[0];
        btn.onclick = () => { korState.princes = p[0] === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : []; korSyncPrinces(); };
        bar.appendChild(btn);
    });
    body.appendChild(bar);

    const list = korNode('div', 'kor-days');
    list.id = 'kor-princes';
    D.PRINCES.forEach(p => {
        const row = korNode('label', 'kor-day');
        const box = korNode('input');
        box.type = 'checkbox';
        box.dataset.prince = String(p.day);
        box.checked = korState.princes.indexOf(p.day) >= 0;
        box.onchange = () => {
            const at = korState.princes.indexOf(p.day);
            if (box.checked && at < 0) korState.princes.push(p.day);
            if (!box.checked && at >= 0) korState.princes.splice(at, 1);
            korRenderPrincesTotals();
        };
        const text = korNode('span', 'kor-day-text');
        text.appendChild(korNode('strong', '', t('tools.korbanot_prince_day', { n: p.day, tribe: p.tribe })));
        text.appendChild(korNode('small', 'tool-small', p.prince));
        text.appendChild(korNode('small', 'tool-small kor-ref', p.ref));
        row.append(box, text);
        list.appendChild(row);
    });
    body.appendChild(list);

    const totals = korNode('div', 'tool-result kor-totals');
    totals.id = 'kor-princes-totals';
    totals.setAttribute('role', 'status');
    totals.setAttribute('aria-live', 'polite');
    body.appendChild(totals);
    korRenderPrincesTotals();
}

function korSyncPrinces() {
    document.querySelectorAll('#kor-princes input[data-prince]').forEach(box => { box.checked = korState.princes.indexOf(Number(box.dataset.prince)) >= 0; });
    korRenderPrincesTotals();
}

function korRenderPrincesTotals() {
    const box = toolEl('kor-princes-totals');
    toolClear(box);
    const s = KorbanotCore.princesTotals(korState.princes);
    if (!s.n) { box.appendChild(korNode('p', 'tool-small', t('tools.korbanot_totals_empty'))); return; }
    box.appendChild(korNode('strong', 'kor-total-big', korN(s.n, 'prince', 'princes') + ' · ' + korN(s.animals, 'animal', 'animaux')));
    const ul = korNode('ul', 'kor-lines');
    [
        t('tools.korbanot_prince_total_metals', { silver: s.silver.toLocaleString('fr-FR'), gold: s.gold.toLocaleString('fr-FR') }),
        t('tools.korbanot_prince_total_ola', { n: korN(s.ola, 'animal', 'animaux'), list: korAnimalList([[s.olaBulls, 'taureau', 'taureaux'], [s.olaRams, 'bélier', 'béliers'], [s.olaLambs, 'agneau', 'agneaux']]) }),
        t('tools.korbanot_prince_total_hatat', { list: korAnimalList([[s.hatatGoats, 'bouc', 'boucs']]) }),
        t('tools.korbanot_prince_total_chelamim', { n: korN(s.chelamim, 'animal', 'animaux'), list: korAnimalList([[s.chelamimOxen, 'bœuf', 'bœufs'], [s.chelamimRams, 'bélier', 'béliers'], [s.chelamimGoats, 'bouc', 'boucs'], [s.chelamimLambs, 'agneau', 'agneaux']]) })
    ].forEach(line => ul.appendChild(korNode('li', '', line)));
    box.appendChild(ul);
}

// =====================================================================================================================================
// === 6. LES DONS AU COHEN, LES PRÉLÈVEMENTS ET LE RACHAT DES PREMIERS-NÉS ===
// =====================================================================================================================================
function korRenderGifts(body) {
    const D = KorbanotData;
    const options = [{ id: 'all', label: t('tools.korbanot_gifts_all', { n: D.GIFTS.length }) }]
        .concat(Object.keys(D.GIFT_GROUPS).map(id => ({ id: id, label: D.GIFT_GROUPS[id].fr + ' (' + D.GIFT_GROUPS[id].count + ')' })));
    body.appendChild(korChips(options, korState.gifts, id => { korState.gifts = id; korRender(); }, t('tools.korbanot_gifts_aria')));
    const list = korNode('ol', 'kor-gifts');
    KorbanotCore.giftsByGroup(korState.gifts).forEach(g => {
        const item = korNode('li', 'tool-result kor-gift');
        item.value = g.n;
        item.dataset.gift = String(g.n);
        const head = korNode('div', 'kor-type-head');
        head.appendChild(korHebrew('strong', g.he, 'kor-he'));
        head.appendChild(korNode('span', 'kor-type-name', g.fr));
        item.appendChild(head);
        item.appendChild(korNode('p', 'tool-small', g.text));
        item.appendChild(korNode('p', 'tool-small kor-ref', KorbanotData.GIFT_GROUPS[g.group].fr + ' · ' + g.ref));
        const dict = korDictButton(g.key);
        if (dict) item.appendChild(dict);
        list.appendChild(item);
    });
    body.appendChild(list);

    // Les prélèvements et dîmes.
    const tithe = korNode('section', 'kor-section');
    tithe.appendChild(korNode('h3', 'tool-h', t('tools.korbanot_tithe_title')));
    tithe.appendChild(korNode('p', 'tool-small', t('tools.korbanot_tithe_lead')));
    const grid = korNode('div', 'kor-filters');
    const qty = korNode('label', 'kor-filter');
    qty.appendChild(korNode('span', 'tool-small', t('tools.korbanot_tithe_total')));
    const input = korNode('input', 'tool-input');
    input.type = 'number';
    input.inputMode = 'decimal';
    input.min = '0';
    input.step = 'any';
    input.id = 'kor-tithe-total';
    input.value = String(korState.tithe.total);
    input.oninput = () => { korState.tithe.total = input.value === '' ? 0 : Number(input.value); korRenderTithe(); };
    qty.appendChild(input);
    grid.appendChild(qty);
    grid.appendChild(korSelect('kor-tithe-den', 'tools.korbanot_tithe_terumah', D.TEROUMA.map(x => ({ id: String(x.den), label: x.fr })), String(korState.tithe.den), v => { korState.tithe.den = Number(v); korRenderTithe(); }));
    grid.appendChild(korSelect('kor-tithe-kind', 'tools.korbanot_tithe_year', D.TITHE_YEARS.map(x => ({ id: x.id, label: x.fr })), korState.tithe.kind, v => { korState.tithe.kind = v; korRenderTithe(); }));
    tithe.appendChild(grid);
    const out = korNode('div', 'tool-result kor-totals');
    out.id = 'kor-tithe-out';
    out.setAttribute('role', 'status');
    out.setAttribute('aria-live', 'polite');
    tithe.appendChild(out);
    body.appendChild(tithe);
    korRenderTithe();

    // Le rachat des premiers-nés.
    const lev = KorbanotCore.levitesRedemption();
    const fmt = n => n.toLocaleString('fr-FR');
    const redeem = korNode('section', 'kor-section');
    redeem.appendChild(korNode('h3', 'tool-h', t('tools.korbanot_levites_title')));
    redeem.appendChild(korNode('p', 'tool-small', t('tools.korbanot_levites_lead')));
    const dl = korNode('ul', 'kor-lines kor-levites');
    [
        t('tools.korbanot_levites_sons', { gershon: fmt(lev.gershon), kehat: fmt(lev.kehat), merari: fmt(lev.merari) }),
        t('tools.korbanot_levites_total', { n: fmt(lev.levites) }),
        t('tools.korbanot_levites_counted', { first: fmt(lev.firstbornLevites), n: fmt(lev.counted) }),
        t('tools.korbanot_levites_israel', { n: fmt(lev.firstbornIsrael), counted: fmt(lev.counted), excess: fmt(lev.excess) }),
        t('tools.korbanot_levites_shekels', { excess: fmt(lev.excess), each: lev.shekelsEach, total: fmt(lev.shekels) })
    ].forEach(line => dl.appendChild(korNode('li', '', line)));
    redeem.appendChild(dl);
    redeem.appendChild(korNode('p', 'tool-small kor-ref', lev.ref));
    body.appendChild(redeem);
}

function korRenderTithe() {
    const out = toolEl('kor-tithe-out');
    toolClear(out);
    const s = KorbanotCore.titheBreakdown(korState.tithe.total, korState.tithe.den, korState.tithe.kind);
    const fmt = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    if (!s.total) { out.appendChild(korNode('p', 'tool-small', t('tools.korbanot_tithe_empty'))); return; }
    const ul = korNode('ul', 'kor-lines');
    [
        t('tools.korbanot_tithe_l_terumah', { n: fmt(s.terumah), den: s.den }),
        t('tools.korbanot_tithe_l_richon', { n: fmt(s.maasserRichon) }),
        t('tools.korbanot_tithe_l_terumat', { n: fmt(s.terumatMaasser), levi: fmt(s.levi) }),
        t(s.kind === 'ani' ? 'tools.korbanot_tithe_l_ani' : 'tools.korbanot_tithe_l_sheni', { n: fmt(s.second) }),
        t('tools.korbanot_tithe_l_owner', { n: fmt(s.owner) })
    ].forEach(line => ul.appendChild(korNode('li', '', line)));
    out.appendChild(ul);
}

// =====================================================================================================================================
// === 7. LES PRÉMICES ===
// =====================================================================================================================================
function korRenderFirstFruits(body) {
    const D = KorbanotData;
    const species = korNode('section', 'kor-section');
    species.appendChild(korNode('h3', 'tool-h', t('tools.korbanot_species_title') + ' (' + D.SPECIES_REF + ')'));
    const grid = korNode('div', 'kor-species');
    D.SEVEN_SPECIES.forEach(s => {
        const card = korNode('article', 'tool-result kor-species-card');
        card.appendChild(korHebrew('strong', s.he, 'kor-he'));
        card.appendChild(korNode('span', 'kor-type-name', s.fr));
        const dict = korDictButton(s.key);
        if (dict) card.appendChild(dict);
        grid.appendChild(card);
    });
    species.appendChild(grid);
    body.appendChild(species);

    const steps = korNode('section', 'kor-section');
    steps.appendChild(korNode('h3', 'tool-h', t('tools.korbanot_steps_title')));
    const total = D.BIKKURIM_STEPS.length;
    const toggle = korNode('label', 'gem-reduce');
    const toggleBox = korNode('input');
    toggleBox.type = 'checkbox';
    toggleBox.id = 'kor-all-steps';
    toggleBox.checked = korState.allSteps;
    toggleBox.onchange = () => { korState.allSteps = toggleBox.checked; korRender(); };
    toggle.append(toggleBox, korNode('span', '', ' ' + t('tools.korbanot_steps_all')));
    steps.appendChild(toggle);

    if (korState.allSteps) {
        const ol = korNode('ol', 'kor-steps');
        D.BIKKURIM_STEPS.forEach(s => {
            const li = korNode('li', 'tool-result kor-step');
            li.appendChild(korNode('strong', '', s.fr));
            li.appendChild(korNode('p', 'tool-small', s.text));
            li.appendChild(korNode('p', 'tool-small kor-ref', s.ref));
            ol.appendChild(li);
        });
        steps.appendChild(ol);
    } else {
        const s = D.BIKKURIM_STEPS[korState.step];
        const card = korNode('article', 'tool-result kor-step kor-step-card');
        card.id = 'kor-step-card';
        card.setAttribute('aria-live', 'polite');
        card.appendChild(korNode('span', 'tool-small', t('tools.korbanot_step_of', { n: korState.step + 1, total: total })));
        card.appendChild(korNode('strong', 'kor-step-title', s.fr));
        card.appendChild(korNode('p', '', s.text));
        card.appendChild(korNode('p', 'tool-small kor-ref', s.ref));
        steps.appendChild(card);
        const nav = korNode('div', 'kor-step-nav');
        const prev = korNode('button', 'btn', t('tools.korbanot_step_prev'));
        prev.type = 'button';
        prev.id = 'kor-step-prev';
        prev.disabled = korState.step === 0;
        prev.onclick = () => { korState.step = Math.max(0, korState.step - 1); korRender(); };
        const next = korNode('button', 'btn', t('tools.korbanot_step_next'));
        next.type = 'button';
        next.id = 'kor-step-next';
        next.disabled = korState.step >= total - 1;
        next.onclick = () => { korState.step = Math.min(total - 1, korState.step + 1); korRender(); };
        nav.append(prev, next);
        steps.appendChild(nav);
    }
    body.appendChild(steps);
}
