// =========================================================================
// === L'ACCUEIL DE TORAHAXE : quatre onglets ===
// =========================================================================
// Aujourd'hui (la prière de l'heure, les horaires, la paracha, l'étude du jour), Étude (les textes et les dictionnaires),
// Explorer (les maîtres, les lieux, les lois) et Jouer (jeux par thème, frises, récits). Tout part d'un seul catalogue, HOME_ENTRIES :
// les onglets, la recherche et les raccourcis lisent la même liste. Les mots hébreux des tuiles sont ceux du catalogue.
// Rien n'est construit avec du HTML : seulement des nœuds DOM (createElement, textContent).

const HOME_PROMO_URL = 'https://apps.apple.com/fr/app/historiaxe/id6827736918';
const HOME_PROMOS = {
    tools: 'Vous aimez ces outils ? Retrouvez le même esprit pour toute l\'Histoire (convertisseurs, calendriers, cartes…) en téléchargeant HistoriAxe !',
    jouer: 'Vous aimez ces jeux, ces frises et ces récits ? Découvrez-en bien d\'autres, dans tous les domaines et de toutes les époques, en téléchargeant HistoriAxe !'
};

const homeTool = (id) => () => openTool(id, 'screen-main');

// he : le mot de la tuile ; fr : son nom ; desc : la ligne d'explication ; kw : mots de plus pour la recherche ; run : ce qui s'ouvre.
const HOME_ENTRIES = {
    siddur: { he: 'סידור', fr: 'Siddour', desc: 'Le siddour séfarade : Chaharit, Minha, Arvit, Birkat haMazon, Omer…', kw: 'prière priere tefila', run: homeTool('siddur') },
    zmanim: { he: 'זמנים', fr: 'Zmanim', desc: 'Les horaires du jour pour n\'importe quel lieu : aube, Chéma, Minha, coucher, Chabbat', kw: 'horaires bougies coucher soleil daf yomi', run: homeTool('zmanim') },
    kotel: { he: 'כותל', fr: 'Kotel', desc: 'La boussole : la direction de Jérusalem depuis chez vous', kw: 'boussole jérusalem direction mizrah', run: homeTool('kotel') },
    tanakh: { he: 'תנ״ך', fr: 'Tanakh', desc: 'Les 24 livres, verset par verset, avec Rachi', kw: 'bible torah prophètes écrits haftara psaumes', run: homeTool('tanakh') },
    michna: { he: 'משנה', fr: 'Michna', desc: 'Les 63 traités en hébreu, avec Rambam, Bartenura, Tosafot Yom Tov…', kw: 'mishna mishnah bartenura rambam tosafot yom tov melekhet shelomoh tiferet israel gra rash traités ordres zeraim moed nashim nezikin kodashim tohorot avot', run: homeTool('michna') },
    talmud: { he: 'תלמוד', fr: 'Talmud', desc: 'Les 37 traités de la Guémara en araméen vocalisé, avec Rachi et Tossafot', kw: 'guemara gemara talmud bavli babylone berakhot daf amoud araméen', run: homeTool('talmud') },
    torahReader: { he: 'תיקון', fr: 'Tikkoun', desc: 'Le rouleau de la Torah, paracha après paracha', kw: 'torah rouleau paracha tikkun sefer', run: homeTool('torahReader') },
    commandments: { he: 'מצוות', fr: 'Mitsvot', desc: 'La Torah, la Michna et les 613 commandements, avec leurs sources', kw: 'commandements 613 décalogue noah avot', run: homeTool('commandments') },
    library: { he: 'ספרים', fr: 'Bibliothèque', desc: 'Qui a écrit quoi, quand et où : Michna, Talmud, Midrach, Kabbale', kw: 'livres auteurs talmud midrach', run: homeTool('library') },
    lexicon: { he: 'עברית', fr: 'Hébreu', desc: '2 000 mots de la Bible, dans les deux sens, avec leur racine', kw: 'dictionnaire français hébreu vocabulaire racine', run: homeTool('lexicon') },
    gemara: { he: 'ארמית', fr: 'Araméen', desc: 'Le vocabulaire de la Guémara, ses abréviations et ses sages', kw: 'dictionnaire guemara talmud vocabulaire', run: homeTool('gemara') },
    gematria: { he: 'גימטריה', fr: 'Guématria', desc: 'La valeur des lettres d\'un mot, en quatre modes de calcul', kw: 'valeur lettres nombres', run: homeTool('gematria') },
    genealogy: { he: 'תולדות', fr: 'Généalogie', desc: 'D\'Adam aux rois et aux prophètes, dans un seul arbre', kw: 'arbre adam abraham rois juges prophètes nations', run: homeTool('genealogy') },
    transmission: { he: 'חכמים', fr: 'Sages', desc: 'De Moïse à nos jours : qui a reçu la Torah de qui', kw: 'maîtres chaîne transmission michna gueonim richonim', run: homeTool('transmission') },
    hassidout: { he: 'חסידות', fr: 'Hassidout', desc: 'Du Baal Chem Tov à nos jours : les maîtres et les dynasties', kw: 'hassidisme baal chem tov rabbi', run: homeTool('hassidout') },
    biblical: { he: 'מפות', fr: 'Cartes', desc: 'Six cartes du Levant biblique : Abraham, le désert, les tribus', kw: 'cartes géographie levant désert tribus', run: homeTool('biblical') },
    chronologie: { he: 'סדר עולם', fr: 'Chronologie', desc: 'Époques, prophètes, juges et rois, Michkan et Temple, sur une seule frise', kw: 'frise temps dates histoire seder olam juges rois prophètes années hébraïques civiles michkan temple', run: homeTool('chronologie') },
    mishkan: { he: 'משכן', fr: 'Temple', desc: 'Le Tabernacle, ses ustensiles, les vêtements des prêtres et les Temples', kw: 'michkan mikdash tabernacle temple jérusalem', run: homeTool('mishkan') },
    hebrewCalendar: { he: 'לוח', fr: 'Calendrier', desc: 'Convertir une date, les fêtes de l\'année, les mois et la règle du calendrier', kw: 'fêtes dates conversion mois année hébraïque', run: homeTool('hebrewCalendar') },
    korbanot: { he: 'קרבנות', fr: 'Sacrifices', desc: 'Les korbanot : qui offre quoi, quand et combien', kw: 'offrandes korbanot temple', run: homeTool('korbanot') },
    tsaraat: { he: 'צרעת', fr: 'Plaies', desc: 'La Tsaraat pas à pas : peau, vêtements, maisons, purification', kw: 'lèpre tsaraat cohen pureté', run: homeTool('tsaraat') },
    statuts: { he: 'עריות', fr: 'Unions', desc: 'Statuts et unions permises : cohen, lévi, mamzer, guer…', kw: 'statuts mariage mamzer cohen halal guer', run: homeTool('statuts') },
    foodlaws: { he: 'כשרות', fr: 'Cacherout', desc: 'Les animaux purs et impurs, les mélanges interdits', kw: 'casher kasher aliments sauterelles oiseaux poissons', run: homeTool('foodlaws') },
    benedictions: { he: 'ברכות', fr: 'Bénédictions', desc: 'Quelle bénédiction dire sur quel aliment : 290 aliments, avec les notes (Beth Loubavitch)', kw: 'bracha berakha brakha berakhot aliment manger boire haets haadama mezonot chehakol hamotsi haguafen fruit légume pain vin birkhot hanehenin', run: homeTool('benedictions') },
    measures: { he: 'מידות', fr: 'Mesures', desc: 'Poids, volumes, distances et monnaies de la Bible', kw: 'coudée poids volumes monnaies chékel', run: homeTool('measures') },
    personalDates: { he: 'תאריכים', fr: 'Dates personnelles', desc: 'Hazkara, anniversaires hébraïques, bar et bat-mitsva, avec rappels', kw: 'hazkara azkara yahrzeit yartzeit yahrtzeit anniversaire décès naissance bar mitsva bat mitsva date hébraïque rappel notification', run: () => openDates('screen-main') },
    progress: { he: 'התקדמות', fr: 'Ma progression', desc: 'Série de jours, niveaux par domaine et badges', kw: 'progression série jours niveaux badges statistiques succès', run: () => openProgress('screen-main') },
    daily: { he: 'אתגר', fr: 'Défi du jour', desc: 'Cinq questions sur la date du jour : paracha, Daf Yomi, mois, fête, Téhilim', kw: 'jeu défi quotidien jour date paracha daf yomi mois fête téhilim', run: () => openDailyGame('screen-main') },
    review: { he: 'חזרה', fr: 'À réviser aujourd\'hui', desc: 'Mots du Tanakh et de la Guémara à revoir aujourd\'hui, en une seule séance', kw: 'réviser révision répétition espacée rappel mémoire jeu', run: () => openReview('screen-main') },
    purgame: { he: 'טהור', fr: 'Pur ou impur ?', desc: 'Triez les animaux, vite : pur (permis) ou impur (interdit), avec les signes à connaître', kw: 'jeu cacherout casher kasher animaux poissons oiseaux quadrupèdes tahor tame', run: () => openPurityGame('screen-main') },
    mitsvagame: { he: 'מצוות', fr: 'Mitsva express', desc: 'De quelle paracha le Rambam tire-t-il ce commandement ? Vite, parmi les 613', kw: 'jeu mitsvot commandements 613 rambam paracha parachiot torah livre', run: () => openMitsvaGame('screen-main') },
    parashagame: { he: 'פרשה', fr: 'Dans quelle paracha ?', desc: 'Un verset tiré au hasard dans la Torah : retrouvez sa paracha, avec des indices qui coûtent des points', kw: 'jeu paracha parachiot verset torah indice deviner', run: () => openVerseGame('screen-main') },
    whogame: { he: 'מי אני', fr: 'Qui suis-je ?', desc: 'Un personnage de la Bible ou un sage du Talmud parle : devinez qui, avec des indices qui coûtent des points', kw: 'jeu devinette personnages bible sages talmud indices', run: () => openWhoGame('screen-main') },
    ordergame: { he: 'סדר', fr: 'Le bon ordre', desc: 'Remettez dans l\'ordre des parachiot, des livres, des traités, des générations ou des rois', kw: 'jeu classer ordre parachiot tanakh michna talmud traités générations rois fils jacob', run: () => openOrderGame('screen-main') },
    mapgame: { he: 'מפה', fr: 'Sur la carte', desc: 'Touchez la carte à l\'endroit d\'une ville, d\'une montagne, d\'une mer ou d\'une tribu', kw: 'jeu carte géographie villes tribus montagnes mers lieux terre israël', run: () => openMapGame('screen-main') },
    lexgame: { he: 'מילים', fr: 'Mots du Tanakh', desc: 'Le vocabulaire hébreu de la Bible, du plus fréquent au plus rare', kw: 'jeu hébreu vocabulaire', run: () => openLexiconGame('screen-main') },
    gemgame: { he: 'גמרא', fr: 'Mots de la Guémara', desc: 'Les mots, les abréviations et les sages de la Guémara', kw: 'jeu araméen guemara', run: () => openGemaraGame('screen-main') },
    trgame: { he: 'מסורה', fr: 'Maîtres et élèves', desc: 'Qui a reçu la Torah de qui ? Retrouvez le maître d\'un sage', kw: 'jeu sages transmission', run: () => openTransmissionGame('screen-main') },
    wheel: { he: 'מועדים', fr: 'La roue des fêtes', desc: 'Placez les fêtes juives dans le bon mois du calendrier hébraïque', kw: 'jeu fêtes calendrier mois', run: () => openWheel('screen-main', 'juif') },
    frCivile: { he: 'דורות', fr: 'Peuple juif, années civiles', desc: 'Placez les événements sur la frise, en années civiles', kw: 'frise histoire chronologie', run: () => playFriseTheme('thm_histoire_juive_civile') },
    frHebraique: { he: 'דורות', fr: 'Peuple juif, années hébraïques', desc: 'Les mêmes événements, datés selon le calendrier hébraïque', kw: 'frise histoire chronologie', run: () => playFriseTheme('thm_histoire_juive_hebraique') },
    frHassidisme: { he: 'חסידים', fr: 'Histoire du hassidisme', desc: 'Du Baal Chem Tov à nos jours : maîtres, dynasties, grandes dates', kw: 'frise hassidisme chronologie', run: () => playFriseTheme('thm_histoire_hassidisme') },
    frIsrael: { he: 'ישראל', fr: 'État d\'Israël', desc: 'Des origines antiques à aujourd\'hui : fondation, guerres, construction nationale', kw: 'frise israël chronologie', run: () => playFriseTheme('thm_isr') },
    reDreyfus: { he: 'דרייפוס', fr: 'L\'affaire Dreyfus', desc: 'Douze ans pour la vérité (1894-1906)', kw: 'récit histoire france', run: () => openRecit('affaire-dreyfus', 'screen-main') },
    re1948: { he: 'תש״ח', fr: 'Création de l\'État d\'Israël', desc: 'Deux peuples, une terre, une guerre (1881-1949)', kw: 'récit histoire 1948', run: () => openRecit('israel-1948', 'screen-main') },
    reBarKokhba: { he: 'בר כוכבא', fr: 'Révolte de Bar Kokhba', desc: 'La dernière guerre des Juifs contre Rome (132-135)', kw: 'récit histoire rome', run: () => openRecit('bar-kokhba', 'screen-main') }
};

