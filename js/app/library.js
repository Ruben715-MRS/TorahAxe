// =========================================================================
// === LA BIBLIOTHÈQUE JUIVE (écran de la boîte à outils) ===
// =========================================================================
// Qui a écrit quoi, quand et où : les œuvres rangées par période (frise), par genre (étagères), par ordre alphabétique ou par auteur, une recherche, et pour chaque œuvre sa fiche (auteur, date, lieu, ce que c'est,
// attribution traditionnelle). Le lien vers l'auteur ouvre la chaîne de transmission (ou la carte Hassidout) sur sa fiche, et la fiche d'un maître de la
// chaîne ouvre ses œuvres ici. Les données sont dans js/libraryCore.js (testé). Tout passe par textContent, jamais par du HTML.

let libMode = 'era';        // 'era' (frise) | 'genre' (étagères) | 'alpha' (A–Z) | 'author' (par auteur)
let libFilter = 'all';      // l'identifiant de la période ou du genre choisi, ou 'all'
let libAuthor = '';         // un maître de la chaîne : seules ses œuvres s'affichent
let libSelected = '';
const libOpenGroups = new Set();   // les étagères et les auteurs dépliés : 'g:' + genre, 'a:' + auteur

function libNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function toolLibraryInit() {
    libFilter = 'all';
    libSelected = '';
    libAuthor = '';
    libOpenGroups.clear();
    const input = toolEl('tool-lib-search');
    if (input && !input.dataset.bound) {
        input.dataset.bound = '1';
        input.addEventListener('input', libRender);
    }
    if (input) input.value = '';
    libRender();
}

// Ouvre la bibliothèque, éventuellement sur les œuvres d'un maître de la chaîne.
function openLibrary(from, authorId) {
    openTool('library', from);
    if (authorId) {
        libAuthor = authorId;
        libRender();
    }
}

function libSetMode(mode) {
    libMode = ['genre', 'alpha', 'author'].indexOf(mode) >= 0 ? mode : 'era';
    libFilter = 'all';
    libRender();
}

function libSetFilter(id) {
    libFilter = id;
    libSelected = '';
    libRender();
}

function libClearAuthor() {
    libAuthor = '';
    libRender();
}

function libQuery() {
    const input = toolEl('tool-lib-search');
    return input ? input.value : '';
}

function libVisible() {
    return LibraryCore.search(libQuery()).filter(x => {
        if (libAuthor && x.authorId !== libAuthor) return false;
        if (libFilter === 'all') return true;
        if (libMode === 'genre') return x.genre === libFilter;
        if (libMode === 'era') return LibraryCore.eraOf(x) === libFilter;
        return true;
    });
}

function libGenre(x) { return LibraryCore.GENRES.find(g => g.id === x.genre); }

function libRender() {
    const modes = toolEl('tool-lib-modes');
    toolClear(modes);
    [['era', 'tools.library_mode_era'], ['genre', 'tools.library_mode_genre'], ['author', 'tools.library_mode_author'], ['alpha', 'tools.library_mode_alpha']].forEach(([id, key]) => {
        const b = libNode('button', 'ben-rite', t(key));
        b.type = 'button';
        b.setAttribute('aria-pressed', libMode === id ? 'true' : 'false');
        b.onclick = () => libSetMode(id);
        modes.appendChild(b);
    });
    // Les puces de filtre : les périodes ou les genres. A–Z et Auteurs ont leur index à droite de la liste.
    const chips = toolEl('tool-lib-filters');
    toolClear(chips);
    const filtered = libMode === 'era' || libMode === 'genre';
    chips.classList.toggle('hidden', !filtered);
    if (filtered) {
        const items = libMode === 'genre' ? LibraryCore.GENRES : LibraryCore.ERAS;
        [{ id: 'all', fr: t('tools.library_all') }].concat(items).forEach(item => {
            const b = libNode('button', 'tool-history-chip', item.fr);
            b.type = 'button';
            b.setAttribute('aria-pressed', libFilter === item.id ? 'true' : 'false');
            b.onclick = () => libSetFilter(item.id);
            chips.appendChild(b);
        });
    }

    const authorBox = toolEl('tool-lib-author');
    toolClear(authorBox);
    authorBox.classList.toggle('hidden', !libAuthor);
    if (libAuthor) {
        const who = typeof TransmissionCore !== 'undefined' ? TransmissionCore.byId(libAuthor) : null;
        const b = libNode('button', 'tool-history-chip', t('tools.library_author_only', { name: who ? who.fr : libAuthor }) + ' ×');
        b.type = 'button';
        b.onclick = libClearAuthor;
        authorBox.appendChild(b);
    }

    const list = toolEl('tool-lib-list');
    toolClear(list);
    list.className = 'lib-list lib-view-' + libMode;
    const works = libVisible();
    toolEl('tool-lib-count').textContent = t('tools.library_count', { n: works.length });
    if (libMode === 'era') libRenderTimeline(list, works);
    else if (libMode === 'genre') libRenderShelves(list, works);
    else if (libMode === 'alpha') libRenderAlpha(list, works);
    else libRenderAuthors(list, works);
}

