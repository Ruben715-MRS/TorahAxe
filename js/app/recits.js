// =========================================================================
// === TORAHAXE — RÉCITS (écrans) ===
// =========================================================================
// De longs récits d'histoire, à lire comme un livre (25 à 35 minutes), puis à tester. Le format et les règles sont dans
// js/recitsCore.js (pur, testé) ; les fichiers dans assets/recits/ (index.json, puis un fichier par récit, chargé à
// l'ouverture et gardé hors ligne par le service worker) ; la charte d'écriture dans docs/recits-charte.md.
// Trois portes d'entrée : la carte de l'accueil (le récit à lire ou à reprendre, selon le profil, voir recitsCard dans
// js/viewProfileCore.js), le groupe « Lire » de l'Atelier, et la liste des récits. À la fin d'un récit : un quiz
// chronologique sur ses grandes dates (une session de révision, voir revisionKind = 'recit' dans js/app/navigation.js).
// Tout le texte d'un récit passe par textContent : aucun HTML venu d'un fichier n'est injecté.

let recitsCatalog = null;
const recitsFiles = {};
let recitCurrent = null;       // le récit ouvert (objet complet)
let recitCurrentEntry = null;  // son entrée du catalogue
let recitChapter = 0;
let recitsListReturn = 'screen-categories';
let recitQuizEvents = [];      // les événements du quiz de fin, rejoués tels quels (voir navigation.js)
let recitScrollTimer = null;

const RECITS_SIZES = ['s', 'm', 'l', 'xl'];

// --- Données ---------------------------------------------------------------------------------------------------
function recitsLoadCatalog() {
    if (recitsCatalog) return Promise.resolve(recitsCatalog);
    return fetch('assets/recits/index.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { recitsCatalog = Array.isArray(d.recits) ? d.recits : []; return recitsCatalog; })
        .catch(() => []);
}

function recitsLoad(entry) {
    if (recitsFiles[entry.id]) return Promise.resolve(recitsFiles[entry.id]);
    return fetch(entry.fichier)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { recitsFiles[entry.id] = d; return d; });
}

function recitsStore() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(RECITS_KEY)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (!d.etat || typeof d.etat !== 'object') d.etat = {};
    if (!d.finis || typeof d.finis !== 'object') d.finis = {};
    return d;
}

function recitsStoreSave(d) {
    try { localStorage.setItem(RECITS_KEY, JSON.stringify(d)); } catch (e) {}
}

// L'état d'un récit tel que l'attend RecitsCore : position et date de fin réunies.
function recitsStateOf(id) {
    const d = recitsStore();
    const s = Object.assign({}, d.etat[id] || {});
    if (d.finis[id]) s.fini = d.finis[id];
    return s;
}

function recitsAllStates() {
    const d = recitsStore();
    const out = {};
    Object.keys(d.etat).concat(Object.keys(d.finis)).forEach(id => { out[id] = recitsStateOf(id); });
    return out;
}

function recitSavePosition(y) {
    if (!recitCurrent) return;
    const d = recitsStore();
    const pos = { ch: recitChapter, y: Math.round(Math.min(1, Math.max(0, y)) * 1000) / 1000, at: Date.now() };
    pos.p = Math.round(RecitsCore.progress(recitCurrent, pos) * 100) / 100;
    d.etat[recitCurrent.id] = pos;
    recitsStoreSave(d);
}

function recitMarkFinished() {
    if (!recitCurrent) return;
    const d = recitsStore();
    if (!d.finis[recitCurrent.id]) {
        d.finis[recitCurrent.id] = Date.now();
        recitsStoreSave(d);
    }
}

function recitsPrefSize() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(RECITS_PREFS_KEY)); } catch (e) { p = null; }
    return p && RECITS_SIZES.indexOf(p.size) !== -1 ? p.size : 'm';
}

// --- Petites briques d'affichage --------------------------------------------------------------------------------
function recitEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
}

