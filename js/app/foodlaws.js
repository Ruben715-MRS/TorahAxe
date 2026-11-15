// =========================================================================
// === PUR ET IMPUR : ANIMAUX ET ALIMENTS (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// Cinq onglets : (1) les signes de pureté par sorte d'animal ; (2) le tableau des animaux, à filtrer (catégorie, statut, signes, recherche) ; (3) les oiseaux
// interdits, avec leur verset dans le Lévitique et dans le Deutéronome ; (4) les quatre sauterelles permises, avec une vérification des signes ; (5) les
// mélanges interdits (kilayim, viande et lait). Mêmes filtres que « Offrandes et sacrifices ». Les données sont dans js/foodLawsData.js, les filtres dans
// js/foodLawsCore.js (testés), les textes de l'écran sous `tools.food_*` de ui/fr.json. Outil d'étude, pas une décision de halakha. Tout passe par
// textContent, jamais par du HTML.

// Onglets de la rangée principale, puis les trois de « Aujourd'hui » (une sous-rangée, séparée par des barres, comme la fin d'un niveau).
const FOOD_TOP_TABS = ['signes', 'animaux', 'oiseaux', 'sauterelles', 'melanges'];
const FOOD_TODAY_TABS = ['terrestres', 'poissons', 'oiseaux_casher'];
const FOOD_TABS = FOOD_TOP_TABS.concat(FOOD_TODAY_TABS);
let foodTab = 'signes';
const foodState = {
    animals: { cat: 'all', status: 'all', signs: 'all', query: '' },
    birds: { source: 'all', query: '' },
    locust: [],
    mixtures: { cat: 'all', query: '' },
    fish: { query: '' },
    land: { query: '' },
    casherBirds: { query: '' }
};

function toolFoodLawsInit() {
    foodTab = 'signes';
    foodRender();
}

function foodPick(tab) {
    foodTab = FOOD_TABS.indexOf(tab) >= 0 ? tab : 'signes';
    foodRender();
    const screen = toolEl('screen-tool-foodlaws');
    if (screen) screen.scrollTop = 0;
}

function foodNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function foodHebrew(tag, text, className) {
    const el = foodNode(tag, className, text);
    el.lang = 'he';
    el.dir = 'rtl';
    return el;
}

function foodSelect(id, labelKey, options, current, onChange) {
    const wrap = foodNode('label', 'kor-filter');
    wrap.appendChild(foodNode('span', 'tool-small', t(labelKey)));
    const select = foodNode('select', 'tool-input');
    select.id = id;
    options.forEach(o => {
        const opt = foodNode('option', '', o.label);
        opt.value = o.id;
        select.appendChild(opt);
    });
    select.value = current;
    select.onchange = () => onChange(select.value);
    wrap.appendChild(select);
    return wrap;
}

function foodOptions(map) {
    return [{ id: 'all', label: t('tools.food_all') }].concat(Object.keys(map).map(id => ({ id: id, label: map[id] })));
}

function foodSearch(id, current, onInput) {
    const wrap = foodNode('label', 'kor-filter kor-search');
    wrap.appendChild(foodNode('span', 'tool-small', t('tools.food_search')));
    const input = foodNode('input', 'tool-input');
    input.type = 'search';
    input.id = id;
    input.autocomplete = 'off';
    input.placeholder = t('tools.food_search_placeholder');
    input.value = current;
    input.oninput = () => onInput(input.value);
    wrap.appendChild(input);
    return wrap;
}

function foodResetButton(id, onReset) {
    const reset = foodNode('button', 'tool-history-chip kor-reset', t('tools.food_reset'));
    reset.type = 'button';
    reset.id = id;
    reset.onclick = onReset;
    return reset;
}

