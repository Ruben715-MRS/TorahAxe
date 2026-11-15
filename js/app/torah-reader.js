// =========================================================================
// === ROULEAU DE LA TORAH (lecteur page par page, rendu façon Tikkoun Korim) ===
// =========================================================================
// Une page du lecteur = une page de la source (data/torah/torah.json, lu par js/torahCore.js), avec les mêmes lignes, les mêmes
// colonnes et les mêmes marges que tikkun.io (akivajgordon/tikkun.io, MIT) : versets à droite, aliyot en bleu à droite, lignes
// justifiées, séparation entre les pages. Le bouton en bas à droite alterne avec voyelles (le qere est surligné) et sans voyelles
// (les consonnes du ketiv) ; la touche Maj. fait la même chose. Le nom en haut suit la paracha visible. Le menu choisit une paracha.
// Les styles `.tk-*` sont adaptés de css/page.css et css/master.css du dépôt tikkun.io. Tout ce qui vient du texte passe par
// textContent (les accolades du qere sont traduites en éléments, jamais en HTML).

const TORAH_READER_ANNOTATIONS_KEY = 'historiaxe_torah_reader_annotations';
// Nouvelle clé : les choix mémorisés avant (essais) ne s'appliquent plus, Shlomo semiStam redevient la police par défaut.
const TORAH_READER_FONT_KEY = 'historiaxe_torah_reader_font_v2';
// Polices proposées. Shlomo semiStam est la police de tikkun.io (par défaut). Les autres reposent sur Noto Serif Hebrew
// pour les accents qu'elles ne contiennent pas.
const TORAH_READER_FONTS = [
    { id: 'shlomo', label: 'Shlomo semiStam', stack: "'ShlomosemiStam', 'HX Torah', serif" },
    { id: 'noto-serif', label: 'Noto Serif', stack: "'HX Torah', serif" },
    { id: 'frank', label: 'Frank Ruhl Libre', stack: "'HX Frank', 'HX Torah', serif" },
    { id: 'david', label: 'David Libre', stack: "'HX David', 'HX Torah', serif" },
    { id: 'miriam', label: 'Miriam Libre', stack: "'HX Miriam', 'HX Torah', serif" },
    { id: 'noto-sans', label: 'Noto Sans', stack: "'HX Sans', 'HX Torah', sans-serif" }
];
let torahReaderBlocks = null;
let torahReaderRanges = null;   // paraschiyot : [{ index, start, end }]
let torahReaderData = null;     // { books, parashot } de data/torah/parashot.json
let torahReaderPages = null;    // pages de la source : [{ start, end }]
let torahReaderSlots = [];      // une entrée par page : la page rendue, ou un espace réservé de même hauteur
let torahReaderHeights = [];    // hauteur (px) de chaque page, mesurée au dernier rendu
let torahReaderCurrent = -1;    // page au centre de l'écran
let torahReaderFrame = 0;
const TORAH_READER_KEEP_BEFORE = 2;  // pages rendues au-dessus de la page courante
const TORAH_READER_KEEP_AFTER = 3;   // et en dessous
let torahReaderParashotPromise = null;
let torahReaderScrollBound = false;
const TORAH_READER_PULL_MAX = 140;  // px : de quoi révéler les deux colonnes (versets, puis aliyot)
let torahReaderTouchX = null;
let torahReaderTouchY = null;
let torahReaderPulling = false;

function torahReaderLoadParashot() {
    if (!torahReaderParashotPromise) {
        torahReaderParashotPromise = fetch('data/torah/parashot.json')
            .then(res => { if (!res.ok) throw new Error('parashot HTTP ' + res.status); return res.json(); })
            .catch(err => { torahReaderParashotPromise = null; throw err; });
    }
    return torahReaderParashotPromise;
}

function torahReaderBody() { return toolEl('torah-reader-body'); }

