// =========================================================================
// === LA CHRONOLOGIE (écran « Explorer ») ===
// =========================================================================
// Une frise qui se fait défiler de gauche à droite : en haut la règle (années hébraïques et civiles), dessous une voie par sujet (époques, Michkan et Temple,
// prophètes, juges et royauté unie, rois de Juda, rois d'Israël, événements), où ce qui se passe en même temps est l'un au-dessus de l'autre. On touche un
// élément pour sa fiche : les dates dans les deux calendriers, la note, ce qui se passe en même temps, et le lien vers la généalogie ou le Temple.
// Les données sont dans data/chronologie.json et js/chronologieCore.js (testé). Tout passe par textContent, jamais par du HTML.

const CHR_SCALES = [2, 4, 8, 16];         // pixels par année (4 au départ : environ un siècle d'un écran de téléphone)
const CHR_TAIL = 260;                     // place à droite de la dernière année, pour les étiquettes qui dépassent
const CHR_ROW_H = 30;                     // hauteur d'une rangée
const CHR_ROW_GAP = 4;
let chrModel = null;
let chrLoading = false;
let chrZoom = 1;                          // l'indice dans CHR_SCALES
let chrMode = 'am';                       // 'am' (années hébraïques) | 'civil'
let chrSelected = '';
let chrMarker = null;                       // { from, to, label } : une période posée sur la frise depuis une autre fiche
const chrCollapsed = new Set();             // les voies repliées (on touche le titre d'une voie pour la replier)

function chrNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function chrScale() { return CHR_SCALES[chrZoom]; }
function chrView() { return toolEl('tool-chr-view'); }

function toolChronologieInit() {
    chrSelected = '';
    chrMarker = null;
    const input = toolEl('tool-chr-search');
    if (input && !input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', chrOnSearch);
    }
    if (input) input.value = '';
    chrOnSearch();
    if (chrModel) { chrRender(); return; }
    if (chrLoading) return;
    chrLoading = true;
    fetch('data/chronologie.json')
        .then(r => r.json())
        .then(data => { chrModel = ChronologieCore.build(data); })
        .catch(() => { toolEl('tool-chr-count').textContent = t('tools.chronologie_error'); })
        .then(() => { chrLoading = false; if (chrModel) chrRender(); });
}

// Ouvre la chronologie depuis une autre fiche. `target` : { item } (un élément de la frise, qu'on sélectionne) ou { from, to, label } (une période, qu'on
// marque et qu'on montre). Résultat de ChronologieCore.forGen / forSage / forYears.
function openChronologie(from, target) {
    openTool('chronologie', from);
    if (!target) return;
    const go = () => {
        if (!chrModel) { setTimeout(go, 60); return; }
        if (target.item) chrSelect(target.item.id, true);
        else { chrMarker = { from: target.from, to: target.to, label: target.label || '' }; chrRender(true); chrScrollToYear(target.from); }
    };
    go();
}

// Le bouton « Situer dans la chronologie » des autres fiches : une cible, ou rien (pas de bouton). Chaque outil appelle la fonction qui lui convient.
function chrButton(target, from) {
    if (!target) return null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = t('tools.chronologie_locate');
    b.onclick = () => openChronologie(from, target);
    return b;
}
// Ajoute à `container`, une fois la frise chargée, le bouton qui situe un élément précis de la frise (Temple, Michkan…).
function chrAddItemButton(container, itemId, from) {
    if (typeof chrLoadModel !== 'function') return;
    chrLoadModel().then(model => {
        const item = model.byId[itemId];
        const b = item && chrButton({ item: item }, from);
        if (b && container.isConnected) container.appendChild(b);
    }).catch(() => {});
}
// Ajoute à `container` le bouton d'une cible calculée sur le modèle (`pick(model)` renvoie la cible ou null) une fois la frise chargée.
function chrAddTargetButton(container, pick, from, stillWanted) {
    if (typeof chrLoadModel !== 'function') return;
    chrLoadModel().then(model => {
        if (!container.isConnected || (stillWanted && !stillWanted())) return;
        const b = chrButton(pick(model), from);
        if (b) container.appendChild(b);
    }).catch(() => {});
}
// Ajoute à `container` le bouton qui marque une année de la création (AM) sur la frise, si elle est dans la plage de la frise.
function chrAddYearButton(container, year, from) {
    chrLoadModel().then(model => {
        if (!(year >= model.plage[0] && year <= model.plage[1]) || !container.isConnected) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = t('tools.chronologie_locate_year', { year: year });
        b.onclick = () => openChronologie(from, { from: year, to: year, label: t('tools.chronologie_year_label', { year: year }) });
        container.appendChild(b);
    }).catch(() => {});
}
// Les cibles, calculées sur le modèle (chargé à la demande : on charge le fichier une fois, puis on répond sans attendre).
function chrLoadModel() {
    if (chrModel) return Promise.resolve(chrModel);
    return fetch('data/chronologie.json').then(r => r.json()).then(data => { chrModel = ChronologieCore.build(data); return chrModel; });
}

