// =========================================================================
// === LES TOMBEAUX DES GRANDS MAÎTRES (écran de la boîte à outils, onglet Explorer) ===
// =========================================================================
// Les 199 hilloulot majeures, tous rites et toutes époques, sur un planisphère MapLibre (sans frontières : seulement les terres), avec une liste, des filtres
// (statut du tombeau, époque, rite), une recherche et une fiche par maître. Chaque fiche renvoie à la bibliothèque (ses œuvres) et à la chaîne de transmission.
// Les points sont des REPÈRES (centre d'une ville, zone) et jamais l'emplacement exact d'une tombe : la fiche le dit. Les maîtres dont le lieu est inconnu,
// multiple ou vague restent dans la liste, sans point. Les données : data/kevarim/kevarim.json (js/kevarimCore.js, testé). Tout passe par textContent.
// Contenu historique et religieux (statuts des tombeaux, traditions) : à relire par une personne compétente.

const KEV_BORDERS_KEY = 'kevarimBorders';
const KEV_LAND = { light: '#e6dcc3', dark: '#3a3428' };
const KEV_VIEWS = {
    world: { bounds: [[-82, 24], [52, 58]] },
    israel: { bounds: [[34.1, 30.6], [36.0, 33.3]] }
};

let kevEntries = null;          // data/kevarim/kevarim.json (ses entrées), chargé une fois
let kevPromise = null;
let kevLand = null;
let kevLandPromise = null;
let kevBorders = false;         // « Frontières actuelles » cochée (réglage gardé sur l'appareil)
let kevBordersData = null;      // { world, levant } : data/world-borders.json et data/levant-borders.json
let kevBordersPromise = null;
let kevMap = null;
let kevMapReady = false;
let kevFilters = { status: 'all', era: 'all', rite: 'all' };
let kevSort = 'alpha';                // ordre de la liste : alpha, annual ou chrono (réglage gardé sur l'appareil)
const KEV_SORT_KEY = 'kevarimSort';
let kevView = 'world';
let kevSelectedId = '';
let kevSelectedKey = '';
let kevPendingId = '';          // un maître à montrer dès l'ouverture (depuis la bibliothèque)

function kevNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

// Les entrées, chargées une fois ; null sans réseau ni cache (l'écran le dit, le reste de l'application fonctionne).
function kevLoad() {
    if (kevEntries) return Promise.resolve(kevEntries);
    if (!kevPromise) {
        kevPromise = fetch('data/kevarim/kevarim.json')
            .then(r => { if (!r.ok) throw new Error('kevarim'); return r.json(); })
            .then(json => { kevEntries = Array.isArray(json.entries) ? json.entries : null; return kevEntries; })
            .catch(() => { kevPromise = null; return null; });
    }
    return kevPromise;
}

// Les frontières actuelles (lignes seules) : le monde en 1:110 m, le Levant en 1:50 m par-dessus quand on zoome. Chargées à la première case cochée.
function kevLoadBorders() {
    if (kevBordersData) return Promise.resolve(true);
    if (!kevBordersPromise) {
        const get = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
        kevBordersPromise = Promise.all([get('data/world-borders.json'), get('data/levant-borders.json')])
            .then(a => { kevBordersData = { world: a[0], levant: a[1] }; return true; })
            .catch(() => { kevBordersPromise = null; return false; });
    }
    return kevBordersPromise;
}

function kevLoadLand() {
    if (kevLand) return Promise.resolve(true);
    if (!kevLandPromise) {
        kevLandPromise = fetch('data/world-land.json')
            .then(r => { if (!r.ok) throw new Error('land'); return r.json(); })
            .then(geo => { kevLand = geo; return true; })
            .catch(() => { kevLandPromise = null; return false; });
    }
    return kevLandPromise;
}

// Ouvre l'écran sur un maître (depuis la bibliothèque : le retour ramène à `from`).
function openKevarim(from, id) {
    kevPendingId = id || '';
    openTool('kevarim', from);
}

