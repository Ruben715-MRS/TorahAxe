// =========================================================================
// === DICTIONNAIRE FRANÇAIS – ARAMÉEN, GUÉMARA (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// On tape un mot français ou araméen : les entrées correspondantes s'affichent (mot vocalisé, transcription, catégorie, traductions, remarque,
// langue d'origine, racine). Sans saisie, tout le dictionnaire s'affiche (il est petit : pas de pagination). Deux filtres, qui se combinent : le
// palier (essentiel, courant, spécialisé : un classement éditorial) et la catégorie (poser une question, répondre, mots de liaison…). Un clic sur la
// racine donne toute sa famille ; quand un mot a un équivalent dans le dictionnaire hébreu, un bouton y mène (« Retour » ramène ici).
// La recherche est dans js/gemaraCore.js, les mots dans js/gemaraData.js (généré), les textes sous `tools.gemara_*` de ui/fr.json.
// L'écran emprunte les classes du dictionnaire hébreu (`lex-*`, css/style.css). Tout ce qui vient de la saisie passe par textContent.

// Trois onglets : les mots, les abréviations (sigles comme מ״ט ou ת״ר) et les sages (voir js/gemaraCore.js). Le palier ne concerne que les mots ;
// le second filtre est la catégorie (mots, abréviations) ou l'époque et le lieu (sages).
let gemaraTab = 'words';
let gemaraTier = 'all';
let gemaraCat = 'all';
let gemaraLast = null;
// Les cartes maîtrisées au jeu « Mots de la Guémara » (identifiants « w:… », « a:… », « s:… »), relevées une fois par affichage : leur fiche porte une marque.
let gemaraMastered = null;

function toolGemaraInit() {
    toolEl('tool-gemara-input').value = '';
    gemaraTab = 'words';
    gemaraTier = 'all';
    gemaraCat = 'all';
    toolGemaraTierHelp(false);
    toolGemaraUpdate();
}

// Change d'onglet : la saisie et les filtres repartent à zéro (une catégorie de mots n'existe pas toujours parmi les abréviations).
function toolGemaraTab(tab) {
    gemaraTab = tab === 'abbr' || tab === 'sages' ? tab : 'words';
    gemaraTier = 'all';
    gemaraCat = 'all';
    toolEl('tool-gemara-input').value = '';
    toolGemaraUpdate();
    const screen = toolEl('screen-tool-gemara');
    if (screen) screen.scrollTop = 0;
}

function gemaraHebrew(tag, text, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.lang = 'he';
    el.dir = 'rtl';
    el.textContent = text;
    return el;
}

function gemaraCount(n) { return t(n === 1 ? 'tools.gemara_count_one' : 'tools.gemara_count', { n: n }); }

// La recherche, puis les deux filtres (la famille d'une racine, elle, s'affiche toujours en entier).
function gemaraCompute() {
    if (gemaraTab === 'sages') {
        const sages = GemaraCore.searchSages(toolEl('tool-gemara-input').value);
        sages.results = GemaraCore.filterSages(sages.results, { grp: gemaraCat });
        return sages;
    }
    if (gemaraTab === 'abbr') {
        const abbr = GemaraCore.searchAbbreviations(toolEl('tool-gemara-input').value);
        abbr.results = GemaraCore.filterAbbreviations(abbr.results, { cat: gemaraCat });
        return abbr;
    }
    const found = GemaraCore.search(toolEl('tool-gemara-input').value);
    if (found.kind !== 'root') found.results = GemaraCore.filter(found.results, { tier: gemaraTier, cat: gemaraCat });
    return found;
}

// Les boutons d'un filtre : « Tous » puis une valeur par bouton ; un second clic sur le bouton actif revient à « Tous ».
function gemaraChips(holderId, values, current, labelOf, onPick, idPrefix) {
    const holder = toolEl(holderId);
    toolClear(holder);
    ['all'].concat(values).forEach(value => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = idPrefix + value;
        btn.setAttribute('aria-pressed', value === current ? 'true' : 'false');
        btn.textContent = labelOf(value);
        btn.onclick = () => onPick(value === current ? 'all' : value);
        holder.appendChild(btn);
    });
}

function toolGemaraTierPick(tier) {
    gemaraTier = tier;
    toolGemaraUpdate();
}