function recitMinutesLabel(entry) {
    const m = Array.isArray(entry.minutes) ? entry.minutes : [25, 35];
    return t('recits.minutes', { min: m[0], max: m[1] });
}

function recitStatusLabel(state) {
    if (state.fini) return t('recits.status_done');
    if (state.at) return t('recits.status_progress', { pct: Math.max(1, Math.round((state.p || 0) * 100)) });
    return '';
}

// Un texte du récit, avec ses liens (boutons) et son italique.
function recitAppendInline(parent, text) {
    RecitsCore.parseInline(text).forEach(part => {
        if (part.t === 'text') parent.appendChild(document.createTextNode(part.v));
        else if (part.t === 'em') parent.appendChild(recitEl('em', null, part.v));
        else {
            // Un lien et non un bouton : un bouton ne se coupe pas en fin de ligne, et creuserait des trous dans le texte justifié.
            const a = recitEl('a', 'recit-link', part.v);
            a.href = '#';
            a.setAttribute('role', 'button');
            a.onclick = (e) => { e.preventDefault(); recitOpenLink(part.kind, part.id, a); };
            parent.appendChild(a);
        }
    });
}

function recitAppendParagraphs(parent, text, cls) {
    String(text || '').split(/\n\s*\n/).forEach(par => {
        const p = recitEl('p', cls);
        recitAppendInline(p, par.trim());
        parent.appendChild(p);
    });
}

// --- La liste ---------------------------------------------------------------------------------------------------
function openRecits(from) {
    recitsListReturn = from || 'screen-categories';
    showScreen('screen-recits', 'forward');
    renderRecitsList();
}

function recitsListBack() {
    showScreen(recitsListReturn, 'back');
}

function renderRecitsList() {
    const box = document.getElementById('recits-list');
    if (!box) return;
    recitsLoadCatalog().then(list => {
        box.replaceChildren();
        if (!list.length) {
            box.appendChild(recitEl('p', 'tool-small', t('recits.empty')));
            return;
        }
        const states = recitsAllStates();
        RecitsCore.byNewest(list).forEach(entry => {
            box.appendChild(recitCard(entry, states[entry.id] || {}));
        });
    });
}

function recitCard(entry, state) {
    const card = recitEl('button', 'recit-card');
    card.type = 'button';
    card.onclick = () => openRecit(entry.id);
    if (entry.image) {
        const img = recitEl('img', 'recit-card-img');
        img.src = entry.image;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = () => img.remove();
        card.appendChild(img);
    }
    const body = recitEl('span', 'recit-card-body');
    body.appendChild(recitEl('span', 'recit-card-title', entry.titre));
    body.appendChild(recitEl('span', 'recit-card-sub', entry.sousTitre));
    body.appendChild(recitEl('span', 'recit-card-resume', entry.resume));
    const meta = recitEl('span', 'recit-card-meta');
    // La période puis la durée. Le niveau n'est pas affiché : tous les récits s'adressent au même lecteur.
    if (entry.periode) meta.appendChild(recitEl('span', null, entry.periode));
    meta.appendChild(recitEl('span', null, recitMinutesLabel(entry)));
    const status = recitStatusLabel(state);
    if (status) meta.appendChild(recitEl('span', 'recit-card-status' + (state.fini ? ' is-done' : ''), status));
    body.appendChild(meta);
    card.appendChild(body);
    return card;
}

