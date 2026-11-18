// =========================================================================
// === TORAHAXE — CATALOGUE DES JEUX : LA LISTE UNIQUE (pur, sans DOM, testé) ===
// =========================================================================
// Un jeu = une ligne de GAMES. Le catalogue nourrit :
//  - l'accueil (onglet « Jouer ») : js/app/home.js en tire les entrées (mot hébreu, nom, description, mots de recherche) et les sections ;
//  - la progression : js/progressCore.js en tire le domaine de chaque jeu (hébreu, Tanakh, sages…), donc les points d'expérience, les niveaux et les badges ;
//  - l'écran (facultatif) : le champ `screen` décrit l'écran du jeu, que js/app/game-screen.js construit au démarrage (plus de HTML à écrire à la main).
// Pour ajouter un jeu : une ligne ici, ses chaînes dans ui/fr.json (clé = l'identifiant du jeu), sa fonction d'ouverture (`open`) et son écran. tests/gamesCatalog.test.js
// vérifie que tout est branché (fonction d'ouverture, écran, domaine, section).
//
// Champs : id (celui du préfixe des écrans et des clés de traduction, et celui du registre de progression) ; open (nom de la fonction d'ouverture : open(depuis, ...args)) ;
// args (arguments de plus) ; domain (voir DOMAINS de js/progressCore.js) ; section (rayon de l'onglet « Jouer ») ; he, fr, desc, kw (l'entrée de l'accueil) ;
// home: false pour un jeu sans entrée propre (les frises sont lancées par thème) ; screen: le plan de l'écran (js/app/game-screen.js), absent pour un écran écrit à la main.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.GamesCatalog = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les rayons de l'onglet « Jouer », dans l'ordre. Un rayon sans jeu n'est pas affiché.
    var SECTIONS = [
        { id: 'daily', title: 'Chaque jour' },
        { id: 'hebreu', title: 'Hébreu et araméen' },
        { id: 'tanakh', title: 'Tanakh' },
        { id: 'geographie', title: 'Géographie' },
        { id: 'ordre', title: 'Mettre dans l\'ordre' },
        { id: 'sages', title: 'Personnages et sages' },
        { id: 'halakha', title: 'Halakha et fêtes' }
    ];

    // L'ordre de cette liste est celui des lignes dans chaque rayon.
    var GAMES = [
        { id: 'dailygame', open: 'openDailyGame', domain: 'halakha', section: 'daily', he: 'אתגר', fr: 'Défi du jour', desc: 'Cinq questions sur la date du jour : paracha, Daf Yomi, mois, fête, Téhilim', kw: 'jeu défi quotidien jour date paracha daf yomi mois fête téhilim' },
        { id: 'review', open: 'openReview', domain: 'hebreu', section: 'daily', he: 'חזרה', fr: 'À réviser aujourd\'hui', desc: 'Mots du Tanakh et de la Guémara à revoir aujourd\'hui, en une seule séance', kw: 'réviser révision répétition espacée rappel mémoire jeu' },
        { id: 'lexgame', open: 'openLexiconGame', domain: 'hebreu', section: 'hebreu', he: 'מילים', fr: 'Mots du Tanakh', desc: 'Le vocabulaire hébreu de la Bible, du plus fréquent au plus rare', kw: 'jeu hébreu vocabulaire' },
        { id: 'gemgame', open: 'openGemaraGame', domain: 'hebreu', section: 'hebreu', he: 'גמרא', fr: 'Mots de la Guémara', desc: 'Les mots, les abréviations et les sages de la Guémara', kw: 'jeu araméen guemara' },
        { id: 'parashagame', open: 'openVerseGame', domain: 'tanakh', section: 'tanakh', he: 'פרשה', fr: 'Dans quelle paracha ?', desc: 'Un verset tiré au hasard dans la Torah : retrouvez sa paracha, avec des indices qui coûtent des points', kw: 'jeu paracha parachiot verset torah indice deviner' },
        { id: 'scrgame', open: 'openScrambleGame', domain: 'tanakh', section: 'tanakh', he: 'פסוק', fr: 'Le verset en désordre', desc: 'Un verset de la Torah coupé en mots : remettez-les dans l\'ordre', kw: 'jeu verset mots ordre torah désordre puzzle' },
        { id: 'mitsvagame', open: 'openMitsvaGame', domain: 'tanakh', section: 'tanakh', he: 'מצוות', fr: 'Mitsva express', desc: 'De quelle paracha le Rambam tire-t-il ce commandement ? Vite, parmi les 613', kw: 'jeu mitsvot commandements 613 rambam paracha parachiot torah livre' },
        { id: 'mapgame', open: 'openMapGame', domain: 'geographie', section: 'geographie', he: 'מפה', fr: 'Sur la carte', desc: 'Touchez la carte à l\'endroit d\'une ville, d\'une montagne, d\'une mer ou d\'une tribu', kw: 'jeu carte géographie villes tribus montagnes mers lieux terre israël' },
        { id: 'ordergame', open: 'openOrderGame', domain: 'tanakh', section: 'ordre', he: 'סדר', fr: 'Le bon ordre', desc: 'Remettez dans l\'ordre des parachiot, des livres, des traités, des générations ou des rois', kw: 'jeu classer ordre parachiot tanakh michna talmud traités générations rois fils jacob' },
        { id: 'whogame', open: 'openWhoGame', domain: 'sages', section: 'sages', he: 'מי אני', fr: 'Qui suis-je ?', desc: 'Un personnage de la Bible ou un sage du Talmud parle : devinez qui, avec des indices qui coûtent des points', kw: 'jeu devinette personnages bible sages talmud indices' },
        { id: 'trgame', open: 'openTransmissionGame', domain: 'sages', section: 'sages', he: 'מסורה', fr: 'Maîtres et élèves', desc: 'Qui a reçu la Torah de qui ? Retrouvez le maître d\'un sage', kw: 'jeu sages transmission' },
        { id: 'purgame', open: 'openPurityGame', domain: 'halakha', section: 'halakha', he: 'טהור', fr: 'Pur ou impur ?', desc: 'Triez les animaux, vite : pur (permis) ou impur (interdit), avec les signes à connaître', kw: 'jeu cacherout casher kasher animaux poissons oiseaux quadrupèdes tahor tame' },
        { id: 'wheel', open: 'openWheel', args: ['juif'], domain: 'halakha', section: 'halakha', he: 'מועדים', fr: 'La roue des fêtes', desc: 'Placez les fêtes juives dans le bon mois du calendrier hébraïque', kw: 'jeu fêtes calendrier mois' },
        // Les frises : lancées par thème depuis l'accueil (js/app/frises.js), mais leurs parties comptent dans la progression.
        { id: 'frise', domain: 'histoire', home: false }
    ];

    var BY_ID = {};
    GAMES.forEach(function (g) { BY_ID[g.id] = g; });

    function byId(id) { return BY_ID[id] || null; }

    // Le domaine de progression de chaque jeu : { identifiant: domaine }.
    function domains() {
        var out = {};
        GAMES.forEach(function (g) { out[g.id] = g.domain; });
        return out;
    }

    // Les jeux d'un rayon, dans l'ordre du catalogue ; seuls ceux qui ont une entrée sur l'accueil.
    function inSection(sectionId) {
        return GAMES.filter(function (g) { return g.section === sectionId && g.home !== false; });
    }

    return { SECTIONS: SECTIONS, GAMES: GAMES, byId: byId, domains: domains, inSection: inSection };
}));