function toolGemaraCatPick(cat) {
    gemaraCat = cat;
    toolGemaraUpdate();
}

// Le filtre de catégorie : une liste déroulante (une quinzaine de choix, qui grandiront avec les traités). « Toutes », puis les valeurs par groupes (un
// <optgroup> par groupe, ou aucun). `labelOf('all')` donne « Toutes ».
function gemaraCatsRender(groups, labelOf) {
    const select = toolEl('tool-gemara-cats');
    toolClear(select);
    const option = value => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = labelOf(value);
        return opt;
    };
    select.appendChild(option('all'));
    groups.forEach(group => {
        let parent = select;
        if (group.title) {
            parent = document.createElement('optgroup');
            parent.label = group.title;
            select.appendChild(parent);
        }
        group.values.forEach(v => parent.appendChild(option(v)));
    });
    select.value = gemaraCat;
}

// Le bouton « ? » : déplie ou replie l'explication des paliers.
function toolGemaraTierHelp(open) {
    const help = toolEl('tool-gemara-tier-help');
    const show = typeof open === 'boolean' ? open : help.classList.contains('hidden');
    help.classList.toggle('hidden', !show);
    toolEl('tool-gemara-tier-help-btn').setAttribute('aria-expanded', show ? 'true' : 'false');
}

// La pastille du palier : trois points (essentiel = 3 pleins), toujours avec un libellé écrit, comme les niveaux du dictionnaire hébreu.
function gemaraTierBadge(tier) { return gemaraPipBadge(4 - tier, t('tools.gemara_badge_' + tier)); }

// Trois points (`level` pleins, de 1 à 3) et un libellé écrit : le palier d'un mot, ou la renommée d'un sage.
function gemaraPipBadge(level, label) {
    const badge = document.createElement('span');
    badge.className = 'lex-level lex-level-' + level;
    const pips = document.createElement('span');
    pips.className = 'lex-pips';
    pips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) pips.appendChild(document.createElement('i'));
    badge.appendChild(pips);
    badge.appendChild(document.createTextNode(label));
    return badge;
}

// L'équivalent hébreu d'un mot, tel que le dictionnaire hébreu l'écrit (vocalisé), ou null s'il n'y est pas (pas de lien mort).
function gemaraHebrewTarget(entry) {
    if (!entry.heb || typeof LexiconCore === 'undefined') return null;
    const key = LexiconCore.normalizeHebrew(entry.heb);
    const hit = LexiconCore.ENTRIES.find(e => e.key === key);
    return hit ? hit.he : null;
}

function gemaraCard(entry) {
    const card = document.createElement('article');
    card.className = 'tool-result lex-card';
    card.id = 'gem-entry-' + entry.id;

    const head = document.createElement('div');
    head.className = 'lex-head';
    head.appendChild(gemaraHebrew('strong', entry.he, 'lex-he'));
    const tr = document.createElement('span');
    tr.className = 'lex-tr';
    tr.textContent = entry.tr;
    head.appendChild(tr);
    const cat = document.createElement('span');
    cat.className = 'tool-small lex-pos';
    cat.textContent = t('tools.gemara_cat_' + entry.cat);
    head.appendChild(cat);
    head.appendChild(gemaraTierBadge(entry.tier));
    gemaraMasteredMark(head, 'w:' + entry.key);
    card.appendChild(head);

    const fr = document.createElement('p');
    fr.className = 'lex-fr';
    fr.textContent = entry.fr.join(', ');
    card.appendChild(fr);

    if (entry.note) {
        const note = document.createElement('p');
        note.className = 'tool-small';
        note.textContent = entry.note;
        card.appendChild(note);
    }

    const foot = document.createElement('div');
    foot.className = 'lex-foot';
    const origin = document.createElement('span');
    origin.className = 'tool-small';
    origin.textContent = t('tools.gemara_origin', { lang: t('tools.gemara_origin_' + entry.origin) });
    foot.appendChild(origin);

    if (entry.root) {
        const rootBtn = document.createElement('button');
        rootBtn.type = 'button';
        rootBtn.className = 'tool-history-chip lex-chip';
        rootBtn.setAttribute('aria-label', t('tools.gemara_root_aria', { root: entry.root }));
        rootBtn.appendChild(document.createTextNode(t('tools.gemara_root') + ' '));
        rootBtn.appendChild(gemaraHebrew('span', entry.root));
        rootBtn.onclick = () => toolGemaraSearch(entry.root);
        foot.appendChild(rootBtn);
    }

    const hebrew = gemaraHebrewTarget(entry);
    if (hebrew) {
        const hebBtn = document.createElement('button');
        hebBtn.type = 'button';
        hebBtn.className = 'tool-history-chip lex-chip';
        hebBtn.setAttribute('aria-label', t('tools.gemara_hebrew_link_aria', { word: hebrew }));
        const [before, after] = t('tools.gemara_hebrew_link', { word: '\u0000' }).split('\u0000');
        hebBtn.appendChild(document.createTextNode(before));
        hebBtn.appendChild(gemaraHebrew('span', hebrew));
        hebBtn.appendChild(document.createTextNode(after || ''));
        hebBtn.onclick = () => {
            openTool('lexicon', 'screen-tool-gemara');
            toolLexiconSearch(hebrew);
        };
        foot.appendChild(hebBtn);
    }

    card.appendChild(foot);
    const conj = gemaraConjugation(entry);
    if (conj) card.appendChild(conj);
    return card;
}