function foodRender() {
    const inToday = FOOD_TODAY_TABS.indexOf(foodTab) >= 0;
    const tabs = toolEl('tool-food-tabs');
    toolClear(tabs);
    FOOD_TOP_TABS.forEach(id => {
        const btn = foodNode('button', 'tool-history-chip', t('tools.food_tab_' + id));
        btn.type = 'button';
        btn.id = 'tool-food-tab-' + id;
        btn.setAttribute('aria-pressed', id === foodTab ? 'true' : 'false');
        btn.onclick = () => foodPick(id);
        tabs.appendChild(btn);
    });
    // « Aujourd'hui » ouvre la sous-rangée (premier choix par défaut) ; elle reste ouverte tant qu'un de ses trois onglets est choisi.
    const todayBtn = foodNode('button', 'tool-history-chip', t('tools.food_tab_today'));
    todayBtn.type = 'button';
    todayBtn.id = 'tool-food-tab-today';
    todayBtn.setAttribute('aria-pressed', inToday ? 'true' : 'false');
    todayBtn.onclick = () => { if (!inToday) foodPick(FOOD_TODAY_TABS[0]); };
    tabs.appendChild(todayBtn);

    const todayRow = toolEl('tool-food-today');
    toolClear(todayRow);
    todayRow.classList.toggle('hidden', !inToday);
    if (inToday) {
        FOOD_TODAY_TABS.forEach(id => {
            const link = foodNode('button', 'final-link', t('tools.food_tab_' + id));
            link.type = 'button';
            link.id = 'tool-food-tab-' + id;
            link.setAttribute('aria-pressed', id === foodTab ? 'true' : 'false');
            link.onclick = () => foodPick(id);
            todayRow.appendChild(link);
        });
    }
    const body = toolEl('tool-food-body');
    toolClear(body);
    body.appendChild(foodNode('p', 'tool-small', t('tools.food_lead_' + foodTab)));
    ({ signes: foodRenderSigns, animaux: foodRenderAnimals, oiseaux: foodRenderBirds, sauterelles: foodRenderLocusts, melanges: foodRenderMixtures, poissons: foodRenderFish, terrestres: foodRenderLand, oiseaux_casher: foodRenderCasherBirds }[foodTab])(body);
}

// --- 1. Les signes -----------------------------------------------------------------------------------------------------------------
function foodRenderSigns(body) {
    FoodLawsData.SIGN_CARDS.forEach(c => {
        const card = foodNode('article', 'tool-result kor-type');
        const head = foodNode('div', 'kor-type-head');
        head.appendChild(foodHebrew('strong', c.he, 'kor-he'));
        head.appendChild(foodNode('span', 'kor-type-name', c.fr));
        card.appendChild(head);
        card.appendChild(foodNode('p', 'tool-small', c.text));
        card.appendChild(foodNode('p', 'tool-small kor-ref', c.ref));
        card.dataset.sign = c.id;
        body.appendChild(card);
    });
}

// --- 2. Le tableau des animaux -----------------------------------------------------------------------------------------------------
function foodRenderAnimals(body) {
    const D = FoodLawsData;
    const f = foodState.animals;
    const grid = foodNode('div', 'kor-filters');
    const set = key => value => { f[key] = value; foodRenderAnimalRows(); };
    grid.appendChild(foodSelect('food-f-cat', 'tools.food_f_cat', foodOptions(D.CATEGORIES), f.cat, set('cat')));
    grid.appendChild(foodSelect('food-f-status', 'tools.food_f_status', foodOptions(D.STATUS), f.status, set('status')));
    grid.appendChild(foodSelect('food-f-signs', 'tools.food_f_signs', foodOptions({ both: D.SIGNS.both, hoof: D.SIGNS.hoof, cud: D.SIGNS.cud }), f.signs, set('signs')));
    body.appendChild(grid);
    body.appendChild(foodSearch('food-f-query', f.query, v => { f.query = v; foodRenderAnimalRows(); }));
    body.appendChild(foodResetButton('food-reset', () => { Object.assign(f, { cat: 'all', status: 'all', signs: 'all', query: '' }); foodRender(); }));
    const msg = foodNode('p', 'tool-msg', '');
    msg.id = 'food-msg';
    msg.setAttribute('role', 'status');
    body.appendChild(msg);
    const list = foodNode('div', 'kor-list');
    list.id = 'food-rows';
    body.appendChild(list);
    foodRenderAnimalRows();
}