// Les sections de chaque onglet (sauf Aujourd'hui, qui est calculé). `as` : « tiles » (tuiles à mot hébreu) ou « rows » (lignes avec description).
const HOME_LAYOUT = {
    etude: [
        { title: 'Textes', as: 'tiles', cols: 2, ids: ['torahReader', 'tanakh', 'michna', 'talmud'] },
        { title: 'Autour des textes', as: 'rows', ids: ['commandments', 'library', 'lexicon', 'gemara', 'gematria'] }
    ],
    explorer: [
        { title: 'Maîtres et lignées', as: 'tiles', cols: 3, ids: ['genealogy', 'transmission', 'hassidout'] },
        { title: 'Lieux et temps', as: 'tiles', cols: 2, ids: ['chronologie', 'biblical', 'mishkan', 'hebrewCalendar'] },
        { title: 'Lois et pratique', as: 'tiles', cols: 3, ids: ['korbanot', 'tsaraat', 'statuts', 'foodlaws', 'benedictions', 'measures', 'kotel', 'personalDates'] },
        { promo: 'tools' }
    ],
    // Les jeux sont rangés par thème (Hébreu, Tanakh, Sages, Halakha, Histoire) : un jeu de plus = un id dans la bonne section. Une section sans jeu n'est
    // pas affichée (homeSection).
    jouer: [
        { title: 'Chaque jour', as: 'rows', ids: ['daily', 'review', 'progress'], subs: () => ({ daily: homeDailyDesc(), review: homeReviewDesc(), progress: homeProgressDesc() }) },
        { title: 'Hébreu et araméen', as: 'rows', ids: ['lexgame', 'gemgame'] },
        { title: 'Tanakh', as: 'rows', ids: ['parashagame', 'mitsvagame'] },
        { title: 'Géographie', as: 'rows', ids: ['mapgame'] },
        { title: 'Mettre dans l\'ordre', as: 'rows', ids: ['ordergame'] },
        { title: 'Personnages et sages', as: 'rows', ids: ['whogame', 'trgame'] },
        { title: 'Halakha et fêtes', as: 'rows', ids: ['purgame', 'wheel'] },
        { title: 'Histoire : frises', as: 'rows', ids: ['frCivile', 'frHebraique', 'frHassidisme', 'frIsrael'] },
        { title: 'Histoire : récits', as: 'rows', ids: ['reDreyfus', 're1948', 'reBarKokhba'] },
        { promo: 'jouer' }   // le seul encart de l'onglet, tout en bas
    ]
};

