// =========================================================================
// === LE MICHKAN ET LE MIKDASH (écran de l'Atelier) ===
// =========================================================================
// Cinq onglets : le plan (la cour, puis le Tabernacle de l'intérieur), les ustensiles, la structure (planches, tentures), les vêtements des
// prêtres, et les Temples. Les données et les mesures sont dans js/mishkanCore.js (pur, testé). Les schémas sont dessinés ici, en SVG, en
// coudées : aucune image de livre. Tout ce qui vient des données passe par textContent, jamais par du HTML.

let mknTab = 'plan';
let mknView = 'court';
let mknOpinion = 'nae';
let mknSelected = null;
let mknTsitsView = 'two';   // la disposition de l'inscription du tsits : 'two' (deux lignes) ou 'one' (une ligne)
let mknHoliness = null;    // le lieu choisi dans l'échelle des degrés de sainteté (onglet Mikdash)
let mknWho = 'high';       // le groupe de vêtements affiché : 'all' (prêtre), 'high' (grand prêtre), 'kippur' (lin blanc)
const MKN_TABS = [
    { id: 'plan', icon: '🗺️' }, { id: 'utensils', icon: '🕯️' }, { id: 'structure', icon: '🏕️' },
    { id: 'cohen', icon: '👘' }, { id: 'mikdash', icon: '🏛️' }
];
// Les numéros des éléments sur le plan, par vue.
const MKN_NUMBERS = {
    court: ['court', 'entrance', 'tabernacle', 'altar', 'laver', 'ramp'],
    tabernacle: ['holyOfHolies', 'holy', 'ark', 'table', 'menorah', 'goldAltar', 'parokhet', 'massakh']
};
const MKN_SVG_NS = 'http://www.w3.org/2000/svg';

function mknEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function mknPara(parent, text, className) {
    const p = mknEl('p', className || 'tool-small', text);
    parent.appendChild(p);
    return p;
}

function mknHe(parent, text, className) {
    const p = mknEl('p', className || 'hcal-he', text);
    p.lang = 'he';
    p.dir = 'rtl';
    parent.appendChild(p);
    return p;
}

// Un élément SVG avec ses attributs, ajouté à `parent` si donné.
function mknSvg(tag, attrs, parent, text) {
    const el = document.createElementNS(MKN_SVG_NS, tag);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    if (text !== undefined) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
}

function mknRoot(viewBox, label) {
    const svg = mknSvg('svg', { viewBox: viewBox, class: 'mkn-svg', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid meet' });
    return svg;
}

function mknNum(n) { return n.toLocaleString((typeof i18n !== 'undefined' && i18n.currentLang) || 'fr', { maximumFractionDigits: 2 }); }

// --- Écran --------------------------------------------------------------------------------------------------------------
function toolMishkanInit() {
    const tabs = toolEl('tool-mkn-tabs');
    toolClear(tabs);
    MKN_TABS.forEach(tab => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-mkn-tab-' + tab.id;
        btn.setAttribute('aria-pressed', tab.id === mknTab ? 'true' : 'false');
        btn.textContent = tab.icon + ' ' + t('tools.mkn_tab_' + tab.id);
        btn.onclick = () => { mknTab = tab.id; mknSelected = null; toolMishkanInit(); };
        tabs.appendChild(btn);
    });
    mknRender();
}

function mknRender() {
    const body = toolEl('tool-mkn-body');
    toolClear(body);
    ({ plan: mknPlanTab, utensils: mknUtensilsTab, structure: mknStructureTab, cohen: mknCohenTab, mikdash: mknMikdashTab }[mknTab])(body);
}

// =========================================================================
// La fiche d'un élément (commune aux onglets)
// =========================================================================
// `entry` : { he, fr, ref, dims, text, facts, highHe, material } ; `sizeId` : l'identifiant de MishkanCore.SIZES pour l'affichage en mètres.
function mknFillSheet(box, entry, sizeId) {
    toolClear(box);
    if (!entry) { mknPara(box, t('tools.mkn_sheet_hint')); return; }
    const head = mknEl('div', 'mkn-sheet-head');
    head.appendChild(mknEl('strong', 'mkn-sheet-name', entry.fr));
    const he = mknEl('span', 'mkn-sheet-he', entry.he);
    he.lang = 'he';
    he.dir = 'rtl';
    head.appendChild(he);
    box.appendChild(head);
    if (entry.dims) mknPara(box, entry.dims + mknMetresText(sizeId), 'tool-small mkn-dims');
    if (entry.material) mknPara(box, t('tools.mkn_material', { material: entry.material }), 'tool-small mkn-dims');
    mknPara(box, entry.text);
    if (entry.facts && entry.facts.length) {
        const ul = mknEl('ul', 'hcal-list');
        entry.facts.forEach(f => ul.appendChild(mknEl('li', '', f)));
        box.appendChild(ul);
    }
    mknPara(box, t('tools.mkn_source', { src: entry.ref }), 'tool-small hcal-source');
}

// « (≈ 48 × 24 m) » : la mesure du texte en mètres, selon l'avis choisi sur la longueur de la coudée.
function mknMetresText(sizeId) {
    const sizes = sizeId && MishkanCore.SIZES[sizeId];
    if (!sizes) return '';
    const parts = sizes.map(c => mknNum(MishkanCore.metres(c, mknOpinion)));
    return ' (≈ ' + parts.join(' × ') + ' m)';
}

function mknOpinionControl(parent, onChange) {
    const field = mknEl('div', 'tool-field');
    const label = mknEl('label', '', t('tools.mkn_opinion_label'));
    label.setAttribute('for', 'tool-mkn-opinion');
    const select = document.createElement('select');
    select.id = 'tool-mkn-opinion';
    select.className = 'tool-input';
    MishkanCore.CUBIT_OPINIONS.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = t('tools.mkn_opinion_' + op, { cm: mknNum(MishkanCore.cubitMetres(op) * 100) });
        select.appendChild(opt);
    });
    select.value = mknOpinion;
    select.onchange = () => { mknOpinion = select.value; onChange(); };
    field.appendChild(label);
    field.appendChild(select);
    parent.appendChild(field);
}

// =========================================================================
// Onglet « Plan »
// =========================================================================
function mknPlanTab(body) {
    const panel = mknEl('section', 'tool-panel');
    const views = mknEl('div', 'tool-history-chips');
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', t('tools.mkn_view_aria'));
    ['court', 'tabernacle', 'camp'].forEach(v => {
        const btn = mknEl('button', 'tool-history-chip', t('tools.mkn_view_' + v));
        btn.type = 'button';
        btn.id = 'tool-mkn-view-' + v;
        btn.setAttribute('aria-pressed', mknView === v ? 'true' : 'false');
        btn.onclick = () => { mknView = v; mknSelected = null; mknRender(); };
        views.appendChild(btn);
    });
    panel.appendChild(views);
    mknPara(panel, t('tools.mkn_plan_note_' + mknView));
    panel.appendChild(mknPlanSvg(mknView));
    // La légende : des boutons (accessibles au clavier et assez grands au doigt) qui doublent les éléments du dessin.
    const legend = mknEl('div', 'mkn-legend');
    const legendIds = mknView === 'camp' ? MKN_CAMP_ORDER : MKN_NUMBERS[mknView];
    legendIds.forEach((id, i) => {
        const label = mknView === 'camp' ? mknCampName(id) : MishkanCore.ITEMS[id].fr;
        const btn = mknEl('button', 'mkn-legend-btn', (mknView === 'camp' ? '' : (i + 1) + ' · ') + label);
        btn.type = 'button';
        btn.dataset.id = id;
        btn.setAttribute('aria-pressed', mknSelected === id ? 'true' : 'false');
        btn.onclick = () => mknSelect(id);
        legend.appendChild(btn);
    });
    panel.appendChild(legend);
    if (mknView === 'camp') mknPara(panel, t('tools.mkn_camp_levites_note'));
    else mknOpinionControl(panel, () => { mknRender(); });
    body.appendChild(panel);

    const sheet = mknEl('section', 'tool-panel mkn-sheet');
    sheet.id = 'tool-mkn-sheet';
    body.appendChild(sheet);
    mknFillPlanSheet(sheet, mknSelected);
}