function toolKevarimInit() {
    kevFilters = { status: 'all', era: 'all', rite: 'all' };
    kevView = 'world';
    try { kevBorders = localStorage.getItem(KEV_BORDERS_KEY) === '1'; } catch (e) { kevBorders = false; }
    try { const saved = localStorage.getItem(KEV_SORT_KEY); if (saved && KevarimCore.SORTS.some(x => x.id === saved)) kevSort = saved; } catch (e) { /* réglage non gardé */ }
    const box = toolEl('tool-kev-borders');
    if (box) box.checked = kevBorders;
    kevSelectedId = '';
    kevSelectedKey = '';
    const input = toolEl('tool-kev-search');
    if (input && !input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', kevRender);
    }
    if (input) input.value = '';
    const status = toolEl('tool-kev-status');
    status.textContent = t('tools.kevarim_loading');
    kevLoad().then(list => {
        if (!list) { status.textContent = t('tools.kevarim_error'); return null; }
        status.textContent = '';
        if (kevPendingId) {
            const e = KevarimCore.byId(list, kevPendingId);
            if (e) { kevSelectedId = e.id; kevSelectedKey = e.place ? e.place.key : ''; }
            kevPendingId = '';
        }
        kevRender();
        return kevLoadLand().then(ok => (typeof countriesLoad === 'function' ? countriesLoad().then(() => ok, () => ok) : ok));
    }).then(ok => {
        if (ok === null || ok === undefined) return;
        if (!ok) { status.textContent = t('tools.countries_error'); return; }
        return typeof atlasLoadLibrary === 'function' ? atlasLoadLibrary() : false;
    }).then(ok => {
        if (ok === undefined) return;
        if (!ok) { status.textContent = t('tools.countries_no_map'); return; }
        kevEnsureMap();
    });
}

// --- Les filtres -------------------------------------------------------------------------------------------------
function kevFiltered() {
    if (!kevEntries) return [];
    const input = toolEl('tool-kev-search');
    return KevarimCore.filter(kevEntries, { status: kevFilters.status, era: kevFilters.era, rite: kevFilters.rite, query: input ? input.value : '' });
}

function kevSetFilter(kind, id) {
    kevFilters[kind] = kevFilters[kind] === id ? 'all' : id;
    kevRender();
}

