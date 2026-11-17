// =========================================================================
// === TANAKH (les 24 livres de la Bible hébraïque, écran de l'Atelier) ===
// =========================================================================
// Le texte hébreu avec voyelles et accents, livre par livre, verset par verset : data/tanakh/<livre>.json, produit par
// scripts/build_tanakh.js (édition « Tanach with Ta'amei Hamikra », domaine public). Les livres sont rangés comme dans la
// tradition : Torah, Nevi'im, Ketouvim. Le rouleau (Tikkoun) a sa propre section.
// Les livres en plusieurs parties (Samuel, Rois, les douze petits prophètes…) gardent leurs chapitres numérotés par partie.
// Ketiv et qere : même convention que le rouleau (js/torahCore.js). Tout ce qui vient du texte passe par textContent.
// Choix par paracha (Torah seulement) : deux boutons « Par chapitre / Par paracha » ; en mode paracha, la liste déroulante et les boutons
// précédent / suivant parcourent les parachiot du livre (data/torah/parashot.json, partagé avec le lecteur de la Torah), et le texte
// s'affiche d'un trait sur plusieurs chapitres, avec un titre à chaque début de chapitre. Les versets sont désignés par (chapitre, verset).
// Découpage par aliyah (en mode paracha) : une rangée de boutons « Toute la paracha · 1 à 7 · Maftir » ; une aliyah choisie n'affiche que ses versets
// (data/torah/aliyot.json, produit par scripts/build_aliyot.js : le premier verset de chaque aliyah, depuis les marqueurs du lecteur de la Torah). Toute la
// paracha porte un repère à chaque début d'aliyah. Le maftir reprend la fin de la septième : il ne la prolonge pas. Précédent / suivant parcourent les aliyot.
// Chné Mikra (Torah seulement) : case « Chné Mikra », chaque verset hébreu deux fois puis son Targoum Onkelos en araméen (data/tanakh/onkelos-<livre>.json,
// produit par scripts/build_onkelos.js, chargé à la première coche). L'hébreu s'affiche alors même en mode « Français » ; la répétition est masquée aux
// lecteurs d'écran. « Sans voyelles » s'applique aussi à l'araméen.
// Commentateurs : le panneau repliable « Commentateurs » liste les exégètes du registre TANAKH_COMMENTATORS, une case chacun ;
// plusieurs peuvent être cochés ensemble, chacun sous le verset. Aujourd'hui : Rachi, Rashbam, Ibn Ezra, Radak (Genèse et Psaumes), Ramban, Daat Zekenim, Abarbanel, Sforno, Kli Yakar, Or HaChaim et Netziv (Torah), Malbim, et Rachi, Ibn Ezra, Radak, Malbim sur les Prophètes et les Écrits quand ils les couvrent ; par ordre chronologique.
// Pour ajouter un exégète : une entrée du registre, ses fichiers data/tanakh/<préfixe><livre>.json (même format que Rachi :
// chapters[chapitre][verset] = [commentaires] ; scripts/build_commentary.js) et la clé qui le déclare dans index.json (`rashi` pour Rachi).
// Rachi : data/tanakh/rashi-<livre>.json, produit par scripts/build_rashi.js, chargé à la première coche. La traduction française
// (data/tanakh/rashi-fr-<livre>.json, scripts/rashi_fr.js) n'est chargée que pour un livre terminé (`rashiFr` dans index.json) :
// « Hébreu » montre Rachi en hébreu, « Français » sa traduction, « Hébreu et français » les deux ; sans traduction, Rachi reste
// en hébreu. Le panneau disparaît pour un livre qu'aucun exégète ne couvre (Lamentations et Qohélet n'ont que Rachi et Ibn Ezra ; Isaïe : Rachi et Ibn Ezra ; Chroniques : Malbim seul).

const TANAKH_TORAH_IDS = ['genesis', 'exode', 'levitique', 'nombres', 'deuteronome'];  // dans l'ordre des numéros de livre de parashot.json
const TANAKH_GROUPS = [['torah', 'tools.tanakh_group_torah'], ['nevi', 'tools.tanakh_group_nevi'], ['ketouvim', 'tools.tanakh_group_ketouvim']];
// Le registre des commentateurs, dans l'ordre chronologique d'affichage. `name` : nom français ; `he` : nom hébreu (étiquette) ;
// `hasKey` : la clé d'index.json qui dit que son fichier existe pour le livre ;
// `frKey` : celle qui dit que sa traduction est terminée (absente : pas de traduction) ; `file` / `frFile` : préfixes des fichiers ;
// `source` : la clé i18n de sa mention de source ; `color` : la couleur de sa bordure.
const TANAKH_COMMENTATORS = [
    { id: 'rashi', name: 'Rachi', he: 'רש״י', hasKey: 'rashi', frKey: 'rashiFr', file: 'rashi-', frFile: 'rashi-fr-', source: 'tools.tanakh_rashi_source', sourceNach: 'tools.tanakh_rashi_nach_source', color: '#7c8aa5' },
    { id: 'rashbam', name: 'Rashbam', he: 'רשב״ם', hasKey: 'rashbam', file: 'rashbam-', source: 'tools.tanakh_rashbam_source', color: '#c0504d' },
    { id: 'ibnezra', name: 'Ibn Ezra', he: 'אבן עזרא', hasKey: 'ibnezra', file: 'ibnezra-', source: 'tools.tanakh_ibnezra_source', color: '#2f8f83' },
    { id: 'radak', name: 'Radak', he: 'רד״ק', hasKey: 'radak', file: 'radak-', source: 'tools.tanakh_radak_source', color: '#5b8c2a' },
    { id: 'ramban', name: 'Ramban', he: 'רמב״ן', hasKey: 'ramban', file: 'ramban-', source: 'tools.tanakh_ramban_source', color: '#b5651d' },
    { id: 'baalhaturim', name: 'Baal HaTurim (abrégé)', he: 'בעל הטורים', hasKey: 'baalhaturim', file: 'baalhaturim-', source: 'tools.tanakh_baalhaturim_source', color: '#7a6a2f' },
    { id: 'daatzekenim', name: 'Daat Zekenim', he: 'דעת זקנים', hasKey: 'daatzekenim', file: 'daatzekenim-', source: 'tools.tanakh_daatzekenim_source', color: '#a0522d' },
    { id: 'abarbanel', name: 'Abarbanel', he: 'אברבנאל', hasKey: 'abarbanel', file: 'abarbanel-', source: 'tools.tanakh_abarbanel_source', color: '#3d6fb4' },
    { id: 'sforno', name: 'Sforno', he: 'ספורנו', hasKey: 'sforno', file: 'sforno-', source: 'tools.tanakh_sforno_source', color: '#8e5aa8' },
    { id: 'kliyakar', name: 'Kli Yakar', he: 'כלי יקר', hasKey: 'kliyakar', file: 'kliyakar-', source: 'tools.tanakh_kliyakar_source', color: '#d08a00' },
    { id: 'orhachaim', name: 'Or HaChaim', he: 'אור החיים', hasKey: 'orhachaim', file: 'orhachaim-', source: 'tools.tanakh_orhachaim_source', color: '#c2527a' },
    { id: 'malbim', name: 'Malbim', he: 'מלבי״ם', hasKey: 'malbim', file: 'malbim-', source: 'tools.tanakh_malbim_source', color: '#2a7d9c' },
    { id: 'netziv', name: 'Netziv', he: 'נצי״ב', hasKey: 'netziv', file: 'netziv-', source: 'tools.tanakh_netziv_source', color: '#4a5568' },
];
let tanakhIndex = null;   // data/tanakh/index.json
const tanakhLoaded = {};  // id -> livre chargé
const tanakhCommLoaded = {};   // commentateur -> livre -> { he, fr } : commentaire chargé (fr : null sans traduction)
const tanakhCommPending = {};  // « commentateur/livre » -> promesse en cours, pour ne charger qu'une fois
const tanakhOnkelosLoaded = {};  // livre -> onkelos-<livre>.json (le Targoum)
const tanakhSummaries = {};   // livre -> resume-<livre>.json : { book, parts?, chapters[c] } (un résumé d'une phrase par chapitre)
const tanakhCounts = {};   // livre -> counts-<livre>.json : { order, chapters[c][v] = masque } (quels exégètes commentent le verset)
let tanakhAliyot = null;     // data/torah/aliyot.json : { parashot[k] = [7 débuts [c, v], maftir ou null] } (null tant qu'il n'est pas chargé)
let tanakhHaftarot = null;   // data/torah/haftarot.json : { regular, combined, sabbaths } (null tant qu'il n'est pas chargé)
let tanakhCalendar = null;   // data/torah/calendar.json : { sabbaths } (le calendrier des parachiot, diaspora)
let tanakhWeekDate = null;   // la date choisie pour « Paracha et haftara par date » (null : aujourd'hui)
let tanakhWeekOpen = false;
let tanakhParashot = null;  // data/torah/parashot.json : { books, parashot[] } (null tant qu'il n'est pas chargé)
const TANAKH_FLOW_KEY = 'tanakhFlow';
const TANAKH_FLOW_CHUNK = 8;   // en texte continu, hébreu et français ensemble : un paragraphe de 8 versets au plus, pour que le français reste en face de son hébreu