// La fiche de l'élément choisi sur le plan (la cour, le Tabernacle ou le camp).
function mknFillPlanSheet(box, id) {
    if (!id) { mknFillSheet(box, null); return; }
    if (mknView === 'camp') mknFillCampSheet(box, id);
    else mknFillSheet(box, MishkanCore.ITEMS[id], id);
}

function mknSelect(id) {
    mknSelected = id;
    document.querySelectorAll('#tool-mkn-body .mkn-item').forEach(g => g.classList.toggle('is-selected', g.dataset.id === id));
    document.querySelectorAll('#tool-mkn-body .mkn-legend-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false'));
    const sheet = toolEl('tool-mkn-sheet');
    if (sheet) mknFillPlanSheet(sheet, id);
}

// Rend un élément du dessin sélectionnable (souris, doigt, clavier). `label` : le nom lu par les lecteurs d'écran (par défaut celui de la fiche).
function mknMakeItem(g, id, label) {
    g.setAttribute('class', 'mkn-item' + (mknSelected === id ? ' is-selected' : ''));
    g.dataset.id = id;
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', label || MishkanCore.ITEMS[id].fr);
    g.addEventListener('click', () => mknSelect(id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mknSelect(id); } });
    return g;
}

// Un trait de cote : une ligne avec deux butées et son texte. `vertical` : le texte est tourné.
function mknDim(svg, x1, y1, x2, y2, label, size) {
    const fs = size || 2.4;
    mknSvg('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'mkn-dim' }, svg);
    const vertical = x1 === x2;
    const tick = 0.6;
    if (vertical) { mknSvg('line', { x1: x1 - tick, y1: y1, x2: x1 + tick, y2: y1, class: 'mkn-dim' }, svg); mknSvg('line', { x1: x1 - tick, y1: y2, x2: x1 + tick, y2: y2, class: 'mkn-dim' }, svg); }
    else { mknSvg('line', { x1: x1, y1: y1 - tick, x2: x1, y2: y1 + tick, class: 'mkn-dim' }, svg); mknSvg('line', { x1: x2, y1: y2 - tick, x2: x2, y2: y2 + tick, class: 'mkn-dim' }, svg); }
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const text = mknSvg('text', { x: vertical ? cx - fs * 0.45 : cx, y: vertical ? cy : cy - fs * 0.4, class: 'mkn-dim-text', 'font-size': fs, 'text-anchor': 'middle' }, svg, label);
    if (vertical) text.setAttribute('transform', 'rotate(-90 ' + (cx - fs * 0.45) + ' ' + cy + ')');
}

function mknBadge(parent, n, cx, cy, r) {
    mknSvg('circle', { cx: cx, cy: cy, r: r, class: 'mkn-badge' }, parent);
    mknSvg('text', { x: cx, y: cy + r * 0.38, 'font-size': r * 1.15, class: 'mkn-badge-text', 'text-anchor': 'middle' }, parent, String(n));
}

function mknPlanSvg(view) {
    const M = MishkanCore;
    if (view === 'camp') return mknCampSvg();
    const num = id => MKN_NUMBERS[view].indexOf(id) + 1;
    if (view === 'court') {
        const svg = mknRoot('-9 -10 124 77', t('tools.mkn_view_court'));
        // La cour : un rectangle de toiles et ses piliers, tous espacés de 5 coudées (20 + 20 + 10 + 3 + 4 + 3 d'après Exode 27).
        const court = mknMakeItem(mknSvg('g', {}, svg), 'court');
        mknSvg('rect', { x: 0, y: 0, width: 100, height: 50, class: 'mkn-court' }, court);
        for (let i = 0; i < 20; i++) { mknSvg('circle', { cx: 2.5 + 5 * i, cy: 0, r: 0.6, class: 'mkn-pillar' }, court); mknSvg('circle', { cx: 2.5 + 5 * i, cy: 50, r: 0.6, class: 'mkn-pillar' }, court); }
        for (let i = 0; i < 10; i++) { mknSvg('circle', { cx: 0, cy: 2.5 + 5 * i, r: 0.6, class: 'mkn-pillar' }, court); }
        [2.5, 7.5, 12.5, 37.5, 42.5, 47.5, 17.5, 22.5, 27.5, 32.5].forEach(y => mknSvg('circle', { cx: 100, cy: y, r: 0.6, class: 'mkn-pillar' }, court));
        // La porte : un rideau de 20 coudées à l'est, entre deux ailes de 15.
        const gate = mknMakeItem(mknSvg('g', {}, svg), 'entrance');
        mknSvg('line', { x1: 100, y1: 15, x2: 100, y2: 35, class: 'mkn-gate' }, gate);
        mknSvg('line', { x1: 100, y1: 15, x2: 100, y2: 35, class: 'mkn-hit' }, gate);
        // Les rectangles du plan.
        const rect = (id) => M.planItem(id);
        const tab = rect('tabernacle');
        const g1 = mknMakeItem(mknSvg('g', {}, svg), 'tabernacle');
        mknSvg('rect', { x: tab.x, y: tab.y, width: tab.w, height: tab.h, class: 'mkn-room' }, g1);
        const altar = rect('altar');
        const ramp = rect('ramp');
        const gr = mknMakeItem(mknSvg('g', {}, svg), 'ramp');
        mknSvg('polygon', { points: [ramp.x, altar.y + altar.h, ramp.x + ramp.w, altar.y + altar.h, ramp.x + ramp.w * 0.7, ramp.y + ramp.h, ramp.x + ramp.w * 0.3, ramp.y + ramp.h].join(' '), class: 'mkn-ramp' }, gr);
        const ga = mknMakeItem(mknSvg('g', {}, svg), 'altar');
        mknSvg('rect', { x: altar.x, y: altar.y, width: altar.w, height: altar.h, class: 'mkn-copper' }, ga);
        [[altar.x, altar.y], [altar.x + altar.w, altar.y], [altar.x, altar.y + altar.h], [altar.x + altar.w, altar.y + altar.h]].forEach(p => mknSvg('rect', { x: p[0] - 0.5, y: p[1] - 0.5, width: 1, height: 1, class: 'mkn-horn' }, ga));
        const laver = rect('laver');
        const gl = mknMakeItem(mknSvg('g', {}, svg), 'laver');
        mknSvg('circle', { cx: laver.x + laver.w / 2, cy: laver.y + laver.h / 2, r: laver.w / 2, class: 'mkn-copper' }, gl);
        // Les numéros.
        mknBadge(svg, num('court'), 7, 7, 3.2);
        mknBadge(svg, num('entrance'), 94.5, 25, 3.2);
        mknBadge(svg, num('tabernacle'), tab.x + tab.w / 2, tab.y + tab.h / 2, 3.2);
        mknBadge(svg, num('altar'), altar.x + altar.w / 2, altar.y + altar.h / 2 - 0.5, 3);
        mknBadge(svg, num('laver'), laver.x + laver.w / 2, laver.y + laver.h + 3.6, 3);
        mknBadge(svg, num('ramp'), ramp.x + ramp.w / 2, ramp.y + ramp.h * 0.6, 3);
        // Cotes et orientation.
        mknDim(svg, 0, 55, 100, 55, t('tools.mkn_dim_cubits', { n: 100 }), 3.6);
        mknDim(svg, -5, 0, -5, 50, t('tools.mkn_dim_cubits', { n: 50 }), 3.6);
        mknDim(svg, 105, 15, 105, 35, '20', 3.6);
        mknDim(svg, 105, 0, 105, 15, '15', 3.2);
        mknDim(svg, 105, 35, 105, 50, '15', 3.2);
        mknDim(svg, 20, 17.5, 50, 17.5, '30', 3.2);
        mknSvg('text', { x: 0, y: -3, class: 'mkn-compass', 'font-size': 3.4, 'text-anchor': 'start' }, svg, t('tools.mkn_west'));
        mknSvg('text', { x: 50, y: -3, class: 'mkn-compass', 'font-size': 3.4, 'text-anchor': 'middle' }, svg, t('tools.mkn_north'));
        mknSvg('text', { x: 100, y: -3, class: 'mkn-compass', 'font-size': 3.4, 'text-anchor': 'end' }, svg, t('tools.mkn_east'));
        return svg;
    }
    // Le Tabernacle de l'intérieur : 30 × 10 coudées, du Saint des saints à l'ouest jusqu'au rideau d'entrée à l'est.
    const svg = mknRoot('11 10.5 48 26.5', t('tools.mkn_view_tabernacle'));
    const walls = mknSvg('rect', { x: 20, y: 20, width: 30, height: 10, class: 'mkn-walls' }, svg);
    const hh = M.planItem('holyOfHolies'), holy = M.planItem('holy');
    const g1 = mknMakeItem(mknSvg('g', {}, svg), 'holyOfHolies');
    mknSvg('rect', { x: hh.x, y: hh.y, width: hh.w, height: hh.h, class: 'mkn-room is-holy' }, g1);
    const g2 = mknMakeItem(mknSvg('g', {}, svg), 'holy');
    mknSvg('rect', { x: holy.x, y: holy.y, width: holy.w, height: holy.h, class: 'mkn-room' }, g2);
    mknSvg('text', { x: hh.x + hh.w / 2, y: hh.y + hh.h + 1.7, class: 'mkn-room-name', 'font-size': 1.3, 'text-anchor': 'middle' }, svg, t('tools.mkn_room_hh'));
    mknSvg('text', { x: holy.x + holy.w / 2, y: holy.y + holy.h + 1.7, class: 'mkn-room-name', 'font-size': 1.3, 'text-anchor': 'middle' }, svg, t('tools.mkn_room_holy'));
    // Les rideaux et leurs piliers.
    M.CURTAINS.forEach(c => {
        const g = mknMakeItem(mknSvg('g', {}, svg), c.id);
        mknSvg('line', { x1: c.x, y1: 20, x2: c.x, y2: 30, class: 'mkn-curtain is-' + c.id }, g);
        mknSvg('line', { x1: c.x, y1: 20, x2: c.x, y2: 30, class: 'mkn-hit' }, g);
        for (let i = 0; i < c.pillars; i++) mknSvg('circle', { cx: c.x, cy: 20 + (10 / c.pillars) * (i + 0.5), r: 0.42, class: c.id === 'parokhet' ? 'mkn-pillar is-gold' : 'mkn-pillar is-gold' }, g);
    });
    const draw = (id, cls, extra) => {
        const r = M.planItem(id);
        const g = mknMakeItem(mknSvg('g', {}, svg), id);
        mknSvg('rect', { x: r.x, y: r.y, width: r.w, height: r.h, class: cls }, g);
        if (extra) extra(g, r);
    };
    draw('ark', 'mkn-gold');
    draw('table', 'mkn-wood');
    draw('menorah', 'mkn-gold', (g, r) => mknSvg('circle', { cx: r.x + r.w / 2, cy: r.y + r.h / 2, r: r.w / 2, class: 'mkn-gold' }, g));
    draw('goldAltar', 'mkn-gold');
    // Les numéros, à côté de chaque élément.
    const at = { holyOfHolies: [26, 28.3], holy: [43, 25], ark: [25, 22.9], table: [41.3, 21.5], menorah: [41, 28.6], goldAltar: [33.5, 27.2], parokhet: [30, 18.9], massakh: [50, 18.9] };
    Object.keys(at).forEach(id => mknBadge(svg, num(id), at[id][0], at[id][1], 1.15));
    mknDim(svg, 20, 34.2, 50, 34.2, t('tools.mkn_dim_cubits', { n: 30 }), 1.7);
    mknDim(svg, 20, 16.5, 30, 16.5, '10', 1.5);
    mknDim(svg, 30, 16.5, 50, 16.5, '20', 1.5);
    mknDim(svg, 17.8, 20, 17.8, 30, '10', 1.5);
    mknSvg('text', { x: 11.8, y: 12.6, class: 'mkn-compass', 'font-size': 1.5, 'text-anchor': 'start' }, svg, t('tools.mkn_west'));
    mknSvg('text', { x: 35, y: 12.6, class: 'mkn-compass', 'font-size': 1.5, 'text-anchor': 'middle' }, svg, t('tools.mkn_north'));
    mknSvg('text', { x: 58.2, y: 12.6, class: 'mkn-compass', 'font-size': 1.5, 'text-anchor': 'end' }, svg, t('tools.mkn_east'));
    return svg;
}

// =========================================================================
// Le camp d'Israël (Nombres 1 à 4) : le Tabernacle au centre, les Lévites autour, puis les douze tribus, trois par côté
// =========================================================================
const MKN_CAMP_ORDER = ['juda', 'issakhar', 'zabulon', 'ruben', 'simeon', 'gad', 'ephraim', 'manasse', 'benjamin', 'dan', 'acher', 'naphtali',
    'merari', 'guerchon', 'kehat', 'moise'];

function mknCampName(id) {
    const M = MishkanCore;
    const tribe = M.tribe(id);
    if (tribe) return tribe.fr;
    const lev = M.LEVITES.find(l => l.id === id);
    return lev ? lev.fr : id;
}

function mknCampSvg() {
    const M = MishkanCore;
    const svg = mknRoot('0 0 170 170', t('tools.mkn_view_camp'));
    // Les bras du camp : trois tuiles de 20 de large, sur 40 de profondeur, contre les quatre côtés du carré des Lévites (de 55 à 115).
    const tileBox = (side, pos) => ({
        north: { x: 55 + 20 * pos, y: 15, w: 20, h: 40 }, south: { x: 55 + 20 * pos, y: 115, w: 20, h: 40 },
        west: { x: 15, y: 55 + 20 * pos, w: 40, h: 20 }, east: { x: 115, y: 55 + 20 * pos, w: 40, h: 20 }
    })[side];
    M.TRIBES.forEach(tr => {
        const b = tileBox(tr.side, tr.pos);
        const head = M.CAMP_SIDES[tr.side].head === tr.id;
        const g = mknMakeItem(mknSvg('g', {}, svg), tr.id, tr.fr);
        mknSvg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: tr.color, class: 'mkn-tribe' + (head ? ' is-head' : '') }, g);
        // Le nom, couché dans les tuiles hautes (nord et sud) pour qu'il tienne.
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        const text = mknSvg('text', { x: cx, y: cy + 1.5, 'font-size': tr.fr.length > 7 ? 4.4 : 5, 'text-anchor': 'middle', fill: M.readableOn(tr.color), class: 'mkn-tribe-name' }, g, tr.fr);
        if (tr.side === 'north' || tr.side === 'south') text.setAttribute('transform', 'rotate(-90 ' + cx + ' ' + cy + ')');
        if (head) mknSvg('polygon', { points: (b.x + 1.5) + ',' + (b.y + 1.5) + ' ' + (b.x + 8) + ',' + (b.y + 4.2) + ' ' + (b.x + 1.5) + ',' + (b.y + 7) , class: 'mkn-flag' }, g);
    });
    // Le carré des Lévites : le Tabernacle au milieu, les familles de Mérari (nord), Guerchon (ouest), Kéhat (sud) et Moïse et Aaron (est).
    const strip = { merari: [55, 55, 60, 15], kehat: [55, 100, 60, 15], guerchon: [55, 70, 15, 30], moise: [100, 70, 15, 30] };
    M.LEVITES.forEach(l => {
        const r = strip[l.id];
        const g = mknMakeItem(mknSvg('g', {}, svg), l.id, l.fr);
        mknSvg('rect', { x: r[0], y: r[1], width: r[2], height: r[3], class: 'mkn-levite' }, g);
        const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
        const text = mknSvg('text', { x: cx, y: cy + 1.6, 'font-size': l.id === 'moise' ? 3.4 : 4.4, 'text-anchor': 'middle', class: 'mkn-levite-name' }, g, l.id === 'moise' ? 'Moïse · Aaron' : l.fr);
        if (l.side === 'west') text.setAttribute('transform', 'rotate(-90 ' + cx + ' ' + cy + ')');
        if (l.side === 'east') text.setAttribute('transform', 'rotate(90 ' + cx + ' ' + cy + ')');
    });
    const tab = mknMakeItem(mknSvg('g', {}, svg), 'tabernacle', MishkanCore.ITEMS.tabernacle.fr);
    mknSvg('rect', { x: 70, y: 70, width: 30, height: 30, class: 'mkn-room' }, tab);
    mknSvg('rect', { x: 77, y: 80, width: 16, height: 8, class: 'mkn-gold' }, tab);
    mknSvg('text', { x: 85, y: 95, 'font-size': 3.4, 'text-anchor': 'middle', class: 'mkn-levite-name' }, tab, t('tools.mkn_tabernacle_short'));
    // Orientation.
    [['N', 85, 9], ['S', 85, 166], ['O', 6, 88], ['E', 164, 88]].forEach(c => mknSvg('text', { x: c[1], y: c[2], 'font-size': 6, 'text-anchor': 'middle', class: 'mkn-compass' }, svg, c[0]));
    return svg;
}