function toolTorahReaderInit() {
    if (!torahReaderScrollBound) {
        torahReaderBody().addEventListener('scroll', torahReaderOnScroll, { passive: true });
        window.addEventListener('resize', torahReaderScheduleFit);
        ['touchstart', 'wheel', 'pointerdown'].forEach(type => torahReaderBody().addEventListener(type, torahReaderUserAction, { passive: true }));
        torahReaderBody().addEventListener('touchstart', torahReaderTouchStart, { passive: true });
        torahReaderBody().addEventListener('touchmove', torahReaderTouchMove, { passive: true });
        torahReaderBody().addEventListener('touchend', torahReaderTouchEnd, { passive: true });
        torahReaderBody().addEventListener('touchcancel', torahReaderTouchEnd, { passive: true });
        document.addEventListener('keydown', torahReaderShiftKey);
        torahReaderScrollBound = true;
    }
    torahReaderTogglePicker(false);
    torahReaderToggleHelp(false);
    torahReaderApplyAnnotations(torahReaderRemembered());
    torahReaderSetFont(torahReaderFontId());
    const msg = toolEl('torah-reader-msg');
    msg.textContent = t('tools.torah_loading');
    toolEl('torah-reader-retry').classList.add('hidden');
    if (torahReaderBlocks) { msg.textContent = ''; torahReaderOpenFirst(); return; }
    Promise.all([TorahCore.load(), torahReaderLoadParashot()]).then(([blocks, data]) => {
        torahReaderBlocks = blocks;
        torahReaderPages = blocks.pages;
        torahReaderData = data;
        torahReaderRanges = TorahCore.parashaRanges(blocks, data.parashot.map(p => ({ book: p.book, c: p.c, v: p.v })));
        msg.textContent = '';
        torahReaderBuildList();
        torahReaderLoadWeek();
        torahReaderFit();
        torahReaderOpenFirst();
    }).catch(() => {
        msg.textContent = t('tools.torah_error');
        toolEl('torah-reader-retry').classList.remove('hidden');
    });
}

// Mémoire de lecture : le bloc au centre de l'écran, gardé sur l'appareil. Rien n'est enregistré avant la restauration.
const TORAH_READER_POSITION_KEY = 'historiaxe_torah_reader_position';
// La position n'est enregistrée qu'après une action de l'utilisateur (toucher, molette, clic) : les ajustements automatiques
// (mise à l'échelle, rendu des pages voisines) ne modifient pas la mémoire.
let torahReaderSaveEnabled = false;
let torahReaderWeek = null;   // calendrier des paraschiyot (data/torah/calendar.json), s'il est installé
function torahReaderSavedBlock() {
    try {
        const b = JSON.parse(localStorage.getItem(TORAH_READER_POSITION_KEY) || 'null');
        return b && Number.isInteger(b.block) && b.block >= 0 && b.block < torahReaderBlocks.length ? b.block : null;
    } catch (e) { return null; }
}
function torahReaderSavePosition(block) {
    try { localStorage.setItem(TORAH_READER_POSITION_KEY, JSON.stringify({ block: block })); } catch (e) { /* stockage indisponible */ }
}

// À l'ouverture : on reprend là où on était ; sinon le début de la Torah.
// Une paracha demandée par un autre écran (l'accueil) : son indice dans data/torah/parashot.json, ouverte à la prochaine ouverture du rouleau.
let torahReaderPending = null;
function openTikkounAtParasha(index, from) {
    torahReaderPending = index;
    openTool('torahReader', from || 'screen-main');
}

function torahReaderOpenFirst() {
    if (torahReaderRanges && torahReaderPending !== null) {
        const k = torahReaderPending;
        torahReaderPending = null;
        if (torahReaderRanges[k]) { torahReaderGo(k); torahReaderSaveEnabled = false; return; }
    }
    if (!torahReaderRanges || torahReaderBody().childElementCount !== 0) return;
    const saved = torahReaderSavedBlock();
    torahReaderGoBlock(saved !== null ? saved : torahReaderRanges[0].start);
    torahReaderSaveEnabled = false;
}

// --- Annotations : avec voyelles (qere surligné) ou sans voyelles (ketiv) ----------------------

function torahReaderRemembered() {
    try { return localStorage.getItem(TORAH_READER_ANNOTATIONS_KEY) === 'off' ? 'off' : 'on'; } catch (e) { return 'on'; }
}

// Comme tikkun.io : « on » = annotations activées (avec voyelles), « off » = sans voyelles.
function torahReaderApplyAnnotations(state) {
    const root = toolEl('screen-torah-reader');
    root.classList.toggle('tk-annotations-on', state === 'on');
    root.classList.toggle('tk-annotations-off', state !== 'on');
    const btn = toolEl('torah-reader-vowels');
    const on = state === 'on';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const label = t(on ? 'tools.torah_reader_vowels_off' : 'tools.torah_reader_vowels_on');
    btn.setAttribute('aria-label', label);
    btn.title = label;
}

// Police choisie : mémorisée sur l'appareil ; appliquée à tout le lecteur par la variable --torah-font.
function torahReaderFontId() {
    try {
        const id = localStorage.getItem(TORAH_READER_FONT_KEY);
        return TORAH_READER_FONTS.some(f => f.id === id) ? id : 'shlomo';
    } catch (e) { return 'shlomo'; }
}