const HOME_ICONS = {
    today: '<path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 5v3M4.5 9.5l2 2M19.5 9.5l-2 2M2 21h20"/>',
    etude: '<path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5zM12 6v13"/>',
    explorer: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    jouer: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="0.9"/><circle cx="15" cy="9" r="0.9"/><circle cx="12" cy="12" r="0.9"/><circle cx="9" cy="15" r="0.9"/><circle cx="15" cy="15" r="0.9"/>'
};
const HOME_TABS = [
    { id: 'today', label: 'Aujourd\'hui' },
    { id: 'etude', label: 'Étude' },
    { id: 'explorer', label: 'Explorer' },
    { id: 'jouer', label: 'Jouer' }
];

let homeTab = 'today';
let homeQuery = '';
const homeScroll = {};
let homeParasha = null;        // { calendar, parashot } une fois chargés
let homeParashaLoading = false;
let homeHil = null;            // les hilloulot, une fois chargées
let homeHilLoading = false;

function hEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function hButton(className, onclick) {
    const b = hEl('button', className);
    b.type = 'button';
    b.onclick = onclick;
    return b;
}

// --- Entrée ----------------------------------------------------------------------------------------------------------------------------------
function homeInit() {
    const tabs = document.getElementById('home-tabs');
    if (!tabs) return;
    HOME_TABS.forEach(tab => {
        const b = hButton('home-tab', () => homeSelectTab(tab.id));
        b.id = 'home-tab-' + tab.id;
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-controls', 'home-pane');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = HOME_ICONS[tab.id];   // constantes de ce fichier : aucun texte extérieur
        b.appendChild(svg);
        b.appendChild(document.createTextNode(tab.label));
        tabs.appendChild(b);
    });
    homeRender();
    // L'onglet « Aujourd'hui » vit avec l'heure : on le recalcule chaque minute tant qu'il est à l'écran.
    setInterval(() => { if (homeVisible() && homeTab === 'today') homeRender(true); }, 60000);
}

function homeVisible() {
    const screen = document.getElementById('screen-main');
    return !!screen && !screen.classList.contains('hidden');
}

// Appelé par showScreen('screen-main') : on retrouve l'onglet laissé, remis à jour.
function homeRefresh() {
    homeRender(true);
}

function homeSelectTab(id) {
    const pane = document.getElementById('home-pane');
    if (pane) homeScroll[homeTab] = pane.scrollTop;
    homeTab = id;
    homeQuery = '';
    homeRender(true);
}

function homeRender(keepScroll) {
    const pane = document.getElementById('home-pane');
    const content = document.getElementById('home-content');
    if (!pane || !content) return;
    const top = keepScroll ? (pane.scrollTop || homeScroll[homeTab] || 0) : 0;
    // la recherche garde le focus pendant la frappe : on ne reconstruit pas le champ
    const typing = document.activeElement && document.activeElement.id === 'home-search-input';
    toolClear(content);
    HOME_TABS.forEach(tab => {
        const b = document.getElementById('home-tab-' + tab.id);
        if (b) b.setAttribute('aria-selected', tab.id === homeTab ? 'true' : 'false');
    });
    pane.setAttribute('aria-labelledby', 'home-tab-' + homeTab);
    if (homeTab === 'today') homeRenderToday(content);
    else homeRenderBrowse(content);
    pane.scrollTop = top;
    if (typing) { const input = document.getElementById('home-search-input'); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }
}

