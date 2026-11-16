// =========================================================================
// === TORAHAXE — LES KORBANOT (OFFRANDES ET SACRIFICES) : DONNÉES ===
// =========================================================================
// Le contenu de l'écran « Offrandes et sacrifices » (js/app/korbanot.js), en sept parties : le tableau des offrandes (qui offre quoi, dans quelle
// circonstance), le moussaf (les offrandes des jours de fête), les mena'hot et libations (farine, huile, vin), les animaux (espèces et âges), les offrandes des princes à l'inauguration de l'autel,
// les dons faits au cohen, les prémices. Les calculs (totaux, filtres) sont dans js/korbanotCore.js.
//
// Rédigé d'après la Torah (chaque ligne cite son verset) et la tradition rabbinique (Michna, Talmud), en s'appuyant sur les tableaux d'un
// ouvrage de référence pour le choix des lignes et le recoupement. Les textes sont écrits ici en propres termes. Un point d'attention : dans le
// tableau de référence, la case « sexe » de la ligne « office public de Kippour » porte le mot « femelle » (en bleu, couleur des mâles) ; la
// Torah parle de boucs (Lévitique 16:5), c'est donc « mâle » qui est retenu ici.
//
// Un second point d'attention, dans le tableau des mena'hot : la ligne du bélier porte, en français, « jointe au Omer » alors que son titre hébreu (נְסָכִים – אַיִל)
// et ses chiffres (2 issaron, 4 log) sont ceux du bélier ; c'est le titre hébreu qui est retenu. La vraie min'ha « jointe au Omer » est la dernière ligne (2 issaron, 3 log).
//
// Chiffres : Nombres 7 (princes), 15:4-10 et 28-29 (moussaf et accompagnements), Deutéronome 8:8 (sept espèces).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.KorbanotData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Les libellés des critères du tableau ------------------------------------------------------------------------
    var SCOPES = { collectif: 'Collectif', individuel: 'Individuel' };
    var SPECIES = { bovin: 'Bovin', ovin: 'Mouton, agneau, bélier', caprin: 'Chèvre, chevreau, bouc' };
    var SEXES = { M: 'Mâle', F: 'Femelle', MF: 'Mâle ou femelle' };
    var DUTIES = { obligatoire: 'Obligatoire', spontane: 'Don spontané', 'les-deux': 'Obligatoire ou don spontané' };
    var HOLINESS = { suprême: 'Suprêmement saint', moindre: 'Saint, de moindre sainteté' };

    // --- Les sept sortes d'offrandes ------------------------------------------------------------------------------------
    // key : les lettres du mot (pour ouvrir le dictionnaire) ; holiness : la sainteté du sacrifice (kodachim kalim = de moindre sainteté).
    var TYPES = [
        { id: 'ola', fr: 'Ola, offrande d\'élévation', he: 'עֹלָה', key: 'עלה', holiness: 'suprême', ref: 'Lévitique 1 ; 6:1-6',
          summary: 'Tout l\'animal est brûlé sur l\'autel : c\'est une offrande « qui monte ». Seule la peau revient au cohen (Lévitique 7:8).' },
        { id: 'hatat', fr: '\'Hatat, offrande de faute', he: 'חַטָּאת', key: 'חטאת', holiness: 'suprême', ref: 'Lévitique 4-5 ; 6:17-23',
          summary: 'Offerte pour une faute commise par erreur, ou en purification (accouchée, nazir, métsora). Son sang est appliqué sur les cornes de l\'autel. Dans la \'hatat « extérieure », les cohanim mangent la viande dans la cour ; dans la \'hatat « intérieure » (dont le sang entre dans le Sanctuaire), l\'animal est brûlé hors du camp.' },
        { id: 'acham', fr: 'Acham, offrande de délit', he: 'אָשָׁם', key: 'אשם', holiness: 'suprême', ref: 'Lévitique 5:14-26 ; 7:1-7',
          summary: 'Offerte pour un délit (détournement de biens sacrés, vol, faute dont on doute). Un bélier, ou un agneau pour le nazir et le métsora. Son sang est jeté autour de l\'autel ; les cohanim mangent la viande.' },
        { id: 'chelamim', fr: 'Chelamim, offrandes de paix', he: 'שְׁלָמִים', key: 'שלמימ', holiness: 'moindre', ref: 'Lévitique 3 ; 7:11-34',
          summary: 'Les graisses sont brûlées sur l\'autel, la poitrine et la cuisse reviennent au cohen, et le reste est mangé par celui qui offre, avec sa famille et ses invités. Cette famille comprend l\'offrande de remerciement (toda).' },
        { id: 'pessah', fr: 'Pessa\'h, l\'agneau pascal', he: 'פֶּסַח', key: 'פסח', holiness: 'moindre', ref: 'Exode 12:3-11',
          summary: 'Un agneau ou un chevreau d\'un an, sans défaut, offert l\'après-midi du 14 nissan et rôti ; on le mange la nuit du 15, avec des pains azymes et des herbes amères.' },
        { id: 'bekhor', fr: 'Bekhor, le premier-né du bétail', he: 'בְּכוֹר', key: 'בכור', holiness: 'moindre', ref: 'Nombres 18:15-18 ; Deutéronome 15:19-23',
          summary: 'Le premier-né mâle d\'un animal pur appartient à Dieu : il est offert, son sang est jeté autour de l\'autel, et sa viande revient au cohen.' },
        { id: 'maasser', fr: 'Maasser, la dîme du bétail', he: 'מַעֲשֵׂר', key: 'מעשר', holiness: 'moindre', ref: 'Lévitique 27:32-33',
          summary: 'Chaque année, les animaux nés au cours de l\'année passent un à un sous le bâton ; le dixième est consacré. Il est offert à Jérusalem, et son propriétaire en mange la viande.' }
    ];

    // --- Le tableau des offrandes : une ligne par circonstance ------------------------------------------------------------
    // [identifiant, type, partie (pour la 'hatat), circonstance, collectif/individuel, espèces, animal tel qu'on le lit, sexe, caractère, source]
    var R = function (id, type, part, situation, scope, species, animal, sex, duty, ref) {
        return { id: id, type: type, part: part, situation: situation, scope: scope, species: species, animal: animal, sex: sex, duty: duty, ref: ref };
    };
    var ROWS = [
        // 'Hatat « intérieure » : le sang entre dans le Sanctuaire.
        R('h-kippour-public', 'hatat', 'intérieure', 'Office public de Kippour', 'collectif', ['caprin'], 'Bouc', 'M', 'obligatoire', 'Lévitique 16:5, 9, 15'),
        R('h-cohen-gadol', 'hatat', 'intérieure', 'Le cohen gadol à Kippour', 'individuel', ['bovin'], 'Taureau', 'M', 'obligatoire', 'Lévitique 16:3, 11'),
        R('h-question', 'hatat', 'intérieure', 'Question dissimulée à l\'assemblée (erreur du grand tribunal)', 'collectif', ['bovin'], 'Taureau', 'M', 'obligatoire', 'Lévitique 4:13-21'),
        R('h-idolatrie-collective', 'hatat', 'intérieure', 'Culte idolâtre collectif (par erreur)', 'collectif', ['caprin'], 'Bouc', 'M', 'obligatoire', 'Nombres 15:24'),
        R('h-cohen-oint', 'hatat', 'intérieure', 'Taureau du cohen oint (grand prêtre fautif)', 'individuel', ['bovin'], 'Taureau', 'M', 'obligatoire', 'Lévitique 4:3-12'),
        // 'Hatat « extérieure » : le sang reste dans la cour.
        R('h-moussaf', 'hatat', 'extérieure', 'Moussaf de Roch \'Hodech, des trois fêtes, de Roch Hachana et de Kippour', 'collectif', ['caprin'], 'Bouc', 'M', 'obligatoire', 'Nombres 28:15 ; 28:22 ; 28:30 ; 29:5 ; 29:11'),
        R('h-deux-pains', 'hatat', 'extérieure', 'Joint aux deux pains de Chavouot', 'collectif', ['caprin'], 'Bouc', 'M', 'obligatoire', 'Lévitique 23:19'),
        R('h-individuelle', 'hatat', 'extérieure', 'Faute individuelle (\'hatat variable)', 'individuel', ['caprin', 'ovin'], 'Chevrette ou agnelle', 'F', 'obligatoire', 'Lévitique 4:27-35'),
        R('h-idolatrie-particulier', 'hatat', 'extérieure', 'Culte idolâtre d\'un particulier (par erreur)', 'individuel', ['caprin'], 'Chevrette', 'F', 'obligatoire', 'Nombres 15:27-29'),
        R('h-prince', 'hatat', 'extérieure', 'Faute d\'un prince', 'individuel', ['caprin'], 'Bouc', 'M', 'obligatoire', 'Lévitique 4:22-26'),
        R('h-nazir-metsora', 'hatat', 'extérieure', 'Nazir tahor et métsora (riche)', 'individuel', ['ovin'], 'Agnelle', 'F', 'obligatoire', 'Nombres 6:14 ; Lévitique 14:10, 19'),
        // Ola.
        R('o-tamid', 'ola', '', 'Tamid, le sacrifice quotidien', 'collectif', ['ovin'], 'Un agneau le matin, un agneau l\'après-midi', 'M', 'obligatoire', 'Nombres 28:3-4'),
        R('o-omer', 'ola', '', 'Avec l\'offrande du Omer', 'collectif', ['ovin'], 'Agneau', 'M', 'obligatoire', 'Lévitique 23:12'),
        R('o-deux-pains', 'ola', '', 'Avec les deux pains de Chavouot', 'collectif', ['bovin', 'ovin'], '1 taureau, 2 béliers, 7 agneaux', 'M', 'obligatoire', 'Lévitique 23:18'),
        R('o-kippour-cohen-gadol', 'ola', '', 'Le cohen gadol à Kippour', 'individuel', ['ovin'], 'Bélier', 'M', 'obligatoire', 'Lévitique 16:3'),
        R('o-reiya', 'ola', '', 'Olat réiya, aux trois fêtes de pèlerinage', 'individuel', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'M', 'obligatoire', 'Deutéronome 16:16-17'),
        R('o-accouchee', 'ola', '', 'Femme après l\'accouchement, nazir tahor, métsora', 'individuel', ['ovin'], 'Agneau', 'M', 'obligatoire', 'Lévitique 12:6 ; Nombres 6:14 ; Lévitique 14:10'),
        R('o-idolatrie-collective', 'ola', '', 'Culte idolâtre collectif (par erreur)', 'collectif', ['bovin'], 'Taureau', 'M', 'obligatoire', 'Nombres 15:24'),
        R('o-proselyte', 'ola', '', 'Le prosélyte (qui se convertit)', 'individuel', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'M', 'obligatoire', 'Talmud, Kéritot 9a'),
        R('o-volontaire', 'ola', '', 'Offrande volontaire', 'individuel', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'M', 'spontane', 'Lévitique 1:2-3'),
        R('o-kayits', 'ola', '', 'Kayits hamizbéa\'h (vacance de l\'autel, fin de l\'été)', 'collectif', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'M', 'spontane', 'Michna Chekalim 4'),
        // Acham.
        R('a-faute-incertaine', 'acham', '', 'Faute incertaine, méïla (détournement de biens sacrés), vol, servante fiancée', 'individuel', ['ovin'], 'Bélier', 'M', 'obligatoire', 'Lévitique 5:14-26 ; 19:20-22'),
        R('a-nazir-metsora', 'acham', '', 'Nazir devenu impur, métsora', 'individuel', ['ovin'], 'Agneau', 'M', 'obligatoire', 'Nombres 6:12 ; Lévitique 14:12'),
        // Chelamim.
        R('c-deux-pains', 'chelamim', '', 'Avec les deux pains de Chavouot', 'collectif', ['ovin'], '2 agneaux', 'M', 'obligatoire', 'Lévitique 23:19'),
        R('c-haguiga', 'chelamim', '', '\'Haguiga et sim\'ha, aux trois fêtes', 'individuel', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'MF', 'obligatoire', 'Deutéronome 16:14-17 ; 27:7'),
        R('c-nazir', 'chelamim', '', 'Nazir tahor', 'individuel', ['ovin'], 'Bélier', 'M', 'obligatoire', 'Nombres 6:14, 17'),
        R('c-volontaire', 'chelamim', '', 'Offrande volontaire', 'individuel', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'MF', 'spontane', 'Lévitique 3:1-17'),
        R('c-toda', 'chelamim', '', 'Toda, offrande de remerciement', 'individuel', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'MF', 'les-deux', 'Lévitique 7:12-15'),
        // Pessa'h, premier-né, dîme.
        R('p-pessah', 'pessah', '', 'L\'agneau pascal', 'individuel', ['ovin', 'caprin'], 'Agneau ou chevreau', 'M', 'obligatoire', 'Exode 12:3-11'),
        R('b-bekhor', 'bekhor', '', 'Premier-né du bétail', 'individuel', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'M', 'obligatoire', 'Nombres 18:15-18'),
        R('m-maasser', 'maasser', '', 'Dîme du bétail', 'individuel', ['bovin', 'ovin', 'caprin'], 'Mouton, chèvre ou bovin', 'MF', 'obligatoire', 'Lévitique 27:32-33')
    ];

    // --- Le moussaf : les offrandes de chaque jour --------------------------------------------------------------------
    // Pour chaque occasion, par jour : taureaux et béliers et agneaux (ola), boucs ('hatat). `times` : le nombre de jours où la même offrande se
    // répète (Pessa'h : sept jours). `includes` : une autre occasion offerte en plus (à Roch Hachana, le moussaf de Roch 'Hodech aussi).
    var D = function (id, fr, bulls, rams, lambs, goats, ref, times, includes) {
        return { id: id, fr: fr, bulls: bulls, rams: rams, lambs: lambs, goats: goats, ref: ref, times: times || 1, includes: includes || [] };
    };
    var MOUSSAF = [
        D('chabbat', 'Chabbat', 0, 0, 2, 0, 'Nombres 28:9-10'),
        D('roch-hodech', 'Roch \'Hodech (nouveau mois)', 2, 1, 7, 1, 'Nombres 28:11-15'),
        D('pessah', 'Pessa\'h (chacun des 7 jours)', 2, 1, 7, 1, 'Nombres 28:16-24', 7),
        D('chavouot', 'Chavouot', 2, 1, 7, 1, 'Nombres 28:26-30'),
        D('roch-hachana', 'Roch Hachana', 1, 1, 7, 1, 'Nombres 29:1-6', 1, ['roch-hodech']),
        D('kippour', 'Kippour', 1, 1, 7, 1, 'Nombres 29:7-11'),
        D('souccot-1', 'Souccot, 1er jour', 13, 2, 14, 1, 'Nombres 29:12-16'),
        D('souccot-2', 'Souccot, 2e jour', 12, 2, 14, 1, 'Nombres 29:17-19'),
        D('souccot-3', 'Souccot, 3e jour', 11, 2, 14, 1, 'Nombres 29:20-22'),
        D('souccot-4', 'Souccot, 4e jour', 10, 2, 14, 1, 'Nombres 29:23-25'),
        D('souccot-5', 'Souccot, 5e jour', 9, 2, 14, 1, 'Nombres 29:26-28'),
        D('souccot-6', 'Souccot, 6e jour', 8, 2, 14, 1, 'Nombres 29:29-31'),
        D('souccot-7', 'Souccot, 7e jour', 7, 2, 14, 1, 'Nombres 29:32-34'),
        D('chemini-atseret', 'Chemini Atséret', 1, 1, 7, 1, 'Nombres 29:35-38')
    ];
    // Ce qui accompagne chaque ola ou chelamim, les « nessakhim » (Nombres 15:4-12 ; 28:12-14) : la farine en issaron (un dixième d'épha), l'huile et le vin
    // en log (un douzième de hin : 12 log font 1 hin). Le bouc de 'hatat n'a pas d'accompagnement. Les deux dernières lignes sont celles du métsora
    // (son agnelle de 'hatat et son agneau d'acham reçoivent aussi leur min'ha, Lévitique 14:10, 21).
    var ACCOMPANIMENTS = [
        { id: 'bull', fr: 'Taureau', one: 'taureau', many: 'taureaux', flour: 3, oil: 6, wine: 6, ref: 'Nombres 15:8-10 ; 28:12' },
        { id: 'ram', fr: 'Bélier', one: 'bélier', many: 'béliers', flour: 2, oil: 4, wine: 4, ref: 'Nombres 15:6-7 ; 28:12' },
        { id: 'lamb', fr: 'Agneau', one: 'agneau', many: 'agneaux', flour: 1, oil: 3, wine: 3, ref: 'Nombres 15:4-5 ; 28:13' },
        { id: 'kid', fr: 'Chevreau', one: 'chevreau', many: 'chevreaux', flour: 1, oil: 3, wine: 3, ref: 'Nombres 15:11' },
        { id: 'metsora-hatat', fr: '\'Hatat du métsora (agnelle)', one: 'agnelle de \'hatat du métsora', many: 'agnelles de \'hatat du métsora', flour: 1, oil: 3, wine: 3, ref: 'Lévitique 14:10, 19' },
        { id: 'metsora-acham', fr: 'Acham du métsora (agneau)', one: 'agneau d\'acham du métsora', many: 'agneaux d\'acham du métsora', flour: 1, oil: 3, wine: 3, ref: 'Lévitique 14:12, 21' }
    ];
    var SIDES = { bull: ACCOMPANIMENTS[0], ram: ACCOMPANIMENTS[1], lamb: ACCOMPANIMENTS[2] };   // ce que le moussaf additionne
    var TAMID = { lambs: 2, ref: 'Nombres 28:3-8' };    // deux agneaux par jour, chacun avec 1/10 d'épha de farine, 1/4 de hin d'huile et de vin

    // --- Les mena'hot : les offrandes de farine ---------------------------------------------------------------------------------
    // flour : 'blé' ou 'orge' ; measure : la farine en issaron ; oil : l'huile ; incense : avec de l'encens (levona) ; burned : ce qui brûle sur l'autel
    // ('komets-encens' : une poignée et l'encens ; 'komets' : une poignée ; 'integral' : tout, comme toute min'ha offerte par un cohen) ;
    // scope : 'individuel', 'collectif' ou 'les-deux'.
    var M = function (id, fr, he, key, flour, measure, oil, incense, burned, scope, ref, note) {
        return { id: id, fr: fr, he: he, key: key, flour: flour, measure: measure, oil: oil, incense: incense, burned: burned, scope: scope, ref: ref, note: note };
    };
    var MENAHOT = [
        M('soleth', 'Fleur de farine', 'מִנְחַת סֹלֶת', 'מנחה', 'blé', '1 à 60 issaron', '1 log par issaron', true, 'komets-encens', 'individuel', 'Lévitique 2:1-3', 'La plus simple : de la fleur de farine, de l\'huile et de l\'encens, apportée crue.'),
        M('mahavat', 'Poêle', 'מִנְחַת מַחֲבַת', 'מנחה', 'blé', '1 à 60 issaron', '1 log par issaron', true, 'komets-encens', 'individuel', 'Lévitique 2:5-6', 'La pâte est cuite sur une plaque.'),
        M('marhechet', 'Poêle creuse', 'מִנְחַת מַרְחֶשֶׁת', 'מנחה', 'blé', '1 à 60 issaron', '1 log par issaron', true, 'komets-encens', 'individuel', 'Lévitique 2:7', 'La pâte est cuite dans une poêle creuse, plus profonde.'),
        M('hallot', 'Pains', 'מִנְחַת מַאֲפֶה – חַלּוֹת', 'מנחה', 'blé', '1 à 60 issaron', '1 log par issaron', true, 'komets-encens', 'individuel', 'Lévitique 2:4', 'Des pains azymes cuits au four, pétris à l\'huile.'),
        M('rekikin', 'Galettes', 'מִנְחַת מַאֲפֶה – רְקִיקִין', 'מנחה', 'blé', '1 à 60 issaron', '1 log par issaron', true, 'komets-encens', 'individuel', 'Lévitique 2:4', 'Des galettes azymes minces, enduites d\'huile.'),
        M('havitin', '\'Havitin du cohen gadol', 'חֲבִיתֵי כֹהֵן גָּדוֹל', 'מנחה', 'blé', '1 issaron', '3 log', true, 'integral', 'individuel', 'Lévitique 6:12-15', 'Offerte chaque jour par le grand prêtre : la moitié le matin, la moitié le soir.'),
        M('hinoukh', 'Investiture du cohen', 'מִנְחַת חִנּוּךְ', 'מנחה', 'blé', '1 issaron', '3 log', true, 'integral', 'individuel', 'Lévitique 6:12-15', 'Offerte par chaque cohen le jour où il entre en fonction.'),
        M('hote', 'Min\'ha du pécheur', 'מִנְחַת חוֹטֵא', 'מנחה', 'blé', '1 issaron', '', false, 'komets', 'individuel', 'Lévitique 5:11-13', 'Pour un pauvre, à la place d\'un animal ou d\'oiseaux : sans huile ni encens.'),
        M('sotah', 'Min\'ha de la sotah', 'מִנְחַת סוֹטָה', 'מנחה', 'orge', '1 issaron', '', false, 'komets', 'individuel', 'Nombres 5:15, 25', 'Offerte pour la femme soupçonnée d\'adultère : de l\'orge, sans huile ni encens.'),
        M('omer', 'Min\'ha du Omer', 'מִנְחַת הָעוֹמֶר', 'מנחה', 'orge', '1 issaron', '1 log', true, 'komets-encens', 'collectif', 'Lévitique 23:10-14', 'Offerte le 16 nissan, avec la première gerbe d\'orge.'),
        M('nessakhim-bull', 'Min\'hat nessakhim du taureau', 'מִנְחַת נְסָכִים – פַּר', 'נסכ', 'blé', '3 issaron', '6 log', false, 'integral', 'les-deux', 'Nombres 15:8-10', 'L\'accompagnement d\'une ola ou d\'un chelamim de taureau.'),
        M('nessakhim-ram', 'Min\'hat nessakhim du bélier', 'מִנְחַת נְסָכִים – אַיִל', 'נסכ', 'blé', '2 issaron', '4 log', false, 'integral', 'les-deux', 'Nombres 15:6-7', 'L\'accompagnement d\'une ola ou d\'un chelamim de bélier.'),
        M('nessakhim-lamb', 'Min\'hat nessakhim de l\'agneau', 'מִנְחַת נְסָכִים – כֶּבֶשׂ', 'נסכ', 'blé', '1 issaron', '3 log', false, 'integral', 'les-deux', 'Nombres 15:4-5', 'L\'accompagnement d\'une ola ou d\'un chelamim d\'agneau.'),
        M('nessakhim-omer', 'Min\'hat nessakhim jointe au Omer', 'מִנְחַת נְסָכִים עִם הָעוֹמֶר', 'נסכ', 'blé', '2 issaron', '3 log', false, 'integral', 'collectif', 'Lévitique 23:13', 'L\'accompagnement de l\'agneau offert avec le Omer : deux issaron, au lieu d\'un.')
    ];
    var MENAHOT_LABELS = {
        flour: { 'blé': 'Blé', orge: 'Orge' },
        incense: { true: 'Avec encens (levona)', false: 'Sans encens' },
        burned: { 'komets-encens': 'Une poignée (komets) et l\'encens', komets: 'Une poignée (komets)', integral: 'Intégralement' },
        scope: { individuel: 'Individuel', collectif: 'Collectif', 'les-deux': 'Individuel ou collectif' }
    };
    var MENAHOT_NOTES = [
        'Un issaron est un dixième d\'épha ; un log est un douzième de hin (12 log font 1 hin).',
        'Pour les cinq premières, de 1 à 60 issaron selon ce qu\'on offre (Michna Mena\'hot 9:3), avec un log d\'huile par issaron.',
        'Les mena\'hot offertes par un cohen sont entièrement brûlées sur l\'autel. Le komets de la min\'ha d\'une sotah qui serait la femme d\'un cohen est déposé avec les cendres.'
    ];

    // --- Les animaux : espèces et âges ---------------------------------------------------------------------------------------
    // key : les lettres du mot pour ouvrir le dictionnaire.
    var ANIMALS = [
        { id: 'veau', group: 'bovins', fr: 'Veau, génisse', he: 'עֵגֶל / עֶגְלָה', key: 'עגל', note: 'Dans sa première année.' },
        { id: 'taureau', group: 'bovins', fr: 'Taureau', he: 'פַּר', key: 'פר', note: 'De treize mois jusqu\'à la fin de la troisième année.' },
        { id: 'vache', group: 'bovins', fr: 'Vache (femelle)', he: 'פָּרָה', key: 'פרה', note: 'De treize mois jusqu\'à la fin de la troisième année.' },
        { id: 'agneau', group: 'petit-betail', fr: 'Agneau, agnelle', he: 'כֶּבֶשׂ / כִּשְׂבָּה', key: 'כבש', note: 'Dans sa première année.' },
        { id: 'belier', group: 'petit-betail', fr: 'Jeune bélier', he: 'אַיִל', key: 'איל', note: 'De treize mois jusqu\'à la fin de sa deuxième année.' },
        { id: 'chevreau', group: 'petit-betail', fr: 'Chevreau, chevrette', he: 'שְׂעִיר עִזִּים / שְׂעִירַת עִזִּים', key: 'שעיר', note: 'Dans leur première année.' },
        { id: 'bouc', group: 'petit-betail', fr: 'Bouc', he: 'שָׂעִיר / שְׂעִירָה', key: 'שעיר', note: 'De treize mois jusqu\'à la fin de la deuxième année.' },
        { id: 'tourterelle', group: 'oiseaux', fr: 'Tourterelle', he: 'תּוֹר', key: 'תור', note: 'Adulte : quand les plumes du cou prennent une teinte dorée.' },
        { id: 'colombe', group: 'oiseaux', fr: 'Jeune colombe', he: 'בֶּן יוֹנָה', key: 'יונה', note: 'Jeune : quand on arrache une plume, le follicule saigne.' }
    ];
    var ANIMAL_GROUPS = { bovins: 'Bovins', 'petit-betail': 'Petit bétail', oiseaux: 'Oiseaux' };
    var ANIMAL_GROUP_HE = { bovins: 'בָּקָר', 'petit-betail': 'צֹאן', oiseaux: 'עוֹף' };
    var ANIMAL_NOTE = 'Les avis divergent sur certaines limites d\'âge (par exemple pour la vache ou pour le chevreau et le bouc : voir Michna Para 1:4).';

    // --- Les princes, à l'inauguration de l'autel (Nombres 7) ----------------------------------------------------------------
    var PRINCES = [
        { day: 1, tribe: 'Juda', prince: 'Na\'hchon, fils d\'Aminadav', ref: 'Nombres 7:12-17' },
        { day: 2, tribe: 'Issacar', prince: 'Netanel, fils de Tsouar', ref: 'Nombres 7:18-23' },
        { day: 3, tribe: 'Zabulon', prince: 'Éliav, fils de \'Hélon', ref: 'Nombres 7:24-29' },
        { day: 4, tribe: 'Ruben', prince: 'Élitsour, fils de Chédéour', ref: 'Nombres 7:30-35' },
        { day: 5, tribe: 'Siméon', prince: 'Chélouniel, fils de Tsourichadaï', ref: 'Nombres 7:36-41' },
        { day: 6, tribe: 'Gad', prince: 'Élyassaf, fils de Déouel', ref: 'Nombres 7:42-47' },
        { day: 7, tribe: 'Éphraïm', prince: 'Élichama, fils d\'Amihoud', ref: 'Nombres 7:48-53' },
        { day: 8, tribe: 'Manassé', prince: 'Gamliel, fils de Pedatsour', ref: 'Nombres 7:54-59' },
        { day: 9, tribe: 'Benjamin', prince: 'Avidan, fils de Guid\'oni', ref: 'Nombres 7:60-65' },
        { day: 10, tribe: 'Dan', prince: 'A\'hiézer, fils d\'Amichadaï', ref: 'Nombres 7:66-71' },
        { day: 11, tribe: 'Aser', prince: 'Paguiel, fils d\'Okhran', ref: 'Nombres 7:72-77' },
        { day: 12, tribe: 'Nephtali', prince: 'A\'hira, fils d\'Énan', ref: 'Nombres 7:78-83' }
    ];
    // L'offrande de chaque prince : la même, douze jours de suite (Nombres 7:13-17). Les chekels sont ceux du sanctuaire.
    var PRINCE_OFFERING = {
        silverBowl: 130, silverBasin: 70, goldLadle: 10,                 // un bol et un bassin d'argent (de farine mêlée d'huile), une louche d'or (d'encens)
        olaBulls: 1, olaRams: 1, olaLambs: 1,                           // ola : un taureau, un bélier, un agneau
        hatatGoats: 1,                                                  // 'hatat : un bouc
        chelamimOxen: 2, chelamimRams: 5, chelamimGoats: 5, chelamimLambs: 5   // chelamim : deux bœufs, cinq béliers, cinq boucs, cinq agneaux
    };

    // --- Les vingt-quatre dons faits au cohen ---------------------------------------------------------------------------
    // group : 'temple' (dix, dans le Temple), 'jerusalem' (quatre), 'pays' (dix, dans le reste du pays).
    var G = function (n, group, fr, he, key, text, ref) { return { n: n, group: group, fr: fr, he: he, key: key, text: text, ref: ref }; };
    var GIFTS = [
        G(1, 'temple', '\'Hatat de bétail', 'חַטָּאת בְּהֵמָה', 'חטאת', 'La viande de l\'offrande de faute, quand elle n\'est pas brûlée : les cohanim la mangent dans la cour du Temple.', 'Lévitique 6:19'),
        G(2, 'temple', '\'Hatat des oiseaux', 'חַטַּאת הָעוֹף', 'חטאת', 'Les oiseaux offerts pour une faute : ce qui n\'est pas brûlé sur l\'autel revient aux cohanim.', 'Lévitique 5:8-9'),
        G(3, 'temple', 'Acham vadaï (délit certain)', 'אָשָׁם וַדַּאי', 'אשמ', 'L\'offrande de délit pour une faute certaine (vol, détournement de biens sacrés…) : la viande est mangée par les cohanim.', 'Lévitique 7:6'),
        G(4, 'temple', 'Acham talouï (délit incertain)', 'אָשָׁם תָּלוּי', 'אשמ', 'L\'offrande de délit pour un doute (a-t-on fauté ?) : elle revient aux cohanim.', 'Lévitique 5:17-19'),
        G(5, 'temple', 'Les agneaux de paix de Chavouot', 'זִבְחֵי שַׁלְמֵי צִבּוּר', 'שלמימ', 'Les deux agneaux offerts avec les deux pains : ils sont consacrés au cohen.', 'Lévitique 23:19-20'),
        G(6, 'temple', 'Le log d\'huile du métsora', 'לוֹג שֶׁמֶן שֶׁל מְצוֹרָע', 'שמנ', 'L\'huile (un log) que le métsora apporte pour sa purification est remise aux cohanim.', 'Lévitique 14:10-12'),
        G(7, 'temple', 'Le reste de l\'offrande du Omer', 'מוֹתַר הָעוֹמֶר', 'עומר', 'Après la poignée brûlée sur l\'autel, le reste de l\'offrande de farine du Omer est mangé par les cohanim.', 'Lévitique 6:9-11'),
        G(8, 'temple', 'Les deux pains de Chavouot', 'שְׁתֵּי הַלֶּחֶם', 'לחמ', 'Les deux pains levés offerts à Chavouot sont consacrés aux cohanim.', 'Lévitique 23:17, 20'),
        G(9, 'temple', 'Les pains de proposition', 'לֶחֶם הַפָּנִים', 'לחמ', 'Douze pains posés chaque Chabbat sur la table, puis remplacés ; ceux qu\'on retire sont mangés par les cohanim.', 'Lévitique 24:5-9'),
        G(10, 'temple', 'Les restes des offrandes de farine', 'שִׁירֵי מִנְחוֹת', 'מנחה', 'Ce qui reste d\'une offrande de farine après la poignée brûlée sur l\'autel.', 'Lévitique 2:3, 10'),
        G(11, 'jerusalem', 'Le premier-né du bétail', 'בְּכוֹר', 'בכור', 'Le premier-né mâle d\'un animal pur est offert, et sa viande revient au cohen.', 'Nombres 18:15-18'),
        G(12, 'jerusalem', 'Les prémices des fruits', 'בִּכּוּרִים', 'בכורימ', 'Les premiers fruits des sept espèces, apportés à Jérusalem et remis au cohen.', 'Nombres 18:13 ; Deutéronome 26:1-11'),
        G(13, 'jerusalem', 'Les parties prélevées de la toda et du bélier du nazir', 'הַמּוֹרָם מִן הַתּוֹדָה וְאֵיל נָזִיר', 'תודה', 'Le pain prélevé sur l\'offrande de remerciement, et l\'épaule et les pains prélevés sur le bélier du nazir.', 'Lévitique 7:14 ; Nombres 6:19-20'),
        G(14, 'jerusalem', 'Les peaux des offrandes suprêmement saintes', 'עוֹרוֹת קָדָשִׁים', 'עור', 'La peau de l\'animal offert en ola (et des autres sacrifices suprêmement saints) revient au cohen.', 'Lévitique 7:8'),
        G(15, 'pays', 'La terouma', 'תְּרוּמָה', 'תרומה', 'Le prélèvement sur la récolte (en moyenne un cinquantième), donné au cohen.', 'Nombres 18:8-12 ; Deutéronome 18:4'),
        G(16, 'pays', 'La terouma de la dîme', 'תְּרוּמַת מַעֲשֵׂר', 'תרומה', 'Le dixième que le lévite prélève sur la dîme qu\'il a reçue, pour le cohen.', 'Nombres 18:26-28'),
        G(17, 'pays', 'La \'halla', 'חַלָּה', 'חלה', 'Une part de la pâte, prélevée pour le cohen.', 'Nombres 15:18-21'),
        G(18, 'pays', 'Les prémices de la tonte', 'רֵאשִׁית הַגֵּז', 'גז', 'La première laine du petit bétail, donnée au cohen.', 'Deutéronome 18:4'),
        G(19, 'pays', 'Les parties de l\'offrande de bétail offertes', 'הַמַּתָּנוֹת', 'מתנות', 'De tout animal pur abattu pour un usage non sacré : la patte avant, la mâchoire et la caillette.', 'Deutéronome 18:3'),
        G(20, 'pays', 'Le rachat du fils premier-né', 'פִּדְיוֹן הַבֵּן', 'פדיונ', 'Le père rachète son fils premier-né au cohen, pour cinq chekels.', 'Nombres 18:15-16'),
        G(21, 'pays', 'Le rachat du premier-né de l\'ânesse', 'פִּדְיוֹן פֶּטֶר חֲמוֹר', 'חמור', 'Le premier-né de l\'ânesse se rachète avec un agneau, donné au cohen.', 'Exode 13:13'),
        G(22, 'pays', 'Le champ d\'héritage consacré', 'שְׂדֵה אֲחֻזָּה', 'אחזה', 'Un champ hérité, consacré puis non racheté : il passe aux cohanim au jubilé.', 'Lévitique 27:20-21'),
        G(23, 'pays', 'Le champ déclaré \'hérem', 'שְׂדֵה חֲרָמִים', 'חרמ', 'Un champ voué en \'hérem : il revient aux cohanim.', 'Lévitique 27:21 ; Nombres 18:14'),
        G(24, 'pays', 'Ce qui a été volé à un converti sans héritier', 'גֶּזֶל הַגֵּר', 'גזל', 'Quand un converti meurt sans héritier, ce qu\'on lui avait volé et que le voleur restitue revient au cohen.', 'Nombres 5:6-8')
    ];
    var GIFT_GROUPS = {
        temple: { fr: 'Dans le Temple', count: 10 },
        jerusalem: { fr: 'À Jérusalem', count: 4 },
        pays: { fr: 'Dans le reste du pays', count: 10 }
    };

    // --- Les prélèvements et les dîmes (Nombres 18 ; Deutéronome 14) ------------------------------------------------------
    // Une terouma de 1/40 (généreux), 1/50 (moyen) ou 1/60 (mesquin) : Michna Terouma 4:3.
    var TEROUMA = [{ den: 40, fr: 'Un quarantième (généreux)' }, { den: 50, fr: 'Un cinquantième (moyen)' }, { den: 60, fr: 'Un soixantième (mesquin)' }];
    var TITHE_YEARS = [
        { id: 'sheni', fr: 'Maasser chéni (1re, 2e, 4e et 5e années du cycle de sept ans)', second: 'Maasser chéni : consommé à Jérusalem' },
        { id: 'ani', fr: 'Maasser \'ani (3e et 6e années)', second: 'Maasser \'ani : remis aux pauvres' }
    ];

    // Le dénombrement des lévites et le rachat des premiers-nés (Nombres 3).
    var LEVITES = {
        gershon: 7500, kehat: 8600, merari: 6200,       // Nombres 3:22, 28, 34
        firstbornLevites: 300,                           // les premiers-nés parmi les lévites, qui ne comptent pas (explication de la tradition)
        firstbornIsrael: 22273,                          // Nombres 3:43
        shekelsEach: 5,                                  // Nombres 3:47
        ref: 'Nombres 3:21-51'
    };

    // --- Les prémices (Deutéronome 26:1-11 ; Michna Bikkourim 3) -----------------------------------------------------------
    var SEVEN_SPECIES = [
        { id: 'ble', fr: 'Le blé', he: 'חִטָּה', key: 'חטה' },
        { id: 'orge', fr: 'L\'orge', he: 'שְׂעוֹרָה', key: 'שערה' },
        { id: 'vigne', fr: 'La vigne', he: 'גֶּפֶן', key: 'גפנ' },
        { id: 'figue', fr: 'La figue', he: 'תְּאֵנָה', key: 'תאנ' },
        { id: 'grenade', fr: 'La grenade', he: 'רִמּוֹן', key: 'רמונ' },
        { id: 'olive', fr: 'L\'olive', he: 'זַיִת', key: 'זית' },
        { id: 'miel', fr: 'Le miel (de datte)', he: 'דְּבַשׁ', key: 'דבש' }
    ];
    var SPECIES_REF = 'Deutéronome 8:8';
    var BIKKURIM_STEPS = [
        { fr: 'Dans le champ', text: 'Quand un agriculteur voit mûrir un premier fruit de l\'une des sept espèces, il lui noue un ruban et déclare : « Voici les prémices ! »', ref: 'Michna Bikkourim 3:1' },
        { fr: 'La cueillette', text: 'Une fois mûrs, les fruits sont cueillis et déposés dans des corbeilles : d\'or ou d\'argent pour les riches, en osier pour les pauvres.', ref: 'Michna Bikkourim 3:8' },
        { fr: 'Le rassemblement', text: 'Les habitants de plusieurs villes se retrouvent dans la ville principale de leur « maamad » et y passent la nuit sur la place. Le matin, on annonce : « Levons-nous et montons à Sion, vers l\'Éternel, notre Dieu ! »', ref: 'Michna Bikkourim 3:2 ; Jérémie 31:5' },
        { fr: 'La procession', text: 'Les pèlerins avancent en cortège, avec leurs prémices. Un bœuf aux cornes recouvertes d\'or et à la tête couronnée de feuilles d\'olivier ouvre la marche, devant les joueurs de flûte.', ref: 'Michna Bikkourim 3:3' },
        { fr: 'Le chemin', text: 'En route vers Jérusalem, les pèlerins déclament des versets sacrés et chantent des psaumes.', ref: 'Michna Bikkourim 3:3' },
        { fr: 'Aux abords de la ville', text: 'Les anciens sortent à leur rencontre et, sur le chemin du parvis du Temple, les artisans de Jérusalem se lèvent et les saluent.', ref: 'Michna Bikkourim 3:3' },
        { fr: 'Sur le mont du Temple', text: 'Chacun porte sa corbeille sur l\'épaule et se dirige vers le parvis. À leur arrivée, les lévites chantent : « Je T\'exalterai, Seigneur, car Tu m\'as relevé… »', ref: 'Michna Bikkourim 3:4 ; Psaumes 30:2' },
        { fr: 'Devant le cohen', text: 'Le propriétaire se présente au cohen et déclare : « Je déclare aujourd\'hui à l\'Éternel ton Dieu que je suis venu dans le pays que l\'Éternel avait juré à nos ancêtres de nous donner. »', ref: 'Deutéronome 26:3' },
        { fr: 'Le balancement', text: 'Le pèlerin retire la corbeille de son épaule et la tient par ses bords ; le cohen glisse ses mains dessous, et ensemble ils la soulèvent et la balancent, vers le haut, vers le bas et aux quatre points cardinaux, puis la posent devant l\'autel, à l\'angle sud-est.', ref: 'Michna Bikkourim 3:6' },
        { fr: 'La déclaration', text: 'Le pèlerin reprend la corbeille et récite le passage « Un Araméen a voulu anéantir mon ancêtre… », jusqu\'à « …et maintenant, voici que j\'apporte les prémices des fruits de la terre que Tu m\'as donnée ». Il la dépose à l\'angle de l\'autel, se prosterne, puis s\'en va.', ref: 'Deutéronome 26:5-10 ; Michna Bikkourim 3:6' }
    ];

    return {
        SCOPES: SCOPES, SPECIES: SPECIES, SEXES: SEXES, DUTIES: DUTIES, HOLINESS: HOLINESS, TYPES: TYPES, ROWS: ROWS,
        MOUSSAF: MOUSSAF, ACCOMPANIMENTS: ACCOMPANIMENTS, SIDES: SIDES, MENAHOT: MENAHOT, MENAHOT_LABELS: MENAHOT_LABELS, MENAHOT_NOTES: MENAHOT_NOTES, TAMID: TAMID, ANIMALS: ANIMALS, ANIMAL_GROUPS: ANIMAL_GROUPS, ANIMAL_GROUP_HE: ANIMAL_GROUP_HE, ANIMAL_NOTE: ANIMAL_NOTE,
        PRINCES: PRINCES, PRINCE_OFFERING: PRINCE_OFFERING, GIFTS: GIFTS, GIFT_GROUPS: GIFT_GROUPS,
        TEROUMA: TEROUMA, TITHE_YEARS: TITHE_YEARS, LEVITES: LEVITES, SEVEN_SPECIES: SEVEN_SPECIES, SPECIES_REF: SPECIES_REF, BIKKURIM_STEPS: BIKKURIM_STEPS
    };
}));
