// =========================================================================
// === LA GÉNÉALOGIE BIBLIQUE (écran de la boîte à outils) ===
// =========================================================================
// Un seul arbre, d'Adam aux enfants de Jacob (vertical par défaut, Adam centré en haut ; le bouton 🔄 passe à l'horizontal) : une carte par personne (fond bleu clair pour les hommes, rose clair pour les
// femmes), des traits coudés entre parents et enfants, des pointillés pour les descendants lointains. Deux boutons collés en haut à droite
// choisissent la langue des noms : « A » (français, par défaut) ou « א » (hébreu). Les données et la mise en page sont dans
// js/genealogyCore.js (testé). Tout le texte passe par textContent.

const GEN_CARD_W = 132;
const GEN_COL_STEP = 166;
const GEN_GAP = 10;
const GEN_ROW_GAP = 26;
const GEN_ZOOMS = [0.4, 0.55, 0.7, 0.85, 1, 1.25];
let genLang = 'fr';
let genDir = 'v';
let genBoxes = {};
let genZoomIdx = 4;
let genCollapsed = {};
let genBuilt = false;
let genHeights = {};
let genFocus = '';
let genCat = '';              // la catégorie choisie dans le menu « Catégories » (vide : aucune)
let genCatSet = {};           // ses personnes, entourées de sa couleur dans l'arbre
let genCatColor = '';
let genChronoScholar = 'thiele';

// Un choix déjà fait par le joueur (bouton 🔄) est mémorisé ; sans choix, le sens dépend de l'écran : sur un téléphone
// en portrait, l'arbre s'ouvre à l'horizontale (Adam à gauche, on lit de gauche à droite).
let genDirChosen = false;
try {
    if (localStorage.getItem('genealogyLang') === 'he') genLang = 'he';
    const savedDir = localStorage.getItem('genealogyDir');
    if (savedDir === 'h' || savedDir === 'v') { genDir = savedDir; genDirChosen = true; }
} catch (e) { /* stockage indisponible */ }

function genDefaultDir() {
    if (genDirChosen) return genDir;
    const phonePortrait = typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
    return phonePortrait ? 'h' : 'v';
}

function genName(p) { return genLang === 'he' ? p.he : p.fr; }