// --- En-tête et briques communes ---------------------------------------------------------------------------------------------------------
function homeHeader(content, title, kicker, night) {
    const head = hEl('header', 'home-header');
    const text = hEl('div', 'home-header-text');
    if (kicker) text.appendChild(hEl('div', 'home-kicker', kicker));
    text.appendChild(hEl('h1', 'home-title', title));
    if (night) {
        const pill = hEl('div', 'home-night', night);
        pill.setAttribute('role', 'note');
        text.appendChild(pill);
    }
    head.appendChild(text);
    const gear = hButton('settings-btn', () => openSettings());
    gear.textContent = '⚙︎';
    gear.setAttribute('aria-label', 'Réglages');
    head.appendChild(gear);
    content.appendChild(head);
}

function homeTile(entry, cls, sub) {
    const b = hButton('home-tile' + (cls ? ' ' + cls : ''), entry.run);
    const he = hEl('span', 'he', entry.he);
    he.lang = 'he'; he.dir = 'rtl';
    b.appendChild(he);
    b.appendChild(hEl('span', 'fr', entry.fr));
    if (sub) b.appendChild(hEl('span', 'sub', sub));
    b.setAttribute('aria-label', entry.fr + (sub ? ' : ' + sub : ''));
    return b;
}

function homeRows(entries, subs) {
    const box = hEl('div', 'home-rows');
    entries.forEach(entry => {
        const b = hButton('home-row', entry.run);
        const he = hEl('span', 'he', entry.he);
        he.lang = 'he'; he.dir = 'rtl';
        const text = hEl('span');
        text.appendChild(hEl('span', 'fr', entry.fr));
        text.appendChild(hEl('span', 'desc', (subs && subs[entry.id]) || entry.desc));
        b.appendChild(he);
        b.appendChild(text);
        b.appendChild(hEl('span', 'chev', '›'));
        box.appendChild(b);
    });
    return box;
}

// Ce que la ligne « Dates personnelles » annonce : la prochaine date des sept jours à venir, ou sa description.
function datesTodaySub() {
    if (typeof datesTodayCards !== 'function') return HOME_ENTRIES.personalDates.desc;
    const c = datesTodayCards()[0];
    return c ? c.label + ' · ' + c.value + ' · ' + c.sub : HOME_ENTRIES.personalDates.desc;
}

// Ce que la ligne « Défi du jour » annonce : le résultat du jour, ou qu'il n'y a pas de défi le Chabbat et les jours de fête.
function homeDailyDesc() {
    if (typeof dailygameResult !== 'function') return HOME_ENTRIES.daily.desc;
    if (dailygameIsRestDay()) return t('dailygame.row_rest');
    const done = dailygameResult();
    return done ? t('dailygame.row_done', { score: done.score, max: done.total * DailyGameCore.POINTS }) : t('dailygame.row_desc');
}

// Ce que la ligne « Ma progression » annonce : la série en cours.
function homeProgressDesc() {
    if (typeof progressStreak !== 'function') return HOME_ENTRIES.progress.desc;
    const st = progressStreak();
    return st.current > 0 ? t('progress.streak_title') + ' : ' + progressStreakText(st.current) + ' · ' + t('progress.row_desc') : t('progress.row_desc');
}

// Ce que la ligne « À réviser aujourd'hui » annonce : le nombre d'éléments à revoir (js/app/review.js), ou qu'il n'y a rien.
function homeReviewDesc() {
    if (typeof reviewSummary !== 'function') return HOME_ENTRIES.review.desc;
    const s = reviewSummary();
    return s.total ? t('review.row_due', { total: s.total }) : t('review.row_none');
}

function homeSection(content, section) {
    if (section.promo) { content.appendChild(homePromo(section.promo)); return; }
    if (!section.ids.length) return;   // un thème sans jeu pour l'instant : pas de titre vide
    content.appendChild(hEl('h2', 'home-section-title', section.title));
    const entries = section.ids.map(id => Object.assign({ id: id }, HOME_ENTRIES[id]));
    if (section.as === 'rows') { content.appendChild(homeRows(entries, section.subs && section.subs())); return; }
    const grid = hEl('div', 'home-tiles c' + (section.cols || 3));
    entries.forEach(entry => grid.appendChild(homeTile(entry)));
    content.appendChild(grid);
}

function homePromo(kind) {
    const a = hEl('a', 'promo-card');
    a.href = HOME_PROMO_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    const img = document.createElement('img');
    img.src = 'assets/images/historiaxe-icon.jpg';
    img.alt = '';
    a.appendChild(img);
    a.appendChild(hEl('span', '', HOME_PROMOS[kind]));
    return a;
}

// --- Étude, Explorer, Jouer ----------------------------------------------------------------------------------------------------------------
function homeNormalize(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’‑-]/g, ' ');
}

function homeSearchResults(query) {
    const words = homeNormalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return Object.keys(HOME_ENTRIES).map(id => Object.assign({ id: id }, HOME_ENTRIES[id])).filter(entry => {
        const hay = homeNormalize(entry.fr + ' ' + entry.desc + ' ' + (entry.kw || '')) + ' ' + entry.he;
        return words.every(w => hay.indexOf(w) !== -1);
    });
}

// Les résultats « Dans la chronologie » d'une recherche. `alone` : aucun outil ne correspond, donc « Aucun résultat » si la frise non plus.
function homeChronoResults(query, holder, alone) {
    const none = () => { if (alone) holder.appendChild(hEl('p', 'home-empty', 'Aucun résultat pour « ' + query.trim() + ' ».')); };
    if (typeof chrLoadModel !== 'function' || typeof ChronologieCore === 'undefined') { none(); return; }
    chrLoadModel().then(model => {
        if (homeQuery !== query || !holder.isConnected) return;
        const hits = ChronologieCore.search(model, query).slice(0, 8);
        if (!hits.length) { none(); return; }
        holder.appendChild(hEl('h2', 'home-section-title', t('tools.chronologie_in_search')));
        const voies = {};
        model.voies.forEach(v => { voies[v.id] = v.fr; });
        holder.appendChild(homeRows(hits.map(x => ({
            id: x.id, he: x.he || '⏳', fr: x.fr,
            desc: ChronologieCore.dating(x, 'am') + ' · ' + ChronologieCore.dating(x, 'civil') + ' · ' + voies[x.voie],
            run: () => openChronologie('screen-main', { item: x })
        }))));
    }).catch(() => none());
}