function foodRenderAnimalRows() {
    const D = FoodLawsData;
    const rows = FoodLawsCore.filterAnimals(foodState.animals);
    const list = toolEl('food-rows');
    toolClear(list);
    rows.forEach(a => {
        const card = foodNode('article', 'tool-result kor-card food-card is-' + a.status);
        card.dataset.row = a.id;
        const head = foodNode('div', 'kor-card-head');
        head.appendChild(foodHebrew('strong', a.he, 'kor-he'));
        head.appendChild(foodNode('span', 'kor-situation', a.fr));
        card.appendChild(head);
        const tags = foodNode('div', 'kor-tags');
        tags.appendChild(foodNode('span', 'kor-tag food-tag-' + a.status, D.STATUS[a.status]));
        tags.appendChild(foodNode('span', 'kor-tag', D.CATEGORIES[a.cat]));
        if (a.cat === 'terre') {
            tags.appendChild(foodNode('span', 'kor-tag', t(a.hoof ? 'tools.food_hoof_yes' : 'tools.food_hoof_no')));
            tags.appendChild(foodNode('span', 'kor-tag', t(a.cud ? 'tools.food_cud_yes' : 'tools.food_cud_no')));
        }
        card.appendChild(tags);
        if (a.note) card.appendChild(foodNode('p', 'tool-small', a.note));
        card.appendChild(foodNode('p', 'tool-small kor-ref', a.ref));
        list.appendChild(card);
    });
    toolEl('food-msg').textContent = rows.length ? t('tools.food_count', { n: rows.length, total: D.ANIMALS.length }) : t('tools.food_none');
}

// --- 3. Les oiseaux ----------------------------------------------------------------------------------------------------------------
function foodRenderBirds(body) {
    const f = foodState.birds;
    const grid = foodNode('div', 'kor-filters');
    const sources = { lev: t('tools.food_src_lev'), dt: t('tools.food_src_dt'), both: t('tools.food_src_both') };
    grid.appendChild(foodSelect('food-f-source', 'tools.food_f_source', foodOptions(sources), f.source, v => { f.source = v; foodRenderBirdRows(); }));
    body.appendChild(grid);
    body.appendChild(foodSearch('food-b-query', f.query, v => { f.query = v; foodRenderBirdRows(); }));
    body.appendChild(foodResetButton('food-b-reset', () => { Object.assign(f, { source: 'all', query: '' }); foodRender(); }));
    const msg = foodNode('p', 'tool-msg', '');
    msg.id = 'food-b-msg';
    msg.setAttribute('role', 'status');
    body.appendChild(msg);
    const list = foodNode('div', 'kor-list');
    list.id = 'food-b-rows';
    body.appendChild(list);
    // Les signes de la Michna : sous la liste.
    const signs = foodNode('article', 'tool-result kor-type');
    signs.appendChild(foodNode('strong', '', t('tools.food_bird_signs')));
    FoodLawsData.BIRD_SIGNS.forEach(s => signs.appendChild(foodNode('p', 'tool-small', (s.pure ? '✓ ' + t('tools.food_pure') : '✗ ' + t('tools.food_impure')) + ' : ' + s.fr + ' (' + s.ref + ')')));
    body.appendChild(signs);
    foodRenderBirdRows();
}