// Glisser et pincer dans la vue (généalogie biblique et chaîne de transmission, js/app/transmission.js).
// Souris : maintenir le bouton et glisser déplace la vue. Doigt : glisser déplace la vue (le défilement natif est désactivé sur la
// vue, voir css « .gen-screen .gen-view »). Deux doigts : pincer agrandit ou rétrécit, d'un cran à chaque écartement ou
// rapprochement d'environ 25 %, autour du milieu des doigts. zoomBy(delta, x, y) est appelé pour chaque cran (x, y : coordonnées écran).
// Un clic sans déplacement (moins de 5 px) reste un clic sur la carte ; après un glissement ou un pincement, le clic qui suit est
// ignoré, pour ne pas choisir une carte (ni replier une branche) par erreur.
const VIEW_PINCH_STEP = 1.25;
function enableViewGestures(view, zoomBy) {
    const pts = new Map();   // doigts posés : pointerId -> position
    let drag = null;         // un glissement en cours (souris ou un doigt)
    let pinchDist = 0;       // écart entre les deux doigts au dernier cran de zoom
    let moved = false;

    const markMoved = () => {
        moved = true;
        setTimeout(() => { moved = false; }, 0);
    };
    const dist = () => {
        const [a, b] = [...pts.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const startDrag = e => {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: view.scrollLeft, top: view.scrollTop, active: false };
    };

    view.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') {
            pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pts.size === 1) {
                startDrag(e);
            } else if (pts.size === 2) {
                // Deux doigts : c'est un pincement, le glissement d'un doigt s'arrête. Les deux doigts restent suivis
                // même si la carte sous eux disparaît au redessin.
                drag = null;
                pinchDist = dist() || 1;
                view.classList.remove('is-dragging');
                [...pts.keys()].forEach(id => { try { view.setPointerCapture(id); } catch (err) { /* capture impossible : le pincement marche quand même */ } });
            }
            return;
        }
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        startDrag(e);
    });
    view.addEventListener('pointermove', e => {
        if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size >= 2) {
            const d = dist();
            if (d >= pinchDist * VIEW_PINCH_STEP || d <= pinchDist / VIEW_PINCH_STEP) {
                const [a, b] = [...pts.values()];
                zoomBy(d > pinchDist ? 1 : -1, (a.x + b.x) / 2, (a.y + b.y) / 2);
                pinchDist = d;
            }
            return;
        }
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.active) {
            if (Math.abs(dx) + Math.abs(dy) < 5) return;
            drag.active = true;
            view.classList.add('is-dragging');
            try { view.setPointerCapture(e.pointerId); } catch (err) { /* capture impossible : le glissement marche quand même dans la vue */ }
        }
        view.scrollLeft = drag.left - dx;
        view.scrollTop = drag.top - dy;
    });
    const end = e => {
        const pinched = pts.size >= 2;
        pts.delete(e.pointerId);
        if (pts.size < 2) pinchDist = 0;
        if (drag && drag.id === e.pointerId) {
            if (drag.active) markMoved();
            view.classList.remove('is-dragging');
            drag = null;
        }
        if (pinched) markMoved();
        // Un doigt reste après un pincement : il continue à glisser la vue.
        if (pts.size === 1 && !drag) {
            const [id, p] = [...pts.entries()][0];
            drag = { id, x: p.x, y: p.y, left: view.scrollLeft, top: view.scrollTop, active: true };
        }
    };
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', end);
    view.addEventListener('click', e => {
        if (!moved) return;
        e.stopPropagation();
        e.preventDefault();
    }, true);
}

// Change l'échelle en gardant sous le doigt le point (clientX, clientY) : le contenu visé ne saute pas pendant le zoom.
// change() redessine à la nouvelle échelle ; stage est l'élément mis à l'échelle (transform), view la zone qui défile.
function zoomKeepingPoint(stage, view, clientX, clientY, change) {
    const before = stage.getBoundingClientRect();
    const oldScale = before.width / stage.offsetWidth;
    const lx = (clientX - before.left) / oldScale;
    const ly = (clientY - before.top) / oldScale;
    change();
    const after = stage.getBoundingClientRect();
    const newScale = after.width / stage.offsetWidth;
    view.scrollLeft += after.left - (clientX - lx * newScale);
    view.scrollTop += after.top - (clientY - ly * newScale);
}

function toolGenealogyInit() {
    if (!genBuilt) {
        genBuilt = true;
        document.getElementById('gen-search').addEventListener('input', genOnSearch);
        enableViewGestures(document.getElementById('gen-view'), genZoom);
    }
    genDir = genDefaultDir();
    genApplyLangButtons();
    genApplyDirButton();
    genCatInit();
    // À l'ouverture : Adam et ses trois fils, les autres branches repliées.
    genCollapseAll();
    genScrollTo('adam');
}

function genApplyDirButton() {
    const btn = document.getElementById('gen-dir');
    const label = t(genDir === 'v' ? 'tools.genealogy_dir_to_h' : 'tools.genealogy_dir_to_v');
    btn.setAttribute('aria-label', label);
    btn.title = label;
}

// Le sens de l'arbre : vertical (Adam en haut, par défaut) ou horizontal (Adam à gauche). Le choix est mémorisé.
function genToggleDir() {
    genDir = genDir === 'v' ? 'h' : 'v';
    genDirChosen = true;
    try { localStorage.setItem('genealogyDir', genDir); } catch (e) { /* stockage indisponible */ }
    genApplyDirButton();
    genRender();
    genScrollTo('adam');
}