// --- La carte de l'accueil --------------------------------------------------------------------------------------
// Le récit à reprendre, sinon le dernier paru non lu (RecitsCore.featured). La carte n'apparaît qu'une fois le catalogue
// chargé ; sans récit, elle ne s'affiche pas.
function renderRecitsHomeCard(container) {
    const section = recitEl('section', 'recits-home hidden');
    section.setAttribute('aria-label', t('recits.title'));
    container.appendChild(section);
    recitsLoadCatalog().then(list => {
        const pick = RecitsCore.featured(list, recitsAllStates());
        if (!pick) { section.remove(); return; }
        const entry = pick.recit;
        const state = recitsStateOf(entry.id);
        const btn = recitEl('button', 'recits-home-card');
        btn.type = 'button';
        btn.onclick = () => (pick.status === 'relire' ? openRecits('screen-categories') : openRecit(entry.id, 'screen-categories'));
        if (entry.image) {
            const img = recitEl('img', 'recits-home-img');
            img.src = entry.image;
            img.alt = '';
            img.onerror = () => img.remove();
            btn.appendChild(img);
        }
        const text = recitEl('span', 'recits-home-text');
        text.appendChild(recitEl('span', 'recits-home-kicker', '📖 ' + t('recits.home_' + pick.status)));
        text.appendChild(recitEl('span', 'recits-home-title', pick.status === 'relire' ? t('recits.home_all') : entry.titre));
        text.appendChild(recitEl('span', 'recits-home-meta', pick.status === 'relire'
            ? t('recits.home_all_sub', { count: list.length })
            : entry.sousTitre + ' · ' + recitMinutesLabel(entry)));
        if (pick.status === 'reprendre') {
            const bar = recitEl('span', 'recits-home-bar');
            const fill = recitEl('span', 'recits-home-bar-fill');
            fill.style.width = Math.round((state.p || 0) * 100) + '%';
            bar.appendChild(fill);
            text.appendChild(bar);
        }
        btn.appendChild(text);
        btn.appendChild(recitEl('span', 'gallery-launcher-chevron', '›'));
        btn.lastChild.setAttribute('aria-hidden', 'true');
        section.appendChild(btn);
        section.classList.remove('hidden');
    });
}

// --- Le lecteur -------------------------------------------------------------------------------------------------
let recitReaderReturn = 'screen-recits';

function openRecit(id, from) {
    autoScrollClose('recit');
    recitReaderReturn = from || 'screen-recits';
    recitsLoadCatalog().then(list => {
        const entry = list.find(r => r.id === id);
        if (!entry) return;
        recitsLoad(entry).then(recit => {
            recitCurrent = recit;
            recitCurrentEntry = entry;
            const state = recitsStateOf(id);
            const last = recit.chapitres.length - 1;
            recitChapter = state.at && !state.fini ? Math.min(Math.max(0, state.ch | 0), last) : 0;
            showScreen('screen-recit', 'forward');
            recitApplySize();
            renderRecitChapter(state.at && !state.fini ? state.y || 0 : 0);
        }).catch(() => showToast(t('recits.offline')));
    });
}

function recitBack() {
    autoScrollClose('recit');
    const screen = document.getElementById('screen-recit');
    if (screen) recitSavePosition(recitScrollRatio(screen));
    const to = recitReaderReturn;
    showScreen(to, 'back');
    if (to === 'screen-recits') renderRecitsList();
}

function recitScrollRatio(screen) {
    const max = screen.scrollHeight - screen.clientHeight;
    return max > 0 ? screen.scrollTop / max : 0;
}