function homeRenderBrowse(content) {
    const titles = { etude: 'Étude', explorer: 'Explorer', jouer: 'Jouer' };
    homeHeader(content, titles[homeTab]);
    if (homeTab !== 'jouer') {
        const wrap = hEl('div', 'search-bar-wrap home-search');
        const bar = hEl('div', 'search-bar');
        bar.appendChild(hEl('span', 'search-bar-icon', '🔍'));
        const input = hEl('input', 'search-bar-input');
        input.type = 'search';
        input.id = 'home-search-input';
        input.placeholder = 'Rechercher dans TorahAxe…';
        input.autocomplete = 'off';
        input.setAttribute('aria-label', 'Rechercher dans TorahAxe');
        input.value = homeQuery;
        input.oninput = () => { homeQuery = input.value; homeRender(); };
        bar.appendChild(input);
        wrap.appendChild(bar);
        content.appendChild(wrap);
    }
    if (homeTab !== 'jouer' && homeQuery.trim()) {
        const found = homeSearchResults(homeQuery);
        if (found.length) content.appendChild(homeRows(found));
        // Les éléments de la chronologie (rois, sages, événements…) : une fois la frise chargée, on les ajoute sous les outils.
        const holder = hEl('div');
        content.appendChild(holder);
        homeChronoResults(homeQuery, holder, !found.length);
        return;
    }
    HOME_LAYOUT[homeTab].forEach(section => homeSection(content, section));
}

// --- Aujourd'hui -------------------------------------------------------------------------------------------------------------------------------
// Le jour et le lieu : ceux de l'écran Zmanim ; sans lieu, le jour de l'appareil.
function homeDay() {
    const ctx = sdComputeContext();   // fixe aussi sdPlace
    const place = sdPlace;
    const now = Date.now();
    let civil;
    if (place) civil = ZmanimCore.civilDateOf(place.tz, now);
    else { const d = new Date(now); civil = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }; }
    return { ctx: ctx, place: place, now: now, civil: civil, fixed: CalendarYearCore.gregorianToFixed(civil.year, civil.month, civil.day), israel: place ? ZmanimCore.inIsrael(place) : false };
}

