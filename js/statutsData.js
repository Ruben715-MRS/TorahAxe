// =========================================================================
// === TORAHAXE — STATUTS PERSONNELS ET UNIONS INTERDITES : DONNÉES ===
// =========================================================================
// Le contenu de l'écran « Statuts et unions » (Atelier, groupe « Bible et tradition ») : le catalogue des statuts (cohen, lévi, israël, 'halal,
// mamzer, guer, divorcée, veuve…), puis les raisons et les sources de chaque règle du calculateur « père + mère → union et enfant ». Les calculs
// sont dans js/statutsCore.js (testés dans tests/statutsCore.test.js).
//
// Source unique : le Rambam, Michné Torah, Séfer Kédoucha, Hilkhot Issouré Biah (ch. 1, 12, 15, 17, 18, 19), avec le principe de la Michna
// Kidouchin 3:12 pour la transmission du statut. Chaque règle cite sa halakha ; les citations sont vérifiées contre le texte hébreu.
// C'est un outil pédagogique d'étude du Rambam, pas une décision halakhique : le Choulhan Aroukh et les usages locaux peuvent différer.
//
// Choix de périmètre (version de départ) :
//  - Les statuts de père et de mère sont ceux d'une personne « telle qu'elle est » ; la PARENTÉ (mère, sœur, tante…) est un autre axe, non traité ici.
//  - Le doute (chétouki, assoufi, mamzer douteux) et les statuts qui n'ont plus de portée pratique selon le Rambam lui-même (Ammon, Moav, Égypte,
//    Édom : 12:25 ; nétinim) sont dans le catalogue mais pas dans le calculateur.
//  - Le Cohen Gadol (qui ne peut épouser ni veuve ni non-vierge) est dans le catalogue ; il n'est pas dans le calculateur.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StatutsData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Les familles de statuts, dans l'ordre d'affichage du catalogue --------------------------------------------------
    var GROUPS = [
        { id: 'tribus', fr: 'Cohen, Lévi, Israël', lead: 'Les trois « branches » du peuple juif. Le statut passe par le père.' },
        { id: 'diminues', fr: 'Statuts diminués', lead: 'Des Juifs dont le statut est restreint par la naissance : le \'halal, le mamzer, et ceux dont le père est inconnu.' },
        { id: 'convertis', fr: 'Convertis', lead: 'Ceux qui sont entrés dans le peuple juif par la conversion, ou qui l\'étaient autrefois par les nations d\'Ammon, Moav, Égypte, Édom.' },
        { id: 'femmes', fr: 'Statuts propres aux femmes', lead: 'Des états de la femme juive qui comptent pour le mariage, surtout avec un cohen.' },
        { id: 'dehors', fr: 'Non-Juifs et esclaves', lead: 'Hors du peuple juif, ou à son seuil : le non-Juif, l\'esclave cananéen.' }
    ];

    // --- Les statuts ------------------------------------------------------------------------------------------------------
    // id         : identifiant (aussi l'identifiant du statut de l'enfant). Pour un statut qui a une forme masculine et une forme féminine, c'est le même id.
    // fr / frF   : libellé masculin / féminin (frF absent : le même).
    // he / heF   : hébreu masculin / féminin.
    // father / mother : le statut peut être choisi pour le père / pour la mère dans le calculateur.
    // skip       : pour un statut du catalogue seul, la raison de son absence du calculateur.
    var STATUSES = [
        { id: 'cohen', group: 'tribus', fr: 'Cohen', frF: 'Bat cohen', he: 'כהן', heF: 'בת כהן', father: true, mother: true,
          summary: 'Descendant d\'Aharon, de père en fils. Le cohen ne peut épouser ni une divorcée, ni une zona, ni une \'halala (Lévitique 21:7) ; les sages ont ajouté la \'halouça. Sa fille, la bat cohen, peut épouser un \'halal ou un guer.',
          ref: 'Issouré Biah 17:1, 17:7, 19:11' },
        { id: 'levi', group: 'tribus', fr: 'Lévi', frF: 'Bat lévi', he: 'לוי', heF: 'בת לוי', father: true, mother: true,
          summary: 'Descendant de la tribu de Lévi par son père. Aucune restriction de mariage particulière : il peut épouser toute Juive que la Torah n\'interdit pas à un Israël.',
          ref: 'Issouré Biah 19:15' },
        { id: 'israel', group: 'tribus', fr: 'Israël', frF: 'Bat Israël', he: 'ישראל', heF: 'בת ישראל', father: true, mother: true,
          summary: 'Juif de naissance qui n\'est ni cohen ni lévi. Le mot désigne aussi, par défaut, tout Juif « ordinaire » (kasher) : ni \'halal, ni mamzer.',
          ref: 'Issouré Biah 19:15' },
        { id: 'halal', group: 'diminues', fr: '\'Halal', frF: '\'Halala', he: 'חלל', heF: 'חללה', father: true, mother: true,
          summary: 'Né d\'un cohen et d\'une femme qui lui était interdite (divorcée, zona, \'halala, convertie). Le statut passe de père en fils pour toujours : le fils d\'un \'halal est \'halal, même mille générations plus tard. Le \'halal n\'est plus cohen ; il peut épouser une divorcée. La \'halala est interdite au cohen, mais la fille qu\'un Israël a d\'une \'halala est kasher.',
          ref: 'Issouré Biah 19:1, 19:3, 19:10, 19:14' },
        { id: 'mamzer', group: 'diminues', fr: 'Mamzer', frF: 'Mamzeret', he: 'ממזר', heF: 'ממזרת', father: true, mother: true,
          summary: 'Né d\'une union interdite par la Torah sous peine de retranchement (inceste, adultère), sauf la niddah (Deutéronome 23:3). Il ne peut épouser qu\'une mamzeret ou une convertie, et ses enfants le restent : l\'interdit est permanent. Il n\'a pas de faute personnelle.',
          ref: 'Issouré Biah 15:1, 15:7, 15:21' },
        { id: 'ger', group: 'convertis', fr: 'Guer', frF: 'Guiyoret', he: 'גר', heF: 'גיורת', father: true, mother: true,
          summary: 'Converti ou convertie. Après la conversion, le guer est comme Israël en tout (Nombres 15:15). Un guer peut épouser une mamzeret, et la guiyoret est interdite au cohen, qui la traite comme une zona. L\'enfant d\'un guer et d\'une Israélite (ou d\'un Israël et d\'une guiyoret) est Israël à part entière.',
          ref: 'Issouré Biah 12:17, 15:7, 15:9, 18:3, 19:11, 19:16' },
        { id: 'gerushah', group: 'femmes', fr: 'Divorcée', he: 'גרושה', father: false, mother: true,
          summary: 'Femme que son mari a répudiée par un guet. Interdite au cohen (Lévitique 21:7), permise à tout autre Juif ; l\'enfant qu\'un cohen a d\'elle est \'halal.',
          ref: 'Issouré Biah 17:1, 19:3' },
        { id: 'almanah', group: 'femmes', fr: 'Veuve', he: 'אלמנה', father: false, mother: true,
          summary: 'Femme dont le mari est mort. Permise au cohen ordinaire ; seul le Cohen Gadol (grand prêtre) ne peut l\'épouser.',
          ref: 'Issouré Biah 17:1' },
        { id: 'halutzah', group: 'femmes', fr: '\'Halouça', he: 'חלוצה', father: false, mother: true,
          summary: 'Veuve sans enfant qui a fait la \'halitsa (déchaussement) avec son beau-frère au lieu du lévirat. Interdite au cohen par décret des sages (comme une divorcée), permise aux autres.',
          ref: 'Issouré Biah 17:7, 19:8' },
        { id: 'zonah', group: 'femmes', fr: 'Zona', he: 'זונה', father: false, mother: true,
          summary: 'Terme technique, sans le sens péjoratif courant : Juive qui a eu une relation interdite à elle par un interdit égal pour tous (parenté, ou un non-Juif, mamzer, \'halal…). Interdite au cohen, permise aux autres. Le Rambam appelle aussi « zona » la convertie.',
          ref: 'Issouré Biah 18:1, 18:2, 18:3' },
        { id: 'eshet_ish', group: 'femmes', fr: 'Femme mariée', he: 'אשת איש', father: false, mother: true,
          summary: 'Femme mariée à un autre homme que le père (en hébreu : « eshet ich »). C\'est une \'erva : l\'union est un adultère, passible du retranchement et, par le tribunal, de la strangulation. Les kidouchin n\'ont aucun effet ; l\'enfant est mamzer, sauf si le père est un non-Juif ou un esclave.',
          ref: 'Issouré Biah 1:6, 15:1, 15:3' },
        { id: 'nochri', group: 'dehors', fr: 'Non-Juif', frF: 'Non-Juive', he: 'נכרי', heF: 'נכרית', father: true, mother: true,
          summary: 'Quelqu\'un qui n\'appartient pas au peuple juif (goy). Un Juif ne peut pas l\'épouser (Deutéronome 7:3), les kidouchin n\'ont pas d\'effet, et l\'enfant suit sa mère : l\'enfant d\'une non-Juive est non-Juif. Converti, l\'enfant est un guer kasher.',
          ref: 'Issouré Biah 12:1, 12:17, 15:3, 15:4' },
        { id: 'eved', group: 'dehors', fr: 'Esclave cananéen', frF: 'Shifha', he: 'עבד כנעני', heF: 'שפחה', father: false, mother: true,
          summary: 'Non-Juif qui a été immergé et a accepté les commandements des esclaves : il sort de l\'ensemble des non-Juifs sans entrer dans celui des Juifs. La shifha est interdite à l\'homme libre (par décret rabbinique) ; seul le mamzer peut l\'épouser, ce qui libère ses enfants. L\'enfant de la shifha est esclave ; une fois affranchi, il est kasher.',
          ref: 'Issouré Biah 12:11, 15:3, 15:4' },
        { id: 'kohen_gadol', group: 'tribus', fr: 'Cohen Gadol', he: 'כהן גדול', father: false, mother: false,
          summary: 'Grand prêtre (ou prêtre oint pour la guerre). Il ne peut épouser qu\'une vierge : à la divorcée, à la zona et à la \'halala s\'ajoute la veuve (Lévitique 21:14).',
          ref: 'Issouré Biah 17:1, 17:3', skip: 'ajoute l\'interdit de la veuve et l\'exigence de virginité : à ajouter à une version suivante' },
        { id: 'shetuki', group: 'diminues', fr: 'Chétouki / Assoufi', he: 'שתוקי / אסופי', father: false, mother: false,
          summary: 'Le chétouki connaît sa mère mais pas son père ; l\'assoufi est un enfant trouvé, abandonné. Ce sont des mamzerim douteux (safek) : les sages leur interdisent d\'épouser une Israélite ou un autre douteux ; ils ne peuvent épouser que des convertis.',
          ref: 'Issouré Biah 15:12, 15:13, 15:21, 15:23', skip: 'le doute demande une logique à part (« peut-être »)' },
        { id: 'natin', group: 'diminues', fr: 'Natin', he: 'נתין', father: false, mother: false,
          summary: 'Descendant des Gabaonites, ces convertis que Yehoshoua puis David ont écartés de la communauté. Le natin est assimilé au mamzer pour le mariage : mamzer et natin peuvent s\'unir entre eux ; l\'enfant est mamzer.',
          ref: 'Issouré Biah 12:22, 12:23, 15:33', skip: 'son identification n\'est pas tranchée dans le calculateur' },
        { id: 'ammoni', group: 'convertis', fr: 'Guer ammonite ou moabite', frF: 'Guiyoret ammonite ou moabite', he: 'עמוני ומואבי', father: false, mother: false,
          summary: 'Selon la Torah, l\'Ammonite et le Moabite (hommes) ne peuvent jamais épouser une Juive, leurs femmes sont permises. Mais Sennachérib a mêlé les peuples : le Rambam tient que tout converti, d\'où qu\'il vienne, est permis aujourd\'hui.',
          ref: 'Issouré Biah 12:18, 12:25', skip: 'sans portée pratique selon le Rambam lui-même (12:25)' },
        { id: 'mitsri', group: 'convertis', fr: 'Guer égyptien ou édomite', frF: 'Guiyoret égyptienne ou édomite', he: 'מצרי ואדומי', father: false, mother: false,
          summary: 'Interdit à la communauté pour deux générations ; la troisième est permise (Deutéronome 23:9). Comme pour Ammon et Moav, le Rambam tient que ces peuples sont mêlés et que tout converti est permis aujourd\'hui.',
          ref: 'Issouré Biah 12:19, 12:25', skip: 'sans portée pratique selon le Rambam lui-même (12:25)' }
    ];

    // --- Les niveaux d'interdit d'une union ----------------------------------------------------------------------------------
    var LEVELS = {
        permise: 'Permise',
        rabbinique: 'Interdite par les sages',
        lav: 'Interdite par la Torah',
        erva: 'Interdite par la Torah (\'erva)'
    };

    // --- Les raisons des règles (le texte affiché sous le résultat) ---------------------------------------------------------
    // Chaque raison : fr (la règle en une phrase), ref (la halakha du Rambam, ou la Michna).
    var REASONS = {
        // L'union
        'union-permise': { fr: 'Aucun interdit ne s\'applique à cette union.', ref: '' },
        'union-nochri': { fr: 'Un Juif ne peut pas épouser une non-Juive, ni une Juive un non-Juif : « Tu ne t\'allieras pas par mariage avec eux » (Deutéronome 7:3). L\'interdit vaut pour toutes les nations.', ref: 'Issouré Biah 12:1' },
        'union-cohen-femmes': { fr: 'Le cohen ne peut épouser ni divorcée, ni zona, ni \'halala (Lévitique 21:7) : la convertie est assimilée à la zona, et la \'halala vaut la zona.', ref: 'Issouré Biah 17:1, 18:3, 19:11' },
        'union-cohen-halutzah': { fr: 'La \'halouça est interdite au cohen par décret des sages seulement, comme une divorcée.', ref: 'Issouré Biah 17:7' },
        'union-cohen-shifha': { fr: 'Toute femme qui n\'est pas une Israélite est une « zona » au sens de la Torah : interdite au cohen.', ref: 'Issouré Biah 18:1, 17:6' },
        'union-mamzer': { fr: '« Un mamzer n\'entrera pas dans l\'assemblée de l\'Éternel » (Deutéronome 23:3) : un mamzer ne peut épouser qu\'une mamzeret ou une convertie, et une mamzeret qu\'un mamzer ou un guer.', ref: 'Issouré Biah 15:2, 15:7, 19:11' },
        'union-mamzer-shifha': { fr: 'Les sages ont permis au mamzer d\'épouser une shifha : ses enfants seront esclaves, puis affranchis, donc kasher.', ref: 'Issouré Biah 15:4' },
        'union-shifha': { fr: 'La shifha est interdite à l\'homme libre par décret des sages : sans peine de la Torah, mais passible de la makat mardout.', ref: 'Issouré Biah 12:11' },
        'union-eshet-ish': { fr: 'Une femme mariée est une \'erva : l\'union est un adultère, passible du retranchement (karet) et, devant un tribunal, de la strangulation.', ref: 'Issouré Biah 1:6' },

        // La transmission
        'enfant-pere': { fr: 'Les kidouchin prennent et il n\'y a pas de faute : l\'enfant suit son père.', ref: 'Michna Kidouchin 3:12 ; Issouré Biah 19:15' },
        'enfant-pagoum': { fr: 'Les kidouchin prennent mais il y a une faute : l\'enfant suit le côté diminué (« pagoum »).', ref: 'Michna Kidouchin 3:12 ; Issouré Biah 15:7' },
        'enfant-mere': { fr: 'Les kidouchin n\'ont pas d\'effet : l\'enfant suit sa mère.', ref: 'Issouré Biah 15:4' },
        'enfant-erva': { fr: 'L\'enfant né d\'une \'erva (adultère, inceste), sauf la niddah, est mamzer.', ref: 'Issouré Biah 15:1' },
        'enfant-nochri-juive': { fr: 'L\'enfant d\'un non-Juif ou d\'un esclave et d\'une Israélite est kasher : il suit sa mère. Mais si la mère est mamzeret, l\'enfant est mamzer.', ref: 'Issouré Biah 15:3' },
        'enfant-eshet-ish-nochri': { fr: 'Même la femme mariée : l\'enfant qu\'elle a d\'un non-Juif ou d\'un esclave est kasher, car le mari ne peut pas l\'en démentir.', ref: 'Issouré Biah 15:3, 15:19' },
        'enfant-halal': { fr: 'Le fils d\'un cohen et d\'une femme qui lui est interdite est \'halal, et le fils d\'un \'halal est \'halal pour toujours.', ref: 'Issouré Biah 19:3, 19:6, 19:14' },
        'enfant-halal-rabbinique': { fr: 'L\'enfant est \'halal, mais seulement par décret des sages (la \'halouça étant interdite au cohen par eux).', ref: 'Issouré Biah 19:8' }
    };

    // --- Notes (informations supplémentaires, attachées à des combinaisons précises) ---------------------------------
    var NOTES = {
        'mere-zona': { fr: 'La Juive qui a une relation avec un non-Juif devient « zona » : elle est désormais interdite au cohen. Si elle est bat cohen, elle perd aussi la terouma.', ref: 'Issouré Biah 18:3' },
        'cohen-nochri': { fr: 'Pour le cohen, la relation avec une non-Juive est aussi passible des lashes au titre de « zona », même sans kidouchin.', ref: 'Issouré Biah 12:3, 17:6' },
        'convertis-fille': { fr: 'Si le père et la mère sont tous deux convertis, sans ancêtre israélite, une fille de ce couple (même des générations plus tard) est interdite au cohen. L\'enfant est Israël kasher, mais cette fille ne pourra pas épouser un cohen.', ref: 'Issouré Biah 19:12' },
        'halal-fille-israel': { fr: 'La fille qu\'un Israël a d\'une \'halala est kasher et peut épouser un cohen d\'emblée.', ref: 'Issouré Biah 19:14' },
        'bat-cohen-ger-halal': { fr: 'La bat cohen peut épouser un \'halal ou un guer : l\'interdit de Lévitique 21 vise « les fils d\'Aharon », pas ses filles.', ref: 'Issouré Biah 19:11' },
        'almanah-cohen': { fr: 'Seul le Cohen Gadol ne peut épouser une veuve ; le cohen ordinaire le peut. Le Cohen Gadol n\'est pas encore dans le calculateur.', ref: 'Issouré Biah 17:1' },
        'enfant-converti': { fr: 'Si cet enfant se convertit, il est un guer kasher comme les autres.', ref: 'Issouré Biah 15:3, 12:17' },
        'enfant-affranchi': { fr: 'Affranchi, l\'enfant d\'une shifha devient kasher.', ref: 'Issouré Biah 15:3' },
        'hors-champ': { fr: 'Aucune loi d\'union juive ne s\'applique entre deux personnes hors du peuple juif.', ref: '' }
    };

    return { GROUPS: GROUPS, STATUSES: STATUSES, LEVELS: LEVELS, REASONS: REASONS, NOTES: NOTES };
}));
