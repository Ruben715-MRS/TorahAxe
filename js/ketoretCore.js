// =========================================================================
// === LA KÉTORET (L'ENCENS DU TEMPLE) : données et calculs, sans DOM ===
// =========================================================================
// La composition (Pitoum haQétoret), son service au Temple, ses sens, et sa place dans la prière d'aujourd'hui. Le texte biblique est Exode 30:34-38
// (quatre aromates nommés) ; les onze aromates et leurs poids viennent de la baraïta citée dans Kéritot 6a (reprise dans la prière), et le Rambam
// (Lois des ustensiles du Temple, chapitre 2) les codifie. L'identification de plusieurs aromates est discutée : elle est signalée comme telle, jamais
// tranchée. Le poids du maneh est discuté aussi : l'application ne donne que le nombre de maneh et un ordre de grandeur.
// Contenu écrit à la main en français seulement : **à relire par une personne compétente**. Testé dans tests/ketoretCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.KetoretCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Les aromates (Kéritot 6a ; Rambam, Kélé haMikdach 2:2-3) ----------------------------------------------------------------
    // `torah` : nommé dans Exode 30:34 (les quatre premiers, « à poids égal »). `maneh` : le poids selon la baraïta. `id` : clé stable.
    // `identification` : ce que les commentateurs y reconnaissent ; `debated` : l'identification est discutée.
    var SPICES = [
        { id: 'tsori', he: 'הצרי', fr: 'Tsori', torah: 'נָטָף', maneh: 70, debated: true,
            identification: "Une résine aromatique. La Torah l'appelle nataf (Exode 30:34), que l'on rend par « storax » ou « baume » ; l'identification de la plante est discutée." },
        { id: 'tsiporen', he: 'הצפורן', fr: 'Tsiporèn', torah: 'שְׁחֵלֶת', maneh: 70, debated: true,
            identification: "La Torah l'appelle chéhélet (Exode 30:34), « l'ongle aromatique » : un opercule de coquillage selon l'avis courant ; d'autres y voient une plante. C'est l'aromate préparé avec la lessive et le vin (voir plus bas)." },
        { id: 'helbena', he: 'החלבנה', fr: "'Helbèna", torah: 'חֶלְבְּנָה', maneh: 70, debated: false,
            identification: "Le galbanum, une résine d'odeur forte et désagréable quand on la sent seule. C'est le seul des quatre aromates de la Torah qui soit un « mauvais » parfum." },
        { id: 'levona', he: 'הלבונה', fr: 'Lévona', torah: 'לְבֹנָה זַכָּה', maneh: 70, debated: false,
            identification: "L'encens proprement dit (oliban, en latin tus), une résine blanche. La Torah dit « pur » (zakka) : l'encens que l'on met aussi sur le pain de proposition (Lévitique 24:7)." },
        { id: 'mor', he: 'מור', fr: 'Mor', maneh: 16, debated: true,
            identification: "La myrrhe, selon l'identification courante ; le Rambam a un autre avis sur la nature de cet aromate. L'identification est discutée." },
        { id: 'ketsia', he: 'קציעה', fr: 'Ketsi\'a', maneh: 16, debated: true,
            identification: "Une écorce aromatique que l'on rend par « casse » (cassia), citée dans le Psaume 45:9. L'identification est discutée." },
        { id: 'shibolet', he: 'שבלת נרד', fr: 'Chiboulèt nèrd', maneh: 16, debated: true,
            identification: "Le nard : on le nomme « épi de nard » (nèrd est cité dans le Cantique 1:12 ; 4:13-14). L'identification est discutée." },
        { id: 'karkom', he: 'כרכום', fr: 'Karkom', maneh: 16, debated: false,
            identification: "Le safran (Cantique 4:14)." },
        { id: 'kosht', he: 'קושט', fr: 'Kocht', maneh: 12, debated: true,
            identification: "Le costus, une racine aromatique ; l'identification est discutée." },
        { id: 'kilufa', he: 'קלופה', fr: 'Kiloufa', maneh: 3, debated: true,
            identification: "Une écorce aromatique : son nom veut dire « ce qu'on pèle ». L'identification est discutée." },
        { id: 'kinamon', he: 'קנמון', fr: 'Kinamon', maneh: 9, debated: true,
            identification: "La cannelle, selon l'avis courant ; d'autres y voient un autre bois aromatique. L'identification est discutée." }
    ];

    // Les quatre aromates de la Torah (Exode 30:34), puis les sept que les Sages ajoutent (tradition orale, Kéritot 6a).
    var TORAH_SPICES = SPICES.filter(function (s) { return !!s.torah; });
    var SAGES_SPICES = SPICES.filter(function (s) { return !s.torah; });

    // --- Les quantités : 365 + 3 (Kéritot 6a) ------------------------------------------------------------------------------------
    var DAYS = 365;            // un maneh par jour de l'année solaire, la moitié le matin, la moitié le soir
    var KIPPUR_EXTRA = 3;      // les trois autres maneh : les poignées du grand prêtre à Yom Kippour (Lévitique 16:12)
    var TOTAL_MANEH = DAYS + KIPPUR_EXTRA;
    var DAILY_MANEH = 1;       // un maneh par jour
    var MANEH_APPROX_KG = 0.4; // ordre de grandeur seulement : le poids du maneh dépend de l'avis ; sert à dire « de l'ordre de 150 kg »

    function totalManeh() {
        return SPICES.reduce(function (sum, s) { return sum + s.maneh; }, 0);
    }
    function torahManeh() { return TORAH_SPICES.reduce(function (sum, s) { return sum + s.maneh; }, 0); }

    // La part d'un aromate dans la composition, en pourcentage.
    function share(spice) { return spice.maneh / totalManeh() * 100; }

    // La quantité d'un aromate pour un jour ordinaire (un maneh pour la composition entière, la moitié le matin et le soir).
    function dailyShare(spice) { return spice.maneh / TOTAL_MANEH * DAILY_MANEH; }

    // Un ordre de grandeur en kilos de toute la composition (arrondi aux dizaines : le maneh est discuté).
    function approxTotalKg() { return Math.round(totalManeh() * MANEH_APPROX_KG / 10) * 10; }

    // --- Ce qui s'ajoute aux aromates (Kéritot 6a) ------------------------------------------------------------------------------
    var ADDITIVES = [
        { id: 'karshina', he: 'בורית כרשינה', fr: "Lessive de carchina", amount: '9 kav',
            text: "Une lessive végétale qui sert à frotter (polir) le tsiporèn." },
        { id: 'wine', he: 'יין קפריסין', fr: 'Vin de Chypre', amount: '3 séa et 3 kav',
            text: "On y fait tremper le tsiporèn pour l'adoucir. À défaut de vin de Chypre, un vieux vin blanc fort." },
        { id: 'salt', he: 'מלח סדומית', fr: 'Sel de Sodome', amount: 'un quart de kav',
            text: "Le sel : la Torah demande un encens « salé » (mémoula'h, Exode 30:35)." },
        { id: 'maale', he: 'מעלה עשן', fr: "Ma'alé 'achan", amount: 'une petite quantité',
            text: "Une herbe dont on ne connaît plus le nom : elle fait monter la fumée droite. Elle était, selon la tradition, connue de la seule famille Avtinas, qui refusa de la transmettre (Yoma 38a)." },
        { id: 'jordan', he: 'כיפת הירדן', fr: 'Kipat haYarden', amount: 'une petite quantité', opinion: 'Rabbi Natan',
            text: "Selon Rabbi Natan seulement : une plante du Jourdain, ajoutée au mélange. L'identification est discutée." }
    ];

    // Les règles qui protègent la composition (Kéritot 6a-6b).
    var RULES = [
        { id: 'honey', text: "Si l'on y met du miel, on la rend impropre ; si l'on omet l'un de ses aromates, on est passible de mort (Kéritot 6a).", ref: 'Kéritot 6a' },
        { id: 'fine', text: "Elle est pilée finement (Exode 30:36). Les Sages disent que la voix est bonne pour les aromates : on pilait en répétant « pile bien, bien, pile » (Kéritot 6b).", ref: 'Exode 30:36 ; Kéritot 6b' },
        { id: 'noCopy', text: "Interdit d'en faire une semblable pour soi, pour la respirer : « quiconque en fera de semblable pour en sentir l'odeur sera retranché de son peuple » (Exode 30:37-38).", ref: 'Exode 30:37-38' },
        { id: 'holy', text: "La Torah l'appelle « chose très sainte » (kodech kodachim, Exode 30:36), comme l'autel qui la porte.", ref: 'Exode 30:36' }
    ];

    // --- Le service au Temple ---------------------------------------------------------------------------------------------------
    // L'ordre des étapes de la michna Yoma 2:1-4 et Tamid 5-6, résumé. Les moments sont donnés par le texte (Exode 30:7-8).
    var SERVICE = [
        { id: 'where', he: 'מזבח הזהב', fr: "Où : l'autel d'or", text: "Dans le Saint (Héikhal), sur l'autel d'or, devant la parokhet (Exode 30:6). C'est le seul service d'encens régulier ; l'autel d'airain, lui, est dehors, dans la cour.", ref: 'Exode 30:1-6' },
        { id: 'when', he: 'שחר וערב', fr: 'Quand : matin et soir', text: "Chaque matin quand il prépare les lampes, et le soir quand il les allume « entre les deux soirs » (Exode 30:7-8) : un encens perpétuel (ketoret tamid). Un maneh par jour, la moitié à chaque fois.", ref: 'Exode 30:7-8 ; Kéritot 6a' },
        { id: 'who', he: 'פייס', fr: 'Qui : un cohen, tiré au sort', text: "Un seul cohen entre l'offrir, seul. Il était désigné par un tirage au sort (le « païs »), et c'était un grand honneur : les Sages y voient une source de richesse pour celui à qui il échoit (Yoma 26a).", ref: 'Yoma 2:4 ; Yoma 26a' },
        { id: 'how', he: 'הקטרה', fr: 'Comment : sur la braise', text: "Le cohen met la composition sur les braises de l'autel d'or ; la fumée monte alors dans le Saint (Tamid 6:2-3).", ref: 'Tamid 6' },
        { id: 'smell', he: 'ריח', fr: 'La fumée et l\'odeur', text: "La michna rapporte que l'odeur se sentait loin dans Jérusalem, et jusqu'à Jéricho (Tamid 3:8).", ref: 'Tamid 3:8' }
    ];

    // À Yom Kippour (Lévitique 16:12-13 ; Yoma 4-5) : le grand prêtre entre dans le Saint des saints avec la braise et deux poignées.
    var KIPPUR = {
        he: 'יום הכיפורים',
        fr: 'À Yom Kippour',
        steps: [
            "Le grand prêtre prend une pelle de braises de l'autel extérieur et ses deux poignées d'encens très fin, mises dans une louche (Lévitique 16:12).",
            "Il entre dans le Saint des saints et met l'encens sur les braises, « afin que la nuée de l'encens couvre le propitiatoire » (16:13).",
            "Les Sages exigent qu'il mette l'encens sur la braise à l'intérieur, et non dehors comme le soutenaient les sadducéens (Yoma 1:5 ; 19b).",
            "C'est pourquoi les trois maneh en plus sont repilés la veille, très fins, pour les poignées de Yom Kippour (Kéritot 6a)."
        ],
        ref: 'Lévitique 16:12-13 ; Yoma 4-5'
    };

    // --- Les sens (explications des Sages et des maîtres ; chacune est un avis, signalé) ---------------------------------------------
    var MEANINGS = [
        { id: 'unity', he: 'חלבנה', fr: "L'unité d'Israël : le 'helbèna", who: 'Kéritot 6b ; Rachi',
            text: "Le galbanum sent mauvais, et pourtant la Torah le met avec les aromates agréables, à poids égal. Les Sages y voient les pécheurs d'Israël : un jeûne où les pécheurs ne sont pas avec nous n'est pas un jeûne (Kéritot 6b). La composition n'est complète qu'avec lui." },
        { id: 'plague', he: 'מגפה', fr: "L'encens qui arrête la plaie", who: 'Nombres 17:11-13 ; Chabbat 89a',
            text: "Après la révolte de Kora'h, une plaie frappe le peuple : sur l'ordre de Moïse, Aaron prend un encensoir, met l'encens et se tient « entre les morts et les vivants » : la plaie s'arrête. Selon le Talmud (Chabbat 89a), c'est l'ange de la mort lui-même qui a révélé à Moïse que l'encens arrête la plaie. De là la coutume de dire le Pitoum haQétoret comme protection, rapportée aussi par le Zohar." },
        { id: 'tie', he: 'קשר', fr: 'Kétoret et kécher (le lien)', who: 'Allusion des maîtres de la Kabbale ; avis',
            text: "Le mot ketoret est proche de kécher, le nœud ou le lien : l'encens unit ce qui monte et ce qui descend. C'est une allusion de la tradition, non une explication du texte." },
        { id: 'smell', he: 'ריח ניחוח', fr: 'Un parfum agréable', who: 'Rambam, Guide des égarés 3:45',
            text: "Le Rambam donne une raison simple : l'odeur des sacrifices et du sang devait être masquée, par respect du lieu saint, et le parfum rend le Temple agréable à ceux qui y viennent." },
        { id: 'inside', he: 'פנימיות', fr: "Un service intérieur", who: 'Maîtres du moussar ; avis',
            text: "À la différence des sacrifices qui se font en public dans la cour, l'encens est offert à l'intérieur, par un seul cohen, en silence : les maîtres de la morale (moussar) y voient le service du cœur, caché." }
    ];

    // --- Aujourd'hui : l'endroit où on lit le Pitoum haQétoret ---------------------------------------------------------------------------------
    // `siddur` : l'identifiant de la section du siddour de l'application (data/siddur) ; null quand l'application n'a pas cette section dans ce rite.
    var TODAY = [
        { id: 'sefarade', fr: 'Séfarade', text: "Le matin, à la fin de la prière de chaque jour ; le Chabbat et à Roch 'Hodech, dans le Moussaf. Beaucoup de communautés le disent aussi le soir.", siddur: ['chacharit-ketoret'] },
        { id: 'ashkenaz', fr: 'Achkénaze', text: "Dans le passage des offrandes (Korbanot) qui ouvre la prière du matin, et à la fin de la prière de Chabbat et des fêtes.", siddur: null }
    ];
    var TODAY_NOTE = "Les coutumes varient d'une communauté à l'autre : suivez la vôtre. La tradition rapporte que lire ce texte avec attention a une grande force ; on le lit à voix haute et lentement.";
    // --- Les chiffres clés ---------------------------------------------------------------------------
    var SUMMARY = {
        total: TOTAL_MANEH,
        torah: TORAH_SPICES.length,
        sages: SAGES_SPICES.length,
        all: SPICES.length
    };

    function spice(id) {
        for (var i = 0; i < SPICES.length; i++) if (SPICES[i].id === id) return SPICES[i];
        return null;
    }

    // Les aromates triés du plus lourd au plus léger (les égalités gardent l'ordre de la baraïta).
    function byWeight() {
        return SPICES.map(function (s, i) { return { s: s, i: i }; })
            .sort(function (a, b) { return b.s.maneh - a.s.maneh || a.i - b.i; })
            .map(function (x) { return x.s; });
    }

    return {
        SPICES: SPICES, TORAH_SPICES: TORAH_SPICES, SAGES_SPICES: SAGES_SPICES, ADDITIVES: ADDITIVES, RULES: RULES, SERVICE: SERVICE, KIPPUR: KIPPUR,
        MEANINGS: MEANINGS, TODAY: TODAY, TODAY_NOTE: TODAY_NOTE, SUMMARY: SUMMARY,
        DAYS: DAYS, KIPPUR_EXTRA: KIPPUR_EXTRA, TOTAL_MANEH: TOTAL_MANEH,
        totalManeh: totalManeh, torahManeh: torahManeh, share: share, dailyShare: dailyShare, approxTotalKg: approxTotalKg,
        spice: spice, byWeight: byWeight
    };
}));
