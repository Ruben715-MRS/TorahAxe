// =========================================================================
// === GUIDE DES BÉNÉDICTIONS : QUE DIRE SUR QUEL ALIMENT (DONNÉES) ===
// =========================================================================
// La liste « Aliment → bénédiction » (sauf les ajouts signalés) et ses 33 notes d'origine sont celles du Guide des bénédictions du Beth Loubavitch (www.loubavitch.fr), reprises avec
// son accord et sans changement de fond (seules des fautes de frappe évidentes ont été corrigées, dont « Pâte » (les pâtes) écrit au singulier dans le guide, dont deux renvois de notes : 18 → 17 et 24 → 20). Ce guide a été compilé par le Rav Yehouda Leib
// Newman, directeur du Beth Rivka de New York, sous l'autorité du Rav Yehouda Kalman Marlowe, président du tribunal rabbinique de Crown Heights ; il se
// fonde sur les décisions hala'hiques de l'Admour Hazaken, essentiellement énoncées dans son Séder Birkat Ha Néhénin (usage 'Habad).
// Les textes hébreux des six bénédictions sont ceux du Siddour (data/siddur/birkhot-hanehenin.json) ; hamotsi est le texte usuel du pain.
// Les aliments ajoutés hors du guide (fruits et légumes courants, id 292 et suivants, notes 34 à 36) sont signalés comme tels et à faire relire par un rav.
// Les bénédictions finales (FINALS) et les écarts séfarades et ashkénazes (RITE_OVERRIDES) ne sont pas du Beth Loubavitch : ils sont signalés comme tels dans l'écran.
// Outil d'étude, pas une décision de halakha. Consommé par js/benedictionsCore.js (testé dans tests/benedictionsCore.test.js) et js/app/benedictions.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.BenedictionsData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var SOURCE = {
        name: 'Beth Loubavitch',
        url: 'https://www.loubavitch.fr',
        guide: 'Guide des bénédictions',
        compiledBy: 'compilé par le Rav Yehouda Leib Newman, directeur du Beth Rivka de New York, sous l\'autorité du Rav Yehouda Kalman Marlowe, président du tribunal rabbinique de Crown Heights',
        basis: 'sur la base des décisions hala\'hiques de l\'Admour Hazaken, essentiellement énoncées dans son Séder Birkat Ha Néhénin'
    };

    // Les bénédictions de la liste, dans l'ordre où on les présente. `he` : le nom court ; `fr` : le nom d'usage ; `use` : quand on la dit ;
    // `text` : la bénédiction entière (hébreu vocalisé) ; `tr` : sa phonétique ; `trad` : sa traduction.
    var BLESSINGS = {
        hamotsi: { he: 'הַמּוֹצִיא', fr: 'Hamotsi', use: 'Sur le pain.',
            text: 'בָּרוּךְ אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ:',
            tr: 'Baroukh Ata Ado-naï Eloh-énou Mélèkh Ha-\'Olam Hamotsi Lé\'hèm Mine Haarets',
            trad: 'Béni sois-Tu, Éternel notre D.ieu, Roi de l\'univers, qui fais sortir le pain de la terre.' },
        mezonot: { he: 'מְזוֹנוֹת', fr: 'Mezonot', use: 'Sur un aliment à base de l\'une des cinq céréales (blé, orge, épeautre, avoine, seigle), hors pain.',
            text: 'בָּרוּךְ אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא מִינֵי מְזוֹנוֹת:',
            tr: 'Baroukh Ata Ado-naï Eloh-énou Mélèkh Ha-\'Olam Boré Miné Mézonot',
            trad: 'Béni sois-Tu, Éternel notre D.ieu, Roi de l\'univers, qui crées toutes sortes de nourriture.' },
        haguafen: { he: 'הַגֶּפֶן', fr: 'Haguafen', use: 'Sur le vin et le jus de raisin.',
            text: 'בָּרוּךְ אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הַגֶּפֶן:',
            tr: 'Baroukh Ata Ado-naï Eloh-énou Mélèkh Ha-\'Olam Boré Péri Hagafèn',
            trad: 'Béni sois-Tu, Éternel notre D.ieu, Roi de l\'univers, qui crées le fruit de la vigne.' },
        haets: { he: 'הָעֵץ', fr: 'Haets', use: 'Sur un fruit qui pousse sur un arbre.',
            text: 'בָּרוּךְ אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָעֵץ:',
            tr: 'Baroukh Ata Ado-naï Eloh-énou Mélèkh Ha-\'Olam Boré Péri Ha\'ets',
            trad: 'Béni sois-Tu, Éternel notre D.ieu, Roi de l\'univers, qui crées le fruit de l\'arbre.' },
        haadama: { he: 'הָאֲדָמָה', fr: 'Haadama', use: 'Sur un produit qui pousse dans la terre.',
            text: 'בָּרוּךְ אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָאֲדָמָה:',
            tr: 'Baroukh Ata Ado-naï Eloh-énou Mélèkh Ha-\'Olam Boré Péri Haadama',
            trad: 'Béni sois-Tu, Éternel notre D.ieu, Roi de l\'univers, qui crées le fruit de la terre.' },
        chehakol: { he: 'שֶׁהַכֹּל', fr: 'Chéhakol', use: 'Sur tout ce qui ne pousse ni sur un arbre ni dans la terre (viande, poisson, produits laitiers…), et sur les boissons autres que le vin.',
            text: 'בָּרוּךְ אַתָּה יְהֹוָה, אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהַכֹּל נִהְיָה בִּדְבָרוֹ:',
            tr: 'Baroukh Ata Ado-naï Eloh-énou Mélèkh Ha-\'Olam Chéhakol Niya Bidvaro',
            trad: 'Béni sois-Tu, Éternel notre D.ieu, Roi de l\'univers, par la parole de qui tout a été créé.' }
    };
    // L'ordre des filtres ; « aucune » n'est pas une bénédiction : c'est le cas d'un aliment sur lequel on n'en dit pas.
    var ORDER = ['hamotsi', 'mezonot', 'haguafen', 'haets', 'haadama', 'chehakol', 'aucune'];
    var NONE = { he: '—', fr: 'Pas de bénédiction' };

    // Les aliments, dans l'ordre alphabétique du guide. `n` : l'aliment ; `b` : la bénédiction ; `notes` : les numéros de notes ;
    // `steps` : quand le cas demande plusieurs bénédictions, l'ordre à suivre ({ t, b, notes? }).
    var FOODS = [
        {"id": 1, "n": "Abricot", "b": "haets"},
        {"id": 292, "n": "Abricot sec", "b": "haets", "alt": ["abricot séché"], "notes": [34]},
        {"id": 2, "n": "Agneau", "b": "chehakol"},
        {"id": 333, "n": "Ail cru", "b": "haadama", "alt": ["gousse d'ail"], "notes": [34]},
        {"id": 3, "n": "Ail frit", "b": "haadama"},
        {"id": 4, "n": "Amande", "b": "haets"},
        {"id": 5, "n": "Ananas", "b": "haadama"},
        {"id": 379, "n": "Aneth", "b": "chehakol", "alt": ["dill"], "notes": [34,36]},
        {"id": 334, "n": "Artichaut", "b": "haadama", "alt": ["artichaut vert"], "notes": [34]},
        {"id": 6, "n": "Asperge", "b": "haadama"},
        {"id": 7, "n": "Aspirine n'ayant pas de goût", "b": "aucune", "notes": [1]},
        {"id": 8, "n": "Aubergine", "b": "haadama"},
        {"id": 9, "n": "Avocat", "b": "haets", "alt": ["avocats"]},
        {"id": 10, "n": "Banane", "b": "haadama", "notes": [2]},
        {"id": 11, "n": "Barbe à papa", "b": "chehakol"},
        {"id": 12, "n": "Barre au sésame dont les grains ne sont pas reconnaissables", "b": "chehakol"},
        {"id": 13, "n": "Barre au sésame dont les grains sont reconnaissables", "b": "haadama"},
        {"id": 14, "n": "Barre de chocolat avec des noisettes", "b": "chehakol"},
        {"id": 15, "n": "Barre de chocolat sans noisettes", "b": "chehakol"},
        {"id": 380, "n": "Basilic", "b": "chehakol", "alt": ["basilique"], "notes": [34,36]},
        {"id": 16, "n": "Bâton de réglisse contenant l'une des cinq céréales", "b": "mezonot", "notes": [3]},
        {"id": 17, "n": "Beignet aux fruits", "b": "mezonot"},
        {"id": 335, "n": "Bette", "b": "haadama", "alt": ["blette","poirée","carde"], "notes": [34]},
        {"id": 336, "n": "Betterave", "b": "haadama", "alt": ["betterave rouge"], "notes": [34]},
        {"id": 18, "n": "Beurre de cacahuètes avec des morceaux de cacahuètes", "b": "haadama"},
        {"id": 19, "n": "Beurre de cacahuètes sans morceaux de cacahuètes", "b": "chehakol"},
        {"id": 20, "n": "Biscuit", "b": "mezonot", "notes": [4]},
        {"id": 21, "n": "Biscuit au gingembre", "b": "mezonot"},
        {"id": 22, "n": "Biscuit salé", "b": "mezonot", "notes": [5]},
        {"id": 23, "n": "Blé cru, grillé, cuit à la vapeur ou soufflé", "b": "haadama", "notes": [6]},
        {"id": 24, "n": "Bœuf", "b": "chehakol"},
        {"id": 25, "n": "Boisson au chocolat", "b": "chehakol", "notes": [7]},
        {"id": 26, "n": "Bouillon", "b": "chehakol"},
        {"id": 27, "n": "Bouillon de poulet sans pâtes", "b": "chehakol"},
        {"id": 28, "n": "Bouillon de poulet avec des pâtes cuites séparément, quand on à l'intention de consommer, de manière identique, à la fois le bouillon et les pâtes", "steps": [{"t": "Sur les pâtes, tout d'abord", "b": "mezonot"}, {"t": "Puis, sur la soupe", "b": "chehakol"}]},
        {"id": 29, "n": "Bouillon de poulet avec des pâtes cuites séparément, si une petite quantité de pâtes a été cuite avec le bouillon", "steps": [{"t": "Sur la soupe, tout d'abord", "b": "chehakol"}, {"t": "Puis, sur les pâtes", "b": "mezonot"}]},
        {"id": 30, "n": "Bouillon de poulet avec des pâtes cuites séparément, si une grande quantité de pâtes a été cuite avec le bouillon", "steps": [{"t": "Sur l'ensemble", "b": "mezonot"}]},
        {"id": 31, "n": "Boulette de poisson", "b": "chehakol"},
        {"id": 32, "n": "Boulette de viande", "b": "chehakol"},
        {"id": 33, "n": "Brandy", "b": "chehakol"},
        {"id": 34, "n": "Bretzel", "b": "mezonot", "notes": [8]},
        {"id": 35, "n": "Brocolis", "b": "haadama", "alt": ["brocoli"]},
        {"id": 36, "n": "Brochet", "b": "chehakol"},
        {"id": 37, "n": "Brugnon", "b": "haets", "alt": ["nectarine"]},
        {"id": 38, "n": "Cacahuète", "b": "haadama", "alt": ["arachide","pistache de terre"]},
        {"id": 39, "n": "Cacahuète enrobée de chocolat", "b": "chehakol", "notes": [12]},
        {"id": 40, "n": "Café", "b": "chehakol", "notes": [7]},
        {"id": 41, "n": "Café glacé", "b": "chehakol"},
        {"id": 42, "n": "Cake", "b": "mezonot"},
        {"id": 43, "n": "Canard", "b": "chehakol"},
        {"id": 319, "n": "Canneberge", "b": "haets", "alt": ["cranberry","airelle rouge"], "notes": [34,35]},
        {"id": 325, "n": "Cantaloup", "b": "haadama", "alt": ["melon cantaloup"], "notes": [34]},
        {"id": 293, "n": "Carambole", "b": "haets", "alt": ["fruit étoile","star fruit"], "notes": [34]},
        {"id": 337, "n": "Cardon", "b": "haadama", "alt": ["cardons"], "notes": [34]},
        {"id": 44, "n": "Carpe", "b": "chehakol"},
        {"id": 45, "n": "Carotte crue", "b": "haadama", "notes": [9]},
        {"id": 46, "n": "Carotte cuite", "b": "haadama"},
        {"id": 294, "n": "Cassis", "b": "haets", "alt": ["groseille noire"], "notes": [34]},
        {"id": 47, "n": "Céleri", "b": "haadama", "alt": ["céleri branche"]},
        {"id": 338, "n": "Céleri-rave", "b": "haadama", "alt": ["céleri rave","céleri-rave"], "notes": [34]},
        {"id": 48, "n": "Céréales pour le petit déjeuner, y compris quand elles sont consommées avec du lait", "steps": [{"t": "Si les céréales sont à base de farine d'avoine", "b": "mezonot", "notes": [10]}, {"t": "Si les céréales sont à base de farine de blé", "b": "mezonot"}, {"t": "Si les céréales sont à base de farine de maïs et d'avoine", "b": "mezonot"}, {"t": "Si les céréales sont à base de farine de riz", "b": "chehakol", "notes": [11]}]},
        {"id": 381, "n": "Cerfeuil", "b": "chehakol", "notes": [34,36]},
        {"id": 49, "n": "Cerise", "b": "haets"},
        {"id": 50, "n": "Champagne", "b": "haguafen"},
        {"id": 51, "n": "Champignon", "b": "chehakol", "alt": ["champignon de Paris"]},
        {"id": 295, "n": "Châtaigne grillée", "b": "haets", "alt": ["marron grillé"], "notes": [34]},
        {"id": 339, "n": "Chicorée frisée", "b": "haadama", "alt": ["frisée","chicorée"], "notes": [34]},
        {"id": 52, "n": "Chips", "b": "haadama"},
        {"id": 53, "n": "Chocolat", "b": "chehakol", "notes": [12]},
        {"id": 340, "n": "Chou chinois", "b": "haadama", "alt": ["pak choï","bok choy","chou pak-choï"], "notes": [34]},
        {"id": 54, "n": "Chou cuit ou en salade", "b": "haadama"},
        {"id": 55, "n": "Chou de Bruxelles", "b": "haadama"},
        {"id": 56, "n": "Chou farci avec de la viande", "b": "chehakol"},
        {"id": 57, "n": "Chou fleur", "b": "haadama", "alt": ["chou-fleur","romanesco"]},
        {"id": 341, "n": "Chou frisé", "b": "haadama", "alt": ["kale","chou kale"], "notes": [34]},
        {"id": 343, "n": "Chou rouge", "b": "haadama", "alt": ["chou violet"], "notes": [34]},
        {"id": 342, "n": "Chou-rave", "b": "haadama", "alt": ["kohlrabi"], "notes": [34]},
        {"id": 58, "n": "Choucroute", "b": "haadama"},
        {"id": 59, "n": "Ciboulette", "b": "chehakol"},
        {"id": 60, "n": "Cidre", "b": "chehakol"},
        {"id": 61, "n": "Citron cru, s'il est mangeable", "b": "chehakol"},
        {"id": 387, "n": "Citron vert", "b": "chehakol", "alt": ["lime"], "notes": [34,35]},
        {"id": 62, "n": "Citronnade", "b": "chehakol"},
        {"id": 63, "n": "Clémentine", "b": "haets"},
        {"id": 296, "n": "Coing", "b": "haets", "alt": ["cognassier"], "notes": [34]},
        {"id": 64, "n": "Compote de pommes", "b": "haets"},
        {"id": 65, "n": "Compote contenant des morceaux de fruits de la terre", "b": "haadama"},
        {"id": 66, "n": "Compote contenant des morceaux de fruits de l'arbre", "b": "haets"},
        {"id": 67, "n": "Compote ne contenant que du jus de fruits", "b": "chehakol", "notes": [13]},
        {"id": 344, "n": "Concombre", "b": "haadama", "alt": ["concombres"], "notes": [34]},
        {"id": 68, "n": "Confiture avec des morceaux de fruits de la terre", "b": "haadama"},
        {"id": 69, "n": "Confiture avec des morceaux de fruits de l'arbre", "b": "haets"},
        {"id": 70, "n": "Confiture sans morceaux de fruits", "b": "chehakol"},
        {"id": 382, "n": "Coriandre", "b": "chehakol", "alt": ["persil chinois"], "notes": [34,36]},
        {"id": 71, "n": "Corn flakes", "b": "chehakol"},
        {"id": 72, "n": "Cornichon", "b": "haadama"},
        {"id": 297, "n": "Corossol", "b": "haets", "alt": ["guanabana","anone épineuse","corossolier"], "notes": [34]},
        {"id": 73, "n": "Côtelette de veau panée", "b": "chehakol", "notes": [14]},
        {"id": 345, "n": "Courge", "b": "haadama", "alt": ["potiron","citrouille","butternut","potimarron","courge spaghetti"], "notes": [34]},
        {"id": 74, "n": "Courgette", "b": "haadama"},
        {"id": 75, "n": "Cracker à l'oignon", "b": "mezonot"},
        {"id": 76, "n": "Crème chantilly", "b": "chehakol"},
        {"id": 77, "n": "Crème fraîche", "b": "chehakol"},
        {"id": 78, "n": "Crème glacée", "b": "chehakol", "notes": [15]},
        {"id": 79, "n": "Crêpe nature", "b": "mezonot"},
        {"id": 80, "n": "Crêpe au fromage", "b": "mezonot"},
        {"id": 81, "n": "Crêpe aux pommes de terre", "b": "mezonot"},
        {"id": 82, "n": "Crêpe au sarrasin ou à l'une des cinq céréales", "b": "mezonot"},
        {"id": 346, "n": "Cresson", "b": "haadama", "alt": ["cresson de fontaine"], "notes": [34]},
        {"id": 83, "n": "Croquette de Matsa cuite", "b": "hamotsi"},
        {"id": 84, "n": "Croquette de pomme de terre", "b": "chehakol"},
        {"id": 85, "n": "Croquette de saumon", "b": "chehakol"},
        {"id": 347, "n": "Crosne", "b": "haadama", "alt": ["crosne du Japon"], "notes": [34]},
        {"id": 86, "n": "Datte", "b": "haets"},
        {"id": 87, "n": "Dinde", "b": "chehakol"},
        {"id": 88, "n": "Eau, quand on a soif", "b": "chehakol"},
        {"id": 89, "n": "Eau gazeuse", "b": "chehakol"},
        {"id": 90, "n": "Echalote", "b": "haadama", "alt": ["échalotes"]},
        {"id": 91, "n": "Eclair, gâteau", "b": "mezonot"},
        {"id": 348, "n": "Endive", "b": "haadama", "alt": ["chicorée witloof","witloof"], "notes": [34]},
        {"id": 92, "n": "Epinard", "b": "haadama"},
        {"id": 383, "n": "Estragon", "b": "chehakol", "notes": [34,36]},
        {"id": 93, "n": "Ethrog confit", "b": "haets"},
        {"id": 94, "n": "Falafel, quand l'eau constitue la majeure partie de la pâte", "b": "hamotsi"},
        {"id": 95, "n": "Farce cuite, à base de pain", "b": "mezonot"},
        {"id": 298, "n": "Feijoa", "b": "haets", "alt": ["goyave ananas","acca"], "notes": [34]},
        {"id": 349, "n": "Fenouil", "b": "haadama", "alt": ["anis doux"], "notes": [34]},
        {"id": 96, "n": "Feuilleté à la viande", "b": "mezonot", "notes": [16]},
        {"id": 97, "n": "Feuilleté à la pomme de terre dont la farce n'est retenue que par une croûte mince n'ayant pas pour but de lui donner bon goût", "b": "haadama"},
        {"id": 98, "n": "Feuilleté à la pomme de terre dont la croûte a bon goût, ayant été cuite avec le plat, si la majeure partie de la pâte est à base d'eau", "b": "hamotsi"},
        {"id": 99, "n": "Feuilleté à la pomme de terre dont la croûte a bon goût, si la majeure partie de la pâte est à base de jus de fruits", "b": "mezonot"},
        {"id": 350, "n": "Fève", "b": "haadama", "alt": ["fève de marais","gourgane"], "notes": [34]},
        {"id": 100, "n": "Figue", "b": "haets"},
        {"id": 332, "n": "Figue de Barbarie", "b": "haadama", "alt": ["figue d'inde","opuntia","raquette"], "notes": [34,35]},
        {"id": 101, "n": "Filet de poisson", "b": "chehakol"},
        {"id": 351, "n": "Flageolet", "b": "haadama", "alt": ["haricot flageolet"], "notes": [34]},
        {"id": 102, "n": "Flan", "b": "chehakol"},
        {"id": 103, "n": "Flocon d'avoine", "b": "mezonot"},
        {"id": 104, "n": "Foie de bœuf", "b": "chehakol"},
        {"id": 105, "n": "Foie de volaille", "b": "chehakol"},
        {"id": 106, "n": "Fraise", "b": "haadama"},
        {"id": 329, "n": "Fraise des bois", "b": "haadama", "alt": ["fraisier des bois"], "notes": [34]},
        {"id": 107, "n": "Framboise", "b": "haets"},
        {"id": 108, "n": "Frite", "b": "haadama"},
        {"id": 109, "n": "Fromage", "b": "chehakol"},
        {"id": 323, "n": "Fruit de la passion", "b": "haets", "alt": ["maracudja","grenadille"], "notes": [34,35]},
        {"id": 331, "n": "Fruit du dragon", "b": "haadama", "alt": ["pitaya","pitahaya","dragon fruit"], "notes": [34,35]},
        {"id": 110, "n": "Galantine de bœuf", "b": "chehakol"},
        {"id": 111, "n": "Gâteau", "b": "mezonot"},
        {"id": 112, "n": "Gâteau au chocolat", "b": "mezonot"},
        {"id": 113, "n": "Gâteau au fromage", "b": "mezonot"},
        {"id": 114, "n": "Gâteau aux fruits", "b": "mezonot"},
        {"id": 115, "n": "Gâteau au miel", "b": "mezonot"},
        {"id": 116, "n": "Gâteau aux raisins secs", "b": "mezonot"},
        {"id": 117, "n": "Gâteau de riz", "b": "chehakol", "notes": [10]},
        {"id": 118, "n": "Gaufre", "b": "mezonot"},
        {"id": 119, "n": "Gefilte fish", "b": "chehakol"},
        {"id": 120, "n": "Gelée de pommes sans morceaux de fruits", "b": "chehakol"},
        {"id": 353, "n": "Germes de soja", "b": "haadama", "alt": ["pousses de soja"], "notes": [34]},
        {"id": 121, "n": "Gingembre cru, séché ou caramélisé", "b": "haadama", "alt": ["gingembre frais"]},
        {"id": 122, "n": "Glace dans un cornet sucré", "steps": [{"t": "Sur la glace, tout d'abord", "b": "chehakol"}, {"t": "Puis sur le cornet", "b": "mezonot"}]},
        {"id": 123, "n": "Glace dans un cornet non sucré", "notes": [17], "steps": [{"t": "Sur l'ensemble", "b": "chehakol"}]},
        {"id": 124, "n": "Glace enrobée de gâteau", "b": "mezonot", "notes": [18]},
        {"id": 320, "n": "Goji (baies de)", "b": "haets", "alt": ["baies de goji","lyciet"], "notes": [34,35]},
        {"id": 352, "n": "Gombo", "b": "haadama", "alt": ["okra"], "notes": [34]},
        {"id": 299, "n": "Goyave", "b": "haets", "alt": ["goyavier","guava"], "notes": [34]},
        {"id": 125, "n": "Grain de sarrasin écrasé", "b": "chehakol"},
        {"id": 126, "n": "Grain de sarrasin entier", "b": "haadama"},
        {"id": 127, "n": "Grain de sésame", "b": "haadama", "alt": ["sésame"]},
        {"id": 128, "n": "Grain de tournesol", "b": "haadama"},
        {"id": 129, "n": "Grenade", "b": "haets"},
        {"id": 321, "n": "Groseille", "b": "haets", "alt": ["groseille rouge","groseille à maquereau"], "notes": [34,35]},
        {"id": 130, "n": "Halva", "b": "chehakol", "notes": [19]},
        {"id": 131, "n": "Hareng", "b": "chehakol"},
        {"id": 132, "n": "Hareng fumé", "b": "chehakol"},
        {"id": 354, "n": "Haricot azuki", "b": "haadama", "alt": ["adzuki"], "notes": [34]},
        {"id": 133, "n": "Haricot blanc", "b": "haadama"},
        {"id": 134, "n": "Haricot blanc en sauce", "b": "haadama"},
        {"id": 355, "n": "Haricot de Lima", "b": "haadama", "alt": ["haricot beurre","pois de Lima"], "notes": [34]},
        {"id": 356, "n": "Haricot mange-tout", "b": "haadama", "alt": ["pois mange-tout","pois gourmand"], "notes": [34]},
        {"id": 357, "n": "Haricot noir", "b": "haadama", "alt": ["haricot noir du Mexique"], "notes": [34]},
        {"id": 135, "n": "Haricot rouge", "b": "haadama"},
        {"id": 136, "n": "Haricot vert", "b": "haadama", "alt": ["haricots verts"]},
        {"id": 137, "n": "Hot dog avec un pain Hamotsi", "b": "hamotsi"},
        {"id": 138, "n": "Hot dog avec un petit pain Mezonot", "b": "mezonot", "notes": [20]},
        {"id": 358, "n": "Igname", "b": "haadama", "alt": ["yam"], "notes": [34]},
        {"id": 300, "n": "Jaque (fruit à pain)", "b": "haets", "alt": ["jackfruit","fruit à pain","jaquier"], "notes": [34]},
        {"id": 359, "n": "Jicama", "b": "haadama", "alt": ["pois de terre"], "notes": [34]},
        {"id": 301, "n": "Jujube", "b": "haets", "alt": ["jujubier","datte chinoise"], "notes": [34]},
        {"id": 139, "n": "Jus de fruits à l'exception du jus de raisin ou de tomate", "b": "chehakol"},
        {"id": 140, "n": "Jus d'ananas", "b": "chehakol"},
        {"id": 141, "n": "Jus de pamplemousse", "b": "chehakol"},
        {"id": 142, "n": "Jus de pomme", "b": "chehakol"},
        {"id": 143, "n": "Jus de pruneau", "b": "chehakol"},
        {"id": 144, "n": "Jus de raisin", "b": "haguafen"},
        {"id": 145, "n": "Jus de tomate", "b": "haadama"},
        {"id": 302, "n": "Kaki", "b": "haets", "alt": ["plaqueminier","sharon","persimmon"], "notes": [34]},
        {"id": 327, "n": "Kiwano", "b": "haadama", "alt": ["melon à cornes","concombre à cornes"], "notes": [34]},
        {"id": 322, "n": "Kiwi", "b": "haets", "alt": ["actinidia"], "notes": [34,35]},
        {"id": 303, "n": "Kumquat", "b": "haets", "alt": ["petit citron chinois"], "notes": [34]},
        {"id": 146, "n": "Lait", "b": "chehakol"},
        {"id": 147, "n": "Lait frappé", "b": "chehakol"},
        {"id": 148, "n": "Lait glacé", "b": "chehakol"},
        {"id": 149, "n": "Laitue", "b": "haadama", "alt": ["salade verte","romaine"]},
        {"id": 150, "n": "Langue de bœuf ou de veau", "b": "chehakol"},
        {"id": 151, "n": "Légume sec", "b": "haadama"},
        {"id": 152, "n": "Légume vert", "b": "haadama"},
        {"id": 153, "n": "Lentille", "b": "haadama"},
        {"id": 154, "n": "Limonade", "b": "chehakol"},
        {"id": 304, "n": "Litchi", "b": "haets", "alt": ["letchi","lychee"], "notes": [34]},
        {"id": 305, "n": "Longane", "b": "haets", "alt": ["longan"], "notes": [34]},
        {"id": 155, "n": "Macaron", "b": "chehakol"},
        {"id": 156, "n": "Macaroni", "b": "mezonot"},
        {"id": 157, "n": "Macédoine de fruits, pour la plupart de l'arbre", "b": "haets"},
        {"id": 158, "n": "Macédoine de fruits, pour la plupart de la terre", "b": "haadama"},
        {"id": 360, "n": "Mâche", "b": "haadama", "alt": ["doucette","salade de blé"], "notes": [34]},
        {"id": 159, "n": "Maïs en épi", "b": "haadama", "alt": ["maïs","épis de maïs"]},
        {"id": 160, "n": "Mandarine", "b": "haets", "alt": ["tangerine"]},
        {"id": 307, "n": "Mangoustan", "b": "haets", "alt": ["mangoustanier"], "notes": [34]},
        {"id": 306, "n": "Mangue", "b": "haets", "alt": ["manguier","mango"], "notes": [34]},
        {"id": 361, "n": "Manioc", "b": "haadama", "alt": ["cassave","yuca"], "notes": [34]},
        {"id": 161, "n": "Marron", "b": "haets", "alt": ["châtaigne"]},
        {"id": 162, "n": "Marshmallow", "b": "chehakol"},
        {"id": 163, "n": "Matsa", "b": "hamotsi", "notes": [21]},
        {"id": 164, "n": "Matsa aux œufs", "b": "mezonot", "notes": [22]},
        {"id": 165, "n": "Médicaments ayant un bon goût", "b": "chehakol"},
        {"id": 166, "n": "Melon", "b": "haadama", "alt": ["melons"]},
        {"id": 326, "n": "Melon miel", "b": "haadama", "alt": ["melon blanc","honeydew"], "notes": [34]},
        {"id": 167, "n": "Menthe", "b": "chehakol"},
        {"id": 168, "n": "Miel", "b": "chehakol"},
        {"id": 169, "n": "Millefeuilles", "b": "mezonot"},
        {"id": 308, "n": "Mirabelle", "b": "haets", "alt": ["prune jaune"], "notes": [34]},
        {"id": 170, "n": "Mûre", "b": "haets", "notes": [23]},
        {"id": 171, "n": "Myrtille", "b": "haets", "notes": [23]},
        {"id": 309, "n": "Nashi", "b": "haets", "alt": ["poire asiatique","poire-pomme"], "notes": [34]},
        {"id": 172, "n": "Navet", "b": "haadama"},
        {"id": 173, "n": "Noisette", "b": "haets"},
        {"id": 174, "n": "Noix", "b": "haets", "alt": ["noix de Grenoble"]},
        {"id": 175, "n": "Noix de cajou", "b": "haets"},
        {"id": 176, "n": "Noix de coco", "b": "haets"},
        {"id": 310, "n": "Noix de macadamia", "b": "haets", "alt": ["macadamia"], "notes": [34]},
        {"id": 311, "n": "Noix de pécan", "b": "haets", "alt": ["pécan"], "notes": [34]},
        {"id": 312, "n": "Noix du Brésil", "b": "haets", "alt": ["noix du Pará"], "notes": [34]},
        {"id": 177, "n": "Nouille", "b": "mezonot"},
        {"id": 178, "n": "Œuf cru, bouilli ou frit", "b": "chehakol"},
        {"id": 179, "n": "Oignon cru", "b": "haadama", "alt": ["oignon rouge","oignon jaune"]},
        {"id": 363, "n": "Oignon perlé", "b": "haadama", "alt": ["petit oignon"], "notes": [34]},
        {"id": 362, "n": "Oignon vert", "b": "haadama", "alt": ["ciboule","oignon nouveau"], "notes": [34]},
        {"id": 180, "n": "Olives mûres ou préparées", "b": "haets", "alt": ["olive"]},
        {"id": 181, "n": "Omelette au riz", "b": "chehakol", "notes": [11]},
        {"id": 182, "n": "Omelette au pain", "b": "hamotsi"},
        {"id": 183, "n": "Omelette aux pâtes", "b": "mezonot"},
        {"id": 184, "n": "Omelette aux pommes de terre", "b": "chehakol"},
        {"id": 185, "n": "Orange", "b": "haets", "alt": ["oranges"]},
        {"id": 186, "n": "Orge perlé : à manger pendant le repas, après avoir dit", "b": "hamotsi"},
        {"id": 364, "n": "Oseille", "b": "haadama", "alt": ["oseille des jardins"], "notes": [34]},
        {"id": 187, "n": "Pain à base d'une des cinq céréales", "b": "hamotsi"},
        {"id": 188, "n": "Pain à l'oignon", "b": "hamotsi"},
        {"id": 189, "n": "Pain complet", "b": "hamotsi"},
        {"id": 190, "n": "Pain de dattes", "b": "mezonot"},
        {"id": 191, "n": "Pain de seigle", "b": "hamotsi"},
        {"id": 192, "n": "Pain italien", "b": "hamotsi"},
        {"id": 193, "n": "Pain perdu", "b": "hamotsi"},
        {"id": 194, "n": "Pamplemousse", "b": "haets"},
        {"id": 365, "n": "Panais", "b": "haadama", "alt": ["pastinaque"], "notes": [34]},
        {"id": 324, "n": "Papaye", "b": "haets", "alt": ["papaya"], "notes": [34,35]},
        {"id": 195, "n": "Pastèque", "b": "haadama", "alt": ["melon d'eau"]},
        {"id": 196, "n": "Patate douce", "b": "haadama", "alt": ["batate"]},
        {"id": 197, "n": "Pâtes", "b": "mezonot"},
        {"id": 198, "n": "Pâte au fromage", "b": "mezonot"},
        {"id": 199, "n": "Pâte à tarte", "b": "mezonot"},
        {"id": 200, "n": "Pâté de foie", "b": "chehakol"},
        {"id": 201, "n": "Pêche", "b": "haets", "alt": ["pêches"]},
        {"id": 202, "n": "Pelure d'orange confite", "b": "haadama"},
        {"id": 384, "n": "Persil", "b": "chehakol", "alt": ["persil frisé","persil plat"], "notes": [34,36]},
        {"id": 203, "n": "Petit lait", "b": "chehakol"},
        {"id": 204, "n": "Petit pain", "b": "hamotsi"},
        {"id": 205, "n": "Petit pain confectionné avec du jus de fruits", "b": "mezonot", "notes": [24]},
        {"id": 206, "n": "Petit pois", "b": "haadama", "alt": ["pois verts"]},
        {"id": 330, "n": "Physalis", "b": "haadama", "alt": ["groseille du Cap","amour en cage","coqueret"], "notes": [34]},
        {"id": 313, "n": "Pignon de pin", "b": "haets", "alt": ["pignon"], "notes": [34]},
        {"id": 367, "n": "Piment", "b": "haadama", "alt": ["chili","piment vert","piment rouge"], "notes": [34]},
        {"id": 366, "n": "Pissenlit", "b": "haadama", "alt": ["dent-de-lion"], "notes": [34]},
        {"id": 207, "n": "Pistache", "b": "haets", "alt": ["pistaches"]},
        {"id": 208, "n": "Pizza", "b": "mezonot", "notes": [25]},
        {"id": 328, "n": "Plantain (banane à cuire)", "b": "haadama", "alt": ["banane plantain","banane à cuire"], "notes": [34]},
        {"id": 385, "n": "Pleurote", "b": "chehakol", "alt": ["champignon huître"], "notes": [34]},
        {"id": 209, "n": "Poire", "b": "haets"},
        {"id": 368, "n": "Poireau", "b": "haadama", "alt": ["poireaux"], "notes": [34]},
        {"id": 210, "n": "Pois chiche", "b": "haadama"},
        {"id": 211, "n": "Poisson", "b": "chehakol"},
        {"id": 212, "n": "Poisson pané", "b": "chehakol", "notes": [14]},
        {"id": 213, "n": "Poivron farci avec de la viande", "b": "chehakol"},
        {"id": 370, "n": "Poivron jaune", "b": "haadama", "alt": ["poivron"], "notes": [34]},
        {"id": 369, "n": "Poivron rouge", "b": "haadama", "alt": ["poivron"], "notes": [34]},
        {"id": 214, "n": "Poivron vert", "b": "haadama"},
        {"id": 314, "n": "Pomelo", "b": "haets", "alt": ["pamplemousse géant"], "notes": [34]},
        {"id": 215, "n": "Pomme", "b": "haets"},
        {"id": 216, "n": "Pomme cuite au four", "b": "haets"},
        {"id": 217, "n": "Pomme de terre cuite, écrasée ou frite", "b": "haadama", "alt": ["patate"]},
        {"id": 218, "n": "Pomme de terre en sachet, reconstituée", "b": "chehakol", "alt": ["purée en flocons"], "notes": [26]},
        {"id": 219, "n": "Pomme de terre cuite et réduite en poudre", "b": "haadama", "notes": [26]},
        {"id": 220, "n": "Pop corn", "b": "haadama"},
        {"id": 221, "n": "Poulet", "b": "chehakol"},
        {"id": 371, "n": "Pousses de bambou", "b": "haadama", "alt": ["bambou"], "notes": [34]},
        {"id": 222, "n": "Prune", "b": "haets"},
        {"id": 223, "n": "Pruneau", "b": "haets"},
        {"id": 224, "n": "Pudding sans farine", "b": "chehakol"},
        {"id": 225, "n": "Pudding au tapioca", "b": "chehakol"},
        {"id": 226, "n": "Purée de pommes de terre", "b": "haadama"},
        {"id": 227, "n": "Quenelle de farine de Matsa", "b": "mezonot"},
        {"id": 315, "n": "Quetsche", "b": "haets", "alt": ["prune quetsche"], "notes": [34]},
        {"id": 372, "n": "Racine de lotus", "b": "haadama", "alt": ["lotus"], "notes": [34]},
        {"id": 228, "n": "Radis", "b": "haadama", "alt": ["radis noir","radis rose"]},
        {"id": 229, "n": "Raisin mûr", "b": "haets", "notes": [27]},
        {"id": 230, "n": "Raisin sec", "b": "haets"},
        {"id": 231, "n": "Raisin sec enrobé de chocolat", "b": "chehakol", "notes": [28]},
        {"id": 232, "n": "Ravioli cuit", "b": "mezonot"},
        {"id": 316, "n": "Reine-claude", "b": "haets", "alt": ["prune reine-claude"], "notes": [34]},
        {"id": 233, "n": "Rhubarbe cuite", "b": "haadama"},
        {"id": 234, "n": "Riz", "b": "chehakol", "notes": [11]},
        {"id": 373, "n": "Roquette", "b": "haadama", "alt": ["rucola"], "notes": [34]},
        {"id": 235, "n": "Salade d'œuf", "b": "chehakol"},
        {"id": 236, "n": "Salade de chou et de carotte râpée", "b": "haadama"},
        {"id": 237, "n": "Salade de concombre", "b": "haadama"},
        {"id": 238, "n": "Salade de légumes", "b": "haadama"},
        {"id": 239, "n": "Salade de pommes de terre", "b": "haadama"},
        {"id": 240, "n": "Salade de thon à la mayonnaise", "b": "chehakol"},
        {"id": 241, "n": "Salami", "b": "chehakol"},
        {"id": 374, "n": "Salsifis", "b": "haadama", "alt": ["scorsonère"], "notes": [34]},
        {"id": 242, "n": "Sandwich au fromage", "b": "hamotsi"},
        {"id": 243, "n": "Sandwich aux œufs", "b": "hamotsi"},
        {"id": 244, "n": "Sandwich de galantine", "b": "hamotsi"},
        {"id": 245, "n": "Sandwich de poulet", "b": "hamotsi"},
        {"id": 246, "n": "Sandwich de saucisson", "b": "hamotsi"},
        {"id": 317, "n": "Sapotille", "b": "haets", "alt": ["sapotillier"], "notes": [34]},
        {"id": 247, "n": "Sardine", "b": "chehakol"},
        {"id": 248, "n": "Saucisse", "b": "chehakol"},
        {"id": 249, "n": "Saucisson", "b": "chehakol"},
        {"id": 250, "n": "Saumon", "b": "chehakol"},
        {"id": 251, "n": "Saumon fumé", "b": "chehakol"},
        {"id": 252, "n": "Scarole", "b": "haadama"},
        {"id": 386, "n": "Shiitaké", "b": "chehakol", "alt": ["champignon shiitake"], "notes": [34]},
        {"id": 253, "n": "Sirop de sucre", "b": "chehakol"},
        {"id": 254, "n": "Soda aux extraits de gingembre", "b": "chehakol"},
        {"id": 255, "n": "Soda gazeux", "b": "chehakol"},
        {"id": 375, "n": "Soja vert", "b": "haadama", "alt": ["edamame","fèves de soja"], "notes": [34]},
        {"id": 256, "n": "Sorbet", "b": "chehakol"},
        {"id": 257, "n": "Soupe de légumes", "b": "haadama", "notes": [29]},
        {"id": 258, "n": "Soupe aux choux", "b": "haadama"},
        {"id": 259, "n": "Soupe au maïs", "b": "haadama"},
        {"id": 260, "n": "Soupe au riz", "b": "chehakol", "notes": [11]},
        {"id": 261, "n": "Soupe à la tomate", "b": "haadama"},
        {"id": 262, "n": "Soupe d'orge sans légume", "notes": [30], "steps": [{"t": "Elle doit être consommée pendant le repas, introduit par", "b": "hamotsi"}]},
        {"id": 263, "n": "Soupe d'orge et de légumes", "notes": [31], "steps": [{"t": "Elle doit être consommée pendant le repas, introduit par", "b": "hamotsi"}]},
        {"id": 264, "n": "Soupe de betterave", "b": "haadama"},
        {"id": 265, "n": "Soupe de champignon", "b": "chehakol"},
        {"id": 266, "n": "Soupe de champignon et d'orge", "steps": [{"t": "Elle doit être consommée pendant le repas, introduit par", "b": "hamotsi"}]},
        {"id": 267, "n": "Soupe de légumes secs", "b": "haadama"},
        {"id": 268, "n": "Soupe de lentilles", "b": "haadama"},
        {"id": 269, "n": "Soupe de nouilles aux légumes, si les nouilles sont cuites séparément, si le bouillon est clair et si l'on désire consommer tout autant les nouilles que les légumes", "steps": [{"t": "Sur les pâtes, tout d'abord", "b": "mezonot"}, {"t": "Puis, sur la soupe de légumes", "b": "haadama"}, {"t": "Ou bien sur la soupe de champignons", "b": "chehakol"}]},
        {"id": 270, "n": "Soupe de nouille aux légumes, si les nouilles sont cuites séparément et s'il s'agit d'une soupe épaisse de pois cassés, de haricots ou de pommes de terre", "steps": [{"t": "Sur l'ensemble", "b": "mezonot"}]},
        {"id": 271, "n": "Soupe de nouilles aux légumes, si très peu de nouilles sont cuites avec la soupe", "steps": [{"t": "Sur la soupe de légumes, tout d'abord", "b": "haadama"}, {"t": "Ou bien, sur la soupe de champignons", "b": "chehakol"}, {"t": "Puis, sur les pâtes", "b": "mezonot"}]},
        {"id": 272, "n": "Soupe de nouilles aux légumes, si une grande quantité de nouilles est cuite avec la soupe", "steps": [{"t": "Sur l'ensemble", "b": "mezonot"}]},
        {"id": 273, "n": "Soupe de petits pois", "b": "haadama"},
        {"id": 274, "n": "Soupe de pois cassés", "b": "chehakol"},
        {"id": 275, "n": "Spaghetti", "b": "mezonot"},
        {"id": 276, "n": "Spaghetti et boulettes de viande, s'ils sont consommés en étant placés conjointement dans la bouche :", "b": "mezonot", "notes": [32]},
        {"id": 277, "n": "Spaghetti et boulettes de viande, s'ils sont mangés séparément", "steps": [{"t": "Sur les spaghetti, tout d'abord", "b": "mezonot"}, {"t": "Puis, sur les boulettes de viande", "b": "chehakol"}]},
        {"id": 278, "n": "Strudel aux pommes", "b": "mezonot"},
        {"id": 279, "n": "Sucre", "b": "chehakol"},
        {"id": 318, "n": "Tamarin", "b": "haets", "alt": ["tamarinier"], "notes": [34]},
        {"id": 376, "n": "Taro", "b": "haadama", "alt": ["colocase"], "notes": [34]},
        {"id": 280, "n": "Tarte aux citrons meringuée", "b": "mezonot"},
        {"id": 281, "n": "Tarte aux pommes", "b": "mezonot", "notes": [33]},
        {"id": 282, "n": "Thé", "b": "chehakol"},
        {"id": 283, "n": "Thé glacé", "b": "chehakol"},
        {"id": 284, "n": "Thon", "b": "chehakol"},
        {"id": 285, "n": "Tomate", "b": "haadama", "alt": ["tomates"]},
        {"id": 377, "n": "Tomate cerise", "b": "haadama", "alt": ["tomates cerises"], "notes": [34]},
        {"id": 378, "n": "Topinambour", "b": "haadama", "alt": ["artichaut de Jérusalem"], "notes": [34]},
        {"id": 286, "n": "Veau", "b": "chehakol"},
        {"id": 287, "n": "Viande", "b": "chehakol"},
        {"id": 288, "n": "Viande hachée", "b": "chehakol"},
        {"id": 289, "n": "Vin de raisin frais ou de raisin sec", "b": "haguafen"},
        {"id": 290, "n": "Whisky", "b": "chehakol"},
        {"id": 291, "n": "Yaourt", "b": "chehakol"}
    ];

    // Les notes du guide, numérotées comme dans la liste.
    var NOTES = {
        1: "Les aspirines destinées aux enfants sont sucrées. Si l'on prend une aspirine amère avec de l'eau, alors que l'on n'a pas soif, on ne dit pas de bénédiction. Si on la prend avec une boisson ayant un bon goût, par exemple du jus d'orange, on dit Chéhakol, y compris quand on n'a pas soif (Séder Birkat Ha Néhénin, chapitre 7, aux paragraphes 7 et 8).",
        2: "Peut-être faut-il dire Haets en mangeant une banane. En conséquence, si l'on consomme un autre fruit dont la bénédiction est Haets, on procédera de la façon suivante, afin de se libérer du doute. Après avoir dit Haets et mangé ce fruit, on prendra, avant de consommer la banane, un autre aliment dont la bénédiction est Haadama et l'on dira cette bénédiction avec l'intention de la réciter également pour la banane. Toutefois, si l'on désire manger la banane avant l'autre fruit, on dira Haadama avec l'intention de ne pas inclure dans cette bénédiction l'autre fruit, pour lequel il faudra dire Haets (Séder Birkat Ha Néhénin, chapitre 1, paragraphe 6 et Rabbi 'Haïm Naé sur Kitsour Choul'han Arou'h, chapitre 49, au paragraphe 18 et dans les notes).",
        3: "Ils contiennent de la farine provenant des cinq espèces de céréales, qui est à l'origine de leur consistance et de leur forme.",
        4: "On dit la bénédiction finale Al Hamé'hya uniquement si la quantité de biscuits ou de gâteaux consommée en six minutes (A'hilat Prass) est d'au moins une trentaine de grammes (Kezait) de farine issue d'une des cinq céréales.",
        5: "Attention ! si les biscuits salés remplacent le pain, il est préférable de manger d'abord du véritable pain, après avoir dit la bénédiction Hamotsi. C'est seulement après cela que l'on consommera ces biscuits salés. Si ces derniers sont faits uniquement avec de l'eau, de nombreuses autorités hala'hiques considèrent qu'il faut dire Mezonot. L'Admour Hazaken, en revanche, à la différence de ce qu'il dit dans le Choul'han Arou'h, chapitre 168, au paragraphe 12, affirme, dans son Sidour, qu'il est préférable de les consommer à l'intérieur du repas, après avoir dit la bénédiction Hamotsi.",
        6: "Il est préférable de le consommer à l'intérieur du repas, après avoir dit la bénédiction Hamotsi. Si ce n'est pas le cas, la bénédiction finale sera Boré Nefachot (Séder Birkat Ha Néhénin, chapitre 1, au paragraphe 8).",
        7: "La bénédiction finale Boré Nefachot, après une boisson au chocolat ou un café, est récitée uniquement dans la mesure où l'on en a bu environ un huitième de litre (Reviit) en six minutes (A'hilat Prass). Il en est de même pour les autres boissons.",
        8: "Il est préférable de consommer des bretzels à l'intérieur d'un repas introduit par la bénédiction Hamotsi prononcée sur le pain. D'après le Choul'han Arou'h Ha Rav, chapitre 168, au paragraphe 12, on peut penser qu'il faut dire Mezonot en consommant des bretzels. Toutefois, l'Admour Hazaken ne fait pas mention de cet avis dans son Sidour.",
        9: "Selon la décision hala'hique du Rav Dvorkin, basée sur le fait qu'il est désormais d'usage courant de consommer des carottes crues.",
        10: "Cet avis est basé sur les informations qui ont pu être obtenues sur les méthodes de fabrication de ces céréales.",
        11: "D'après l'Admour Hazaken, on dit la bénédiction Chéhakol quand on consomme du riz en dehors d'un repas. Néanmoins, du fait des divergences d'opinion, en la matière, celui qui souhaite adopter le meilleur comportement en mangera uniquement au cours d'un repas introduit par la bénédiction Hamotsi sur le pain. En effet, lorsque le riz est entier, on ne sait pas s'il faut dire Haadama ou Mezonot. De fait, si l'on a dit l'une de ces deux bénédictions, on est bien considéré comme s'étant acquitté de son obligation. En revanche, selon tous les avis, la bénédiction finale sur le riz est Boré Nefachot (Séder Birkat Ha Néhénin, chapitre 1, paragraphe 11).",
        12: "De fait, il est difficile de comprendre pourquoi l'on dit la bénédiction Chéhakol pour le chocolat, dans la mesure où celui-ci est extrait d'un fruit poussant sur un arbre et dès lors que telle est la façon normale de le consommer. A ce sujet, on verra également la note 27.",
        13: "Lorsque l'on a dit, au préalable, une bénédiction sur un fruit, on n'en fera pas sur le jus, si celui-ci constitue, à lui seul, la compote. Dans la mesure du possible, on dira alors Chéhakol sur un autre aliment.",
        14: "La plupart des autorités hala'hiques considèrent que l'on dit Chéhakol sur le poisson ou la viande panés (Péri Toar, Yoré Déa, chapitre 150, paragraphe 14).",
        15: "Si la crème glacée est à base de lait, on s'assurera que celui-ci est surveillé.",
        16: "Si la majeure partie du liquide mélangé à la farine pour constituer la pâte est de l'eau, on dira la bénédiction Hamotsi (Séder Birkat Ha Néhénin, chapitre 2, au paragraphe 8).",
        17: "Si le cornet de glace n'a pas de goût, aucune bénédiction n'est récitée, le concernant, car il n'a alors qu'un rôle accessoire, par rapport à la glace et il n'a pas d'autre but que de la tenir (Choul'han Arou'h, chapitre 168, au paragraphe 9).",
        18: "Ce qui est dit à la note 17 s'applique, de manière identique, dans ce cas.",
        19: "Tel est l'avis des autorités actuelles.",
        20: "Si la bénédiction du petit pain constituant le hot dog est Mezonot, sa pâte ayant été préparée avec du jus de fruits et si la quantité qui en est consommée n'est pas suffisante pour être rassasié, on dira uniquement Mezonot et non Chéhakol (Séder Birkat Ha Néhénin, chapitre 3, au paragraphe 9). Il est cependant nécessaire d'inclure, dans la première bouchée consommée, à la fois du petit pain et de la viande. En outre, il convient de formuler des réserves sur l'attitude qui consiste à dire, séparément, Mezonot sur le petit pain et Chéhakol sur la viande.",
        21: "Certains, quand ils consomment de la Matsa en dehors de la fête de Pessa'h, disent la bénédiction Mezonot. Tel n'est cependant pas notre usage.",
        22: "Attention, si la Matsa aux œufs remplace le pain, il est préférable de manger d'abord du véritable pain, après avoir dit la bénédiction Hamotsi, puis, seulement après cela, de consommer ces Matsot.",
        23: "Tel est l'avis des autorités hala'hiques contemporaines.",
        24: "Ce qui est dit à la note 20 s'applique, de manière identique, dans ce cas.",
        25: "Ce qui est dit, à la note 33, à propos de la tarte aux pommes s'applique, de la même façon, pour la pizza.",
        26: "Telle est la décision hala'hique du Rav Dvorkin.",
        27: "Si le raisin n'est pas mûr, on dira Haadama. En outre, il est préférable de ne pas manger, en dehors du repas, une grappe entière de raisin ou bien une trentaine de grammes de raisins (Kazait). En pareil cas, il y aurait un doute sur la bénédiction finale, qui peut être Al Haets ou bien Boré Nefachot.",
        28: "Telle est la décision hala'hique du Rav Dvorkin, concernant les cacahuètes ou les raisins secs enrobés de chocolat. Celui-ci considère, en effet, que le chocolat y reçoit le rôle essentiel. A propos du chocolat, on verra également la note 12.",
        29: "Pour une soupe de pois cassés ou bien de champignons, en revanche, la bénédiction est Chéhakol.",
        30: "Une soupe d'orge sans légume soulève, en effet, un double doute. Le premier concerne la bénédiction initiale qui doit être récitée : Est-ce Mezonot ou Haadama (Séder Birkat Ha Néhénin, chapitre 1, au paragraphe 11) ? Le second est lié à la bénédiction finale. Si cette soupe n'est pas consommée pendant le repas, on dira Chéhakol (Séder Birkat Ha Néhénin, chapitre 1, au paragraphe 4), puis Boré Nefachot (Séder Birkat Ha Néhénin, chapitre 1, au paragraphe 8). Si l'on dit Haadama ou Mezonot comme bénédiction initiale, on est considéré comme s'étant acquitté de son obligation. La bénédiction finale sera alors Boré Nefachot, que l'on ait dit Haadama, Mezonot ou Chéhakol.",
        31: "Voir la note précédente. Si la soupe d'orge et de légumes n'est pas consommée durant un repas, il suffira de dire la bénédiction Haadama.",
        32: "Si, à la fin du plat, il ne reste plus que des boulettes de viande, il ne sera pas nécessaire de dire la bénédiction Chéhakol pour les consommer (Choul'han Arou'h, chapitre 168, au paragraphe 9).",
        33: "Il est préférable de ne pas consommer la quantité de tarte aux pommes permettant de se rassasier (Kedei Svya), soit plus de deux cent seize ou de deux cent vingt-quatre grammes. Si l'on souhaite atteindre cette quantité, on s'efforcera de le faire à l'intérieur d'un repas, introduit par la bénédiction Hamotsi. Ce principe s'applique, de la même façon, à tout aliment qui, une fois cuit, requiert la bénédiction Mezonot.",
        34: "Ajouté à la liste hors du guide du Beth Loubavitch, pour couvrir les fruits et légumes courants (et leurs noms usuels). Classement d'après la règle générale : fruit qui pousse sur un arbre, Haets ; fruit d'une plante ou qui pousse dans la terre, Haadama ; le cas de la banane (note 2) n'est pas transposé. À faire relire par un rav avant de s'y fier.",
        35: "Classement discuté : la plante (arbuste, liane, cactus, papayer) n'est pas un arbre au sens strict, et les autorités ne sont pas unanimes. Demandez à votre rav avant de dire la bénédiction.",
        36: "Herbe aromatique : par analogie avec la menthe et la ciboulette du guide, on dit Chéhakol quand on la consomme pour son goût, en petite quantité. Si on la mange en quantité, comme un légume, la bénédiction est Haadama. Demandez à votre rav."
    };

    // Les rites. La liste du Beth Loubavitch est celle de 'Habad : c'est le rite par défaut, et celui des colonnes que l'on ne modifie pas.
    // Pour les deux autres, `RITE_OVERRIDES` donne les écarts connus, par nom d'aliment : { b (la bénédiction du rite, si elle diffère de 'Habad), note }.
    // Ces écarts ne viennent PAS du Beth Loubavitch : ils sont donnés par le propriétaire de l'app, à faire relire par un rav ; un aliment qui n'y figure pas
    // s'affiche avec la bénédiction 'Habad, sans qu'on ait vérifié l'usage des autres rites.
    var RITES = {
        sefarade: { fr: 'Séfarade', short: 'Séfarade', desc: 'Usage séfarade, d\'après le Choul\'han Arou\'h de Maran Rabbi Yossef Karo et des décisionnaires séfarades comme le Rav Ovadia Yossef. Sur plusieurs points, il diffère de l\'usage \'Habad.' },
        ashkenaze: { fr: 'Ashkénaze', short: 'Ashkénaze', desc: 'Usage ashkénaze courant, d\'après le Rema et le Michna Béroura. \'Habad en est une branche, mais l\'Admour Hazaken a tranché différemment sur quelques points.' },
        habad: { fr: 'Loubavitch (\'Habad)', short: '\'Habad', desc: 'La liste du Beth Loubavitch, telle quelle, d\'après les décisions de l\'Admour Hazaken (Séder Birkat Ha Néhénin et Sidour).' }
    };
    var RITE_ORDER = ['sefarade', 'ashkenaze', 'habad'];
    var DEFAULT_RITE = 'habad';

    var RICE_SEF = { b: 'mezonot', note: 'Mezonot, surtout si le riz est cuit et mou ou collant, car il nourrit. Certains décisionnaires disent aussi Mezonot quand les grains restent distincts. La bénédiction finale reste Boré Nefachot.' };
    var RICE_ASH = { b: 'mezonot', note: 'Généralement Mezonot, surtout si le riz est cuit et un peu collant ou mou : c\'est l\'avis le plus répandu chez les Ashkénazes non-\'Habad. La bénédiction finale reste Boré Nefachot.' };
    // Le petit pain au jus de fruits est une autre ligne de la liste : c'est le liquide de la pâte, non le sucre, qui change la bénédiction chez 'Habad et chez les Ashkénazes.
    var JUS_PAIN = 'Ne pas le confondre avec le « petit pain confectionné avec du jus de fruits » (ligne à part, Mezonot) : chez \'Habad et chez les Ashkénazes, ce n\'est pas le sucre qui change la bénédiction, mais le liquide de la pâte (jus de fruits plutôt qu\'eau).';
    var SALTY = 'Mezonot. De nombreuses autorités (dont des Séfarades) ne reprennent pas la précaution \'Habad de les manger dans un repas, après Hamotsi.';

    // La pizza : le guide ne donne que Mezonot (notes 25 et 33). Selon la pâte et la quantité, la bénédiction change : un écart peut donc aussi porter des cas (`steps`),
    // pour n'importe quel rite, 'Habad compris. Le plus sûr, en cas de doute : se laver les mains, dire Hamotsi sur du pain ordinaire et manger la pizza dans ce repas.
    var PIZZA_SEF = [
        { t: 'Pâte ordinaire (eau, farine, sel, levure), même garnie de fromage et de tomate', b: 'hamotsi' },
        { t: 'Pâte enrichie de lait, de sucre ou de jus de fruit, dont le goût est réellement perceptible : une petite portion', b: 'mezonot' },
        { t: 'Quantité de repas (classiquement autour de 216 g de pâte, soit environ deux parts) ou plus, même sur une pâte Mezonot', b: 'hamotsi' },
        { t: 'Pizza accompagnée de salade, de frites, etc., qui en font un repas', b: 'hamotsi' }
    ];
    var PIZZA_ASH = [
        { t: 'Une petite part, mangée seule comme en-cas', b: 'mezonot' },
        { t: 'Quantité de repas (environ deux parts, plus de 216 g de pâte) ou plus', b: 'hamotsi' },
        { t: 'Pizza accompagnée de salade, de frites, etc., qui en font un repas', b: 'hamotsi' }
    ];
    var PIZZA_SAFE = 'En cas de doute sérieux, le plus sûr est de se laver les mains, de dire Hamotsi sur du pain ordinaire et de manger la pizza dans ce repas.';
    var RITE_OVERRIDES = {
        'Pizza': {
            sefarade: { steps: PIZZA_SEF, note: 'Une étiquette « Mezonot » sur une pizza ne suffit pas : il faut vérifier la recette et le goût de la pâte. ' + PIZZA_SAFE },
            ashkenaze: { steps: PIZZA_ASH, note: 'Beaucoup considèrent la pizza comme un en-cas. ' + PIZZA_SAFE },
            habad: { steps: PIZZA_ASH, note: 'Le guide indique Mezonot (notes 25 et 33) : on ne mange pas la quantité d\'un repas hors d\'un repas introduit par Hamotsi. ' + PIZZA_SAFE }
        },
        'Riz': { sefarade: RICE_SEF, ashkenaze: RICE_ASH },
        'Soupe au riz': { sefarade: RICE_SEF, ashkenaze: RICE_ASH },
        'Omelette au riz': { sefarade: RICE_SEF, ashkenaze: RICE_ASH },
        'Banane': {
            sefarade: { note: 'Haadama, de façon claire et certaine : pas de doute de Haets, contrairement à ce que dit la note 2 pour \'Habad. Si l\'on a dit Haets par erreur, de nombreux décisionnaires considèrent qu\'on est quitte.' },
            ashkenaze: { note: 'Haadama, comme chez \'Habad : le doute de Haets que mentionne la note 2 reste théorique, et la pratique courante est Haadama.' }
        },
        'Petit pain': {
            sefarade: { note: 'Hamotsi, sauf si la douceur est notable (goût sucré net, comme beaucoup de challot modernes au sucre ou aux raisins) : on dit alors Mezonot. Un Séfarade invité chez des Ashkénazes ou des \'Habad peut demander une challa non sucrée, ou apporter la sienne. ' + JUS_PAIN },
            ashkenaze: { note: 'Hamotsi, y compris pour les challot sucrées, comme chez \'Habad. ' + JUS_PAIN }
        },
        'Matsa': {
            sefarade: { b: 'mezonot', note: 'Mezonot toute l\'année, sauf à Pessa\'h, où elle devient Hamotsi (c\'est alors le seul pain que l\'on a).' },
            ashkenaze: { note: 'Hamotsi hors de Pessa\'h, comme chez \'Habad.' }
        },
        'Chocolat': { sefarade: { note: 'Chéhakol aussi, le plus souvent ; certains décisionnaires séfarades discutent davantage la possibilité de Haets (voir la note 12).' } },
        'Bretzel': { sefarade: { note: SALTY }, ashkenaze: { note: SALTY } },
        'Biscuit salé': { sefarade: { note: SALTY }, ashkenaze: { note: SALTY } },
        'Soupe d\'orge sans légume': { sefarade: { note: 'Les règles très précises de ce cas sont celles de l\'Admour Hazaken. Chez les Séfarades, elles sont parfois plus souples ou classées autrement : suivre son rav.' } },
        'Soupe d\'orge et de légumes': { sefarade: { note: 'Les règles très précises de ce cas sont celles de l\'Admour Hazaken. Chez les Séfarades, elles sont parfois plus souples ou classées autrement : suivre son rav.' } },
        'Soupe de champignon et d\'orge': { sefarade: { note: 'Les règles très précises de ce cas sont celles de l\'Admour Hazaken. Chez les Séfarades, elles sont parfois plus souples ou classées autrement : suivre son rav.' } }
    };

    // --- Les bénédictions finales (après avoir mangé ou bu) -----------------------------------------------------------------------------
    // Elles se déduisent de la bénédiction initiale : Hamotsi → Birkat Hamazon ; Mezonot → Al Hamihya ; Haguafen → Al Haguéfen ; Haets → Al Haets si c'est
    // l'un des fruits des sept espèces (raisin, figue, grenade, olive, datte), sinon Boré Nefachot ; Haadama et Chéhakol → Boré Nefachot. Ces règles ne viennent
    // PAS du guide du Beth Loubavitch (qui ne cite la bénédiction finale que dans quelques notes) : elles sont ajoutées par l'application et sont à faire relire
    // par un rav. Les textes s'ouvrent dans le Siddour (`sections`).
    // Où s'ouvre le texte d'une bénédiction finale, selon le rite : { ids (sections du Siddour), title }. Boré Nefachot est le même dans les trois rites ;
    // Méeïn Chalosh (Al Hamihya, Al Haguéfen, Al Haets) a une édition séfarade et une ashkénaze (utilisée aussi pour 'Habad, faute d'un texte 'Habad sourcé).
    function SAME(ids, title) { var o = { ids: ids, title: title }; return { sefarade: o, ashkenaze: o, habad: o }; }
    function MEEIN(name) {
        return {
            sefarade: { ids: ['al-hamihya'], title: name + ' (Méeïn Chalosh)' },
            ashkenaze: { ids: ['al-hamihya-ashkenaze'], title: name + ' (Méeïn Chalosh, nusach ashkénaze)' },
            habad: { ids: ['al-hamihya-ashkenaze'], title: name + ' (Méeïn Chalosh, nusach ashkénaze)' }
        };
    }
    var FINALS = {
        hamazon: { he: 'בִּרְכַּת הַמָּזוֹן', fr: 'Birkat Hamazon', use: 'Après un repas avec du pain.', open: { sefarade: { ids: ['birkat-hamazon'], title: 'Birkat haMazon' }, ashkenaze: { ids: ['birkat-hamazon-ashkenaze'], title: 'Birkat haMazon (nusach ashkénaze)' }, habad: { ids: ['birkat-hamazon-habad'], title: 'Birkat haMazon (nusach Sefard)' } } },
        hamihya: { he: 'עַל הַמִּחְיָה', fr: 'Al Hamihya', use: 'Après un aliment des cinq céréales, hors pain (Méeïn Chalosh).', open: MEEIN('Al Hamihya') },
        hagefen: { he: 'עַל הַגֶּפֶן', fr: 'Al Haguéfen', use: 'Après le vin ou le jus de raisin (Méeïn Chalosh).', open: MEEIN('Al Haguéfen') },
        haets: { he: 'עַל הָעֵץ', fr: 'Al Haets', use: 'Après l\'un des fruits des sept espèces : raisin, figue, grenade, olive, datte (Méeïn Chalosh).', open: MEEIN('Al Haets') },
        nefachot: { he: 'בּוֹרֵא נְפָשׁוֹת', fr: 'Boré Nefachot', use: 'Après tout autre aliment ou boisson.', open: SAME(['birkhot-hanehenin'], 'Boré Nefachot') }
    };
    var FINAL_ORDER = ['hamazon', 'hamihya', 'hagefen', 'haets', 'nefachot'];
    var FINAL_NONE = 'Pas de bénédiction initiale, donc pas de bénédiction finale.';

    // Les fruits des sept espèces de la liste (Al Haets) ; les autres fruits de l'arbre se terminent par Boré Nefachot.
    var SEVEN_SPECIES = ['Datte', 'Figue', 'Grenade', 'Olives mûres ou préparées', 'Raisin mûr', 'Raisin sec'];
    // Les aliments où la bénédiction finale ne suit pas la règle (le riz, même quand on dit Mezonot au début : Boré Nefachot dans tous les rites).
    var FINAL_OVERRIDES = { 'Riz': 'nefachot', 'Soupe au riz': 'nefachot', 'Omelette au riz': 'nefachot' };
    // Les boissons et les soupes : la quantité est une revi'it (un liquide), non un kazaït.
    var LIQUIDS = ['Boisson au chocolat', 'Bouillon', 'Bouillon de poulet sans pâtes', 'Brandy', 'Café', 'Café glacé', 'Cidre', 'Citronnade', 'Eau, quand on a soif', 'Eau gazeuse',
        'Jus de fruits à l\'exception du jus de raisin ou de tomate', 'Jus d\'ananas', 'Jus de pamplemousse', 'Jus de pomme', 'Jus de pruneau', 'Jus de tomate', 'Lait', 'Limonade',
        'Petit lait', 'Soda aux extraits de gingembre', 'Soda gazeux', 'Thé', 'Thé glacé', 'Whisky', 'Soupe au riz', 'Soupe au maïs', 'Soupe aux choux', 'Soupe de betterave', 'Soupe de champignon',
        'Soupe de légumes', 'Soupe de légumes secs', 'Soupe de lentilles', 'Soupe de petits pois', 'Soupe de pois cassés', 'Soupe à la tomate'];
    // Une précision de plus sur la bénédiction finale, pour un aliment et un rite.
    var FINAL_NOTES = {
        'Matsa': { sefarade: 'À Pessa\'h, où la matsa devient Hamotsi : Birkat Hamazon.' }
    };
    // --- La halakha générale (avant la liste des aliments) -----------------------------------------------------------------------------
    // Synthèse des règles de l'ordre des bénédictions, du plat mélangé (Ikar veTafel) et du dessert après un repas. Ce texte n'est PAS du guide du Beth Loubavitch :
    // il est repris des notes fournies pour l'app et doit être relu par un rav. Les points qui ne concordent pas avec la liste (riz, gâteaux) sont signalés, pas corrigés.
    var HALAKHA = {
        note: 'Synthèse pour l\'étude, à vérifier auprès d\'un rav. Elle n\'est pas du guide du Beth Loubavitch, et la liste des aliments ci-dessous n\'a pas été modifiée pour s\'y conformer.',
        sections: [
            { id: 'ordre', title: 'Plusieurs aliments devant soi : l\'ordre des bénédictions',
              paras: ['Quand plusieurs aliments ont des bénédictions différentes, on suit l\'ordre Maga Esh (מג״ע א״ש) :'],
              list: [
                  { b: 'hamotsi', t: 'Hamotsi (pain) : prime toujours sur tout le reste et acquitte les autres aliments, sauf le vin et les desserts.' },
                  { b: 'mezonot', t: 'Mezonot (gâteaux, biscuits, pâtes, riz… à base des cinq céréales).' },
                  { b: 'haguafen', t: 'Haguafen (vin, jus de raisin).' },
                  { b: 'haets', t: 'Haets (fruits d\'arbre).' },
                  { b: 'haadama', t: 'Haadama (légumes, fruits de la terre).' },
                  { b: 'chehakol', t: 'Chéhakol (viande, poisson, œufs, boissons, chocolat…).' }
              ],
              bullets: [
                  'Même bénédiction : on bénit sur le plus important, d\'abord les Shiv\'at haMinim, puis l\'aliment entier (shalem), puis celui qu\'on préfère (\'chaviv).',
                  'Parmi les Shiv\'at haMinim (blé, orge, raisin, figue, grenade, olive, datte), l\'ordre suit le verset de la Torah (Devarim 8:8).',
                  'Entre Haets et Haadama : si l\'un est clairement préféré, on le choisit. Sinon, beaucoup d\'avis permettent de commencer par Haets.',
                  'On mange un peu de l\'aliment sur lequel on a béni avant de passer à la bénédiction suivante.'
              ] },
            { id: 'ikar', title: 'Plat mélangé : Ikar veTafel (principal et secondaire)',
              paras: ['Pour un mélange (casserole, salade, ragoût, plat composé…), on ne dit qu\'une seule bénédiction, sur le plat entier : celle de l\'Ikar, l\'élément principal.'],
              bullets: [
                  'Les cinq céréales (blé, orge, épeautre, seigle, avoine) qui donnent du goût ou de la satiété : en général Mezonot, même minoritaires. Exception : une céréale qui n\'est là que comme liant (farine dans une farce de viande pure) est ignorée.',
                  'Sinon, on regarde ce qui est clairement le principal, c\'est-à-dire ce pour quoi on mange le plat. À défaut d\'un principal évident, on suit la majorité, en volume ou en quantité.'
              ],
              examples: [
                  'Quiche aux légumes et aux œufs : majoritairement légumes, Haadama ; majoritairement œufs, Chéhakol.',
                  'Riz avec un peu de légumes ou de viande : Mezonot.',
                  'Salade de fruits : la bénédiction du fruit majoritaire, ou du plus important en cas d\'égalité.',
                  'Spaghetti bolognaise : Mezonot, les pâtes dominent.',
                  'Poulet pané : Chéhakol, la panure n\'est que secondaire.',
                  'Yaourt aux fruits : Chéhakol, le yaourt est l\'Ikar.'
              ],
              bullets: [
                  'Si les aliments sont clairement séparés et mangés indépendamment (riz d\'un côté, légumes de l\'autre), on bénit séparément, selon l\'ordre Maga Esh.'
              ] },
            { id: 'dessert', title: 'Dessert après un repas avec Hamotsi',
              paras: ['Après un repas avec Hamotsi, tout ce qui fait partie du repas (viande, poisson, légumes, riz, pâtes…, ce qui nourrit et rassasie) est couvert par Hamotsi : on ne bénit pas dessus.',
                  'Le dessert, qu\'on mange pour le plaisir alors qu\'on est déjà rassasié, ne fait pas partie du repas. Il demande donc une bénédiction avant (beracha rishona), mais pas de bénédiction après : Birkat Hamazon le couvre.'],
              table: [
                  { type: 'Fruits (pomme, raisin, etc.)', before: 'Oui (Haets ou Haadama)', note: 'Très clair.' },
                  { type: 'Noix, amandes, graines', before: 'Oui', note: '' },
                  { type: 'Bonbons, chocolat, gâteaux secs', before: 'Oui (Chéhakol)', note: '' },
                  { type: 'Glace', before: 'Oui (Chéhakol)', note: 'Mieux de la manger après Birkat Hamazon si possible.' },
                  { type: 'Gâteaux et pâtisseries ordinaires (gâteau moelleux, cookies simples)', before: 'Généralement non', note: 'On s\'appuie sur Hamotsi : ils sont considérés comme pat haba\'ah bekisnin.' },
                  { type: 'Gâteaux clairement Mezonot (croustillants, sucrés et fourrés : baklava, wafers, sandwich cookies…)', before: 'Oui (Mezonot)', note: 'Seulement s\'ils remplissent les trois critères.' }
              ],
              bullets: [
                  'Shabbat et Yom Tov : certains disent Birkat Hamazon avant le dessert, pour pouvoir bénir le dessert après (beracha rishona et acharona). C\'est permis Shabbat et Yom Tov, pas en semaine, où l\'on atteint facilement les cent bénédictions.',
                  'Shabbat, après le Kiddouch sur le vin : certains avis, surtout séfarades, préfèrent manger la glace après Birkat Hamazon.',
                  'Résumé : fruits, noix, chocolat et glace se bénissent toujours avant. Un gâteau ordinaire ne se bénit en général pas. Birkat Hamazon couvre tout le dessert.'
              ] },
            { id: 'rites', title: 'Ashkénazes et séfarades : les différences',
              paras: ['Les principes sont les mêmes (Maga Esh et Ikar veTafel viennent du Choul\'han Arou\'h). Dans la plupart des situations du quotidien, les deux traditions font la même chose. Les différences portent sur quelques cas.'],
              bullets: [
                  'Vin, olives et dattes : chez les Ashkénazes, Haguafen précède presque toujours Haets, y compris pour les olives et les dattes. Selon beaucoup de séfarades (le Kaf haHaïm), le vin ne précède pas les olives et les dattes, qu\'on peut donc bénir d\'abord.',
                  'Haets et Haadama : les deux traditions suivent le \'chaviv. Sans préférence claire, les Ashkénazes (Mishna Beroura) penchent souvent vers Haets. Les séfarades suivent davantage le \'chaviv actuel, ou un Shiv\'at haMinim plus strict selon les poskim (Ben Ish \'Haï).',
                  'Riz : la plupart des Ashkénazes disent Mezonot. Beaucoup de séfarades disent Haadama (ou Chéhakol), surtout si le riz n\'est pas collant. Voir le point à trancher ci-dessous.',
                  'Cas limites du plat mélangé (farce, panure, quantités proches) : les Ashkénazes s\'appuient sur le Mishna Beroura et l\'Arou\'h haChoul\'han, les séfarades sur le Kaf haHaïm, le Ben Ish \'Haï et le Yalkout Yossef, parfois plus stricts sur la notion de majorité.'
              ] },
            { id: 'a-trancher', title: 'Points à faire trancher par un rav',
              paras: ['Ces points ne concordent pas encore avec les données de l\'écran. Ils sont signalés ici, mais la liste n\'a pas été modifiée.'],
              bullets: [
                  'Riz (rite séfarade) : cette synthèse dit souvent Haadama ; la fiche du riz dans la liste, pour le rite séfarade, dit Mezonot quand le riz est cuit et collant.',
                  'Gâteau : la liste donne Mezonot pour « Gâteau », hors d\'un repas. Le tableau du dessert dit généralement pas de bénédiction après un repas avec Hamotsi. Les deux peuvent se lire ensemble (hors repas, ou en dessert), mais c\'est à confirmer.',
                  'Les trois critères des gâteaux « clairement Mezonot » (croustillants, sucrés, fourrés) : leur source reste à préciser.'
              ] }
        ]
    };

    // La quantité qui oblige à la bénédiction finale. Les mesures de 'Habad sont celles des notes 4 et 7 du guide ; pour les autres rites, on n'a pas de mesure
    // sourcée : l'écran renvoie au rav.
    var SHIUR = {
        habad: { food: 'au moins un kazaït (une trentaine de grammes), mangé en six minutes environ', drink: 'environ un huitième de litre (revi\'it), bu en six minutes environ' },
        sefarade: { food: 'au moins un kazaït (un volume d\'olive), mangé en peu de temps', drink: 'au moins une revi\'it, bue en peu de temps' },
        ashkenaze: { food: 'au moins un kazaït (un volume d\'olive), mangé en peu de temps', drink: 'au moins une revi\'it, bue en peu de temps' }
    };
    var SHIUR_HINT = {
        habad: 'Mesures du guide du Beth Loubavitch (notes 4 et 7).',
        sefarade: 'Les mesures en grammes, en centilitres et en minutes varient selon les avis : demandez à votre rav.',
        ashkenaze: 'Les mesures en grammes, en centilitres et en minutes varient selon les avis : demandez à votre rav.'
    };

    return { FINALS: FINALS, FINAL_ORDER: FINAL_ORDER, FINAL_NONE: FINAL_NONE, SEVEN_SPECIES: SEVEN_SPECIES, FINAL_OVERRIDES: FINAL_OVERRIDES, LIQUIDS: LIQUIDS,
        FINAL_NOTES: FINAL_NOTES, HALAKHA: HALAKHA, SHIUR: SHIUR, SHIUR_HINT: SHIUR_HINT, SOURCE: SOURCE, BLESSINGS: BLESSINGS, ORDER: ORDER, NONE: NONE, FOODS: FOODS, NOTES: NOTES, RITES: RITES, RITE_ORDER: RITE_ORDER, DEFAULT_RITE: DEFAULT_RITE, RITE_OVERRIDES: RITE_OVERRIDES };
}));
