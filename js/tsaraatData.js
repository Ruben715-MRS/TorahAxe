// =========================================================================
// === HISTORIAXE — TSARAAT (LA « LÈPRE » BIBLIQUE) : DONNÉES ===
// =========================================================================
// Le contenu de l'écran « Tsaraat » (Atelier, groupe « Bible et tradition ») : cinq arbres de décision (la peau, la calvitie, l'inflammation ou la
// brûlure, le nétek, les vêtements, les maisons), le tableau des couleurs, la purification du métsora (« Et ensuite ? ») et un petit lexique.
// Les calculs (parcours, vérifications, cas tirés au sort) sont dans js/tsaraatCore.js, testés dans tests/tsaraatCore.test.js.
//
// Sources : le Lévitique 13 et 14, vérifié verset par verset contre le texte hébreu et la traduction du Rabbinat de data/tanakh/levitique.json ;
// l'ordre des étapes suit les schémas d'un ouvrage de référence en culture biblique (recoupés avec le texte). Les textes sont écrits en propres termes.
// Là où la tradition précise ce que le verset ne dit pas (par exemple la deuxième semaine d'isolement d'une maison), la case porte `trad: true` : l'écran
// le dit, au lieu de prêter le détail au verset. Outil d'étude, pas une décision halakhique : seul un cohen examine et déclare (Lévitique 13:2).
//
// Forme d'un arbre : `nodes` est un dictionnaire d'identifiants. Un nœud « question » a `q` (la situation), `day` (le jour écoulé depuis le constat :
// 0, 7, 14, 21), `action` (ce que fait le cohen en arrivant à ce nœud, en une ligne) et `options` ([{ t: ce que le cohen voit, to: nœud suivant }]).
// Une « feuille » a `verdict` (pur, metsora, partiel), `short` (le résultat en une ligne), `text`, `todo` (ce qui se fait ensuite) et `later` (ce qui
// arrive si la plaie revient plus tard). Un nœud dont les options sont des fragments (« s'est étendue ») a `subject` (« La plaie »). Chaque nœud et chaque option cite sa source dans `ref`.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TsaraatData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Les verdicts ----------------------------------------------------------------------------------------------------
    var VERDICTS = {
        pur: { icon: '✅', fr: 'Déclaré pur' },
        metsora: { icon: '⛔', fr: 'Métsora confirmé' },
        partiel: { icon: '🧵', fr: 'Pur, mais pas intact' }
    };

    // --- Les arbres ------------------------------------------------------------------------------------------------------
    var PEAU = {
        start: {
            q: 'Une plaie suspecte apparaît sur la peau (une tache gonflée, une croûte ou une tache claire). Le cohen l\'examine : que voit-il ?',
            day: 0, action: 'Le cohen examine la plaie',
            ref: '13:2-3, 13:10',
            options: [
                { t: 'Des poils sont devenus blancs dans la plaie, ou il reste de la chair saine (mi\'hya) dans la plaie', to: 'impur0', ref: '13:3, 13:10' },
                { t: 'Aucun poil n\'a blanchi et il n\'y a pas de chair saine dans la plaie', to: 'sem1', ref: '13:4' }
            ]
        },
        'impur0': {
            verdict: 'metsora', short: 'Métsora confirmé',
            text: 'Le cohen le déclare impur sans attendre : un poil blanc ou un reste de chair saine suffit.',
            todo: ['La personne est déclarée métsora ; elle suit les règles du métsora (voir « Et ensuite ? »).'],
            ref: '13:3, 13:10-11'
        },
        sem1: {
            q: 'La personne est isolée pendant sept jours. Le septième jour, le cohen examine à nouveau : la plaie…',
            day: 7, action: 'La personne est isolée sept jours',
            subject: 'La plaie',
            ref: '13:4-5',
            options: [
                { t: 's\'est étendue', to: 'impur_sem1', ref: '13:5-8' },
                { t: 'ne s\'est pas étendue', to: 'sem2', ref: '13:5' }
            ]
        },
        impur_sem1: {
            verdict: 'metsora', short: 'Métsora confirmé',
            text: 'Une plaie qui s\'étend est le signe de l\'impureté.',
            todo: ['La personne est déclarée métsora.'],
            ref: '13:5-8'
        },
        sem2: {
            q: 'La personne est isolée une deuxième fois, sept jours. Au quatorzième jour, la plaie…',
            day: 14, action: 'La personne est isolée une deuxième fois, sept jours',
            subject: 'La plaie',
            ref: '13:5-6',
            options: [
                { t: 's\'est assombrie et ne s\'est pas étendue', to: 'pur', ref: '13:6' },
                { t: 'a gardé son aspect ou s\'est étendue', to: 'impur_sem2', ref: '13:8', trad: true }
            ]
        },
        pur: {
            verdict: 'pur', short: 'Déclaré pur',
            text: 'Ce n\'était qu\'une croûte (mispa\'hat) : la personne est pure.',
            todo: ['Elle lave ses vêtements (13:6) et, selon la tradition, se trempe au mikvé.'],
            later: 'Si la plaie s\'étend plus tard, la personne est déclarée métsora tout de suite, sans nouvelle isolation (13:7-8).',
            ref: '13:6-8'
        },
        impur_sem2: {
            verdict: 'metsora', short: 'Métsora confirmé',
            text: 'La plaie n\'a pas pâli en deux semaines, ou elle s\'est étendue : c\'est bien la tsaraat.',
            todo: ['La personne est déclarée métsora.'],
            ref: '13:8'
        }
    };

    var INFLAMMATION = {
        start: {
            q: 'Une tache claire apparaît à l\'endroit d\'une inflammation (shé\'hin), d\'une blessure ou d\'une brûlure en train de guérir. Que voit le cohen ?',
            day: 0, action: 'Le cohen examine la plaie',
            ref: '13:18-20, 13:24-25',
            options: [
                { t: 'Des poils sont devenus blancs', to: 'impur0', ref: '13:20, 13:25' },
                { t: 'Aucun poil n\'est devenu blanc', to: 'sem1', ref: '13:21, 13:26' }
            ]
        },
        'impur0': {
            verdict: 'metsora', short: 'Métsora confirmé',
            text: 'Un poil blanc dans la plaie : la tsaraat a fleuri sur la blessure (13:20, 13:25).',
            todo: ['La personne est déclarée métsora.'],
            ref: '13:20, 13:25'
        },
        sem1: {
            q: 'La personne est isolée pendant sept jours. Le septième jour, la plaie…',
            day: 7, action: 'La personne est isolée sept jours',
            subject: 'La plaie',
            ref: '13:21, 13:26',
            options: [
                { t: 's\'est étendue', to: 'impur', ref: '13:22, 13:27' },
                { t: 'ne s\'est pas étendue', to: 'pur', ref: '13:23, 13:28' }
            ]
        },
        impur: {
            verdict: 'metsora', short: 'Métsora confirmé',
            text: 'La plaie s\'est étendue : c\'est la tsaraat.',
            todo: ['La personne est déclarée métsora.'],
            ref: '13:22, 13:27'
        },
        pur: {
            verdict: 'pur', short: 'Déclaré pur',
            text: 'La tache est la cicatrice de la blessure (tsarévet), pas de la tsaraat.',
            todo: ['Selon la tradition, la personne se trempe au mikvé.'],
            ref: '13:23, 13:28'
        }
    };

    var NETEK = {
        start: {
            q: 'Une plaie suspecte apparaît sur le cuir chevelu ou dans la barbe : le nétek. Le cohen regarde les poils du nétek.',
            day: 0, action: 'Le cohen examine le nétek',
            ref: '13:30-31, 13:37',
            note: 'Les couleurs qui décident du statut du nétek ne nous ont pas été transmises (voir Rachi).',
            options: [
                { t: 'Il y a des poils dans le nétek, mais aucun n\'est jaune', to: 'pur_noir', ref: '13:37' },
                { t: 'Un poil est devenu jaune', to: 'impur_jaune', ref: '13:30' },
                { t: 'Il n\'y a aucun poil dans le nétek', to: 'sem1', ref: '13:31' }
            ]
        },
        pur_noir: {
            verdict: 'pur', short: 'Déclaré pur',
            text: 'Des poils sains ont poussé dans le nétek : il est guéri.',
            todo: ['Le cohen le déclare pur.'],
            later: 'Si le nétek s\'étend plus tard, la personne est déclarée métsora tout de suite, sans chercher de poil jaune (13:35-36).',
            ref: '13:37'
        },
        impur_jaune: {
            verdict: 'metsora', short: 'Métsora confirmé',
            text: 'Un poil jaune : c\'est la tsaraat de la tête ou de la barbe.',
            todo: ['La personne est déclarée métsora.'],
            ref: '13:30, 13:36'
        },
        sem1: {
            q: 'La personne est isolée pendant sept jours. Le septième jour, le cohen examine : le nétek…',
            day: 7, action: 'La personne est isolée sept jours',
            subject: 'Le nétek',
            ref: '13:31-32',
            options: [
                { t: 's\'est étendu, ou un poil jaune est apparu', to: 'impur', ref: '13:32, 13:36' },
                { t: 'ne s\'est pas étendu et aucun poil jaune n\'est apparu', to: 'sem2', ref: '13:32-33' }
            ]
        },
        impur: {
            verdict: 'metsora', short: 'Métsora confirmé',
            text: 'Le nétek s\'est étendu, ou un poil jaune est apparu : c\'est la tsaraat.',
            todo: ['La personne est déclarée métsora.'],
            ref: '13:32, 13:36'
        },
        sem2: {
            q: 'Le cohen fait raser autour du nétek, sans toucher au nétek lui-même ; selon la tradition, il laisse deux poils au bord. La personne est isolée une deuxième fois, sept jours. Au quatorzième jour, le nétek…',
            day: 14, action: 'Le cohen fait raser autour du nétek et isole la personne une deuxième fois',
            subject: 'Le nétek',
            ref: '13:33-34', trad: true,
            options: [
                { t: 's\'est étendu, ou un poil jaune est apparu', to: 'impur', ref: '13:36' },
                { t: 'ne s\'est pas étendu et aucun poil jaune n\'est apparu', to: 'pur', ref: '13:34' }
            ]
        },
        pur: {
            verdict: 'pur', short: 'Déclaré pur',
            text: 'Le nétek est resté tel quel pendant deux semaines, sans poil jaune : il est pur.',
            todo: ['La personne lave ses vêtements (13:34) et, selon la tradition, se trempe au mikvé.'],
            later: 'Si le nétek s\'étend plus tard, la personne est déclarée métsora tout de suite (13:35-36).',
            ref: '13:34-36'
        }
    };

    var VETEMENT = {
        start: {
            q: 'Une tache verdâtre ou rougeâtre apparaît sur un vêtement de laine ou de lin, sur sa chaîne ou sa trame, ou sur du cuir. Le cohen la constate.',
            day: 0, action: 'Le cohen constate la tache',
            ref: '13:47-50',
            options: [
                { t: 'Le cohen enferme le vêtement pendant sept jours', to: 'sem1', ref: '13:50' }
            ]
        },
        sem1: {
            q: 'Le vêtement est enfermé sept jours. Le septième jour, la tache…',
            day: 7, action: 'Le vêtement est enfermé sept jours',
            subject: 'La tache',
            ref: '13:50-51',
            options: [
                { t: 's\'est étendue', to: 'brule_sem1', ref: '13:51-52' },
                { t: 'ne s\'est pas étendue', to: 'sem2', ref: '13:53-54' }
            ]
        },
        brule_sem1: {
            verdict: 'metsora', short: 'Métsora confirmé : on brûle le vêtement',
            text: 'La tache s\'est étendue : c\'est une tsaraat « qui ronge » (tsaraat mam\'eret). Le vêtement est impur.',
            todo: ['On brûle le vêtement, ou la pièce de cuir, au feu.'],
            ref: '13:51-52'
        },
        sem2: {
            q: 'On lave l\'endroit de la tache et on enferme le vêtement une deuxième fois, sept jours. Au quatorzième jour, la tache…',
            day: 14, action: 'On lave la tache et on enferme le vêtement une deuxième fois',
            subject: 'La tache',
            ref: '13:53-55',
            options: [
                { t: 'a disparu', to: 'pur', ref: '13:58' },
                { t: 's\'est assombrie et ne s\'est pas étendue', to: 'dechire', ref: '13:56' },
                { t: 'a gardé son aspect, ou s\'est étendue', to: 'brule_sem2', ref: '13:55' }
            ]
        },
        pur: {
            verdict: 'pur', short: 'Déclaré pur',
            text: 'La tache a disparu après le lavage : le vêtement est pur.',
            todo: ['Le vêtement est lavé une seconde fois (13:58) et, selon la tradition, trempé au mikvé.'],
            ref: '13:58'
        },
        dechire: {
            verdict: 'partiel', short: 'On déchire l\'endroit, on le brûle, on répare',
            text: 'La tache a pâli sans disparaître : le cohen fait arracher l\'endroit atteint ; le reste du vêtement peut être gardé.',
            todo: ['On déchire l\'endroit de la tache, on le brûle et on répare le vêtement.'],
            later: 'Si la tache réapparaît plus tard dans le vêtement, c\'est une tsaraat confirmée tout de suite : on brûle tout le vêtement (13:57).',
            ref: '13:56-57'
        },
        brule_sem2: {
            verdict: 'metsora', short: 'Métsora confirmé : on brûle le vêtement',
            text: 'La tache n\'a pas changé d\'aspect après le lavage, même sans s\'étendre : elle est impure (13:55).',
            todo: ['On brûle le vêtement au feu.'],
            ref: '13:55'
        }
    };

    var MAISON = {
        start: {
            q: 'Après l\'entrée dans le pays, une altération apparaît dans un mur : des creux verdâtres ou rougeâtres. Le propriétaire le dit au cohen. Avant la visite, on vide la maison pour que son contenu ne devienne pas impur.',
            day: 0, action: 'On vide la maison, puis le cohen la visite',
            ref: '14:34-37',
            options: [
                { t: 'Le cohen constate la plaie et fait fermer la maison sept jours', to: 'sem1', ref: '14:37-38' }
            ]
        },
        sem1: {
            q: 'La maison est isolée sept jours. Le septième jour, la plaie…',
            day: 7, action: 'La maison est isolée sept jours',
            subject: 'La plaie',
            ref: '14:38-39',
            options: [
                { t: 's\'est étendue', to: 'pierres', ref: '14:39-40' },
                { t: 'a disparu ou s\'est assombrie', to: 'pur_gratte', ref: '14:38-39', trad: true },
                { t: 'a gardé son aspect et ne s\'est pas étendue', to: 'sem2', ref: '14:38-39', trad: true }
            ]
        },
        pierres: {
            q: 'On retire les pierres touchées, on gratte l\'enduit tout autour, et on les remplace par d\'autres pierres et un autre enduit ; la maison est isolée une deuxième fois, sept jours. Au quatorzième jour, la plaie…',
            day: 14, action: 'On remplace les pierres touchées et on isole la maison une deuxième fois',
            subject: 'La plaie',
            ref: '14:40-43',
            options: [
                { t: 'n\'est pas réapparue', to: 'pur_oiseaux', ref: '14:48' },
                { t: 'est réapparue', to: 'demolition', ref: '14:43-44' }
            ]
        },
        sem2: {
            q: 'La maison est isolée une deuxième fois, sept jours. Au quatorzième jour, la plaie…',
            day: 14, action: 'La maison est isolée une deuxième fois, sept jours',
            subject: 'La plaie',
            ref: '14:38-39', trad: true,
            options: [
                { t: 'a disparu ou s\'est assombrie', to: 'pur_oiseaux', ref: '14:48', trad: true },
                { t: 'a gardé son aspect, ou s\'est étendue', to: 'pierres2', ref: '14:40-43', trad: true }
            ]
        },
        pierres2: {
            q: 'On retire les pierres touchées, on gratte l\'enduit tout autour, on les remplace, et la maison est isolée une troisième fois, sept jours. Au vingt-et-unième jour, la plaie…',
            day: 21, action: 'On remplace les pierres touchées et on isole la maison une troisième fois',
            subject: 'La plaie',
            ref: '14:40-43', trad: true,
            options: [
                { t: 'n\'est pas réapparue', to: 'pur_oiseaux', ref: '14:48' },
                { t: 'est réapparue', to: 'demolition', ref: '14:43-45' }
            ]
        },
        pur_gratte: {
            verdict: 'pur', short: 'La plaie est partie : on gratte l\'endroit',
            text: 'La plaie a disparu ou pâli dès la première semaine : on gratte l\'endroit de la plaie. Le schéma de référence ne mentionne pas d\'oiseaux dans ce cas.',
            todo: ['On gratte l\'endroit de la plaie.'],
            ref: '14:38-39', trad: true
        },
        pur_oiseaux: {
            verdict: 'pur', short: 'Maison déclarée pure : on offre deux oiseaux',
            text: 'La plaie n\'a pas repris après le crépi : le cohen déclare la maison pure, « car la plaie est guérie ».',
            todo: ['On prend deux oiseaux, du bois de cèdre, de l\'écarlate et de l\'hysope ; on en immole un, on trempe l\'autre avec les trois ingrédients dans le sang et l\'eau vive, on asperge la maison sept fois et on lâche l\'oiseau vivant hors de la ville (14:49-53).'],
            ref: '14:48-53'
        },
        demolition: {
            verdict: 'metsora', short: 'Maison impure : on la démolit',
            text: 'La plaie a repris après le crépi : c\'est une tsaraat « qui ronge ». La maison est impure.',
            todo: ['On démolit la maison ; on porte les pierres, le bois et tout l\'enduit hors de la ville, dans un lieu impur (14:45).'],
            ref: '14:43-45'
        }
    };

    // --- Les supports : chaque onglet de l'écran -------------------------------------------------------------------------------
    // `maxDay` : le dernier jour possible du parcours (pour la frise). `base` : l'identifiant de l'arbre quand deux supports ont les mêmes lois.
    var SUPPORTS = [
        {
            id: 'peau', fr: 'La peau', he: 'שְׂאֵת · סַפַּחַת · בַּהֶרֶת', ref: 'Lévitique 13:1-17', maxDay: 14, nodes: PEAU,
            lead: 'Une tache, une croûte ou une enflure sur la peau du corps. Le cohen examine, isole sept jours, puis éventuellement sept jours de plus.'
        },
        {
            id: 'calvitie', fr: 'Calvitie ou front dégarni', he: 'קָרַחַת · גַּבַּחַת', ref: 'Lévitique 13:40-44', maxDay: 14, nodes: PEAU,
            lead: 'Sur le crâne chauve (qara\'hat) ou le front dégarni (gaba\'hat), une tache blanc-rougeâtre : les lois sont les mêmes que pour la peau (13:42-44). Cette personne est pure en elle-même : seule la plaie compte.'
        },
        {
            id: 'inflammation', fr: 'Inflammation ou brûlure', he: 'שְׁחִין · מִכְוָה', ref: 'Lévitique 13:18-28', maxDay: 7, nodes: INFLAMMATION,
            lead: 'Une plaie impure sur une inflammation, une blessure ou une brûlure qui a commencé à guérir. Une seule semaine d\'isolement.'
        },
        {
            id: 'netek', fr: 'Cuir chevelu et barbe', he: 'נֶתֶק', ref: 'Lévitique 13:29-37', maxDay: 14, nodes: NETEK,
            lead: 'Le nétek est la tsaraat de la tête ou de la barbe : ici ce sont les poils, jaunes ou non, qui décident. Le cohen rase autour sans toucher au nétek.'
        },
        {
            id: 'vetement', fr: 'Vêtements', he: 'צָרַעַת הַבֶּגֶד', ref: 'Lévitique 13:47-59', maxDay: 14, nodes: VETEMENT,
            lead: 'Une tache sur la laine, le lin ou le cuir. Il n\'y a plus de personne à isoler : c\'est le vêtement qu\'on enferme, qu\'on lave, déchire ou brûle.'
        },
        {
            id: 'maison', fr: 'Maisons', he: 'צָרַעַת הַבַּיִת', ref: 'Lévitique 14:33-53', maxDay: 21, nodes: MAISON,
            lead: 'La plaie d\'une maison n\'est prévue qu\'après l\'entrée dans la Terre d\'Israël. C\'est le seul cas à trois semaines, et la maison peut être démolie.'
        }
    ];

    // Ce qui arrive aux gens et aux objets pendant que la maison est fermée (14:46-47).
    var HOUSE_RULES = [
        { t: 'Celui qui entre dans la maison pendant qu\'elle est fermée est impur jusqu\'au soir (14:46).' },
        { t: 'Celui qui y dort ou qui y mange doit laver ses vêtements (14:47).' },
        { t: 'Avant la visite du cohen, on vide la maison, pour que ce qu\'elle contient ne devienne pas impur (14:36).' }
    ];

    // --- Les couleurs : le tableau des plaies ---------------------------------------------------------------------------------------
    // Pour la peau, quatre blancs : un blanc de base et son dérivé, pour la baheret et pour la séèt. `patoukh` : ces couleurs restent impures même teintées de rouge. Les couleurs de la peau
    // viennent de la tradition (le verset dit « blanc », 13:3-4, et « blanc-rougeâtre », 13:19, 13:24) ; celles des vêtements et des maisons des versets.
    var COLORS = {
        skin: [
            { t: 'Blanc vif comme la neige', he: 'בַּהֶרֶת', derived: false },
            { t: 'Comme la chaux du Tabernacle', he: 'בַּהֶרֶת', derived: true },
            { t: 'Comme la laine blanche', he: 'שְׂאֵת', derived: false },
            { t: 'Comme la coquille d\'œuf', he: 'שְׂאֵת', derived: true }
        ],
        skinNote: 'Ces couleurs sont impures même si elles sont teintées de rouge (patoukh).',
        clothes: [
            { t: 'Vert foncé', ref: '13:49' },
            { t: 'Rouge foncé', ref: '13:49' }
        ],
        houses: [
            { t: 'Vert foncé, en taches creuses', ref: '14:37' },
            { t: 'Rouge foncé, en taches creuses', ref: '14:37' }
        ]
    };

    // --- « Et ensuite ? » : la purification du métsora (Lévitique 14:1-32) -------------------------------------------------------------
    // Les étapes dans l'ordre, du temps de la maladie au huitième jour. `day` : le jour de la purification (null avant). Chaque étape cite son verset.
    var PURIFICATION = [
        {
            id: 'camp', day: null, title: 'Pendant la maladie',
            lines: [
                'Il porte des vêtements déchirés, garde la tête découverte (cheveux libres), se couvre la moustache et crie : « Impur, impur ! » (13:45).',
                'Il habite seul, hors du camp, aussi longtemps que la plaie est sur lui (13:46).'
            ],
            ref: '13:45-46'
        },
        {
            id: 'constat', day: 0, title: 'La guérison est constatée',
            lines: [
                'Il est amené au cohen. Le cohen sort du camp et constate que la plaie est guérie (14:2-3).'
            ],
            ref: '14:2-3'
        },
        {
            id: 'oiseaux', day: 0, title: 'Les deux oiseaux',
            lines: [
                'On prend deux oiseaux vivants purs, du bois de cèdre, de l\'écarlate et de l\'hysope (14:4).',
                'Un oiseau est égorgé au-dessus d\'un vase d\'argile, sur de l\'eau vive (14:5).',
                'L\'oiseau vivant, le cèdre, l\'écarlate et l\'hysope sont trempés dans le sang mêlé à l\'eau (14:6).',
                'Le cohen en asperge sept fois celui qui se purifie, puis lâche l\'oiseau vivant dans la campagne (14:7).'
            ],
            ref: '14:4-7'
        },
        {
            id: 'rasage1', day: 0, title: 'Premier rasage et bain',
            lines: [
                'Il lave ses vêtements, se rase tout le poil et se baigne : il est pur (14:8).',
                'Il rentre dans le camp, mais reste sept jours hors de sa tente (14:8).'
            ],
            ref: '14:8'
        },
        {
            id: 'septieme', day: 7, title: 'Le septième jour',
            lines: [
                'Il se rase de nouveau tout le poil : la tête, la barbe, les sourcils (14:9).',
                'Il lave ses vêtements et baigne son corps dans l\'eau : il est pur (14:9).'
            ],
            ref: '14:9'
        },
        {
            id: 'offrandes', day: 8, title: 'Le huitième jour : les offrandes',
            lines: [
                'Il apporte deux agneaux sans défaut, une brebis d\'un an sans défaut, trois dixièmes de fleur de farine pétrie à l\'huile et un log d\'huile (14:10).',
                'Le cohen l\'amène, avec ces offrandes, à l\'entrée de la Tente d\'assignation (14:11).',
                'Le premier agneau est l\'acham (le délictif) : avec le log d\'huile, il est balancé (tenoufa) devant l\'Éternel, puis immolé (14:12-13).',
                'Le cohen met du sang de l\'acham sur le lobe de l\'oreille droite, le pouce de la main droite et l\'orteil du pied droit (14:14).',
                'Il verse de l\'huile dans sa main gauche, en fait sept aspersions, en met sur les mêmes trois endroits par-dessus le sang, et le reste sur la tête (14:15-18).',
                'Puis la \'hatat (l\'expiatoire, la brebis), puis l\'ola (l\'holocauste, le deuxième agneau) avec la min\'ha (14:19-20).'
            ],
            ref: '14:10-20'
        }
    ];

    // Le pauvre (14:21-32) : un seul agneau, des oiseaux pour le reste.
    var POOR = {
        title: 'S\'il est pauvre',
        lines: [
            'Un seul agneau pour l\'acham, un dixième de fleur de farine à l\'huile et un log d\'huile (14:21).',
            'Au lieu de la brebis et du deuxième agneau : deux tourterelles ou deux jeunes colombes, l\'une pour la \'hatat, l\'autre pour l\'ola, « selon ses moyens » (14:22, 14:30-31).',
            'Le reste (balancement, sang, huile) se fait de la même façon (14:23-29).'
        ],
        ref: '14:21-32'
    };

    // La maison se purifie par les deux oiseaux seulement (14:49-53) : pas de rasage, pas d'offrandes.
    var HOUSE_PURIFICATION = {
        title: 'Et la maison ?',
        lines: [
            'La maison déclarée pure se purifie avec deux oiseaux, du cèdre, de l\'écarlate et de l\'hysope : le même rite que celui du métsora, mais sans rasage ni offrandes (14:49-53).'
        ],
        ref: '14:49-53'
    };

    // --- Le lexique ---------------------------------------------------------------------------------------------------------------
    var GLOSSARY = [
        { he: 'צָרַעַת', fr: 'Tsaraat', text: 'Le mot de l\'atteinte entière : peau, tête, vêtement, maison. On la traduit souvent par « lèpre », mais ce n\'est pas la maladie que la médecine appelle ainsi : la tradition y voit une atteinte spirituelle, signe qui avertit (Rambam, Hilkhot Tum\'at Tsaraat 16:10).' },
        { he: 'מְצֹרָע', fr: 'Métsora', text: 'La personne atteinte, une fois la tsaraat confirmée (14:2). Le Talmud rapproche le mot de « motsi chem ra », celui qui répand une mauvaise réputation (Arakhin 15b).' },
        { he: 'נֶגַע', fr: 'Nega', text: 'La plaie, l\'atteinte (13:2). Le mot est le même pour la peau, le vêtement et la maison.' },
        { he: 'הִסְגִּיר', fr: 'Hesgér', text: 'Isoler, enfermer : pour sept jours, la personne, le vêtement ou la maison sont mis à l\'écart (13:4, 13:50, 14:38).' },
        { he: 'שְׂאֵת · סַפַּחַת · בַּהֶרֶת', fr: 'Séèt, sapa\'hat, baheret', text: 'Les trois premières manières dont la tsaraat apparaît sur la peau (13:2) : enflure, croûte et tache claire.' },
        { he: 'מִחְיָה', fr: 'Mi\'hya', text: 'Un reste de chair vive, de « chair saine », dans la plaie (13:10, 13:24) : un signe d\'impureté.' },
        { he: 'נֶתֶק', fr: 'Nétek', text: 'La plaie de la tête ou de la barbe (13:30).' },
        { he: 'צָרַעַת מַמְאֶרֶת', fr: 'Tsaraat mam\'eret', text: 'Une tsaraat « qui ronge » : celle du vêtement dont la tache s\'est étendue, ou de la maison dont la plaie est revenue (13:51, 14:44).' },
        { he: 'שְׁתִי · עֵרֶב', fr: 'Chéti et érèv', text: 'La chaîne et la trame d\'un tissu : les fils tendus sur le métier, et les fils qui les croisent. Le verset cite les deux séparément (13:48), car la tache peut n\'atteindre que l\'une.' },
        { he: 'בֹּהַק', fr: 'Bohak', text: 'Des taches d\'un blanc terne sur la peau : elles sont pures (13:38-39).' },
        { he: 'כֻּלּוֹ הָפַךְ לָבָן', fr: 'Kouloh hafakh lavan', text: 'Quand la tsaraat couvre toute la peau, de la tête aux pieds, devenue tout entière blanche, la personne est pure (13:12-13). Les détails de la tradition sont plus fins que ce rappel du verset.' }
    ];

    return {
        VERDICTS: VERDICTS, SUPPORTS: SUPPORTS, HOUSE_RULES: HOUSE_RULES, COLORS: COLORS,
        PURIFICATION: PURIFICATION, POOR: POOR, HOUSE_PURIFICATION: HOUSE_PURIFICATION, GLOSSARY: GLOSSARY
    };
}));