const TANAKH_SUMMARY_KEY = 'tanakhSummary';

// La case « Résumé » est cochée par défaut ; le choix est gardé sur l'appareil.
function tanakhStoredSummary() {
    try { return localStorage.getItem(TANAKH_SUMMARY_KEY) !== '0'; } catch (e) { return true; }
}

function tanakhStoredFlow() {
    try { return localStorage.getItem(TANAKH_FLOW_KEY) === 'text' ? 'text' : 'verses'; } catch (e) { return 'verses'; }
}

// Le texte continu est-il choisi ?
function tanakhFlowOn() {
    return tanakhState.flow === 'text';
}

let tanakhState = { haftara: null, book: null, chapter: 0, parasha: 0, aliyah: 0, mode: 'chapter', vowels: 'full', show: 'both', flow: tanakhStoredFlow(), summary: tanakhStoredSummary(), comm: {}, open: {}, chne: false };  // mode : 'chapter' ou 'parasha' ; parasha : rang dans les parachiot du livre ; aliyah : 0 (toute la paracha), 1 à 7, 8 (maftir) ; chne : mode Chné Mikra ; chapter : index dans le livre (0 = premier) ; comm : { id: true } cochés ; open : { 'chapitre:verset': true } dépliés par la pastille
// show : 'both' (hébreu et français), 'he' (hébreu seul), 'fr' (français seul)
// flow : 'verses' (un verset par bloc, avec commentaires et Chné Mikra) ou 'text' (texte continu : les versets se suivent dans un même paragraphe, sans
// retour à la ligne ; les commentaires s'ouvrent au toucher du numéro d'un verset, pas de Chné Mikra). Mémorisé sur l'appareil.

// Une ouverture demandée par un autre écran (les Téhilim du jour de l'écran Zmanim) : { book, chapter, show } (chapter : index, 0 = premier ; show : 'he', 'fr' ou 'both', facultatif). Prise au prochain toolTanakhInit.
let tanakhPending = null;
function tanakhOpenAt(book, chapter, show) {
    tanakhPending = { book: book, chapter: chapter, show: show };
    openTool('tanakh', toolReturns.tanakh || 'screen-tools');
}

// Une paracha et une montée demandées par l'accueil (« Paracha » du jour) : gi = indice dans data/torah/parashot.json, aliyah comme tanakhGoParasha.
let tanakhPendingParasha = null;
function tanakhOpenParasha(gi, aliyah, from) {
    torahReaderLoadParashot().then(data => {
        tanakhParashot = data;
        tanakhPendingParasha = { gi: gi, aliyah: aliyah };
        tanakhPending = null;
        openTool('tanakh', from || 'screen-main');
    }).catch(() => { /* paracha indisponible : rien ne s'ouvre */ });
}

function toolTanakhInit() {
    autoScrollClose('tanakh');
    if (tanakhPendingParasha && tanakhIndex) {
        const pp = tanakhPendingParasha;
        tanakhPendingParasha = null;
        tanakhGoParasha(pp.gi, pp.aliyah);
        return;
    }
    if (tanakhPending && tanakhIndex) {
        const p = tanakhPending;
        tanakhPending = null;
        const entry = tanakhIndex.books.find(b => b.id === p.book && b.available);
        if (entry) { tanakhOpen(entry.id, p.show ? { chapter: p.chapter, show: p.show } : { chapter: p.chapter }); return; }
    }
    if (tanakhIndex) { tanakhRender(); return; }
    const msg = toolEl('tool-tanakh-msg');
    msg.textContent = t('tools.torah_loading');
    fetch('data/tanakh/index.json')
        .then(res => { if (!res.ok) throw new Error('index HTTP ' + res.status); return res.json(); })
        .then(index => {
            tanakhIndex = index;
            msg.textContent = '';
            if (tanakhPendingParasha) {
                const pp = tanakhPendingParasha;
                tanakhPendingParasha = null;
                tanakhGoParasha(pp.gi, pp.aliyah);
                return;
            }
            const p = tanakhPending;
            tanakhPending = null;
            const wanted = p && index.books.find(b => b.id === p.book && b.available);
            const first = wanted || index.books.find(b => b.available);
            if (first) tanakhOpen(first.id, wanted ? (p.show ? { chapter: p.chapter, show: p.show } : { chapter: p.chapter }) : undefined);
            else tanakhRender();
        })
        .catch(() => { msg.textContent = t('tools.torah_error'); });
}

// Ouvre un livre disponible (chargé une fois) au premier chapitre.
function tanakhOpen(id, extra) {
    const msg = toolEl('tool-tanakh-msg');
    const show = (book) => {
        tanakhLoaded[id] = book;
        tanakhState = { book: id, chapter: 0, parasha: 0, aliyah: 0, mode: tanakhState.mode, vowels: tanakhState.vowels, show: tanakhState.show, flow: tanakhState.flow, summary: tanakhState.summary, comm: tanakhState.comm, open: {}, chne: tanakhState.chne, haftara: null };
        Object.assign(tanakhState, extra || {});
        msg.textContent = '';
        tanakhRender();
        tanakhLoadComments(id);
        tanakhLoadCounts(id);
        tanakhLoadSummaries(id);
        tanakhLoadOnkelos(id);
        tanakhLoadParashot();
    };
    if (tanakhLoaded[id]) { show(tanakhLoaded[id]); return; }
    msg.textContent = t('tools.torah_loading');
    fetch('data/tanakh/' + id + '.json')
        .then(res => { if (!res.ok) throw new Error('livre HTTP ' + res.status); return res.json(); })
        .then(show)
        .catch(() => { msg.textContent = t('tools.torah_error'); });
}

// Tous les livres, la Torah comprise, s'affichent ici verset par verset. Le rouleau (Tikkoun) a sa propre section.
function tanakhPickBook(entry) {
    tanakhOpen(entry.id);
}

function tanakhCurrent() {
    return tanakhLoaded[tanakhState.book];
}

// Le livre ouvert a-t-il son Targoum Onkelos (les cinq livres de la Torah) ?
function tanakhHasOnkelos() {
    const entry = tanakhState.book && tanakhIndex ? tanakhIndex.books.find(b => b.id === tanakhState.book) : null;
    return !!entry && !!entry.onkelos;
}

// Le mode Chné Mikra est-il en marche ici ? Coché, et le livre a son Targoum.
function tanakhChneOn() {
    return tanakhState.chne && tanakhHasOnkelos() && !tanakhFlowOn();
}

// Charge le Targoum du livre (une fois) quand le mode est coché ; puis réaffiche si on est toujours sur ce livre.
function tanakhLoadOnkelos(id) {
    if (!tanakhChneOn() || tanakhOnkelosLoaded[id] || tanakhState.book !== id) return;
    const msg = toolEl('tool-tanakh-msg');
    msg.textContent = t('tools.torah_loading');
    fetch('data/tanakh/onkelos-' + id + '.json')
        .then(res => { if (!res.ok) throw new Error('onkelos HTTP ' + res.status); return res.json(); })
        .then(data => {
            tanakhOnkelosLoaded[id] = data;
            msg.textContent = '';
            if (tanakhState.book === id) tanakhRender();
        })
        .catch(() => { msg.textContent = t('tools.tanakh_onkelos_error'); });
}

function tanakhToggleChne(checked) {
    tanakhState.chne = checked;
    tanakhRender();
    if (checked) tanakhLoadOnkelos(tanakhState.book);
}

// La case « Chné Mikra » : visible seulement pour un livre qui a son Targoum.
function tanakhRenderChneToggle() {
    toolEl('tool-tanakh-chne-label').hidden = !tanakhHasOnkelos() || tanakhFlowOn();   // en texte continu, la case disparaît (elle reste cochée et revient en « Verset par verset »)
    toolEl('tool-tanakh-chne').checked = tanakhState.chne;
}

// Ce commentateur couvre-t-il le livre ? L'index déclare son fichier pour ce livre.
function tanakhCommCovers(comm, entry) {
    return !!entry && !!entry[comm.hasKey];
}

// Les commentateurs du registre qui couvrent le livre ouvert.
function tanakhCommAvailable() {
    const book = tanakhCurrent();
    const entry = book && tanakhIndex ? tanakhIndex.books.find(b => b.id === tanakhState.book) : null;
    return TANAKH_COMMENTATORS.filter(c => tanakhCommCovers(c, entry));
}

// Les exégètes dont un commentaire est à l'écran, donc dont la source se mentionne : les cochés, et ceux qu'une pastille dépliée a fait charger.
function tanakhCommSources() {
    const opened = Object.keys(tanakhState.open).length > 0;
    const flow = tanakhFlowOn();   // en texte continu, seuls les versets ouverts montrent des commentaires : les cases cochées ne comptent pas
    return tanakhCommAvailable().filter(c => (!flow && tanakhState.comm[c.id]) || (opened && (tanakhCommLoaded[c.id] || {})[tanakhState.book]));
}