function mknFmtInt(n) { return n.toLocaleString('fr-FR').replace(/ | /g, ' '); }

function mknFillCampSheet(box, id) {
    const M = MishkanCore;
    if (id === 'tabernacle') { mknFillSheet(box, M.ITEMS.tabernacle, 'tabernacle'); return; }
    const tribe = M.tribe(id);
    if (tribe) {
        const side = M.CAMP_SIDES[tribe.side];
        const headTribe = M.tribe(side.head);
        const diff = tribe.nb26 - tribe.nb1;
        const facts = [
            t('tools.mkn_tribe_nb1', { n: mknFmtInt(tribe.nb1) }),
            t('tools.mkn_tribe_nb26', { n: mknFmtInt(tribe.nb26), diff: (diff > 0 ? '+' : '−') + mknFmtInt(Math.abs(diff)) }),
            t('tools.mkn_tribe_camp', { head: headTribe.fr, n: mknFmtInt(M.campTotal(tribe.side, 'nb1')) })
        ];
        mknFillSheet(box, {
            fr: tribe.fr, he: tribe.he, ref: side.ref + ' ; Nombres 1:20-46 ; 26:5-51',
            dims: t('tools.mkn_camp_' + tribe.side) + (side.head === tribe.id ? ' · ' + t('tools.mkn_banner_head') : ''),
            text: t('tools.mkn_tribe_text', { color: tribe.colorFr, sign: tribe.sign }), facts: facts
        });
        return;
    }
    const lev = M.LEVITES.find(l => l.id === id);
    const facts = lev.month ? [t('tools.mkn_levite_counts', { month: mknFmtInt(lev.month), work: mknFmtInt(lev.work) })] : [];
    mknFillSheet(box, {
        fr: lev.fr, he: lev.he, ref: lev.ref, dims: t('tools.mkn_camp_' + lev.side),
        text: t('tools.mkn_levite_text', { at: t('tools.mkn_at_' + lev.side), duty: lev.duty }), facts: facts
    });
}

