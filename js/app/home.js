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
    zmanim: { he: 'זמנים', fr: 'Horaires', desc: 'Les horaires du jour pour n\'importe quel lieu : aube, Chéma, Minha, coucher, Chabbat', kw: 'horaires bougies coucher soleil daf yomi', run: homeTool('zmanim') },
    kotel: { he: 'כותל', fr: 'Kotel', desc: 'La boussole : la direction de Jérusalem depuis chez vous', kw: 'boussole jérusalem direction mizrah', run: homeTool('kotel') },
    tanakh: { he: 'תנ״ך', fr: 'Tanakh', desc: 'Les 24 livres, verset par verset, avec Rachi', kw: 'bible torah prophètes écrits haftara psaumes', run: homeTool('tanakh') },
    michna: { he: 'משנה', fr: 'Michna', desc: 'Les 63 traités en hébreu, avec Rambam, Bartenura, Tosafot Yom Tov…', kw: 'mishna mishnah bartenura rambam tosafot yom tov melekhet shelomoh tiferet israel gra rash traités ordres zeraim moed nashim nezikin kodashim tohorot avot', run: homeTool('michna') },
    talmud: { he: 'תלמוד', fr: 'Talmud', desc: 'Les 37 traités de la Guémara en araméen vocalisé, avec Rachi et Tossafot', kw: 'guemara gemara talmud bavli babylone berakhot daf amoud araméen', run: homeTool('talmud') },
    torahReader: { he: 'תיקון', fr: 'Tikkoun', desc: 'Le rouleau de la Torah, paracha après paracha', kw: 'torah rouleau paracha tikkun sefer', run: homeTool('torahReader') },
    commandments: { he: 'מצוות', fr: 'Mitsvot', desc: 'La Torah, la Michna et les 613 commandements, avec leurs sources', kw: 'commandements 613 décalogue noah avot', run: homeTool('commandments') },
    messiah: { he: 'משיח', fr: 'Machiah', desc: 'Qui est-il, comment le reconnaître, les étapes de sa venue, la résurrection des morts', kw: 'messie machiah mashiach moshiach messianique rambam melakhim gog magog elie eliyahou résurrection techiyat hametim monde à venir olam haba treize principes foi david temple rédemption guéoula', run: homeTool('messiah') },
    library: { he: 'ספרים', fr: 'Bibliothèque', desc: 'Qui a écrit quoi, quand et où : Michna, Talmud, Midrach, Kabbale', kw: 'livres auteurs talmud midrach', run: homeTool('library') },
    kevarim: { he: 'קברים', fr: 'Tombeaux', desc: 'Les kevarim et hilloulot de 179 grands maîtres, sur un planisphère', kw: 'tombeau tombe kever kevarim hilloula tsadik tsadikim carte pèlerinage cimetière', run: homeTool('kevarim') },
    lexicon: { he: 'עברית', fr: 'Hébreu', desc: '2 000 mots de la Bible, dans les deux sens, avec leur racine', kw: 'dictionnaire français hébreu vocabulaire racine', run: homeTool('lexicon') },
    glossary: { he: 'מילון', fr: 'Glossaire', desc: 'Chabbat, rabbin, Hallel, karet… : plus de 400 mots de la vie juive, avec leurs liens vers l\'app', kw: 'glossaire lexique vocabulaire mots définition termes vie juive chabbat rabbin hallel kaddich cacherout zimoun erets israel', run: homeTool('glossary') },
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
    specialReadings: { he: 'קריאות', fr: 'Lectures', desc: 'Torah, maftir et haftara des fêtes, des jeûnes et des Chabbatot spéciaux, avec le découpage en montées', kw: 'lectures spéciales lecture torah maftir haftara haftarot montées aliyot aliyah roch hodech roch hachana kippour souccot hol hamoed hochaana rabba chemini atseret simhat torah hanouca dix tevet chekalim zakhor para hahodech hagadol pourim jeûne guedalia esther pessah chavouot tamouz ticha beav tikkoun', run: homeTool('specialReadings') },
    periods: { he: 'זמנים', fr: 'Périodes', desc: 'Chabbat, fêtes, Omer, Trois Semaines, jeûnes : ce qui est interdit, permis ou obligatoire, selon votre rite', kw: 'chabbat chabbath shabbat roch hodech rosh chodesh pessah pessa\'h souccot chavouot hanouka pourim roch hachana kippour omer ben hametsarim trois semaines tamouz av tisha tichabav jeune interdit permis deuil coutumes musique coiffure cheveux barbe mariage viande vin hamets kitniyot rite', run: homeTool('periods') },
    measures: { he: 'מידות', fr: 'Mesures', desc: 'Poids, volumes, distances et monnaies de la Bible', kw: 'coudée poids volumes monnaies chékel', run: homeTool('measures') },
    personalDates: { he: 'תאריכים', fr: 'Dates personnelles', desc: 'Hazkara, anniversaires hébraïques, bar et bat-mitsva, avec rappels', kw: 'hazkara azkara yahrzeit yartzeit yahrtzeit anniversaire décès naissance bar mitsva bat mitsva date hébraïque rappel notification', run: () => openDates('screen-main') },
    progress: { he: 'התקדמות', fr: 'Ma progression', desc: 'Série de jours, niveaux par domaine et badges', kw: 'progression série jours niveaux badges statistiques succès', run: () => openProgress('screen-main') },
    frCivile: { he: 'דורות', fr: 'Peuple juif, années civiles', desc: 'Placez les événements sur la frise, en années civiles', kw: 'frise histoire chronologie', run: () => playFriseTheme('thm_histoire_juive_civile') },
    frHebraique: { he: 'דורות', fr: 'Peuple juif, années hébraïques', desc: 'Les mêmes événements, datés selon le calendrier hébraïque', kw: 'frise histoire chronologie', run: () => playFriseTheme('thm_histoire_juive_hebraique') },
    frHassidisme: { he: 'חסידים', fr: 'Histoire du hassidisme', desc: 'Du Baal Chem Tov à nos jours : maîtres, dynasties, grandes dates', kw: 'frise hassidisme chronologie', run: () => playFriseTheme('thm_histoire_hassidisme') },
    frIsrael: { he: 'ישראל', fr: 'État d\'Israël', desc: 'Des origines antiques à aujourd\'hui : fondation, guerres, construction nationale', kw: 'frise israël chronologie', run: () => playFriseTheme('thm_isr') },
    reDreyfus: { he: 'דרייפוס', fr: 'L\'affaire Dreyfus', desc: 'Douze ans pour la vérité (1894-1906)', kw: 'récit histoire france', run: () => openRecit('affaire-dreyfus', 'screen-main') },
    re1948: { he: 'תש״ח', fr: 'Création de l\'État d\'Israël', desc: 'Deux peuples, une terre, une guerre (1881-1949)', kw: 'récit histoire 1948', run: () => openRecit('israel-1948', 'screen-main') },
    reBarKokhba: { he: 'בר כוכבא', fr: 'Révolte de Bar Kokhba', desc: 'La dernière guerre des Juifs contre Rome (132-135)', kw: 'récit histoire rome', run: () => openRecit('bar-kokhba', 'screen-main') }
};