// Les commentateurs cochés qui couvrent le livre ouvert : ceux qu'on affiche.
function tanakhCommActive() {
    return tanakhCommAvailable().filter(c => tanakhState.comm[c.id]);
}

// Charge les commentaires de ces exégètes pour le livre `id` (une fois chacun) ; puis réaffiche si on est toujours sur ce livre.
function tanakhLoadComm(list, id) {
    if (tanakhState.book !== id) return;
    const entry = tanakhIndex.books.find(b => b.id === id);
    const msg = toolEl('tool-tanakh-msg');
    list.forEach(comm => {
        const loaded = tanakhCommLoaded[comm.id] || (tanakhCommLoaded[comm.id] = {});
        const key = comm.id + '/' + id;
        if (loaded[id] || tanakhCommPending[key]) return;
        msg.textContent = t('tools.torah_loading');
        const get = (file) => fetch('data/tanakh/' + file + '.json').then(res => { if (!res.ok) throw new Error(comm.id + ' HTTP ' + res.status); return res.json(); });
        const withFr = comm.frKey && entry && entry[comm.frKey];
        tanakhCommPending[key] = Promise.all([get(comm.file + id), withFr ? get(comm.frFile + id) : Promise.resolve(null)])
            .then(([he, fr]) => {
                loaded[id] = { he, fr };
                msg.textContent = '';
                if (tanakhState.book === id) tanakhRender();
            })
            .catch(() => { msg.textContent = t('tools.tanakh_comm_error', { name: comm.name }); })
            .finally(() => { delete tanakhCommPending[key]; });
    });
}

// Charge les commentaires cochés du livre.
function tanakhLoadComments(id) {
    tanakhLoadComm(tanakhCommActive(), id);
}

// Charge (une fois) les masques de pastilles du livre, s'il a des exégètes ; puis réaffiche le texte si on est toujours sur ce livre.
// Sans ce fichier, le livre s'affiche sans pastilles.
function tanakhLoadCounts(id) {
    if (tanakhCounts[id] || !tanakhCommAvailable().length) return;
    fetch('data/tanakh/counts-' + id + '.json')
        .then(res => { if (!res.ok) throw new Error('counts HTTP ' + res.status); return res.json(); })
        .then(counts => {
            tanakhCounts[id] = counts;
            if (tanakhState.book === id) tanakhRenderText(tanakhCurrent());
        })
        .catch(() => { /* pas de pastilles : le reste de l'écran fonctionne */ });
}

// Les exégètes du registre qui commentent le verset (chapitre `c`, verset `v`, depuis 0), selon le masque du livre ; seulement ceux
// que le livre déclare. Vide tant que le masque n'est pas chargé.
function tanakhVerseComms(c, v) {
    const counts = tanakhCounts[tanakhState.book];
    const mask = counts && counts.chapters[c] ? counts.chapters[c][v] : 0;
    if (!mask) return [];
    const available = tanakhCommAvailable();
    return counts.order.map((id, k) => (mask >> k) & 1 ? available.find(c => c.id === id) : null).filter(Boolean);
}

// La pastille d'un verset : « 💬 n », n exégètes le commentent ; au toucher, elle déplie (ou replie) tous leurs commentaires sur ce verset,
// cochés ou non. Le nom des exégètes est dans l'infobulle et l'étiquette d'accessibilité.
function tanakhBadge(c, v, list) {
    const key = c + ':' + v;
    const names = list.map(c => c.name).join(', ');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tanakh-comm-badge';
    btn.dataset.badge = key;
    btn.textContent = '💬 ' + list.length;
    btn.title = names;
    btn.setAttribute('aria-label', t(list.length === 1 ? 'tools.tanakh_comm_count_one' : 'tools.tanakh_comm_count', { n: list.length, names }));
    btn.setAttribute('aria-expanded', tanakhState.open[key] ? 'true' : 'false');
    btn.onclick = () => tanakhToggleVerse(c, v);
    return btn;
}

function tanakhToggleVerse(c, v) {
    const key = c + ':' + v;
    if (tanakhState.open[key]) delete tanakhState.open[key]; else tanakhState.open[key] = true;
    tanakhRenderText(tanakhCurrent());
    if (tanakhState.open[key]) tanakhLoadComm(tanakhVerseComms(c, v), tanakhState.book);
}

function tanakhToggleComm(id, checked) {
    tanakhState.comm[id] = checked;
    tanakhRender();
    if (checked) tanakhLoadComments(tanakhState.book);
}

function tanakhRender() {
    tanakhRenderBooks();
    const book = tanakhCurrent();
    if (!book) return;
    tanakhRenderMode();
    tanakhRenderChapters(book);
    tanakhRenderAliyah();
    tanakhRenderCycle();
    tanakhRenderSummary();
    tanakhRenderSummaryToggle();
    tanakhRenderBottomNav();
    tanakhRenderVowels();
    tanakhRenderShow();
    tanakhRenderFlow();
    tanakhRenderCommPanel();
    tanakhRenderChneToggle();
    tanakhRenderText(book);
    const source = t('tools.tanakh_source', { edition: book.edition });
    toolEl('tool-tanakh-source').textContent = [source].concat(tanakhChneOn() ? [t('tools.tanakh_onkelos_source')] : [], tanakhCommSources().map(c => t(c.sourceNach && book.group !== 'torah' ? c.sourceNach : c.source))).join(' ');
}

// Les 24 livres dans une liste déroulante, groupés par tradition (Torah, Nevi'im, Ketouvim). Un livre non généré est désactivé.
function tanakhRenderBooks() {
    const box = toolEl('tool-tanakh-books');
    toolClear(box);
    if (!tanakhIndex) return;
    const select = document.createElement('select');
    select.id = 'tool-tanakh-book';
    select.className = 'tool-input tanakh-book-select';
    select.setAttribute('aria-label', t('tools.torah_book_label'));
    select.onchange = () => tanakhPickBook(tanakhIndex.books.find(b => b.id === select.value));
    TANAKH_GROUPS.forEach(([group, labelKey]) => {
        const og = document.createElement('optgroup');
        og.label = t(labelKey);
        tanakhIndex.books.filter(b => b.group === group).forEach(entry => {
            const opt = document.createElement('option');
            opt.value = entry.id;
            opt.lang = 'fr';
            opt.textContent = `${entry.fr} · ${entry.he}`;
            opt.disabled = !entry.available;
            opt.selected = entry.id === tanakhState.book;
            og.appendChild(opt);
        });
        select.appendChild(og);
    });
    box.appendChild(select);
    // « Situer dans la chronologie » : l'époque que raconte le livre.
    if (tanakhState.book && typeof ChronologieCore !== 'undefined') {
        const id = tanakhState.book;
        const entry = tanakhIndex.books.find(b => b.id === id);
        const row = document.createElement('div');
        row.className = 'gen-actions';
        box.appendChild(row);
        chrAddTargetButton(row, model => ChronologieCore.forBook(model, id, entry ? entry.fr : id), 'screen-tool-tanakh', () => tanakhState.book === id);
    }
}

// Charge (une fois) la liste des parachiot ; puis réaffiche, car le choix par paracha n'existe qu'une fois la liste là.
function tanakhLoadParashot() {
    if (!tanakhHasParashot(true)) return;
    // Chaque fichier se charge à part, s'il manque : tanakhParashot peut déjà être rempli (ouverture depuis l'accueil) sans que les autres le soient.
    if (!tanakhParashot) {
        torahReaderLoadParashot()
            .then(data => { tanakhParashot = data; tanakhRender(); })
            .catch(() => { /* pas de choix par paracha : le choix par chapitre reste */ });
    }
    // Les aliyot arrivent à part : sans elles, la paracha s'affiche entière, sans rangée de boutons.
    if (!tanakhAliyot) {
        fetch('data/torah/aliyot.json')
            .then(res => { if (!res.ok) throw new Error('aliyot HTTP ' + res.status); return res.json(); })
            .then(data => { tanakhAliyot = data; tanakhRender(); })
            .catch(() => { /* pas de découpage par aliyah */ });
    }
    // Les haftarot et le calendrier des parachiot : sans eux, ni la rangée « Haftara » ni la recherche par date.
    if (!tanakhHaftarot) {
        fetch('data/torah/haftarot.json')
            .then(res => { if (!res.ok) throw new Error('haftarot HTTP ' + res.status); return res.json(); })
            .then(data => { tanakhHaftarot = data; tanakhRender(); })
            .catch(() => { /* pas de haftarot */ });
    }
    if (!tanakhCalendar) {
        fetch('data/torah/calendar.json')
            .then(res => { if (!res.ok) throw new Error('calendrier HTTP ' + res.status); return res.json(); })
            .then(data => { tanakhCalendar = data; tanakhRender(); })
            .catch(() => { /* pas de recherche par date */ });
    }
}

// Le livre ouvert est l'un des cinq de la Torah ? (`ignoreLoaded` : sans exiger que la liste soit chargée.)
function tanakhHasParashot(ignoreLoaded) {
    return TANAKH_TORAH_IDS.includes(tanakhState.book) && (!!tanakhParashot || !!ignoreLoaded);
}

