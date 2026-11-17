// =========================================================================
// === LA CHAÎNE DE TRANSMISSION — PIRKÉ AVOT (écran de la boîte à outils) ===
// =========================================================================
// De Moïse aux maîtres cités dans Pirké Avot : une carte par maître, rangés du haut (Moïse) vers le bas, des traits entre un maître et ses élèves.
// Un maître a souvent plusieurs élèves et un élève plusieurs maîtres : c'est un graphe, pas un arbre (voir js/transmissionCore.js, testé).
// Toucher une carte met en valeur la chaîne qui la relie à Moïse et ouvre sa fiche (maîtres, élèves, source de chaque lien, bouton vers le
// dictionnaire araméen). « A » / « א » choisit la langue des noms. Tout le texte passe par textContent.

const TR_CARD_W = 140;
const TR_ROW_H = 64;
const TR_GAP = 14;
const TR_ROW_GAP = 46;
const TR_ZOOMS = [0.4, 0.55, 0.7, 0.85, 1, 1.25];
let trLang = 'fr';
let trZoomIdx = 3;
let trBoxes = {};
let trSelected = '';
const TR_SCOPES = ['avot', 'tannaim', 'amoraim', 'moyenage', 'all'];
let trScope = 'amoraim';
// La chaîne (Pirké Avot, Michna, amoraïm) et la Hassidout sont deux écrans séparés : chacun a ses identifiants (tr- ou hd-) et son domaine.
let trDomain = 'sages';
let trPrefix = 'tr-';
const trBoundPrefixes = {};
function trEl(name) { return document.getElementById(trPrefix + name); }
let trLegend = null;   // noms des groupes affichés (œil ouvert) ; null : pas de choix, selon l'écran
const TR_MAX_PER_LINE = 7;

try {
    if (localStorage.getItem('transmissionLang') === 'he') trLang = 'he';
    const savedScope = localStorage.getItem('transmissionScope');
    if (TR_SCOPES.includes(savedScope)) trScope = savedScope;
    const savedLegend = localStorage.getItem('transmissionLegend');
    if (savedLegend === 'shown' || savedLegend === 'hidden') trLegend = savedLegend === 'shown';
} catch (e) { /* stockage indisponible */ }

// Trois modes : « Pirké Avot » ne montre que les maîtres du traité ; « Tannaïm » y ajoute les autres tannaïm de la Michna (`more`) ; « Avec les amoraïm »
// montre aussi ceux de la Guémara (groupes `amoraim_israel` et `amoraim_babylonie`).
function trIsAmora(p) { return p.grp.indexOf('amoraim') === 0; }
// Le domaine seul (Guémara et Michna, ou Hassidout) : la recherche le respecte, mais pas la portée affichée.
function trInDomain(p) {
    if (trDomain === 'hass') return !!p.hass;
    return !p.hass;
}
function trShown(p) {
    if (!trInDomain(p)) return false;
    if (trScope === 'all') return true;
    if (trScope === 'moyenage') return p.grp !== 'aharonim';
    if (trScope === 'amoraim') return !p.med;
    if (trScope === 'tannaim') return !trIsAmora(p) && !p.med;
    return !p.more;
}

// L'écran « Hassidout » (Atelier, ou picker « Généalogie » du profil Religieux) : un document à part, avec sa propre carte et sa propre légende.
function toolHassidoutInit() {
    trDomain = 'hass';
    trPrefix = 'hd-';
    trBindOnce();
    trSelected = '';
    trSetLang(trLang);
    trApplyLangButtons();
    trBuildHassLegend();
    trApplyLegend();
    trToggleHelp(false);
    trRender();
    trRenderInfo();
    trEl('view').scrollTo({ left: 0, top: 0 });
}

// La légende de l'écran Hassidout : un repère coloré par courant (Habad, Breslev, Ger…).
function trBuildHassLegend() {
    const box = trEl('legend');
    toolClear(box);
    TransmissionCore.HASS_COURANTS.forEach(c => {
        const span = document.createElement('span');
        span.className = 'gen-key tr-key is-c-' + c.key;
        span.textContent = c.label;
        box.appendChild(span);
    });
}

// Les écouteurs de l'écran courant, posés une seule fois par écran.
function trBindOnce() {
    if (trBoundPrefixes[trPrefix]) return;
    trBoundPrefixes[trPrefix] = true;
    trEl('search').addEventListener('input', trOnSearch);
    enableViewGestures(trEl('view'), trZoom);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') trToggleHelp(false); });
}

