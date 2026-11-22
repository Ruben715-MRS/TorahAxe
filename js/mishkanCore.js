// =========================================================================
// === LE MICHKAN ET LE MIKDASH (données et géométrie, sans DOM) ===
// =========================================================================
// Le Tabernacle (Michkan), sa cour, ses ustensiles, les vêtements des prêtres, et la suite : les Temples. Tout ce qui est chiffré vient du texte
// de la Torah (Exode 25 à 31, 35 à 40 ; Lévitique 8 et 16), vérifié sur data/tanakh (Bible du Rabbinat) ; les avis des Sages sont signalés comme
// des avis. Les mesures sont en coudées ; js/measuresCore.js les convertit en mètres selon l'avis choisi (Rav Naé, Rav Feinstein, 'Hazon Ich).
// Les emplacements du plan sont ceux de la tradition rabbinique (le plan de la cour : Zevachim 58-62 ; Yoma 37) ; ceux qui ne sont pas précisés
// par le texte sont marqués `approx` et dessinés sans cote. Les schémas sont dessinés par l'application (js/app/mishkan.js), aucune image de livre.
// Contenu écrit à la main en français seulement : **à relire par une personne compétente**. Testé dans tests/mishkanCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MishkanCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Les mesures du texte (en coudées) ----------------------------------------------------------------------------------
    var COURT = {
        length: 100, width: 50, hangingHeight: 5,          // Exode 27:9-18 (est-ouest 100, nord-sud 50 ; toiles hautes de 5)
        entrance: 20, wing: 15,                            // Exode 27:14-16 : deux ailes de 15 et une porte de 20 à l'est
        pillars: { south: 20, north: 20, west: 10, east: 10 },
        eastPillars: { wingEach: 3, gate: 4 }              // 3 + 4 + 3 piliers sur le côté est
    };
    var TABERNACLE = {
        length: 30, width: 10, height: 10,                 // 20 solives de 1 coudée et demie de large par côté ; 10 de haut
        holyOfHolies: { length: 10, width: 10 },           // Exode 26:33
        holy: { length: 20, width: 10 },
        planks: { south: 20, north: 20, west: 6, corners: 2, plankWidth: 1.5, plankHeight: 10, tenons: 2 }, // Exode 26:15-25
        sockets: { perPlank: 2, silverTalentEach: 1 },     // 96 socles d'argent ; avec les 4 de la parokhet : cent socles, cent talents (38:27)
        barsPerSide: 5,                                    // Exode 26:26-27
        curtains: { inner: { count: 10, length: 28, width: 4 }, goat: { count: 11, length: 30, width: 4 } }, // Exode 26:1-8
        parokhetPillars: 4, massakhPillars: 5              // Exode 26:32, 26:37
    };
    var ALTAR = { length: 5, width: 5, height: 3 };        // Exode 27:1
    var GOLD_ALTAR = { length: 1, width: 1, height: 2 };   // Exode 30:2
    var ARK = { length: 2.5, width: 1.5, height: 1.5 };    // Exode 25:10
    var TABLE = { length: 2, width: 1, height: 1.5 };      // Exode 25:23 (la largeur d'une coudée est donnée par le même verset)
    var MENORAH = { heightPalms: 18, branches: 6, lamps: 7, stemCups: 4, branchCups: 3 }; // Exode 25:31-37 ; hauteur : Menahot 28b
    var HOSHEN = { rows: 4, perRow: 3, spanHalfCubit: 1 };  // Exode 28:16-20 : carré plié, un empan de côté (une demi-coudée)

    // Le plan de la cour : les rectangles en coudées (x vers l'est, y vers le sud, l'origine est l'angle nord-ouest de la cour).
    // `approx` : l'emplacement n'est pas donné par le texte ; il suit la tradition, sans mesure. `view` : où l'élément est dessiné.
    var PLAN = [
        { id: 'tabernacle', x: 20, y: 20, w: 30, h: 10, view: 'court' },
        { id: 'holyOfHolies', x: 20, y: 20, w: 10, h: 10, view: 'tabernacle' },
        { id: 'holy', x: 30, y: 20, w: 20, h: 10, view: 'tabernacle' },
        { id: 'ark', x: 23.75, y: 24.25, w: 2.5, h: 1.5, view: 'tabernacle' },
        { id: 'table', x: 38, y: 21, w: 2, h: 1, view: 'tabernacle' },
        { id: 'menorah', x: 38, y: 28, w: 1.5, h: 1.5, view: 'tabernacle' },
        { id: 'goldAltar', x: 32, y: 24.5, w: 1, h: 1, view: 'tabernacle' },
        { id: 'altar', x: 62.5, y: 22.5, w: 5, h: 5, view: 'court' },
        { id: 'laver', x: 54, y: 27, w: 3, h: 3, view: 'court', approx: true },
        { id: 'ramp', x: 62.5, y: 27.5, w: 5, h: 14, view: 'court', approx: true }
    ];
    // Les tailles en coudées (longueur, largeur, hauteur) des éléments dont le texte donne la mesure : pour l'affichage en mètres.
    var SIZES = {
        court: [100, 50], entrance: [20], tabernacle: [30, 10, 10], holyOfHolies: [10, 10], holy: [20, 10],
        ark: [2.5, 1.5, 1.5], table: [2, 1, 1.5], goldAltar: [1, 1, 2], altar: [5, 5, 3], menorah: [3]
    };
    // Les douze pierres du pectoral, rangée par rangée (Exode 28:17-20) : le nom hébreu et sa transcription. L'identification des pierres est discutée.
    // La tribu de chaque pierre : le texte dit seulement « chacune selon son nom » (28:21) ; l'attribution est celle de la tradition (Midrash,
    // Bamidbar Rabba 2:7), dans l'ordre de naissance des fils de Jacob (Lévi compris, Joseph pour une seule tribu). Noms français comme dans la généalogie.
    var HOSHEN_STONES = [
        [{ he: 'אדם', fr: 'Odem', color: '#E0115F', hint: 'rouge rubis', tribe: { fr: 'Ruben', he: 'ראובן' } },
            { he: 'פטדה', fr: 'Pitda', color: '#E4D00A', hint: 'jaune topaze', tribe: { fr: 'Siméon', he: 'שמעון' } },
            { he: 'ברקת', fr: 'Bareket', color: '#50C878', hint: 'vert émeraude', tribe: { fr: 'Lévi', he: 'לוי' } }],
        [{ he: 'נפך', fr: 'Nofekh', color: '#40E0D0', hint: 'turquoise', tribe: { fr: 'Juda', he: 'יהודה' } },
            { he: 'ספיר', fr: 'Sappir', color: '#0F52BA', hint: 'bleu saphir', tribe: { fr: 'Issakhar', he: 'יששכר' } },
            { he: 'יהלם', fr: 'Yahalom', color: '#F8F8FF', hint: 'cristal', tribe: { fr: 'Zabulon', he: 'זבולון' } }],
        [{ he: 'לשם', fr: 'Léchem', color: '#E25822', hint: 'orangé', tribe: { fr: 'Dan', he: 'דן' } },
            { he: 'שבו', fr: 'Chevo', color: '#A9A9A9', hint: 'gris, agate', tribe: { fr: 'Naphtali', he: 'נפתלי' } },
            { he: 'אחלמה', fr: "A'hlama", color: '#9966CC', hint: 'violet améthyste', tribe: { fr: 'Gad', he: 'גד' } }],
        [{ he: 'תרשיש', fr: 'Tarchich', color: '#B5EAAA', hint: 'vert clair', tribe: { fr: 'Acher', he: 'אשר' } },
            { he: 'שהם', fr: 'Choham', color: '#353839', hint: 'onyx sombre', tribe: { fr: 'Joseph', he: 'יוסף' } },
            { he: 'ישפה', fr: 'Yachpé', color: '#D2691E', hint: 'jaspe brun-rouge', tribe: { fr: 'Benjamin', he: 'בנימין' } }]
    ];
    // Le sens de lecture : comme l'hébreu, de droite à gauche. Les pierres sont rangées dans l'ordre de lecture (la première est Odem) ; à l'écran,
    // la première pierre de chaque rangée est à droite. `displayColumn` donne la colonne d'affichage (0 = gauche) d'une pierre (0 = première).
    function displayColumn(index) { return HOSHEN.perRow - 1 - index; }
    // Les couleurs sont des approximations (teintes les plus souvent associées à chaque nom) : les vraies pierres ont des nuances et des inclusions,
    // et l'identification de chaque nom est discutée. Chaque pierre a sa propre couleur.
    // Noir ou blanc, selon ce qui se lit le mieux sur une couleur (luminance relative, WCAG).
    function readableOn(hex) {
        var n = parseInt(hex.slice(1), 16);
        var chan = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        var lum = 0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255);
        return lum > 0.4 ? '#111111' : '#ffffff';
    }
    // Les rideaux à l'intérieur du Tabernacle : la parokhet à 20 coudées de l'entrée, le rideau d'entrée à l'extrémité est.
    var CURTAINS = [
        { id: 'parokhet', x: 30, pillars: 4 },
        { id: 'massakh', x: 50, pillars: 5 }
    ];

    // --- Les éléments : nom hébreu, source, description --------------------------------------------------------------------
    // `plan` : numéro affiché sur le plan. Ordre : l'ordre de la Torah (Exode 25 : de l'arche vers le dehors).
    var ITEMS = {
        court: { he: 'חצר', fr: 'La cour (parvis)', ref: 'Exode 27:9-19 ; 38:9-20',
            dims: '100 × 50 coudées, toiles hautes de 5 coudées',
            text: "Un enclos rectangulaire de toiles de lin retors, tendues entre des piliers sur des socles de cuivre, avec des crochets et des tringles d'argent. Le texte compte 20 piliers au sud, 20 au nord, 10 à l'ouest et 10 à l'est. C'est là que se fait le service du peuple et des prêtres : sacrifices, ablutions." },
        entrance: { he: 'שער החצר', fr: "La porte de la cour", ref: 'Exode 27:14-16',
            dims: '20 coudées, entre deux ailes de 15',
            text: "À l'est, face au soleil levant : un rideau de 20 coudées (bleu, pourpre, écarlate et lin retors, brodé) sur quatre piliers, et de chaque côté une aile de toiles de 15 coudées sur trois piliers : 15 + 20 + 15 = 50." },
        tabernacle: { he: 'משכן', fr: 'Le Tabernacle (Michkan)', ref: 'Exode 26',
            dims: '30 × 10 coudées, 10 de haut',
            text: "La tente de la présence : une ossature de 48 planches recouvertes de quatre couches de tentures. Elle se divise en deux : le Saint (20 × 10) et le Saint des saints (10 × 10), séparés par la parokhet. Moïse l'érige le 1er Nissan de la deuxième année (Exode 40:2, 17)." },
        holyOfHolies: { he: 'קדש הקדשים', fr: 'Le Saint des saints', ref: 'Exode 26:33-34',
            dims: '10 × 10 coudées',
            text: "La pièce du fond, à l'ouest, derrière la parokhet : elle ne contient que l'arche. Seul le grand prêtre y entre, une fois par an, à Yom Kippour (Lévitique 16)." },
        holy: { he: 'הקדש', fr: 'Le Saint', ref: 'Exode 26:33-35',
            dims: '20 × 10 coudées',
            text: "La pièce d'entrée : la table au nord, la ménorah au sud, l'autel d'or devant la parokhet. Les prêtres y entrent chaque jour pour allumer les lampes, offrir l'encens et renouveler le pain." },
        ark: { he: 'ארון', fr: "L'arche de l'alliance", ref: 'Exode 25:10-22 ; 37:1-9',
            dims: '2,5 × 1,5 × 1,5 coudées',
            text: "Un coffre de bois d'acacia (chittim) plaqué d'or dedans et dehors, avec une couronne d'or. Quatre anneaux d'or et deux barres de bois plaquées d'or, qui n'en sortent jamais (25:15). Elle contient les Tables de l'alliance (25:16). Son couvercle (kapporet) est d'or pur, surmonté de deux kerouvim d'or battu, ailes déployées, face à face. C'est la première pièce que Betsalel fabrique (37:1).",
            facts: ['Couvercle (kapporet) : 2,5 × 1,5 coudées, or pur', 'Deux kerouvim, d\'une seule pièce avec le couvercle (25:18-19)', 'Quatre anneaux et deux barres : « elles ne s\'en écarteront pas »'] },
        table: { he: 'שלחן', fr: 'La table', ref: 'Exode 25:23-30 ; Lévitique 24:5-9',
            dims: '2 × 1 × 1,5 coudées',
            text: "Table de bois d'acacia plaquée d'or, avec une couronne d'or et un encadrement d'une palme tout autour. Elle porte le pain de proposition (lehem hapanim) : douze gâteaux en deux rangées de six, renouvelés chaque chabbat. Elle se tient au nord du Saint (26:35).",
            facts: ['Ses ustensiles : plats, cuillères, tubes-supports et piliers (25:29)', 'Le pain : 12 gâteaux, deux rangées de six (Lévitique 24:5-6)', 'Au nord du Saint, en dehors de la parokhet'] },
        menorah: { he: 'מנורה', fr: 'La ménorah', ref: 'Exode 25:31-40 ; 37:17-24',
            dims: '18 palmes de haut (3 coudées)',
            text: "Un candélabre d'or pur battu d'une seule pièce, d'un talent d'or (kikkar). Une tige centrale et six branches, trois de chaque côté, soit sept lampes, tournées vers l'avant (Nombres 8:2). Chaque branche porte trois coupes en forme d'amande, avec pommeau et fleur ; la tige en porte quatre. Elle se tient au sud du Saint (26:35). Les Sages précisent que sa hauteur était de 18 palmes.",
            facts: ['6 branches + la tige : 7 lampes', 'Coupes : 3 par branche, 4 sur la tige', 'Un talent d\'or pur, d\'un seul bloc', 'Le dessin des branches (arrondies ou droites) est discuté'] },
        goldAltar: { he: 'מזבח הקטרת', fr: "L'autel d'or (de l'encens)", ref: 'Exode 30:1-10 ; 37:25-28',
            dims: '1 × 1 × 2 coudées',
            text: "Petit autel carré de bois d'acacia plaqué d'or, avec des cornes d'une pièce, une bordure d'or, des anneaux et des barres. On y brûle l'encens (ketoret) chaque matin et chaque soir, en préparant les lampes. Il se tient devant la parokhet (30:6). Une fois par an, à Yom Kippour, on y met du sang (30:10).",
            facts: ['Aucun sacrifice d\'animal ni d\'offrande de farine dessus (30:9)', 'Encens : matin et soir (30:7-8)', 'Voir l\'onglet « Kétoret » pour la composition de l\'encens'] },
        altar: { he: 'מזבח העולה', fr: "L'autel de cuivre (des holocaustes)", ref: 'Exode 27:1-8 ; 38:1-7',
            dims: '5 × 5 × 3 coudées',
            text: "L'autel du plein air, devant l'entrée du Tabernacle : un coffre creux de planches d'acacia (27:8) plaqué de cuivre, carré, avec des cornes aux quatre angles faites d'une pièce avec lui (27:2). À mi-hauteur : un contour (karkov) et une grille de cuivre en réseau (mikhbar) ; quatre anneaux et deux barres. On y offre les sacrifices (korbanot). Pas de marches : « tu ne monteras pas par des degrés à mon autel » (Exode 20:23), donc une rampe.",
            facts: ['Ses ustensiles : pots (cendres), pelles, vases (sang), fourches, encensoirs (27:3)', 'Le feu y brûle sans cesse (Lévitique 6:5-6)', 'Voir « Offrandes et sacrifices »'] },
        laver: { he: 'כיור', fr: 'La cuve', ref: 'Exode 30:17-21 ; 38:8',
            dims: 'Mesures non données par le texte',
            text: "Une cuve de cuivre sur un support de cuivre, faite des miroirs des femmes qui servaient à l'entrée de la Tente d'assignation (38:8). Elle se trouve entre la Tente et l'autel, remplie d'eau : Aaron et ses fils s'y lavent les mains et les pieds avant d'entrer ou d'approcher de l'autel, « afin de ne pas mourir » (30:20). Les Sages la placent un peu au sud de l'axe." },
        ramp: { he: 'כבש', fr: "La rampe", ref: 'Exode 20:23 ; Zevachim 62a',
            dims: 'Mesures non données par le texte',
            text: "Le texte interdit les marches vers l'autel (Exode 20:23), pour ne pas découvrir la nudité des prêtres. Les Sages en déduisent une rampe de terre ou de pierre, placée du côté sud de l'autel (Zevachim 62a)." },
        parokhet: { he: 'פרכת', fr: 'La parokhet (le rideau du Saint des saints)', ref: 'Exode 26:31-33',
            dims: '4 piliers plaqués d\'or sur 4 socles d\'argent',
            text: "Un rideau de bleu, de pourpre, d'écarlate et de lin retors, tissé avec des kerouvim, suspendu à quatre piliers d'acacia plaqués d'or, à crochets d'or, sur quatre socles d'argent (26:31-32). Il sépare le Saint du Saint des saints." },
        massakh: { he: 'מסך', fr: "Le rideau d'entrée (massakh)", ref: 'Exode 26:36-37',
            dims: '5 piliers plaqués d\'or sur 5 socles de cuivre',
            text: "À l'entrée de la Tente : un rideau de bleu, pourpre, écarlate et lin retors, brodé, suspendu à cinq piliers d'acacia plaqués d'or, à crochets d'or, sur cinq socles de cuivre." }
    };

    // L'ordre des fiches de l'onglet « Ustensiles » : de l'intérieur vers l'extérieur.
    var UTENSIL_ORDER = ['ark', 'table', 'menorah', 'goldAltar', 'altar', 'laver'];

    // --- La structure -------------------------------------------------------------------------------------------------------
    var STRUCTURE = {
        planks: { he: 'קרשים', fr: 'Les planches', ref: 'Exode 26:15-25',
            text: "Des planches d'acacia de 10 coudées de haut sur 1 coudée et demie de large, chacune avec deux tenons (yadot) enfoncés dans deux socles d'argent. Il y en a 20 au sud, 20 au nord et 6 à l'ouest, plus 2 pour les angles : 48 planches et 96 socles. Les 6 planches de l'ouest font 9 coudées ; les planches d'angle complètent à 10 (Rachi sur 26:23).",
            facts: ['20 + 20 + 6 + 2 = 48 planches', '48 × 2 = 96 socles d\'argent', 'Avec les 4 socles de la parokhet : 100 socles, un talent d\'argent chacun (38:27)', 'Les tenons sont écartés d\'une demi-coudée selon Rachi (Chabbat 95b)'] },
        bars: { he: 'בריחים', fr: 'Les barres', ref: 'Exode 26:26-29',
            text: "Cinq barres de bois d'acacia sur chaque côté (nord, sud, ouest), passées dans des anneaux d'or ; les planches et les barres sont plaquées d'or. La barre du milieu court d'un bout à l'autre (26:28)." },
        inner: { he: 'יריעות', fr: 'Les tentures de lin (le Tabernacle)', ref: 'Exode 26:1-6',
            text: "Dix tentures de lin retors, de bleu, de pourpre et d'écarlate, artistement damassées de kerouvim : 28 × 4 coudées chacune. Cousues par cinq, en deux ensembles, puis réunies par 50 boucles de bleu et 50 agrafes d'or. Elles forment la couche la plus intérieure, visible du dedans." },
        goat: { he: 'אהל', fr: 'Les tentures de poil de chèvre (la tente)', ref: 'Exode 26:7-13',
            text: "Onze tentures de poil de chèvre, de 30 × 4 coudées : par cinq et par six, réunies par 50 agrafes de cuivre. La sixième est repliée sur le devant de la Tente (26:9). L'excédent pend à l'arrière, et une coudée de chaque côté descend sur les parois (26:12-13)." },
        rams: { he: 'מכסה', fr: 'La couverture : peaux de béliers rouges et de tahach', ref: 'Exode 26:14',
            text: "Des peaux de béliers teintes en rouge, et par-dessus une couverture de peaux de tahach. Les Sages se partagent : pour Rabbi Né'hémia, deux couvertures superposées ; pour Rabbi Yehouda, une seule, moitié peaux de béliers rouges et moitié peaux de tahach." },
        courtHangings: { he: 'קלעים', fr: 'Les toiles de la cour', ref: 'Exode 27:9-19',
            text: "Des toiles de lin retors hautes de 5 coudées, accrochées à des crochets d'argent fixés aux piliers et reliées par des tringles d'argent ; les socles sont de cuivre (27:10, 17)." }
    };
    var STRUCTURE_ORDER = ['planks', 'bars', 'inner', 'goat', 'rams', 'courtHangings'];

    // Les couches de toiture, de la plus intérieure à la plus extérieure : pour le schéma de l'onglet Structure.
    var LAYERS = [
        { id: 'inner', color: 'linen' },
        { id: 'goat', color: 'goat' },
        { id: 'rams', color: 'rams' },
        { id: 'tachash', color: 'tachash' }
    ];

    // --- Les vêtements des prêtres (Exode 28 ; 39) ---------------------------------------------------------------------------
    // `who` : 'all' (les quatre de tous les prêtres) ou 'high' (les quatre de plus du grand prêtre). Le turban du grand prêtre porte un autre nom
    // (`highHe`, `highFr`). `hidden` : porté sous les autres vêtements.
    var GARMENTS = [
        { id: 'ketonet', who: 'all', he: 'כתנת', fr: 'La tunique', ref: 'Exode 28:39-40 ; 39:27', material: 'lin',
            text: "Une tunique de lin, tissée en mailles (ketonet tashbets). Elle se porte sous les autres vêtements ; elle est de lin chez tous les prêtres.", hidden: false },
        { id: 'avnet', who: 'all', he: 'אבנט', fr: 'La ceinture', ref: 'Exode 28:39-40 ; 39:29', material: 'bleu, pourpre, écarlate et lin retors',
            text: "Une longue ceinture brodée, de bleu, de pourpre, d'écarlate et de lin retors, nouée à la taille sur la tunique.", hidden: false },
        { id: 'migbaat', who: 'all', he: 'מגבעת', highHe: 'מצנפת', highFr: 'Le turban du grand prêtre (mitsnefet)', fr: 'Le turban', ref: 'Exode 28:40 ; 39:28', material: 'lin',
            text: "Le prêtre ordinaire porte un turban de lin (migba'at), « signe d'honneur et de dignité ». Celui du grand prêtre s'appelle mitsnefet (28:4, 39) : même rôle, autre nom. C'est sur lui que se fixe la plaque d'or.", hidden: false },
        { id: 'michnasayim', who: 'all', he: 'מכנסים', fr: 'Le caleçon', ref: 'Exode 28:42 ; 39:28', material: 'lin',
            text: "Un caleçon de lin « pour couvrir la nudité de la chair, depuis les reins jusqu'aux cuisses ». Il est porté sous la tunique et jamais vu.", hidden: true },
        { id: 'hoshen', who: 'high', he: 'חשן', fr: "Le pectoral ('hochen)", ref: 'Exode 28:15-30 ; 39:8-21', material: 'or, bleu, pourpre, écarlate et lin retors',
            text: "Le « pectoral de jugement » : une pièce carrée, pliée en deux, d'un empan de côté (une demi-coudée), portant douze pierres en quatre rangées de trois, chacune gravée du nom d'une tribu (28:16-21). On y joint les ourim et les toummim (28:30). Il se suspend aux épaulettes par des chaînettes d'or et des anneaux.", hidden: false },
        { id: 'efod', who: 'high', he: 'אפוד', fr: "L'éphod", ref: 'Exode 28:6-14 ; 39:2-7', material: 'or, bleu, pourpre, écarlate et lin retors',
            text: "Un vêtement brodé, retenu par deux épaulettes. Sur chacune, une pierre de choham porte six noms de tribus, selon l'ordre de leur naissance (28:9-12). Il est serré par une ceinture tissée dans la même étoffe, le 'hechev (28:8).", hidden: false },
        { id: 'meil', who: 'high', he: 'מעיל', fr: 'La robe', ref: 'Exode 28:31-35 ; 39:22-26', material: 'bleu (techelet) uniquement',
            text: "Une robe entièrement bleue, portée sous l'éphod. À son bord inférieur : une clochette d'or, puis une grenade de bleu, de pourpre et d'écarlate, en alternance, tout autour (28:33-34). Le son des clochettes s'entend quand il entre dans le sanctuaire et quand il en sort, « et qu'il ne meure point » (28:35).", hidden: false },
        { id: 'tsits', who: 'high', he: 'ציץ', fr: 'La plaque frontale (tsits)', ref: 'Exode 28:36-38 ; 39:30-31', material: 'or pur',
            text: "Une plaque d'or pur gravée « Consacré à l'Éternel » (Kodesh LaHashem), fixée par un ruban de bleu à l'avant du turban, sur le front d'Aaron (28:36-38).", hidden: false }
    ];
    // Les quatre vêtements de lin blanc de Yom Kippour (Lévitique 16:4) : la tunique, le caleçon, la ceinture, le turban, tous en lin blanc.
    var YOM_KIPPUR_GARMENTS = ['ketonet', 'michnasayim', 'avnet', 'migbaat'];

    // --- Les Temples ------------------------------------------------------------------------------------------------------
    // Colonnes du tableau comparatif ; les lignes sont dans TEMPLE_ROWS (une valeur par colonne).
    var TEMPLE_COLUMNS = ['mishkan', 'first', 'second', 'herod'];
    var TEMPLE_ROWS = [
        { id: 'builder',
            mishkan: "Betsalel et Oholiav, sur l'ordre de Moïse (Exode 31:1-6 ; 35:30-35)",
            first: "Salomon, avec des artisans de Tyr (1 Rois 5-7)",
            second: "Zorobabel et le grand prêtre Josué, après l'édit de Cyrus (Esdras 1:1-4 ; 3:2, 8)",
            herod: "Hérode le Grand, qui agrandit le mont du Temple et reconstruit le sanctuaire (d'après Flavius Josèphe)" },
        { id: 'when',
            mishkan: "Érigé le 1er Nissan de la deuxième année après la sortie d'Égypte (Exode 40:17)",
            first: "Commencé la 4e année de Salomon, au mois de ziv ; fini la 11e année, au mois de boul : sept ans (1 Rois 6:1, 37-38)",
            second: "Achevé le 3 Adar, la 6e année de Darius (Esdras 6:15), vers 516 av. J.-C.",
            herod: "Travaux à partir de vers 20 av. J.-C." },
        { id: 'size',
            mishkan: "Tabernacle de 30 × 10 × 10 coudées, dans une cour de 100 × 50",
            first: "60 × 20 × 30 coudées (1 Rois 6:2) ; portique de 20 × 10 ; Saint des saints de 20 × 20 × 20 (6:3, 20)",
            second: "L'édit de Cyrus prévoyait 60 coudées de haut et 60 de large (Esdras 6:3)",
            herod: "Mont du Temple de 500 × 500 coudées (Michna, Middot 2:1) ; parvis des prêtres et d'Israël de 187 × 135 coudées (Middot 5:1)" },
        { id: 'inside',
            mishkan: "L'arche, la table, la ménorah, l'autel d'or ; dans la cour, l'autel de cuivre et la cuve",
            first: "L'arche ; dix ménorot et dix cuves ; la Mer de bronze (10 coudées de diamètre) ; les colonnes de cuivre Yakhin et Boaz (1 Rois 7:15-39, 49)",
            second: "Pas d'arche : « cinq choses manquaient » (Yoma 21b). Dans le Saint des saints, la pierre dite even chetiya (Yoma 53b)",
            herod: "Le même service que le second Temple, dans un édifice agrandi et orné" },
        { id: 'duration',
            mishkan: "Dans le désert, puis à Guilgal, Silo, Nov et Gabaon, jusqu'au Temple de Salomon (1 Rois 8:4)",
            first: "410 ans selon les Sages (Yoma 9a)",
            second: "420 ans selon les Sages (Yoma 9a)",
            herod: "Fait partie du second Temple : de la rénovation de vers 20 av. J.-C. à l'an 70" },
        { id: 'end',
            mishkan: "Remplacé par le Temple : l'arche et la Tente sont transportées (1 Rois 8:4)",
            first: "Détruit par Nabuchodonosor, le 9 Av selon la tradition (2 Rois 25:8-9 ; Michna Taanit 4:6), en 586 av. J.-C. selon les historiens",
            second: "Détruit par les Romains le 9 Av de l'an 70 (Michna Taanit 4:6)",
            herod: "Détruit en l'an 70 : il en reste le mur de soutènement, dit mur Occidental" }
    ];
    var TEMPLE_QUOTE = { text: "Qui n'a pas vu l'édifice d'Hérode n'a jamais vu de belle construction.", ref: 'Soucca 51b ; Baba Batra 4a' };
    // Le lien avec l'année : trois fêtes de pèlerinage et deux jeûnes (Deutéronome 16:16 ; voir le calendrier hébraïque).
    var TEMPLE_CALENDAR = ['pessah', 'chavouot', 'souccot', 'tamouz17', 'tichabav'];

    // --- Les vêtements vus de près -------------------------------------------------------------------------------------------
    // Les vêtements dont on peut afficher un détail agrandi quand on les choisit (le pectoral, la plaque d'or, la robe, l'éphod, la tunique).
    var ZOOM_GARMENTS = ['hoshen', 'tsits', 'meil', 'efod', 'ketonet'];
    // La plaque d'or (Exode 28:36) : le texte écrit « קדש ליהוה » (sans vav : « Consacré à l'Éternel ») ; le Rambam la décrit en deux lignes, le Nom en haut et
    // « קדש ל » en dessous (Klei HaMikdash 9:1) ; les Sages la veulent large de deux doigts et posée sur le front, d'une oreille à l'autre (Chabbat 63b).
    var TSITS = { torah: 'קדש ליהוה', lines: ['יהוה', 'קדש ל'], fingers: 2,
        // Les deux dispositions du Talmud (Soucca 5a ; Chabbat 63b) : sur deux lignes, le Nom en haut (les Sages, le Rambam), ou sur une seule ligne
        // (le témoignage de Rabbi Éliézer fils de Rabbi Yossi, qui l'a vu à Rome).
        views: ['two', 'one'], oneLine: ['קדש ליהוה'],
        texts: {
            intro: "L'ordre et la disposition des mots « קדש ליהוה » (Kodesh La-Hashem, « Consacré à l'Éternel ») font l'objet d'une discussion célèbre du Talmud (Soucca 5a ; voir aussi Chabbat 63b). Les mots se lisent toujours dans le même sens, « Kodesh » puis « La-Hashem » : c'est leur disposition graphique sur la lame d'or qui varie, selon deux traditions.",
            two: { title: "Sur deux lignes (l'avis des Sages, retenu par le Rambam)", text: "L'inscription était gravée en relief sur deux lignes : en haut le Nom divin (יהוה), en bas les mots « קדש ל ». Le Talmud explique qu'il ne convenait pas que le mot Kodesh (« saint ») soit placé au-dessus du Nom : le Nom devait être tout en haut, comme un roi sur son trône. Selon certains commentateurs (le Raavad, Rabbi Yossef Bekhor Shor), pour que la lecture reste naturelle, « קדש ל » était à droite sur la ligne du bas et le Nom décalé vers la gauche sur la ligne du haut." },
            one: { title: 'Sur une seule ligne (le témoignage de Rome)', text: "Dans le même passage, Rabbi Éliézer fils de Rabbi Yossi rapporte un témoignage direct : à Rome, où étaient conservés des objets saints emportés après la destruction du Second Temple, il a vu le véritable tsits, sur lequel « קדש ליהוה » était gravé sur une seule ligne, de droite à gauche." },
            halakha: "Synthèse : l'idéal, selon le Rambam, est de le faire sur deux lignes, avec le Nom en haut ; en pratique, les deux dispositions sont valables, et il arrivait qu'on le grave sur une seule ligne à l'époque du Temple."
        } };
    // Les deux pierres de choham des épaulettes de l'éphod : six noms sur chacune, dans l'ordre de naissance (Exode 28:9-12 ; Rachi ; Sotah 36a).
    var EFOD_STONES = [
        ['ראובן', 'שמעון', 'לוי', 'יהודה', 'דן', 'נפתלי'],
        ['גד', 'אשר', 'יששכר', 'זבולון', 'יוסף', 'בנימין']
    ];
    // Le bord de la robe : une clochette d'or, puis une grenade, en alternance (Exode 28:33-34).
    var ROBE_HEM = ['bell', 'pomegranate'];

    // --- Le camp d'Israël (Nombres 1 à 4 ; 26) ----------------------------------------------------------------------------------
    // Les douze tribus autour du Tabernacle, trois par côté, avec leur recensement (Nombres 1, puis 26) et leur bannière selon le Midrash
    // (Bamidbar Rabba 2:7 : la couleur et le signe de chaque drapeau). `pos` : la place dans le bras du camp (0 = au nord ou à l'ouest du bras).
    var TRIBES = [
        { id: 'juda', fr: 'Juda', he: 'יהודה', side: 'east', pos: 0, nb1: 74600, nb26: 76500, color: '#5DADE2', colorFr: 'bleu ciel', sign: 'le lion' },
        { id: 'issakhar', fr: 'Issakhar', he: 'יששכר', side: 'east', pos: 1, nb1: 54400, nb26: 64300, color: '#1B2A5C', colorFr: 'bleu nuit', sign: 'le soleil et la lune' },
        { id: 'zabulon', fr: 'Zabulon', he: 'זבולון', side: 'east', pos: 2, nb1: 57400, nb26: 60500, color: '#F1F1F1', colorFr: 'blanc', sign: 'le navire' },
        { id: 'gad', fr: 'Gad', he: 'גד', side: 'south', pos: 0, nb1: 45650, nb26: 40500, color: '#808080', colorFr: 'gris', sign: 'le bataillon' },
        { id: 'simeon', fr: 'Siméon', he: 'שמעון', side: 'south', pos: 1, nb1: 59300, nb26: 22200, color: '#2E7D4F', colorFr: 'vert', sign: 'Chékhem' },
        { id: 'ruben', fr: 'Ruben', he: 'ראובן', side: 'south', pos: 2, nb1: 46500, nb26: 43730, color: '#C0392B', colorFr: 'rouge', sign: 'les doudaïm (mandragores)' },
        { id: 'ephraim', fr: 'Éphraïm', he: 'אפרים', side: 'west', pos: 0, nb1: 40500, nb26: 32500, color: '#1C1C1C', colorFr: 'noir comme le jais', sign: 'le taureau' },
        { id: 'manasse', fr: 'Manassé', he: 'מנשה', side: 'west', pos: 1, nb1: 32200, nb26: 52700, color: '#2E2E2E', colorFr: 'noir comme le jais', sign: 'le réem' },
        { id: 'benjamin', fr: 'Benjamin', he: 'בנימין', side: 'west', pos: 2, nb1: 35400, nb26: 45600, color: '#9B7E64', colorFr: 'mélange de couleurs', sign: 'le loup' },
        { id: 'naphtali', fr: 'Naphtali', he: 'נפתלי', side: 'north', pos: 0, nb1: 53400, nb26: 45400, color: '#E8A0A8', colorFr: 'rouge pâle', sign: 'la gazelle' },
        { id: 'acher', fr: 'Acher', he: 'אשר', side: 'north', pos: 1, nb1: 41500, nb26: 53400, color: '#D8B64A', colorFr: 'pierre précieuse', sign: "l'olivier" },
        { id: 'dan', fr: 'Dan', he: 'דן', side: 'north', pos: 2, nb1: 62700, nb26: 64400, color: '#2D4B9A', colorFr: 'bleu saphir', sign: 'le serpent' }
    ];
    // Les quatre camps : la tribu qui porte la bannière (Nombres 2:3, 10, 18, 25).
    var CAMP_SIDES = {
        east: { head: 'juda', ref: 'Nombres 2:3-9' }, south: { head: 'ruben', ref: 'Nombres 2:10-16' },
        west: { head: 'ephraim', ref: 'Nombres 2:18-24' }, north: { head: 'dan', ref: 'Nombres 2:25-31' }
    };
    // Les Lévites campent entre le Tabernacle et les tribus (Nombres 2:17 ; 3:21-39 ; 4:34-49). `month` : les mâles d'un mois et plus ; `work` : de trente à
    // cinquante ans. Moïse, Aaron et ses fils campent à l'est, devant l'entrée (3:38).
    var LEVITES = [
        { id: 'merari', fr: 'Mérari', he: 'מררי', side: 'north', month: 6200, work: 3200, ref: 'Nombres 3:33-37 ; 4:42-45', duty: 'les planches, les barres, les piliers et les socles du Tabernacle, et les piliers de la cour' },
        { id: 'guerchon', fr: 'Guerchon', he: 'גרשון', side: 'west', month: 7500, work: 2630, ref: 'Nombres 3:21-26 ; 4:38-41', duty: 'le Tabernacle et sa tente, les couvertures, les rideaux, et les toiles de la cour' },
        { id: 'kehat', fr: 'Kéhat', he: 'קהת', side: 'south', month: 8600, work: 2750, ref: 'Nombres 3:27-32 ; 4:34-37', duty: "l'arche, la table, la ménorah, les autels et les ustensiles" },
        { id: 'moise', fr: 'Moïse, Aaron et ses fils', he: 'משה ואהרן ובניו', side: 'east', ref: 'Nombres 3:38', duty: 'la garde du sanctuaire' }
    ];
    var LEVITES_TOTAL_TEXT = 22000;   // Nombres 3:39 ; les trois familles font 22 300 : les Sages écartent 300 premiers-nés lévites (Rachi sur 3:39)

    function tribe(id) { for (var i = 0; i < TRIBES.length; i++) if (TRIBES[i].id === id) return TRIBES[i]; return null; }
    function tribesOf(side) { return TRIBES.filter(function (t) { return t.side === side; }).sort(function (a, b) { return a.pos - b.pos; }); }
    function sum(list, key) { return list.reduce(function (n, x) { return n + x[key]; }, 0); }
    // Le total d'un camp, dans l'un des deux recensements (`key` : 'nb1' ou 'nb26').
    function campTotal(side, key) { return sum(tribesOf(side), key); }

    // --- Les lieux, du plus large au plus saint (Michna, Kélim 1:6-9) -------------------------------------------------------------
    var HOLINESS = [
        { id: 'israel', he: 'ארץ ישראל', fr: "La terre d'Israël", text: "Le Omer, les prémices et les deux pains de Chavouot ne s'offrent qu'à partir de ses récoltes." },
        { id: 'walled', he: 'ערים מוקפות חומה', fr: 'Les villes fortifiées depuis Josué', text: "On en écarte le métsora, et on n'y fait pas entrer un mort." },
        { id: 'jerusalem', he: 'ירושלים', fr: "L'intérieur des murailles de Jérusalem", text: "On y mange les kodachim kalim (sacrifices de moindre sainteté) et le maasser chéni." },
        { id: 'mount', he: 'הר הבית', fr: 'Le mont du Temple', text: "Celui qui a un écoulement (zav), la femme nidda ou l'accouchée n'y pénètrent pas." },
        { id: 'hel', he: 'חיל', fr: "Le 'hel", text: "Le non-juif et celui qui s'est rendu impur au contact d'un mort n'y entrent pas." },
        { id: 'women', he: 'עזרת נשים', fr: 'Le parvis des femmes', text: "Le tevoul yom n'y pénètre pas. La personne impure qui y est entrée n'est pas tenue d'apporter un sacrifice." },
        { id: 'israelites', he: 'עזרת ישראל', fr: "Le parvis d'Israël", text: "Le mé'houssar kippourim n'y entre pas. La personne impure qui y est entrée doit apporter un sacrifice." },
        { id: 'priests', he: 'עזרת כהנים', fr: 'Le parvis des Cohanim', text: "Le simple juif n'y pénètre que pour les besoins de son offrande (semikha, abattage et balancement)." },
        { id: 'between', he: 'בין האולם ולמזבח', fr: "Entre l'entrée du Tabernacle et l'autel", text: "Un cohen qui porte un défaut ou qui laisse pousser ses cheveux n'y entre pas." },
        { id: 'sanctuary', he: 'היכל', fr: 'Le Tabernacle (Saint) et son entrée', text: "Un cohen n'y entre qu'après l'ablution de ses mains et de ses pieds." },
        { id: 'holies', he: 'קדש הקדשים', fr: 'Le Saint des saints', text: "Seul le grand prêtre y pénètre, le jour de Yom Kippour, au cours du service." }
    ];

    // Le plan du Temple vu du dessus (est à droite), redessiné d'après le tableau « Degrés de sainteté » de l'Appendice A (Mesorah, 2018). Pas à l'échelle :
    // il suit les proportions de ce tableau. Repère : 240 × 104, origine en (0, -6). `holiness` : le degré (voir HOLINESS) que la zone illustre.
    var TEMPLE_PLAN = {
        viewBox: [0, -6, 240, 104],
        mount: { x: 0, y: -6, w: 240, h: 104 },
        wall: { x: 4, y: 4, w: 200, h: 88.3 },
        zones: [
            { id: 'women', x: 120.4, y: 4, w: 83.7, h: 88.3, badge: [162, 48] },
            { id: 'israelites', x: 110.5, y: 4, w: 9.9, h: 88.3, badge: [115.5, 22] },
            { id: 'priests', x: 88, y: 4, w: 22.5, h: 88.3, badge: [99, 14] },
            { id: 'between', x: 74.1, y: 4, w: 13.9, h: 88.3, badge: [81, 50] },
            { id: 'sanctuary', part: 'ulam', x: 61.2, y: 19.6, w: 13, h: 58.9, badge: [67.7, 50] },
            { id: 'sanctuary', part: 'heikhal', x: 36, y: 29.1, w: 25.1, h: 45.9, badge: [48.5, 52] },
            { id: 'holies', x: 13.5, y: 29.1, w: 22.5, h: 45.9, badge: [24.7, 52] }
        ],
        // Les degrés 1 à 3 (le pays, les villes fortifiées, Jérusalem) entourent le Temple : ils n'ont pas de zone sur ce plan.
        hel: { x: 204.6, y: -4.7, w: 3.5, h: 96.1, badge: [216, 70] },
        mountBadge: [226, 44],
        altar: { x: 90.3, y: 48.2, w: 16.5, h: 16.5 }, ramp: { x: 91.5, y: 65.1, w: 11.3, h: 20.3 },
        chambers: [[121.8, 6.6, 24.2, 18.2], [178.9, 6.6, 23.4, 18.2], [121.8, 62.9, 24.2, 27.7], [178.9, 62.9, 23.4, 27.7]],
        towers: [[55.4, -2.1, 18.7, 19.1], [109.7, -4.7, 9.9, 10.4]],
        gate: { x: 201.8, y: 43, w: 2.3, h: 6.1 }, room: { x: 208.4, y: 27.4, w: 7.8, h: 7.8 }
    };

    // --- Les recensements par camp (Nombres 1-2 ; 26) ------------------------------------------------------------------------------
    var CAMP_ORDER = ['east', 'south', 'west', 'north'];   // l'ordre de Nombres 2 : Juda, Ruben, Éphraïm, Dan
    var LEVI_CENSUS = { nb1: 22300, nb26: 23000 };          // les mâles d'un mois et plus : somme des trois familles (3:39 en donne 22 000), puis 26:62
    var FIRSTBORN = { israel: 22273, levites: 22000, shekels: 5 };   // Nombres 3:43-51 : l'excédent de 273 premiers-nés se rachète à 5 sicles chacun

    // Le tableau des camps : pour chaque camp, ses trois tribus et son total ; puis le total d'Israël.
    function campTable() {
        var camps = CAMP_ORDER.map(function (side) {
            var tribes = tribesOf(side);
            var nb1 = sum(tribes, 'nb1'), nb26 = sum(tribes, 'nb26');
            return { side: side, head: CAMP_SIDES[side].head, tribes: tribes, nb1: nb1, nb26: nb26, diff: nb26 - nb1 };
        });
        var total1 = sum(camps, 'nb1'), total26 = sum(camps, 'nb26');
        return { camps: camps, total: { nb1: total1, nb26: total26, diff: total26 - total1 },
            levi: { nb1: LEVI_CENSUS.nb1, nb26: LEVI_CENSUS.nb26, diff: LEVI_CENSUS.nb26 - LEVI_CENSUS.nb1 } };
    }
    // Les Lévites : par famille, les mâles d'un mois et plus, et ceux de trente à cinquante ans ; avec le total des familles.
    function levitesTable() {
        var fam = LEVITES.filter(function (l) { return l.month; });
        return { families: fam, month: sum(fam, 'month'), work: sum(fam, 'work') };
    }
    // Le rachat de l'excédent des premiers-nés d'Israël sur les Lévites.
    function redemption() {
        var surplus = FIRSTBORN.israel - FIRSTBORN.levites;
        return { surplus: surplus, shekels: surplus * FIRSTBORN.shekels };
    }

    // --- La conversion en mètres --------------------------------------------------------------------------------------------
    // Trois avis sur la longueur de la coudée (voir js/measuresCore.js) : on lui demande la valeur plutôt que de la recopier.
    var CUBIT_OPINIONS = ['nae', 'feinstein', 'hazon'];
    var FALLBACK_CUBIT = { nae: 0.48, feinstein: 0.53975, hazon: 0.576 };
    var measures = null;
    if (typeof module === 'object' && module.exports) { try { measures = require('./measuresCore.js'); } catch (e) { measures = null; } }
    else if (typeof self !== 'undefined' && self.MeasuresCore) measures = self.MeasuresCore;

    function cubitMetres(opinion) {
        var key = CUBIT_OPINIONS.indexOf(opinion) >= 0 ? opinion : 'nae';
        if (measures && typeof measures.factor === 'function') return measures.factor('distances', 'amah', key);
        return FALLBACK_CUBIT[key];
    }

    function metres(cubits, opinion) { return cubits * cubitMetres(opinion); }

    // Un élément du plan, par identifiant.
    function planItem(id) {
        for (var i = 0; i < PLAN.length; i++) if (PLAN[i].id === id) return PLAN[i];
        return null;
    }

    // Deux rectangles du plan se chevauchent-ils (intérieurs) ? Sert aux tests : les ustensiles ne se marchent pas dessus.
    function overlaps(a, b) {
        return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    }

    // Les vêtements d'un groupe : 'all' (les quatre du prêtre ordinaire) ou 'high' (les quatre de plus du grand prêtre).
    function garmentsOf(who) {
        return GARMENTS.filter(function (g) { return g.who === who; });
    }

    // Le nombre total de planches et de socles du Tabernacle (Exode 26:18-25).
    function plankCount() {
        var p = TABERNACLE.planks;
        return p.south + p.north + p.west + p.corners;
    }
    function socketCount() { return plankCount() * TABERNACLE.sockets.perPlank; }

    return {
        COURT: COURT, TABERNACLE: TABERNACLE, ALTAR: ALTAR, GOLD_ALTAR: GOLD_ALTAR, ARK: ARK, TABLE: TABLE, MENORAH: MENORAH, HOSHEN: HOSHEN,
        PLAN: PLAN, SIZES: SIZES, HOSHEN_STONES: HOSHEN_STONES, displayColumn: displayColumn, readableOn: readableOn, CURTAINS: CURTAINS, ITEMS: ITEMS, UTENSIL_ORDER: UTENSIL_ORDER, STRUCTURE: STRUCTURE, STRUCTURE_ORDER: STRUCTURE_ORDER, LAYERS: LAYERS,
        GARMENTS: GARMENTS, YOM_KIPPUR_GARMENTS: YOM_KIPPUR_GARMENTS, ZOOM_GARMENTS: ZOOM_GARMENTS, TSITS: TSITS, EFOD_STONES: EFOD_STONES, ROBE_HEM: ROBE_HEM,
        TRIBES: TRIBES, CAMP_SIDES: CAMP_SIDES, LEVITES: LEVITES, LEVITES_TOTAL_TEXT: LEVITES_TOTAL_TEXT, tribe: tribe, tribesOf: tribesOf, campTotal: campTotal, HOLINESS: HOLINESS,
        TEMPLE_PLAN: TEMPLE_PLAN, CAMP_ORDER: CAMP_ORDER, LEVI_CENSUS: LEVI_CENSUS, FIRSTBORN: FIRSTBORN, campTable: campTable, levitesTable: levitesTable, redemption: redemption,
        TEMPLE_COLUMNS: TEMPLE_COLUMNS, TEMPLE_ROWS: TEMPLE_ROWS, TEMPLE_QUOTE: TEMPLE_QUOTE, TEMPLE_CALENDAR: TEMPLE_CALENDAR,
        CUBIT_OPINIONS: CUBIT_OPINIONS, cubitMetres: cubitMetres, metres: metres, planItem: planItem, overlaps: overlaps,
        garmentsOf: garmentsOf, plankCount: plankCount, socketCount: socketCount
    };
}));