// La grille de conjugaison d'un verbe (sous un « Conjugaison » qui se déplie), ou null s'il n'en a pas : passé, participe (le présent), futur, impératif,
// infinitif ; une case vide est un tiret. Les écritures sont sans voyelles : la vocalisation varie selon les éditions.
function gemaraConjugation(entry) {
    if (!entry.conj) return null;
    const details = document.createElement('details');
    details.className = 'gemara-conj';
    const summary = document.createElement('summary');
    summary.textContent = t('tools.gemara_conj');
    details.appendChild(summary);
    const note = document.createElement('p');
    note.className = 'tool-small';
    note.textContent = t('tools.gemara_conj_note');
    details.appendChild(note);
    const table = document.createElement('table');
    table.className = 'gemara-conj-table';
    GemaraCore.CONJUGATION_ROWS.forEach(g => {
        g.rows.forEach((cell, i) => {
            const tr = document.createElement('tr');
            if (i === 0) tr.className = 'gemara-conj-first';
            const head = document.createElement('th');
            head.scope = 'row';
            head.textContent = t('tools.gemara_conj_' + cell);
            tr.appendChild(head);
            const td = document.createElement('td');
            if (entry.conj[cell]) td.appendChild(gemaraHebrew('span', entry.conj[cell], 'lex-he'));
            else {
                td.textContent = '—';
                td.setAttribute('aria-label', t('tools.gemara_conj_none'));
            }
            tr.appendChild(td);
            table.appendChild(tr);
        });
    });
    details.appendChild(table);
    return details;
}

// La fiche d'une abréviation : le sigle en grand, son développé vocalisé, la traduction, et un bouton vers le mot du dictionnaire quand il y en a un.
function gemaraAbbrCard(abbr) {
    const card = document.createElement('article');
    card.className = 'tool-result lex-card';
    card.id = 'gem-abbr-' + abbr.id;

    const head = document.createElement('div');
    head.className = 'lex-head';
    head.appendChild(gemaraHebrew('strong', abbr.sigle, 'lex-he'));
    head.appendChild(gemaraHebrew('span', abbr.full, 'lex-full'));
    const tr = document.createElement('span');
    tr.className = 'lex-tr';
    tr.textContent = abbr.tr;
    head.appendChild(tr);
    const cat = document.createElement('span');
    cat.className = 'tool-small lex-pos';
    cat.textContent = t('tools.gemara_abbr_cat_' + abbr.cat) + (abbr.ambiguous ? ' · ' + t('tools.gemara_abbr_context') : '');
    head.appendChild(cat);
    gemaraMasteredMark(head, 'a:' + abbr.key);
    card.appendChild(head);

    const fr = document.createElement('p');
    fr.className = 'lex-fr';
    fr.textContent = abbr.fr.join(', ');
    card.appendChild(fr);

    if (abbr.note) {
        const note = document.createElement('p');
        note.className = 'tool-small';
        note.textContent = abbr.note;
        card.appendChild(note);
    }

    // Un sigle de sage : les maîtres qu'il désigne, en boutons vers leurs fiches (plusieurs si le sens dépend du passage).
    const designated = GemaraCore.sagesOf(abbr);
    if (designated.length) {
        const row = document.createElement('div');
        row.className = 'lex-rel';
        const label = document.createElement('span');
        label.className = 'tool-small';
        label.textContent = t(designated.length > 1 ? 'tools.gemara_abbr_designates_many' : 'tools.gemara_abbr_designates_one');
        row.appendChild(label);
        designated.forEach(sage => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool-history-chip lex-chip';
            btn.textContent = sage.name;
            btn.setAttribute('aria-label', t('tools.gemara_sage_link_aria', { name: sage.name }));
            btn.onclick = () => toolGemaraShow('sages', sage.name);
            row.appendChild(btn);
        });
        card.appendChild(row);
    }

    const word = GemaraCore.wordOf(abbr);
    if (word) {
        const foot = document.createElement('div');
        foot.className = 'lex-foot';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip lex-chip';
        btn.setAttribute('aria-label', t('tools.gemara_abbr_word_link_aria', { word: word.he }));
        const [before, after] = t('tools.gemara_abbr_word_link', { word: '\u0000' }).split('\u0000');
        btn.appendChild(document.createTextNode(before));
        btn.appendChild(gemaraHebrew('span', word.he));
        btn.appendChild(document.createTextNode(after || ''));
        btn.onclick = () => {
            gemaraTab = 'words';
            gemaraTier = 'all';
            gemaraCat = 'all';
                    toolGemaraSearch(word.he);
        };
        foot.appendChild(btn);
        card.appendChild(foot);
    }
    return card;
}