function trName(p) { return trLang === 'he' ? p.he : p.fr; }

function toolTransmissionInit() {
    trDomain = 'sages';
    trPrefix = 'tr-';
    try { const sv = localStorage.getItem('transmissionScope'); trScope = TR_SCOPES.includes(sv) ? sv : 'amoraim'; } catch (e) { trScope = 'amoraim'; }
    trBindOnce();
    trToggleHelp(false);
    trSelected = '';
    trApplyLangButtons();
    trApplyScopeButtons();
    trApplyLegend();
    trRender();
    trRenderInfo();
    trScrollTo('moche');
}

function trApplyLangButtons() {
    trEl('lang-fr').setAttribute('aria-pressed', trLang === 'fr' ? 'true' : 'false');
    trEl('lang-he').setAttribute('aria-pressed', trLang === 'he' ? 'true' : 'false');
    trEl('view').setAttribute('lang', trLang);
}

function trSetLang(lang) {
    trLang = lang === 'he' ? 'he' : 'fr';
    try { localStorage.setItem('transmissionLang', trLang); } catch (e) { /* stockage indisponible */ }
    trApplyLangButtons();
    trRender();
    trRenderInfo();
}

// Les noms des groupes (la légende de couleurs) : un œil ouvert ou fermé, comme la légende des axes de la frise. Sans choix de l'utilisateur,
// ils sont masqués sur un téléphone en portrait (la carte y a besoin de toute la hauteur ; le « ? » les explique) et affichés ailleurs.
function trLegendShown() {
    if (trLegend !== null) return trLegend;
    const phonePortrait = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
    return !phonePortrait;
}

function trApplyLegend() {
    const shown = trLegendShown();
    trEl('legend').classList.toggle('hidden', !shown);
    const btn = trEl('eye-btn');
    const label = t(shown ? 'tools.transmission_legend_hide' : 'tools.transmission_legend_show');
    btn.setAttribute('aria-pressed', shown ? 'true' : 'false');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = typeof AXES_EYE_OPEN_SVG === 'string' ? (shown ? AXES_EYE_OPEN_SVG : AXES_EYE_CLOSED_SVG).replace(/width="16" height="16"/, 'width="20" height="20"') : (shown ? '👁' : '–');
}

function trToggleLegend() {
    trLegend = !trLegendShown();
    try { localStorage.setItem('transmissionLegend', trLegend ? 'shown' : 'hidden'); } catch (e) { /* stockage indisponible */ }
    trApplyLegend();
}

function trApplyScopeButtons() {
    const sages = TransmissionCore.SAGES.filter(p => !p.hass);
    const counts = {
        avot: sages.filter(p => !p.more).length,
        tannaim: sages.filter(p => !trIsAmora(p) && !p.med).length,
        amoraim: sages.filter(p => !p.med).length,
        moyenage: sages.filter(p => p.grp !== 'aharonim').length,
        all: sages.length
    };
    TR_SCOPES.forEach(scope => {
        const btn = trEl('scope-' + scope);
        btn.textContent = t('tools.transmission_scope_' + scope, { n: counts[scope] });
        btn.setAttribute('aria-pressed', trScope === scope ? 'true' : 'false');
    });
}

function trSetScope(scope) {
    trScope = TR_SCOPES.includes(scope) ? scope : 'all';
    try { localStorage.setItem('transmissionScope', trScope); } catch (e) { /* stockage indisponible */ }
    const sel = trSelected && TransmissionCore.byId(trSelected);
    if (sel && !trShown(sel)) trSelected = '';
    trApplyScopeButtons();
    trRender();
    trRenderInfo();
}

// « 1040–1105 (dates approximatives) » : les années de l'ère commune.
function trLife(p) {
    const born = p.born === null ? '?' : p.born, died = p.died === null ? '?' : p.died;
    return born + '–' + died + (p.approx ? ' ' + t('tools.transmission_approx') : '');
}

function trRole(p) {
    if (!p.role) return '';
    return t('tools.transmission_role_' + p.role);
}

function trBuildCard(p) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gen-card tr-card is-' + p.grp + (p.group ? ' is-group' : '') + (p.ckey ? ' is-c-' + p.ckey : '');
    card.dataset.id = p.id;
    card.setAttribute('lang', trLang);
    card.title = trName(p);
    const name = document.createElement('div');
    name.className = 'gen-name tr-name';
    name.textContent = trName(p);
    card.appendChild(name);
    const role = trRole(p);
    if (role) {
        const badge = document.createElement('span');
        badge.className = 'tr-role is-' + p.role;
        badge.textContent = p.role === 'nassi' ? '♛' : '⚖︎';
        badge.title = role;
        card.appendChild(badge);
    }
    card.onclick = () => trSelect(p.id);
    return card;
}