// =========================================================================
// Onglet « Ustensiles »
// =========================================================================
// Les petits dessins : une vue de face, en 100 × 80, dans les couleurs de la matière (or, cuivre, bois).
const MKN_ICONS = {
    ark(s) {
        mknSvg('rect', { x: 26, y: 40, width: 48, height: 28, class: 'mkn-gold' }, s);
        mknSvg('line', { x1: 26, y1: 46, x2: 74, y2: 46, class: 'mkn-line' }, s);
        mknSvg('rect', { x: 26, y: 36, width: 48, height: 4, class: 'mkn-gold' }, s);
        mknSvg('line', { x1: 8, y1: 62, x2: 92, y2: 62, class: 'mkn-bar' }, s);
        [[26, 62], [74, 62]].forEach(p => mknSvg('circle', { cx: p[0], cy: p[1], r: 2.5, class: 'mkn-ring' }, s));
        // Deux kerouvim, ailes déployées vers le haut, face à face.
        mknSvg('path', { d: 'M46 36 L46 24 Q40 8 30 10 Q38 14 40 26', class: 'mkn-gold-line' }, s);
        mknSvg('path', { d: 'M54 36 L54 24 Q60 8 70 10 Q62 14 60 26', class: 'mkn-gold-line' }, s);
    },
    table(s) {
        mknSvg('rect', { x: 18, y: 36, width: 64, height: 5, class: 'mkn-gold' }, s);
        [[22, 41], [74, 41]].forEach(p => mknSvg('rect', { x: p[0], y: p[1], width: 4, height: 28, class: 'mkn-gold' }, s));
        // Douze gâteaux de pain, en deux piles de six.
        [[26, 0], [58, 0]].forEach(p => { for (let i = 0; i < 6; i++) mknSvg('rect', { x: p[0], y: 33 - 3.6 * (i + 1), width: 16, height: 3, class: 'mkn-bread' }, s); });
    },
    menorah(s) {
        const cx = 50, top = 14;
        mknSvg('rect', { x: 36, y: 68, width: 28, height: 6, class: 'mkn-gold' }, s);
        mknSvg('line', { x1: cx, y1: 68, x2: cx, y2: top, class: 'mkn-gold-line' }, s);
        // Trois branches de chaque côté, de plus en plus longues, partant de la tige à trois hauteurs.
        [[1, 52], [2, 44], [3, 36]].forEach(b => {
            const dx = b[0] * 11, y = b[1];
            mknSvg('path', { d: 'M' + cx + ' ' + y + ' A' + dx + ' ' + (y - top) + ' 0 0 0 ' + (cx + dx) + ' ' + top, class: 'mkn-gold-line' }, s);
            mknSvg('path', { d: 'M' + cx + ' ' + y + ' A' + dx + ' ' + (y - top) + ' 0 0 1 ' + (cx - dx) + ' ' + top, class: 'mkn-gold-line' }, s);
        });
        for (let i = -3; i <= 3; i++) {
            mknSvg('rect', { x: cx + i * 11 - 2.5, y: top - 3, width: 5, height: 4, class: 'mkn-gold' }, s);
            mknSvg('ellipse', { cx: cx + i * 11, cy: top - 7, rx: 1.6, ry: 3, class: 'mkn-flame' }, s);
        }
    },
    goldAltar(s) {
        mknSvg('rect', { x: 38, y: 24, width: 24, height: 46, class: 'mkn-gold' }, s);
        mknSvg('rect', { x: 36, y: 22, width: 28, height: 3, class: 'mkn-gold' }, s);
        [[36, 14], [60, 14]].forEach(p => mknSvg('rect', { x: p[0], y: p[1], width: 4, height: 8, class: 'mkn-gold' }, s));
        mknSvg('line', { x1: 14, y1: 56, x2: 86, y2: 56, class: 'mkn-bar' }, s);
        [[38, 56], [62, 56]].forEach(p => mknSvg('circle', { cx: p[0], cy: p[1], r: 2.4, class: 'mkn-ring' }, s));
        mknSvg('path', { d: 'M46 10 Q42 4 46 0 M54 10 Q50 4 54 0', class: 'mkn-smoke' }, s);
    },
    altar(s) {
        mknSvg('rect', { x: 20, y: 28, width: 60, height: 40, class: 'mkn-copper' }, s);
        [[20, 22], [74, 22]].forEach(p => mknSvg('rect', { x: p[0], y: p[1], width: 6, height: 8, class: 'mkn-horn' }, s));
        [[20, 56], [74, 56]].forEach(p => mknSvg('rect', { x: p[0], y: p[1], width: 6, height: 0.01, class: 'mkn-line' }, s));
        mknSvg('rect', { x: 18, y: 42, width: 64, height: 4, class: 'mkn-copper-dark' }, s);
        // La grille de cuivre en réseau sous le contour.
        for (let x = 22; x <= 78; x += 6) { mknSvg('line', { x1: x, y1: 46, x2: x + 12, y2: 66, class: 'mkn-line' }, s); mknSvg('line', { x1: x + 12, y1: 46, x2: x, y2: 66, class: 'mkn-line' }, s); }
        mknSvg('polygon', { points: '80,68 96,68 80,36', class: 'mkn-ramp' }, s);
        mknSvg('path', { d: 'M44 24 Q40 14 46 8 M54 24 Q50 14 56 8', class: 'mkn-smoke' }, s);
    },
    laver(s) {
        mknSvg('ellipse', { cx: 50, cy: 28, rx: 26, ry: 7, class: 'mkn-copper' }, s);
        mknSvg('path', { d: 'M24 28 Q28 50 42 52 L58 52 Q72 50 76 28', class: 'mkn-copper' }, s);
        mknSvg('rect', { x: 44, y: 52, width: 12, height: 14, class: 'mkn-copper' }, s);
        mknSvg('ellipse', { cx: 50, cy: 68, rx: 20, ry: 5, class: 'mkn-copper' }, s);
        mknSvg('ellipse', { cx: 50, cy: 28, rx: 21, ry: 4.5, class: 'mkn-water' }, s);
    }
};