function torahReaderSetFont(id) {
    const font = TORAH_READER_FONTS.find(f => f.id === id) || TORAH_READER_FONTS[0];
    toolEl('screen-torah-reader').style.setProperty('--torah-font', font.stack);
    try { localStorage.setItem(TORAH_READER_FONT_KEY, font.id); } catch (e) { /* valable pour cette session */ }
    // On met à jour les options en place (sans les recréer) : le bouton touché reste le même élément, ce qui évite qu'un
    // second toucher rapide tombe dans le vide sur iOS.
    const box = toolEl('torah-reader-fonts');
    if (box && box.childElementCount === TORAH_READER_FONTS.length) {
        Array.from(box.children).forEach((btn, i) => btn.setAttribute('aria-checked', TORAH_READER_FONTS[i].id === font.id ? 'true' : 'false'));
    } else {
        torahReaderBuildFonts();
    }
    torahReaderFit();
}

// Taille du texte pour que la ligne la plus longue tienne sur une seule ligne, dans la police choisie. Chaque ligne du
// rouleau doit rester une ligne : sans cela, une police plus large (ou un Safari qui la rend autrement) coupe les lignes.
// Deux temps. 1) Estimation : on mesure avec un canevas, sur les deux vues (avec voyelles et sans voyelles), et on retient la
// plus large, pour choisir la taille de base. 2) Vérification : chaque page rendue est contrôlée dans le vrai navigateur, dans
// les DEUX vues (torahReaderFitPage) ; une ligne qui s'enroulerait est réduite jusqu'à tenir. La vérification est la seule
// qui fait foi : le canevas peut différer de la mise en page réelle de quelques pour cent (c'était la cause d'un mot qui
// passait à la ligne suivante avec les voyelles).
const TORAH_READER_MAX_PX = 26;
let torahReaderFitTimer = 0;
let torahReaderFit_ctx = null;   // canevas de mesure, dans la police choisie (100 px)
let torahReaderAvailable = 0;    // largeur disponible pour une ligne (px)
let torahReaderBasePx = 16;      // taille de base : celle des lignes typiques
// Largeur d'un bloc, en em, dans la vue la plus large (avec voyelles ou sans voyelles).
function torahReaderBlockEm(block) {
    let on = '';
    let off = '';
    block.text.forEach(column => {
        column.forEach(fragment => {
            on += TorahCore.ketivText(fragment).replace(/[{}]/g, '');
            off += TorahCore.kriText(fragment);
        });
        on += ' ';
        off += ' ';
    });
    return Math.max(torahReaderFit_ctx.measureText(on).width, torahReaderFit_ctx.measureText(off).width) / 100;
}

// Largeur réelle d'une ligne (cellule du tableau) pour une taille de base `px`. Reprend la mise en page du CSS : le
// corps (.tk-book) a un remplissage, l'espacement des cellules du tableau est de 2 px de chaque côté, et sur téléphone
// (max-width: 600px) le tableau laisse 3em à droite pour les numéros de versets.
function torahReaderLineWidth(body, px) {
    const style = getComputedStyle(body);
    let width = body.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 4;
    if (window.matchMedia('(max-width: 600px)').matches) width -= 3 * px;
    return width;
}

function torahReaderFit() {
    if (!torahReaderBlocks) return;
    const body = torahReaderBody();
    const family = getComputedStyle(body).fontFamily;
    document.fonts.load('100px ' + family, 'בְּרֵאשִׁית').catch(() => {}).then(() => {
        torahReaderFit_ctx = document.createElement('canvas').getContext('2d');
        torahReaderFit_ctx.font = '100px ' + family;
        // La taille de base est celle qui fait tenir 95 % des lignes ; les quelques lignes plus longues seront réduites une à une.
        const sorted = torahReaderBlocks.map(torahReaderBlockEm).sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 20;
        // La largeur d'une ligne dépend de la taille (la marge des versets est en em) : quelques passes suffisent.
        let px = 16;
        for (let i = 0; i < 4; i++) {
            torahReaderAvailable = torahReaderLineWidth(body, px);
            px = Math.max(14, Math.min(TORAH_READER_MAX_PX, torahReaderAvailable / p95 * 0.97));
        }
        torahReaderAvailable = torahReaderLineWidth(body, px);
        torahReaderBasePx = px;
        body.style.setProperty('--tk-page-px', torahReaderBasePx.toFixed(2) + 'px');
        torahReaderRefitRendered();
    });
}