function genApplyLangButtons() {
    document.getElementById('gen-lang-fr').setAttribute('aria-pressed', genLang === 'fr' ? 'true' : 'false');
    document.getElementById('gen-lang-he').setAttribute('aria-pressed', genLang === 'he' ? 'true' : 'false');
    const view = document.getElementById('gen-view');
    view.setAttribute('lang', genLang);
}

function genSetLang(lang) {
    genLang = lang === 'he' ? 'he' : 'fr';
    try { localStorage.setItem('genealogyLang', genLang); } catch (e) { /* stockage indisponible */ }
    genApplyLangButtons();
    genRender();
    genCatRender();
}

// Les mentions de la carte (mère, concubine…) suivent la langue choisie.
const GEN_HE = { mother: 'אמו:', concubinage: 'פילגש', interdite: 'נישואין אסורים', ex: 'מת בכנען' };
function genWord(key) { return genLang === 'he' ? GEN_HE[key] : t('tools.genealogy_' + ({ concubinage: 'concubine', interdite: 'forbidden' }[key] || key)); }

function genUnionLabel(kind) {
    return kind === 'concubinage' || kind === 'interdite' ? genWord(kind) : '';
}

// Les conjoints d'une personne : ses propres unions, et pour une femme, le mari qui la déclare (même union, vue des deux côtés).
function genSpouses(p) {
    const out = p.unions.slice();
    if (p.sex === 'f') {
        GenealogyCore.PEOPLE.forEach(q => q.unions.forEach(u => {
            if (u[0] === p.id && !out.some(o => o[0] === q.id)) out.push([q.id, u[1]]);
        }));
    }
    return out;
}

function genBuildCard(p) {
    const card = document.createElement('div');
    card.className = 'gen-card ' + (p.sex === 'f' ? 'is-woman' : 'is-man') + (p.far ? ' is-far' : '') + (p.ex ? ' is-ex' : '');
    card.dataset.id = p.id;
    card.setAttribute('lang', genLang);
    const name = document.createElement('div');
    name.className = 'gen-name';
    name.textContent = genName(p);
    if (p.nation) {
        const n = document.createElement('span');
        n.className = 'gen-nation';
        n.textContent = String(p.nation);
        n.title = t('tools.genealogy_nation', { n: p.nation });
        name.appendChild(n);
    }
    card.appendChild(name);
    if (p.mother) {
        const mo = GenealogyCore.byId(p.mother);
        const tag = document.createElement('div');
        tag.className = 'gen-mother';
        tag.textContent = genWord('mother') + ' ' + genName(mo);
        card.appendChild(tag);
    }
    genSpouses(p).forEach(u => {
        const partner = GenealogyCore.byId(u[0]);
        const chip = document.createElement('div');
        chip.className = 'gen-spouse ' + (partner.sex === 'f' ? 'is-woman' : 'is-man');
        const label = genUnionLabel(u[1]);
        chip.textContent = '⚭ ' + genName(partner) + (label ? ' (' + label + ')' : '');
        card.appendChild(chip);
    });
    if (p.ex) {
        const ex = document.createElement('div');
        ex.className = 'gen-mother';
        ex.textContent = genWord('ex');
        card.appendChild(ex);
    }
    return card;
}

function genMeasure() {
    const probe = document.createElement('div');
    probe.className = 'gen-stage gen-probe';
    probe.setAttribute('aria-hidden', 'true');
    document.getElementById('gen-view').appendChild(probe);
    genHeights = {};
    GenealogyCore.PEOPLE.forEach(p => {
        const card = genBuildCard(p);
        probe.appendChild(card);
        genHeights[p.id] = card.offsetHeight || 40;
    });
    probe.remove();
}