function foodRenderBirdRows() {
    const rows = FoodLawsCore.filterBirds(foodState.birds);
    const list = toolEl('food-b-rows');
    toolClear(list);
    rows.forEach(b => {
        const card = foodNode('article', 'tool-result kor-card food-card is-impur');
        card.dataset.row = b.id;
        const head = foodNode('div', 'kor-card-head');
        head.appendChild(foodHebrew('strong', b.he, 'kor-he'));
        head.appendChild(foodNode('span', 'kor-situation', b.fr));
        card.appendChild(head);
        const tags = foodNode('div', 'kor-tags');
        if (b.lev) tags.appendChild(foodNode('span', 'kor-tag', t('tools.food_lev', { v: b.lev })));
        if (b.dt) tags.appendChild(foodNode('span', 'kor-tag', t('tools.food_dt', { v: b.dt })));
        card.appendChild(tags);
        if (b.note) card.appendChild(foodNode('p', 'tool-small', b.note));
        list.appendChild(card);
    });
    toolEl('food-b-msg').textContent = rows.length ? t('tools.food_birds_count', { n: rows.length, total: FoodLawsData.BIRDS.length }) : t('tools.food_none');
}

// --- 4. Les sauterelles ------------------------------------------------------------------------------------------------------------
function foodRenderLocusts(body) {
    const D = FoodLawsData;
    const names = foodNode('div', 'kor-tags food-locusts');
    D.LOCUSTS.forEach(l => {
        const tag = foodNode('span', 'kor-tag');
        tag.appendChild(foodHebrew('strong', l.he, 'kor-he'));
        tag.appendChild(document.createTextNode(' ' + l.fr));
        names.appendChild(tag);
    });
    body.appendChild(names);
    body.appendChild(foodNode('h4', 'tool-h', t('tools.food_locust_check')));
    const box = foodNode('div', 'food-checks');
    D.LOCUST_SIGNS.forEach(s => {
        const label = foodNode('label', 'food-check');
        const input = foodNode('input');
        input.type = 'checkbox';
        input.id = 'food-locust-' + s.id;
        input.checked = foodState.locust.indexOf(s.id) >= 0;
        input.onchange = () => {
            foodState.locust = foodState.locust.filter(x => x !== s.id);
            if (input.checked) foodState.locust.push(s.id);
            foodRenderLocustVerdict();
        };
        label.appendChild(input);
        label.appendChild(foodNode('span', '', ' ' + s.fr));
        label.appendChild(foodNode('small', 'tool-small kor-ref', ' ' + s.ref));
        box.appendChild(label);
    });
    body.appendChild(box);
    const verdict = foodNode('p', 'tool-result food-verdict', '');
    verdict.id = 'food-locust-verdict';
    verdict.setAttribute('role', 'status');
    body.appendChild(verdict);
    body.appendChild(foodNode('p', 'tool-small', t('tools.food_locust_mesora')));
    foodRenderLocustVerdict();
}

function foodRenderLocustVerdict() {
    const r = FoodLawsCore.checkLocust(foodState.locust);
    const el = toolEl('food-locust-verdict');
    el.classList.toggle('is-ok', r.ok);
    if (r.ok) el.textContent = t('tools.food_locust_ok') + (r.nameKnown ? '' : ' ' + t('tools.food_locust_noname'));
    else el.textContent = t('tools.food_locust_missing', { n: r.missing.length });
}

// --- 5. Les mélanges ---------------------------------------------------------------------------------------------------------------
function foodRenderMixtures(body) {
    const f = foodState.mixtures;
    const grid = foodNode('div', 'kor-filters');
    grid.appendChild(foodSelect('food-f-mix', 'tools.food_f_mix', foodOptions(FoodLawsData.MIXTURES_CATS), f.cat, v => { f.cat = v; foodRenderMixtureRows(); }));
    body.appendChild(grid);
    body.appendChild(foodSearch('food-m-query', f.query, v => { f.query = v; foodRenderMixtureRows(); }));
    body.appendChild(foodResetButton('food-m-reset', () => { Object.assign(f, { cat: 'all', query: '' }); foodRender(); }));
    const msg = foodNode('p', 'tool-msg', '');
    msg.id = 'food-m-msg';
    msg.setAttribute('role', 'status');
    body.appendChild(msg);
    const list = foodNode('div', 'kor-list');
    list.id = 'food-m-rows';
    body.appendChild(list);
    foodRenderMixtureRows();
}