// Première estimation, avant le rendu : une ligne que le canevas juge trop large est réduite d'un coup. Elle ne prétend pas
// être exacte (voir torahReaderFitPage) : elle évite surtout de longues boucles pour les lignes très larges.
function torahReaderShrinkRow(td, block) {
    if (!torahReaderFit_ctx) return;
    const em = torahReaderBlockEm(block);
    if (em * torahReaderBasePx > torahReaderAvailable) {
        td.style.fontSize = (torahReaderAvailable / em * 0.97).toFixed(2) + 'px';
    }
}

// Vrai si le texte de ce fragment occupe plus d'une ligne (une ligne enroulée). On compare les centres verticaux des
// rectangles du texte : deux lignes de texte sont distantes d'au moins une hauteur de ligne.
function torahReaderFragmentWraps(fragment, fontPx) {
    const range = document.createRange();
    range.selectNodeContents(fragment);
    let min = Infinity;
    let max = -Infinity;
    for (const rect of range.getClientRects()) {
        if (!rect.width) continue;
        const centre = rect.top + rect.height / 2;
        if (centre < min) min = centre;
        if (centre > max) max = centre;
    }
    return max - min > 0.5 * fontPx;
}

// Les lignes de `node` (page déjà dans le document) dont le texte s'enroule dans la vue demandée.
function torahReaderWrappedRows(rows, annotated) {
    return rows.filter(td => {
        const fontPx = parseFloat(getComputedStyle(td).fontSize);
        return Array.from(td.querySelectorAll(annotated ? '.tk-on' : '.tk-off')).some(f => torahReaderFragmentWraps(f, fontPx));
    });
}

// Contrôle une page rendue dans les deux vues et réduit la taille des lignes qui s'enrouleraient, jusqu'à ce que chaque
// ligne tienne sur une seule ligne dans l'une comme dans l'autre : le texte reste identique en changeant de vue.
// La taille d'une ligne est la même dans les deux vues (elle est portée par la cellule).
function torahReaderFitPage(node) {
    const root = toolEl('screen-torah-reader');
    const startedOn = root.classList.contains('tk-annotations-on');
    const lines = Array.from(node.querySelectorAll('.tk-line'));
    let pending = lines;
    for (let pass = 0; pass < 16 && pending.length; pass++) {
        const wrapped = new Set();
        [true, false].forEach(annotated => {
            // Le changement de classe et les mesures se font sans rendu intermédiaire : l'utilisateur ne voit rien.
            root.classList.toggle('tk-annotations-on', annotated);
            root.classList.toggle('tk-annotations-off', !annotated);
            torahReaderWrappedRows(pending, annotated).forEach(td => wrapped.add(td));
        });
        wrapped.forEach(td => {
            const current = parseFloat(getComputedStyle(td).fontSize);
            td.style.fontSize = (current * (pass < 8 ? 0.985 : 0.94)).toFixed(2) + 'px';
        });
        pending = Array.from(wrapped);
    }
    // Sur grand écran, le tableau prend la largeur de sa ligne la plus large, qui n'est pas la même dans les deux vues : le
    // texte se déplacerait en changeant de vue. On impose aux deux vues la plus grande des deux largeurs.
    const table = node.querySelector('table');
    if (table) {
        let widest = 0;
        [true, false].forEach(annotated => {
            root.classList.toggle('tk-annotations-on', annotated);
            root.classList.toggle('tk-annotations-off', !annotated);
            widest = Math.max(widest, table.getBoundingClientRect().width);
        });
        table.style.minWidth = widest.toFixed(2) + 'px';
    }
    root.classList.toggle('tk-annotations-on', startedOn);
    root.classList.toggle('tk-annotations-off', !startedOn);
}

// Après un changement de police ou de largeur, on rend de nouveau les pages affichées.
function torahReaderRefitRendered() {
    const anchor = torahReaderBlockAtCentre();
    for (let i = 0; i < torahReaderSlots.length; i++) {
        if (torahReaderSlots[i] && torahReaderSlots[i].classList.contains('tk-page')) {
            torahReaderUnrender(i);
            torahReaderRender(i);
        }
    }
    // Le texte a changé de taille : on revient sur la même ligne, sinon la position sauvegardée dériverait.
    const row = anchor !== null ? torahReaderBody().querySelector('tr[data-block="' + anchor + '"]') : null;
    if (row) row.scrollIntoView({ block: 'center' });
}

function torahReaderScheduleFit() {
    clearTimeout(torahReaderFitTimer);
    torahReaderFitTimer = setTimeout(torahReaderFit, 150);
}