function mknIcon(id) {
    const svg = mknSvg('svg', { viewBox: '0 0 100 80', class: 'mkn-icon', 'aria-hidden': 'true', focusable: 'false' });
    if (MKN_ICONS[id]) MKN_ICONS[id](svg);
    return svg;
}

function mknCard(entry, iconNode, open, sizeId) {
    const details = mknEl('details', 'hcal-feast mkn-card');
    if (open) details.open = true;
    const summary = document.createElement('summary');
    summary.className = 'mkn-card-summary';
    if (iconNode) summary.appendChild(iconNode);
    const head = mknEl('span', 'hcal-feast-head');
    head.appendChild(mknEl('strong', 'hcal-feast-name', entry.fr));
    if (entry.dims) head.appendChild(mknEl('span', 'hcal-feast-date', entry.dims));
    summary.appendChild(head);
    details.appendChild(summary);
    const content = mknEl('div', 'hcal-feast-body');
    const sheet = mknEl('div', 'mkn-card-sheet');
    mknFillSheet(sheet, entry, sizeId);
    const hebrew = sheet.querySelector('.mkn-sheet-head');
    if (hebrew) hebrew.classList.add('is-compact');
    content.appendChild(sheet);
    details.appendChild(content);
    return details;
}

function mknUtensilsTab(body) {
    const panel = mknEl('section', 'tool-panel');
    mknPara(panel, t('tools.mkn_utensils_intro'));
    mknOpinionControl(panel, () => mknRender());
    body.appendChild(panel);
    const list = mknEl('div', 'hcal-feasts');
    MishkanCore.UTENSIL_ORDER.forEach(id => list.appendChild(mknCard(MishkanCore.ITEMS[id], mknIcon(id), false, id)));
    body.appendChild(list);
    const note = mknEl('section', 'tool-panel');
    note.appendChild(mknEl('h3', 'tool-h', t('tools.mkn_makers_title')));
    mknPara(note, t('tools.mkn_makers'));
    body.appendChild(note);
}

// =========================================================================
// Onglet « Structure »
// =========================================================================
function mknStructureTab(body) {
    const M = MishkanCore;
    const planks = mknEl('section', 'tool-panel');
    planks.appendChild(mknEl('h3', 'tool-h', t('tools.mkn_planks_title')));
    mknPara(planks, t('tools.mkn_planks_intro', { planks: M.plankCount(), sockets: M.socketCount() }));
    planks.appendChild(mknPlanksSvg());
    const keys = mknEl('div', 'mkn-keys');
    [['mkn-key-plank', 'tools.mkn_key_plank'], ['mkn-key-corner', 'tools.mkn_key_corner'], ['mkn-key-post', 'tools.mkn_key_post']].forEach(k => {
        const li = mknEl('span', 'mkn-key');
        li.appendChild(mknEl('i', k[0]));
        li.appendChild(document.createTextNode(' ' + t(k[1])));
        keys.appendChild(li);
    });
    planks.appendChild(keys);
    body.appendChild(planks);

    const layers = mknEl('section', 'tool-panel');
    layers.appendChild(mknEl('h3', 'tool-h', t('tools.mkn_layers_title')));
    mknPara(layers, t('tools.mkn_layers_intro'));
    layers.appendChild(mknLayersSvg());
    const legend = mknEl('div', 'mkn-keys');
    M.LAYERS.forEach(l => {
        const li = mknEl('span', 'mkn-key');
        li.appendChild(mknEl('i', 'mkn-layer is-' + l.color));
        li.appendChild(document.createTextNode(' ' + t('tools.mkn_layer_' + l.id)));
        legend.appendChild(li);
    });
    layers.appendChild(legend);
    body.appendChild(layers);

    const list = mknEl('div', 'hcal-feasts');
    M.STRUCTURE_ORDER.forEach(id => list.appendChild(mknCard(M.STRUCTURE[id], null, false)));
    ['parokhet', 'massakh'].forEach(id => list.appendChild(mknCard(M.ITEMS[id], null, false)));
    body.appendChild(list);
}

// Les planches vues d'en haut : 20 au sud, 20 au nord, 6 à l'ouest et 2 d'angle (les 48 planches de Exode 26:18-25).
function mknPlanksSvg() {
    const M = MishkanCore;
    const svg = mknRoot('14 14 44 23', t('tools.mkn_planks_title'));
    const w = M.TABERNACLE.planks.plankWidth;
    // Rangées nord (y 19) et sud (y 30) : 20 planches de 1,5 coudée, de x = 20 à 50 ; épaisseur d'une coudée.
    for (let i = 0; i < 20; i++) {
        mknSvg('rect', { x: 20 + i * w, y: 19, width: w, height: 1, class: 'mkn-plank' }, svg);
        mknSvg('rect', { x: 20 + i * w, y: 30, width: w, height: 1, class: 'mkn-plank' }, svg);
    }
    // L'ouest : 6 planches de 1,5 coudée entre les deux angles (9 coudées), et 2 planches d'angle.
    for (let i = 0; i < 6; i++) mknSvg('rect', { x: 19, y: 20.5 + i * w, width: 1, height: w, class: 'mkn-plank' }, svg);
    mknSvg('rect', { x: 19, y: 19, width: 1, height: 1.5, class: 'mkn-plank is-corner' }, svg);
    mknSvg('rect', { x: 19, y: 29.5, width: 1, height: 1.5, class: 'mkn-plank is-corner' }, svg);
    // L'est : ouvert, avec le rideau d'entrée sur cinq piliers, et la parokhet sur quatre.
    mknSvg('line', { x1: 50, y1: 20, x2: 50, y2: 30, class: 'mkn-curtain is-massakh' }, svg);
    mknSvg('line', { x1: 30, y1: 20, x2: 30, y2: 30, class: 'mkn-curtain is-parokhet' }, svg);
    for (let i = 0; i < 5; i++) mknSvg('circle', { cx: 50, cy: 21 + 2 * i, r: 0.45, class: 'mkn-pillar is-gold' }, svg);
    for (let i = 0; i < 4; i++) mknSvg('circle', { cx: 30, cy: 21.25 + 2.5 * i, r: 0.45, class: 'mkn-pillar is-gold' }, svg);
    mknDim(svg, 20, 34.6, 50, 34.6, t('tools.mkn_planks_dim'), 1.7);
    mknSvg('text', { x: 35, y: 17.2, class: 'mkn-compass', 'font-size': 1.4, 'text-anchor': 'middle' }, svg, t('tools.mkn_planks_north'));
    mknSvg('text', { x: 18.4, y: 25.3, class: 'mkn-compass', 'font-size': 1.2, 'text-anchor': 'end' }, svg, t('tools.mkn_west'));
    mknSvg('text', { x: 51.2, y: 25.3, class: 'mkn-compass', 'font-size': 1.2, 'text-anchor': 'start' }, svg, t('tools.mkn_east_short'));
    return svg;
}