function foodRenderMixtureRows() {
    const D = FoodLawsData;
    const rows = FoodLawsCore.filterMixtures(foodState.mixtures);
    const list = toolEl('food-m-rows');
    toolClear(list);
    rows.forEach(m => {
        const card = foodNode('article', 'tool-result kor-card food-card is-impur');
        card.dataset.row = m.id;
        const head = foodNode('div', 'kor-card-head');
        head.appendChild(foodHebrew('strong', m.he, 'kor-he'));
        head.appendChild(foodNode('span', 'kor-situation', m.fr));
        card.appendChild(head);
        const tags = foodNode('div', 'kor-tags');
        tags.appendChild(foodNode('span', 'kor-tag', D.MIXTURES_CATS[m.cat]));
        card.appendChild(tags);
        card.appendChild(foodNode('p', 'tool-small', m.text));
        card.appendChild(foodNode('p', 'tool-small kor-ref', m.ref));
        card.appendChild(foodNode('p', 'tool-small kor-ref', t('tools.food_sources', { src: m.sources })));
        list.appendChild(card);
    });
    toolEl('food-m-msg').textContent = rows.length ? t('tools.food_mix_count', { n: rows.length, total: D.MIXTURES.length }) : t('tools.food_none');
}

// --- 6. Les poissons autorisés aujourd'hui (liste du Consistoire, séparée du texte biblique) ------------------------------------------
function foodRenderFish(body) {
    const f = foodState.fish;
    body.appendChild(foodNode('p', 'tool-small food-fish-note', t('tools.food_fish_note')));
    body.appendChild(foodSearch('food-p-query', f.query, v => { f.query = v; foodRenderFishRows(); }));
    body.appendChild(foodResetButton('food-p-reset', () => { Object.assign(f, { query: '' }); foodRender(); }));
    const msg = foodNode('p', 'tool-msg', '');
    msg.id = 'food-p-msg';
    msg.setAttribute('role', 'status');
    body.appendChild(msg);
    const list = foodNode('div', 'kor-list');
    list.id = 'food-p-rows';
    body.appendChild(list);
    foodRenderFishRows();
}

function foodRenderFishRows() {
    const rows = FoodLawsCore.filterFish(foodState.fish);
    const list = toolEl('food-p-rows');
    toolClear(list);
    rows.forEach(p => {
        const card = foodNode('article', 'tool-result kor-card food-card is-pur');
        const head = foodNode('div', 'kor-card-head');
        head.appendChild(foodNode('span', 'kor-situation', p.fr));
        card.appendChild(head);
        if (p.lat) card.appendChild(foodNode('p', 'tool-small kor-ref', t('tools.food_land_lat', { lat: p.lat })));
        if (p.alias) card.appendChild(foodNode('p', 'tool-small', t('tools.food_fish_alias', { alias: p.alias })));
        if (p.excl) card.appendChild(foodNode('p', 'tool-small food-fish-excl', t('tools.food_fish_excl', { excl: p.excl })));
        if (p.note) card.appendChild(foodNode('p', 'tool-small', p.note));
        list.appendChild(card);
    });
    toolEl('food-p-msg').textContent = rows.length ? t('tools.food_fish_count', { n: rows.length, total: FoodLawsData.CONSISTOIRE_POISSONS.length }) : t('tools.food_none');
}