function homeShiftCivil(civil, days) {
    const d = new Date(Date.UTC(civil.year, civil.month - 1, civil.day + days));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function homeZmanOpts() { return zmStoredOpts(); }

const HOME_ZMAN_NAMES = {
    alot: 'Aube', netz: 'Lever', shemaGra: 'Fin du Chéma', tefilaGra: 'Fin de la Téfila', chatzot: 'Midi solaire', minchaGedola: 'Minha Guédola',
    plag: 'Plag haMinha', shkia: 'Coucher', tzeit: 'Sortie des étoiles', chatzotLayla: 'Minuit'
};
// Les trois horaires qui comptent pour chaque prière.
const HOME_PRAYER_TIMES = { chacharit: ['netz', 'shemaGra', 'tefilaGra'], minha: ['plag', 'shkia', 'tzeit'], arvit: ['tzeit', 'chatzotLayla', 'alot'] };

function homeZmanimOf(day, offset) {
    const c = offset ? homeShiftCivil(day.civil, offset) : day.civil;
    return ZmanimCore.zmanim(day.place, c.year, c.month, c.day, homeZmanOpts());
}

function homeTime(day, ms) { return ms === null || ms === undefined ? '—' : ZmanimCore.formatTime(ms, day.place.tz, 'fr'); }

// Le prochain horaire de la journée (le lever du lendemain s'il n'en reste plus).
function homeNextZman(day) {
    const keys = ['alot', 'netz', 'shemaGra', 'tefilaGra', 'chatzot', 'minchaGedola', 'plag', 'shkia', 'tzeit'];
    for (let offset = 0; offset <= 1; offset++) {
        const z = homeZmanimOf(day, offset);
        const list = keys.map(k => ({ key: k, ms: ZmanimCore.rounded(z, k) })).filter(e => e.ms !== null && e.ms > day.now).sort((a, b) => a.ms - b.ms);
        if (list.length) return list[0];
    }
    return null;
}

// Après le coucher du soleil, le jour civil n'est plus le jour hébraïque : un mot sous la date le dit (le jour hébraïque change à la sortie des étoiles).
// Entre la chkia et la sortie des étoiles : « 9 Kislev dès 17:49 » ; ensuite, jusqu'à minuit civil : « Nuit du 9 Kislev ».
function homeNightNote(day) {
    if (!day.place) return '';
    const C = HebrewCalendarCore;
    const z = homeZmanimOf(day, 0);
    const shkia = ZmanimCore.rounded(z, 'shkia'), tzeit = ZmanimCore.rounded(z, 'tzeit');
    const name = (fixed) => { const h = C.hebrewFromFixed(fixed); return h.day + ' ' + hcalMonthName(h.year, h.month); };
    if (day.ctx.fixed > day.fixed) return '☾ Nuit du ' + name(day.ctx.fixed) + (tzeit !== null ? ' · depuis ' + homeTime(day, tzeit) : '');
    if (shkia !== null && day.now >= shkia && (tzeit === null || day.now < tzeit)) return '☾ Coucher passé · ' + name(day.ctx.fixed + 1) + (tzeit !== null ? ' dès ' + homeTime(day, tzeit) : '');
    return '';
}

function homeHero(content, day) {
    const hero = hEl('section', 'home-hero');
    hero.setAttribute('aria-label', 'À cette heure');
    const ctx = day.ctx;
    const service = day.place ? sdCurrentService() : null;
    const special = ctx.flags.yomTov;
    if (!service) {
        hero.appendChild(hEl('small', 'home-hero-label', 'La prière du moment'));
        hero.appendChild(hEl('div', 'home-hero-name', 'Indiquez votre lieu'));
        hero.appendChild(hEl('p', 'home-hero-text', 'Le Siddour et les Zmanim s\'adaptent à l\'endroit où vous êtes : prière de l\'heure, horaires du jour, jour hébraïque exact.'));
        const b = hButton('home-hero-btn', () => openTool('zmanim', 'screen-main'));
        b.textContent = 'Choisir mon lieu';
        hero.appendChild(b);
        content.appendChild(hero);
        return;
    }
    hero.appendChild(hEl('small', 'home-hero-label', 'À cette heure'));
    const row = hEl('div', 'home-hero-row');
    row.appendChild(hEl('div', 'home-hero-name', service.title));
    const he = hEl('span', 'home-hero-he', service.he);
    he.lang = 'he'; he.dir = 'rtl';
    row.appendChild(he);
    hero.appendChild(row);
    if (special) {
        hero.appendChild(hEl('p', 'home-hero-text', t('tools.sd_warn_yomtov')));
    } else {
        const chips = hEl('div', 'home-chips');
        if (service.shabbat) chips.appendChild(hEl('span', 'home-chip', 'Chabbat'));
        sdDayNoteLabels(ctx).forEach(label => chips.appendChild(hEl('span', 'home-chip', label)));
        hero.appendChild(chips);
    }
    const regel = special && (ctx.flags.pesach || ctx.flags.sukkot || ctx.flags.shemini || ctx.flags.shavuot);
    const b = hButton('home-hero-btn', regel ? () => openSiddurPrayer('regalim') : special ? () => openTool('siddur', 'screen-main') : () => openSiddurPrayer(service.group));
    b.textContent = regel ? 'Prières des trois fêtes' : special ? 'Ouvrir le Siddour' : 'Commencer';
    hero.appendChild(b);
    // les trois horaires de cette prière ; la sortie des étoiles / l'aube du lendemain après la nuit
    const keys = HOME_PRAYER_TIMES[service.base];
    const times = hEl('div', 'home-times');
    const z = homeZmanimOf(day, 0);
    const zNext = service.base === 'arvit' ? homeZmanimOf(day, 1) : null;
    keys.forEach(key => {
        const cell = hEl('div');
        let ms = ZmanimCore.rounded(z, key);
        if (key === 'alot' && zNext && day.now > ZmanimCore.rounded(z, 'alot')) ms = ZmanimCore.rounded(zNext, 'alot');
        cell.appendChild(hEl('b', '', homeTime(day, ms)));
        cell.appendChild(document.createTextNode(HOME_ZMAN_NAMES[key]));
        times.appendChild(cell);
    });
    hero.appendChild(times);
    content.appendChild(hero);
}

// La prochaine fête (fête de la Torah ou fête rabbinique) : { id, in } ou { id, today }.
function homeNextFeast(day) {
    const C = HebrewCalendarCore;
    const h = day.ctx.hebrew;
    const list = C.feastsOf(h.year, day.israel).map(f => Object.assign({ year: h.year }, f))
        .concat(C.feastsOf(h.year + 1, day.israel).map(f => Object.assign({ year: h.year + 1 }, f)))
        .filter(f => (f.kind === 'moed' || f.kind === 'minor') && f.last >= day.ctx.fixed)
        .sort((a, b) => a.fixed - b.fixed);
    if (!list.length) return null;
    const f = list[0];
    return { id: f.id, year: f.year, israel: day.israel, ongoing: f.fixed <= day.ctx.fixed, days: f.fixed - day.ctx.fixed };
}

function homeParashaName(day) {
    if (!homeParasha) return null;
    const indices = TorahCore.parashaForDate(homeParasha.calendar, new Date(day.civil.year, day.civil.month - 1, day.civil.day), day.israel);
    if (!indices || !indices.length) return null;
    return { index: indices[0], name: indices.map(k => homeParasha.parashot.parashot[k].fr).join(' – ') };
}

function homeLoadParasha() {
    if (homeParasha || homeParashaLoading) return;
    homeParashaLoading = true;
    // Le calendrier des paracha est calculé (js/sedraCore.js) : seuls les noms viennent d'un fichier.
    fetch('data/torah/parashot.json').then(r => (r.ok ? r.json() : null)).then(parashot => {
        if (parashot) { homeParasha = { calendar: null, parashot: parashot }; if (homeVisible() && homeTab === 'today') homeRender(true); }
    }).catch(() => { /* sans paracha : le reste fonctionne */ }).then(() => { homeParashaLoading = false; });
}

function homeLoadHilloulot() {
    if (homeHil || homeHilLoading) return;
    homeHilLoading = true;
    fetch('data/hilloulot/hilloulot.json').then(r => (r.ok ? r.json() : null)).then(json => {
        if (json && Array.isArray(json.entries)) { homeHil = json.entries; if (homeVisible() && homeTab === 'today') homeRender(true); }
    }).catch(() => { /* sans hilloulot : le reste fonctionne */ }).then(() => { homeHilLoading = false; });
}

// Ouvre la liste des 613 à la mitsva donnée : on déplie ses ancêtres repliables, on la montre et on la fait clignoter un instant.
function homeOpenMitsva(c) {
    openTool('commandments', 'screen-main');
    if (typeof toolCommandmentsPick === 'function') toolCommandmentsPick('mitzvot');
    setTimeout(() => {
        const li = document.getElementById('cmd-613-' + c.kind + '-' + c.n);
        if (!li) return;
        for (let el = li.parentElement; el; el = el.parentElement) if (el.tagName === 'DETAILS') el.open = true;
        li.scrollIntoView({ block: 'center' });
        li.classList.add('cmd-flash');
        setTimeout(() => li.classList.remove('cmd-flash'), 2500);
    }, 150);
}

function homeInfoCard(label, value, detail, onclick) {
    const card = onclick ? hButton('home-card', onclick) : hEl('div', 'home-card');
    card.appendChild(hEl('small', '', label));
    card.appendChild(hEl('strong', '', value));
    if (detail) card.appendChild(hEl('em', '', detail));
    return card;
}

function homeHilItem(e) {
    const item = hEl('div', 'zm-hil-item');
    item.appendChild(hEl('strong', '', e.fr));
    const meta = e.kind === 'tradition' ? t('tools.zm_hil_tradition') : t('tools.zm_hil_year', { heb: e.year, greg: e.gregYear });
    item.appendChild(hEl('small', e.kind === 'tradition' ? 'zm-hil-tradition' : '', meta));
    item.appendChild(hEl('span', 'zm-hil-bio', e.bio));
    return item;
}

// Les maîtres dont c'est la hilloula aujourd'hui (et ce soir) ; replié, un seul volet.
function homeHilloulot(content, day) {
    if (!homeHil) return;
    const C = HebrewCalendarCore, Z = ZmanimCore;
    const h = day.ctx.hebrew;
    const today = Z.hilloulotFor(homeHil, h);
    const tonight = Z.hilloulotFor(homeHil, C.hebrewFromFixed(day.ctx.fixed + 1));
    if (!today.length && !tonight.length) return;
    const card = hEl('details', 'zm-hil');
    card.id = 'home-hil';
    card.appendChild(hEl('summary', 'zm-hil-title', '🕯️ ' + t('tools.zm_hil_summary')));
    if (today.length) {
        card.appendChild(hEl('h3', 'zm-hil-sub', t('tools.zm_hil_title')));
        today.forEach(e => card.appendChild(homeHilItem(e)));
    }
    if (tonight.length) {
        card.appendChild(hEl('p', 'zm-hil-tonight', t('tools.zm_hil_tonight')));
        tonight.forEach(e => card.appendChild(homeHilItem(e)));
    }
    card.appendChild(hEl('p', 'tool-small', t('tools.zm_hil_note')));
    content.appendChild(card);
}

// « Reprendre » : le dernier passage du Siddour, la dernière ligne du Tikkoun.
function homeResume() {
    const out = [];
    const last = sdLastRead();
    if (last) out.push({ he: HOME_ENTRIES.siddur.he, fr: 'Siddour', desc: last.title, run: () => openSiddurSections(last.ids, last.title) });
    let block = null;
    try { const b = JSON.parse(localStorage.getItem(TORAH_READER_POSITION_KEY) || 'null'); block = b && Number.isInteger(b.block) ? b.block : null; } catch (e) { block = null; }
    if (block !== null) out.push({ he: HOME_ENTRIES.torahReader.he, fr: 'Tikkoun', desc: 'Reprendre la lecture du rouleau', run: HOME_ENTRIES.torahReader.run });
    return out;
}

function homeRenderToday(content) {
    homeLoadParasha();
    homeLoadHilloulot();
    const day = homeDay();
    const C = HebrewCalendarCore;
    let kicker = '';
    try { kicker = new Intl.DateTimeFormat('fr', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(day.civil.year, day.civil.month - 1, day.civil.day))); } catch (e) { kicker = ''; }
    homeHeader(content, hcalHebrewText(day.ctx.hebrew), kicker, homeNightNote(day));
    homeHero(content, day);

    const next = day.place ? homeNextZman(day) : null;
    const svc = day.place ? sdCurrentService() : null;
    const siddurSub = svc ? 'À cette heure : ' + svc.title : 'Prières de la semaine et de Chabbat';
    const zmanimSub = next ? HOME_ZMAN_NAMES[next.key] + ' · ' + homeTime(day, next.ms) : 'Choisir un lieu';
    const big = hEl('div', 'home-tiles c2');
    big.appendChild(homeTile(HOME_ENTRIES.siddur, '', siddurSub));
    big.appendChild(homeTile(HOME_ENTRIES.zmanim, '', zmanimSub));
    content.appendChild(big);

    const cards = hEl('div', 'home-cards');
    const par = homeParashaName(day);
    // La montée du jour : dimanche = 1re, samedi = 7e (Date.getDay() : 0 = dimanche).
    const aliyahOfDay = new Date(day.civil.year, day.civil.month - 1, day.civil.day).getDay() + 1;
    cards.appendChild(homeInfoCard('Paracha', par ? par.name : '…', par ? 'Lire dans le Tanakh' : '', par ? () => tanakhOpenParasha(par.index, aliyahOfDay) : null));
    const feast = homeNextFeast(day);
    if (feast) {
        const name = t('tools.hcal_f_' + (feast.ongoing ? HebrewCalendarCore.feastNameId(feast.id, day.ctx.fixed, day.israel) : feast.id) + '_name');
        cards.appendChild(homeInfoCard(feast.ongoing ? 'En ce moment' : 'Prochaine fête', name,
            feast.ongoing ? 'Aujourd\'hui' : (feast.days === 1 ? 'demain' : 'dans ' + feast.days + ' jours'), () => hcalOpenFeast(feast.id, feast.year, feast.israel)));
    }
    content.appendChild(cards);

    // L'Omer : une carte seule pendant les 49 jours, qui ouvre le compte du jour.
    if (typeof omerTodayCard === 'function') {
        const oc = omerTodayCard();
        if (oc) {
            const orow = hEl('div', 'home-cards');
            orow.appendChild(homeInfoCard(t('omer.card_label'), t('omer.card_value', { n: oc.n }), t(oc.tonight ? 'omer.card_sub_tonight' : 'omer.card_sub'), () => openOmer('screen-main')));
            orow.firstChild.classList.add('home-card-wide');
            content.appendChild(orow);
        }
    }

    // Les dates personnelles des sept prochains jours (Hazkara, anniversaires) : une carte pleine largeur chacune, qui ouvre l'écran des dates.
    if (typeof datesTodayCards === 'function') {
        const personal = datesTodayCards();
        if (personal.length) {
            const rowDates = hEl('div', 'home-cards');
            personal.forEach(c => {
                const card = homeInfoCard(c.label, c.value, c.sub, () => openDates('screen-main'));
                card.classList.add('home-card-wide');
                rowDates.appendChild(card);
            });
            content.appendChild(rowDates);
        }
    }

    // L'étude du jour, en deux rangées de deux cases : Daf Yomi et Téhilim ; puis Michna Yomit (à gauche) et mitsva du jour (à droite), réduites.
    // Chaque case se masque dans Réglages › Cartes d'étude du jour ; une rangée qui n'a plus qu'une case la prend en pleine largeur.
    const cardOn = kind => (typeof studyCardOn === 'function' ? studyCardOn(kind) : kind !== 'mitsva');
    const studyRow = cards => {
        if (!cards.length) return null;
        const row = hEl('div', 'home-cards');
        cards.forEach(c => row.appendChild(c));
        if (cards.length === 1) row.firstChild.classList.add('home-card-wide');
        return row;
    };
    const firstRow = [];
    const daf = cardOn('daf') ? ZmanimCore.dafYomi(day.fixed) : null;
    if (daf) {
        // La carte ouvre le Talmud à l'amoud du jour (le premier du daf) ; sans Guémara ici (Chekalim, Kinnim, Midot), elle reste une simple information.
        const dafTarget = TalmudCore.dafYomiTarget(null, daf);
        firstRow.push(homeInfoCard('Daf Yomi', daf.masechet + ' ' + daf.daf, daf.daysLeft === 0 ? t('tools.zm_daf_siyum_today') : t('tools.zm_daf_siyum', { n: daf.daysLeft }),
            dafTarget ? () => { openTool('talmud', 'screen-main'); talmudOpenAt(dafTarget.id, dafTarget.label); } : null));
    }
    const h = day.ctx.hebrew;
    const tehilim = cardOn('tehilim') ? zmTehilimText(h) : null;
    if (tehilim) firstRow.push(homeInfoCard('Téhilim du jour', tehilim, t('tools.zm_tehilim_day', { n: h.day }), () => { toolReturns.tanakh = 'screen-main'; tanakhOpenAt('psaumes', zmTehilimStart(h) - 1, 'he'); }));

    const secondRow = [];
    // La Michna Yomit : deux michnayot par jour ; la carte ouvre la première dans la Michna.
    const my = cardOn('mishna') && typeof MishnaYomiCore !== 'undefined' ? MishnaYomiCore.forFixed(day.fixed) : null;
    if (my) {
        const card = homeInfoCard(t('mishnayomi.card_label'), MishnaYomiCore.label(my), t('mishnayomi.card_sub_short', { n: my.daysLeft }),
            () => michnaOpenAt(my.first.id, my.first.chapter, my.first.mishna, 'screen-main'));
        card.classList.add('home-card-compact');
        secondRow.push(card);
    }
    // La mitsva du jour : le cycle annuel du Séfer ha-Mitsvot (Chabad.org), leçon 1 le 16 Chevat (voir js/mitsvaOfDayCore.js). Pas de carte hors du cycle ou sans commandement.
    const mitsva = cardOn('mitsva') && typeof MitsvaOfDayCore !== 'undefined' && typeof CommandmentsCore !== 'undefined'
        ? MitsvaOfDayCore.of(day.fixed, { yearOf: f => HebrewCalendarCore.hebrewFromFixed(f).year, shevat16: y => HebrewCalendarCore.hebrewToGregorian(y, 'Shevat', 16).fixed },
            CommandmentsCore.list613('pos'), CommandmentsCore.list613('neg'))
        : null;
    if (mitsva) {
        const c = mitsva.items[0];
        const others = mitsva.items.length - 1;
        const more = others > 0 ? ' · ' + (others === 1 ? t('study.mitsva_more_one') : t('study.mitsva_more_many', { n: others })) : '';
        const card = homeInfoCard(t('study.mitsva_label'), c.text, t(c.kind === 'pos' ? 'study.mitsva_pos' : 'study.mitsva_neg', { n: c.n }) + ' · ' + c.ref + more,
            () => homeOpenMitsva(c));
        card.classList.add('home-card-compact');
        secondRow.push(card);
    }
    [studyRow(firstRow), studyRow(secondRow)].forEach(row => { if (row) content.appendChild(row); });
    // « Étudié » (facultatif, désactivé par défaut) : une case par étude qui existe aujourd'hui.
    if (typeof studyChips === 'function') {
        const kinds = [];
        if (daf) kinds.push('daf');
        if (tehilim) kinds.push('tehilim');
        if (my) kinds.push('mishna');
        if (mitsva) kinds.push('mitsva');
        const chips = studyChips(kinds, day.fixed);
        if (chips) content.appendChild(chips);
    }

    // Le défi du jour et la série : deux cartes côte à côte ; le Chabbat et les jours de fête, il n'y a pas de défi et la série seule s'affiche (gelée, si elle existe).
    if (typeof dailygameIsRestDay === 'function') {
        const row = hEl('div', 'home-cards');
        if (!dailygameIsRestDay()) {
            const doneToday = dailygameResult();
            row.appendChild(homeInfoCard('Défi du jour', doneToday ? t('dailygame.card_done', { score: doneToday.score, max: doneToday.total * DailyGameCore.POINTS }) : t('dailygame.card_value'),
                t(doneToday ? 'dailygame.card_sub_done' : 'dailygame.card_sub'), () => openDailyGame('screen-main')));
        }
        if (typeof progressStreak === 'function') {
            const st = progressStreak();
            const sub = st.status === 'active' ? t('progress.card_sub_active', { best: st.longest }) : st.status === 'pending' ? t('progress.card_sub_pending')
                : st.status === 'frozen' ? t('progress.card_sub_frozen') : t('progress.card_sub_none');
            row.appendChild(homeInfoCard(t('progress.card_label'), st.current > 0 ? progressStreakText(st.current) : t('progress.card_none'), sub, () => openProgress('screen-main')));
        }
        if (row.childElementCount === 1) row.firstChild.classList.add('home-card-wide');
        if (row.childElementCount) content.appendChild(row);
    }

    // La révision du jour : la carte n'apparaît que s'il y a quelque chose à revoir.
    const due = typeof reviewSummary === 'function' ? reviewSummary() : null;
    if (due && due.total) {
        const review = hEl('div', 'home-cards');
        const card = homeInfoCard('À réviser', t('review.progress_due', { total: due.total }), 'Une séance de ' + due.session + ' questions', () => openReview('screen-main'));
        card.classList.add('home-card-wide');
        review.appendChild(card);
        content.appendChild(review);
    }

    homeHilloulot(content, day);

    const resume = homeResume();
    if (resume.length) {
        content.appendChild(hEl('h2', 'home-section-title', 'Reprendre'));
        content.appendChild(homeRows(resume));
    }
    content.appendChild(hEl('h2', 'home-section-title', 'Pratique'));
    content.appendChild(homeRows([Object.assign({ id: 'kotel' }, HOME_ENTRIES.kotel), Object.assign({ id: 'personalDates' }, HOME_ENTRIES.personalDates)], { personalDates: datesTodaySub() }));
}