// Le mode d'affichage effectif : « paracha » seulement pour un livre de la Torah dont la liste est chargée.
function tanakhMode() {
    return tanakhState.mode === 'parasha' && tanakhHasParashot() ? 'parasha' : 'chapter';
}

// Les parachiot du livre ouvert, dans l'ordre : [{ he, fr, c, v }] (premier verset de chacune ; la suivante lui met fin).
function tanakhBookParashot() {
    const n = TANAKH_TORAH_IDS.indexOf(tanakhState.book) + 1;
    return tanakhParashot ? tanakhParashot.parashot.map((p, gi) => Object.assign({ gi }, p)).filter(p => p.book === n) : [];
}

// Les débuts d'aliyot de la paracha affichée : [7 débuts [c, v] (chapitre, verset depuis 1), maftir ou null], ou null sans le fichier.
function tanakhAliyahStarts() {
    const here = tanakhBookParashot()[tanakhState.parasha];
    return tanakhAliyot && here ? tanakhAliyot.parashot[here.gi] || null : null;
}

// Les débuts et la fin de ce qu'on affiche, en (chapitre, verset) depuis 1 : une paracha (fin : le début de la suivante, ou null jusqu'à la fin du
// livre) ou, une aliyah étant choisie, de son début à celui de la suivante. La septième va jusqu'à la fin de la paracha, et le maftir (une reprise
// de sa fin) aussi.
function tanakhBounds() {
    const list = tanakhBookParashot();
    const here = list[tanakhState.parasha];
    if (!here) return null;
    const next = list[tanakhState.parasha + 1];
    const end = next ? [next.c, next.v] : null;
    const starts = tanakhAliyahStarts();
    const n = tanakhState.aliyah;
    if (!n || !starts || !starts[n - 1]) return { start: [here.c, here.v], end };
    return { start: starts[n - 1], end: n < 7 ? starts[n] : end };
}

// Les morceaux de texte à afficher : [{ c, from, to }] (chapitre depuis 0 ; versets de `from` à `to` exclu). Un chapitre en mode chapitre, une paracha
// ou une aliyah en mode paracha, d'un verset de départ à celui qui précède la fin (ou à la fin du livre).
function tanakhSegments(book) {
    if (tanakhState.haftara) return tanakhHaftaraSegments(book);
    if (tanakhMode() !== 'parasha') return [{ c: tanakhState.chapter, from: 0, to: (book.chapters[tanakhState.chapter] || []).length }];
    const bounds = tanakhBounds();
    if (!bounds) return [];
    const [sc, sv] = bounds.start;
    const lastC = bounds.end ? bounds.end[0] - 1 : book.chapters.length - 1;
    const out = [];
    for (let c = sc - 1; c <= lastC; c++) {
        const from = c === sc - 1 ? sv - 1 : 0;
        const to = bounds.end && c === bounds.end[0] - 1 ? bounds.end[1] - 1 : book.chapters[c].length;
        if (to > from) out.push({ c, from, to });
    }
    return out;
}

// Les repères d'aliyot de la paracha entière : { 'chapitre:verset' (depuis 0) : [numéros] }, y compris le maftir (8). Vide sans le fichier.
function tanakhAliyahMarks() {
    const starts = tanakhAliyahStarts();
    const marks = {};
    (starts || []).forEach((st, k) => {
        if (!st) return;
        const key = (st[0] - 1) + ':' + (st[1] - 1);
        (marks[key] = marks[key] || []).push(k + 1);
    });
    return marks;
}

const TANAKH_ALIYAH_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'ששי', 'שביעי', 'מפטיר'];

// Le titre d'un repère d'aliyah, au début de son premier verset.
function tanakhAliyahTitle(n) {
    const h = document.createElement('div');
    h.className = 'tanakh-aliyah-title';
    h.lang = 'fr';
    h.dir = 'ltr';
    // Le français à gauche, l'hébreu à droite : deux éléments séparés (flex), pour que le sens de lecture de l'un ne déplace pas l'autre.
    const fr = document.createElement('span');
    fr.textContent = n === 8 ? t('tools.tanakh_maftir_from') : t('tools.tanakh_aliyah_n', { n });
    h.appendChild(fr);
    const he = document.createElement('span');
    he.lang = 'he';
    he.dir = 'rtl';
    he.textContent = TANAKH_ALIYAH_HE[n - 1];
    h.appendChild(he);
    return h;
}

// Les aliyot qu'on peut choisir : 1 à 7, et 8 (maftir) quand la paracha en a un.
function tanakhAliyahChoices() {
    const starts = tanakhAliyahStarts();
    if (!starts) return [];
    return [1, 2, 3, 4, 5, 6, 7].concat(starts[7] ? [8] : []);
}

// Les résumés (case « Résumé ») : une phrase par chapitre pour les 929 chapitres des 24 livres, et une phrase par livre (ou par partie : I et II Samuel, les
// douze prophètes…), dans `data/tanakh/resume-<livre>.json` (chapters : même ordre que les chapitres du livre ; parts : une phrase par partie du livre, quand il
// en a). Texte écrit pour l'application, en français, à relire par une personne compétente. Chargés une fois par livre ; sans le fichier, rien ne s'affiche.
function tanakhLoadSummaries(id) {
    if (tanakhSummaries[id]) return;
    fetch('data/tanakh/resume-' + id + '.json')
        .then(res => { if (!res.ok) throw new Error('resume HTTP ' + res.status); return res.json(); })
        .then(data => {
            tanakhSummaries[id] = data;
            if (tanakhState.book === id) tanakhRender();
        })
        .catch(() => { /* pas de résumé : le reste de l'écran fonctionne */ });
}

// Le résumé du chapitre `c` (depuis 0) du livre ouvert, ou ''.
function tanakhChapterSummary(c) {
    const data = tanakhSummaries[tanakhState.book];
    return data && data.chapters && data.chapters[c] ? data.chapters[c] : '';
}

// Le nom d'un chapitre pour l'étiquette d'un résumé : « Chapitre 3 », ou « I Samuel 3 » pour un livre en parties.
function tanakhChapterName(book, c) {
    const part = book.parts ? tanakhPartOf(book, c) : null;
    return part ? t('tools.tanakh_part_chapter', { part: part.fr, n: c - part.first + 1 }) : t('tools.tanakh_chapter_option', { n: c + 1 });
}

// Ce qu'on lit, résumé : la ligne du livre (ou de sa partie) et celle du chapitre ouvert (mode « Par chapitre ») ; en mode « Par paracha », la paracha
// affichée (texte de « Commandements et principes », `tools.cmd_parachiot_*`, ui/fr.json : une seule rédaction, lue ici), les résumés de chapitre se
// plaçant sous le titre de chaque chapitre (tanakhRenderText). Rien pour une haftara, ni quand la case « Résumé » est décochée.
function tanakhSummaryLines() {
    const lines = [];
    if (!tanakhState.summary || tanakhState.haftara) return lines;
    const get = (key) => { const v = t(key); return v && v !== key ? v : ''; };
    const book = tanakhCurrent();
    const torah = TANAKH_TORAH_IDS.indexOf(tanakhState.book);
    if (torah >= 0 && tanakhMode() === 'parasha') {
        lines.push([t('tools.tanakh_summary_parasha'), get('tools.cmd_parachiot_' + ['g', 'e', 'l', 'n', 'd'][torah] + (tanakhState.parasha + 1) + '_text')]);
        return lines.filter(l => l[1]);
    }
    const data = tanakhSummaries[tanakhState.book];
    if (!data || !book) return lines;
    const c = tanakhState.chapter;
    const part = book.parts ? book.parts.indexOf(tanakhPartOf(book, c)) : -1;
    lines.push([t('tools.tanakh_summary_book'), part >= 0 && data.parts ? data.parts[part] : data.book]);
    lines.push([tanakhChapterName(book, c) + ' :', tanakhChapterSummary(c)]);
    return lines.filter(l => l[1]);
}

// La case « Résumé » : à droite de « Chné Mikra » sur la même ligne, ou à sa place quand ce mode n'est pas proposé (texte continu, ou livre sans Targoum).
// Pour une haftara (qui montre des morceaux de chapitres), pas de résumé : la case disparaît.
function tanakhRenderSummaryToggle() {
    toolEl('tool-tanakh-summary-label').hidden = !!tanakhState.haftara;
    toolEl('tool-tanakh-summary-on').checked = !!tanakhState.summary;
}

function tanakhToggleSummary(checked) {
    tanakhState.summary = checked;
    try { localStorage.setItem(TANAKH_SUMMARY_KEY, checked ? '1' : '0'); } catch (e) {}
    tanakhRender();
}

function tanakhRenderSummary() {
    const box = toolEl('tool-tanakh-summary');
    if (!box) return;
    toolClear(box);
    const lines = tanakhSummaryLines();
    box.hidden = !lines.length;
    lines.forEach(([label, text]) => {
        const row = tanakhCycleNode('div', 'tanakh-cycle-row');
        row.appendChild(tanakhCycleNode('strong', '', label + ' '));
        row.appendChild(tanakhCycleNode('span', 'tool-small', text));
        box.appendChild(row);
    });
}

