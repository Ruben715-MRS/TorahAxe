// =========================================================================
// === TORAHAXE — COMMANDEMENTS BIBLIQUES (données, sans DOM) ===
// =========================================================================
// Listes présentées selon la tradition juive et rabbinique, dont, dans cet ordre : les sept lois de Noé (pour toute l'humanité), les dix
// commandements (le Décalogue), les trente-neuf travaux interdits le Chabbat, et les 613 commandements selon le décompte du Rambam (Maïmonide),
// classés en positifs (248) et négatifs (365).
//
// Pour les trois premières, ce fichier ne contient que la structure (les identifiants, l'ordre, les regroupements) : les textes (nom, verset ou
// source, explication) sont dans ui/fr.json, sous `tools.cmd_*`. Pour les 613, les énoncés et les versets sont dans js/commandments613Data.js ;
// ce fichier y ajoute les regroupements par thème, et la recherche. tests/commandmentsCore.test.js vérifie les effectifs de la tradition :
// 7, 10 et 39 (11 + 13 + 9 + 6 pour les travaux), 248 et 365. Voir js/app/commandments.js pour l'écran.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else root.CommandmentsCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DATA = typeof module === 'object' && typeof module.exports === 'object' ? require('./commandments613Data.js') : Commandments613Data;
    var SANCTIONS = typeof module === 'object' && typeof module.exports === 'object' ? require('./commandmentsSanctionsData.js') : CommandmentsSanctionsData;

    // Treize éléments, identifiants préfixés : f1…f13, i1…i13, m1…m13.
    function range13(prefix) {
        var out = [];
        for (var n = 1; n <= 13; n++) out.push(prefix + n);
        return out;
    }

    // Les travaux du Chabbat sont numérotés dans l'ordre de la Michna (Chabbat 7:2), de 1 à 39.
    function range(from, to) {
        var out = [];
        for (var n = from; n <= to; n++) out.push('m' + (n < 10 ? '0' : '') + n);
        return out;
    }

    var SETS = [
        {
            id: 'noah',
            icon: '🌈',
            count: 7,
            groups: [{ id: 'all', items: ['idolatry', 'blasphemy', 'bloodshed', 'relations', 'theft', 'limb', 'courts'] }]
        },
        // Les dix épreuves d'Abraham : deux avis (Bartenura, et Avot de Rabbi Natan 33), chacun numéroté de 1 à 10. Pas de prière dans cette section.
        {
            id: 'epreuves',
            icon: '🔥',
            count: 20,
            themeMenu: true,
            restartPerGroup: true,
            groups: [
                { id: 'bartenura', items: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'] },
                { id: 'arn', items: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'] }
            ]
        },
        {
            id: 'decalogue',
            icon: '🪨',
            count: 10,
            groups: [
                { id: 'god', items: ['d1', 'd2', 'd3', 'd4', 'd5'] },       // la première table : entre l'homme et Dieu
                { id: 'neighbor', items: ['d6', 'd7', 'd8', 'd9', 'd10'] }  // la seconde : entre l'homme et son prochain
            ]
        },
        {
            id: 'shabbat',
            icon: '🕯️',
            count: 39,
            groups: [
                { id: 'bread', items: range(1, 11) },    // du semis à la cuisson du pain
                { id: 'cloth', items: range(12, 24) },   // de la tonte du mouton au vêtement cousu
                { id: 'skin', items: range(25, 33) },    // de la chasse à l'écriture sur parchemin
                { id: 'build', items: range(34, 39) }    // construire, feu, transport
            ]
        },
        // Les 613 : pas d'éléments ici, ils viennent de js/commandments613Data.js (voir LISTS613).
        { id: 'mitzvot', icon: '📜', count: 613, kind: 'list613', groups: [] },
        // Les punitions : les garanties qui entourent le jugement, les quatre peines de mort (Sanhédrin 7:1), la malkout, le karet (les 36 cas de Kritout 1:1),
        // la mort par le Ciel, l'exil, les réparations, les sacrifices expiatoires et les sanctions rabbiniques. Peines qui ne sont plus appliquées : étude, pas droit en vigueur.
        {
            id: 'peines',
            icon: '⚖️',
            count: 39,
            themeMenu: true,
            restartPerGroup: true,
            groups: [
                { id: 'garde', items: ['temoins', 'avertissement', 'tribunal', 'aveu'] },
                { id: 'mort', items: ['sekila', 'serefa', 'hereg', 'henek'] },
                { id: 'malkout', items: ['coups', 'fautes', 'mesure', 'frere'] },
                { id: 'karet', items: ['sens'] },
                { id: 'karet36', items: ['arayot', 'foi', 'shabbat', 'hametz', 'kippour', 'alliance', 'pur', 'aliments', 'dehors', 'huile'] },
                { id: 'ciel', items: ['ciel_sens', 'ciel_cas'] },
                { id: 'exil', items: ['refuge', 'villes', 'goel'] },
                { id: 'reparations', items: ['double', 'quatre', 'edim', 'dommages', 'amendes'] },
                { id: 'expiation', items: ['hatat', 'acham', 'oleh'] },
                { id: 'rabbinique', items: ['nidoui', 'herem', 'mardout'] }
            ]
        },
        // Mitsvot pratiques : trois petites listes, chacune un thème (d'où le menu déroulant par thème).
        {
            id: 'pratiques',
            icon: '🌿',
            count: 23,
            themeMenu: true,
            restartPerGroup: true,
            groups: [
                { id: 'pesah', items: ['pesah', 'matsa', 'maror', 'hametz', 'omer'] },
                { id: 'kippour', items: ['ky1', 'ky2', 'ky3', 'ky4', 'ky5'] },
                { id: 'soukkot', items: ['etrog', 'lulav', 'hadass', 'arava'] },
                { id: 'foyer', items: ['mezouza', 'birkat', 'havdala'] },
                { id: 'fetes', items: ['hanouka', 'mishloah', 'matanot', 'megila'] },
                { id: 'vie', items: ['brit', 'pidyon'] }
            ]
        },
        // Mitsvot des femmes : les trois de la Michna (Chabbat 2:6), celles du temps dont elles sont tenues malgré la règle (Kiddouchin 1:7), la prière
        // de chaque jour, et celles dont elles sont exemptées mais que beaucoup accomplissent. Profil « Femme » (js/app/first-profile.js) : l'onglet s'ouvre en premier.
        {
            id: 'femmes',
            icon: '🕯️',
            count: 13,
            themeMenu: true,
            restartPerGroup: true,
            groups: [
                { id: 'mishna', items: ['ner', 'hallah', 'nidda'] },
                { id: 'temps', items: ['kiddouch', 'matsa', 'kosot', 'hanouka', 'megila'] },
                { id: 'quotidien', items: ['tefila', 'mazon'] },
                { id: 'coutumes', items: ['chofar', 'soucca', 'loulav'] }
            ]
        },
        // Principes et textes : ce ne sont pas des mitsvot. Thèmes classés du plus ancien texte au plus récent ; chacun recommence à 1.
        {
            id: 'principes',
            icon: '📖',
            count: 68,
            themeMenu: true,
            restartPerGroup: true,
            groups: [
                { id: 'rappels', items: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10'] },
                { id: 'mercy', items: range13('m') },
                { id: 'hillel', items: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'] },
                { id: 'ishmael', items: range13('i') },
                { id: 'faith', items: range13('f') },
                { id: 'psoukim', items: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'] }
            ]
        },
    ];

    // Le nombre de cas de karet que couvre chaque élément du groupe « karet36 » : la première Michna de Kritout en compte trente-six.
    var KARET_CASES = { arayot: 14, foi: 5, shabbat: 1, hametz: 1, kippour: 2, alliance: 2, pur: 2, aliments: 4, dehors: 2, huile: 3 };

    // Les 613 commandements : deux listes, les positifs (de 1 à 248) et les négatifs (de 1 à 365), regroupées par thème. Chaque regroupement
    // couvre une plage de numéros ; les plages se suivent sans trou. Le titre de chaque regroupement est dans ui/fr.json :
    // tools.cmd_mitzvot_<pos|neg>_group_<id>.
    var LISTS613 = {
        pos: {
            id: 'pos',
            data: DATA.POSITIVE,
            groups: [
                { id: 'god', from: 1, to: 10 },
                { id: 'torah', from: 11, to: 19 },
                { id: 'temple', from: 20, to: 38 },
                { id: 'offerings', from: 39, to: 62 },
                { id: 'sacrifices', from: 63, to: 91 },
                { id: 'vows', from: 92, to: 95 },
                { id: 'purity', from: 96, to: 113 },
                { id: 'consecrations', from: 114, to: 118 },
                { id: 'land', from: 119, to: 145 },
                { id: 'food', from: 146, to: 152 },
                { id: 'calendar', from: 153, to: 171 },
                { id: 'authority', from: 172, to: 193 },
                { id: 'neighbor', from: 194, to: 211 },
                { id: 'family', from: 212, to: 223 },
                { id: 'justice', from: 224, to: 248 }
            ]
        },
        neg: {
            id: 'neg',
            data: DATA.NEGATIVE,
            groups: [
                { id: 'idolatry', from: 1, to: 38 },
                { id: 'ways', from: 39, to: 47 },
                { id: 'nations', from: 48, to: 59 },
                { id: 'name', from: 60, to: 66 },
                { id: 'temple', from: 67, to: 88 },
                { id: 'offerings', from: 89, to: 128 },
                { id: 'holyfood', from: 129, to: 154 },
                { id: 'vows', from: 155, to: 157 },
                { id: 'priests', from: 158, to: 171 },
                { id: 'food', from: 172, to: 201 },
                { id: 'nazir', from: 202, to: 209 },
                { id: 'land', from: 210, to: 229 },
                { id: 'money', from: 230, to: 242 },
                { id: 'theft', from: 243, to: 270 },
                { id: 'justice', from: 271, to: 296 },
                { id: 'neighbor', from: 297, to: 311 },
                { id: 'authority', from: 312, to: 319 },
                { id: 'shabbat', from: 320, to: 329 },
                { id: 'arayot', from: 330, to: 360 },
                { id: 'king', from: 361, to: 365 }
            ]
        }
    };

    function getSet(id) {
        for (var i = 0; i < SETS.length; i++) if (SETS[i].id === id) return SETS[i];
        return null;
    }

    // Tous les éléments d'une liste, dans l'ordre, avec leur numéro (1, 2, 3…). Par défaut, les numéros se suivent d'un thème à l'autre (c'est le
    // cas des travaux du Chabbat, numérotés selon la Michna) ; avec `restartPerGroup`, chaque thème recommence à 1, sauf un groupe marqué
    // `continues` (la suite du thème précédent).
    function itemsOf(setId) {
        var set = getSet(setId);
        if (!set) return [];
        var out = [];
        var n = 0;
        set.groups.forEach(function (g) {
            if (set.restartPerGroup && !g.continues) n = 0;
            g.items.forEach(function (id) { n++; out.push({ id: id, group: g.id, n: n }); });
        });
        return out;
    }

    // Les clés de texte dans ui/fr.json : tools.cmd_<liste>_<élément>_<champ>.
    function itemKey(setId, itemId, field) { return 'tools.cmd_' + setId + '_' + itemId + '_' + field; }

    // Les champs de texte d'un élément : son nom, son nom en lettres hébraïques (`he`, pour le bouton « א »), sa source (verset ou traité), son
    // explication ; les travaux du Chabbat ont aussi leur nom hébreu en transcription (`heb`).
    function fieldsOf(setId) { return setId === 'shabbat' ? ['name', 'heb', 'he', 'ref', 'text'] : ['name', 'he', 'ref', 'text']; }

    // La liste qui suit (ou précède) celle-ci, pour les boutons « suivant » ; null aux deux bouts.
    function neighbor(setId, step) {
        for (var i = 0; i < SETS.length; i++) {
            if (SETS[i].id === setId) return SETS[i + step] || null;
        }
        return null;
    }

    // --- Les 613 ---------------------------------------------------------------------------------------------------------------------------

    // Les listes que recouvre un choix : 'pos', 'neg', ou 'all' (les positifs, puis les négatifs).
    function kindsOf(kind) { return kind === 'all' ? ['pos', 'neg'] : LISTS613[kind] ? [kind] : []; }

    // Les commandements d'un choix ('pos', 'neg' ou 'all'), dans l'ordre : { kind, n, text, ref, group }. Le numéro est celui de la liste d'origine :
    // dans « tous », il y a donc deux commandements n° 1 (le premier positif, le premier négatif).
    function list613(kind) {
        var out = [];
        kindsOf(kind).forEach(function (k) {
            LISTS613[k].data.forEach(function (entry, i) {
                out.push({ kind: k, n: i + 1, text: entry[0], ref: entry[1], group: groupOf(k, i + 1), sanction: sanctionOf(k, i + 1) });
            });
        });
        return out;
    }

    // Le regroupement (identifiant) du commandement numéro n ; null hors de la liste.
    function groupOf(kind, n) {
        var list = LISTS613[kind];
        if (!list) return null;
        for (var i = 0; i < list.groups.length; i++) {
            if (n >= list.groups[i].from && n <= list.groups[i].to) return list.groups[i].id;
        }
        return null;
    }

    // Pour chercher sans se soucier des accents, des majuscules, des apostrophes ni des tirets : « pessa'h », « Pessah » et « PESSA’H » se valent.
    function normalize(s) {
        return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’`\-]/g, '');
    }

    // --- La sanction de chaque commandement (js/commandmentsSanctionsData.js) ------------------------------------------------------------------

    // Les codes de sanction, dans l'ordre de la légende ; les libellés sont dans ui/fr.json (tools.cmd_sanction_<code>, et cmd_sanction_help_<code>).
    var SANCTION_CODES = ['S', 'B', 'H', 'N', 'K', 'C', 'M', 'P', 'A', 'Z', '0a', '0b', '0g', 'E'];

    // Les mots qu'on peut taper pour trouver un code (la recherche les ajoute au texte du commandement).
    var SANCTION_WORDS = {
        S: 'lapidation sequila', B: 'bucher serefa', H: 'decapitation hereg', N: 'strangulation henek', K: 'karet retranchement',
        C: 'mort par le ciel mita bidei chamayim', M: 'malkout malkot coups flagellation', P: 'reparation paiement argent',
        A: 'acham culpabilite reparation', Z: 'faux temoin', '0a': 'sans coups sans acte', '0b': 'sans coups reparable commandement positif',
        '0g': 'sans peine tribunal roi peuple', E: 'aucune peine'
    };

    // Les regroupements du filtre « sanction » : un commandement y entre s'il a au moins un des codes.
    var SANCTION_FILTERS = [
        { id: 'death', codes: ['S', 'B', 'H', 'N'] },
        { id: 'karet', codes: ['K'] },
        { id: 'ciel', codes: ['C'] },
        { id: 'malkout', codes: ['M'] },
        { id: 'argent', codes: ['P', 'A', 'Z'] },
        { id: 'sans', codes: ['0a', '0b', '0g'] },
        { id: 'aucune', codes: ['E'] }
    ];

    // La sanction du commandement numéro n de la liste « pos » ou « neg » : { codes: ['S', 'K'], uncertain: false }. Un « ? » dans les données la marque moins sûre.
    // Les positifs n'ont aucune peine fixée (« E »), sauf les quatre cas de karet. Hors des listes : null.
    function sanctionOf(kind, n) {
        var token;
        if (kind === 'neg') token = SANCTIONS.NEGATIVE[n - 1];
        else if (kind === 'pos') token = n >= 1 && n <= DATA.POSITIVE.length ? (SANCTIONS.POSITIVE[n] || 'E') : undefined;
        if (!token) return null;
        var uncertain = token.charAt(token.length - 1) === '?';
        if (uncertain) token = token.slice(0, -1);
        return { codes: token.split('+'), uncertain: uncertain };
    }

    // Le filtre demandé (identifiant de SANCTION_FILTERS, ou 'all') laisse-t-il passer ce commandement ?
    function matchesSanction(c, filterId) {
        if (!filterId || filterId === 'all') return true;
        for (var i = 0; i < SANCTION_FILTERS.length; i++) {
            if (SANCTION_FILTERS[i].id !== filterId) continue;
            return !!c.sanction && c.sanction.codes.some(function (code) { return SANCTION_FILTERS[i].codes.indexOf(code) >= 0; });
        }
        return true;
    }

    // Les commandements d'une liste qui répondent à une recherche : par mots (tous doivent s'y trouver), dans l'énoncé, le verset, le numéro ou les mots de la
    // sanction (« karet », « malkout »…) ; et, si on en donne un, le filtre de sanction.
    function search613(kind, query, sanctionFilter) {
        var all = list613(kind).filter(function (c) { return matchesSanction(c, sanctionFilter); });
        var words = normalize(query).split(/\s+/).filter(Boolean);
        if (!words.length) return all;
        return all.filter(function (c) {
            var sanctionWords = c.sanction ? c.sanction.codes.map(function (code) { return SANCTION_WORDS[code] || ''; }).join(' ') : '';
            var hay = normalize(c.text + ' ' + c.ref + ' ' + c.n + ' ' + sanctionWords);
            return words.every(function (w) { return hay.indexOf(w) >= 0; });
        });
    }

    return {
        SETS: SETS, LISTS613: LISTS613, KARET_CASES: KARET_CASES,
        getSet: getSet, itemsOf: itemsOf, itemKey: itemKey, fieldsOf: fieldsOf, neighbor: neighbor,
        kindsOf: kindsOf, list613: list613, groupOf: groupOf, search613: search613, normalize: normalize,
        SANCTION_CODES: SANCTION_CODES, SANCTION_FILTERS: SANCTION_FILTERS, sanctionOf: sanctionOf, matchesSanction: matchesSanction
    };
});