function genRender() {
    genMeasure();
    const vertical = genDir === 'v';
    const L = GenealogyCore.layout(genCollapsed, id => (vertical ? GEN_CARD_W + GEN_GAP : genHeights[id]),
        { colStep: GEN_COL_STEP, cardWidth: GEN_CARD_W, gap: GEN_GAP });
    let maxDepth = 0;
    Object.keys(L.nodes).forEach(id => { maxDepth = Math.max(maxDepth, L.nodes[id].depth); });
    // En vertical, chaque génération a la hauteur de sa plus haute carte : pas de vide entre deux générations.
    const rowTop = [];
    let rowsHeight = 0;
    if (vertical) {
        const rowH = [];
        Object.keys(L.nodes).forEach(id => { const d = L.nodes[id].depth; rowH[d] = Math.max(rowH[d] || 0, genHeights[id]); });
        for (let d = 0; d <= maxDepth; d++) { rowTop[d] = rowsHeight; rowsHeight += rowH[d] + GEN_ROW_GAP; }
        rowsHeight -= GEN_ROW_GAP;
    }

    // Une boîte par personne, dans le sens choisi : en vertical, la génération descend et les frères se rangent à côté.
    genBoxes = {};
    Object.keys(L.nodes).forEach(id => {
        const n = L.nodes[id];
        genBoxes[id] = vertical
            ? { left: n.cy - GEN_CARD_W / 2, top: rowTop[n.depth], w: GEN_CARD_W, h: genHeights[id] }
            : { left: n.x, top: n.top, w: GEN_CARD_W, h: genHeights[id] };
    });
    const width = vertical ? L.height : L.width;
    const height = vertical ? rowsHeight : L.height;

    const scale = GEN_ZOOMS[genZoomIdx];
    const sizer = document.getElementById('gen-sizer');
    const stage = document.getElementById('gen-stage');
    sizer.style.width = Math.ceil(width * scale + 24) + 'px';
    sizer.style.height = Math.ceil(height * scale + 24) + 'px';
    stage.style.width = width + 'px';
    stage.style.height = height + 'px';
    stage.style.transform = 'scale(' + scale + ')';
    stage.classList.toggle('is-vertical', vertical);
    while (stage.firstChild) stage.removeChild(stage.firstChild);

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gen-lines');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('aria-hidden', 'true');
    L.edges.forEach(e => {
        const a = genBoxes[e.from], b = genBoxes[e.to];
        let d;
        if (vertical) {
            const x1 = a.left + a.w / 2, y1 = a.top + a.h, x2 = b.left + b.w / 2, y2 = b.top, mid = y1 + (y2 - y1) / 2;
            d = 'M' + x1 + ' ' + y1 + ' V' + mid + ' H' + x2 + ' V' + y2;
        } else {
            const x1 = a.left + a.w, y1 = a.top + a.h / 2, x2 = b.left, y2 = b.top + b.h / 2, mid = x1 + (x2 - x1) / 2;
            d = 'M' + x1 + ' ' + y1 + ' H' + mid + ' V' + y2 + ' H' + x2;
        }
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'gen-line' + (e.far ? ' is-far' : ''));
        svg.appendChild(path);
    });
    stage.appendChild(svg);

    Object.keys(L.nodes).forEach(id => {
        const b = genBoxes[id];
        const p = GenealogyCore.byId(id);
        const card = genBuildCard(p);
        card.style.left = b.left + 'px';
        card.style.top = b.top + 'px';
        card.style.width = GEN_CARD_W + 'px';
        if (id === genFocus) card.classList.add('is-focus');
        if (genCatSet[id]) { card.classList.add('is-cat'); card.style.setProperty('--cat-color', genCatColor); }
        const kids = GenealogyCore.childrenOf(id);
        if (kids.length) {
            const open = !genCollapsed[id];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gen-toggle';
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.setAttribute('aria-label', t(open ? 'tools.genealogy_fold' : 'tools.genealogy_unfold', { name: genName(p) }));
            btn.textContent = open ? '−' : '+' + GenealogyCore.descendantsCount(id);
            btn.onclick = () => {
                genCollapsed[id] = open;
                genRender();
                // Une branche qu'on déplie se montre tout de suite, au lieu de devoir être cherchée au doigt.
                if (!open) genRevealChildren(id);
            };
            card.appendChild(btn);
        }
        stage.appendChild(card);
    });
}