// --- 7. Les animaux terrestres aujourd'hui (compilation de sources, séparée du texte biblique) ---------------------------------------
function foodRenderLand(body) {
    const f = foodState.land;
    body.appendChild(foodNode('p', 'tool-small food-fish-note', t('tools.food_land_note')));
    body.appendChild(foodSearch('food-t-query', f.query, v => { f.query = v; foodRenderLandRows(); }));
    body.appendChild(foodResetButton('food-t-reset', () => { Object.assign(f, { query: '' }); foodRender(); }));
    const msg = foodNode('p', 'tool-msg', '');
    msg.id = 'food-t-msg';
    msg.setAttribute('role', 'status');
    body.appendChild(msg);
    const list = foodNode('div', 'kor-list');
    list.id = 'food-t-rows';
    body.appendChild(list);
    foodRenderLandRows();
}

function foodRenderLandRows() {
    const D = FoodLawsData;
    const rows = FoodLawsCore.filterLand(foodState.land);
    const list = toolEl('food-t-rows');
    toolClear(list);
    rows.forEach(a => {
        const card = foodNode('article', 'tool-result kor-card food-card is-pur');
        const head = foodNode('div', 'kor-card-head');
        head.appendChild(foodNode('span', 'kor-situation', a.fr));
        card.appendChild(head);
        const tags = foodNode('div', 'kor-tags');
        tags.appendChild(foodNode('span', 'kor-tag', D.LAND_GROUPS[a.group]));
        card.appendChild(tags);
        if (a.lat) card.appendChild(foodNode('p', 'tool-small kor-ref', t('tools.food_land_lat', { lat: a.lat })));
        if (a.note) card.appendChild(foodNode('p', 'tool-small', a.note));
        list.appendChild(card);
    });
    toolEl('food-t-msg').textContent = rows.length ? t('tools.food_land_count', { n: rows.length, total: D.LAND_CONTEMPORARY.length }) : t('tools.food_none');
}

// --- 8. Les oiseaux réputés casher aujourd'hui (compilation de sources, séparée des noms bibliques) ----------------------------------
function foodRenderCasherBirds(body) {
    const f = foodState.casherBirds;
    body.appendChild(foodNode('p', 'tool-small food-fish-note', t('tools.food_casher_birds_note')));
    body.appendChild(foodSearch('food-c-query', f.query, v => { f.query = v; foodRenderCasherBirdRows(); }));
    body.appendChild(foodResetButton('food-c-reset', () => { Object.assign(f, { query: '' }); foodRender(); }));
    const msg = foodNode('p', 'tool-msg', '');
    msg.id = 'food-c-msg';
    msg.setAttribute('role', 'status');
    body.appendChild(msg);
    const list = foodNode('div', 'kor-list');
    list.id = 'food-c-rows';
    body.appendChild(list);
    foodRenderCasherBirdRows();
}

function foodRenderCasherBirdRows() {
    const D = FoodLawsData;
    const rows = FoodLawsCore.filterCasherBirds(foodState.casherBirds);
    const list = toolEl('food-c-rows');
    toolClear(list);
    rows.forEach(b => {
        // Vert pour les oiseaux acceptés, rouge pour les interdits, neutre pour les cas litigieux.
        const cls = b.status === 'refuse' ? 'impur' : (b.status === 'litigieux' ? '' : 'pur');
        const card = foodNode('article', 'tool-result kor-card food-card' + (cls ? ' is-' + cls : ''));
        const head = foodNode('div', 'kor-card-head');
        head.appendChild(foodNode('span', 'kor-situation', b.fr));
        card.appendChild(head);
        const tags = foodNode('div', 'kor-tags');
        tags.appendChild(foodNode('span', 'kor-tag' + (cls ? ' food-tag-' + cls : ''), D.BIRDS_CASHER_STATUS[b.status]));
        card.appendChild(tags);
        if (b.lat) card.appendChild(foodNode('p', 'tool-small kor-ref', t('tools.food_land_lat', { lat: b.lat })));
        if (b.note) card.appendChild(foodNode('p', 'tool-small', b.note));
        list.appendChild(card);
    });
    toolEl('food-c-msg').textContent = rows.length ? t('tools.food_casher_birds_count', { n: rows.length, total: D.BIRDS_CASHER.length }) : t('tools.food_none');
}