function kevChip(label, pressed, onclick, color) {
    const btn = kevNode('button', 'tool-history-chip is-date', label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (color) btn.style.setProperty('--kev-c', color);
    if (color) btn.classList.add('kev-chip-status');
    btn.onclick = onclick;
    return btn;
}

function kevRenderFilters(list) {
    const K = KevarimCore;
    const host = toolEl('tool-kev-filters');
    toolClear(host);
    const row = (kind, items, label) => {
        const r = kevNode('div', 'tool-history-chips is-scroll');
        r.setAttribute('role', 'group');
        r.setAttribute('aria-label', label);
        items.forEach(it => r.appendChild(kevChip(it.fr + ' · ' + (it.n || 0), kevFilters[kind] === it.id, () => kevSetFilter(kind, it.id), it.color)));
        host.appendChild(r);
    };
    // Les effectifs tiennent compte des AUTRES filtres et de la recherche, pas du filtre de la rangée elle-même.
    const input = toolEl('tool-kev-search');
    const q = input ? input.value : '';
    const countFor = (kind) => K.count(K.filter(kevEntries || [], Object.assign({}, kevFilters, { [kind]: 'all', query: q })), kind);
    const cs = countFor('status'), ce = countFor('era'), cr = countFor('rite');
    row('status', K.STATUSES.map(s => ({ id: s.id, fr: t('tools.kevarim_status_' + s.id), color: s.color, n: cs[s.id] })), t('tools.kevarim_filter_status'));
    row('era', K.ERAS.map(s => ({ id: s.id, fr: t('tools.kevarim_era_' + s.id), n: ce[s.id] })), t('tools.kevarim_filter_era'));
    row('rite', K.RITES.map(s => ({ id: s.id, fr: t('tools.kevarim_rite_' + s.id), n: cr[s.id] })), t('tools.kevarim_filter_rite'));
    // L'ordre de la liste : un choix unique (pas de désélection), gardé sur l'appareil.
    // Même habillage que la bande des rites (Séfarade / Ashkénaze / 'Habad) : classes .ben-rites et .ben-rite.
    const sortRow = kevNode('div', 'ben-rites');
    sortRow.setAttribute('role', 'group');
    sortRow.setAttribute('aria-label', t('tools.kevarim_sort_label'));
    K.SORTS.forEach(so => {
        const b = kevNode('button', 'ben-rite', t('tools.kevarim_sort_' + so.id));
        b.type = 'button';
        b.setAttribute('aria-pressed', kevSort === so.id ? 'true' : 'false');
        b.onclick = () => kevSetSort(so.id);
        sortRow.appendChild(b);
    });
    host.appendChild(sortRow);
    if (kevSort === 'chrono') host.appendChild(kevNode('p', 'tool-small', t('tools.kevarim_sort_chrono_note')));
}

function kevSetSort(id) {
    kevSort = id;
    try { localStorage.setItem(KEV_SORT_KEY, id); } catch (e) { /* stockage indisponible : réglage non gardé */ }
    kevRender();
}

function kevRender() {
    if (!kevEntries) return;
    const list = kevFiltered();
    kevRenderFilters(list);
    const placed = list.filter(e => e.place).length;
    toolEl('tool-kev-count').textContent = t('tools.kevarim_count', { n: list.length, placed: placed });
    kevRenderViews();
    kevRenderList(KevarimCore.sortBy(list, kevSort));
    kevRenderFiche(list);
    kevUpdateMap(list);
}

function kevRenderViews() {
    const host = toolEl('tool-kev-views');
    toolClear(host);
    ['world', 'israel'].forEach(id => {
        const b = kevChip(t('tools.kevarim_view_' + id), kevView === id, () => { kevView = id; kevRenderViews(); kevFitView(); }, '');
        host.appendChild(b);
    });
}

// --- La liste -----------------------------------------------------------------------------------------------------
function kevStatusPill(status) {
    const s = KevarimCore.statusOf(status);
    const pill = kevNode('span', 'kev-pill', t('tools.kevarim_status_' + status));
    pill.style.setProperty('--kev-c', s.color);
    return pill;
}

function kevRenderList(list) {
    const host = toolEl('tool-kev-list');
    toolClear(host);
    if (!list.length) { host.appendChild(kevNode('p', 'tool-small', t('tools.kevarim_none'))); return; }
    list.forEach(e => {
        const item = kevNode('button', 'kev-item' + (e.id === kevSelectedId ? ' is-selected' : ''));
        item.type = 'button';
        item.setAttribute('aria-pressed', e.id === kevSelectedId ? 'true' : 'false');
        const names = kevNode('span', 'kev-names');
        names.appendChild(kevNode('strong', 'kev-fr', e.fr));
        const he = kevNode('span', 'kev-he', e.he);
        he.setAttribute('lang', 'he');
        he.setAttribute('dir', 'rtl');
        names.appendChild(he);
        item.appendChild(names);
        const meta = kevNode('span', 'kev-meta');
        meta.appendChild(kevStatusPill(e.status));
        const hl = KevarimCore.hilloulaLabel(e);
        meta.appendChild(kevNode('span', 'tool-small', (hl ? '🕯️ ' + hl + ' · ' : '') + (e.place ? e.place.name : t('tools.kevarim_unplaced_short'))));
        item.appendChild(meta);
        item.onclick = () => kevSelect(e, true);
        host.appendChild(item);
    });
}

function kevSelect(e, fly) {
    kevSelectedId = e ? e.id : '';
    kevSelectedKey = e && e.place ? e.place.key : '';
    kevRender();
    const fiche = toolEl('tool-kev-fiche');
    if (fiche && fiche.scrollIntoView) fiche.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (fly && e && e.place && kevMapReady) kevMap.flyTo({ center: [e.place.lon, e.place.lat], zoom: Math.max(kevMap.getZoom(), 5), duration: 700 });
}

// --- La fiche -----------------------------------------------------------------------------------------------------
function kevFact(dl, label, value) {
    if (!value) return;
    dl.appendChild(kevNode('dt', '', label));
    dl.appendChild(kevNode('dd', '', value));
}

function kevRenderFiche(list) {
    const K = KevarimCore;
    const host = toolEl('tool-kev-fiche');
    toolClear(host);
    const e = kevSelectedId ? K.byId(kevEntries, kevSelectedId) : null;
    const group = kevSelectedKey ? K.groups(kevEntries).find(g => g.key === kevSelectedKey) : null;
    if (!e && !group) { host.appendChild(kevNode('p', 'tool-small', t('tools.kevarim_hint'))); return; }
    // Plusieurs maîtres au même point (Hébron : six) : on les propose, le maître choisi est en dessous.
    if (group && group.entries.length > 1) {
        host.appendChild(kevNode('p', 'tool-small', t('tools.kevarim_here', { place: group.name, n: group.entries.length })));
        const chips = kevNode('div', 'tool-history-chips');
        group.entries.forEach(x => chips.appendChild(kevChip(x.fr, x.id === kevSelectedId, () => kevSelect(x, false), '')));
        host.appendChild(chips);
    }
    if (!e) return;
    const card = kevNode('article', 'kev-card');
    const head = kevNode('h3', 'kev-card-title', e.fr);
    const he = kevNode('span', 'kev-he', e.he);
    he.setAttribute('lang', 'he');
    he.setAttribute('dir', 'rtl');
    head.appendChild(he);
    card.appendChild(head);
    card.appendChild(kevNode('p', 'tool-small', e.bio));
    const dl = kevNode('dl', 'lib-facts');
    const hl = K.hilloulaLabel(e);
    kevFact(dl, t('tools.kevarim_f_hilloula'), hl ? hl + (e.hilloula.kind === 'tradition' ? ' · ' + t('tools.zm_hil_tradition') : '') : t('tools.kevarim_no_hilloula'));
    kevFact(dl, t('tools.kevarim_f_death'), e.dateText);
    kevFact(dl, t('tools.kevarim_f_tomb'), e.tombText);
    kevFact(dl, t('tools.kevarim_f_status'), e.statusText);
    kevFact(dl, t('tools.kevarim_f_born'), e.born);
    kevFact(dl, t('tools.kevarim_f_group'), e.groupText);
    kevFact(dl, t('tools.kevarim_f_works'), e.works && e.works !== '—' ? e.works : '');
    card.appendChild(dl);
    card.appendChild(kevNode('p', 'tool-small kev-precision', e.place
        ? t('tools.kevarim_precision', { place: e.place.name, precision: t('tools.kevarim_precision_' + e.place.precision) })
        : t('tools.kevarim_unplaced')));
    const actions = kevNode('div', 'lib-actions');
    card.appendChild(actions);
    // Le bouton ne sert qu'à recentrer : il n'apparaît que si le point est sorti de la vue de la carte.
    if (e.place && kevMapReady && !kevMap.getBounds().contains([e.place.lon, e.place.lat])) {
        const b = kevNode('button', 'btn', t('tools.kevarim_see_map'));
        b.type = 'button';
        b.onclick = () => kevMap.flyTo({ center: [e.place.lon, e.place.lat], zoom: Math.max(kevMap.getZoom(), 6), duration: 700 });
        actions.appendChild(b);
    }
    if (e.authorId && typeof LibraryCore !== 'undefined' && LibraryCore.worksOf(e.authorId).length && typeof openLibrary === 'function') {
        const b = kevNode('button', 'btn', '📚 ' + t('tools.kevarim_open_library', { n: LibraryCore.worksOf(e.authorId).length }));
        b.type = 'button';
        b.onclick = () => openLibrary('screen-tool-kevarim', e.authorId);
        actions.appendChild(b);
    }
    const who = e.authorId && typeof TransmissionCore !== 'undefined' ? TransmissionCore.byId(e.authorId) : null;
    if (who) {
        const b = kevNode('button', 'btn', '🔗 ' + t('tools.library_open_chain', { name: who.fr }));
        b.type = 'button';
        b.onclick = () => { openTool(who.hass ? 'hassidout' : 'transmission', 'screen-tool-kevarim'); trGoTo(who.id); };
        actions.appendChild(b);
    }
    host.appendChild(card);
}

// --- La carte ------------------------------------------------------------------------------------------------------
function kevEnsureMap() {
    if (!kevLand || !kevEntries) return;
    if (kevMap) { kevMap.resize(); return; }
    const theme = countriesTheme();
    let map;
    try {
        map = new maplibregl.Map({
            container: 'tool-kev-map',
            style: { version: 8, sources: {}, layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': COUNTRIES_OCEAN[theme] } }] },
            bounds: KEV_VIEWS[kevView].bounds,
            fitBoundsOptions: { padding: 12 },
            minZoom: 0.6,
            maxZoom: 12,
            renderWorldCopies: false,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false
        });
    } catch (e) {
        toolEl('tool-kev-status').textContent = t('tools.countries_no_webgl');
        return;
    }
    kevMap = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.touchZoomRotate.disableRotation();
    map.on('load', () => {
        map.addSource('land', { type: 'geojson', data: kevLand });
        map.addLayer({ id: 'land-fill', type: 'fill', source: 'land', paint: { 'fill-color': KEV_LAND[theme] } });
        // Le Levant plus fin (Natural Earth 1:50 m, le fond des cartes bibliques) par-dessus le planisphère, pour la vue « Terre d'Israël ».
        if (typeof countriesData !== 'undefined' && countriesData && countriesData.geo) {
            map.addSource('levant', { type: 'geojson', data: countriesData.geo });
            map.addLayer({ id: 'levant-fill', type: 'fill', source: 'levant', paint: { 'fill-color': KEV_LAND[theme] } });
            map.addLayer({ id: 'levant-seams', type: 'line', source: 'levant', paint: { 'line-color': KEV_LAND[theme], 'line-width': 1.4 } });
        }
        map.addLayer({ id: 'land-line', type: 'line', source: 'land', paint: { 'line-color': theme === 'dark' ? '#6b6250' : '#bfae86', 'line-width': 0.6 } });
        // Les frontières (cachées tant que la case n'est pas cochée) : sous les points. Le monde jusqu'au zoom 4,5, le Levant plus fin au-delà.
        const bcolor = theme === 'dark' ? '#d9cfae' : '#7a6a43';
        const vis = kevBorders ? 'visible' : 'none';
        map.addSource('borders-world', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addSource('borders-levant', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'borders-world', type: 'line', source: 'borders-world', maxzoom: 4.5, layout: { visibility: vis }, paint: { 'line-color': bcolor, 'line-width': 0.9, 'line-opacity': 0.8, 'line-dasharray': [3, 2] } });
        map.addLayer({ id: 'borders-levant', type: 'line', source: 'borders-levant', minzoom: 4.5, layout: { visibility: vis }, paint: { 'line-color': bcolor, 'line-width': 1.3, 'line-opacity': 0.85, 'line-dasharray': [3, 2] } });
        map.addSource('kev', { type: 'geojson', data: KevarimCore.geojson(kevFiltered()) });
        map.addLayer({ id: 'kev-halo', type: 'circle', source: 'kev', paint: { 'circle-radius': ['step', ['get', 'n'], 7, 2, 9, 4, 11], 'circle-color': '#ffffff', 'circle-opacity': 0.9 } });
        map.addLayer({ id: 'kev-dot', type: 'circle', source: 'kev', paint: { 'circle-radius': ['step', ['get', 'n'], 5, 2, 7, 4, 9], 'circle-color': ['get', 'color'] } });
        map.addLayer({ id: 'kev-selected', type: 'circle', source: 'kev', filter: ['==', ['get', 'key'], ''], paint: { 'circle-radius': 13, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': theme === 'dark' ? '#f3e7cf' : '#141d23', 'circle-stroke-width': 2.5 } });
        kevMapReady = true;
        kevApplyBorders();
        map.on('click', 'kev-dot', ev => {
            const f = ev.features && ev.features[0];
            if (!f) return;
            const g = KevarimCore.groups(kevEntries).find(x => x.key === f.properties.key);
            if (!g) return;
            const visible = kevFiltered().filter(x => x.place && x.place.key === g.key);
            kevSelectedKey = g.key;
            kevSelectedId = visible.length === 1 ? visible[0].id : '';
            kevRender();
            const fiche = toolEl('tool-kev-fiche');
            if (fiche && fiche.scrollIntoView) fiche.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        map.on('mouseenter', 'kev-dot', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'kev-dot', () => { map.getCanvas().style.cursor = ''; });
        // Quand la carte bouge, le bouton « Voir sur la carte » suit : présent si le maître est sorti de la vue, absent sinon.
        map.on('moveend', () => { if (kevSelectedId) kevRenderFiche(kevFiltered()); });
        kevUpdateMap(kevFiltered());
        kevRenderFiche(kevFiltered());
    });
    map.on('error', () => {});
}

function kevUpdateMap(list) {
    if (!kevMapReady || !kevMap) return;
    const src = kevMap.getSource('kev');
    if (src) src.setData(KevarimCore.geojson(list));
    kevMap.setFilter('kev-selected', ['==', ['get', 'key'], kevSelectedKey]);
}

function kevFitView() {
    if (kevMapReady && kevMap) kevMap.fitBounds(KEV_VIEWS[kevView].bounds, { padding: 12, duration: 600 });
}

// La case « Frontières actuelles » : charge les lignes au premier affichage, puis montre ou cache les deux couches.
function kevToggleBorders(on) {
    kevBorders = !!on;
    try { localStorage.setItem(KEV_BORDERS_KEY, kevBorders ? '1' : '0'); } catch (e) { /* stockage indisponible : réglage non gardé */ }
    kevApplyBorders();
}

function kevApplyBorders() {
    if (!kevMapReady || !kevMap) return;
    const apply = () => {
        ['borders-world', 'borders-levant'].forEach(id => kevMap.setLayoutProperty(id, 'visibility', kevBorders ? 'visible' : 'none'));
    };
    if (!kevBorders) { apply(); return; }
    kevLoadBorders().then(ok => {
        if (!ok) { toolEl('tool-kev-status').textContent = t('tools.countries_error'); return; }
        kevMap.getSource('borders-world').setData(kevBordersData.world);
        kevMap.getSource('borders-levant').setData(kevBordersData.levant);
        apply();
    });
}