// Les maîtres et les liens à mettre en valeur : la chaîne de la personne choisie jusqu'à Moïse, et ses élèves directs.
function trHighlight() {
    if (!trSelected) return null;
    const chain = TransmissionCore.chainTo(trSelected);
    const ids = {};
    chain.ids.forEach(id => { ids[id] = true; });
    const students = {};
    TransmissionCore.studentsOf(trSelected).forEach(x => { students[x.to] = true; });
    const edges = {};
    chain.edges.forEach(x => { edges[x.from + '>' + x.to] = true; });
    TransmissionCore.studentsOf(trSelected).forEach(x => { edges[x.from + '>' + x.to] = 'student'; });
    return { ids: ids, students: students, edges: edges };
}

function trRender() {
    const L = TransmissionCore.layout({ cardWidth: TR_CARD_W, gap: TR_GAP, rowGap: TR_ROW_GAP, rowHeight: () => TR_ROW_H, maxPerLine: TR_MAX_PER_LINE, only: trShown });
    trBoxes = {};
    Object.keys(L.nodes).forEach(id => {
        const n = L.nodes[id];
        trBoxes[id] = { left: n.left, top: n.top, w: TR_CARD_W, h: n.h };
    });
    const scale = TR_ZOOMS[trZoomIdx];
    const sizer = trEl('sizer');
    const stage = trEl('stage');
    sizer.style.width = Math.ceil(L.width * scale + 24) + 'px';
    sizer.style.height = Math.ceil(L.height * scale + 24) + 'px';
    stage.style.width = L.width + 'px';
    stage.style.height = L.height + 'px';
    stage.style.transform = 'scale(' + scale + ')';
    while (stage.firstChild) stage.removeChild(stage.firstChild);

    const hl = trHighlight();
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'gen-lines');
    svg.setAttribute('width', String(L.width));
    svg.setAttribute('height', String(L.height));
    svg.setAttribute('aria-hidden', 'true');
    L.edges.forEach(e => {
        const a = trBoxes[e.from], b = trBoxes[e.to];
        const x1 = a.left + a.w / 2, y1 = a.top + a.h, x2 = b.left + b.w / 2, y2 = b.top, mid = y1 + (y2 - y1) / 2;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + mid + ' ' + x2 + ' ' + mid + ' ' + x2 + ' ' + y2);
        let cls = 'gen-line tr-line is-' + e.kind + (e.doubt ? ' is-far' : '');
        if (hl) cls += hl.edges[e.from + '>' + e.to] ? ' is-chain' : ' is-dim';
        path.setAttribute('class', cls);
        svg.appendChild(path);
    });
    stage.appendChild(svg);

    TransmissionCore.SAGES.filter(trShown).forEach(p => {
        const b = trBoxes[p.id];
        const card = trBuildCard(p);
        card.style.left = b.left + 'px';
        card.style.top = b.top + 'px';
        card.style.width = TR_CARD_W + 'px';
        card.style.height = TR_ROW_H + 'px';
        if (hl) {
            if (hl.ids[p.id]) card.classList.add('is-chain');
            else if (hl.students[p.id]) card.classList.add('is-student');
            else card.classList.add('is-dim');
        }
        if (p.id === trSelected) card.classList.add('is-focus');
        stage.appendChild(card);
    });
}

// Centre la vue sur un maître.
function trScrollTo(id) {
    const b = trBoxes[id];
    if (!b) return;
    const view = trEl('view');
    const scale = TR_ZOOMS[trZoomIdx];
    view.scrollTo({
        left: Math.max(0, (b.left + b.w / 2) * scale - view.clientWidth / 2),
        top: Math.max(0, (b.top + b.h / 2) * scale - view.clientHeight / 3)
    });
}

function trSelect(id) {
    trSelected = trSelected === id ? '' : id;
    trRender();
    trRenderInfo();
}

function trClear() {
    trSelected = '';
    trRender();
    trRenderInfo();
}