// --- Réglages --------------------------------------------------------------------------------------------------------------------------------------
function openSettings() {
    if (typeof apRender === 'function') apRender();
    openModal('modal-settings');
}

function closeSettings() {
    closeModal('modal-settings');
}

// Charge les textes de l'interface (ui/fr.json, voir js/i18n.js), puis construit l'accueil : les outils en ont besoin pour leur contenu généré
// dynamiquement (dates, tableaux…).
window.onload = async () => {
    if (typeof i18n !== 'undefined') await i18n.init();
    homeInit();
    remindersStart();
};

// Les rappels (notifications locales) sont reprogrammés à l'ouverture de l'app et à chaque retour au premier plan : iOS n'en garde que quelques-uns
// en attente, on renouvelle donc les prochains jours à chaque fois (voir js/notifications.js).
function remindersStart() {
    if (typeof TorahAxeNotifications === 'undefined' || !TorahAxeNotifications.isSupported()) return;
    TorahAxeNotifications.scheduleZmanim();
    // Toucher une notification ouvre directement l'écran concerné : le compte de l'Omer, ou les dates personnelles.
    TorahAxeNotifications.onOpen(extra => {
        if (extra.route === 'omer' && typeof openOmer === 'function') openOmer('screen-main', { day: extra.day, mode: extra.mode });
        else if (extra.route === 'dates' && typeof openDates === 'function') openDates('screen-main');
    });
    try {
        window.Capacitor.Plugins.App.addListener('appStateChange', (state) => { if (state && state.isActive) TorahAxeNotifications.scheduleZmanim(); });
    } catch (e) { /* sans l'événement de l'app : on se rabat sur la visibilité de la page */ }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') TorahAxeNotifications.scheduleZmanim(); });
}