// Une ligne « Maîtres : … » ou « Disciples : … » : un bouton pour chaque sage qui a sa fiche, du texte simple pour les autres.
function gemaraRelations(label, names) {
    const row = document.createElement('div');
    row.className = 'lex-rel';
    const title = document.createElement('span');
    title.className = 'tool-small';
    title.textContent = label;
    row.appendChild(title);
    names.forEach(name => {
        const target = GemaraCore.sageByName(name);
        if (target) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool-history-chip lex-chip';
            btn.textContent = target.name;
            btn.setAttribute('aria-label', t('tools.gemara_sage_link_aria', { name: target.name }));
            btn.onclick = () => toolGemaraSearch(target.name);
            row.appendChild(btn);
        } else {
            const plain = document.createElement('span');
            plain.className = 'tool-small';
            plain.textContent = name;
            row.appendChild(plain);
        }
    });
    return row;
}

// La fiche d'un sage : son nom (hébreu, transcription, français), son époque, sa renommée, une courte biographie, ses maîtres et ses disciples.
function gemaraSageCard(sage) {
    const card = document.createElement('article');
    card.className = 'tool-result lex-card';
    card.id = 'gem-sage-' + sage.id;

    const head = document.createElement('div');
    head.className = 'lex-head';
    head.appendChild(gemaraHebrew('strong', sage.he, 'lex-he'));
    const tr = document.createElement('span');
    tr.className = 'lex-tr';
    tr.textContent = sage.tr;
    head.appendChild(tr);
    const when = document.createElement('span');
    when.className = 'tool-small lex-pos';
    when.textContent = t('tools.gemara_grp_' + sage.grp) + ' · ' + sage.period;
    head.appendChild(when);
    head.appendChild(gemaraPipBadge(sage.fame, t('tools.gemara_sage_fame_' + sage.fame)));
    gemaraMasteredMark(head, 's:' + sage.key);
    card.appendChild(head);

    const name = document.createElement('p');
    name.className = 'lex-fr';
    name.textContent = sage.name;
    card.appendChild(name);

    const bio = document.createElement('p');
    bio.className = 'lex-bio';
    bio.textContent = sage.bio;
    card.appendChild(bio);

    // Les sigles par lesquels on le désigne (ר״ע pour Rabbi Akiva), en boutons vers l'onglet des abréviations.
    if (sage.sigles.length) {
        const row = document.createElement('div');
        row.className = 'lex-rel';
        const label = document.createElement('span');
        label.className = 'tool-small';
        label.textContent = t('tools.gemara_sage_sigles');
        row.appendChild(label);
        sage.sigles.forEach(abbr => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool-history-chip lex-chip';
            btn.setAttribute('aria-label', t('tools.gemara_sage_sigle_aria', { sigle: abbr.sigle }));
            btn.appendChild(gemaraHebrew('span', abbr.sigle));
            btn.onclick = () => toolGemaraShow('abbr', abbr.sigle);
            row.appendChild(btn);
        });
        card.appendChild(row);
    }
    if (sage.masters.length) card.appendChild(gemaraRelations(t('tools.gemara_sage_masters'), sage.masters));
    if (sage.disciples.length) card.appendChild(gemaraRelations(t('tools.gemara_sage_disciples'), sage.disciples));
    return card;
}

