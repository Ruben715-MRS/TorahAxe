// =========================================================================
// === LE MACHIAH ET LA RÉSURRECTION DES MORTS — DONNÉES ===
// =========================================================================
// Contenu rédigé pour l'application à partir des sources citées (Torah, Prophètes, Talmud, Rambam). L'écran est dans js/app/messiah.js, ce qui se calcule
// dans js/messiahCore.js (testé). Chaque élément porte un `level` :
//  - 'consensus' : ce que toute la tradition classique admet ;
//  - 'opinion'   : une position d'un maître ou d'une école (les autres peuvent différer) ;
//  - 'tradition' : un récit d'aggada ou une tradition particulière, qui n'est pas une règle ni une chronologie acceptée par tous.
// Outil d'étude, pas une décision de halakha.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MessiahData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var LEVELS = ['consensus', 'opinion', 'tradition'];

    // 1. Qui est-il ? Les versets fondateurs.
    var DEFINITION = {
        he: 'מָשִׁיחַ',
        fr: 'Le Machiah (« l’oint ») est un roi juif, descendant de David par Salomon. Il rétablira la royauté davidique, reconstruira le Temple, rassemblera les exilés d’Israël et amènera le monde à la connaissance de Dieu.',
        ref: 'Rambam, Hilkhot Melakhim 11:1',
        principle: 'C’est le 12e des 13 principes de foi du Rambam : « Je crois d’une foi parfaite en la venue du Machiah, et même s’il tarde, j’attends chaque jour sa venue. »'
    };

    var VERSES = [
        { id: 'dt30', he: 'וְשָׁב ה׳ אֱלֹהֶיךָ אֶת שְׁבוּתְךָ', ref: 'Deutéronome 30:3-5', level: 'consensus',
          fr: 'Le rassemblement des exilés', text: '« L’Éternel ton Dieu ramènera tes captifs… Il te rassemblera d’entre tous les peuples. »' },
        { id: 'nb24', he: 'דָּרַךְ כּוֹכָב מִיַּעֲקֹב', ref: 'Nombres 24:17-19', level: 'consensus',
          fr: 'La prophétie de Balaam', text: '« Une étoile s’élèvera de Jacob, un sceptre surgira d’Israël. » Le Rambam y voit deux oints : David, puis le Machiah final (Hilkhot Melakhim 11:1).' },
        { id: 'is11', he: 'וְיָצָא חֹטֶר מִגֵּזַע יִשָׁי', ref: 'Isaïe 11:1-10', level: 'consensus',
          fr: 'Le rameau de Jessé', text: '« Un rameau sortira de la souche de Jessé. » Le chapitre décrit un règne de justice et une terre « remplie de la connaissance de l’Éternel » (11:9).' },
        { id: 'jr23', he: 'צֶמַח צַדִּיק', ref: 'Jérémie 23:5-6', level: 'consensus',
          fr: 'Le rejeton juste', text: 'Un roi issu de David « régnera et prospérera » et exercera le droit et la justice dans le pays.' },
        { id: 'ez37', he: 'וְעַבְדִּי דָוִד מֶלֶךְ עֲלֵיהֶם', ref: 'Ézéchiel 37:24-28', level: 'consensus',
          fr: 'Mon serviteur David', text: 'Un seul roi pour tout le peuple, qui observera les lois de Dieu ; le sanctuaire sera au milieu d’eux pour toujours.' },
        { id: 'zc9', he: 'עָנִי וְרֹכֵב עַל חֲמוֹר', ref: 'Zacharie 9:9', level: 'consensus',
          fr: 'Le roi humble', text: '« Voici que ton roi vient à toi, juste et victorieux, humble et monté sur un âne. »' },
        { id: 'dn7', he: 'כְּבַר אֱנָשׁ', ref: 'Daniel 7:13-14', level: 'consensus',
          fr: 'La vision de Daniel', text: 'Une royauté éternelle est donnée à « quelqu’un comme un fils d’homme ». Le Talmud y revient à propos de la venue du Machiah (Sanhédrin 98a).' }
    ];

    // 2. Le reconnaître : les critères du Rambam (Hilkhot Melakhim 11:4). Deux étapes ; la seconde suppose la première.
    // Les critères sont halakhiques : le Rambam n'exige aucun miracle pour la reconnaissance initiale.
    var CRITERIA = {
        ref: 'Rambam, Hilkhot Melakhim 11:4',
        stages: [
            { id: 'presume', he: 'בְּחֶזְקַת מָשִׁיחַ',
              items: [
                  { id: 'david', text: 'Il est un roi de la maison de David.' },
                  { id: 'torah', text: 'Il étudie intensément la Torah, écrite et orale.' },
                  { id: 'mitsvot', text: 'Il observe les mitsvot comme David son ancêtre.' },
                  { id: 'israel', text: 'Il conduit tout Israël à suivre la Torah et répare ses brèches.' },
                  { id: 'wars', text: 'Il mène les guerres de Dieu.' }
              ] },
            { id: 'certain', he: 'מָשִׁיחַ בְּוַדַּאי',
              items: [
                  { id: 'nations', text: 'Il réussit et vainc les nations qui l’entourent.' },
                  { id: 'temple', text: 'Il construit le Temple à son emplacement.' },
                  { id: 'exiles', text: 'Il rassemble les dispersés d’Israël.' }
              ] }
        ],
        failure: 'S’il n’a pas réussi, ou s’il a été tué, il est clair que ce n’est pas celui que la Torah a promis (Hilkhot Melakhim 11:4).',
        perfect: 'Ensuite, il perfectionne le monde pour que tous servent Dieu d’un commun accord (Sophonie 3:9 ; Hilkhot Melakhim 11:4).'
    };

    // 3. Les étapes de la venue. Un processus, pas un événement unique ; l'ordre est « approximatif, le plus courant dans les sources ».
    var STEPS = [
        { id: 'pangs', n: 1, he: 'חֶבְלֵי מָשִׁיחַ', fr: 'Les douleurs de l’enfantement du Machiah', level: 'tradition',
          text: 'Troubles, guerres, recul de la Torah, manque de respect : le Talmud décrit une période qui précède la venue. Elle peut venir « à son temps » (be’ita) ou être hâtée (a’hichena) par le mérite et la techouva.',
          refs: 'Sanhédrin 97a-98b',
          opinions: [] },
        { id: 'elijah', n: 2, he: 'אֵלִיָּהוּ הַנָּבִיא', fr: 'La venue d’Élie le prophète', level: 'consensus',
          text: 'Élie précède le Machiah pour ramener les cœurs des pères vers les enfants, établir la paix et préparer le peuple. Le moment exact de sa venue n’est pas fixé.',
          refs: 'Malachie 3:23-24 ; Érouvin 43a-b',
          opinions: [{ who: 'Certaines sources', text: 'Élie vient un jour avant le Machiah.' }] },
        { id: 'messiah', n: 3, he: 'מָשִׁיחַ בֶּן דָּוִד', fr: 'Le Machiah ben David', level: 'consensus',
          text: 'Il apparaît puis réussit progressivement : d’abord présumé Machiah, puis Machiah certain (voir l’onglet « Le reconnaître »).',
          refs: 'Rambam, Hilkhot Melakhim 11:4',
          opinions: [{ who: 'Talmud (Soucca 52a)', text: 'Un Machiah ben Yossef combattrait et mourrait avant le Machiah ben David. Le Rambam n’en parle pas dans les Hilkhot Melakhim.' }] },
        { id: 'gog', n: 4, he: 'גּוֹג וּמָגוֹג', fr: 'La guerre de Gog et Magog', level: 'opinion',
          text: 'Un conflit final contre des nations hostiles à Israël, annoncé par Ézéchiel.',
          refs: 'Ézéchiel 38-39',
          opinions: [{ who: 'Selon l’opinion courante', text: 'Le Machiah la mène et la gagne.' },
                     { who: 'Rambam', text: 'On ne sait pas si elle précède ou suit l’ère messianique : ces détails resteront cachés jusqu’à leur accomplissement (Hilkhot Melakhim 12:2).' }] },
        { id: 'temple', n: 5, he: 'בִּנְיַן הַמִּקְדָּשׁ וְקִבּוּץ גָּלֻיּוֹת', fr: 'Le Temple et le rassemblement des exilés', level: 'opinion',
          text: 'Selon le Rambam, le Machiah lui-même construit le Temple et rassemble les dispersés : c’est ce qui le rend certain.',
          refs: 'Hilkhot Melakhim 11:1 et 11:4',
          opinions: [{ who: 'Rambam', text: 'Le Machiah construit le Temple.' },
                     { who: 'D’autres opinions', text: 'Le Temple pourrait être rebâti avant sa venue.' }] },
        { id: 'era', n: 6, he: 'יְמוֹת הַמָּשִׁיחַ', fr: 'L’ère messianique', level: 'opinion',
          text: 'Paix, abondance et connaissance de Dieu qui remplit la terre (Isaïe 11:9). Fin de la sujétion aux nations : « Entre ce monde-ci et les jours du Machiah, il n’y a que la fin de l’asservissement aux royaumes. »',
          refs: 'Isaïe 11:9 ; Berakhot 34b ; Sanhédrin 91b ; Rambam, Hilkhot Melakhim 12:2',
          opinions: [{ who: 'Rambam', text: 'Le monde suit son cours naturel. Le loup avec l’agneau est une image de la paix entre Israël et les nations. Le Machiah ne change pas la nature humaine par magie : il crée les conditions pour que la Torah et la connaissance de Dieu dominent.' },
                     { who: 'Autres opinions (dont kabbalistiques)', text: 'Des changements plus miraculeux sont envisagés.' }] },
        { id: 'resurrection', n: 7, he: 'תְּחִיַּת הַמֵּתִים', fr: 'La résurrection des morts', level: 'opinion',
          text: 'Les morts reviennent à la vie. Selon le Rambam, elle a lieu après l’ère messianique, à sa conclusion, et précède le monde à venir.',
          refs: 'Maamar Techiyat haMétim ; Sanhédrin 90b-92a',
          opinions: [{ who: 'Rambam', text: 'Après l’ère messianique, à sa conclusion.' },
                     { who: 'Traditions aggadiques', text: 'D’autres chronologies existent (voir l’onglet « La résurrection »).' }] },
        { id: 'olamhaba', n: 8, he: 'עוֹלָם הַבָּא', fr: 'Le monde à venir', level: 'opinion',
          text: 'L’état final. Sa nature fait débat : monde purement spirituel des âmes, ou corps et âme réunis pour toujours.',
          refs: 'Mishna Sanhédrin 10:1',
          opinions: [{ who: 'Rambam', text: 'Un monde purement spirituel : les ressuscités meurent à nouveau et leur âme y entre.' },
                     { who: 'Saadia Gaon et une partie de la tradition', text: 'Corps et âme vivent ensemble pour toujours, dans un état sublimé.' }] }
    ];

    // 4. La résurrection.
    var RESURRECTION = {
        principle: 'C’est le 13e principe de foi du Rambam. Selon la Michna, celui qui nie que la résurrection soit dans la Torah n’a pas de part au monde à venir (Sanhédrin 10:1).',
        sources: [
            { id: 'dn12', he: 'רַבִּים מִיְּשֵׁנֵי אַדְמַת עָפָר יָקִיצוּ', ref: 'Daniel 12:2', level: 'consensus',
              text: '« Beaucoup de ceux qui dorment dans la poussière de la terre se réveilleront, les uns pour la vie éternelle, les autres pour l’opprobre et l’horreur éternelle. »' },
            { id: 'is26', he: 'יִחְיוּ מֵתֶיךָ נְבֵלָתִי יְקוּמוּן', ref: 'Isaïe 26:19', level: 'consensus',
              text: '« Tes morts vivront, mes cadavres se relèveront. » Le verset parle d’une rosée de lumière.' },
            { id: 'dt32', he: 'אֲנִי אָמִית וַאֲחַיֶּה', ref: 'Deutéronome 32:39', level: 'consensus',
              text: '« Je fais mourir et je fais vivre. »' },
            { id: 'sanh', he: 'סַנְהֶדְרִין צ׳-צ״ב', ref: 'Sanhédrin 90b-92a', level: 'consensus',
              text: 'Le Talmud tire la résurrection de nombreux versets de la Torah : par exemple, la terouma promise à Aharon, ou le pays promis aux Patriarches « pour le leur donner ». Sanhédrin 91b évoque la réunion de l’âme et du corps en vue du jugement.' }
        ],
        when: {
            rambam: 'Selon le Rambam, la résurrection des morts intervient après l’ère messianique, à sa conclusion, et précède le monde à venir.',
            ref: 'Rambam, Maamar Techiyat haMétim',
            note: 'Pour le Rambam, l’ère messianique est un événement de ce monde ; la résurrection n’a pas lieu à son début.'
        },
        who: 'Principalement les justes. Selon certaines opinions, tout Israël ; selon d’autres, aussi les justes parmi les nations. Les méchants n’y ont pas part.',
        traditions: [
            { id: 'forty', text: 'Certaines sources aggadiques évoquent une résurrection environ 40 ans après la rédemption.' },
            { id: 'olives', text: 'Le mont des Oliviers est associé au début de la résurrection, à partir de Zacharie 14:4 et de traditions midrashiques.' }
        ],
        traditionsNote: 'Ce sont des opinions ou des traditions particulières, non une chronologie acceptée par tous. Le Rambam ne fixe aucun délai de 40 ans et ne désigne pas le mont des Oliviers comme lieu du début de la résurrection.',
        // Le tableau comparatif : une ligne par aspect, une colonne par position.
        compare: [
            { id: 'when', rambam: 'Après l’ère messianique, à sa conclusion.', other: 'D’autres chronologies, aggadiques, sont proposées (40 ans après la rédemption ; début au mont des Oliviers).' },
            { id: 'kind', rambam: 'Un retour à la vie temporaire : les ressuscités meurent à nouveau.', other: 'Saadia Gaon et une partie de la tradition : une résurrection durable, le corps et l’âme vivant ensemble.' },
            { id: 'final', rambam: 'Le monde à venir est purement spirituel : l’âme y entre.', other: 'Le monde à venir réunit le corps et l’âme, dans un état sublimé qui n’a plus besoin de nourriture.' }
        ],
        safe: 'Selon le Rambam, la résurrection des morts intervient après l’ère messianique, à sa conclusion, et précède le monde à venir. Certaines traditions aggadiques proposent toutefois d’autres chronologies, notamment une résurrection environ 40 ans après la rédemption ou commençant au mont des Oliviers ; ce sont des opinions, non des faits établis.'
    };

    // 5. Ce qu'on ne sait pas.
    var HIDDEN = [
        { id: 'details', text: 'Tous ces détails et d’autres semblables, nul ne saura comment ils se dérouleront jusqu’à ce qu’ils se produisent : ils sont cachés, même aux prophètes.', ref: 'Rambam, Hilkhot Melakhim 12:2' },
        { id: 'calc', text: '« Que s’envole l’esprit de ceux qui calculent la fin » : le Talmud interdit de calculer la date de la venue.', ref: 'Sanhédrin 97b' },
        { id: 'prepare', text: 'L’essentiel n’est pas de spéculer, mais de croire, d’attendre chaque jour et de se préparer par la Torah et les mitsvot.', ref: 'Rambam, Hilkhot Melakhim 12:2' }
    ];

    // Les références talmudiques et ce que chacune établit (à ne pas confondre : seule Sanhédrin 91b parle directement de la résurrection).
    var TALMUD_REFS = [
        { id: 's97', ref: 'Sanhédrin 97a-b', object: 'Chronologie messianique, signes et incertitude sur la date' },
        { id: 's98', ref: 'Sanhédrin 98a-b', object: 'Signes, identité et venue du Machiah' },
        { id: 's91', ref: 'Sanhédrin 91b', object: 'Réunion de l’âme et du corps en vue du jugement : la doctrine de la résurrection' },
        { id: 'su52', ref: 'Soucca 52a', object: 'Machiah ben Yossef et Machiah ben David' },
        { id: 'er43', ref: 'Érouvin 43a-b', object: 'Élie et l’attente quotidienne de la venue' }
    ];

    return { LEVELS: LEVELS, DEFINITION: DEFINITION, VERSES: VERSES, CRITERIA: CRITERIA, STEPS: STEPS, RESURRECTION: RESURRECTION, HIDDEN: HIDDEN, TALMUD_REFS: TALMUD_REFS };
}));