// --- La frise : un axe vertical, les titres à droite de l'axe -----------------------------------------------------------------------------
function libRenderTimeline(list, works) {
    const line = libNode('div', 'lib-timeline');
    let era = '';
    LibraryCore.chronological(works).forEach(x => {
        const e = LibraryCore.eraOf(x);
        if (e !== era) {
            era = e;
            line.appendChild(libNode('h3', 'lib-era', LibraryCore.ERAS.find(y => y.id === e).fr));
        }
        const step = libNode('div', 'lib-step lib-g-' + x.genre);
        step.appendChild(libNode('span', 'lib-year', LibraryCore.yearLabel(x)));
        step.appendChild(libNode('i', 'lib-dot'));
        step.appendChild(libItem(x));
        line.appendChild(step);
    });
    list.appendChild(line);
}

// --- Les étagères : un genre par étagère, repliable -------------------------------------------------------------------------------------
function libToggleGroup(key) {
    if (libOpenGroups.has(key)) libOpenGroups.delete(key); else libOpenGroups.add(key);
    libRender();
}

function libRenderShelves(list, works) {
    const searching = libQuery().trim() !== '';
    LibraryCore.GENRES.forEach(g => {
        const mine = works.filter(x => x.genre === g.id);
        if (!mine.length) return;
        const key = 'g:' + g.id;
        const open = searching || libFilter === g.id || libOpenGroups.has(key);
        const shelf = libNode('section', 'lib-shelf lib-g-' + g.id + (open ? ' is-open' : ''));
        const head = libNode('button', 'lib-shelf-head');
        head.type = 'button';
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        head.appendChild(libNode('strong', 'lib-shelf-name', g.fr));
        head.appendChild(libNode('span', 'lib-count-pill', String(mine.length)));
        head.onclick = () => { if (!searching && libFilter === 'all') libToggleGroup(key); };
        shelf.appendChild(head);
        if (open) {
            const rows = libNode('div', 'lib-shelf-rows');
            LibraryCore.chronological(mine).forEach(x => rows.appendChild(libItem(x)));
            shelf.appendChild(rows);
        } else {
            // Fermée : un aperçu des premiers titres.
            const preview = libNode('div', 'lib-preview');
            mine.slice(0, 5).forEach(x => preview.appendChild(libNode('span', 'lib-preview-item', x.fr.replace(/^(Commentaire d[eu’' ]+|Le |La |Les )/, '').split(' (')[0])));
            if (mine.length > 5) preview.appendChild(libNode('span', 'lib-preview-item is-more', '+ ' + (mine.length - 5)));
            shelf.appendChild(preview);
        }
        list.appendChild(shelf);
    });
}

// --- L'index à droite (A–Z et Auteurs) : une lettre fait défiler jusqu'à son groupe -------------------------------------------------------
function libRail(letters, prefix) {
    const rail = libNode('nav', 'lib-rail');
    rail.setAttribute('aria-label', t('tools.library_rail_aria'));
    letters.forEach(l => {
        const b = libNode('button', 'lib-rail-letter', l);
        b.type = 'button';
        b.onclick = () => {
            const target = document.getElementById(prefix + l);
            if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
        };
        rail.appendChild(b);
    });
    return rail;
}

function libWithRail(list, content, letters, prefix) {
    const wrap = libNode('div', 'lib-with-rail');
    wrap.appendChild(content);
    if (letters.length > 1) wrap.appendChild(libRail(letters, prefix));
    list.appendChild(wrap);
}

// --- A–Z : les rangées, une lettre à chaque groupe ------------------------------------------------------------------------------------
function libRenderAlpha(list, works) {
    const col = libNode('div', 'lib-col');
    const letters = [];
    const sorted = works.slice().sort((a, b) => (LibraryCore.sortKey(a) < LibraryCore.sortKey(b) ? -1 : LibraryCore.sortKey(a) > LibraryCore.sortKey(b) ? 1 : 0));
    let last = '';
    sorted.forEach(x => {
        const l = LibraryCore.initial(x);
        if (l !== last) {
            last = l;
            letters.push(l);
            const h = libNode('h3', 'lib-letter', l);
            h.id = 'lib-l-' + l;
            col.appendChild(h);
        }
        col.appendChild(libItem(x));
    });
    libWithRail(list, col, letters, 'lib-l-');
}

// --- Par auteur : un auteur et ses œuvres ---------------------------------------------------------------------------------------------
function libAuthorName(id, mine) {
    const who = id && typeof TransmissionCore !== 'undefined' ? TransmissionCore.byId(id) : null;
    if (who) return who.fr;
    if (id && typeof AuthorGameCore !== 'undefined' && AuthorGameCore.AUTHORS[id]) return AuthorGameCore.AUTHORS[id].name;
    return id ? mine[0].author : t('tools.library_anon');
}

function libAuthorSort(name) { return LibraryCore.sortKey({ fr: name }).replace(/^(rabbi|rav|rabban|rabbenou) /, ''); }

function libInitials(name) {
    const words = name.replace(/\(.*?\)/g, '').split(/\s+/).filter(w => /^[A-ZÉ’'][\p{L}’'-]+$/u.test(w) && !/^(Rabbi|Rav|Rabban|Rabbénou|Le|La|De|Don)$/.test(w));
    const letters = words.slice(0, 2).map(w => w.replace(/^[’']/, '').charAt(0).toUpperCase());
    return letters.join('') || name.charAt(0).toUpperCase();
}

function libRenderAuthors(list, works) {
    const groups = {};
    works.forEach(x => { (groups[x.authorId || ''] = groups[x.authorId || ''] || []).push(x); });
    const rows = Object.keys(groups).map(id => ({ id: id, works: groups[id], name: libAuthorName(id, groups[id]) }));
    rows.forEach(r => { r.key = libAuthorSort(r.name); r.letter = (r.key.charAt(0) >= 'a' && r.key.charAt(0) <= 'z') ? r.key.charAt(0).toUpperCase() : '#'; });
    rows.sort((a, b) => (a.id === '' ? 1 : 0) - (b.id === '' ? 1 : 0) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const searching = libQuery().trim() !== '';
    const col = libNode('div', 'lib-col');
    const letters = [];
    let last = '';
    rows.forEach(r => {
        const l = r.id === '' ? '·' : r.letter;
        if (l !== last) {
            last = l;
            letters.push(l);
            const h = libNode('h3', 'lib-letter', l === '·' ? t('tools.library_anon_short') : l);
            h.id = 'lib-a-' + l;
            col.appendChild(h);
        }
        const key = 'a:' + r.id;
        const open = searching || libOpenGroups.has(key) || r.works.length === 1 && false;
        const card = libNode('section', 'lib-author lib-g-' + r.works[0].genre + (open ? ' is-open' : ''));
        const head = libNode('button', 'lib-author-head');
        head.type = 'button';
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        head.appendChild(libNode('span', 'lib-avatar', r.id === '' ? '…' : libInitials(r.name)));
        const names = libNode('span', 'lib-author-names');
        names.appendChild(libNode('strong', '', r.name));
        names.appendChild(libNode('span', 'tool-small', r.works.map(x => x.fr).slice(0, 2).join(' · ') + (r.works.length > 2 ? ' …' : '')));
        head.appendChild(names);
        head.appendChild(libNode('span', 'lib-count-pill', String(r.works.length)));
        head.onclick = () => { if (!searching) libToggleGroup(key); };
        card.appendChild(head);
        if (open) {
            const body = libNode('div', 'lib-shelf-rows');
            LibraryCore.chronological(r.works).forEach(x => body.appendChild(libItem(x)));
            card.appendChild(body);
        }
        col.appendChild(card);
    });
    libWithRail(list, col, letters, 'lib-a-');
}

// --- Une œuvre : la rangée (bande de couleur du genre) et sa fiche -------------------------------------------------------------------------
function libFact(dl, label, value, node) {
    if (!value && !node) return;
    dl.appendChild(libNode('dt', '', label));
    const dd = libNode('dd', '');
    if (node) dd.appendChild(node); else dd.textContent = value;
    dl.appendChild(dd);
}

function libItem(x) {
    const open = libSelected === x.id;
    const card = libNode('article', 'lib-item lib-g-' + x.genre + (open ? ' is-open' : ''));
    const head = libNode('button', 'lib-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    const names = libNode('span', 'lib-names');
    names.appendChild(libNode('strong', 'lib-fr', x.fr));
    if (x.he) {
        const he = libNode('span', 'lib-he', x.he);
        he.setAttribute('lang', 'he');
        he.setAttribute('dir', 'rtl');
        names.appendChild(he);
    }
    head.appendChild(names);
    head.appendChild(libNode('span', 'tool-small lib-meta', x.author + ' · ' + LibraryCore.dating(x)));
    head.onclick = () => { libSelected = open ? '' : x.id; libRender(); };
    card.appendChild(head);
    if (open) {
        const body = libNode('div', 'lib-body');
        body.appendChild(libNode('p', 'tool-small', x.desc));
        const genre = libGenre(x);
        const dl = libNode('dl', 'lib-facts');
        libFact(dl, t('tools.library_f_genre'), '', genre ? libNode('span', 'lib-pill', genre.fr) : null);
        libFact(dl, t('tools.library_f_era'), LibraryCore.ERAS.find(e => e.id === LibraryCore.eraOf(x)).fr);
        libFact(dl, t('tools.library_f_date'), LibraryCore.dating(x));
        libFact(dl, t('tools.library_f_place'), x.place);
        body.appendChild(dl);
        if (x.trad) body.appendChild(libNode('p', 'tool-small lib-trad', t('tools.library_trad', { trad: x.trad })));
        // Les boutons de la fiche, côte à côte et à leur taille (ils se mettent à la ligne s'il faut).
        const actions = libNode('div', 'lib-actions');
        body.appendChild(actions);
        const who = x.authorId && typeof TransmissionCore !== 'undefined' ? TransmissionCore.byId(x.authorId) : null;
        if (who) {
            const b = libNode('button', 'btn', t('tools.library_open_chain', { name: who.fr }));
            b.type = 'button';
            b.onclick = () => libOpenAuthor(who);
            actions.appendChild(b);
        }
        card.appendChild(body);
        // « Situer dans la chronologie » : la période où l'œuvre a été écrite.
        if (typeof ChronologieCore !== 'undefined' && typeof chrLoadModel === 'function') {
            chrLoadModel().then(model => {
                const button = chrButton(ChronologieCore.forYears(x.fr, x.from, x.to), 'screen-tool-library');
                if (button && body.isConnected) actions.appendChild(button);
            }).catch(() => {});
        }
    }
    return card;
}

// Le maître dans la chaîne de transmission (ou la carte Hassidout) ; le retour ramène ici.
function libOpenAuthor(who) {
    openTool(who.hass ? 'hassidout' : 'transmission', 'screen-tool-library');
    trGoTo(who.id);
}
