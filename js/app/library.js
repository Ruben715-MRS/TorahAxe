// =========================================================================
// === LA BIBLIOTHÈQUE JUIVE (écran de la boîte à outils) ===
// =========================================================================
// Qui a écrit quoi, quand et où : les œuvres rangées par période ou par genre, une recherche, et pour chaque œuvre sa fiche (auteur, date, lieu, ce que c'est,
// attribution traditionnelle). Le lien vers l'auteur ouvre la chaîne de transmission (ou la carte Hassidout) sur sa fiche, et la fiche d'un maître de la
// chaîne ouvre ses œuvres ici. Les données sont dans js/libraryCore.js (testé). Tout passe par textContent, jamais par du HTML.

let libMode = 'era';        // 'era' | 'genre'
let libFilter = 'all';      // l'identifiant de la période ou du genre choisi, ou 'all'
let libAuthor = '';         // un maître de la chaîne : seules ses œuvres s'affichent
let libSelected = '';

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
    libMode = mode === 'genre' ? 'genre' : 'era';
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

function libVisible() {
    const query = toolEl('tool-lib-search') ? toolEl('tool-lib-search').value : '';
    return LibraryCore.search(query).filter(x => {
        if (libAuthor && x.authorId !== libAuthor) return false;
        if (libFilter === 'all') return true;
        return libMode === 'genre' ? x.genre === libFilter : LibraryCore.eraOf(x) === libFilter;
    });
}

function libRender() {
    const modes = toolEl('tool-lib-modes');
    toolClear(modes);
    [['era', 'tools.library_mode_era'], ['genre', 'tools.library_mode_genre']].forEach(([id, key]) => {
        const b = libNode('button', 'tool-history-chip', t(key));
        b.type = 'button';
        b.setAttribute('aria-pressed', libMode === id ? 'true' : 'false');
        b.onclick = () => libSetMode(id);
        modes.appendChild(b);
    });
    const chips = toolEl('tool-lib-filters');
    toolClear(chips);
    const items = libMode === 'genre' ? LibraryCore.GENRES : LibraryCore.ERAS;
    [{ id: 'all', fr: t('tools.library_all') }].concat(items).forEach(item => {
        const b = libNode('button', 'tool-history-chip', item.fr);
        b.type = 'button';
        b.setAttribute('aria-pressed', libFilter === item.id ? 'true' : 'false');
        b.onclick = () => libSetFilter(item.id);
        chips.appendChild(b);
    });

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
    const works = libVisible();
    toolEl('tool-lib-count').textContent = t('tools.library_count', { n: works.length });
    works.forEach(x => list.appendChild(libItem(x)));
}

function libItem(x) {
    const open = libSelected === x.id;
    const card = libNode('article', 'lib-item' + (open ? ' is-open' : ''));
    const head = libNode('button', 'lib-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    const names = libNode('span', 'lib-names');
    names.appendChild(libNode('strong', 'lib-fr', x.fr));
    const he = libNode('span', 'lib-he', x.he);
    he.setAttribute('lang', 'he');
    he.setAttribute('dir', 'rtl');
    names.appendChild(he);
    head.appendChild(names);
    head.appendChild(libNode('span', 'tool-small lib-meta', x.author + ' · ' + LibraryCore.dating(x)));
    head.onclick = () => { libSelected = open ? '' : x.id; libRender(); };
    card.appendChild(head);
    if (open) {
        const body = libNode('div', 'lib-body');
        body.appendChild(libNode('p', 'tool-small', x.desc));
        const genre = LibraryCore.GENRES.find(g => g.id === x.genre);
        const facts = [genre ? genre.fr : '', LibraryCore.ERAS.find(e => e.id === LibraryCore.eraOf(x)).fr, x.place].filter(Boolean);
        body.appendChild(libNode('p', 'tool-small', facts.join(' · ')));
        if (x.trad) body.appendChild(libNode('p', 'tool-small lib-trad', t('tools.library_trad', { trad: x.trad })));
        const who = x.authorId && typeof TransmissionCore !== 'undefined' ? TransmissionCore.byId(x.authorId) : null;
        if (who) {
            const b = libNode('button', 'btn', t('tools.library_open_chain', { name: who.fr }));
            b.type = 'button';
            b.onclick = () => libOpenAuthor(who);
            body.appendChild(b);
        }
        card.appendChild(body);
    }
    return card;
}

// Le maître dans la chaîne de transmission (ou la carte Hassidout) ; le retour ramène ici.
function libOpenAuthor(who) {
    openTool(who.hass ? 'hassidout' : 'transmission', 'screen-tool-library');
    trGoTo(who.id);
}