// La rangée « Toute la paracha · 1 à 7 · Maftir » : visible en mode paracha, une fois le fichier des aliyot chargé.
function tanakhRenderAliyah() {
    const box = toolEl('tool-tanakh-aliyah');
    toolClear(box);
    const choices = tanakhMode() === 'parasha' ? tanakhAliyahChoices() : [];
    box.hidden = !choices.length;
    if (box.hidden) return;
    [0].concat(choices).forEach(n => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.setAttribute('aria-pressed', n === tanakhState.aliyah ? 'true' : 'false');
        btn.textContent = n === 0 ? t('tools.tanakh_aliyah_all') : n === 8 ? t('tools.tanakh_maftir') : String(n);
        btn.title = n === 0 ? '' : (n === 8 ? t('tools.tanakh_maftir') : t('tools.tanakh_aliyah_n', { n })) + ' · ' + TANAKH_ALIYAH_HE[n - 1];
        btn.onclick = () => { tanakhState.aliyah = n; tanakhRender(); };
        box.appendChild(btn);
    });
}

// Une liste déroulante des chapitres ; un livre en parties affiche le nom de la partie devant le numéro.
function tanakhRenderChapters(book) {
    const select = toolEl('tool-tanakh-chapter');
    toolClear(select);
    if (tanakhMode() === 'parasha') {
        const list = tanakhBookParashot();
        list.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.lang = 'fr';
            opt.textContent = `${p.fr} · ${p.he}`;
            if (i === tanakhState.parasha) opt.selected = true;
            select.appendChild(opt);
        });
        select.setAttribute('aria-label', t('tools.tanakh_parasha_label'));
        const choices = tanakhAliyahChoices();
        const first = tanakhState.parasha <= 0 && (!tanakhState.aliyah || tanakhState.aliyah <= 1);
        const last = tanakhState.parasha >= list.length - 1 && (!tanakhState.aliyah || tanakhState.aliyah >= choices[choices.length - 1]);
        toolEl('tool-tanakh-prev').disabled = first;
        toolEl('tool-tanakh-next').disabled = last;
        return;
    }
    select.setAttribute('aria-label', t('tools.torah_chapter_label'));
    book.chapters.forEach((_, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        const part = book.parts ? tanakhPartOf(book, i) : null;
        const n = part ? i - part.first + 1 : i + 1;
        opt.textContent = part ? t('tools.tanakh_part_chapter', { part: part.fr, n }) : t('tools.tanakh_chapter_option', { n });
        if (i === tanakhState.chapter) opt.selected = true;
        select.appendChild(opt);
    });
    toolEl('tool-tanakh-prev').disabled = tanakhState.chapter <= 0;
    toolEl('tool-tanakh-next').disabled = tanakhState.chapter >= book.chapters.length - 1;
}

// La partie à laquelle appartient le chapitre `i`.
function tanakhPartOf(book, i) {
    let current = book.parts[0];
    book.parts.forEach(part => { if (part.first <= i) current = part; });
    return current;
}

// « Par chapitre » ou « Par paracha » : visible pour un livre de la Torah dont la liste des parachiot est chargée. Passer d'un mode à l'autre
// garde la place : la paracha qui contient le début du chapitre, ou le chapitre où commence la paracha.
function tanakhRenderMode() {
    const box = toolEl('tool-tanakh-mode');
    toolClear(box);
    box.hidden = !tanakhHasParashot();
    if (box.hidden) return;
    [['chapter', 'tools.tanakh_mode_chapter'], ['parasha', 'tools.tanakh_mode_parasha']].forEach(([mode, key]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.setAttribute('aria-pressed', mode === tanakhMode() ? 'true' : 'false');
        btn.textContent = t(key);
        btn.onclick = () => tanakhSetMode(mode);
        box.appendChild(btn);
    });
}

function tanakhSetMode(mode) {
    if (mode === tanakhMode()) return;
    const list = tanakhBookParashot();
    if (mode === 'parasha') {
        let k = 0;
        list.forEach((p, i) => { if (p.c < tanakhState.chapter + 1 || (p.c === tanakhState.chapter + 1 && p.v <= 1)) k = i; });
        tanakhState.parasha = k;
        tanakhState.aliyah = 0;
    } else if (list[tanakhState.parasha]) {
        tanakhState.chapter = list[tanakhState.parasha].c - 1;
    }
    tanakhState.mode = mode;
    tanakhRender();
}

// Hébreu et français, hébreu seul, ou français seul.
function tanakhRenderShow() {
    const box = toolEl('tool-tanakh-show');
    toolClear(box);
    [['both', 'tools.tanakh_show_both'], ['he', 'tools.tanakh_show_he'], ['fr', 'tools.tanakh_show_fr']].forEach(([mode, key]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.setAttribute('aria-pressed', mode === tanakhState.show ? 'true' : 'false');
        btn.textContent = t(key);
        btn.onclick = () => { tanakhState.show = mode; tanakhRender(); };
        box.appendChild(btn);
    });
}

// Verset par verset, ou texte continu. La préférence est gardée sur l'appareil ; une note rappelle ce que le texte continu ne montre pas.
function tanakhRenderFlow() {
    const box = toolEl('tool-tanakh-flow');
    toolClear(box);
    [['verses', 'tools.tanakh_flow_verses'], ['text', 'tools.tanakh_flow_text']].forEach(([mode, key]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.setAttribute('aria-pressed', mode === tanakhState.flow ? 'true' : 'false');
        btn.textContent = t(key);
        btn.onclick = () => tanakhSetFlow(mode);
        box.appendChild(btn);
    });
    const note = toolEl('tool-tanakh-flow-note');
    note.hidden = !tanakhFlowOn();
    note.textContent = t('tools.tanakh_flow_note');
}

function tanakhSetFlow(mode) {
    tanakhState.flow = mode;
    try { localStorage.setItem(TANAKH_FLOW_KEY, mode); } catch (e) {}
    tanakhRender();
    if (mode === 'verses') {   // les commentaires et le Targoum cochés reviennent : on les charge s'ils manquent
        tanakhLoadComments(tanakhState.book);
        tanakhLoadOnkelos(tanakhState.book);
    }
}

// Le panneau « Commentateurs » : une case par exégète du registre, construites une fois (le focus du clavier ne se perd pas à chaque
// affichage). Le panneau disparaît si aucun exégète ne couvre le livre ; un exégète qui ne le couvre pas est grisé, sa case gardée.
function tanakhRenderCommPanel() {
    const panel = toolEl('tool-tanakh-comm');
    const list = toolEl('tool-tanakh-comm-list');
    const available = tanakhCommAvailable();
    panel.hidden = available.length === 0 || tanakhFlowOn();   // en texte continu, les commentaires ne s'affichent pas : le panneau se cache, ses cases restent cochées
    if (!list.children.length) {
        TANAKH_COMMENTATORS.forEach(comm => {
            const label = document.createElement('label');
            label.className = 'dict-toggle tanakh-comm-item';
            label.dataset.comm = comm.id;
            label.style.setProperty('--comm-color', comm.color);
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.id = 'tool-tanakh-comm-' + comm.id;
            box.onchange = () => tanakhToggleComm(comm.id, box.checked);
            label.appendChild(box);
            const name = document.createElement('span');
            name.textContent = ' ' + comm.name + ' ';
            label.appendChild(name);
            const he = document.createElement('span');
            he.lang = 'he';
            he.dir = 'rtl';
            he.className = 'tanakh-comm-he';
            he.textContent = comm.he;
            label.appendChild(he);
            list.appendChild(label);
        });
    }
    TANAKH_COMMENTATORS.forEach(comm => {
        const box = toolEl('tool-tanakh-comm-' + comm.id);
        box.checked = !!tanakhState.comm[comm.id];
        box.disabled = !available.includes(comm);
    });
    const active = tanakhCommActive();
    toolEl('tool-tanakh-comm-summary').textContent = active.length
        ? t('tools.tanakh_comm_title') + ' · ' + (active.length <= 3 ? active.map(c => c.name).join(', ') : active.length)
        : t('tools.tanakh_comm_title');
}

function tanakhRenderVowels() {
    const box = toolEl('tool-tanakh-vowels');
    toolClear(box);
    [['full', 'tools.tanakh_vowels_full'], ['consonants', 'tools.tanakh_vowels_consonants']].forEach(([mode, key]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.setAttribute('aria-pressed', mode === tanakhState.vowels ? 'true' : 'false');
        btn.textContent = t(key);
        btn.onclick = () => { tanakhState.vowels = mode; tanakhRender(); };
        box.appendChild(btn);
    });
}

// Le texte hébreu d'un verset : le qere est lu ; « sans voyelles » garde les consonnes du ketiv.
function tanakhHebrewVerse(verse) {
    return tanakhState.vowels === 'full'
        ? TorahCore.ketivText(verse).replace(/[{}]/g, '')
        : TorahCore.kriText(verse);
}