// Une option par police, avec un aperçu écrit dans sa propre police (accents compris).
function torahReaderBuildFonts() {
    const box = toolEl('torah-reader-fonts');
    if (!box) return;
    toolClear(box);
    const current = torahReaderFontId();
    TORAH_READER_FONTS.forEach(font => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'torah-font-option';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', font.id === current ? 'true' : 'false');
        btn.style.fontFamily = font.stack;
        const sample = document.createElement('span');
        sample.className = 'torah-font-sample';
        sample.lang = 'he';
        sample.dir = 'rtl';
        sample.textContent = 'בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים';
        const name = document.createElement('small');
        name.className = 'torah-font-name';
        name.textContent = font.label;
        btn.appendChild(sample);
        btn.appendChild(name);
        btn.onclick = () => torahReaderSetFont(font.id);
        box.appendChild(btn);
    });
}

function torahReaderToggleVowels() {
    const next = toolEl('screen-torah-reader').classList.contains('tk-annotations-on') ? 'off' : 'on';
    try { localStorage.setItem(TORAH_READER_ANNOTATIONS_KEY, next); } catch (e) { /* stockage indisponible : valable pour cette session */ }
    // Le texte doit rester exactement à la même place : on note où est la ligne du milieu, on change de vue, puis on
    // remet cette ligne au même endroit de l'écran (au cas où une hauteur aurait différé d'une vue à l'autre).
    const body = torahReaderBody();
    const anchor = torahReaderBlockAtCentre();
    const rowOf = () => (anchor === null ? null : body.querySelector('tr[data-block="' + anchor + '"]'));
    const before = rowOf();
    const offset = before ? before.getBoundingClientRect().top : 0;
    torahReaderApplyAnnotations(next);
    const after = rowOf();
    if (after) body.scrollTop += after.getBoundingClientRect().top - offset;
}

// La touche Maj. bascule, comme dans tikkun.io, sauf quand on tape dans un champ.
function torahReaderShiftKey(event) {
    if (event.key !== 'Shift' || event.repeat) return;
    if (toolEl('screen-torah-reader').classList.contains('hidden')) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    torahReaderToggleVowels();
}

// --- Rendu des pages ----------------------------------------------------------------------------

// Construit une entrée par page (espaces réservés à hauteur estimée), puis rend la fenêtre autour de la paracha `k`.
// Seules quelques pages sont dans le DOM : les autres restent des espaces de même hauteur, ce qui garde le défilement stable.
function torahReaderGo(k) {
    torahReaderGoBlock(torahReaderRanges[k].start);
    toolEl('torah-reader-he').textContent = torahReaderData.parashot[k].he;
    torahReaderSavePosition(torahReaderRanges[k].start);
    torahReaderSaveEnabled = true;
}

// Toute action de l'utilisateur sur le texte active la mémoire de lecture.
function torahReaderUserAction() { torahReaderSaveEnabled = true; }

// Commence au bloc `startBlock` (une ligne du rouleau) et centre cette ligne à l'écran.
function torahReaderGoBlock(startBlock) {
    const body = torahReaderBody();
    toolClear(body);
    const page = torahReaderPageOf(startBlock);
    torahReaderHeights = torahReaderPages.map(() => 1400);
    torahReaderSlots = torahReaderPages.map((_, i) => torahReaderPlaceholder(i));
    torahReaderSlots.forEach(slot => body.appendChild(slot));
    torahReaderCurrent = page;
    torahReaderUpdateWindow(page);
    const row = body.querySelector('tr[data-block="' + startBlock + '"]');
    if (row) row.scrollIntoView({ block: 'center' });
    else body.scrollTop = 0;
    torahReaderCurrent = torahReaderPageAtCentre();
    torahReaderUpdateWindow(torahReaderCurrent);
    // Le rendu des pages voisines change leurs hauteurs : on recentre la ligne une seconde fois, pour rester exactement sur elle.
    const again = body.querySelector('tr[data-block="' + startBlock + '"]');
    if (again) again.scrollIntoView({ block: 'center' });
    torahReaderUpdateTitle();
}

function torahReaderPageOf(block) {
    for (let k = 0; k < torahReaderPages.length; k++) {
        if (block >= torahReaderPages[k].start && block < torahReaderPages[k].end) return k;
    }
    return 0;
}

function torahReaderPlaceholder(i) {
    const el = document.createElement('div');
    el.className = 'tk-placeholder';
    el.dataset.page = String(i);
    el.style.height = torahReaderHeights[i] + 'px';
    return el;
}

