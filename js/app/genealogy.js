// =========================================================================
// === LA GÉNÉALOGIE BIBLIQUE (écran de la boîte à outils) ===
// =========================================================================
// Trois présentations du même arbre, d'Adam à Jésus, au choix (sélecteur « Fiche · Lignées · Arbre », choix mémorisé) :
// - la fiche (par défaut) : une personne au centre, avec sa lignée depuis Adam, ses parents, ses conjoints, ses frères et sœurs et ses enfants
//   rangés par mère ; toucher un nom ouvre sa fiche ;
// - les lignées : l'arbre en sommaire, qu'on lit de haut en bas ; une suite père → fils unique tient sur une ligne, et un bandeau rappelle la
//   branche où l'on se trouve ;
// - l'arbre : une carte par personne (fond bleu clair pour les hommes, rose clair pour les femmes), des traits coudés entre parents et enfants,
//   des pointillés pour les descendants lointains. En hauteur (par défaut), la mise en page est compacte : les branches s'emboîtent et les
//   frères sans descendance s'empilent en colonne ; le bouton 🔄 passe à l'arbre en largeur (Adam à gauche).
// Toucher une personne dans les lignées ou l'arbre la sélectionne (sa lignée jusqu'à Adam est soulignée) et propose d'ouvrir sa fiche ;
// changer de présentation garde la personne choisie. Deux boutons collés en haut à droite choisissent la langue des noms : « A » (français,
// par défaut) ou « א » (hébreu). Les données et les mises en page sont dans js/genealogyCore.js (testé). Tout le texte passe par textContent.

const GEN_CARD_W = 132;
const GEN_COL_STEP = 166;
const GEN_GAP = 10;
const GEN_ROW_GAP = 26;
const GEN_PILE_INDENT = 12;
const GEN_ZOOMS = [0.4, 0.55, 0.7, 0.85, 1, 1.25];
const GEN_VIEWS = ['family', 'lines', 'tree'];
let genLang = 'fr';
let genDir = 'v';
let genView = 'family';
let genLinesCollapsed = {};   // les branches repliées dans les lignées (indépendantes de celles de l'arbre)
let genLineRows = [];         // les lignes affichées : { el, ids }, pour le bandeau de position
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

// Un choix déjà fait par le joueur (bouton 🔄, sélecteur de présentation) est mémorisé. Sans choix, l'arbre s'ouvre en hauteur,
// dans sa mise en page compacte, et la présentation est la fiche.
let genDirChosen = false;
try {
    if (localStorage.getItem('genealogyLang') === 'he') genLang = 'he';
    const savedDir = localStorage.getItem('genealogyDir');
    if (savedDir === 'h' || savedDir === 'v') { genDir = savedDir; genDirChosen = true; }
    const savedView = localStorage.getItem('genealogyView');
    if (GEN_VIEWS.includes(savedView)) genView = savedView;
} catch (e) { /* stockage indisponible */ }

function genDefaultDir() {
    return genDirChosen ? genDir : 'v';
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
        const lines = document.getElementById('gen-lines-scroll');
        let raf = 0;
        lines.addEventListener('scroll', () => {
            if (!raf) raf = requestAnimationFrame(() => { raf = 0; genLinesUpdatePath(); });
        });
    }
    genDir = genDefaultDir();
    genApplyLangButtons();
    genApplyDirButton();
    genCatInit();
    // À l'ouverture : la fiche d'Adam ; l'arbre montre Adam et ses trois fils (les autres branches repliées), les lignées sont dépliées.
    genFocus = '';
    genUpdateFocusBar();
    genCollapsed = {};
    GenealogyCore.parentsIds().forEach(id => { if (id !== 'adam') genCollapsed[id] = true; });
    genLinesCollapsed = {};
    genApplyView();
    genRender();
    genShowFocus('adam');
}

// --- Le choix de la présentation ----------------------------------------------------------------------------------------------------
function genApplyView() {
    GEN_VIEWS.forEach(v => {
        const btn = document.getElementById('gen-view-' + v);
        if (btn) btn.setAttribute('aria-pressed', v === genView ? 'true' : 'false');
    });
    document.getElementById('gen-family').classList.toggle('hidden', genView !== 'family');
    document.getElementById('gen-lines').classList.toggle('hidden', genView !== 'lines');
    document.getElementById('gen-view').classList.toggle('hidden', genView !== 'tree');
    document.getElementById('screen-tool-genealogy').dataset.view = genView;
}