// --- Commandes -------------------------------------------------------------------------------------------------------------------------
function chrSetMode(mode) {
    chrMode = mode === 'civil' ? 'civil' : 'am';
    chrRender(true);
}

function chrSetZoom(delta) {
    const next = Math.max(0, Math.min(CHR_SCALES.length - 1, chrZoom + delta));
    if (next === chrZoom || !chrModel) return;
    const view = chrView();
    // On garde au centre de l'écran l'année qui y était.
    const centerYear = chrModel.plage[0] + (view.scrollLeft + view.clientWidth / 2) / chrScale();
    chrZoom = next;
    chrRender(true);
    view.scrollLeft = (centerYear - chrModel.plage[0]) * chrScale() - view.clientWidth / 2;
}

function chrScrollToYear(am) {
    const view = chrView();
    view.scrollTo({ left: Math.max(0, (am - chrModel.plage[0]) * chrScale() - view.clientWidth / 3), top: 0, behavior: 'smooth' });
}

function chrClearMarker() {
    chrMarker = null;
    chrRender(true);
}

function chrJump(item) {
    const view = chrView();
    view.scrollTo({ left: Math.max(0, (item.from - chrModel.plage[0]) * chrScale() - 16), behavior: 'smooth' });
}

// --- Rendu -------------------------------------------------------------------------------------------------------------------------------
function chrRenderControls() {
    const modes = toolEl('tool-chr-modes');
    toolClear(modes);
    [['am', 'tools.chronologie_mode_am'], ['civil', 'tools.chronologie_mode_civil']].forEach(([id, key]) => {
        const b = chrNode('button', 'tool-history-chip', t(key));
        b.type = 'button';
        b.setAttribute('aria-pressed', chrMode === id ? 'true' : 'false');
        b.onclick = () => chrSetMode(id);
        modes.appendChild(b);
    });
    const zoom = toolEl('tool-chr-zoom');
    toolClear(zoom);
    [[-1, '−', 'tools.chronologie_zoom_out'], [1, '+', 'tools.chronologie_zoom_in']].forEach(([d, label, key]) => {
        const b = chrNode('button', 'tool-history-chip is-date', label);
        b.type = 'button';
        b.setAttribute('aria-label', t(key));
        b.disabled = chrZoom + d < 0 || chrZoom + d >= CHR_SCALES.length;
        b.onclick = () => chrSetZoom(d);
        zoom.appendChild(b);
    });
    const jumps = toolEl('tool-chr-jumps');
    toolClear(jumps);
    if (chrMarker) {
        const m = chrNode('button', 'tool-history-chip is-marker', '📍 ' + t('tools.chronologie_marker', { name: chrMarker.label }) + ' ×');
        m.type = 'button';
        m.setAttribute('aria-label', t('tools.chronologie_marker_clear'));
        m.onclick = chrClearMarker;
        jumps.appendChild(m);
    }
    chrModel.sauts.forEach(item => {
        const b = chrNode('button', 'tool-history-chip', item.fr);
        b.type = 'button';
        b.onclick = () => chrJump(item);
        jumps.appendChild(b);
    });
}

// La règle : une graduation tous les 10 ans (tous les 20 au plus petit zoom), avec les deux calendriers l'un sous l'autre.
function chrRuler(width) {
    const [from, to] = chrModel.plage;
    const ruler = chrNode('div', 'chr-ruler');
    ruler.style.width = width + 'px';
    const step = chrScale() < 3 ? 50 : chrScale() < 6 ? 20 : 10;
    const ticks = ChronologieCore.ticks(chrModel.plage, step, chrMode);
    ruler.dataset.first = ticks.length ? String((ticks[0] - from) * chrScale()) : '0';
    ticks.forEach(y => {
        const tick = chrNode('div', 'chr-tick');
        tick.style.left = ((y - from) * chrScale()) + 'px';
        const main = chrMode === 'civil' ? ChronologieCore.civilYear(y) : y;
        const other = chrMode === 'civil' ? y : ChronologieCore.civilYear(y);
        tick.appendChild(chrNode('b', '', String(main)));
        tick.appendChild(chrNode('span', '', String(other)));
        ruler.appendChild(tick);
    });
    return ruler;
}