// Boutons − / + : la vue centre le maître choisi (s'il y en a un). Pincement (point = milieu des doigts) : le point reste sous les doigts.
function trZoom(delta, clientX, clientY) {
    const next = Math.min(TR_ZOOMS.length - 1, Math.max(0, trZoomIdx + delta));
    if (next === trZoomIdx) return;
    const apply = () => { trZoomIdx = next; trRender(); };
    if (clientX !== undefined) {
        zoomKeepingPoint(trEl('stage'), trEl('view'), clientX, clientY, apply);
        return;
    }
    apply();
    if (trSelected) trScrollTo(trSelected);
}

function trOnSearch() {
    const box = trEl('results');
    while (box.firstChild) box.removeChild(box.firstChild);
    // Un maître hors de la portée affichée se trouve quand même : le clic élargit la portée (voir trGoTo).
    TransmissionCore.search(trEl('search').value).filter(trInDomain).slice(0, 8).forEach(p => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gen-result is-man';
        b.textContent = trName(p);
        b.onclick = () => trGoTo(p.id);
        li.appendChild(b);
        box.appendChild(li);
    });
}

function trGoTo(id) {
    if (trDomain === 'sages' && !trShown(TransmissionCore.byId(id))) { trScope = 'all'; trApplyScopeButtons(); }    trSelected = id;
    trEl('search').value = '';
    trOnSearch();
    trRender();
    trRenderInfo();
    trScrollTo(id);
}

// Une ligne « maître / élève » de la fiche : un bouton qui mène à lui, et la source du lien.
function trRelationRow(label, edges, otherKey) {
    const row = document.createElement('div');
    row.className = 'lex-rel';
    const lab = document.createElement('span');
    lab.className = 'tool-small';
    lab.textContent = label;
    row.appendChild(lab);
    edges.filter(x => trShown(TransmissionCore.byId(x[otherKey]))).forEach(x => {
        const other = TransmissionCore.byId(x[otherKey]);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip lex-chip';
        btn.textContent = trName(other) + (x.kind === 'pere' ? ' (' + t('tools.transmission_kind_pere') + ')' : x.kind === 'beaupere' ? ' (' + t('tools.transmission_kind_beaupere') + ')' : x.kind === 'second' ? ' (' + t('tools.transmission_kind_second') + ')' : x.kind === 'succession' ? ' (' + t('tools.transmission_kind_succession') + ')' : '') + (x.doubt ? ' ?' : '');
        btn.title = x.src;
        btn.onclick = () => trGoTo(other.id);
        row.appendChild(btn);
    });
    return row;
}