// Les quatre couches de la toiture, vues en coupe de face : planches d'or, puis tentures de lin, poil de chèvre, béliers rouges, tahach.
function mknLayersSvg() {
    const M = MishkanCore;
    const svg = mknRoot('0 0 100 66', t('tools.mkn_layers_title'));
    const base = 58, left = 30, right = 70;   // un Tabernacle de 10 coudées de large et de haut, dessiné à 4 unités par coudée
    mknSvg('rect', { x: left, y: base - 40, width: right - left, height: 40, class: 'mkn-room' }, svg);
    mknSvg('rect', { x: left - 1.5, y: base - 40, width: 1.5, height: 40, class: 'mkn-plank' }, svg);
    mknSvg('rect', { x: right, y: base - 40, width: 1.5, height: 40, class: 'mkn-plank' }, svg);
    M.LAYERS.forEach((l, i) => {
        const o = 3 + i * 3.2;
        mknSvg('path', { d: 'M' + (left - o) + ' ' + base + ' V' + (base - 40 - o) + ' H' + (right + o) + ' V' + base, class: 'mkn-layer-line is-' + l.color, fill: 'none' }, svg);
    });
    mknSvg('text', { x: 50, y: 64.5, class: 'mkn-dim-text', 'font-size': 3, 'text-anchor': 'middle' }, svg, t('tools.mkn_layers_caption'));
    return svg;
}

// =========================================================================
// Onglet « Cohen »
// =========================================================================
function mknCohenTab(body) {
    const M = MishkanCore;
    const panel = mknEl('section', 'tool-panel');
    const modes = mknEl('div', 'tool-history-chips');
    modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', t('tools.mkn_who_aria'));
    ['all', 'high', 'kippur'].forEach(w => {
        const btn = mknEl('button', 'tool-history-chip', t('tools.mkn_who_' + w));
        btn.type = 'button';
        btn.id = 'tool-mkn-who-' + w;
        btn.setAttribute('aria-pressed', mknWho === w ? 'true' : 'false');
        btn.onclick = () => { mknWho = w; mknSelected = null; mknRender(); };
        modes.appendChild(btn);
    });
    panel.appendChild(modes);
    mknPara(panel, t('tools.mkn_who_note_' + mknWho));
    panel.appendChild(mknFigureSvg());
    // La légende : les vêtements du groupe affiché.
    const list = mknGarmentsOf(mknWho);
    const legend = mknEl('div', 'mkn-legend');
    list.forEach((g, i) => {
        const btn = mknEl('button', 'mkn-legend-btn', (i + 1) + ' · ' + mknGarmentName(g));
        btn.type = 'button';
        btn.dataset.id = g.id;
        btn.setAttribute('aria-pressed', mknSelected === g.id ? 'true' : 'false');
        btn.onclick = () => mknSelectGarment(g.id);
        legend.appendChild(btn);
    });
    panel.appendChild(legend);
    body.appendChild(panel);

    const sheet = mknEl('section', 'tool-panel mkn-sheet');
    sheet.id = 'tool-mkn-sheet';
    body.appendChild(sheet);
    mknFillGarmentSheet(sheet, mknSelected);
}

// Les vêtements d'un groupe, dans l'ordre d'affichage.
function mknGarmentsOf(who) {
    const M = MishkanCore;
    if (who === 'all') return M.garmentsOf('all');
    if (who === 'kippur') return M.YOM_KIPPUR_GARMENTS.map(id => M.GARMENTS.find(g => g.id === id));
    return M.garmentsOf('all').concat(M.garmentsOf('high'));
}

// Le nom français d'un vêtement : pour le grand prêtre, le turban s'appelle mitsnefet.
function mknGarmentName(g) { return g.id === 'migbaat' && mknWho === 'high' ? g.highFr : g.fr; }
function mknGarmentHe(g) { return g.id === 'migbaat' && mknWho === 'high' ? g.highHe : g.he; }

function mknFillGarmentSheet(box, id) {
    if (!id) { mknFillSheet(box, null); return; }
    const g = MishkanCore.GARMENTS.find(x => x.id === id);
    mknFillSheet(box, { fr: mknGarmentName(g), he: mknGarmentHe(g), ref: g.ref, text: g.text, material: mknWho === 'kippur' ? t('tools.mkn_linen_white') : g.material });
    // Le détail agrandi : seulement pour le vêtement choisi (le pectoral et ses pierres n'apparaissent que dans sa section).
    if (MishkanCore.ZOOM_GARMENTS.indexOf(id) >= 0 && !(id === 'tsits' && mknWho === 'kippur')) box.appendChild(mknZoom(id));
}

// --- Les vêtements vus de près -----------------------------------------------------------------------------------------------
function mknZoom(id) {
    const M = MishkanCore;
    const box = mknEl('div', 'mkn-zoom');
    box.id = 'tool-mkn-zoom';
    box.dataset.id = id;
    box.appendChild(mknEl('h3', 'tool-h', t('tools.mkn_zoom_' + id + '_title')));
    mknPara(box, t('tools.mkn_zoom_' + id));
    if (id === 'hoshen') {
        const grid = mknEl('div', 'mkn-stones');
        M.HOSHEN_STONES.forEach(row => row.forEach(st => {
            const cell = mknEl('div', 'mkn-stone');
            cell.style.background = st.color;
            cell.style.color = M.readableOn(st.color);
            const he = mknEl('span', 'mkn-stone-he', st.he);
            he.lang = 'he';
            he.dir = 'rtl';
            cell.appendChild(he);
            cell.appendChild(mknEl('span', 'mkn-stone-fr', st.fr));
            cell.appendChild(mknEl('span', 'mkn-stone-tribe', st.tribe.fr));
            cell.title = st.fr + ' · ' + st.tribe.fr + ' · ' + st.hint;
            grid.appendChild(cell);
        }));
        box.appendChild(grid);
        mknPara(box, t('tools.mkn_stones_note'));
        return box;
    }
    box.appendChild(MKN_ZOOMS[id]());
    return box;
}