// Change de présentation en gardant la personne choisie (sinon Adam) en vue.
function genSetView(v) {
    if (!GEN_VIEWS.includes(v) || v === genView) return;
    genView = v;
    try { localStorage.setItem('genealogyView', v); } catch (e) { /* stockage indisponible */ }
    genApplyView();
    if (genFocus) {
        genGoTo(genFocus);
    } else {
        genRender();
        genShowFocus('adam');
    }
}

// Montre une personne dans la présentation en cours, sans changer ce qui est replié.
function genShowFocus(id) {
    if (genView === 'tree') genScrollTo(GenealogyCore.anchorOf(id) || 'adam');
    else if (genView === 'lines') genLinesScrollTo(GenealogyCore.anchorOf(id) || 'adam');
    else document.getElementById('screen-tool-genealogy').scrollTo({ top: 0 });
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
    genScrollTo(genFocus ? (GenealogyCore.anchorOf(genFocus) || 'adam') : 'adam');
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
    genUpdateFocusBar();
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

// Redessine la présentation en cours.
function genRender() {
    if (genView === 'family') genRenderFamily();
    else if (genView === 'lines') genRenderLines();
    else genRenderTree();
}

// La personne choisie et sa lignée jusqu'à Adam ({ id: true }) : soulignées dans l'arbre et les lignées.
function genLineageSet() {
    const set = {};
    if (!genFocus) return set;
    const anchor = GenealogyCore.anchorOf(genFocus);
    if (!anchor) return set;
    GenealogyCore.ancestorsOf(anchor).forEach(a => { set[a] = true; });
    set[anchor] = true;
    return set;
}

// Toucher une personne dans l'arbre ou les lignées la choisit (un second toucher la retire).
function genPick(id) {
    genFocus = genFocus === id ? '' : id;
    genUpdateFocusBar();
    genRender();
}

// --- L'arbre ---------------------------------------------------------------------------------------------------------------------------
function genRenderTree() {
    genMeasure();
    const vertical = genDir === 'v';
    let width, height, edges;
    genBoxes = {};
    if (vertical) {
        // En hauteur : la mise en page compacte. Chaque rangée (une génération) a la hauteur de sa plus haute carte.
        const L = GenealogyCore.compactLayout(genCollapsed, { cardWidth: GEN_CARD_W, gap: GEN_GAP + 4, pileIndent: GEN_PILE_INDENT });
        const rowH = [];
        Object.keys(L.nodes).forEach(id => { const r = L.nodes[id].row; rowH[r] = Math.max(rowH[r] || 0, genHeights[id]); });
        const rowTop = [];
        let y = 0;
        for (let r = 0; r < L.rows; r++) { rowTop[r] = y; y += (rowH[r] || 0) + GEN_ROW_GAP; }
        Object.keys(L.nodes).forEach(id => {
            const n = L.nodes[id];
            genBoxes[id] = { left: n.x - GEN_CARD_W / 2, top: rowTop[n.row], w: GEN_CARD_W, h: genHeights[id] };
        });
        width = L.width;
        height = y - GEN_ROW_GAP;
        edges = L.edges;
    } else {
        // En largeur : la mise en page d'origine, Adam à gauche.
        const L = GenealogyCore.layout(genCollapsed, id => genHeights[id], { colStep: GEN_COL_STEP, cardWidth: GEN_CARD_W, gap: GEN_GAP });
        Object.keys(L.nodes).forEach(id => {
            const n = L.nodes[id];
            genBoxes[id] = { left: n.x, top: n.top, w: GEN_CARD_W, h: genHeights[id] };
        });
        width = L.width;
        height = L.height;
        edges = L.edges;
    }

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

    const lineage = genLineageSet();
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gen-lines');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('aria-hidden', 'true');
    const lit = [];
    const addPath = (d, cls, on) => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', cls + (on ? ' is-lineage' : ''));
        if (on) lit.push(path); else svg.appendChild(path);
    };
    edges.forEach(e => {
        const a = genBoxes[e.from];
        if (e.pile) {
            // Une pile : un trait descend le long des cartes, une petite branche va à chacune.
            const first = genBoxes[e.pile[0]], last = genBoxes[e.pile[e.pile.length - 1]];
            const x1 = a.left + a.w / 2, y1 = a.top + a.h, mid = y1 + GEN_ROW_GAP / 2, sx = first.left - GEN_PILE_INDENT / 2;
            let d = 'M' + x1 + ' ' + y1 + ' V' + mid + ' H' + sx + ' V' + (last.top + last.h / 2);
            e.pile.forEach(k => { const b = genBoxes[k]; d += ' M' + sx + ' ' + (b.top + b.h / 2) + ' H' + b.left; });
            addPath(d, 'gen-line', false);
            const hit = lineage[e.from] && e.pile.find(k => lineage[k]);
            if (hit) {
                const b = genBoxes[hit];
                addPath('M' + x1 + ' ' + y1 + ' V' + mid + ' H' + sx + ' V' + (b.top + b.h / 2) + ' H' + b.left, 'gen-line', true);
            }
            return;
        }
        const b = genBoxes[e.to];
        let d;
        if (vertical) {
            const x1 = a.left + a.w / 2, y1 = a.top + a.h, x2 = b.left + b.w / 2, y2 = b.top, mid = y1 + GEN_ROW_GAP / 2;
            d = 'M' + x1 + ' ' + y1 + ' V' + mid + ' H' + x2 + ' V' + y2;
        } else {
            const x1 = a.left + a.w, y1 = a.top + a.h / 2, x2 = b.left, y2 = b.top + b.h / 2, mid = x1 + (x2 - x1) / 2;
            d = 'M' + x1 + ' ' + y1 + ' H' + mid + ' V' + y2 + ' H' + x2;
        }
        addPath(d, 'gen-line' + (e.far ? ' is-far' : ''), !!(lineage[e.from] && lineage[e.to]));
    });
    lit.forEach(p => svg.appendChild(p));
    stage.appendChild(svg);

    const focusAnchor = genFocus ? GenealogyCore.anchorOf(genFocus) : '';
    Object.keys(genBoxes).forEach(id => {
        const b = genBoxes[id];
        const p = GenealogyCore.byId(id);
        const card = genBuildCard(p);
        card.style.left = b.left + 'px';
        card.style.top = b.top + 'px';
        card.style.width = GEN_CARD_W + 'px';
        if (id === focusAnchor) card.classList.add('is-focus');
        else if (lineage[id]) card.classList.add('is-lineage');
        // Toucher une carte la choisit : sa lignée est soulignée, et la barre d'au-dessus propose sa fiche et la chronologie.
        card.onclick = e => {
            if (e.target.closest && e.target.closest('.gen-toggle')) return;
            genPick(id);
        };
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

// --- Les lignées -------------------------------------------------------------------------------------------------------------------
const GEN_LINE_INDENT = 14;

function genGenLabel(a, b) {
    return a === b ? t('tools.genealogy_gen_short', { n: a }) : t('tools.genealogy_gen_range', { a: a, b: b });
}

// Un nom qu'on peut toucher (lignées, bandeau) : couleur de son sexe, contour de la catégorie choisie, mis en valeur s'il est choisi.
function genNameButton(id, cls, onclick) {
    const p = GenealogyCore.byId(id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls + ' ' + (p.sex === 'f' ? 'is-woman' : 'is-man');
    b.dataset.id = id;
    b.setAttribute('lang', genLang);
    b.textContent = genName(p);
    if (genCatSet[id]) { b.classList.add('is-cat'); b.style.setProperty('--cat-color', genCatColor); }
    b.onclick = onclick;
    return b;
}

function genRenderLines() {
    const box = document.getElementById('gen-lines-list');
    while (box.firstChild) box.removeChild(box.firstChild);
    box.setAttribute('lang', genLang);
    box.dir = genLang === 'he' ? 'rtl' : 'ltr';
    const lineage = genLineageSet();
    const focus = genFocus;
    genLineRows = [];
    const frag = document.createDocumentFragment();
    GenealogyCore.outline(genLinesCollapsed).forEach(r => {
        const last = r.ids[r.ids.length - 1];
        const kids = GenealogyCore.childrenOf(last);
        const row = document.createElement('div');
        row.className = 'gen-ln-row';
        row.style.paddingInlineStart = (r.level * GEN_LINE_INDENT) + 'px';
        row.style.backgroundSize = (r.level * GEN_LINE_INDENT) + 'px 100%';
        if (kids.length) {
            const open = !genLinesCollapsed[last];
            const tg = document.createElement('button');
            tg.type = 'button';
            tg.className = 'gen-ln-toggle';
            tg.textContent = open ? '▾' : '▸';
            tg.setAttribute('aria-expanded', open ? 'true' : 'false');
            tg.setAttribute('aria-label', t(open ? 'tools.genealogy_fold' : 'tools.genealogy_unfold', { name: genName(GenealogyCore.byId(last)) }));
            tg.onclick = () => { genLinesCollapsed[last] = open; genRenderLines(); };
            row.appendChild(tg);
        } else {
            row.appendChild(genEl('span', 'gen-ln-space'));
        }
        const body = genEl('div', 'gen-ln-body');
        r.ids.forEach((id, i) => {
            if (i) body.appendChild(genEl('span', 'gen-ln-arrow', genLang === 'he' ? '‹' : '›'));
            const b = genNameButton(id, 'gen-ln-name' + (r.ids.length > 1 ? ' is-chain' : ''), () => genPick(id));
            if (id === focus) b.classList.add('is-focus');
            else if (lineage[id]) b.classList.add('is-lineage');
            body.appendChild(b);
        });
        body.appendChild(genEl('span', 'gen-ln-meta', genGenLabel(GenealogyCore.generationOf(r.ids[0]), GenealogyCore.generationOf(last))));
        if (kids.length && genLinesCollapsed[last]) body.appendChild(genEl('span', 'gen-ln-badge', '+' + GenealogyCore.descendantsCount(last)));
        const spouses = genSpouses(GenealogyCore.byId(last));
        if (spouses.length) {
            const sp = genEl('div', 'gen-ln-spouses', '⚭ ');
            spouses.forEach((u, i) => {
                if (i) sp.appendChild(document.createTextNode(', '));
                const b = genNameButton(u[0], 'gen-ln-spouse', () => genPick(u[0]));
                if (u[0] === focus) b.classList.add('is-focus');
                sp.appendChild(b);
            });
            body.appendChild(sp);
        }
        row.appendChild(body);
        frag.appendChild(row);
        genLineRows.push({ el: row, ids: r.ids });
    });
    box.appendChild(frag);
    genLinesUpdatePath();
}

// Le bandeau des lignées : la branche de la première ligne visible, depuis Adam (le début est abrégé quand elle est longue).
function genLinesUpdatePath() {
    const bar = document.getElementById('gen-lines-path');
    const scroller = document.getElementById('gen-lines-scroll');
    if (!bar || !genLineRows.length) return;
    const top = scroller.scrollTop + 2;
    let lo = 0, hi = genLineRows.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (genLineRows[mid].el.offsetTop <= top) lo = mid; else hi = mid - 1;
    }
    const ids = genLineRows[lo].ids;
    let trail = GenealogyCore.ancestorsOf(ids[0]).reverse().concat(ids);
    const cut = trail.length > 6;
    if (cut) trail = [trail[0]].concat(trail.slice(-5));
    while (bar.firstChild) bar.removeChild(bar.firstChild);
    bar.setAttribute('lang', genLang);
    bar.dir = genLang === 'he' ? 'rtl' : 'ltr';
    const arrow = genLang === 'he' ? '‹' : '›';
    trail.forEach((id, i) => {
        if (i) bar.appendChild(genEl('span', 'gen-ln-sep', i === 1 && cut ? arrow + ' … ' + arrow : arrow));
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = genName(GenealogyCore.byId(id));
        b.onclick = () => genLinesScrollTo(id);
        bar.appendChild(b);
    });
    genScrollToEnd(bar);
}

// Fait défiler un bandeau jusqu'à son dernier élément (à gauche en hébreu, le bandeau allant de droite à gauche).
function genScrollToEnd(el) {
    el.scrollLeft = el.dir === 'rtl' ? -el.scrollWidth : el.scrollWidth;
}

// Fait défiler les lignées jusqu'à la ligne d'une personne (si elle est affichée).
function genLinesScrollTo(id) {
    const scroller = document.getElementById('gen-lines-scroll');
    const row = genLineRows.find(r => r.ids.includes(id));
    if (!row) return;
    scroller.scrollTop = Math.max(0, row.el.offsetTop - scroller.clientHeight / 3);
    genLinesUpdatePath();
}

// --- La fiche ----------------------------------------------------------------------------------------------------------------------
// Une personne de la fiche : un bouton qui ouvre sa propre fiche.
function genFamilyCard(id, sub) {
    const p = GenealogyCore.byId(id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gen-fam-card ' + (p.sex === 'f' ? 'is-woman' : 'is-man') + (p.far ? ' is-far' : '');
    if (genCatSet[id]) { b.classList.add('is-cat'); b.style.setProperty('--cat-color', genCatColor); }
    const name = genEl('span', 'gen-fam-name', genName(p));
    name.setAttribute('lang', genLang);
    b.appendChild(name);
    if (sub) b.appendChild(genEl('span', 'gen-fam-sub', sub));
    b.onclick = () => genOpenFamily(id);
    return b;
}

function genOpenFamily(id) {
    genFocus = id;
    genUpdateFocusBar();
    genRenderFamily();
    const box = document.getElementById('gen-family');
    const screen = document.getElementById('screen-tool-genealogy');
    // La fiche se montre depuis son haut (le fil de la lignée), sans remonter jusqu'à la recherche si elle est déjà en vue.
    if (box.getBoundingClientRect().top < 0) screen.scrollTo({ top: screen.scrollTop + box.getBoundingClientRect().top - 8 });
}

function genFamilySection(title, count) {
    const sec = genEl('section', 'gen-fam-sec');
    const h = genEl('h3', 'gen-fam-h');
    h.appendChild(genEl('span', '', title));
    if (count !== undefined) h.appendChild(genEl('span', 'gen-fam-count', String(count)));
    sec.appendChild(h);
    return sec;
}

// Les notices, lues une seule fois (data/genealogie-bios.json).
let genBiosPromise = null;
function genLoadBios() {
    if (!genBiosPromise) genBiosPromise = fetch('data/genealogie-bios.json').then(r => r.json()).catch(() => { genBiosPromise = null; return null; });
    return genBiosPromise;
}

function genRenderFamily() {
    const box = document.getElementById('gen-family');
    while (box.firstChild) box.removeChild(box.firstChild);
    const id = genFocus || 'adam';
    const p = GenealogyCore.byId(id);

    // Le fil de la lignée, d'Adam à la personne : chaque maillon ouvre sa fiche.
    const lineage = GenealogyCore.lineageOf(id);
    if (lineage.length) {
        const path = genEl('nav', 'gen-fam-path');
        path.dir = genLang === 'he' ? 'rtl' : 'ltr';
        path.setAttribute('aria-label', t('tools.genealogy_lineage_aria'));
        lineage.concat([id]).forEach((a, i, all) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = genName(GenealogyCore.byId(a));
            b.setAttribute('lang', genLang);
            if (i === all.length - 1) b.setAttribute('aria-current', 'true');
            b.onclick = () => genOpenFamily(a);
            path.appendChild(b);
        });
        box.appendChild(path);
        requestAnimationFrame(() => genScrollToEnd(path));
    }

    // Les parents.
    const parents = genFamilySection(t('tools.genealogy_parents'));
    if (p.father) {
        const grid = genEl('div', 'gen-fam-grid');
        grid.appendChild(genFamilyCard(p.father, p.far ? t('tools.genealogy_far') : t('tools.genealogy_father')));
        if (p.mother) grid.appendChild(genFamilyCard(p.mother, t('tools.genealogy_mother_label')));
        else grid.appendChild(genEl('p', 'gen-fam-none', t('tools.genealogy_no_mother')));
        parents.appendChild(grid);
    } else {
        parents.appendChild(genEl('p', 'gen-fam-none', t(id === 'adam' ? 'tools.genealogy_adam_origin' : 'tools.genealogy_no_parents')));
    }
    box.appendChild(parents);

    // La personne.
    const main = genEl('article', 'gen-fam-main ' + (p.sex === 'f' ? 'is-woman' : 'is-man'));
    if (genCatSet[id]) { main.classList.add('is-cat'); main.style.setProperty('--cat-color', genCatColor); }
    const gen = GenealogyCore.generationOf(id);
    if (gen) main.appendChild(genEl('p', 'gen-fam-gen', t('tools.genealogy_generation', { n: gen })));
    const name = genEl('h3', 'gen-fam-big', genName(p));
    name.setAttribute('lang', genLang);
    main.appendChild(name);
    const alt = genEl('p', 'gen-fam-alt', genLang === 'he' ? p.fr : p.he);
    alt.setAttribute('lang', genLang === 'he' ? 'fr' : 'he');
    alt.dir = genLang === 'he' ? 'ltr' : 'rtl';
    main.appendChild(alt);
    const spouses = genSpouses(p);
    if (spouses.length) {
        const chips = genEl('div', 'gen-fam-chips');
        spouses.forEach(u => {
            const q = GenealogyCore.byId(u[0]);
            const label = genUnionLabel(u[1]);
            const c = genEl('button', 'gen-fam-chip ' + (q.sex === 'f' ? 'is-woman' : 'is-man'), '⚭ ' + genName(q) + (label ? ' (' + label + ')' : ''));
            c.type = 'button';
            c.setAttribute('lang', genLang);
            c.onclick = () => genOpenFamily(q.id);
            chips.appendChild(c);
        });
        main.appendChild(chips);
    }
    // Les catégories de la personne (leur couleur est celle du menu « Catégories »), sa nation (Genèse 10), une mention particulière.
    const tags = genEl('div', 'gen-fam-chips');
    GenealogyCore.CATEGORIES.filter(c => !c.special && c.ids.includes(id)).forEach(c => {
        const tag = genEl('span', 'gen-fam-tag');
        const dot = genEl('span', 'gen-cat-dot');
        dot.style.background = c.color;
        tag.appendChild(dot);
        tag.appendChild(document.createTextNode(t('tools.genealogy_cat_' + c.id)));
        tags.appendChild(tag);
    });
    if (p.nation) tags.appendChild(genEl('span', 'gen-fam-tag', t('tools.genealogy_nation', { n: p.nation })));
    if (p.ex) tags.appendChild(genEl('span', 'gen-fam-tag', t('tools.genealogy_ex')));
    if (tags.childNodes.length) main.appendChild(tags);
    // La notice (1 à 3 phrases) : chargée à la demande, absente quand le texte biblique ne dit rien de la personne.
    const bioBox = genEl('div', 'gen-fam-bio');
    main.appendChild(bioBox);
    genLoadBios().then(data => {
        const b = GenealogyCore.bioOf(data, id);
        if (!b || !bioBox.isConnected || (genFocus || 'adam') !== id) return;
        bioBox.appendChild(genEl('p', 'gen-fam-bio-text', b.t));
        if (b.ref) bioBox.appendChild(genEl('p', 'gen-fam-bio-ref', b.ref));
    }).catch(() => {});
    // Situer dans la chronologie, quand la frise connaît la personne.
    const actions = genEl('div', 'gen-fam-actions');
    main.appendChild(actions);
    if (typeof ChronologieCore !== 'undefined' && typeof chrLoadModel === 'function') {
        chrLoadModel().then(model => {
            if (!actions.isConnected || (genFocus || 'adam') !== id) return;
            const button = chrButton(ChronologieCore.forGen(model, id), 'screen-tool-genealogy');
            if (button) actions.appendChild(button);
        }).catch(() => {});
    }
    box.appendChild(main);

    // Les frères et sœurs (la personne comprise, mise en valeur).
    const sibs = GenealogyCore.siblingsOf(id);
    if (sibs.length > 1) {
        const sec = genFamilySection(t('tools.genealogy_siblings'), sibs.length - 1);
        const row = genEl('div', 'gen-fam-sibs');
        sibs.forEach(k => {
            const q = GenealogyCore.byId(k);
            const c = genEl('button', 'gen-fam-chip ' + (q.sex === 'f' ? 'is-woman' : 'is-man') + (k === id ? ' is-self' : ''), genName(q));
            c.type = 'button';
            c.setAttribute('lang', genLang);
            if (k === id) c.setAttribute('aria-current', 'true');
            c.onclick = () => genOpenFamily(k);
            row.appendChild(c);
        });
        sec.appendChild(row);
        box.appendChild(sec);
        requestAnimationFrame(() => {
            const self = row.querySelector('.is-self');
            if (self) row.scrollLeft = self.offsetLeft - row.clientWidth / 2 + self.offsetWidth / 2;
        });
    }

    // Les enfants, rangés par mère quand le père en a plusieurs.
    const kids = GenealogyCore.childrenAll(id);
    const sec = genFamilySection(t('tools.genealogy_children'), kids.length);
    if (!kids.length) {
        sec.appendChild(genEl('p', 'gen-fam-none', t('tools.genealogy_no_children')));
    } else {
        const grid = genEl('div', 'gen-fam-grid');
        const groups = [];
        const byMother = {};
        kids.forEach(k => {
            const m = p.sex === 'm' ? (GenealogyCore.byId(k).mother || '') : '';
            if (!(m in byMother)) { byMother[m] = []; groups.push(m); }
            byMother[m].push(k);
        });
        groups.forEach(m => {
            if (groups.length > 1) {
                const label = genEl('p', 'gen-fam-mother', m ? t('tools.genealogy_with_mother', { name: genName(GenealogyCore.byId(m)) }) : t('tools.genealogy_no_mother'));
                grid.appendChild(label);
            }
            byMother[m].forEach(k => {
                const n = GenealogyCore.descendantsCount(k);
                grid.appendChild(genFamilyCard(k, n ? t(n > 1 ? 'tools.genealogy_descendants' : 'tools.genealogy_descendants_one', { n: n }) : ''));
            });
        });
        sec.appendChild(grid);
    }
    box.appendChild(sec);
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
// « Tout replier » : il ne reste qu'Adam et ses fils ; « Tout déplier » : tout l'arbre. Dans l'arbre ou dans les lignées, selon la présentation.
function genCollapseAll() {
    const folded = {};
    GenealogyCore.parentsIds().forEach(id => { if (id !== 'adam') folded[id] = true; });
    if (genView === 'lines') genLinesCollapsed = folded; else genCollapsed = folded;
    genRender();
}

function genExpandAll() {
    if (genView === 'lines') genLinesCollapsed = {}; else genCollapsed = {};
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

// La barre « personne choisie » (arbre et lignées) : son nom, le bouton qui ouvre sa fiche, et celui qui la situe dans la chronologie
// quand la frise la connaît. Dans la fiche, la personne est déjà au centre : la barre reste cachée.
let genFocusBarToken = 0;   // une mise à jour plus récente de la barre annule l'ajout tardif du bouton de la chronologie
function genUpdateFocusBar() {
    const bar = document.getElementById('gen-focus');
    if (!bar) return;
    const id = genFocus;
    const token = ++genFocusBarToken;
    while (bar.firstChild) bar.removeChild(bar.firstChild);
    bar.classList.add('hidden');
    if (!id || genView === 'family') return;
    const name = document.createElement('strong');
    name.textContent = genName(GenealogyCore.byId(id));
    name.setAttribute('lang', genLang);
    bar.appendChild(name);
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn';
    open.textContent = t('tools.genealogy_open_family');
    open.onclick = () => genSetView('family');
    bar.appendChild(open);
    bar.classList.remove('hidden');
    if (typeof ChronologieCore === 'undefined' || typeof chrLoadModel !== 'function') return;
    chrLoadModel().then(model => {
        if (token !== genFocusBarToken) return;
        const button = chrButton(ChronologieCore.forGen(model, id), 'screen-tool-genealogy');
        if (button) bar.appendChild(button);
    }).catch(() => {});
}

// Va à une personne (recherche, catégories, chronologie, changement de présentation) : dans la fiche, l'ouvre ; dans l'arbre et les
// lignées, déplie ses ancêtres (une femme sans père : ceux de son conjoint), la centre et la met en valeur.
function genGoTo(id) {
    if (!GenealogyCore.byId(id)) return;
    genFocus = id;
    document.getElementById('gen-search').value = '';
    genOnSearch();
    genUpdateFocusBar();
    if (genView === 'family') {
        genOpenFamily(id);
        return;
    }
    const target = GenealogyCore.anchorOf(id) || 'adam';
    const folded = genView === 'lines' ? genLinesCollapsed : genCollapsed;
    GenealogyCore.ancestorsOf(target).forEach(a => { delete folded[a]; });
    genRender();
    genShowFocus(target);
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