function chrItemNode(p) {
    const item = p.item;
    const el = chrNode('button', 'chr-item' + (p.point ? ' is-point' : '') + (item.kind ? ' is-' + item.kind : '') + (item.approx ? ' is-approx' : '')
        + (p.cutLeft ? ' is-cut-left' : '') + (p.cutRight ? ' is-cut-right' : '') + (item.id === chrSelected ? ' is-selected' : ''));
    el.type = 'button';
    el.dataset.id = item.id;
    el.style.left = p.x + 'px';
    el.style.width = p.w + 'px';
    el.style.top = (p.row * (CHR_ROW_H + CHR_ROW_GAP)) + 'px';
    el.setAttribute('aria-label', item.fr + ', ' + ChronologieCore.dating(item, chrMode));
    const label = chrNode('span', 'chr-label' + (p.inside ? '' : ' is-out'), item.fr);
    el.appendChild(label);
    el.onclick = () => chrSelect(item.id);
    return el;
}

function chrRender(keepScroll) {
    const view = chrView();
    if (!view || !chrModel) return;
    chrRenderControls();
    const left = view.scrollLeft, top = view.scrollTop;
    toolClear(view);
    const [from, to] = chrModel.plage;
    const width = (to - from) * chrScale() + CHR_TAIL;
    const stage = chrNode('div', 'chr-stage');
    stage.style.width = width + 'px';
    const ruler = chrRuler(width);
    // Le quadrillage suit les graduations (de 10, 20 ou 50 ans selon le zoom), dans le calendrier choisi.
    stage.style.setProperty('--chr-decade', (chrScale() * (chrScale() < 3 ? 50 : chrScale() < 6 ? 20 : 10)) + 'px');
    stage.style.backgroundPosition = ruler.dataset.first + 'px 0';
    stage.appendChild(ruler);
    if (chrMarker) {
        const band = chrNode('div', 'chr-marker');
        band.style.left = ((Math.max(chrMarker.from, from) - from) * chrScale()) + 'px';
        band.style.width = Math.max(4, (Math.min(chrMarker.to, to) - Math.max(chrMarker.from, from)) * chrScale()) + 'px';
        stage.appendChild(band);
    }
    const opts = { scale: chrScale(), charW: 7.2, pad: 16, minW: 14, gap: 6, point: 12 };
    let shown = 0;
    chrModel.voies.forEach(voie => {
        const lay = ChronologieCore.layout(voie.items, chrModel.plage, opts);
        const lane = chrNode('section', 'chr-lane chr-lane-' + voie.id);
        lane.dataset.voie = voie.id;
        const folded = chrCollapsed.has(voie.id);
        const head = chrNode('h3', 'chr-lane-head');
        const title = chrNode('button', 'chr-lane-title', (folded ? '▸ ' : '▾ ') + voie.fr);
        title.type = 'button';
        title.setAttribute('aria-expanded', folded ? 'false' : 'true');
        title.onclick = () => { if (chrCollapsed.has(voie.id)) chrCollapsed.delete(voie.id); else chrCollapsed.add(voie.id); chrRender(true); };
        head.appendChild(title);
        lane.appendChild(head);
        const body = chrNode('div', 'chr-lane-body' + (folded ? ' is-folded' : ''));
        body.style.height = folded ? '0px' : (lay.rows * (CHR_ROW_H + CHR_ROW_GAP)) + 'px';
        body.dataset.h = String(lay.rows * (CHR_ROW_H + CHR_ROW_GAP));
        if (!folded) lay.placed.forEach(p => { body.appendChild(chrItemNode(p)); shown++; });
        lane.appendChild(body);
        stage.appendChild(lane);
    });
    view.appendChild(stage);
    toolEl('tool-chr-count').textContent = t('tools.chronologie_about', { n: shown });
    toolEl('tool-chr-source').textContent = chrModel.sources;
    if (keepScroll) { view.scrollLeft = left; view.scrollTop = top; }
    chrRenderInfo();
    if (!view.dataset.bound) {
        view.dataset.bound = '1';
        let timer = 0;
        view.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(chrUpdateIdle, 160); }, { passive: true });
    }
    chrUpdateIdle();
}

// Une voie sans rien dans la zone visible se replie d'elle-même (son titre reste) : on ne garde à l'écran que ce qui se passe à l'époque regardée.
function chrUpdateIdle() {
    const view = chrView();
    if (!view || !chrModel) return;
    const from = chrModel.plage[0] + view.scrollLeft / chrScale();
    const to = from + view.clientWidth / chrScale();
    view.querySelectorAll('.chr-lane').forEach(lane => {
        const voie = chrModel.voies.find(v => v.id === lane.dataset.voie);
        const body = lane.querySelector('.chr-lane-body');
        if (!voie || !body || chrCollapsed.has(voie.id)) return;
        const busy = voie.items.some(x => x.from <= to && (x.to === undefined ? x.from : x.to) >= from);
        body.style.height = busy ? body.dataset.h + 'px' : '0px';
        body.classList.toggle('is-idle', !busy);
        lane.classList.toggle('is-idle', !busy);
    });
}