const MKN_ZOOMS = {
    // La plaque d'or : l'inscription en deux lignes, le ruban de bleu, la largeur de deux doigts.
    tsits() {
        const M = MishkanCore;
        const wrap = mknEl('div', 'mkn-tsits');
        // Le choix de la disposition : deux lignes (le Nom en haut) ou une seule ligne.
        const views = mknEl('div', 'tool-history-chips');
        views.setAttribute('role', 'group');
        views.setAttribute('aria-label', t('tools.mkn_tsits_view_aria'));
        M.TSITS.views.forEach(v => {
            const btn = mknEl('button', 'tool-history-chip', t('tools.mkn_tsits_view_' + v));
            btn.type = 'button';
            btn.id = 'tool-mkn-tsits-' + v;
            btn.setAttribute('aria-pressed', mknTsitsView === v ? 'true' : 'false');
            btn.onclick = () => { mknTsitsView = v; mknSelectGarment('tsits'); };
            views.appendChild(btn);
        });
        wrap.appendChild(views);
        const svg = mknRoot('0 0 236 104', t('tools.mkn_zoom_tsits_title'));
        svg.classList.add('is-zoom');
        mknSvg('path', { d: 'M24 44 C6 44 2 78 20 96 M196 44 C212 44 214 78 200 96', class: 'mkn-cord' }, svg);
        const oneLine = mknTsitsView === 'one';
        mknSvg('rect', { x: 24, y: 10, width: 172, height: oneLine ? 44 : 68, rx: 5, class: 'mkn-plate' }, svg);
        const lines = oneLine ? M.TSITS.oneLine : M.TSITS.lines;
        lines.forEach((line, i) => {
            const text = mknSvg('text', { x: 110, y: oneLine ? 43 : 44 + i * 26, 'font-size': oneLine ? 28 : 26, 'text-anchor': 'middle', class: 'mkn-engraving', lang: 'he', direction: 'rtl' }, svg, line);
            text.setAttribute('style', 'font-family: var(--torah-font);');
        });
        mknDim(svg, 222, 10, 222, oneLine ? 54 : 78, t('tools.mkn_two_fingers'), 7);
        wrap.appendChild(svg);
        // Le texte de la discussion : l'introduction, les deux dispositions (celle qu'on regarde en premier), puis la synthèse.
        const T = M.TSITS.texts;
        mknPara(wrap, T.intro);
        [mknTsitsView, mknTsitsView === 'two' ? 'one' : 'two'].forEach(v => {
            const block = mknEl('div', 'mkn-tsits-view' + (v === mknTsitsView ? ' is-current' : ''));
            block.appendChild(mknEl('strong', 'mkn-row-label', T[v].title));
            block.appendChild(mknEl('p', 'tool-small', T[v].text));
            wrap.appendChild(block);
        });
        mknPara(wrap, T.halakha);
        mknPara(wrap, t('tools.mkn_source', { src: 'Soucca 5a ; Chabbat 63b ; Rambam, Klei HaMikdash 9:1' }), 'tool-small hcal-source');
        return wrap;
    },
    // Le bord de la robe : clochettes d'or et grenades en alternance.
    meil() {
        const M = MishkanCore;
        const svg = mknRoot('0 0 220 70', t('tools.mkn_zoom_meil_title'));
        svg.classList.add('is-zoom');
        mknSvg('rect', { x: 0, y: 0, width: 220, height: 36, class: 'mkn-blue' }, svg);
        for (let i = 0; i < 8; i++) {
            const kind = M.ROBE_HEM[i % 2], x = 16 + i * 26;
            if (kind === 'bell') {
                mknSvg('path', { d: 'M' + (x - 8) + ' 56 Q' + (x - 8) + ' 40 ' + x + ' 40 Q' + (x + 8) + ' 40 ' + (x + 8) + ' 56 Z', class: 'mkn-bell' }, svg);
                mknSvg('circle', { cx: x, cy: 60, r: 2.6, class: 'mkn-bell' }, svg);
            } else {
                mknSvg('ellipse', { cx: x, cy: 54, rx: 8, ry: 10, class: 'mkn-pomegranate' }, svg);
                mknSvg('path', { d: 'M' + (x - 4) + ' 44 L' + (x - 2) + ' 40 L' + x + ' 43 L' + (x + 2) + ' 40 L' + (x + 4) + ' 44', class: 'mkn-crown' }, svg);
            }
        }
        return svg;
    },
    // Les deux épaulettes : une pierre de choham sertie dans l'or, six noms de tribus sur chacune.
    efod() {
        const M = MishkanCore;
        const svg = mknRoot('0 0 220 100', t('tools.mkn_zoom_efod_title'));
        svg.classList.add('is-zoom');
        [[60, 0], [160, 1]].forEach(([cx, k]) => {
            mknSvg('rect', { x: cx - 16, y: 0, width: 32, height: 18, class: 'mkn-strap' }, svg);
            mknSvg('ellipse', { cx: cx, cy: 54, rx: 44, ry: 40, class: 'mkn-setting' }, svg);
            mknSvg('ellipse', { cx: cx, cy: 54, rx: 38, ry: 34, class: 'mkn-onyx' }, svg);
            M.EFOD_STONES[k].forEach((name, i) => {
                const col = i % 2, row = Math.floor(i / 2);
                // Lu de droite à gauche : le premier nom de chaque ligne est à droite.
                mknSvg('text', { x: cx + (col === 0 ? 17 : -17), y: 40 + row * 15, 'font-size': 11, 'text-anchor': 'middle', class: 'mkn-name', lang: 'he', direction: 'rtl' }, svg, name);
            });
        });
        return svg;
    },
    // La tunique « à mailles » : un tissage en alvéoles.
    ketonet() {
        const svg = mknRoot('0 0 220 80', t('tools.mkn_zoom_ketonet_title'));
        svg.classList.add('is-zoom');
        const defs = mknSvg('defs', {}, svg);
        const clip = mknSvg('clipPath', { id: 'mkn-clip-ketonet' }, defs);
        mknSvg('rect', { x: 10, y: 8, width: 200, height: 64, rx: 4 }, clip);
        mknSvg('rect', { x: 10, y: 8, width: 200, height: 64, rx: 4, class: 'mkn-linen' }, svg);
        const g = mknSvg('g', { 'clip-path': 'url(#mkn-clip-ketonet)' }, svg);
        for (let i = -6; i < 24; i++) {
            mknSvg('line', { x1: 10 + i * 12, y1: 8, x2: 10 + i * 12 + 64, y2: 72, class: 'mkn-weave' }, g);
            mknSvg('line', { x1: 10 + i * 12 + 64, y1: 8, x2: 10 + i * 12, y2: 72, class: 'mkn-weave' }, g);
        }
        return svg;
    }
};

function mknSelectGarment(id) {
    mknSelected = id;
    document.querySelectorAll('#tool-mkn-body .mkn-item').forEach(g => g.classList.toggle('is-selected', g.dataset.id === id));
    document.querySelectorAll('#tool-mkn-body .mkn-legend-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false'));
    const sheet = toolEl('tool-mkn-sheet');
    if (sheet) mknFillGarmentSheet(sheet, id);
}

function mknMakeGarment(g, id) {
    const gm = MishkanCore.GARMENTS.find(x => x.id === id);
    g.setAttribute('class', 'mkn-item' + (mknSelected === id ? ' is-selected' : ''));
    g.dataset.id = id;
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', mknGarmentName(gm));
    g.addEventListener('click', () => mknSelectGarment(id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mknSelectGarment(id); } });
    return g;
}

// La silhouette du prêtre, avec ses vêtements dessinés par couches : tunique, robe, éphod, pectoral, ceinture, turban, plaque. Le caleçon, porté
// dessous, n'est pas visible : il n'apparaît que dans la légende.
function mknFigureSvg() {
    const who = mknWho;
    const list = mknGarmentsOf(who);
    const has = id => list.some(g => g.id === id);
    const linen = who === 'kippur' ? ' is-white' : '';
    const svg = mknRoot('0 -12 160 274', t('tools.mkn_who_' + who));
    svg.classList.add('is-figure');
    const num = id => list.findIndex(g => g.id === id) + 1;
    const badge = (id, x, y) => { if (has(id)) mknBadge(svg, num(id), x, y, 7.5); };
    // Corps : tête, cou, mains.
    mknSvg('circle', { cx: 80, cy: 34, r: 14, class: 'mkn-skin' }, svg);
    mknSvg('rect', { x: 74, y: 44, width: 12, height: 14, class: 'mkn-skin' }, svg);
    mknSvg('circle', { cx: 27, cy: 140, r: 5.5, class: 'mkn-skin' }, svg);
    mknSvg('circle', { cx: 133, cy: 140, r: 5.5, class: 'mkn-skin' }, svg);
    // La tunique : longue, manches jusqu'aux poignets.
    if (has('ketonet')) {
        const g = mknMakeGarment(mknSvg('g', {}, svg), 'ketonet');
        mknSvg('path', { d: 'M62 54 L98 54 L124 72 L134 140 L122 142 L112 94 L112 244 L48 244 L48 94 L38 142 L26 140 L36 72 Z', class: 'mkn-linen' + linen }, g);
        // La robe bleue remplace la partie haute à l'écran : on ne voit alors que le bas et les manches de la tunique.
    }
    if (has('meil')) {
        const g = mknMakeGarment(mknSvg('g', {}, svg), 'meil');
        mknSvg('path', { d: 'M62 54 L98 54 L120 70 L126 120 L112 124 L112 204 L48 204 L48 124 L34 120 L40 70 Z', class: 'mkn-blue' }, g);
        // La bordure : clochettes d'or et grenades en alternance.
        for (let i = 0; i < 8; i++) {
            const x = 52 + i * 8;
            mknSvg(i % 2 === 0 ? 'circle' : 'ellipse', i % 2 === 0 ? { cx: x, cy: 207, r: 2.8, class: 'mkn-bell' } : { cx: x, cy: 207, rx: 2.6, ry: 3.4, class: 'mkn-pomegranate' }, g);
        }
    }
    if (has('efod')) {
        const g = mknMakeGarment(mknSvg('g', {}, svg), 'efod');
        mknSvg('path', { d: 'M62 56 L70 54 L72 74 L88 74 L90 54 L98 56 L108 76 L108 168 L52 168 L52 76 Z', class: 'mkn-efod' }, g);
        [[64, 54], [90, 54]].forEach(p => mknSvg('rect', { x: p[0], y: p[1] - 4, width: 6, height: 8, class: 'mkn-gold' }, g));
    }
    if (has('hoshen')) {
        const g = mknMakeGarment(mknSvg('g', {}, svg), 'hoshen');
        mknSvg('rect', { x: 62, y: 80, width: 36, height: 38, class: 'mkn-gold' }, g);
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) mknSvg('rect', { x: 65 + MishkanCore.displayColumn(c) * 10.4, y: 83 + r * 8.6, width: 8.6, height: 7, class: 'mkn-gem', fill: MishkanCore.HOSHEN_STONES[r][c].color }, g);
    }
    if (has('avnet')) {
        const g = mknMakeGarment(mknSvg('g', {}, svg), 'avnet');
        mknSvg('rect', { x: 50, y: 124, width: 60, height: 12, class: 'mkn-belt' + linen }, g);
        mknSvg('path', { d: 'M82 136 L88 158 L96 156 L90 136 Z', class: 'mkn-belt' + linen }, g);
    }
    // Le turban : une coiffe conique de lin ; chez le grand prêtre, avec la plaque d'or sur le front.
    if (has('migbaat')) {
        const g = mknMakeGarment(mknSvg('g', {}, svg), 'migbaat');
        mknSvg('path', { d: 'M64 28 Q66 -2 80 -4 Q94 -2 96 28 Q80 34 64 28 Z', class: 'mkn-linen' + linen }, g);
        for (let i = 0; i < 4; i++) mknSvg('path', { d: 'M65 ' + (14 + i * 4) + ' Q80 ' + (19 + i * 4) + ' 95 ' + (14 + i * 4), class: 'mkn-line' }, g);
    }
    if (has('tsits')) {
        const g = mknMakeGarment(mknSvg('g', {}, svg), 'tsits');
        mknSvg('rect', { x: 68, y: 22, width: 24, height: 7, rx: 1.5, class: 'mkn-gold' }, g);
    }
    // Les numéros, à côté des vêtements, de chaque côté de la silhouette.
    const pos = { migbaat: [112, 14], tsits: [112, 36], hoshen: [132, 100], efod: [28, 96], meil: [136, 190], ketonet: [28, 226], avnet: [136, 142], michnasayim: [80, 252] };
    Object.keys(pos).forEach(id => {
        if (id === 'michnasayim') { if (has('michnasayim')) { mknBadge(svg, num('michnasayim'), 80, 252, 7.5); mknSvg('text', { x: 80, y: 238, class: 'mkn-compass', 'font-size': 8, 'text-anchor': 'middle' }, svg, t('tools.mkn_under')); } return; }
        badge(id, pos[id][0], pos[id][1]);
    });
    return svg;
}

