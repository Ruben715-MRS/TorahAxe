// =========================================================================
// === TORAHAXE — « QUI SUIS-JE ? » : LES PERSONNAGES DE LA BIBLE ET LEURS INDICES (données écrites à la main) ===
// =========================================================================
// Vingt-neuf personnages de la Bible, chacun avec cinq indices qui vont du plus vague au plus précis (le dernier suffit à le reconnaître parmi tous les autres).
// Chaque indice est un fait du texte biblique (Genèse à Chroniques) ou, quand c'est une tradition, il le dit (« selon la tradition »). Aucun indice ne contient le nom
// du personnage ni l'un de ses autres noms (tests/whoGameCore.test.js le vérifie), et ils sont écrits à la première personne, au féminin pour les femmes.
// Les noms français sont ceux de l'arbre généalogique de l'outil (js/genealogyCore.js : « Anne » pour Hanna, « Bath-Schéba », « Sanson »…).
// Les sages du Talmud, eux, ne sont pas écrits ici : leurs indices sont tirés du dictionnaire araméen (js/gemaraCore.js), par js/whoGameCore.js.
// Champs : id, fr, he, sex ('m' | 'f'), grp (le groupe, pour choisir des fausses réponses voisines), aliases (autres noms, à ne jamais montrer), clues (5 indices).
// Contenu écrit à la main d'après le texte biblique : à relire par une personne compétente.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.WhoData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var BIBLE = [
        { id: 'adam', fr: 'Adam', he: 'אדם', sex: 'm', grp: 'origines', aliases: [], clues: [
            'Je suis mort à l’âge de 930 ans.',
            'Je n’ai connu ni père ni mère.',
            'J’ai vécu dans un jardin que Dieu avait planté à l’est, en Éden.',
            'C’est moi qui ai donné leur nom à tous les animaux.',
            'Je suis le premier être humain ; mon épouse s’appelle Ève.'] },
        { id: 'noe', fr: 'Noé', he: 'נח', sex: 'm', grp: 'origines', aliases: ['Noah'], clues: [
            'J’ai vécu 950 ans.',
            'Mon père s’appelait Lémec et mon grand-père, Metuschélah.',
            'J’ai eu trois fils : Sem, Cham et Japhet.',
            'Dieu m’a ordonné de construire une arche en bois.',
            'J’ai survécu au Déluge avec ma famille et des animaux de chaque espèce.'] },
        { id: 'abraham', fr: 'Abraham', he: 'אברהם', sex: 'm', grp: 'patriarches', aliases: ['Abram'], clues: [
            'J’ai vécu 175 ans.',
            'Mon père s’appelait Téra’h ; mes frères, Na’hor et Haran.',
            'Dieu m’a dit : « Va-t’en de ton pays, de ta famille et de la maison de ton père. »',
            'J’ai acheté la grotte de Makhpéla pour y enterrer mon épouse.',
            'J’ai failli sacrifier mon fils Isaac sur l’ordre de Dieu, puis un bélier a pris sa place.'] },
        { id: 'sara', fr: 'Sara', he: 'שרה', sex: 'f', grp: 'matriarches', aliases: ['Sarah', 'Saraï', 'Yisca'], clues: [
            'Je suis morte à 127 ans, à Kiryat-Arba, c’est-à-dire Hébron.',
            'J’ai été emmenée de force chez Pharaon, puis chez Avimélekh à Guérar.',
            'J’ai demandé à mon mari de renvoyer ma servante Hagar et son fils.',
            'J’ai ri quand on m’a annoncé que j’aurais un fils, à mon âge.',
            'Mon mari est Abraham et mon fils, Isaac.'] },
        { id: 'isaac', fr: 'Isaac', he: 'יצחק', sex: 'm', grp: 'patriarches', aliases: ['Yitshak', 'Yitzhak'], clues: [
            'Je suis né quand mon père avait 100 ans.',
            'J’ai failli être sacrifié sur une montagne.',
            'J’ai creusé de nouveau les puits qu’avait creusés mon père.',
            'Mon épouse Rébecca m’a donné deux fils jumeaux.',
            'J’avais les yeux affaiblis quand j’ai béni mon fils Jacob, croyant bénir Esaü.'] },
        { id: 'jacob', fr: 'Jacob', he: 'יעקב', sex: 'm', grp: 'patriarches', aliases: ['Israël', 'Yaakov'], clues: [
            'J’ai vécu 147 ans.',
            'J’ai quitté la maison de mes parents pour Harân, chez mon oncle Laban.',
            'J’ai lutté une nuit entière avec un être mystérieux, qui m’a donné un autre nom.',
            'J’ai eu douze fils, nés de quatre femmes.',
            'Mon frère jumeau s’appelle Esaü, et mon fils préféré, Joseph.'] },
        { id: 'joseph', fr: 'Joseph', he: 'יוסף', sex: 'm', grp: 'autres', aliases: ['Yossef'], clues: [
            'Je suis le onzième des douze fils de mon père.',
            'Mes frères m’ont jeté dans un puits, puis m’ont vendu à des marchands.',
            'J’ai interprété des rêves en prison.',
            'Je suis devenu vice-roi d’Égypte, juste après Pharaon.',
            'Mes deux fils s’appellent Ménaché et Éphraïm.'] },
        { id: 'rachel', fr: 'Rachel', he: 'רחל', sex: 'f', grp: 'matriarches', aliases: [], clues: [
            'J’étais la cadette de deux sœurs.',
            'Mon mari a travaillé sept ans pour m’obtenir, mais mon père lui a d’abord donné ma sœur.',
            'J’ai longtemps été stérile.',
            'Mes fils s’appellent Joseph et Benjamin.',
            'Je suis morte en chemin, près de Bethléem, et j’y ai été enterrée.'] },
        { id: 'lea', fr: 'Léa', he: 'לאה', sex: 'f', grp: 'matriarches', aliases: ['Léah'], clues: [
            'J’étais l’aînée de deux sœurs.',
            'Mon père m’a donnée à mon mari dans l’obscurité du soir, sans que celui-ci le sache.',
            'Mon mari m’aimait moins que ma sœur.',
            'J’ai donné six fils et une fille à mon mari.',
            'Deux de mes fils, Lévi et Juda, sont les ancêtres des prêtres et des rois d’Israël.'] },
        { id: 'moise', fr: 'Moïse', he: 'משה', sex: 'm', grp: 'sortie', aliases: ['Moshé', 'Moché'], clues: [
            'J’ai vécu 120 ans.',
            'J’ai été sauvé des eaux du Nil dans une corbeille de jonc.',
            'J’ai vu un buisson qui brûlait sans se consumer.',
            'Mon frère Aaron et moi avons demandé à Pharaon de laisser partir le peuple.',
            'J’ai reçu la Torah au mont Sinaï, mais je n’ai pas pu entrer en terre d’Israël.'] },
        { id: 'aaron', fr: 'Aaron', he: 'אהרן', sex: 'm', grp: 'sortie', aliases: ['Aharon'], clues: [
            'J’ai vécu 123 ans.',
            'Ma sœur s’appelle Miriam et mon frère, Moïse.',
            'Mon bâton a fleuri et a produit des amandes.',
            'J’ai été le premier grand prêtre.',
            'Deux de mes fils, Nadav et Avihou, sont morts en offrant un feu étranger.'] },
        { id: 'miriam', fr: 'Miriam', he: 'מרים', sex: 'f', grp: 'sortie', aliases: ['Myriam', 'Miryam'], clues: [
            'Selon la tradition, je suis l’une des sept prophétesses d’Israël.',
            'J’ai veillé de loin sur un bébé qui flottait sur le Nil.',
            'Après la traversée de la mer, les femmes m’ont suivie avec des tambourins.',
            'J’ai parlé contre mon frère et je suis devenue blanche comme la neige ; le peuple n’est pas reparti avant que je sois réintégrée dans le camp.',
            'Mes frères sont Moïse et Aaron ; je suis morte à Kadesh.'] },
        { id: 'josue', fr: 'Josué', he: 'יהושע', sex: 'm', grp: 'sortie', aliases: ['Yehoshoua'], clues: [
            'J’ai pris la tête du peuple après la mort de mon maître.',
            'J’étais l’un des douze explorateurs envoyés en Canaan, et l’un des deux seuls à en rapporter un bon rapport.',
            'J’ai fait tomber les murailles d’une ville au son des chofars.',
            'J’ai ordonné au soleil de s’arrêter à Gabaon.',
            'Je suis le fils de Noun, et j’ai partagé le pays entre les tribus.'] },
        { id: 'samson', fr: 'Sanson', he: 'שמשון', sex: 'm', grp: 'juges', aliases: ['Samson', 'Shimshon'], clues: [
            'Un ange a annoncé ma naissance à ma mère.',
            'Je suis nazir depuis le ventre de ma mère : le rasoir ne doit pas toucher ma tête.',
            'J’ai tué un lion à mains nues.',
            'J’ai attaché des torches à la queue de renards pour incendier les champs de mes ennemis.',
            'Dalila m’a coupé les cheveux ; aveuglé, j’ai fait s’écrouler un temple sur les Philistins.'] },
        { id: 'deborah', fr: 'Déborah', he: 'דבורה', sex: 'f', grp: 'juges', aliases: ['Devorah'], clues: [
            'Je rendais la justice sous un palmier, entre Rama et Béthel.',
            'J’étais prophétesse, et mon mari s’appelait Lappidot.',
            'J’ai fait appeler Barak pour lui ordonner d’attaquer l’armée de Sisera.',
            'Une femme nommée Yaël a achevé le chef ennemi avec un piquet de tente.',
            'J’ai chanté un cantique avec Barak après la victoire.'] },
        { id: 'gideon', fr: 'Gédéon', he: 'גדעון', sex: 'm', grp: 'juges', aliases: ['Gideon', 'Yeroubaal'], clues: [
            'Je battais du blé dans un pressoir pour le cacher aux Madianites.',
            'Je me disais le plus petit de la maison de mon père, dans la plus faible famille de Manassé.',
            'J’ai demandé deux signes à Dieu, avec une toison de laine et la rosée.',
            'Dieu m’a fait réduire mon armée de 32 000 à 300 hommes.',
            'Nous avons vaincu Madian avec des cruches, des torches et des chofars.'] },
        { id: 'samuel', fr: 'Samuel', he: 'שמואל', sex: 'm', grp: 'prophetes', aliases: ['Chmouel'], clues: [
            'Ma mère m’a obtenu par ses prières, puis m’a confié au sanctuaire dès mon enfance.',
            'Une nuit, une voix m’a appelé trois fois, et j’ai cru que c’était mon maître.',
            'J’ai été à la fois juge et prophète.',
            'J’ai oint deux rois d’Israël.',
            'Mon maître s’appelait Éli et ma mère, Anne.'] },
        { id: 'saul', fr: 'Saül', he: 'שאול', sex: 'm', grp: 'rois', aliases: ['Chaoul'], clues: [
            'Je suis de la tribu de Benjamin, et je dépassais tout le peuple de la tête et des épaules.',
            'Je cherchais les ânesses de mon père quand mon avenir a changé.',
            'J’ai été le premier roi d’Israël.',
            'J’ai jalousé mon jeune successeur après ses victoires.',
            'J’ai consulté une nécromancienne à En-Dor avant ma dernière bataille.'] },
        { id: 'david', fr: 'David', he: 'דוד', sex: 'm', grp: 'rois', aliases: [], clues: [
            'J’ai régné sept ans à Hébron, puis trente-trois ans à Jérusalem.',
            'J’étais le plus jeune des huit fils de Jessé.',
            'J’ai vaincu un géant avec une pierre et une fronde.',
            'J’ai dû fuir devant le roi que j’avais pourtant servi en jouant de la harpe.',
            'Je suis le père de Salomon, et on me doit de nombreux psaumes.'] },
        { id: 'salomon', fr: 'Salomon', he: 'שלמה', sex: 'm', grp: 'rois', aliases: ['Chlomo'], clues: [
            'Je suis monté sur le trône alors que mon frère aîné Adoniyahou se proclamait roi à ma place.',
            'Ma mère s’appelle Bath-Schéba.',
            'J’ai demandé à Dieu un cœur qui comprend, plutôt que la richesse.',
            'Deux femmes se disputaient un enfant : j’ai proposé de le couper en deux.',
            'J’ai bâti le premier Temple de Jérusalem.'] },
        { id: 'ezechias', fr: 'Ézéchias', he: 'חזקיהו', sex: 'm', grp: 'rois', aliases: ['Hizkiyahou'], clues: [
            'J’ai fait détruire le serpent d’airain que Moïse avait fabriqué.',
            'Je suis tombé gravement malade, et Dieu a ajouté quinze ans à ma vie.',
            'J’ai montré tous mes trésors aux envoyés du roi de Babylone.',
            'Sennachérib a assiégé Jérusalem, mais son armée a été frappée pendant la nuit.',
            'Mon père s’appelait Achaz, mon fils Manassé, et le prophète Isaïe m’a conseillé.'] },
        { id: 'josias', fr: 'Josias', he: 'יאשיהו', sex: 'm', grp: 'rois', aliases: ['Yoshiyahou'], clues: [
            'J’avais huit ans quand je suis devenu roi.',
            'On a retrouvé un rouleau de la Torah dans le Temple pendant mes travaux.',
            'J’ai déchiré mes vêtements en entendant ses paroles.',
            'J’ai fait célébrer une Pâque que l’on n’avait pas vue depuis les juges.',
            'Je suis mort à Méguiddo, en affrontant le pharaon Néko.'] },
        { id: 'elie', fr: 'Élie', he: 'אליהו', sex: 'm', grp: 'prophetes', aliases: ['Eliyahou'], clues: [
            'Je suis originaire de Guilad, et on m’appelle « le Tichbite ».',
            'Des corbeaux m’ont apporté du pain et de la viande près d’un torrent.',
            'J’ai défié quatre cent cinquante prophètes de Baal sur le mont Carmel.',
            'J’ai entendu Dieu non dans le vent, le tremblement de terre ou le feu, mais dans une voix de fin silence.',
            'Je suis monté au ciel dans un tourbillon, sur un char de feu ; mon disciple Élisée m’a succédé.'] },
        { id: 'isaie', fr: 'Isaïe', he: 'ישעיהו', sex: 'm', grp: 'prophetes', aliases: ['Yechayahou'], clues: [
            'J’ai prophétisé à Jérusalem, sous plusieurs rois de Juda, dont Ouzias et Ahaz.',
            'J’ai vu le Seigneur sur un trône élevé, entouré de séraphins qui disaient : « Saint, saint, saint ».',
            'J’ai annoncé que de la tige de Jessé sortirait un rejeton.',
            'J’ai annoncé que « les loups habiteront avec les agneaux ».',
            'J’ai conseillé le roi Ézéchias pendant le siège de Jérusalem par Sennachérib.'] },
        { id: 'jeremie', fr: 'Jérémie', he: 'ירמיהו', sex: 'm', grp: 'prophetes', aliases: ['Yirmiyahou'], clues: [
            'Je viens d’une famille de prêtres d’Anatot.',
            'J’ai prophétisé avant la destruction du premier Temple, et après.',
            'On m’a jeté dans une citerne boueuse.',
            'Mon secrétaire Baruch a écrit mes paroles sur un rouleau.',
            'Selon la tradition, j’ai écrit le livre des Lamentations.'] },
        { id: 'daniel', fr: 'Daniel', he: 'דניאל', sex: 'm', grp: 'prophetes', aliases: [], clues: [
            'J’ai été emmené très jeune à Babylone.',
            'J’ai refusé la nourriture du roi pour ne pas me souiller.',
            'J’ai interprété le songe d’une statue aux pieds en partie d’argile.',
            'J’ai déchiffré une inscription apparue sur un mur pendant un festin.',
            'J’ai passé une nuit dans la fosse aux lions sans être blessé.'] },
        { id: 'jonas', fr: 'Jonas', he: 'יונה', sex: 'm', grp: 'prophetes', aliases: ['Yona'], clues: [
            'Dieu m’a envoyé à Ninive, mais j’ai pris un bateau dans l’autre direction, vers Tarsis.',
            'Une tempête a éclaté, et les marins m’ont jeté à la mer.',
            'Un grand poisson m’a avalé : j’y suis resté trois jours et trois nuits.',
            'J’ai prié depuis les entrailles du poisson.',
            'On lit mon livre à Yom Kippour, à l’office de Min’ha.'] },
        { id: 'esther', fr: 'Esther', he: 'אסתר', sex: 'f', grp: 'autres', aliases: ['Hadassa'], clues: [
            'J’ai deux noms : l’un hébreu, l’autre perse.',
            'J’ai été élevée par mon cousin, après la mort de mes parents.',
            'Je suis devenue reine de Perse.',
            'J’ai demandé aux Juifs de jeûner trois jours avant de me présenter chez le roi sans y avoir été appelée.',
            'J’ai démasqué Haman devant le roi Assuérus : on fête chaque année ce sauvetage à Pourim.'] },
        { id: 'ruth', fr: 'Ruth', he: 'רות', sex: 'f', grp: 'autres', aliases: [], clues: [
            'Je ne suis pas née dans le peuple d’Israël : je viens de Moab.',
            'J’ai dit à ma belle-mère : « Où tu iras, j’irai ; ton peuple sera mon peuple. »',
            'J’ai glané dans le champ d’un homme de Bethléem pendant la moisson des orges.',
            'J’ai épousé Boaz, qui m’a rachetée.',
            'Je suis l’arrière-grand-mère du roi David.'] }
    ];

    return { BIBLE: BIBLE };
}));