// --- Sélection et fiche ----------------------------------------------------------------------------------------------------------------
function chrSelect(id, scroll) {
    chrSelected = id;
    chrMarker = null;
    chrRender(true);
    if (scroll) chrScrollTo(id);
}

function chrClear() {
    chrSelected = '';
    chrRender(true);
}

function chrScrollTo(id) {
    const view = chrView();
    const el = view.querySelector('[data-id="' + id + '"]');
    if (!el) return;
    const ruler = view.querySelector('.chr-ruler');
    view.scrollTo({
        left: Math.max(0, el.offsetLeft - view.clientWidth / 3),
        top: Math.max(0, el.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop - (ruler ? ruler.offsetHeight : 0) - 40),
        behavior: 'smooth'
    });
}

function chrRenderInfo() {
    const box = toolEl('tool-chr-info');
    toolClear(box);
    box.classList.toggle('hidden', !chrSelected);
    chrView().classList.toggle('has-info', !!chrSelected);
    if (!chrSelected) return;
    const item = chrModel.byId[chrSelected];
    const card = chrNode('article', 'tool-result lex-card');
    const close = chrNode('button', 'tr-info-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', t('tools.chronologie_info_close'));
    close.onclick = chrClear;
    card.appendChild(close);
    const head = chrNode('div', 'lex-head');
    if (item.he) {
        const he = chrNode('strong', 'lex-he', item.he);
        he.setAttribute('lang', 'he');
        he.setAttribute('dir', 'rtl');
        head.appendChild(he);
    }
    head.appendChild(chrNode('span', 'tool-small lex-pos', item.fr));
    card.appendChild(head);
    const voie = chrModel.voies.find(v => v.id === item.voie);
    const dur = ChronologieCore.durationLabel(item);
    const facts = [voie ? voie.fr : '', ChronologieCore.dating(item, 'am'), ChronologieCore.dating(item, 'civil'), dur];
    card.appendChild(chrNode('p', 'lex-bio', facts.filter(Boolean).join(' · ')));
    if (item.note) card.appendChild(chrNode('p', 'tool-small', item.note));
    if (item.approx) card.appendChild(chrNode('p', 'tool-small', t('tools.chronologie_approx')));
    const near = ChronologieCore.contemporains(chrModel, item, 8);
    if (near.length) {
        const row = chrNode('div', 'lex-rel');
        row.appendChild(chrNode('span', 'tool-small', t('tools.chronologie_same_time')));
        near.forEach(x => {
            const b = chrNode('button', 'tool-history-chip', x.fr);
            b.type = 'button';
            b.onclick = () => chrSelect(x.id, true);
            row.appendChild(b);
        });
        card.appendChild(row);
    }
    const actions = chrNode('div', 'gen-actions');
    if (item.gen && typeof GenealogyCore !== 'undefined' && GenealogyCore.byId(item.gen)) {
        const b = chrNode('button', 'btn', t('tools.chronologie_open_gen'));
        b.type = 'button';
        b.onclick = () => { openTool('genealogy', 'screen-tool-chronologie'); genGoTo(item.gen); };
        actions.appendChild(b);
    }
    if (item.outil === 'mishkan') {
        const b = chrNode('button', 'btn', t('tools.chronologie_open_mishkan'));
        b.type = 'button';
        b.onclick = () => openTool('mishkan', 'screen-tool-chronologie');
        actions.appendChild(b);
    }
    if (actions.firstChild) card.appendChild(actions);
    box.appendChild(card);
}

// --- Recherche ---------------------------------------------------------------------------------------------------------------------------
function chrOnSearch() {
    const box = toolEl('tool-chr-results');
    toolClear(box);
    const q = toolEl('tool-chr-search') ? toolEl('tool-chr-search').value : '';
    if (!chrModel || !q.trim()) { box.classList.add('hidden'); return; }
    const found = ChronologieCore.search(chrModel, q).slice(0, 12);
    box.classList.toggle('hidden', !found.length && !q.trim());
    if (!found.length) { box.appendChild(chrNode('span', 'tool-small', t('tools.chronologie_none'))); return; }
    found.forEach(x => {
        const b = chrNode('button', 'tool-history-chip', x.fr);
        b.type = 'button';
        b.onclick = () => { toolEl('tool-chr-search').value = ''; chrOnSearch(); chrSelect(x.id, true); };
        box.appendChild(b);
    });
}