// Les jeux viennent du catalogue (js/gamesCatalog.js) : une ligne là-bas = une entrée ici (accueil, recherche, raccourcis). La fonction d'ouverture est cherchée au moment du clic.
function homeOpenGame(game) {
    const open = typeof globalThis[game.open] === 'function' ? globalThis[game.open] : null;
    if (open) open.apply(null, ['screen-main'].concat(game.args || []));
}
GamesCatalog.GAMES.forEach(game => {
    if (game.home !== false) HOME_ENTRIES[game.id] = { he: game.he, fr: game.fr, desc: game.desc, kw: game.kw, run: () => homeOpenGame(game) };
});

// Les sections de chaque onglet (sauf Aujourd'hui, qui est calculé). `as` : « tiles » (tuiles à mot hébreu) ou « rows » (lignes avec description).
const HOME_LAYOUT = {
    etude: [
        { title: 'Textes', as: 'tiles', cols: 2, ids: ['torahReader', 'tanakh', 'michna', 'talmud'] },
        { title: 'Autour des textes', as: 'rows', ids: ['commandments', 'messiah', 'library', 'glossary', 'lexicon', 'gemara', 'gematria'] }
    ],
    explorer: [
        { title: 'Maîtres et lignées', as: 'tiles', cols: 2, ids: ['genealogy', 'transmission', 'hassidout', 'kevarim'] },
        { title: 'Lieux et temps', as: 'tiles', cols: 2, ids: ['chronologie', 'biblical', 'mishkan', 'hebrewCalendar'] },
        { title: 'Lois et pratique', as: 'tiles', cols: 3, ids: ['korbanot', 'tsaraat', 'statuts', 'foodlaws', 'benedictions', 'periods', 'specialReadings', 'measures', 'kotel', 'personalDates'] },
        { promo: 'tools' }
    ],
    // Les jeux sont rangés par thème (Hébreu, Tanakh, Sages, Halakha, Histoire) : un jeu de plus = un id dans la bonne section. Une section sans jeu n'est
    // pas affichée (homeSection).
    jouer: [
        // Les rayons de jeux viennent du catalogue (GamesCatalog.SECTIONS) ; « Chaque jour » y ajoute la progression, qui n'est pas un jeu.
        ...GamesCatalog.SECTIONS.map(sec => {
            const ids = GamesCatalog.inSection(sec.id).map(g => g.id);
            if (sec.id !== 'daily') return { title: sec.title, as: 'rows', ids: ids };
            return { title: sec.title, as: 'rows', ids: ids.concat('progress'), subs: () => ({ dailygame: homeDailyDesc(), review: homeReviewDesc(), progress: homeProgressDesc() }) };
        }),
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
    return { ctx: ctx, place: place, now: now, civil: civil, fixed: CalendarYearCore.gregorianToFixed(civil.year, civil.month, civil.day), israel: profileIsrael(place) };
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
        const btns = hEl('div', 'home-hero-btns');
        const b = hButton('home-hero-btn', () => openTool('zmanim', 'screen-main'));
        b.textContent = 'Choisir mon lieu';
        const all = hButton('home-hero-btn secondary', () => openTool('siddur', 'screen-main'));
        all.textContent = 'Le Siddour';
        btns.append(b, all);
        hero.appendChild(btns);
        content.appendChild(hero);
        return;
    }
    hero.appendChild(hEl('small', 'home-hero-label', 'À cette heure'));
    const row = hEl('div', 'home-hero-row');
    // Le nom, sur une ligne, ou sur deux quand il y a un complément (Roch 'Hodech), en français comme en hébreu.
    const lines = (el, parts) => { parts.forEach((l, i) => { if (i) el.appendChild(document.createElement('br')); el.appendChild(document.createTextNode(l)); }); return el; };
    const nameEl = service.titleLines ? lines(hEl('div', 'home-hero-name is-two'), service.titleLines) : hEl('div', 'home-hero-name' + (service.title.length > 14 ? ' is-long' : ''), service.title);
    row.appendChild(nameEl);
    const he = service.heLines ? lines(hEl('span', 'home-hero-he is-two'), service.heLines) : hEl('span', 'home-hero-he', service.he);
    he.lang = 'he'; he.dir = 'rtl';
    row.appendChild(he);
    hero.appendChild(row);
    if (special) {
        hero.appendChild(hEl('p', 'home-hero-text', t('tools.sd_warn_yomtov')));
    } else {
        const chips = hEl('div', 'home-chips');
        if (service.shabbat && !service.titleLines) chips.appendChild(hEl('span', 'home-chip', 'Chabbat'));     // le titre d'un Chabbat d'occasion le dit déjà
        sdDayNoteLabels(ctx, service.base).forEach(label => chips.appendChild(hEl('span', 'home-chip', label)));
        if (chips.childElementCount) hero.appendChild(chips);   // pas de ligne vide quand il n'y a rien à dire (Arvit un jour ordinaire)
    }
    // Le vendredi, jusqu'à l'allumage : l'heure des bougies (pour tous les profils).
    if (HebrewCalendarCore.weekdayOf(day.fixed) === 5 && !special) {
        const candles = ZmanimCore.rounded(homeZmanimOf(day, 0), 'candles');
        if (candles !== null && candles > day.now) {
            hero.appendChild(hEl('p', 'home-hero-candles', '🕯️ ' + t('welcome.candles') + ' · ' + homeTime(day, candles)));
            if (service.occasions && service.occasions.indexOf('hanouka') >= 0) hero.appendChild(hEl('p', 'home-hero-candles', '🕯️ ' + t('welcome.hanouka_friday')));
        }
    }
    // « Commencer » (la prière de l'heure) à gauche, « Tout le Siddour » à droite. Un jour de fête, le bouton principal ouvre déjà tout le Siddour : un seul bouton.
    const regel = special && (ctx.flags.pesach || ctx.flags.sukkot || ctx.flags.shemini || ctx.flags.shavuot);
    const btns = hEl('div', 'home-hero-btns');
    if (!special || regel) {
        const b = hButton('home-hero-btn', regel ? () => openSiddurPrayer('regalim') : () => openSiddurPrayer(service.group));
        b.textContent = regel ? 'Prières des trois fêtes' : 'Commencer';
        btns.appendChild(b);
    }
    const all = hButton('home-hero-btn' + (btns.childElementCount ? ' secondary' : ''), () => openTool('siddur', 'screen-main'));
    all.textContent = btns.childElementCount ? 'Tout le Siddour' : 'Ouvrir le Siddour';
    btns.appendChild(all);
    hero.appendChild(btns);
    // Profil « Femme », le soir : le Chéma du coucher, à côté d'Arvit (qu'elle peut dire aussi).
    if (service.base === 'arvit' && typeof profileGender === 'function' && profileGender() === 'f') {
        const bed = hButton('home-hero-btn secondary home-hero-bed', () => openSiddurSections(['chema-coucher'], t('welcome.bedtime')));
        bed.textContent = t('welcome.bedtime');
        hero.appendChild(bed);
    }
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

// La prochaine fête (fête de la Torah, fête rabbinique ou, avec le rite 'Habad, date hassidique) : { id, in } ou { id, today }.
function homeNextFeast(day) {
    const C = HebrewCalendarCore;
    const h = day.ctx.hebrew;
    const habad = typeof riteFull === 'function' && riteFull() === 'habad';
    const list = C.feastsOf(h.year, day.israel, habad).map(f => Object.assign({ year: h.year }, f))
        .concat(C.feastsOf(h.year + 1, day.israel, habad).map(f => Object.assign({ year: h.year + 1 }, f)))
        .filter(f => (f.kind === 'moed' || f.kind === 'minor' || f.kind === 'habad') && f.last >= day.ctx.fixed)
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

// L'index des quiz de paracha (data/torah/quiz/index.json) : la carte « Quiz de la paracha » de l'onglet « Aujourd'hui » n'apparaît que si la paracha de la semaine a un quiz.
let homeQuizIndex = null;
let homeQuizLoading = false;
function homeLoadQuizIndex() {
    if (homeQuizIndex || homeQuizLoading) return;
    homeQuizLoading = true;
    fetch('data/torah/quiz/index.json').then(r => (r.ok ? r.json() : null)).then(json => {
        if (json) { homeQuizIndex = json; if (homeVisible() && homeTab === 'today') homeRender(true); }
    }).catch(() => { /* hors réseau, sans copie rangée : pas de carte */ }).then(() => { homeQuizLoading = false; });
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
    // Les maîtres de data/hilloulot/hilloulot.json (dates vérifiées), puis ceux du fichier des tombeaux qui ont un jour et un mois précis et n'y figurent pas.
    fetch('data/hilloulot/hilloulot.json').then(r => (r.ok ? r.json() : null)).then(json => {
        if (json && Array.isArray(json.entries)) { homeHil = json.entries; if (homeVisible() && homeTab === 'today') homeRender(true); }
    }).catch(() => { /* sans hilloulot : le reste fonctionne */ }).then(() => (typeof kevLoad === 'function' ? kevLoad() : null)).then(list => {
        if (list) { homeHil = (homeHil || []).concat(KevarimCore.hilloulot(list)); if (homeVisible() && homeTab === 'today') homeRender(true); }
    }).catch(() => { /* idem */ }).then(() => { homeHilLoading = false; });
}

// Ouvre la liste des 613 à la mitsva donnée : on déplie ses ancêtres repliables, on la montre et on la fait clignoter un instant.
function homeOpenHallah() {
    openTool('commandments', 'screen-main');
    if (typeof toolCommandmentsPick === 'function') toolCommandmentsPick('femmes');
    setTimeout(() => { const el = document.getElementById('cmd-hallah-calc'); if (el) el.scrollIntoView({ block: 'center' }); }, 150);
}

function homeOpenNidda() {
    openTool('commandments', 'screen-main');
    if (typeof toolCommandmentsPick === 'function') toolCommandmentsPick('femmes');
    setTimeout(() => { const el = document.getElementById('cmd-nidda-calc'); if (el) el.scrollIntoView({ block: 'center' }); }, 150);
}

function homeOpenWomen() {
    openTool('commandments', 'screen-main');
    if (typeof toolCommandmentsPick === 'function') toolCommandmentsPick('femmes');
}

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
    const meta = e.kind === 'tradition' || !e.year ? t('tools.zm_hil_tradition') : t('tools.zm_hil_year', { heb: e.year, greg: e.gregYear });
    item.appendChild(hEl('small', e.kind === 'tradition' || !e.year ? 'zm-hil-tradition' : '', meta));
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
    if (last) out.push({ he: HOME_ENTRIES.siddur.he, fr: 'Siddour', desc: last.title, run: () => openSiddurSections(last.ids, last.title, last.trim) });
    let block = null;
    try { const b = JSON.parse(localStorage.getItem(TORAH_READER_POSITION_KEY) || 'null'); block = b && Number.isInteger(b.block) ? b.block : null; } catch (e) { block = null; }
    if (block !== null) out.push({ he: HOME_ENTRIES.torahReader.he, fr: 'Tikkoun', desc: 'Reprendre la lecture du rouleau', run: HOME_ENTRIES.torahReader.run });
    return out;
}

function homeRenderToday(content) {
    homeLoadParasha();
    homeLoadHilloulot();
    homeLoadQuizIndex();
    const day = homeDay();
    const C = HebrewCalendarCore;
    let kicker = '';
    try { kicker = new Intl.DateTimeFormat('fr', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(day.civil.year, day.civil.month - 1, day.civil.day))); } catch (e) { kicker = ''; }
    homeHeader(content, hcalHebrewText(day.ctx.hebrew), kicker, homeNightNote(day));
    const travel = profileTravelNoteEl(day.place);   // domicile et lieu qui se contredisent : une mention discrète
    if (travel) content.appendChild(travel);
    homeHero(content, day);

    // Zmanim : une seule grande tuile, sans horaire (la carte principale donne ceux de la prière en cours). Le Siddour s'ouvre depuis la carte principale.
    const big = hEl('div', 'home-tiles c1');
    big.appendChild(homeTile(HOME_ENTRIES.zmanim, '', day.place ? '' : 'Choisir un lieu'));
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

    // Les périodes à usages particuliers (Omer, Trois Semaines, Kippour) : une carte pleine largeur par période en cours ou qui commence demain, qui ouvre ses règles.
    if (typeof periodsTodayCards === 'function') {
        const per = periodsTodayCards(day);
        if (per.length) {
            const prow = hEl('div', 'home-cards');
            per.forEach(c => {
                const card = homeInfoCard(c.label, c.value, c.sub, () => openPeriod(c.id, 'screen-main'));
                card.classList.add('home-card-wide');
                prow.appendChild(card);
            });
            content.appendChild(prow);
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
    // Profil « Femme » (js/app/first-profile.js) : un accès direct aux mitsvot des femmes.
    if (typeof profileGender === 'function' && profileGender() === 'f') {
        const wrow = hEl('div', 'home-cards');
        const wcard = homeInfoCard(t('welcome.women_card_label'), t('welcome.women_card_value'), t('welcome.women_card_sub'), () => homeOpenWomen());
        wcard.classList.add('home-card-wide');
        wrow.appendChild(wcard);
        content.appendChild(wrow);
    }
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
    const practice = [Object.assign({ id: 'kotel' }, HOME_ENTRIES.kotel)];
    if (typeof profileGender === 'function' && profileGender() === 'f') practice.push({ id: 'hallah', he: 'הפרשת חלה', fr: 'Hafrachat halla', desc: t('hallah.row_desc'), run: () => homeOpenHallah() });
    if (typeof profileGender === 'function' && profileGender() === 'f') practice.push({ id: 'nidda', he: 'נידה', fr: 'Pureté familiale', desc: t('nidda.row_desc'), run: () => homeOpenNidda() });
    practice.push(Object.assign({ id: 'personalDates' }, HOME_ENTRIES.personalDates));
    content.appendChild(homeRows(practice, { personalDates: datesTodaySub() }));
    homeGamesSection(content, day);
}

// « Jouer », sous « Reprendre » et « Pratique » : le défi du jour, la série, et le quiz de la paracha de la semaine.
function homeGamesSection(content, day) {
    content.appendChild(hEl('h2', 'home-section-title', 'Jouer'));
    const title = content.lastChild;
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

    // Le quiz de la paracha de la semaine, s'il existe : trois niveaux, un clic.
    const weekPar = homeQuizIndex ? homeParashaName(day) : null;
    const weekSlug = weekPar ? Object.keys(homeQuizIndex.parashot).find(k => homeQuizIndex.parashot[k].index === weekPar.index) : null;
    if (weekSlug) {
        const counts = homeQuizIndex.parashot[weekSlug].counts;
        const quiz = hEl('div', 'home-cards');
        const card = homeInfoCard(t('pquiz.card_label'), weekPar.name, t('pquiz.card_sub', { n: counts[1] + counts[2] + counts[3] }), () => openParashaQuiz('screen-main', weekSlug));
        card.classList.add('home-card-wide');
        quiz.appendChild(card);
        content.appendChild(quiz);
    }

    if (content.lastChild === title) title.remove();   // rien à proposer (Chabbat, ni quiz) : pas de titre seul
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
    if (typeof widgetsStart === 'function') widgetsStart();   // les widgets de l'iPhone (js/app/widgets.js)
    // Premier lancement : la fiche d'accueil (profil et rite, js/app/first-profile.js).
    profileWelcomeMaybeShow();
};

// Les rappels (notifications locales) sont reprogrammés à l'ouverture de l'app et à chaque retour au premier plan : iOS n'en garde que quelques-uns
// en attente, on renouvelle donc les prochains jours à chaque fois (voir js/notifications.js).
function remindersStart() {
    if (typeof TorahAxeNotifications === 'undefined' || !TorahAxeNotifications.isSupported()) return;
    TorahAxeNotifications.scheduleZmanim();
    // Toucher une notification ouvre directement l'écran concerné : le compte de l'Omer, ou les dates personnelles.
    TorahAxeNotifications.onOpen(extra => {
        if (extra.route === 'omer' && typeof openOmer === 'function') openOmer('screen-main', { day: extra.day, mode: extra.mode });
        else if (extra.route === 'hanouka' && typeof openHanouka === 'function') openHanouka('screen-main', { night: extra.night, friday: extra.friday });
        else if (extra.route === 'dates' && typeof openDates === 'function') openDates('screen-main');
    });
    try {
        window.Capacitor.Plugins.App.addListener('appStateChange', (state) => { if (state && state.isActive) TorahAxeNotifications.scheduleZmanim(); });
    } catch (e) { /* sans l'événement de l'app : on se rabat sur la visibilité de la page */ }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') TorahAxeNotifications.scheduleZmanim(); });
}