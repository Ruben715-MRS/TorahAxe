// =========================================================================
// === TORAHAXE — « SUR LA CARTE » : LES RÈGLES DU JEU DE LOCALISATION (pur, sans DOM, testé) ===
// =========================================================================
// On voit un nom (une ville, une montagne, une mer, une tribu) : il faut toucher la carte à l'endroit voulu. Points selon la distance : 100 dans la tolérance de la
// carte, de moins en moins jusqu'à zéro, comme dans un jeu de géographie ; une tribu ou une mer se touche à l'intérieur de son contour. Cinq lieux par partie,
// 500 points au plus. La mécanique de partie est celle de js/quizCore.js ; le dessin est dans js/app/map-game.js.
//
// D'où viennent les lieux :
//  - Les villes, montagnes et pays (GAZETTEER ci-dessous) sont écrits pour ce jeu avec leurs coordonnées réelles, à quelques kilomètres près. Les positions de l'outil
//    « Cartes » (js/biblicalMapsCore.js) sont des repères dessinés à la main, parfois à des dizaines de kilomètres de la réalité (Sidon, Beyrouth, Gaza sur la carte des
//    royaumes) : un jeu qui note à la distance ne peut pas s'en servir. Les noms hébreux et français sont ceux de l'outil quand le lieu y figure.
//  - Les tribus et les deux mers (Morte et de Galilée) sont les contours de l'outil « Cartes » (tribus : le partage de la terre ; hydrographie), seuls contours que l'application
//    ait. Ils sont approximatifs, donc la note de la tribu le dit.
// Seuls des lieux dont l'emplacement est connu sont posés : pas de station du désert à l'emplacement discuté, sauf celles que la tradition situe de façon constante
// (Ramsès, le Sinaï, Kadèch-Barnéa, Etsion-Guéver). Contenu écrit à la main : à relire par une personne compétente.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./quizCore.js'), require('./biblicalMapsCore.js'));
    else root.MapGameCore = factory(root.QuizCore, root.BiblicalMapsCore);
}(typeof self !== 'undefined' ? self : this, function (Quiz, Maps) {
    'use strict';

    var ROUNDS = 5;
    var SECTIONS = ['all', 'terre', 'tribus', 'monde'];

    // Les deux cadres : [[ouest, sud], [est, nord]] en degrés. « terre » va de Gaza à Damas et de Béer-Chéva à Sidon ; « monde » de Thèbes à Suse et de Our Kasdim à l'Ararat.
    var VIEWS = {
        terre: { id: 'terre', bounds: [[34.1, 30.8], [36.5, 33.8]] },
        monde: { id: 'monde', bounds: [[27.5, 24.5], [50.5, 40.5]] }
    };

    // Les tolérances (km) : 100 points jusqu'à d0, 0 point à partir de d1, linéaire entre les deux.
    var TOLERANCE = {
        terre: { d0: 8, d1: 55 },       // une ville : à moins de 8 km, c'est exact
        zone: { d0: 0, d1: 35 },        // un contour : à l'intérieur, 100 points ; au-delà, 35 km pour tomber à zéro
        monde: { d0: 60, d1: 400 }      // le Proche-Orient entier : à 60 km près
    };

    function p(id, fr, he, c, view, kind, ref, note) { return { id: id, fr: fr, he: he, c: c, view: view, kind: kind, ref: ref, note: note }; }

    // --- Les lieux ([longitude, latitude]) ----------------------------------------------------------------------------------------------------
    var GAZETTEER = [
        // La terre d'Israël et ses voisines
        p('jerusalem', 'Jérusalem', 'ירושלים', [35.2137, 31.7683], 'terre', 'city', '2 Samuel 5:7', 'La ville de David, puis la capitale du royaume de Juda : le Temple y fut bâti.'),
        p('hebron', 'Hébron (Kiriat Arba)', 'חברון', [35.0998, 31.5326], 'terre', 'city', 'Genèse 23:2', 'Abraham y acheta la grotte de Makhpéla pour y enterrer Sara.'),
        p('chekhem', 'Chékhem', 'שכם', [35.2840, 32.2130], 'terre', 'city', 'Genèse 12:6', 'La première halte d’Abraham en Canaan, entre le mont Guerizim et le mont Ebal.'),
        p('beitel', 'Beit-El', 'בית אל', [35.2217, 31.9400], 'terre', 'city', 'Genèse 28:19', 'Jacob y rêva de l’échelle et nomma le lieu « maison de Dieu ».'),
        p('beersheva', 'Béer-Chéva', 'באר שבע', [34.7913, 31.2518], 'terre', 'city', 'Genèse 21:31', 'Abraham y creusa un puits et conclut une alliance avec Avimélekh : la limite sud du pays (« de Dan à Béer-Chéva »).'),
        p('bethleem', 'Bethléem', 'בית לחם', [35.2010, 31.7054], 'terre', 'city', 'Genèse 35:19', 'Rachel y fut enterrée ; David y naquit.'),
        p('jericho', 'Jéricho', 'יריחו', [35.4440, 31.8700], 'terre', 'city', 'Josué 6:20', 'La première ville prise par Josué : ses murailles tombèrent.'),
        p('chilo', 'Chilo', 'שילה', [35.2896, 32.0558], 'terre', 'city', 'Josué 18:1', 'Le Tabernacle y resta pendant des siècles, avant le Temple de Jérusalem.'),
        p('gabaon', 'Gabaon', 'גבעון', [35.1850, 31.8490], 'terre', 'city', 'Josué 10:12', 'C’est là que Josué dit au soleil de s’arrêter.'),
        p('hatsor', 'Hatsor', 'חצור', [35.5681, 33.0172], 'terre', 'city', 'Josué 11:10', 'La grande ville du nord de Canaan, brûlée par Josué.'),
        p('meguiddo', 'Meguiddo', 'מגידו', [35.1850, 32.5850], 'terre', 'city', 'Juges 5:19', 'La plaine de Meguiddo : la bataille de Déborah et Barak, et celle où mourut Josias.'),
        p('dan', 'Dan', 'דן', [35.6520, 33.2480], 'terre', 'city', 'Juges 18:29', 'La ville la plus au nord du pays : « de Dan à Béer-Chéva ».'),
        p('achkelon', 'Ashkelon', 'אשקלון', [34.5667, 31.6667], 'terre', 'city', 'Juges 14:19', 'Une des cinq villes des Philistins, sur la côte.'),
        p('gaza', 'Gaza', 'עזה', [34.4667, 31.5167], 'terre', 'city', 'Juges 16:21', 'Là, les Philistins aveuglèrent Sanson et l’enchaînèrent.'),
        p('ashdod', 'Ashdod', 'אשדוד', [34.6500, 31.8044], 'terre', 'city', '1 Samuel 5:1', 'Les Philistins y déposèrent l’Arche, dans le temple de Dagon.'),
        p('jaffa', 'Jaffa', 'יפו', [34.7500, 32.0500], 'terre', 'city', 'Jonas 1:3', 'Le port d’où Jonas s’embarqua pour Tarsis.'),
        p('acre', 'Acre', 'עכו', [35.0746, 32.9283], 'terre', 'city', 'Juges 1:31', 'Un port au nord de la côte, resté aux mains des Cananéens.'),
        p('tyr', 'Tyr', 'צור', [35.1970, 33.2705], 'terre', 'city', '1 Rois 5:15', 'Le roi Hiram de Tyr fournit à Salomon les cèdres du Temple.'),
        p('sidon', 'Sidon', 'צידון', [35.3714, 33.5630], 'terre', 'city', 'Genèse 10:19', 'Une ville phénicienne, limite nord du territoire cananéen.'),
        p('damas', 'Damas', 'דמשק', [36.2765, 33.5138], 'terre', 'city', 'Genèse 14:15', 'La capitale d’Aram, au nord-est d’Israël.'),
        p('samarie', 'Samarie', 'שומרון', [35.1940, 32.2750], 'terre', 'city', '1 Rois 16:24', 'La capitale du royaume d’Israël (les dix tribus), fondée par Omri.'),
        p('lakhish', 'Lakhish', 'לכיש', [34.8480, 31.5640], 'terre', 'city', '2 Rois 18:14', 'Sennachérib en fit le siège, avant de marcher sur Jérusalem.'),
        p('yizreel', 'Yizréel', 'יזרעאל', [35.3250, 32.5560], 'terre', 'city', '1 Rois 21:1', 'La vigne de Navot, et le palais d’Achab.'),
        p('dotan', 'Dotan', 'דותן', [35.2394, 32.4083], 'terre', 'city', 'Genèse 37:17', 'Les frères de Joseph y faisaient paître le troupeau quand il vint les chercher.'),
        p('hechbon', 'Hechbon', 'חשבון', [35.8100, 31.8000], 'terre', 'city', 'Nombres 21:26', 'La capitale de Sihon, roi des Amorrhéens, battu par Israël.'),
        p('rabbath', 'Rabbath-Ammon', 'רבת עמון', [35.9239, 31.9539], 'terre', 'city', '2 Samuel 12:26', 'La capitale des Ammonites, prise par Yoav.'),
        p('hermon', 'Mont Hermon', 'הר חרמון', [35.7850, 33.4160], 'terre', 'mountain', 'Deutéronome 3:8', 'Le point le plus haut du nord, aux sources du Jourdain.'),
        p('carmel', 'Mont Carmel', 'הר הכרמל', [35.0500, 32.7333], 'terre', 'mountain', '1 Rois 18:19', 'Élie y défia les prophètes de Baal.'),
        p('thabor', 'Mont Thabor', 'הר תבור', [35.3900, 32.6869], 'terre', 'mountain', 'Juges 4:6', 'Déborah y envoya Barak rassembler dix mille hommes.'),
        p('guerizim', 'Mont Guerizim', 'הר גריזים', [35.2730, 32.1990], 'terre', 'mountain', 'Deutéronome 11:29', 'Le mont des bénédictions, face à l’Ebal, au-dessus de Chékhem.'),
        p('ebal', 'Mont Ebal', 'הר עיבל', [35.2860, 32.2330], 'terre', 'mountain', 'Deutéronome 11:29', 'Le mont des malédictions, où Josué bâtit un autel.'),
        p('nebo', 'Mont Nebo', 'הר נבו', [35.7250, 31.7680], 'terre', 'mountain', 'Deutéronome 34:1', 'Moïse y vit la terre promise avant de mourir.'),
        // Hors de la terre d'Israël
        p('our', 'Our Kasdim', 'אור כשדים', [46.1050, 30.9610], 'monde', 'city', 'Genèse 11:31', 'La ville natale d’Abraham, en Chaldée, tout près du golfe Persique.'),
        p('haran', 'Haran', 'חרן', [39.0292, 36.8636], 'monde', 'city', 'Genèse 11:31', 'La famille de Téra’h s’y arrêta ; Jacob y vécut chez Laban.'),
        p('ninive', 'Ninive', 'נינוה', [43.1500, 36.3667], 'monde', 'city', 'Jonas 1:2', 'La grande capitale assyrienne, où Dieu envoya Jonas.'),
        p('babylone', 'Babylone', 'בבל', [44.4208, 32.5364], 'monde', 'city', '2 Rois 24:10', 'La capitale de Nabuchodonosor, qui détruisit le premier Temple.'),
        p('suse', 'Suse (Chouchan)', 'שושן', [48.2430, 32.1900], 'monde', 'city', 'Esther 1:2', 'La capitale d’Assuérus : l’histoire de Pourim s’y passe.'),
        p('memphis', 'Memphis (Nof)', 'נף', [31.2500, 29.8500], 'monde', 'city', 'Isaïe 19:13', 'Une capitale de l’Égypte ancienne, au sud du Delta.'),
        p('thebes', 'Thèbes (No-Amon)', 'נא אמון', [32.6396, 25.7188], 'monde', 'city', 'Nahoum 3:8', 'La grande ville de la Haute-Égypte, sur le Nil.'),
        p('ramses', 'Ramsès', 'רעמסס', [31.8333, 30.7833], 'monde', 'city', 'Exode 12:37', 'Le point de départ de la sortie d’Égypte, dans le Delta.'),
        p('sinai', 'Mont Sinaï', 'הר סיני', [33.9750, 28.5390], 'monde', 'mountain', 'Exode 19:2', 'Le mont de la Torah, selon la tradition (Djebel Moussa), au sud de la péninsule du Sinaï. Son emplacement exact est discuté.'),
        p('kadesh', 'Kadèch-Barnéa', 'קדש ברנע', [34.4208, 30.6881], 'monde', 'city', 'Nombres 13:26', 'D’où partirent les explorateurs ; Israël y resta de longues années.'),
        p('etsion', 'Etsion-Guéver', 'עציון גבר', [34.9500, 29.5500], 'monde', 'city', 'Nombres 33:35', 'Un port de la mer Rouge, au fond du golfe d’Eilat, et plus tard celui de Salomon.'),
        p('ararat', 'Mont Ararat', 'הרי אררט', [44.2980, 39.7020], 'monde', 'mountain', 'Genèse 8:4', 'Les monts d’Ararat, où l’arche de Noé se posa.')
    ];

    // Les grands fleuves du cadre « monde », en repères pour s'orienter (tracés d'après le cours réel, à quelques dizaines de kilomètres près ; la carte de la terre d'Israël a les siens,
    // ceux de js/biblicalMapsCore.js). Chaque fleuve : { id, fr, pts: [[lon, lat], …] de l'amont à l'aval }.
    var RIVERS = {
        monde: [
            { id: 'nil', fr: 'Nil', pts: [[32.90, 24.55], [32.65, 25.70], [32.30, 26.40], [31.15, 27.85], [30.85, 29.00], [31.25, 30.05], [31.20, 30.60], [31.00, 31.45]] },
            // Le nom de l'Euphrate se pose à gauche du fleuve, celui du Tigre à droite : ils ne se chevauchent pas. « label » est le point d'ancrage du nom, « anchor » son alignement.
            { id: 'euphrate', fr: 'Euphrate', pts: [[38.00, 36.83], [39.00, 35.95], [40.15, 35.33], [41.90, 34.40], [42.80, 33.64], [43.80, 33.35], [44.40, 32.55], [46.25, 31.05], [47.80, 30.50]], label: [43.7, 32.2], anchor: 'end' },
            { id: 'tigre', fr: 'Tigre', pts: [[40.20, 37.90], [42.20, 37.30], [43.13, 36.34], [43.87, 34.20], [44.40, 33.30], [45.80, 32.50], [47.15, 31.85], [47.40, 31.00]], label: [46.0, 34.0], anchor: 'start' }
        ]
    };

    // Les tribus et les mers : les contours de l'outil « Cartes ».
    var TRIBES = [
        ['juda', 'Tribu de Juda', 'יהודה'], ['benjamin', 'Tribu de Benjamin', 'בנימין'], ['ephraim', 'Tribu d’Éphraïm', 'אפרים'], ['manasse-o', 'Tribu de Manassé (à l’ouest du Jourdain)', 'מנשה'],
        ['issakhar', 'Tribu d’Issakhar', 'יששכר'], ['zabulon', 'Tribu de Zabulon', 'זבולון'], ['asher', 'Tribu d’Acher', 'אשר'], ['naphtali', 'Tribu de Naphtali', 'נפתלי'],
        ['dan', 'Tribu de Dan (sur la côte)', 'דן'], ['ruben', 'Tribu de Ruben', 'ראובן'], ['gad', 'Tribu de Gad', 'גד'], ['manasse-e', 'Tribu de Manassé (à l’est du Jourdain)', 'מנשה']
    ];
    var TRIBES_NOTE = 'Les contours de la carte « Le partage de la terre d’Israël » sont approximatifs : ils indiquent la région, pas une frontière exacte.';
    var LAKES = [['mer-morte', 'Mer Morte (mer du Sel)', 'ים המלח', 'Genèse 14:3', 'Le point le plus bas de la terre, au bout du Jourdain.'], ['tiberiade', 'Mer de Galilée (Kinnéret)', 'ים כנרת', 'Nombres 34:11', 'Le lac d’où descend le Jourdain, au nord-est du pays.']];

    // Les questions « contour » : les tribus et les mers, avec leur anneau [[lon, lat], …].
    function zones() {
        var out = [];
        var tribus = Maps.mapById('tribus');
        TRIBES.forEach(function (t) {
            var z = tribus.zones.filter(function (x) { return x.id === t[0] && !x.variant; })[0];
            if (z) out.push({ id: 'tribu:' + t[0], fr: t[1], he: t[2], ring: z.ring, view: 'terre', kind: 'tribe', ref: '', note: TRIBES_NOTE });
        });
        LAKES.forEach(function (l) {
            var lake = Maps.HYDRO.lakes.filter(function (x) { return x.id === l[0]; })[0];
            if (lake) out.push({ id: 'mer:' + l[0], fr: l[1], he: l[2], ring: lake.ring, view: 'terre', kind: 'lake', ref: l[3], note: l[4] });
        });
        return out;
    }

    // --- La géométrie ----------------------------------------------------------------------------------------------------------------------
    var R_KM = 6371.0088;
    function rad(d) { return d * Math.PI / 180; }

    // Distance en km entre deux points [lon, lat] (formule de haversine).
    function distanceKm(a, b) {
        var dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
        var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    // Le point est-il dans l'anneau ? (lancer de rayon, en degrés : suffisant à cette échelle)
    function inRing(pt, ring) {
        var inside = false;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
            if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    // Distance (km) du point au contour : 0 à l'intérieur, sinon la distance au bord le plus proche (plan local centré sur le point).
    function distanceToRingKm(pt, ring) {
        if (inRing(pt, ring)) return 0;
        var kx = 111.32 * Math.cos(rad(pt[1])), ky = 110.57;
        var best = Infinity;
        for (var i = 0; i < ring.length; i++) {
            var a = ring[i], b = ring[(i + 1) % ring.length];
            var ax = (a[0] - pt[0]) * kx, ay = (a[1] - pt[1]) * ky, bx = (b[0] - pt[0]) * kx, by = (b[1] - pt[1]) * ky;
            var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
            var t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
            var d = Math.hypot(ax + t * dx, ay + t * dy);
            if (d < best) best = d;
        }
        return best;
    }

    // Les lieux d'une vue, pour les repères : { id, fr, kind, c } pour un point (ville, montagne), { id, fr, kind, ring } pour un contour (tribu, mer).
    // Dans la vue « terre », les villes, montagnes, tribus et mers ; dans la vue « monde », les villes et montagnes du reste du monde biblique.
    function places(view) {
        var out = GAZETTEER.filter(function (g) { return g.view === view; }).map(function (g) { return { id: g.id, fr: g.fr, kind: g.kind, c: g.c }; });
        if (view === 'terre') out = out.concat(zones().filter(function (z) { return z.view === 'terre'; }).map(function (z) { return { id: z.id, fr: z.fr, kind: z.kind, ring: z.ring }; }));
        return out;
    }

    // Le passage de coordonnées géographiques à un dessin de `width` unités de large (projection plate, longitudes resserrées selon la latitude du milieu).
    function projection(bounds, width) {
        var west = bounds[0][0], south = bounds[0][1], east = bounds[1][0], north = bounds[1][1];
        var kx = Math.cos(rad((south + north) / 2));
        var scale = width / ((east - west) * kx);            // unités par degré de latitude
        return {
            width: width, height: (north - south) * scale, scale: scale,
            toXY: function (lon, lat) { return [(lon - west) * kx * scale, (north - lat) * scale]; },
            toLonLat: function (x, y) { return [west + x / (scale * kx), north - y / scale]; }
        };
    }

    // --- Les questions ---------------------------------------------------------------------------------------------------------------------
    // Une question : { type: 'map', id, kind ('city' | 'mountain' | 'tribe' | 'lake'), fr, he, view, bounds, c (le point) ou ring (le contour), tolerance { d0, d1 }, ref, note }.
    function makeQuestion(item) {
        var zone = !!item.ring;
        return {
            type: 'map', id: item.id, kind: item.kind, fr: item.fr, he: item.he, view: item.view, bounds: VIEWS[item.view].bounds,
            c: item.c || null, ring: item.ring || null, tolerance: zone ? TOLERANCE.zone : TOLERANCE[item.view], ref: item.ref || '', note: item.note || ''
        };
    }

    function items(section) {
        var zs = zones();
        if (section === 'tribus') return zs.filter(function (z) { return z.kind === 'tribe'; });
        if (section === 'terre') return GAZETTEER.filter(function (g) { return g.view === 'terre'; }).concat(zs.filter(function (z) { return z.kind === 'lake'; }));
        if (section === 'monde') return GAZETTEER.filter(function (g) { return g.view === 'monde'; });
        return GAZETTEER.concat(zs);
    }

    // `rounds` lieux. Dans « tous » : deux de la terre d'Israël, deux tribus ou mers, un du reste du monde biblique, dans un ordre mêlé.
    function pick(section, rng, rounds) {
        var random = rng || Math.random;
        if (section !== 'all') return Quiz.shuffle(items(section), random).slice(0, rounds).map(makeQuestion);
        var cities = Quiz.shuffle(items('terre').filter(function (x) { return !x.ring; }), random), zs = Quiz.shuffle(zones(), random), world = Quiz.shuffle(items('monde'), random);
        var nWorld = Math.max(1, Math.floor(rounds / 5)), nZones = Math.floor(rounds * 2 / 5), nCities = rounds - nWorld - nZones;
        return Quiz.shuffle(cities.slice(0, nCities).concat(zs.slice(0, nZones), world.slice(0, nWorld)), random).map(makeQuestion);
    }

    // Les points d'un point touché [lon, lat] : { distanceKm (jusqu'au lieu ou au contour), inside (dans le contour), points }.
    function score(q, touched) {
        var d = q.ring ? distanceToRingKm(touched, q.ring) : distanceKm(touched, q.c);
        var tol = q.tolerance;
        var points = d <= tol.d0 ? Quiz.POINTS : d >= tol.d1 ? 0 : Math.round(Quiz.POINTS * (tol.d1 - d) / (tol.d1 - tol.d0));
        return { distanceKm: d, inside: !!q.ring && d === 0, points: points };
    }

    // options : { section, rng, rounds, questions } ; `questions`, s'il est donné, fixe la partie (tests).
    function createGame(options) {
        var o = options || {};
        var section = SECTIONS.indexOf(o.section) >= 0 ? o.section : 'all';
        var state = Quiz.createState(o.questions || pick(section, o.rng, o.rounds || ROUNDS), { section: section });
        state.last = null;      // le dernier point touché : { touched, distanceKm, inside, points }
        return state;
    }

    function question(state) { return Quiz.question(state); }

    // Un point touché [lon, lat] : ['perfect'] (100 points), ['near'] (des points), ['far'] (0) ; [] si déjà résolu ou invalide.
    function submit(state, touched) {
        var q = question(state);
        if (state.over || !q || state.resolved || !Array.isArray(touched) || !isFinite(touched[0]) || !isFinite(touched[1])) return [];
        var s = score(q, touched);
        state.last = { touched: touched.slice(), distanceKm: s.distanceKm, inside: s.inside, points: s.points };
        state.resolved = s.points === Quiz.POINTS ? 'right' : s.points > 0 ? 'partial' : 'wrong';
        state.score += s.points;
        if (s.points === Quiz.POINTS) state.found += 1;
        state.results.push({ id: q.id, right: s.points === Quiz.POINTS, points: s.points, distanceKm: Math.round(s.distanceKm) });
        return [s.points === Quiz.POINTS ? 'perfect' : s.points > 0 ? 'near' : 'far'];
    }

    function next(state) {
        var events = Quiz.next(state);
        state.last = null;
        return events;
    }

    return {
        ROUNDS: ROUNDS, SECTIONS: SECTIONS, VIEWS: VIEWS, TOLERANCE: TOLERANCE, GAZETTEER: GAZETTEER, RIVERS: RIVERS, TRIBES: TRIBES, zones: zones, items: items,
        distanceKm: distanceKm, inRing: inRing, places: places, distanceToRingKm: distanceToRingKm, projection: projection, makeQuestion: makeQuestion, pick: pick, score: score,
        createGame: createGame, question: question, submit: submit, next: next
    };
}));