// Texte continu d'un morceau de chapitre (versets de `from` à `to` exclu) : les versets d'une même langue se suivent dans un paragraphe, chacun
// précédé de son petit numéro. Le paragraphe est coupé là où le texte le coupe (les marques (פ) et (ס) de la fin d'un verset) et à un repère
// d'aliyah ; avec l'hébreu et le français ensemble, un paragraphe compte aussi au plus TANAKH_FLOW_CHUNK versets, et le français suit
// l'hébreu de la même tranche.
// Les commentaires : le numéro d'un verset que des exégètes commentent est un bouton (comme la pastille « 💬 n » du mode verset par verset) ; au
// toucher, ses commentaires s'ouvrent sous le verset, le paragraphe étant coupé juste après lui (il reprend dessous), au bon endroit du texte.
// Seuls les versets ouverts montrent des commentaires : les cases du panneau « Commentateurs » (caché ici) ne jouent pas en texte continu.
function tanakhRenderFlowText(box, c, from, to, verses, frChapter, marks, showHe, showFr) {
    const groups = [];
    for (let i = from; i < to; i++) {
        const last = groups[groups.length - 1];
        const mark = marks[c + ':' + i];
        const parashah = i > from && /\((?:פ|ס)\)/.test(verses[i - 1]);   // le verset d'avant finit une parasha ouverte (פ) ou fermée (ס) : nouveau paragraphe
        const afterOpen = i > from && !!tanakhState.open[c + ':' + (i - 1)];   // le verset d'avant montre ses commentaires : le paragraphe s'arrête là
        if (!last || mark || parashah || afterOpen || (showHe && showFr && i - last.from >= TANAKH_FLOW_CHUNK)) groups.push({ from: i, to: i + 1, marks: mark || [] });
        else last.to = i + 1;
    }
    // Le numéro d'un verset : un bouton quand il a des commentaires, sinon un simple numéro.
    const number = (lang, i, text) => {
        const list = tanakhVerseComms(c, i);
        if (!list.length) {
            const num = document.createElement('span');
            num.className = 'tanakh-num';
            num.textContent = text;
            return num;
        }
        const key = c + ':' + i;
        const names = list.map(x => x.name).join(', ');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tanakh-num tanakh-num-btn';
        btn.dataset.badge = key + ':' + lang;   // le focus du clavier revient ici quand le texte est reconstruit
        btn.textContent = text;
        btn.title = names;
        btn.setAttribute('aria-label', t(list.length === 1 ? 'tools.tanakh_comm_count_one' : 'tools.tanakh_comm_count', { n: list.length, names }) + ' (' + t('tools.tanakh_verse_n', { n: i + 1 }) + ')');
        btn.setAttribute('aria-expanded', tanakhState.open[key] ? 'true' : 'false');
        btn.onclick = () => tanakhToggleVerse(c, i);
        return btn;
    };
    const paragraph = (lang, className, group, text, label) => {
        const p = document.createElement('p');
        p.className = className + ' tanakh-flow';
        p.lang = lang;
        p.dir = lang === 'he' ? 'rtl' : 'ltr';
        for (let i = group.from; i < group.to; i++) {
            if (i > group.from) p.appendChild(document.createTextNode(' '));
            p.appendChild(number(lang, i, label(i)));
            p.appendChild(document.createTextNode(' ' + text(i)));
        }
        return p;
    };
    // Les commentaires du verset `i`, sous son paragraphe : un titre, un bouton pour les masquer, puis les exégètes.
    const comments = (i) => {
        const inVerse = tanakhVerseComms(c, i);
        const box = document.createElement('div');
        box.className = 'tanakh-flow-comm';
        const head = document.createElement('div');
        head.className = 'tanakh-flow-comm-head';
        const title = document.createElement('span');
        title.lang = 'fr';
        title.dir = 'ltr';
        title.textContent = t('tools.tanakh_flow_comm_title', { n: i + 1 });
        const hide = document.createElement('button');
        hide.type = 'button';
        hide.className = 'tanakh-flow-comm-hide';
        hide.lang = 'fr';
        hide.textContent = t('tools.tanakh_flow_comm_hide');
        hide.onclick = () => tanakhToggleVerse(c, i);
        head.appendChild(title);
        head.appendChild(hide);
        box.appendChild(head);
        const paragraphs = tanakhCommParagraphs(c, i, inVerse, true);
        paragraphs.forEach(p => box.appendChild(p));
        if (inVerse.some(x => !(tanakhCommLoaded[x.id] || {})[tanakhState.book])) {   // pas encore chargés : la page se refait toute seule à leur arrivée
            const wait = document.createElement('p');
            wait.className = 'tool-small';
            wait.textContent = t('tools.torah_loading');
            box.appendChild(wait);
        }
        return box;
    };
    groups.forEach(group => {
        const block = document.createElement('div');
        block.className = 'tanakh-block';
        group.marks.forEach(n => block.appendChild(tanakhAliyahTitle(n)));
        if (showHe) block.appendChild(paragraph('he', 'tanakh-verse', group, i => tanakhHebrewVerse(verses[i]), i => TorahCore.hebrewNumeral(i + 1)));
        if (showFr) block.appendChild(paragraph('fr', 'tanakh-fr', group, i => frChapter[i], i => String(i + 1)));
        const last = group.to - 1;
        if (tanakhState.open[c + ':' + last] && tanakhVerseComms(c, last).length) block.appendChild(comments(last));
        box.appendChild(block);
    });
}

// Les paragraphes de commentaires à afficher sous le verset (chapitre `c`, verset `i`) : ceux des exégètes cochés (sauf `onlyOpened`, texte continu)
// et, si la pastille ou le numéro est ouvert, tous ceux qui le commentent ; seulement ceux dont le livre est chargé et qui ont quelque chose à dire
// ici. L'étiquette de nom n'est utile qu'à partir de deux exégètes.
function tanakhCommParagraphs(c, i, inVerse, onlyOpened) {
    const open = !!tanakhState.open[c + ':' + i];
    const blocks = tanakhCommAvailable()
        .filter(x => (!onlyOpened && tanakhState.comm[x.id]) || (open && inVerse.includes(x)))
        .filter(x => (tanakhCommLoaded[x.id] || {})[tanakhState.book])
        .map(x => [x, tanakhCommBlock(x, tanakhCommLoaded[x.id][tanakhState.book], c, i)])
        .filter(([, list]) => list.length);
    const out = [];
    blocks.forEach(([comm, list]) => {
        if (blocks.length > 1) tanakhCommTag(comm, list[0]);
        list.forEach(p => out.push(p));
    });
    return out;
}

// Un verset par bloc, numéroté dans son chapitre : l'hébreu (voyelles ou consonnes) et, dessous, la traduction française.
// Le qere est lu ; « sans voyelles » garde les consonnes du ketiv. `show` choisit ce qui s'affiche.
function tanakhRenderText(book) {
    const box = toolEl('tool-tanakh-text');
    // Le focus du clavier reste sur la pastille touchée quand le texte est reconstruit.
    const focused = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.badge : null;
    toolClear(box);
    const chne = tanakhChneOn();
    const targum = chne ? tanakhOnkelosLoaded[tanakhState.book] : null;   // chargé : sinon le mode attend
    const marks = tanakhMode() === 'parasha' ? tanakhAliyahMarks() : {};   // repères d'aliyot, en mode paracha
    tanakhSegments(book).forEach(({ c, from, to }) => {
        const verses = book.chapters[c] || [];
        const frChapter = book.french ? book.french[c] : null;
        const showHe = tanakhState.show !== 'fr' || !frChapter || chne;
        const showFr = tanakhState.show !== 'he' && !!frChapter;
        if (tanakhMode() === 'parasha' || tanakhState.haftara) {
            const title = document.createElement('h3');
            title.className = 'tanakh-chapter-title';
            title.lang = 'fr';
            title.dir = 'ltr';
            const part = book.parts ? tanakhPartOf(book, c) : null;
            title.textContent = part ? t('tools.tanakh_part_chapter', { part: part.fr, n: c - part.first + 1 }) : t('tools.tanakh_chapter_option', { n: c + 1 });
            box.appendChild(title);
            // Le résumé du chapitre, sous son titre (mode « Par paracha » : plusieurs chapitres à la suite ; pas pour une haftara).
            const summary = tanakhState.summary && !tanakhState.haftara ? tanakhChapterSummary(c) : '';
            if (summary) {
                const line = document.createElement('p');
                line.className = 'tanakh-chapter-summary';
                line.lang = 'fr';
                line.dir = 'ltr';
                line.textContent = summary;
                box.appendChild(line);
            }
        }
        if (tanakhFlowOn()) {
            tanakhRenderFlowText(box, c, from, Math.min(to, verses.length), verses, frChapter, marks, showHe, showFr);
            return;
        }
        verses.slice(from, to).forEach((verse, k) => {
            const i = from + k;
            const block = document.createElement('div');
            block.className = 'tanakh-block';
            (marks[c + ':' + i] || []).forEach(n => block.appendChild(tanakhAliyahTitle(n)));
            const inVerse = tanakhVerseComms(c, i);
            const lead = [];
            if (showHe) {
                const p = document.createElement('p');
                p.className = 'tanakh-verse';
                p.lang = 'he';
                p.dir = 'rtl';
                const num = document.createElement('span');
                num.className = 'tanakh-num';
                num.textContent = TorahCore.hebrewNumeral(i + 1);
                p.appendChild(num);
                const text = tanakhHebrewVerse(verse);
                p.appendChild(document.createTextNode(' ' + text));
                block.appendChild(p);
                lead.push(p);
                if (targum) {
                    // Chné Mikra : le verset une seconde fois (sans numéro, masqué aux lecteurs d'écran), puis le Targoum.
                    const again = document.createElement('p');
                    again.className = 'tanakh-verse tanakh-verse-repeat';
                    again.lang = 'he';
                    again.dir = 'rtl';
                    again.setAttribute('aria-hidden', 'true');
                    again.textContent = text;
                    block.appendChild(again);
                    const tg = document.createElement('p');
                    tg.className = 'tanakh-targum';
                    tg.lang = 'arc';
                    tg.dir = 'rtl';
                    const raw = targum.chapters[c][i] || '';
                    tg.textContent = tanakhState.vowels === 'full' ? raw : TorahCore.stripMarks(raw, 'consonants');
                    block.appendChild(tg);
                }
            }
            if (showFr) {
                const f = document.createElement('p');
                f.className = 'tanakh-fr';
                f.lang = 'fr';
                f.dir = 'ltr';
                const num = document.createElement('span');
                num.className = 'tanakh-num';
                num.textContent = String(i + 1);
                f.appendChild(num);
                f.appendChild(document.createTextNode(' ' + frChapter[i]));
                block.appendChild(f);
                lead.push(f);
            }
            if (inVerse.length && lead.length) lead[0].appendChild(tanakhBadge(c, i, inVerse));
            tanakhCommParagraphs(c, i, inVerse, false).forEach(p => block.appendChild(p));
            box.appendChild(block);
        });
    });
    if (focused) {
        const again = box.querySelector('[data-badge="' + focused + '"]');
        if (again) again.focus();
    }
}