// Rend la page `i` à la place de son espace. Si elle est déjà au-dessus de l'écran, on compense la hauteur réelle.
function torahReaderRender(i) {
    const body = torahReaderBody();
    const slot = torahReaderSlots[i];
    if (slot.classList.contains('tk-page')) return;
    const above = slot.offsetTop + slot.offsetHeight <= body.scrollTop;
    const node = torahReaderPageNode(torahReaderPages[i], i);
    body.replaceChild(node, slot);
    torahReaderSlots[i] = node;
    torahReaderFitPage(node);
    const height = node.offsetHeight;
    const diff = height - torahReaderHeights[i];
    torahReaderHeights[i] = height;
    if (above && diff) body.scrollTop += diff;
}

// Remplace la page `i` par un espace de même hauteur : la mise en page autour ne bouge pas.
function torahReaderUnrender(i) {
    const body = torahReaderBody();
    const node = torahReaderSlots[i];
    if (!node.classList.contains('tk-page')) return;
    torahReaderHeights[i] = node.offsetHeight;
    const slot = torahReaderPlaceholder(i);
    body.replaceChild(slot, node);
    torahReaderSlots[i] = slot;
}

// Garde autour de la page `centre` une fenêtre rendue, et libère le reste.
function torahReaderUpdateWindow(centre) {
    const lo = Math.max(0, centre - TORAH_READER_KEEP_BEFORE);
    const hi = Math.min(torahReaderPages.length - 1, centre + TORAH_READER_KEEP_AFTER);
    for (let i = 0; i < torahReaderSlots.length; i++) {
        if (i < lo || i > hi) torahReaderUnrender(i);
    }
    for (let i = lo; i <= hi; i++) torahReaderRender(i);
}

// La page dont le haut est le plus bas sans dépasser le milieu de l'écran (recherche dichotomique).
function torahReaderPageAtCentre() {
    const body = torahReaderBody();
    const middle = body.scrollTop + body.clientHeight / 2;
    let lo = 0;
    let hi = torahReaderSlots.length - 1;
    while (lo < hi) {
        const m = (lo + hi + 1) >> 1;
        if (torahReaderSlots[m].offsetTop <= middle) lo = m; else hi = m - 1;
    }
    return lo;
}

// Un seul calcul par image : la page courante, la fenêtre, puis le titre.
function torahReaderOnScroll() {
    if (torahReaderFrame) return;
    torahReaderFrame = requestAnimationFrame(() => {
        torahReaderFrame = 0;
        const centre = torahReaderPageAtCentre();
        if (centre !== torahReaderCurrent) {
            torahReaderCurrent = centre;
            torahReaderUpdateWindow(centre);
        }
        torahReaderUpdateTitle();
    });
}

// Étiquettes d'aliyot par bloc, calculées une fois par paracha (torahCore.aliyahLabels).
const torahReaderLabelCache = {};
function torahReaderLabelsOf(parashaIndex) {
    if (!torahReaderLabelCache[parashaIndex]) {
        const r = torahReaderRanges[parashaIndex];
        torahReaderLabelCache[parashaIndex] = TorahCore.aliyahLabels(torahReaderBlocks, r.start, r.end, torahReaderData.parashot[parashaIndex].he);
    }
    return torahReaderLabelCache[parashaIndex];
}

function torahReaderParashaOf(block) {
    for (let k = 0; k < torahReaderRanges.length; k++) {
        if (block >= torahReaderRanges[k].start && block < torahReaderRanges[k].end) return k;
    }
    return 0;
}

function torahReaderPageNode(page, pageIndex) {
    const node = document.createElement('div');
    node.className = 'tk-page';
    node.dataset.page = String(pageIndex);
    const table = document.createElement('table');
    for (let b = page.start; b < page.end; b++) {
        const labels = torahReaderLabelsOf(torahReaderParashaOf(b))[b] || [];
        table.appendChild(torahReaderRow(b, labels));
    }
    node.appendChild(table);
    return node;
}