function renderRecitChapter(scrollRatio) {
    const recit = recitCurrent;
    if (!recit) return;
    const screen = document.getElementById('screen-recit');
    const total = recit.chapitres.length;
    const ch = recit.chapitres[recitChapter];

    // Les points de chapitre, en haut : chacun mène à son chapitre.
    const dots = document.getElementById('recit-dots');
    dots.replaceChildren();
    recit.chapitres.forEach((c, i) => {
        const dot = recitEl('button', 'recit-dot' + (i === recitChapter ? ' is-current' : ''));
        dot.type = 'button';
        dot.setAttribute('aria-label', t('recits.chapter_of', { n: i + 1, total }) + ' : ' + c.titre);
        if (i === recitChapter) dot.setAttribute('aria-current', 'step');
        dot.onclick = () => recitGoChapter(i);
        dots.appendChild(dot);
    });
    document.getElementById('recit-bar-title').textContent = ch.titre;

    const article = document.getElementById('recit-article');
    article.replaceChildren();
    if (recitChapter === 0) {
        const head = recitEl('header', 'recit-head');
        head.appendChild(recitEl('h1', 'recit-title', recit.titre));
        head.appendChild(recitEl('p', 'recit-subtitle', recit.sousTitre));
        const meta = [t('recits.reading_time', { min: RecitsCore.readingMinutes(recit) }), recit.auteur];
        head.appendChild(recitEl('p', 'recit-meta', meta.join(' · ')));
        article.appendChild(head);
    }
    article.appendChild(recitEl('h2', 'recit-chapter-title', ch.titre));
    ch.blocs.forEach(b => article.appendChild(recitBlock(b)));

    // En bas : chapitre précédent / suivant, ou la fin du récit.
    const nav = recitEl('nav', 'recit-nav');
    if (recitChapter > 0) {
        const prev = recitEl('button', 'btn btn-secondary recit-nav-btn', '‹ ' + t('recits.prev'));
        prev.type = 'button';
        prev.onclick = () => recitGoChapter(recitChapter - 1);
        nav.appendChild(prev);
    }
    if (recitChapter < total - 1) {
        const next = recitEl('button', 'btn recit-nav-btn', t('recits.next') + ' : ' + recit.chapitres[recitChapter + 1].titre + ' ›');
        next.type = 'button';
        next.onclick = () => recitGoChapter(recitChapter + 1);
        nav.appendChild(next);
    }
    article.appendChild(nav);
    if (recitChapter === total - 1) article.appendChild(recitEnd(recit));

    requestAnimationFrame(() => {
        const max = screen.scrollHeight - screen.clientHeight;
        screen.scrollTop = scrollRatio > 0 ? Math.round(max * scrollRatio) : 0;
    });
    recitSavePosition(scrollRatio || 0);
}

function recitGoChapter(i) {
    if (!recitCurrent || i < 0 || i >= recitCurrent.chapitres.length) return;
    recitChapter = i;
    renderRecitChapter(0);
    const title = document.querySelector('#recit-article .recit-chapter-title');
    // Le lecteur d'écran repart du titre du nouveau chapitre.
    if (title) {
        title.setAttribute('tabindex', '-1');
        title.focus({ preventScroll: true });
    }
}

// La lecture se suit au défilement (enregistrée au plus deux fois par seconde) ; le bas du dernier chapitre marque le récit lu.
function recitOnScroll() {
    const screen = document.getElementById('screen-recit');
    if (!screen || !recitCurrent || recitScrollTimer) return;
    recitScrollTimer = setTimeout(() => {
        recitScrollTimer = null;
        const y = recitScrollRatio(screen);
        recitSavePosition(y);
        if (recitChapter === recitCurrent.chapitres.length - 1 && y > 0.92) recitMarkFinished();
    }, 500);
}