// Les commentaires d'un exégète sur un verset, selon la langue choisie : l'hébreu, la traduction (l'hébreu quand elle manque), ou
// les deux, commentaire par commentaire.
function tanakhCommBlock(comm, data, c, verse) {
    const he = data.he.chapters[c][verse] || [];
    const fr = data.fr ? (data.fr.chapters[c] || [])[verse] || [] : [];
    const out = [];
    he.forEach((raw, k) => {
        const french = fr[k];
        if (tanakhState.show !== 'fr' || !french) out.push(tanakhCommComment(comm, raw, 'he'));
        if (french && tanakhState.show !== 'he') out.push(tanakhCommComment(comm, french, 'fr'));
    });
    return out;
}

// L'étiquette du nom hébreu de l'exégète, en tête de son premier commentaire du verset.
function tanakhCommTag(comm, p) {
    const tag = document.createElement('span');
    tag.className = 'tanakh-comm-tag';
    tag.lang = 'he';
    tag.textContent = comm.he;
    p.insertBefore(document.createTextNode(' '), p.firstChild);
    p.insertBefore(tag, p.firstChild);
}

// Un commentaire : le texte avec <b> (mot commenté), <i> (citation) et <small> (variante). Les balises deviennent des éléments créés ici ; le
// reste passe par des nœuds texte, jamais par du HTML brut. « Sans voyelles » retire aussi les voyelles du commentaire.
function tanakhCommComment(comm, raw, lang) {
    const p = document.createElement('p');
    p.className = 'tanakh-comm tanakh-comm-' + comm.id + (lang === 'fr' ? ' tanakh-comm-fr' : '');
    p.style.setProperty('--comm-color', comm.color);
    p.lang = lang;
    p.dir = lang === 'fr' ? 'ltr' : 'rtl';
    let target = p;
    raw.split(/(<\/?(?:b|i|small)>)/).forEach(part => {
        const tag = /^<(\/?)(b|i|small)>$/.exec(part);
        if (!tag) {
            if (!part) return;
            const text = tanakhState.vowels === 'full' || lang === 'fr' ? part : TorahCore.stripMarks(part, 'consonants');
            target.appendChild(document.createTextNode(text));
        } else if (tag[1]) {
            target = p;
        } else {
            target = document.createElement(tag[2]);
            p.appendChild(target);
        }
    });
    return p;
}

// La rangée du bas : les mêmes boutons précédent / suivant que celle du haut (mêmes états), et au milieu le nom de l'endroit lu (chapitre, ou
// paracha et aliyah), qui remonte au début du texte.
function tanakhRenderBottomNav() {
    // Une haftara s'affiche seule : ni choix de chapitre ni précédent / suivant.
    const nav = toolEl('tool-tanakh-prev').parentElement;
    nav.style.display = tanakhState.haftara ? 'none' : '';
    toolEl('tool-tanakh-nav-bottom').style.display = tanakhState.haftara ? 'none' : '';
    toolEl('tool-tanakh-prev2').disabled = toolEl('tool-tanakh-prev').disabled;
    toolEl('tool-tanakh-next2').disabled = toolEl('tool-tanakh-next').disabled;
    const chosen = toolEl('tool-tanakh-chapter').selectedOptions[0];
    let label = chosen ? chosen.textContent : '';
    const n = tanakhMode() === 'parasha' ? tanakhState.aliyah : 0;
    if (n) label += ' · ' + (n === 8 ? t('tools.tanakh_maftir') : t('tools.tanakh_aliyah_n', { n }));
    toolEl('tool-tanakh-nav-label').textContent = '↑ ' + label;
}

// Remonte en douceur à la rangée du haut (le choix du chapitre ou de la paracha), qui s'illumine un instant. Sans animation si l'appareil la
// réduit (prefers-reduced-motion).
function tanakhScrollTop() {
    const row = toolEl('tool-tanakh-prev').parentElement;
    const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    row.classList.remove('tanakh-nav-flash');
    if (calm) return;   // pas de halo non plus : la coupure est faite ici, car tests/motion.test.js exige que le dernier bloc prefers-reduced-motion du CSS soit celui de la section MOUVEMENT
    void row.offsetWidth;   // relance l'animation si on enchaîne
    row.classList.add('tanakh-nav-flash');
    row.addEventListener('animationend', () => row.classList.remove('tanakh-nav-flash'), { once: true });
}

// Précédent / suivant du bas : change de chapitre (ou de paracha, ou d'aliyah), puis remonte au début du texte.
function tanakhGoBottom(delta) {
    tanakhGoChapter(delta);
    tanakhScrollTop();
}

function tanakhSelectChapter(value) {
    if (tanakhMode() === 'parasha') { tanakhState.parasha = Number(value); tanakhState.aliyah = 0; }
    else tanakhState.chapter = Number(value);
    tanakhRender();
}

function tanakhGoChapter(delta) {
    const book = tanakhCurrent();
    if (!book) return;
    if (tanakhMode() === 'parasha') {
        const n = tanakhState.aliyah;
        const choices = tanakhAliyahChoices();
        const stepped = n ? choices.indexOf(n) + delta : -1;
        if (n && stepped >= 0 && stepped < choices.length) {
            tanakhState.aliyah = choices[stepped];   // une aliyah choisie : précédent / suivant parcourent les aliyot
        } else {
            const next = tanakhState.parasha + delta;
            if (next < 0 || next >= tanakhBookParashot().length) return;
            tanakhState.parasha = next;
            // Au bout d'une aliyah, on passe à la première de la paracha suivante, ou à la dernière de la précédente (la septième : le maftir la reprend).
            tanakhState.aliyah = n ? (delta > 0 ? 1 : 7) : 0;
        }
    } else {
        const next = tanakhState.chapter + delta;
        if (next < 0 || next >= book.chapters.length) return;
        tanakhState.chapter = next;
    }
    tanakhRender();  // pas de défilement : l'écran reste à la même place
}


// =====================================================================================================================================
// === HAFTAROT ET PARACHA PAR DATE (mode « Par paracha ») ===
// =====================================================================================================================================
// Sous les aliyot : la haftara de la paracha (rite achkénaze, et séfarade quand il diffère), qui ouvre le texte dans le livre des Prophètes ; et « Paracha et
// haftara par date » : une date donne le chabbat, sa paracha, sa haftara (celle des chabbats spéciaux : Chékalim, Zakhor, Para, HaHodech, Hanoucca,
// Roch ’Hodech…), calendrier de la diaspora, 2025 à 2036. Données : data/torah/haftarot.json et calendar.json (scripts/build_haftarot.js, build_calendar.js) ;
// règles : js/haftarotCore.js (testé). Une haftara est affichée seule, avec un bandeau et « Retour à la paracha ».

// Les morceaux de texte de la haftara dans le livre chargé : [{ c, from, to }].
function tanakhHaftaraSegments(book) {
    const lengths = book.chapters.map(c => c.length);
    const out = [];
    tanakhState.haftara.refs.forEach(ref => {
        const p = HaftarotCore.parseRef(ref);
        const part = p && p.part && book.parts ? book.parts.find(x => x.fr === p.part) : null;
        HaftarotCore.segments(ref, part ? part.first : 0, lengths).forEach(seg => out.push(seg));
    });
    return out;
}

function tanakhCycleNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

// La paracha (rang dans son livre) → ce qu'il faut pour l'ouvrir.
function tanakhParashaTarget(gi) {
    const p = tanakhParashot.parashot[gi];
    const rank = tanakhParashot.parashot.slice(0, gi).filter(x => x.book === p.book).length;
    return { id: TANAKH_TORAH_IDS[p.book - 1], rank: rank, p: p };
}

// Montée lue chaque jour de la semaine (Date.getDay() : 0 = dimanche, 6 = samedi).
const TANAKH_DAY_ALIYAH = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 };

// Ouvre la paracha `gi` ; `aliyah` (0 : toute la paracha, 1 à 7, 8 : maftir) choisit la montée affichée.
function tanakhGoParasha(gi, aliyah = 0) {
    const target = tanakhParashaTarget(gi);
    if (tanakhState.book === target.id && !tanakhState.haftara) {
        Object.assign(tanakhState, { mode: 'parasha', parasha: target.rank, aliyah });
        tanakhRender();
        tanakhScrollTop();
    } else {
        tanakhOpen(target.id, { mode: 'parasha', parasha: target.rank, aliyah });
    }
}

// Ouvre une haftara : `info` = { refs, title, rite ('a' | 's' | ''), back : { id, rank } } ; plusieurs livres (rare) : le premier s'ouvre, un bouton ouvre l'autre.
function tanakhOpenHaftara(info, group) {
    const groups = HaftarotCore.groupByBook(info.refs);
    const g = groups[group || 0];
    tanakhOpen(g.id, { mode: 'chapter', haftara: { refs: g.refs, all: info.refs, title: info.title, rite: info.rite, back: info.back, group: group || 0 } });
}

// Les boutons d'une haftara : « Achkénaze : Isaïe 54:1–55:5 », « Séfarade : … » ; un seul bouton quand les deux rites lisent la même chose.
function tanakhHaftaraChips(entry, title, back) {
    const row = tanakhCycleNode('div', 'tool-history-chips tanakh-haftara-chips');
    row.setAttribute('role', 'group');
    const add = (refs, rite, label) => {
        const btn = tanakhCycleNode('button', 'tool-history-chip', label + HaftarotCore.refsLabel(refs));
        btn.type = 'button';
        btn.dataset.rite = rite || 'all';
        btn.onclick = () => tanakhOpenHaftara({ refs: refs, title: title, rite: rite, back: back });
        row.appendChild(btn);
    };
    if (entry.s) {
        add(entry.a, 'a', t('tools.tanakh_haftara_ashk') + ' : ');
        add(entry.s, 's', t('tools.tanakh_haftara_seph') + ' : ');
    } else {
        add(entry.a, '', '');
    }
    return row;
}

function tanakhRenderCycle() {
    const box = toolEl('tool-tanakh-cycle');
    toolClear(box);
    // Une haftara ouverte : le bandeau, ses autres livres, et le retour.
    const hf = tanakhState.haftara;
    if (hf) {
        box.hidden = false;
        box.classList.add('is-haftara');
        box.appendChild(tanakhCycleNode('strong', 'tanakh-cycle-title', t('tools.tanakh_haftara_title', { name: hf.title })));
        const rite = hf.rite ? t('tools.tanakh_haftara_rite_' + hf.rite) + ' · ' : '';
        box.appendChild(tanakhCycleNode('p', 'tool-small', rite + HaftarotCore.refsLabel(hf.all)));
        const row = tanakhCycleNode('div', 'tool-history-chips');
        HaftarotCore.groupByBook(hf.all).forEach((g, i) => {
            if (i === hf.group) return;
            const btn = tanakhCycleNode('button', 'tool-history-chip', t('tools.tanakh_haftara_other', { ref: HaftarotCore.refsLabel(g.refs) }));
            btn.type = 'button';
            btn.onclick = () => tanakhOpenHaftara(hf, i);
            row.appendChild(btn);
        });
        const back = tanakhCycleNode('button', 'tool-history-chip', t('tools.tanakh_haftara_back'));
        back.type = 'button';
        back.id = 'tool-tanakh-haftara-back';
        back.onclick = () => tanakhOpen(hf.back.id, { mode: 'parasha', parasha: hf.back.rank, aliyah: 0 });
        row.appendChild(back);
        box.appendChild(row);
        return;
    }
    box.classList.remove('is-haftara');
    const here = tanakhMode() === 'parasha' && tanakhHaftarot ? tanakhBookParashot()[tanakhState.parasha] : null;
    box.hidden = !here;
    if (!here) return;
    // La haftara de la paracha affichée.
    const reg = HaftarotCore.regular(tanakhHaftarot, here.gi);
    const line = tanakhCycleNode('div', 'tanakh-cycle-row');
    line.appendChild(tanakhCycleNode('strong', '', t('tools.tanakh_haftara') + ' '));
    if (reg) {
        line.appendChild(tanakhHaftaraChips(reg, here.fr, { id: tanakhState.book, rank: tanakhState.parasha }));
    } else {
        line.appendChild(tanakhCycleNode('span', 'tool-small', t('tools.tanakh_haftara_none')));
    }
    box.appendChild(line);
    // Par date.
    if (tanakhCalendar) box.appendChild(tanakhRenderWeek());
}

function tanakhWeekValue() {
    const d = tanakhWeekDate || new Date();
    const pad = n => (n < 10 ? '0' + n : String(n));
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function tanakhRenderWeek() {
    const details = tanakhCycleNode('details', 'tanakh-week');
    details.open = tanakhWeekOpen;
    details.ontoggle = () => { tanakhWeekOpen = details.open; };
    details.appendChild(tanakhCycleNode('summary', '', t('tools.tanakh_week_title')));
    const pick = tanakhCycleNode('label', 'tanakh-week-pick');
    pick.appendChild(tanakhCycleNode('span', 'tool-small', t('tools.tanakh_week_date') + ' '));
    const input = tanakhCycleNode('input', 'tool-input');
    input.type = 'date';
    input.id = 'tool-tanakh-date';
    input.value = tanakhWeekValue();
    input.onchange = () => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.value);
        tanakhWeekDate = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
        tanakhRenderCycle();
    };
    pick.appendChild(input);
    const today = tanakhCycleNode('button', 'tool-history-chip', t('tools.tanakh_week_today'));
    today.type = 'button';
    today.onclick = () => { tanakhWeekDate = null; tanakhRenderCycle(); };
    pick.appendChild(today);
    details.appendChild(pick);
    const result = tanakhCycleNode('div', 'tanakh-week-result');
    result.id = 'tool-tanakh-week-result';
    result.setAttribute('role', 'status');
    const date = tanakhWeekDate || new Date();
    const info = HaftarotCore.sabbathInfo(tanakhCalendar, tanakhHaftarot, date);
    if (!info) {
        const range = HaftarotCore.calendarRange(tanakhCalendar);
        const key = HaftarotCore.sabbathKey(date);
        const inside = range && key >= range.first && key <= range.last;
        result.appendChild(tanakhCycleNode('p', 'tool-small', t(inside ? 'tools.tanakh_week_holiday' : 'tools.tanakh_week_out')));
    } else {
        const [y, m, d] = info.key.split('-').map(Number);
        const when = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        result.appendChild(tanakhCycleNode('strong', '', t('tools.tanakh_week_result', { date: when })));
        const names = info.indices.map(gi => tanakhParashot.parashot[gi]);
        result.appendChild(tanakhCycleNode('p', 'tanakh-week-parasha', names.map(p => p.fr).join(' – ') + ' · ' + names.map(p => p.he).join(' – ')));
        if (info.why) result.appendChild(tanakhCycleNode('p', 'tool-small tanakh-week-why', info.why));
        const open = tanakhCycleNode('button', 'tool-history-chip', t('tools.tanakh_week_open'));
        open.type = 'button';
        open.id = 'tool-tanakh-week-open';
        open.onclick = () => tanakhGoParasha(info.indices[0]);
        result.appendChild(open);
        const dayAliyah = TANAKH_DAY_ALIYAH[new Date().getDay()];
        const day = tanakhCycleNode('button', 'tool-history-chip', t('tools.tanakh_week_day'));
        day.type = 'button';
        day.id = 'tool-tanakh-week-day';
        day.onclick = () => tanakhGoParasha(info.indices[0], dayAliyah);
        result.appendChild(day);
        if (info.haftara) {
            result.appendChild(tanakhCycleNode('strong', 'tanakh-week-haftara', t('tools.tanakh_haftara') + ' '));
            const target = tanakhParashaTarget(info.indices[0]);
            result.appendChild(tanakhHaftaraChips(info.haftara, names.map(p => p.fr).join(' – '), { id: target.id, rank: target.rank }));
        }
    }
    details.appendChild(result);
    details.appendChild(tanakhCycleNode('p', 'tool-small', t('tools.tanakh_week_note')));
    return details;
}