// Une ligne de la source : une colonne par texte de la ligne, un fragment par segment, avec les deux vues (annotée et non).
function torahReaderRow(index, labels) {
    const block = torahReaderBlocks[index];
    const row = document.createElement('tr');
    row.className = 'tk-row';
    row.dataset.block = String(index);
    const td = document.createElement('td');
    td.className = 'tk-line' + (block.isPetucha ? ' tk-petucha' : '');
    block.text.forEach(column => {
        const col = document.createElement('div');
        col.className = 'tk-column';
        column.forEach(fragment => {
            col.appendChild(torahReaderFragment(fragment, column.length > 1, true));
            col.appendChild(torahReaderFragment(fragment, column.length > 1, false));
        });
        td.appendChild(col);
    });
    const verses = document.createElement('span');
    verses.className = 'tk-verses';
    verses.textContent = TorahCore.versesRangeLabel(block.verses);
    td.appendChild(verses);
    if (labels && labels.length) {
        const aliyot = document.createElement('span');
        aliyot.className = 'tk-aliyot';
        labels.forEach(label => {
            const el = document.createElement('span');
            el.className = 'tk-aliyah';
            el.textContent = label;
            aliyot.appendChild(el);
        });
        td.appendChild(aliyot);
    }
    row.appendChild(td);
    torahReaderShrinkRow(td, block);
    return row;
}

// `annotated` : vue avec voyelles (le qere entre accolades devient un élément surligné) ; sinon les consonnes du ketiv.
function torahReaderFragment(text, setuma, annotated) {
    const span = document.createElement('span');
    span.className = 'tk-fragment ' + (annotated ? 'tk-on' : 'tk-off') + (setuma ? ' tk-setuma' : '');
    const filtered = annotated ? TorahCore.ketivText(text) : TorahCore.kriText(text);
    // Les accolades de la vue annotée marquent les mots surlignés (qere) ; le texte reste en textContent.
    const parts = filtered.split(/([{}])/);
    let inside = false;
    parts.forEach(part => {
        if (part === '{') { inside = true; return; }
        if (part === '}') { inside = false; return; }
        if (!part) return;
        if (inside) {
            const mark = document.createElement('span');
            mark.className = 'tk-ktiv-kri';
            mark.textContent = part;
            span.appendChild(mark);
        } else {
            span.appendChild(document.createTextNode(part));
        }
    });
    return span;
}

// --- Titre : le nom de la paracha au centre de l'écran ----------------------------------------

// La dernière ligne de la page courante qui commence au-dessus du centre donne la paracha. Sans ligne trouvée, le titre ne change pas.
// Le bloc (ligne) au centre de l'écran, ou null.
function torahReaderBlockAtCentre() {
    if (!torahReaderRanges || torahReaderCurrent < 0) return null;
    const page = torahReaderSlots[torahReaderCurrent];
    if (!page || !page.classList.contains('tk-page')) return null;
    const body = torahReaderBody();
    const rect = body.getBoundingClientRect();
    const centre = rect.top + rect.height / 2;
    let found = null;
    for (const row of page.querySelectorAll('.tk-row')) {
        if (row.getBoundingClientRect().top > centre) break;
        found = Number(row.dataset.block);
    }
    if (found === null) found = Number(page.querySelector('.tk-row').dataset.block);
    return found;
}

function torahReaderUpdateTitle() {
    const found = torahReaderBlockAtCentre();
    if (found === null) return;
    const p = torahReaderData.parashot[torahReaderParashaOf(found)];
    toolEl('torah-reader-he').textContent = p.he;
    if (torahReaderSaveEnabled) torahReaderSavePosition(found);
}

// --- Menu des paraschiyot ----------------------------------------------------------------------

