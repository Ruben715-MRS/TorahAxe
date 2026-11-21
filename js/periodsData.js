// =========================================================================
// === PÉRIODES ET USAGES : LES DONNÉES (interdits, permissions et obligations propres à certains moments) ===
// =========================================================================
// Consommé par js/periodsCore.js (calculs et filtres, testés dans tests/periodsCore.test.js) et js/app/periods.js (l'écran).
// Trois périodes pour commencer : la période du Omer, les Trois Semaines (Ben haMétsarim) et Yom Kippour.
//
// Une règle : { id, grp (rubrique), fr (énoncé), st, note, src, rite, sex, review }.
//  - `st` : le statut de base, celui d'un séfarade (voir RITES). C'est une chaîne ('no' interdit, 'ok' permis, 'must' obligation, 'avoid' mieux vaut s'abstenir,
//    'custom' usage), ou, si la règle change selon la sous-période, une table { id de sous-période : statut }.
//  - `note` : une précision, chaîne ou table { id de sous-période : chaîne } ; facultative.
//  - `rite` : { 'ashkenaze' | 'habad' | 'sefarade' : { st?, note? } }. Ce qui est écrit remplace le statut de base ; le reste est repris. 'habad' suit 'ashkenaze' quand rien n'est écrit pour lui.
//  - `sex` : { 'f' | 'm' : { rite?: [rites concernés], st?, note? } }, appliqué après le rite.
//  - `src` : la source, affichée sous la règle.
//  - `review` : vrai tant qu'une personne compétente n'a pas relu la règle. **Ce champ n'est JAMAIS affiché dans l'application** ; PeriodsCore.reviewList() en
//    donne la liste à qui lit les données. Une règle relue passe à `false` (ne pas supprimer le champ : le test en exige un).
//
// Tout ce contenu est rédigé pour l'application (il ne reprend aucun texte d'un autre site) à partir des sources citées. Outil d'étude, pas une décision de halakha.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PeriodsData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les rites, dans l'ordre d'affichage. Le profil de l'application (Réglages) en choisit un ; 'habad' suit l'usage ashkénaze sauf mention contraire.
    var RITES = {
        sefarade: { fr: 'Séfarade', short: 'Séfarade' },
        ashkenaze: { fr: 'Ashkénaze', short: 'Ashkénaze' },
        habad: { fr: '’Habad', short: '’Habad' }
    };
    var RITE_ORDER = ['sefarade', 'ashkenaze', 'habad'];

    // Les statuts : le symbole (jamais seul : le mot l'accompagne à l'écran), le mot, et le filtre qui les range.
    var STATUS = {
        no: { symbol: '✗', fr: 'Interdit', filter: 'no' },
        avoid: { symbol: '~', fr: 'Mieux vaut s’abstenir', filter: 'no' },
        ok: { symbol: '✓', fr: 'Permis', filter: 'ok' },
        must: { symbol: '!', fr: 'Obligation', filter: 'must' },
        custom: { symbol: '•', fr: 'Usage', filter: 'must' }
    };
    var FILTERS = ['all', 'no', 'ok', 'must'];

    // `from` / `to` : { m: id du mois (voir HebrewCalendarCore.MONTHS), d: jour }. `to` peut dépendre du rite : { rite: { sefarade: { m, d }, … }, default: { m, d } }.
    // `phases` : les sous-périodes, calculées dans js/periodsCore.js (leurs bornes ne sont pas fixes). `lead` : combien de jours avant le début la période est annoncée sur l'écran Aujourd’hui.
    var PERIODS = [
        {
            id: 'omer', he: 'עומר', fr: 'La période du Omer',
            sum: 'Entre Pessa’h et Chavouot, coutumes de deuil.',
            lead: 'Entre Pessa’h et Chavouot, le peuple d’Israël observe des coutumes de deuil, en souvenir des 24 000 élèves de Rabbi Akiva morts pendant cette période de l’année. Les jours où elles prennent fin dépendent des communautés : suivez l’usage de votre famille ou de votre rav.',
            src: 'Yevamot 62b ; Choulhan Aroukh, Ora’h ’Haïm 493',
            lead_days: 0,
            from: { m: 'Nisan', d: 16 },
            to: { default: { m: 'Iyar', d: 18 }, rite: { sefarade: { m: 'Iyar', d: 19 } } },
            until: {
                sefarade: 'jusqu’au matin du 34e jour du Omer (19 Iyar)',
                ashkenaze: 'jusqu’au 33e jour du Omer, Lag baOmer (18 Iyar)',
                habad: 'jusqu’au 33e jour du Omer, Lag baOmer (18 Iyar)'
            },
            phases: null,
            rules: [
                { id: 'omer-cheveux', grp: 'Apparence', fr: 'Se couper les cheveux', st: 'no',
                  sex: { f: { rite: ['sefarade'], st: 'ok', note: 'Permis aux femmes séfarades.' } },
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 493:2 ; Rema 493:2', review: true },
                { id: 'omer-barbe', grp: 'Apparence', fr: 'Se raser la barbe', st: 'no',
                  note: 'En cas de réelle souffrance ou pour des raisons de gagne-pain (parnassa), on peut se raser la veille de Roch ’Hodech Iyar. Si cela ne suffit pas, chaque veille de Chabbat.',
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 493:2 ; Michna Beroura 493', review: true },
                { id: 'omer-ongles', grp: 'Apparence', fr: 'Se couper les ongles', st: 'ok',
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 493', review: true },
                { id: 'omer-musique', grp: 'Musique', fr: 'Écouter de la musique avec instruments', st: 'no',
                  note: 'Les chants a cappella (sans instruments) sont permis.',
                  src: 'Michna Beroura 493 ; Yalkout Yossef (Rav Ovadia Yossef)', review: true },
                { id: 'omer-chanter', grp: 'Musique', fr: 'Chanter sans instrument', st: 'ok',
                  src: 'Michna Beroura 493', review: true },
                { id: 'omer-mariage', grp: 'Événements', fr: 'Célébrer un mariage', st: 'no',
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 493:1', review: true },
                { id: 'omer-fiancailles', grp: 'Événements', fr: 'Célébrer des fiançailles', st: 'ok',
                  note: 'Sans musique : ni écoutée, ni jouée.',
                  src: 'Michna Beroura 493', review: true },
                { id: 'omer-renovation', grp: 'Événements', fr: 'Faire des travaux de rénovation', st: 'ok',
                  src: 'À faire confirmer par un rav', review: true },
                { id: 'omer-acheter-habit', grp: 'Vêtements et nouveautés', fr: 'Acheter un nouvel habit', st: 'ok',
                  note: 'L’achat est permis ; c’est le port d’un habit neuf (qui demande la bénédiction Chééhéyanou) qui est interdit.',
                  src: 'Michna Beroura 493', review: true },
                { id: 'omer-porter-habit', grp: 'Vêtements et nouveautés', fr: 'Porter un habit neuf (Chééhéyanou)', st: 'no',
                  note: 'En cas de réel besoin, on peut le porter la veille de Chabbat ou lors d’un repas de mitsva.',
                  src: 'Michna Beroura 493', review: true },
                { id: 'omer-fruit', grp: 'Vêtements et nouveautés', fr: 'Manger un fruit nouveau (Chééhéyanou)', st: 'ok',
                  src: 'Michna Beroura 493', review: true }
            ],
            days: [
                { id: 'omer-atsmaout', fr: 'Yom Haatsmaout (5 Iyar)', date: '5 Iyar',
                  text: 'Selon Rav Ovadia Yossef, il reste interdit de se couper les cheveux et de se raser ce jour-là, même si certains se l’autorisent, et l’on ne célèbre pas de mariage. On supprime en revanche les supplications (Tahanoun) de la prière de ce jour. D’autres décisionnaires sont plus souples : demandez à votre rav.',
                  src: 'Rav Ovadia Yossef', review: true }
            ]
        },
        {
            id: 'troissemaines', he: 'בין המצרים', fr: 'Les Trois Semaines (Ben haMétsarim)',
            sum: 'Deuil pour la destruction du Temple, en trois temps.',
            lead: 'Du 17 Tamouz au 9 Av, nos Sages ont institué un deuil en souvenir de la destruction du Temple. Les règles se durcissent en trois temps : du 17 Tamouz à Roch ’Hodech Av, de Roch ’Hodech Av à la semaine du 9 Av, puis cette semaine elle-même. Les rites ne s’accordent pas sur tout : choisissez le vôtre ci-dessus. Le 9 Av lui-même (jeûne, privations du jour) n’est pas détaillé ici.',
            src: 'Michna Taanit 4:6 ; Choulhan Aroukh, Ora’h ’Haïm 551',
            lead_days: 0,
            from: { m: 'Tamuz', d: 17 },
            to: { feast: 'tichabav' },
            // Les sous-périodes (js/periodsCore.js en calcule les dates) : « semaine » est celle où tombe le 9 Av, du dimanche au 9 Av.
            phases: [
                { id: 'p1', fr: 'Du 17 Tamouz à Roch ’Hodech Av', short: '17 Tamouz → Roch ’Hodech Av' },
                { id: 'p2', fr: 'De Roch ’Hodech Av à la semaine du 9 Av', short: 'Roch ’Hodech Av → semaine du 9 Av' },
                { id: 'p3', fr: 'La semaine où tombe le 9 Av', short: 'Semaine du 9 Av' }
            ],
            rules: [
                { id: 'ts-eau-chaude', grp: 'Hygiène', fr: 'Se laver tout le corps à l’eau chaude',
                  st: { p1: 'ok', p2: 'ok', p3: 'no' }, note: { p3: 'Sauf un malade.' },
                  rite: { ashkenaze: { st: { p1: 'ok', p2: 'no', p3: 'no' } } },
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 551:16 et Rema', review: true },
                { id: 'ts-eau-froide', grp: 'Hygiène', fr: 'Se laver tout le corps à l’eau froide',
                  st: { p1: 'ok', p2: 'ok', p3: 'ok' },
                  rite: { ashkenaze: { st: { p1: 'ok', p2: 'ok', p3: 'no' } } },
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 551:16 et Rema', review: true },
                { id: 'ts-cheveux', grp: 'Hygiène', fr: 'Se couper les cheveux et se raser',
                  st: { p1: 'ok', p2: 'ok', p3: 'no' },
                  rite: { ashkenaze: { st: { p1: 'no', p2: 'no', p3: 'no' } } },
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 551 et Rema', review: true },
                { id: 'ts-ongles', grp: 'Hygiène', fr: 'Se couper les ongles',
                  st: { p1: 'ok', p2: 'ok', p3: 'ok' },
                  rite: { ashkenaze: { st: { p1: 'ok', p2: 'ok', p3: 'no' } } },
                  src: 'Michna Beroura 551', review: true },
                { id: 'ts-viande-vin', grp: 'Alimentation', fr: 'Manger de la viande et boire du vin',
                  st: { p1: 'ok', p2: 'no', p3: 'no' }, note: { p2: 'Sauf Chabbat.', p3: 'Sauf Chabbat.' },
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 551:9', review: true },
                { id: 'ts-laver-vetements', grp: 'Vêtements', fr: 'Laver des vêtements ou porter des vêtements propres',
                  st: { p1: 'ok', p2: 'ok', p3: 'no' },
                  rite: { ashkenaze: { st: { p1: 'ok', p2: 'no', p3: 'no' } } },
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 551 et Rema', review: true },
                { id: 'ts-repasser', grp: 'Vêtements', fr: 'Repasser',
                  st: { p1: 'ok', p2: 'ok', p3: 'no' },
                  rite: { ashkenaze: { st: { p1: 'ok', p2: 'no', p3: 'no' } } },
                  src: 'Michna Beroura 551', review: true },
                { id: 'ts-chanter', grp: 'Musique', fr: 'Chanter sans instrument',
                  st: { p1: 'ok', p2: 'ok', p3: 'ok' },
                  src: 'Michna Beroura 551', review: true },
                { id: 'ts-musique', grp: 'Musique', fr: 'Écouter de la musique enregistrée, danser',
                  st: { p1: 'no', p2: 'no', p3: 'no' },
                  src: 'Michna Beroura 551', review: true },
                { id: 'ts-achats-mariage', grp: 'Achats et nouveautés', fr: 'Faire les achats d’un mariage qui aura lieu après le 9 Av',
                  st: { p1: 'ok', p2: 'no', p3: 'no' }, note: { p3: 'Sauf risque de hausse de prix.' },
                  src: 'Michna Beroura 551', review: true },
                { id: 'ts-achats-habits', grp: 'Achats et nouveautés', fr: 'Acheter des vêtements ou des chaussures neufs, aller à la mer ou à la piscine',
                  st: { p1: 'ok', p2: 'avoid', p3: 'no' },
                  note: { p2: 'Mieux vaut s’en abstenir.' },
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 551 ; Michna Beroura 551', review: true },
                { id: 'ts-habit-neuf', grp: 'Achats et nouveautés', fr: 'Porter un habit neuf',
                  st: { p1: 'avoid', p2: 'avoid', p3: 'no' },
                  note: { p1: 'Mieux vaut s’en abstenir.', p2: 'Mieux vaut s’en abstenir.', p3: 'Sauf Chabbat.' },
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 551 ; Michna Beroura 551', review: true }
            ],
            days: []
        },
        {
            id: 'kippour', he: 'יום כיפור', fr: 'Yom Kippour',
            sum: 'Cinq privations et un jeûne d\u2019environ 25 heures.',
            lead: 'Le 10 Tichri, jour des expiations, est le seul jeûne fixé par la Torah elle-même. Il commence avant le coucher du soleil du 9 et se termine à la sortie des étoiles du 10. La Torah ordonne de « s’affliger » (Lévitique 16:29) : la tradition en tire cinq privations, et le jour est aussi un jour de repos complet, comme Chabbat.',
            src: 'Lévitique 16:29-31 et 23:26-32 ; Michna Yoma 8:1 ; Yoma 73b-74a ; Choulhan Aroukh, Ora’h ’Haïm 610-614',
            lead_days: 1,
            from: { m: 'Tishri', d: 10 },
            to: { default: { m: 'Tishri', d: 10 } },
            until: {
                sefarade: 'jusqu’à la sortie des étoiles',
                ashkenaze: 'jusqu’à la sortie des étoiles',
                habad: 'jusqu’à la sortie des étoiles'
            },
            phases: null,
            rules: [
                { id: 'ky-manger', grp: 'Les cinq privations', fr: 'Manger et boire', st: 'no',
                  note: 'Des exceptions existent (maladie, grossesse, accouchement, jeune enfant) : demandez à un rav.',
                  src: 'Lévitique 16:29 ; Yoma 73b-74a ; Choulhan Aroukh, Ora’h ’Haïm 610-612', review: true },
                { id: 'ky-laver', grp: 'Les cinq privations', fr: 'Se laver (pour le plaisir)', st: 'no',
                  src: 'Yoma 73b ; Choulhan Aroukh, Ora’h ’Haïm 613', review: true },
                { id: 'ky-oindre', grp: 'Les cinq privations', fr: 'S’oindre (huile, crème, parfum sur le corps)', st: 'no',
                  note: 'Sauf usage médical.',
                  src: 'Yoma 73b ; Choulhan Aroukh, Ora’h ’Haïm 614', review: true },
                { id: 'ky-cuir', grp: 'Les cinq privations', fr: 'Porter des chaussures en cuir', st: 'no',
                  src: 'Yoma 73b ; Choulhan Aroukh, Ora’h ’Haïm 614', review: true },
                { id: 'ky-conjugal', grp: 'Les cinq privations', fr: 'Relations conjugales', st: 'no',
                  src: 'Yoma 73b ; Choulhan Aroukh, Ora’h ’Haïm 615', review: true },
                { id: 'ky-melakha', grp: 'Autres règles du jour', fr: 'Faire un travail interdit à Chabbat', st: 'no',
                  note: 'Les mêmes travaux qu’à Chabbat sont interdits ; la Torah appelle ce jour « Chabbat chabbaton » (Lévitique 23:32).',
                  src: 'Lévitique 16:31 et 23:28-32', review: true },
                { id: 'ky-mains', grp: 'Autres règles du jour', fr: 'Se laver les mains (au réveil, après les toilettes)', st: 'ok',
                  note: 'Seulement jusqu’aux jointures des doigts.',
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 613', review: true },
                { id: 'ky-chaussures-tissu', grp: 'Autres règles du jour', fr: 'Porter des chaussures en tissu, en plastique ou en caoutchouc', st: 'ok',
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 614', review: true },
                { id: 'ky-veille', grp: 'À faire', fr: 'Manger et boire abondamment la veille (9 Tichri)', st: 'must',
                  note: 'C’est une mitsva, avant le début du jeûne.',
                  src: 'Berakhot 8b ; Yoma 81b ; Choulhan Aroukh, Ora’h ’Haïm 604', review: true },
                { id: 'ky-tossefet', grp: 'À faire', fr: 'Commencer le jeûne avant le coucher du soleil et le prolonger après la sortie des étoiles', st: 'must',
                  note: 'On « ajoute du profane au sacré » (tossefet).',
                  src: 'Rosh Hachana 9a ; Choulhan Aroukh, Ora’h ’Haïm 608', review: true },
                { id: 'ky-prieres', grp: 'À faire', fr: 'Dire les cinq prières du jour (Arvit avec Kol Nidré, Chaharit, Moussaf, Minha, Néïla)', st: 'must',
                  note: 'Le Vidouï (confession) se dit dans chaque Amida.',
                  src: 'Choulhan Aroukh, Ora’h ’Haïm 619-623', review: true },
                { id: 'ky-kittel', grp: 'À faire', fr: 'Porter des habits blancs (kittel)', st: 'ok',
                  note: 'Habits de fête ; le kittel blanc n’est pas un usage répandu chez les séfarades.',
                  rite: { ashkenaze: { st: 'custom', note: 'Usage des hommes ashkénazes : le kittel, habit blanc qui rappelle la pureté et le linceul.' } },
                  src: 'Rema, Ora’h ’Haïm 610:4', review: true }
            ],
            days: []
        }
    ];

    return { RITES: RITES, RITE_ORDER: RITE_ORDER, STATUS: STATUS, FILTERS: FILTERS, PERIODS: PERIODS };
}));