// Fait défiler la vue pour centrer une personne (Adam au départ, la personne cherchée ensuite).
function genScrollTo(id) {
    const b = genBoxes[id];
    if (!b) return;
    const view = document.getElementById('gen-view');
    const scale = GEN_ZOOMS[genZoomIdx];
    view.scrollTo({
        left: Math.max(0, (b.left + b.w / 2) * scale - view.clientWidth / 2),
        top: Math.max(0, (b.top + b.h / 2) * scale - view.clientHeight / 3)
    });
}

// Amène à l'écran les enfants d'une branche qu'on vient de déplier : la vue se déplace (le minimum possible), et si la
// branche est plus grande que l'écran, son début s'aligne sur le bord. Pas utilisé par « Tout déplier ».
function genRevealChildren(id) {
    const kids = GenealogyCore.childrenOf(id).filter(k => genBoxes[k]);
    if (!kids.length) return;
    const scale = GEN_ZOOMS[genZoomIdx];
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    kids.forEach(k => {
        const bx = genBoxes[k];
        l = Math.min(l, bx.left); t = Math.min(t, bx.top);
        r = Math.max(r, bx.left + bx.w); b = Math.max(b, bx.top + bx.h);
    });
    const view = document.getElementById('gen-view');
    const pad = 12;
    const place = (start, end, current, size) => {
        if (end - start > size) return start - pad;
        if (start < current) return start - pad;
        if (end > current + size) return end - size + pad;
        return current;
    };
    const left = place(l * scale, r * scale, view.scrollLeft, view.clientWidth);
    const top = place(t * scale, b * scale, view.scrollTop, view.clientHeight);
    view.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: 'smooth' });
}

// Boutons − / + (sans point) : la vue garde son centre. Pincement (point = milieu des doigts) : le point reste sous les doigts.
function genZoom(delta, clientX, clientY) {
    const next = Math.min(GEN_ZOOMS.length - 1, Math.max(0, genZoomIdx + delta));
    if (next === genZoomIdx) return;
    const apply = () => { genZoomIdx = next; genRender(); };
    if (clientX === undefined) apply();
    else zoomKeepingPoint(document.getElementById('gen-stage'), document.getElementById('gen-view'), clientX, clientY, apply);
}

// Replie toutes les branches sauf celle d'Adam, pour que l'arbre s'ouvre sur Adam et ses fils.
function genCollapseAll() {
    genCollapsed = {};
    GenealogyCore.parentsIds().forEach(id => { if (id !== 'adam') genCollapsed[id] = true; });
    genRender();
}

function genExpandAll() {
    genCollapsed = {};
    genRender();
}

function genOnSearch() {
    const box = document.getElementById('gen-results');
    while (box.firstChild) box.removeChild(box.firstChild);
    const found = GenealogyCore.search(document.getElementById('gen-search').value, 8);
    found.forEach(p => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gen-result ' + (p.sex === 'f' ? 'is-woman' : 'is-man');
        b.textContent = genName(p);
        b.onclick = () => genGoTo(p.id);
        li.appendChild(b);
        box.appendChild(li);
    });
}

// Va à une personne : déplie ses ancêtres (une femme sans père : son conjoint), la centre et la met en valeur.
function genGoTo(id) {
    let target = id;
    const p = GenealogyCore.byId(target);
    if (p && !p.father && p.id !== 'adam') {
        const husband = GenealogyCore.PEOPLE.find(q => q.unions.some(u => u[0] === p.id));
        if (husband) target = husband.id;
    }
    GenealogyCore.ancestorsOf(target).forEach(a => { delete genCollapsed[a]; });
    delete genCollapsed[target];
    genFocus = target;
    document.getElementById('gen-search').value = '';
    genOnSearch();
    genRender();
    genScrollTo(target);
}