// Ouvre un onglet avec une recherche (le jeu « Mots de la Guémara » mène ainsi à la fiche de la carte jouée) ; les filtres repartent à zéro.
function toolGemaraShow(tab, text) {
    gemaraTab = tab === 'abbr' || tab === 'sages' ? tab : 'words';
    gemaraTier = 'all';
    gemaraCat = 'all';
    toolGemaraSearch(text);
}

// La marque « Maîtrisé » d'une fiche, si la carte l'est au jeu.
function gemaraMasteredMark(head, id) {
    if (!gemaraMastered || !gemaraMastered.has(id)) return;
    const done = document.createElement('span');
    done.className = 'lex-mastered';
    done.textContent = '✓ ' + t('tools.lexicon_mastered');
    head.appendChild(done);
}

// Remplit la recherche (par exemple avec une racine) et l'exécute.
function toolGemaraSearch(text) {
    toolEl('tool-gemara-input').value = text;
    toolGemaraUpdate();
    const screen = toolEl('screen-tool-gemara');
    if (screen) screen.scrollTop = 0;
}

// Recalcule et affiche (à chaque saisie, et quand un filtre change : la saisie reste).
function toolGemaraUpdate() {
    gemaraLast = gemaraCompute();
    toolGemaraRender();
}

function toolGemaraRender() {
    const found = gemaraLast;
    const abbr = gemaraTab === 'abbr';
    const msg = toolEl('tool-gemara-msg');
    const list = toolEl('tool-gemara-list');
    toolClear(list);
    // Le bouton « S'entraîner » dit où l'on en est ; les fiches des cartes maîtrisées au jeu portent une marque.
    gemaraMastered = typeof gemgameMasteredSet === 'function' ? gemgameMasteredSet() : null;
    if (typeof gemgameProgressText === 'function') toolEl('tool-gemara-train-progress').textContent = gemgameProgressText();
    // L'onglet actif, le libellé et l'exemple de la saisie ; le palier ne concerne que les mots.
    const sages = gemaraTab === 'sages';
    ['words', 'abbr', 'sages'].forEach(tab => toolEl('tool-gemara-tab-' + tab).setAttribute('aria-pressed', tab === gemaraTab ? 'true' : 'false'));
    const prefix = sages ? 'tools.gemara_sage_' : abbr ? 'tools.gemara_abbr_' : 'tools.gemara_';
    toolEl('tool-gemara-label').textContent = t(prefix + 'label');
    toolEl('tool-gemara-input').placeholder = t(prefix + 'placeholder');
    toolEl('tool-gemara-cats-label').textContent = t(sages ? 'tools.gemara_sage_group_label' : 'tools.gemara_cat_label');
    toolEl('tool-gemara-tier-block').classList.toggle('hidden', abbr || sages);
    if (sages) {
        gemaraCatsRender([{ values: GemaraCore.SAGE_GROUPS }], v => t(v === 'all' ? 'tools.gemara_cat_all' : 'tools.gemara_grp_' + v));
        if (found.kind === 'all' && gemaraCat === 'all') msg.textContent = t('tools.gemara_sage_all', { n: found.results.length });
        else if (!found.results.length) msg.textContent = t('tools.gemara_sage_none');
        else msg.textContent = t(found.results.length === 1 ? 'tools.gemara_sage_count_one' : 'tools.gemara_sage_count', { n: found.results.length });
        found.results.forEach(a => list.appendChild(gemaraSageCard(a)));
        return;
    }
    if (abbr) {
        gemaraCatsRender([{ values: GemaraCore.ABBR_CATEGORIES }], v => t(v === 'all' ? 'tools.gemara_cat_all' : 'tools.gemara_abbr_cat_' + v));
        if (found.kind === 'all' && gemaraCat === 'all') msg.textContent = t('tools.gemara_abbr_all', { n: found.results.length });
        else if (!found.results.length) msg.textContent = t('tools.gemara_abbr_none');
        else msg.textContent = t(found.results.length === 1 ? 'tools.gemara_abbr_count_one' : 'tools.gemara_abbr_count', { n: found.results.length });
        found.results.forEach(a => list.appendChild(gemaraAbbrCard(a)));
        return;
    }
    // Un palier sans mot (« spécialisé », pour l'instant) n'a pas de bouton : il ne mènerait qu'à une liste vide.
    const tiers = GemaraCore.TIERS.filter(tier => GemaraCore.filter(GemaraCore.ENTRIES, { tier: tier }).length > 0);
    gemaraChips('tool-gemara-tiers', tiers, gemaraTier, v => t(v === 'all' ? 'tools.gemara_tier_all' : 'tools.gemara_tier_' + v), toolGemaraTierPick, 'tool-gemara-tier-');
    gemaraCatsRender([
        { title: t('tools.gemara_cat_group_function'), values: GemaraCore.FUNCTION_CATEGORIES },
        { title: t('tools.gemara_cat_group_treatise'), values: GemaraCore.TREATISE_CATEGORIES },
        { title: t('tools.gemara_cat_group_theme'), values: GemaraCore.THEME_CATEGORIES }
    ], v => t(v === 'all' ? 'tools.gemara_cat_all' : 'tools.gemara_cat_' + v));
    if (found.kind === 'guess') {
        // Aucun mot ni aucune forme écrite : une hypothèse par la racine, annoncée comme telle.
        msg.textContent = t(found.roots.length === 1 ? 'tools.gemara_guess_one' : 'tools.gemara_guess_many', {
            form: '⁨' + toolEl('tool-gemara-input').value.trim() + '⁩', roots: found.roots.map(r => '⁨' + r + '⁩').join(' · '), n: found.results.length
        });
    } else if (found.kind === 'root') {
        msg.textContent = t('tools.gemara_family', { root: '⁨' + found.root + '⁩', n: found.family.length });
    } else if (found.kind === 'all' && gemaraTier === 'all' && gemaraCat === 'all') {
        msg.textContent = t('tools.gemara_all', { n: found.results.length });
    } else if (!found.results.length) {
        msg.textContent = t('tools.gemara_none');
    } else if (found.formHits && found.formHits.length) {
        const n = found.formHits.length;
        msg.textContent = t(n === 1 ? 'tools.gemara_form_one' : 'tools.gemara_form_many', { form: '⁨' + toolEl('tool-gemara-input').value.trim() + '⁩', n: n }) + ' ' + gemaraCount(found.results.length);
    } else {
        msg.textContent = gemaraCount(found.results.length);
    }
    // Ce qui est tapé est exactement un sigle (ק״ו), et aucun mot ne s'écrit ainsi : on propose l'onglet des abréviations, même si des mots commencent par
    // les mêmes lettres (קוֹשֵׁר) — sans cela, plus il y a de mots, moins on verrait qu'il s'agit d'un sigle.
    const typedText = toolEl('tool-gemara-input').value.trim();
    const sigle = typedText ? GemaraCore.sigleOf(typedText) : null;
    if (sigle && !found.results.some(e => e.key === sigle.key)) {
        const hint = t('tools.gemara_abbr_hint', { q: '\u2068' + typedText + '\u2069' });
        if (!found.results.length) msg.textContent = hint;
        else {
            const p = document.createElement('p');
            p.className = 'tool-small';
            p.textContent = hint;
            list.appendChild(p);
        }
        const go = document.createElement('button');
        go.type = 'button';
        go.className = 'tool-history-chip lex-chip';
        go.id = 'tool-gemara-abbr-hint';
        go.textContent = t('tools.gemara_abbr_hint_btn');
        go.onclick = () => { toolGemaraTab('abbr'); toolGemaraSearch(typedText); };
        list.appendChild(go);
    }
    found.results.forEach(entry => {
        const card = gemaraCard(entry);
        if (found.formHits && found.formHits.indexOf(entry) !== -1) {
            const tag = document.createElement('p');
            tag.className = 'tool-small';
            tag.textContent = t('tools.gemara_via_form');
            card.insertBefore(tag, card.querySelector('.lex-foot'));
        }
        list.appendChild(card);
    });
}