function trRenderInfo() {
    const box = trEl('info');
    while (box.firstChild) box.removeChild(box.firstChild);
    // La fiche est une feuille flottante : elle n'existe que pour un maître choisi, sans quoi la carte garde tout l'écran.
    box.classList.toggle('hidden', !trSelected);
    trEl('view').classList.toggle('has-info', !!trSelected);
    if (!trSelected) return;
    const p = TransmissionCore.byId(trSelected);
    const card = document.createElement('article');
    card.className = 'tool-result lex-card';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tr-info-close';
    close.textContent = '×';
    close.setAttribute('aria-label', t('tools.transmission_info_close'));
    close.onclick = trClear;
    card.appendChild(close);
    const head = document.createElement('div');
    head.className = 'lex-head';
    const he = document.createElement('strong');
    he.className = 'lex-he';
    he.setAttribute('lang', 'he');
    he.setAttribute('dir', 'rtl');
    he.textContent = p.he;
    head.appendChild(he);
    const fr = document.createElement('span');
    fr.className = 'tool-small lex-pos';
    fr.textContent = p.fr;
    head.appendChild(fr);
    card.appendChild(head);

    const facts = [t('tools.transmission_grp_' + p.grp)];
    if (p.hass) facts.push(p.courant);
    if (p.avot) facts.push(t('tools.transmission_avot', { ref: p.avot }));
    else if (p.hass) facts.push(t('tools.transmission_hass_fact'));
    else if (p.med) { if (p.born !== null || p.died !== null) facts.push(trLife(p)); if (p.place) facts.push(p.place); }
    else facts.push(t(trIsAmora(p) ? 'tools.transmission_amora' : p.more ? 'tools.transmission_other_tanna' : 'tools.transmission_not_in_avot'));
    const role = trRole(p);
    if (role) facts.push(role);
    const meta = document.createElement('p');
    meta.className = 'lex-bio';
    meta.textContent = facts.join(' · ');
    card.appendChild(meta);
    // Le bouton « Situer dans la chronologie » se met juste sous les faits : la feuille est courte, un bouton tout en bas passerait inaperçu.
    const chrSlot = document.createElement('div');
    chrSlot.className = 'gen-actions';
    card.appendChild(chrSlot);

    const masters = TransmissionCore.mastersOf(p.id);
    const students = TransmissionCore.studentsOf(p.id);
    if (p.hass) {
        // Hassidout : prédécesseur et maîtres d'un côté, successeurs et élèves de l'autre ; le conjoint, le statut et les sources de la personne.
        if (masters.length) card.appendChild(trRelationRow(t('tools.hassidout_up'), masters, 'from'));
        if (students.length) card.appendChild(trRelationRow(t('tools.hassidout_down'), students, 'to'));
        [['tools.hassidout_spouse', p.conjoint], ['tools.hassidout_status', p.statut], ['tools.transmission_sources', p.sources]].forEach(([key, val]) => {
            if (!val) return;
            const para = document.createElement('p');
            para.className = 'tool-small';
            para.textContent = t(key) + ' ' + val;
            card.appendChild(para);
        });
    } else if (masters.length) card.appendChild(trRelationRow(t('tools.transmission_masters'), masters, 'from'));
    else if (p.id !== 'moche') {
        const none = document.createElement('p');
        none.className = 'tool-small';
        none.textContent = t('tools.transmission_no_master');
        card.appendChild(none);
    }
    if (!p.hass && students.length) card.appendChild(trRelationRow(t('tools.transmission_students'), students, 'to'));

    if (!p.hass && masters.length) {
        const src = document.createElement('p');
        src.className = 'tool-small';
        src.textContent = t('tools.transmission_sources') + ' ' + masters.map(x => x.src).filter((v, i, a) => v && a.indexOf(v) === i).join(' ; ');
        card.appendChild(src);
    }

    if (p.med) {
        if (p.note) {
            const note = document.createElement('p');
            note.className = 'tool-small';
            note.textContent = p.note;
            card.appendChild(note);
        }
        if (p.works.length) {
            const h = document.createElement('p');
            h.className = 'tool-small';
            const strong = document.createElement('strong');
            strong.textContent = t('tools.transmission_works');
            h.appendChild(strong);
            card.appendChild(h);
            const ul = document.createElement('ul');
            ul.className = 'tr-works';
            p.works.forEach(w => {
                const li = document.createElement('li');
                li.textContent = w[0];
                if (w[1]) {
                    const he = document.createElement('span');
                    he.className = 'tr-work-he';
                    he.setAttribute('lang', 'he');
                    he.setAttribute('dir', 'rtl');
                    he.textContent = ' ' + w[1];
                    li.appendChild(he);
                }
                ul.appendChild(li);
            });
            card.appendChild(ul);
        }
    }

    const actions = document.createElement('div');
    actions.className = 'gen-actions';
    if (p.med && typeof openLibrary === 'function' && typeof LibraryCore !== 'undefined' && LibraryCore.worksOf(p.id).length) {
        const lib = document.createElement('button');
        lib.type = 'button';
        lib.className = 'btn';
        lib.textContent = t('tools.transmission_open_library');
        lib.onclick = () => openLibrary('screen-tool-transmission', p.id);
        actions.appendChild(lib);
    }
    if (p.dict && typeof toolGemaraShow === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn';
        btn.textContent = t('tools.transmission_open_dict');
        btn.onclick = () => { openTool('gemara', 'screen-tool-transmission'); toolGemaraShow('sages', p.dict); };
        actions.appendChild(btn);
    }
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'btn';
    clear.textContent = t('tools.transmission_clear');
    clear.onclick = trClear;
    actions.appendChild(clear);
    card.appendChild(actions);
    box.appendChild(card);
    // « Situer dans la chronologie » : le maître sur la frise (son élément, sa vie, ou son époque).
    if (typeof ChronologieCore !== 'undefined' && typeof chrLoadModel === 'function') {
        const id = p.id;
        chrLoadModel().then(model => {
            if (trSelected !== id) return;
            const button = chrButton(ChronologieCore.forSage(model, p), 'screen-tool-transmission');
            if (button) chrSlot.appendChild(button);
        }).catch(() => {});
    }
}

// L'aide « ? » : ce que veulent dire les signes des cartes (♛ ⚖︎), les lignes et les groupes. `open` force l'état ; sans lui, elle bascule.
function trToggleHelp(open) {
    const box = trEl('help');
    const show = typeof open === 'boolean' ? open : box.classList.contains('hidden');
    box.classList.toggle('hidden', !show);
    trEl('help-btn').setAttribute('aria-expanded', show ? 'true' : 'false');
    if (show) box.scrollTop = 0;
}