// --- Les catégories ---------------------------------------------------------------------------------------------------------------------
// Un menu, à droite des repères « Hommes » et « Femmes », qui range les personnes par catégorie (origines : dix générations, patriarches et matriarches,
// douze fils de Jacob, soixante-dix nations ; époques : juges, rois, prophètes, les 48 prophètes de Rachi, la chronologie des règnes). Chaque catégorie a une
// couleur : celle de son point dans le menu, de sa liste, et du contour des cartes de l'arbre. Les données sont dans js/genealogyCore.js (CATEGORIES)
// et js/genealogyChronology.js.
function genCatIds(c) {
    if (!c.special) return c.ids;
    if (c.id === 'prophets48') return GenealogyChronology.PROPHETS48.filter(p => p.id).map(p => p.id);
    return GenealogyChronology.JUDAH.concat(GenealogyChronology.ISRAEL).filter(k => k.id).map(k => k.id);
}

function genCatInit() {
    const menu = document.getElementById('gen-cat-menu');
    if (!menu) return;
    while (menu.firstChild) menu.removeChild(menu.firstChild);
    ['origins', 'time'].forEach(group => {
        const title = document.createElement('p');
        title.className = 'gen-cat-group';
        title.textContent = t('tools.genealogy_cat_group_' + group);
        menu.appendChild(title);
        const row = document.createElement('div');
        row.className = 'gen-cat-row';
        GenealogyCore.CATEGORIES.filter(c => c.group === group).forEach(c => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gen-cat-btn';
            btn.id = 'gen-cat-' + c.id;
            btn.setAttribute('aria-pressed', genCat === c.id ? 'true' : 'false');
            const dot = document.createElement('span');
            dot.className = 'gen-cat-dot';
            dot.style.background = c.color;
            btn.appendChild(dot);
            btn.appendChild(document.createTextNode(t('tools.genealogy_cat_' + c.id)));
            btn.onclick = () => genCatPick(c.id);
            row.appendChild(btn);
        });
        menu.appendChild(row);
    });
    genCatRender();
}

function genCatToggleMenu(force) {
    const menu = document.getElementById('gen-cat-menu'), toggle = document.getElementById('gen-cat-toggle');
    const open = typeof force === 'boolean' ? force : menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

// Choisit une catégorie (un second appui sur la même la retire) : le menu se referme, la liste s'affiche, l'arbre entoure ses personnes.
function genCatPick(id) {
    genCat = genCat === id ? '' : id;
    genCatToggleMenu(false);
    genCatApply();
}

function genCatApply() {
    const c = genCat ? GenealogyCore.category(genCat) : null;
    genCatSet = {};
    genCatColor = c ? c.color : '';
    if (c) genCatIds(c).forEach(id => { genCatSet[id] = true; });
    document.querySelectorAll('#gen-cat-menu .gen-cat-btn').forEach(b => b.setAttribute('aria-pressed', c && b.id === 'gen-cat-' + c.id ? 'true' : 'false'));
    genCatRender();
    genRender();
}

function genCatRender() {
    const panel = document.getElementById('gen-cat-panel'), toggleDot = document.getElementById('gen-cat-dot'), label = document.getElementById('gen-cat-toggle-label');
    if (!panel) return;
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    const c = genCat ? GenealogyCore.category(genCat) : null;
    panel.classList.toggle('hidden', !c);
    toggleDot.classList.toggle('hidden', !c);
    label.textContent = c ? t('tools.genealogy_cat_' + c.id) : t('tools.genealogy_cat_button');
    if (!c) return;
    toggleDot.style.background = c.color;
    panel.style.setProperty('--cat-color', c.color);
    const head = document.createElement('div');
    head.className = 'gen-cat-head';
    const title = document.createElement('strong');
    title.textContent = t('tools.genealogy_cat_' + c.id);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'gen-cat-close';
    close.setAttribute('aria-label', t('tools.genealogy_cat_close'));
    close.textContent = '×';
    close.onclick = () => genCatPick(c.id);
    head.appendChild(title);
    head.appendChild(close);
    panel.appendChild(head);
    const note = document.createElement('p');
    note.className = 'gen-cat-note';
    note.textContent = t('tools.genealogy_cat_note_' + c.id);
    panel.appendChild(note);
    const body = document.createElement('div');
    body.className = 'gen-cat-body';
    panel.appendChild(body);
    if (c.id === 'prophets48') genCatProphets48(body);
    else if (c.id === 'chrono') genCatChrono(body);
    else genCatList(body, c);
}

// Une liste de personnes (boutons) ; une catégorie numérotée (les soixante-dix nations) préfixe le numéro.
function genCatList(body, c) {
    const list = document.createElement('ol');
    list.className = 'gen-role-list';
    c.ids.forEach(id => {
        const p = GenealogyCore.byId(id);
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gen-result ' + (p.sex === 'f' ? 'is-woman' : 'is-man');
        b.dataset.id = id;
        b.textContent = (c.numbered ? p.nation + ' · ' : '') + genName(p);
        b.onclick = () => genGoTo(id);
        li.appendChild(b);
        list.appendChild(li);
    });
    body.appendChild(list);
}

function genEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
}