function recitBlock(b) {
    if (b.type === 'h') return recitEl('h3', 'recit-h', b.texte);
    if (b.type === 'p') {
        const p = recitEl('p', 'recit-p');
        recitAppendInline(p, b.texte);
        return p;
    }
    if (b.type === 'figure') {
        const isMap = /\.svg$/.test(b.src);
        const fig = recitEl('figure', 'recit-figure' + (isMap ? ' is-map' : ''));
        const img = recitEl('img');
        img.src = b.src;
        img.alt = b.legende;
        img.loading = 'lazy';
        // Une carte se lit mal sur un téléphone : la toucher l'ouvre en grand, à faire défiler.
        if (isMap) {
            const zoom = recitEl('button', 'recit-zoom-btn');
            zoom.type = 'button';
            zoom.setAttribute('aria-label', t('recits.zoom') + ' : ' + b.legende);
            zoom.onclick = () => recitZoomFigure(b.src, b.legende, zoom);
            zoom.appendChild(img);
            fig.appendChild(zoom);
        } else {
            fig.appendChild(img);
        }
        const cap = recitEl('figcaption');
        if (isMap) cap.appendChild(recitEl('span', 'recit-zoom-hint', '🔍 ' + t('recits.zoom_hint')));
        recitAppendInline(cap, b.legende);
        cap.appendChild(recitEl('span', 'recit-credit', b.credit));
        fig.appendChild(cap);
        return fig;
    }
    if (b.type === 'encadre') {
        const box = recitEl('aside', 'recit-encadre');
        box.appendChild(recitEl('h4', 'recit-encadre-title', b.titre));
        recitAppendParagraphs(box, b.texte, 'recit-encadre-p');
        return box;
    }
    if (b.type === 'citation') {
        const q = recitEl('blockquote', 'recit-citation');
        const p = recitEl('p');
        recitAppendInline(p, '« ' + b.texte + ' »');
        q.appendChild(p);
        q.appendChild(recitEl('cite', null, b.source));
        return q;
    }
    if (b.type === 'frise') {
        const ol = recitEl('ol', 'recit-frise');
        b.items.forEach(it => {
            const li = recitEl('li');
            li.appendChild(recitEl('span', 'recit-frise-date', it.date));
            const txt = recitEl('span', 'recit-frise-text');
            recitAppendInline(txt, it.texte);
            li.appendChild(txt);
            ol.appendChild(li);
        });
        return ol;
    }
    return document.createTextNode('');
}

// La fin : le quiz, les thèmes du récit, les sources.
function recitEnd(recit) {
    const end = recitEl('section', 'recit-end');
    end.appendChild(recitEl('h3', 'recit-end-title', t('recits.end_title')));
    end.appendChild(recitEl('p', 'recit-end-text', t('recits.end_text')));
    const quiz = recitEl('button', 'btn recit-end-btn', '🎯 ' + t('recits.quiz'));
    quiz.type = 'button';
    quiz.onclick = () => startRecitQuiz();
    end.appendChild(quiz);
    (recit.themes || []).forEach(themeId => {
        const loc = recitFindTheme(themeId);
        if (!loc) return;
        const btn = recitEl('button', 'btn btn-secondary recit-end-btn', t('recits.play_theme', { theme: loc.theme.nom }));
        btn.type = 'button';
        btn.onclick = () => openThemeAt(loc.categoryIndex, loc.subcategoryIndex, loc.themeIndex);
        end.appendChild(btn);
    });
    const list = recitEl('button', 'btn btn-secondary recit-end-btn', t('recits.back_list'));
    list.type = 'button';
    list.onclick = () => { recitMarkFinished(); openRecits(recitsListReturn); };
    end.appendChild(list);
    if (Array.isArray(recit.sources) && recit.sources.length) {
        end.appendChild(recitEl('h4', 'recit-sources-title', t('recits.sources')));
        const ul = recitEl('ul', 'recit-sources');
        recit.sources.forEach(s => ul.appendChild(recitEl('li', null, s)));
        end.appendChild(ul);
    }
    return end;
}

// --- Liens : fiches du récit et fiches d'événements -------------------------------------------------------------
let recitFicheOpener = null;

function recitOpenLink(kind, id, opener) {
    if (kind === 'fiche') { recitOpenFiche(id, opener); return; }
    if (kind === 'evt') {
        const item = recitFindEvent(id);
        if (!item) { showToast(t('recits.unavailable')); return; }
        openModal(item.event, Object.assign({}, item, { hideRedraw: true }));
    }
}