function torahReaderNormalize(s) {
    return s.normalize('NFD').replace(/[̀-֑ͯ-ׇ־'’\-\s]/g, '').toLowerCase();
}

function torahReaderBuildList() {
    const list = toolEl('torah-reader-list');
    toolClear(list);
    list.appendChild(torahReaderTable(''));
}

// Les paraschiyot, une colonne par livre ; avec une recherche, une liste des résultats.
function torahReaderTable(query) {
    const wrap = document.createElement('div');
    const q = torahReaderNormalize(query);
    if (!q) {
        const grid = document.createElement('div');
        grid.className = 'torah-picker-table';
        torahReaderData.books.forEach((bookName, b) => {
            const col = document.createElement('div');
            col.className = 'torah-picker-col';
            const h = document.createElement('h4');
            h.lang = 'he';
            h.textContent = bookName;
            col.appendChild(h);
            torahReaderData.parashot.forEach((p, k) => {
                if (p.book - 1 !== b) return;
                col.appendChild(torahReaderPickButton(p, k, false));
            });
            grid.appendChild(col);
        });
        wrap.appendChild(grid);
        return wrap;
    }
    const matches = torahReaderData.parashot
        .map((p, k) => ({ p, k }))
        .filter(({ p }) => torahReaderNormalize(p.he).includes(q) || torahReaderNormalize(p.fr).includes(q));
    if (!matches.length) {
        const none = document.createElement('p');
        none.className = 'tool-small';
        none.textContent = t('tools.torah_reader_none');
        wrap.appendChild(none);
        return wrap;
    }
    const list = document.createElement('div');
    list.className = 'torah-picker-results';
    matches.forEach(({ p, k }) => list.appendChild(torahReaderPickButton(p, k, true)));
    wrap.appendChild(list);
    return wrap;
}

function torahReaderPickButton(p, k, withFr) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'torah-picker-item';
    btn.lang = 'he';
    btn.textContent = p.he;
    if (withFr) {
        const fr = document.createElement('small');
        fr.textContent = ' · ' + p.fr;
        fr.lang = 'fr';
        btn.appendChild(fr);
    } else {
        btn.title = p.fr;
    }
    btn.onclick = () => torahReaderPick(k);
    return btn;
}

// Calendrier des paraschiyot : data/torah/calendar.json. Sans ce fichier, le bouton de la semaine reste caché.
function torahReaderLoadWeek() {
    fetch('data/torah/calendar.json')
        .then(res => (res.ok ? res.json() : null))
        .catch(() => null)
        .then(calendar => {
            torahReaderWeek = calendar;
            torahReaderShowWeek();
        });
}

function torahReaderShowWeek() {
    const btn = toolEl('torah-reader-week');
    if (!btn || !torahReaderData) return;
    const indices = TorahCore.parashaForDate(torahReaderWeek, new Date());
    if (!indices || !indices.length) { btn.classList.add('hidden'); return; }
    const names = indices.map(k => torahReaderData.parashot[k].he);
    btn.textContent = names.join(' – ');
    btn.title = indices.map(k => torahReaderData.parashot[k].fr).join(' – ');
    btn.setAttribute('aria-label', 'Paracha de la semaine : ' + btn.title);
    btn.onclick = () => torahReaderPick(indices[0]);
    btn.classList.remove('hidden');
}

function torahReaderSearch(value) {
    const list = toolEl('torah-reader-list');
    toolClear(list);
    list.appendChild(torahReaderTable(value));
}

function torahReaderPick(k) {
    torahReaderTogglePicker(false);
    torahReaderGo(k);
}

// La fenêtre d'aide (le Tikkoun Korim et son usage ici). Elle remplace le menu s'il était ouvert.
function torahReaderToggleHelp(force) {
    const help = toolEl('torah-reader-help');
    const open = typeof force === 'boolean' ? force : help.classList.contains('hidden');
    if (open) torahReaderTogglePicker(false);
    help.classList.toggle('hidden', !open);
    toolEl('torah-reader-help-btn').setAttribute('aria-expanded', String(open));
    if (open) help.querySelector('.torah-picker-close').focus();
}

function torahReaderTogglePicker(force) {
    const picker = toolEl('torah-reader-picker');
    const open = typeof force === 'boolean' ? force : picker.classList.contains('hidden');
    picker.classList.toggle('hidden', !open);
    toolEl('torah-reader-title').setAttribute('aria-expanded', String(open));
    if (open) {
        toolEl('torah-reader-search').value = '';
        torahReaderSearch('');
        toolEl('torah-reader-search').focus();
    }
}

// Glissement vers la gauche : la page se décale pour révéler les aliyot (en bleu, à droite) ; elle revient au relâchement.
function torahReaderTouchStart(event) {
    const touch = event.touches[0];
    torahReaderTouchX = touch.clientX;
    torahReaderTouchY = touch.clientY;
    torahReaderPulling = false;
}

function torahReaderTouchMove(event) {
    if (torahReaderTouchX === null) return;
    const touch = event.touches[0];
    const dx = touch.clientX - torahReaderTouchX;
    const dy = touch.clientY - torahReaderTouchY;
    if (!torahReaderPulling) {
        // Seul un geste nettement horizontal vers la gauche tire la page ; le reste défile normalement.
        if (dx >= 0 || Math.abs(dy) > Math.abs(dx)) return;
        torahReaderPulling = true;
    }
    const body = torahReaderBody();
    body.classList.remove('tk-pull-releasing');
    body.style.setProperty('--pull-translation', Math.max(dx, -TORAH_READER_PULL_MAX) + 'px');
}

function torahReaderTouchEnd() {
    const body = torahReaderBody();
    if (torahReaderPulling) {
        body.classList.add('tk-pull-releasing');
        body.style.setProperty('--pull-translation', '0px');
    }
    torahReaderTouchX = null;
    torahReaderPulling = false;
}