// Les 48 prophètes de Rachi : un numéro, le nom (en hébreu et en français), le verset ; un bouton mène à la personne quand elle est dans l'arbre.
function genCatProphets48(body) {
    const G = GenealogyChronology;
    const list = genEl('ol', 'gen-p48');
    G.PROPHETS48.forEach(p => {
        const li = genEl('li', 'gen-p48-row' + (p.unknown ? ' is-unknown' : ''));
        li.appendChild(genEl('span', 'gen-p48-n', p.unknown ? p.n + '–' + (p.n + p.unknown - 1) : String(p.n)));
        const main = genEl('div', 'gen-p48-main');
        const name = genEl('div', 'gen-p48-name');
        if (p.id && GenealogyCore.byId(p.id)) {
            const b = genEl('button', 'gen-result is-man', p.fr);
            b.type = 'button';
            b.onclick = () => genGoTo(p.id);
            name.appendChild(b);
        } else {
            name.appendChild(genEl('span', 'gen-p48-fr', p.fr));
        }
        const he = genEl('span', 'gen-p48-he', p.he);
        he.lang = 'he';
        he.dir = 'rtl';
        name.appendChild(he);
        main.appendChild(name);
        if (p.ref) main.appendChild(genEl('div', 'gen-p48-ref', p.ref));
        if (p.note) main.appendChild(genEl('div', 'gen-p48-note', p.note));
        li.appendChild(main);
        list.appendChild(li);
    });
    body.appendChild(list);
    body.appendChild(genEl('p', 'gen-cat-note', t('tools.genealogy_p48_source', { src: G.PROPHETS48_SOURCE })));
}