function recitOpenFiche(id, opener) {
    const f = recitCurrent && recitCurrent.fiches && recitCurrent.fiches[id];
    if (!f) return;
    recitFicheOpener = opener || null;
    const box = document.getElementById('recit-fiche');
    const body = document.getElementById('recit-fiche-body');
    body.replaceChildren();
    if (f.image) {
        const img = recitEl('img', 'recit-fiche-img');
        img.src = f.image;
        img.alt = f.legende || '';
        img.onerror = () => img.remove();
        body.appendChild(img);
    }
    const title = recitEl('h3', 'recit-fiche-title', f.titre);
    title.id = 'recit-fiche-title';
    body.appendChild(title);
    recitAppendParagraphs(body, f.texte, 'recit-fiche-text');
    box.classList.remove('hidden');
    document.getElementById('recit-fiche-close').focus();
}

function recitZoomFigure(src, legende, opener) {
    recitFicheOpener = opener || null;
    const box = document.getElementById('recit-fiche');
    const body = document.getElementById('recit-fiche-body');
    body.replaceChildren();
    const img = recitEl('img', 'recit-zoom-img');
    img.src = src;
    img.alt = legende;
    body.appendChild(img);
    box.classList.add('is-zoom');
    box.classList.remove('hidden');
    document.getElementById('recit-fiche-close').focus();
}

function recitCloseFiche() {
    document.getElementById('recit-fiche').classList.remove('is-zoom');
    document.getElementById('recit-fiche').classList.add('hidden');
    if (recitFicheOpener && recitFicheOpener.isConnected) recitFicheOpener.focus();
    recitFicheOpener = null;
}

function recitFindEvent(id) {
    if (typeof getAllEventsWithLocation !== 'function') return null;
    return getAllEventsWithLocation().find(item => item.event && item.event.id === id) || null;
}

function recitFindTheme(themeId) {
    if (typeof getAllEventsWithLocation !== 'function') return null;
    const item = getAllEventsWithLocation().find(it => it.theme && it.theme.id === themeId);
    return item || null;
}

// --- Le quiz de fin ---------------------------------------------------------------------------------------------
// Une session de révision sur les événements du récit : l'écran des modes, puis le jeu choisi ; « Retour » ramène au récit.
function startRecitQuiz() {
    if (!recitCurrent) return;
    recitMarkFinished();
    const events = (recitCurrent.evenements || []).map(id => recitFindEvent(id)).filter(Boolean).map(item => item.event);
    if (events.length < 3) { showToast(t('recits.quiz_unavailable')); return; }
    const screen = document.getElementById('screen-recit');
    recitSavePosition(recitScrollRatio(screen));
    recitQuizEvents = events;
    revisionKind = 'recit';
    revisionRequestedSize = events.length;
    revisionMode = true;
    favoritesMode = false;
    dailyChallengeMode = false;
    weeklyChallengeMode = false;
    revisionEvents = shuffleArray(events.slice());
    showScreen('screen-modes', 'forward');
}

function recitApplySize(size) {
    const s = size || recitsPrefSize();
    const article = document.getElementById('recit-article');
    if (!article) return;
    RECITS_SIZES.forEach(x => article.classList.toggle('recit-size-' + x, x === s));
}

function recitCycleSize() {
    const cur = recitsPrefSize();
    const next = RECITS_SIZES[(RECITS_SIZES.indexOf(cur) + 1) % RECITS_SIZES.length];
    try { localStorage.setItem(RECITS_PREFS_KEY, JSON.stringify({ size: next })); } catch (e) {}
    const screen = document.getElementById('screen-recit');
    const y = recitScrollRatio(screen);
    recitApplySize(next);
    requestAnimationFrame(() => { screen.scrollTop = Math.round((screen.scrollHeight - screen.clientHeight) * y); });
}

// Toucher le fond referme la fiche (au clavier : Échap ou le bouton « Fermer »).
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('recit-fiche-backdrop')) recitCloseFiche();
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const box = document.getElementById('recit-fiche');
    if (box && !box.classList.contains('hidden')) recitCloseFiche();
});