// =========================================================================
// Onglet « Mikdash »
// =========================================================================
function mknMikdashTab(body) {
    const M = MishkanCore;
    const intro = mknEl('section', 'tool-panel');
    mknPara(intro, t('tools.mkn_mikdash_intro'));
    body.appendChild(intro);
    const list = mknEl('div', 'hcal-feasts');
    M.TEMPLE_COLUMNS.forEach((col, i) => {
        const details = mknEl('details', 'hcal-feast mkn-temple is-' + col);
        details.id = 'mkn-temple-' + col;
        if (i === 0) details.open = true;
        const summary = document.createElement('summary');
        const head = mknEl('span', 'hcal-feast-head');
        head.appendChild(mknEl('strong', 'hcal-feast-name', t('tools.mkn_col_' + col)));
        head.appendChild(mknEl('span', 'hcal-feast-date', t('tools.mkn_col_' + col + '_sub')));
        summary.appendChild(head);
        details.appendChild(summary);
        const content = mknEl('div', 'hcal-feast-body');
        M.TEMPLE_ROWS.forEach(row => {
            const block = mknEl('div', 'mkn-row');
            block.appendChild(mknEl('strong', 'mkn-row-label', t('tools.mkn_row_' + row.id)));
            block.appendChild(mknEl('p', 'tool-small', row[col]));
            content.appendChild(block);
        });
        const chr = mknEl('div', 'gen-actions');
        content.appendChild(chr);
        // Chaque colonne se situe sur la frise : le Michkan dans le désert, le Premier Temple, le Second Temple, le Temple d'Hérode.
        chrAddItemButton(chr, { mishkan: 'michkan_desert', first: 'temple1', second: 'temple2', herod: 'e_herode_temple' }[col], 'screen-tool-mishkan');
        details.appendChild(content);
        list.appendChild(details);
    });
    body.appendChild(list);
    body.appendChild(mknHolinessPanel());
    const quote = mknEl('section', 'tool-panel');
    const q = mknEl('blockquote', 'mkn-quote', '« ' + M.TEMPLE_QUOTE.text + ' »');
    quote.appendChild(q);
    mknPara(quote, t('tools.mkn_source', { src: M.TEMPLE_QUOTE.ref }), 'tool-small hcal-source');
    body.appendChild(quote);
    const cal = mknEl('section', 'tool-panel');
    cal.appendChild(mknEl('h3', 'tool-h', t('tools.mkn_year_title')));
    mknPara(cal, t('tools.mkn_year_text'));
    const ul = mknEl('ul', 'hcal-list');
    M.TEMPLE_CALENDAR.forEach(id => ul.appendChild(mknEl('li', '', t('tools.hcal_f_' + id + '_name'))));
    cal.appendChild(ul);
    body.appendChild(cal);
}

// Les liens vers les cartes voisines : on y va depuis ici, « Retour » ramène ici.
function mknOpen(toolId) { openTool(toolId, 'screen-tool-mishkan'); }


// =========================================================================
// Les lieux, du plus large au plus saint (Michna, Kélim 1:6-9) : une échelle, pas un plan à l'échelle
// =========================================================================
function mknHolinessPanel() {
    const M = MishkanCore;
    const panel = mknEl('section', 'tool-panel');
    panel.id = 'tool-mkn-holiness';
    panel.appendChild(mknEl('h3', 'tool-h', t('tools.mkn_holy_title')));
    mknPara(panel, t('tools.mkn_holy_intro'));
    // Onze marches de plus en plus hautes, du plus clair (la terre d'Israël) au plus doré (le Saint des saints).
    const svg = mknRoot('0 0 220 112', t('tools.mkn_holy_title'));
    const list = mknEl('div', 'mkn-legend');
    const sheet = mknEl('div', 'mkn-sheet-inline');
    const pick = id => {
        mknHoliness = id;
        panel.querySelectorAll('.mkn-item').forEach(g => g.classList.toggle('is-selected', g.dataset.id === id));
        list.querySelectorAll('.mkn-legend-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false'));
        const h = M.HOLINESS.find(x => x.id === id);
        mknFillSheet(sheet, { fr: h.fr, he: h.he, ref: t('tools.mkn_holy_ref'), text: h.text });
    };
    M.HOLINESS.forEach((h, i) => {
        const w = 18, x = 6 + i * w, height = 14 + i * 8.4, y = 104 - height;
        const g = mknSvg('g', { 'class': 'mkn-item' + (mknHoliness === h.id ? ' is-selected' : ''), 'data-id': h.id, tabindex: '0', role: 'button', 'aria-label': h.fr }, svg);
        mknSvg('rect', { x: x, y: y, width: w - 1, height: height, fill: 'hsl(' + (48 - i) + ', ' + (30 + i * 5) + '%, ' + (90 - i * 4.6) + '%)', class: 'mkn-step' }, g);
        mknSvg('text', { x: x + (w - 1) / 2, y: y + 8, 'font-size': 7, 'text-anchor': 'middle', class: 'mkn-badge-text' }, g, String(i + 1));
        g.addEventListener('click', () => pick(h.id));
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(h.id); } });
    });
    panel.appendChild(svg);
    M.HOLINESS.forEach((h, i) => {
        const btn = mknEl('button', 'mkn-legend-btn', (i + 1) + ' · ' + h.fr);
        btn.type = 'button';
        btn.dataset.id = h.id;
        btn.setAttribute('aria-pressed', mknHoliness === h.id ? 'true' : 'false');
        btn.onclick = () => pick(h.id);
        list.appendChild(btn);
    });
    panel.appendChild(list);
    panel.appendChild(sheet);
    if (mknHoliness) pick(mknHoliness); else mknFillSheet(sheet, null);
    return panel;
}