// La chronologie des règnes : les repères des deux datations (tradition et historiens), puis les rois de Juda et d'Israël avec la durée du texte et les
// dates du chronologue choisi.
function genCatChrono(body) {
    const G = GenealogyChronology;
    body.appendChild(genEl('h4', 'gen-chrono-h', t('tools.genealogy_chrono_anchors')));
    const anchors = genEl('div', 'gen-chrono-anchors');
    [t('tools.genealogy_chrono_event'), t('tools.genealogy_chrono_tradition'), t('tools.genealogy_chrono_historians')].forEach((h, i) => anchors.appendChild(genEl('div', 'gen-chrono-th' + (i ? '' : ' is-first'), h)));
    G.ANCHORS.forEach(a => {
        anchors.appendChild(genEl('div', 'gen-chrono-td is-first', t('tools.genealogy_anchor_' + a.id)));
        anchors.appendChild(genEl('div', 'gen-chrono-td', t('tools.genealogy_chrono_am', { am: a.am, bce: G.anchorBce(a) })));
        anchors.appendChild(genEl('div', 'gen-chrono-td', a.historians));
    });
    body.appendChild(anchors);
    body.appendChild(genEl('p', 'gen-cat-note', t('tools.genealogy_chrono_gap')));
    // Le choix : la tradition (Seder Olam) ou l'un des quatre chronologues.
    const field = genEl('label', 'gen-chrono-field', t('tools.genealogy_chrono_scholar') + ' ');
    const select = genEl('select', 'tool-input');
    select.id = 'gen-chrono-scholar';
    const optTrad = genEl('option', '', t('tools.genealogy_chrono_tradition'));
    optTrad.value = 'tradition';
    select.appendChild(optTrad);
    G.SCHOLARS.forEach(sc => { const o = genEl('option', '', G.SCHOLAR_NAMES[sc]); o.value = sc; select.appendChild(o); });
    select.value = genChronoScholar;
    select.onchange = () => { genChronoScholar = select.value; genCatRender(); };
    field.appendChild(select);
    body.appendChild(field);
    const trad = genChronoScholar === 'tradition';
    if (trad) body.appendChild(genEl('p', 'gen-cat-note', G.TRADITION_METHOD));
    [['judah', G.JUDAH], ['israel', G.ISRAEL]].forEach(([key, kings]) => {
        body.appendChild(genEl('h4', 'gen-chrono-h', t('tools.genealogy_cat_' + key)));
        const table = genEl('div', 'gen-chrono-table');
        kings.forEach(king => {
            const row = genEl('div', 'gen-chrono-row');
            const name = genEl('div', 'gen-chrono-name');
            if (king.id && GenealogyCore.byId(king.id)) {
                const b = genEl('button', 'gen-result is-man', king.fr);
                b.type = 'button';
                b.onclick = () => genGoTo(king.id);
                name.appendChild(b);
            } else {
                name.appendChild(genEl('span', '', king.fr));
            }
            row.appendChild(name);
            row.appendChild(genEl('div', 'gen-chrono-len', king.length));
            row.appendChild(trad ? genChronoTradCell(king) : genEl('div', 'gen-chrono-dates', G.dateOf(king, genChronoScholar)));
            table.appendChild(row);
        });
        body.appendChild(table);
    });
    body.appendChild(genEl('p', 'gen-cat-note', t('tools.genealogy_chrono_source', { src: G.CHRONOLOGY_SOURCE })));
}

// La case « Tradition » d'un roi : les années de la création (✓ ancré, ≈ ajusté) et en dessous les années avant J.-C. ; pour un roi d'Israël, l'année du roi de Juda.
function genChronoTradCell(king) {
    const G = GenealogyChronology;
    const cell = genEl('div', 'gen-chrono-dates is-trad');
    const tr = G.traditional(king);
    if (!tr) { cell.textContent = '—'; return cell; }
    if (tr.sync && tr.status === 'sync') {
        cell.appendChild(genEl('span', 'gen-chrono-sync', t('tools.genealogy_chrono_sync', { year: tr.sync.year, king: t('tools.genealogy_chrono_king_' + tr.sync.of) })));
        return cell;
    }
    const mark = tr.status === 'anchor' ? ' ✓' : (tr.status === 'approx' ? ' ≈' : '');
    const am = tr.end !== undefined && tr.end !== tr.start ? tr.start + '–' + tr.end : String(tr.start);
    const bc = tr.end !== undefined && tr.end !== tr.start ? tr.startBce + '–' + tr.endBce : String(tr.startBce);
    cell.appendChild(genEl('span', 'gen-chrono-am', t('tools.genealogy_chrono_trad_am', { am: am }) + mark));
    cell.appendChild(genEl('span', 'gen-chrono-bce', t('tools.genealogy_chrono_trad_bce', { bce: bc })));
    if (tr.note) cell.title = tr.note;
    if (tr.sync) cell.title = (cell.title ? cell.title + ' ' : '') + tr.sync.ref;
    return cell;
}
