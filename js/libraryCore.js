// =========================================================================
// === LA BIBLIOTHÈQUE JUIVE (DONNÉES ET RÈGLES, outil de la boîte à outils) ===
// =========================================================================
// Qui a écrit quoi, quand et où : les grandes œuvres de la tradition juive après la Bible, de la Michna à nos jours. Pur, sans DOM : testé dans
// tests/libraryCore.test.js. Pas de texte de prière, pas d'image de livre.
//
// Une œuvre : { id, fr, he, genre, author (texte libre : l'auteur, ou l'école qui l'a mise en forme), authorId (l'identifiant d'un maître de la chaîne de
//   transmission, ou null), from, to (années de l'ère commune ; l'œuvre a été écrite ou mise en forme entre les deux), approx (vrai si la datation varie
//   selon les sources), place, desc (ce que c'est), trad (l'attribution traditionnelle quand elle diffère de ce que disent les historiens, ou '') }.
// `life` ('life', 'died', 'contemp' ou '') et `bib` : voir « Complément » plus bas (œuvres datées par la vie de l'auteur).
// Les dates sont celles couramment admises (Encyclopaedia Judaica, Jewish Encyclopedia, Sefaria, notices des éditions). À relire par une personne compétente.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.LibraryCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les genres, dans l'ordre de l'affichage.
    var GENRES = [
        { id: 'michna', fr: 'Michna et littérature tannaïtique' },
        { id: 'talmud', fr: 'Talmud' },
        { id: 'midrash', fr: 'Midrach et Targoum' },
        { id: 'gueonim', fr: 'Guéonim' },
        { id: 'halakha', fr: 'Codes et responsa' },
        { id: 'commentaire', fr: 'Commentaires' },
        { id: 'philosophie', fr: 'Philosophie et morale' },
        { id: 'moussar', fr: 'Moussar et ’Hachkafa' },
        { id: 'kabbale', fr: 'Kabbale' },
        { id: 'hassidout', fr: 'Hassidout' },
        { id: 'reference', fr: 'Dictionnaires, géographie et encyclopédies' }
    ];
    // Les périodes de l'affichage (par année de rédaction).
    var ERAS = [
        { id: 'tannaim', fr: 'Époque de la Michna (jusqu’à 220)', from: -Infinity, to: 220 },
        { id: 'talmud', fr: 'Époque du Talmud (220–650)', from: 221, to: 650 },
        { id: 'gueonim', fr: 'Guéonim (650–1040)', from: 651, to: 1040 },
        { id: 'richonim', fr: 'Richonim (1040–1500)', from: 1041, to: 1500 },
        { id: 'aharonim', fr: '’Aharonim (depuis 1500)', from: 1501, to: Infinity }
    ];

    var WORKS = [];
    var BY = {};
    function w(id, fr, he, genre, author, authorId, from, to, approx, place, desc, trad) {
        var o = { id: id, fr: fr, he: he, genre: genre, author: author, authorId: authorId, from: from, to: to, approx: !!approx, place: place, desc: desc, trad: trad || '' };
        WORKS.push(o);
        BY[id] = o;
    }

    // --- Michna et littérature tannaïtique ---------------------------------------------------------------
    w('michna', 'La Michna', 'משנה', 'michna', 'Rabbi Yéhouda HaNassi, d’après les enseignements des tannaïm', 'yehouda_nassi', 200, 220, true, 'Tsippori (Galilée)', 'Le recueil de la Loi orale en six ordres et 63 traités : la base du Talmud.');
    w('seder_olam', 'Séder Olam Rabba', 'סדר עולם רבא', 'michna', 'Rabbi Yossi ben Halafta', 'yossi_halafta', 140, 160, true, 'Tsippori (Galilée)', 'La chronologie du monde, d’Adam à la révolte de Bar Kokhba.');
    w('mekhilta', 'Mekhilta de-Rabbi Yichmaël', 'מכילתא דרבי ישמעאל', 'michna', 'École de Rabbi Yichmaël', 'ichmael', 200, 250, true, 'Terre d’Israël', 'Midrach halakhique sur le livre de l’Exode.');
    w('sifra', 'Sifra', 'ספרא', 'michna', 'École de Rabbi Akiva (Sifra de-vei Rav)', 'akiva', 200, 250, true, 'Terre d’Israël', 'Midrach halakhique sur le Lévitique.');
    w('sifrei', 'Sifrei', 'ספרי', 'michna', 'École de Rabbi Akiva et de Rabbi Yichmaël', null, 200, 250, true, 'Terre d’Israël', 'Midrach halakhique sur les Nombres et le Deutéronome.');
    w('tosefta', 'Tossefta', 'תוספתא', 'michna', 'Rabbi Hiyya et Rabbi Hochaya, d’après les baraïtot', 'hiyya', 200, 300, true, 'Terre d’Israël', 'Un complément de la Michna, avec les mêmes ordres et presque les mêmes traités.', 'Attribuée à Rabbi Hiyya (selon Rabbi Yohanan, Sanhédrin 86a)');

    // --- Talmud ---------------------------------------------------------------------------------------------
    w('yerouchalmi', 'Talmud de Jérusalem (Yérouchalmi)', 'תלמוד ירושלמי', 'talmud', 'Académies de Tibériade, Césarée et Tsippori ; école de Rabbi Yohanan', 'yohanan', 350, 400, true, 'Tibériade (Galilée)', 'La Guémara de Terre d’Israël : 39 traités, plus concis que celui de Babylone.');
    w('bavli', 'Talmud de Babylone (Bavli)', 'תלמוד בבלי', 'talmud', 'Rav Achi et Ravina, puis les Savoraïm', 'rav_achi', 430, 550, true, 'Soura, Poumbedita, Mata Mehasya (Babylonie)', 'La Guémara de Babylonie : 37 traités, la référence de la halakha.', 'Mis en forme par Rav Achi (mort en 427) et Ravina (mort en 499)');

    // --- Midrach et Targoum ---------------------------------------------------------------------------------
    w('onkelos', 'Targoum Onkelos', 'תרגום אונקלוס', 'midrash', 'Onkelos le prosélyte ; rédaction finale en Babylonie', null, 100, 400, true, 'Terre d’Israël puis Babylonie', 'La traduction araméenne de la Torah, imprimée avec le Houmach.', 'Onkelos, élève de Rabbi Eliezer et de Rabbi Yehoshoua (Méguila 3a)');
    w('yonatan', 'Targoum Yonatan sur les Prophètes', 'תרגום יונתן', 'midrash', 'Yonatan ben Ouziel (selon la tradition)', 'yonatan_ouziel', 100, 400, true, 'Terre d’Israël puis Babylonie', 'La traduction araméenne des Prophètes.', 'Yonatan ben Ouziel, élève de Hillel (Méguila 3a)');
    w('berechit_rabba', 'Béréchit Rabba', 'בראשית רבה', 'midrash', 'Anonyme ; Terre d’Israël', null, 400, 450, true, 'Terre d’Israël', 'Le grand midrach sur la Genèse, verset par verset.', 'Parfois attribué à Rabbi Hochaya Rabba');
    w('vayikra_rabba', 'Vayikra Rabba', 'ויקרא רבה', 'midrash', 'Anonyme ; Terre d’Israël', null, 400, 500, true, 'Terre d’Israël', 'Midrach en sermons sur le Lévitique.');
    w('pesikta', 'Pessikta de-Rav Kahana', 'פסיקתא דרב כהנא', 'midrash', 'Anonyme ; Terre d’Israël', null, 400, 500, true, 'Terre d’Israël', 'Sermons pour les fêtes et les lectures spéciales de l’année.');
    w('eikha_rabba', 'Midrach Rabba sur les cinq Méguilot', 'מדרש רבה על חמש מגילות', 'midrash', 'Anonymes', null, 500, 900, true, 'Terre d’Israël', 'Midrach sur Eikha, Routh, Chir HaChirim, Kohélet et Esther.');
    w('tanhouma', 'Midrach Tanhouma', 'מדרש תנחומא', 'midrash', 'École de Rabbi Tanhouma bar Aba', null, 500, 900, true, 'Terre d’Israël', 'Midrach sur la Torah, en sermons.');
    w('pirke_rabbi_eliezer', 'Pirké de-Rabbi Éliézer', 'פרקי דרבי אליעזר', 'midrash', 'Anonyme', 'eliezer_hyrcanus', 750, 850, true, 'Terre d’Israël', 'Récits de la création à l’exode.', 'Attribué à Rabbi Eliezer ben Hyrcanus');
    w('avot_natan', 'Avot de-Rabbi Natan', 'אבות דרבי נתן', 'midrash', 'Anonyme', null, 700, 900, true, 'Terre d’Israël ou Babylonie', 'Un commentaire de Pirké Avot, avec des récits sur les maîtres.', 'Attribué à Rabbi Natan HaBavli');
    w('shemot_rabba', 'Chémot Rabba, Bamidbar Rabba, Devarim Rabba', 'שמות רבה, במדבר רבה, דברים רבה', 'midrash', 'Anonymes', null, 800, 1200, true, 'Terre d’Israël et Europe', 'Les trois autres Midrach Rabba, plus tardifs.');

    // --- Guéonim --------------------------------------------------------------------------------------------
    w('sheiltot', 'Chéiltot', 'שאילתות', 'gueonim', 'Rav Ahaï Gaon de Chabha', 'ahai_gaon', 740, 752, true, 'Chabha (Babylonie)', 'Sermons halakhiques organisés selon les parachiot de la Torah.');
    w('halakhot_gedolot', 'Halakhot Guédolot', 'הלכות גדולות', 'gueonim', 'Rav Chimon Kayyara', null, 800, 850, true, 'Babylonie', 'Le premier code du Talmud, organisé par sujets.');
    w('seder_amram', 'Séder Rav Amram Gaon', 'סדר רב עמרם גאון', 'gueonim', 'Rav Amram Gaon', 'amram_gaon', 850, 875, true, 'Soura', 'Le premier livre de prières complet, avec les lois qui l’accompagnent.');
    w('tafsir', 'Tafsir (traduction arabe de la Torah)', 'תפסיר', 'gueonim', 'Rav Saadia Gaon', 'saadia_gaon', 920, 940, true, 'Soura', 'La traduction et le commentaire de la Torah en arabe.');
    w('emounot', 'Émounot VéDéot', 'אמונות ודעות', 'philosophie', 'Rav Saadia Gaon', 'saadia_gaon', 933, 933, false, 'Soura', 'Le premier grand livre de philosophie juive : foi et raison.');
    w('iggeret_sherira', 'Iguéret Rav Chérira Gaon', 'אגרת רב שרירא גאון', 'gueonim', 'Rav Chérira Gaon', 'sherira_gaon', 987, 987, false, 'Poumbedita', 'Une lettre sur la transmission de la Michna, du Talmud et des chaînes de maîtres, de la Michna aux Guéonim.');

    // --- Richonim : codes, responsa, philosophie -------------------------------------------------------------
    w('rif_halakhot', 'Halakhot du Rif', 'הלכות הרי״ף', 'halakha', 'Rabbi Yitzhak Alfassi (le Rif)', 'rif', 1070, 1103, true, 'Fès, Lucena', 'Le Talmud réduit à sa halakha : la première synthèse après les Guéonim.');
    w('kuzari', 'Le Kouzari', 'ספר הכוזרי', 'philosophie', 'Rabbi Yéhouda HaLévi', 'yehouda_halevi', 1140, 1140, true, 'Tolède', 'Un dialogue entre le roi des Khazars et un sage juif, sur la vérité du judaïsme.');
    w('hovot_levavot', 'Hovot HaLévavot (Devoirs des cœurs)', 'חובות הלבבות', 'philosophie', 'Rabbénou Bahya ibn Paquda', null, 1080, 1090, true, 'Saragosse', 'Un livre sur la vie intérieure du juif.');
    w('mishne_torah', 'Michné Torah (Yad HaHazaka)', 'משנה תורה', 'halakha', 'Rabbi Moché ben Maïmon (le Rambam)', 'rambam', 1170, 1180, true, 'Fustat (Le Caire)', 'Tout le droit juif en 14 livres : la seule œuvre qui traite de toute la Torah, sans références.');
    w('moreh', 'Moré Névoukhim (Le Guide des égarés)', 'מורה נבוכים', 'philosophie', 'Rabbi Moché ben Maïmon (le Rambam)', 'rambam', 1190, 1190, true, 'Fustat (Le Caire)', 'La philosophie juive, en arabe, dédiée à son élève Rabbi Yossef.');
    w('perush_mishna_rambam', 'Commentaire sur la Michna (Perouch HaMichna)', 'פירוש המשנה לרמב״ם', 'commentaire', 'Rabbi Moché ben Maïmon (le Rambam)', 'rambam', 1158, 1168, true, 'Le Caire', 'Un commentaire de toute la Michna, avec les treize principes de foi.');
    w('sefer_mitsvot', 'Séfer HaMitsvot', 'ספר המצוות', 'halakha', 'Rabbi Moché ben Maïmon (le Rambam)', 'rambam', 1170, 1170, true, 'Le Caire', 'Les 613 commandements, selon quatorze règles de classement.');
    w('sefer_hinoukh', 'Séfer HaHinoukh', 'ספר החינוך', 'halakha', 'Un Rabbi Aharon HaLévi (Barcelone, XIIIe siècle)', null, 1250, 1290, true, 'Barcelone', 'Les 613 commandements, parachat par parachat, avec leur raison.', 'Le Raah (Rabbi Aharon HaLévi de Barcelone) ; cette attribution est aujourd’hui largement écartée : l’auteur serait un autre Aharon HaLévi');
    w('sefer_hassidim', 'Séfer Hassidim', 'ספר חסידים', 'philosophie', 'Rabbi Yéhouda HeHassid', null, 1190, 1217, true, 'Ratisbonne', 'Le livre des piétistes d’Allemagne : mœurs et morale.');
    w('sefer_rokeah', 'Séfer HaRokéah', 'ספר הרוקח', 'halakha', 'Rabbi Elazar de Worms', null, 1200, 1238, true, 'Worms', 'Lois et mystique des piétistes d’Allemagne.');
    w('chaarei_teshouva', 'Chaaréi Téchouva (Les portes du repentir)', 'שערי תשובה', 'philosophie', 'Rabbénou Yona de Gérone', 'yonah_gerondi', 1240, 1263, true, 'Barcelone', 'Le grand livre du repentir.');
    w('responsa_rachba', 'Réponses du Rachba', 'שו״ת הרשב״א', 'halakha', 'Rabbi Chlomo ben Adret (le Rachba)', 'rachba', 1270, 1310, true, 'Barcelone', 'Plus de sept mille réponses envoyées dans tout le monde juif.');
    w('responsa_maharam', 'Réponses du Maharam de Rothenbourg', 'שו״ת מהר״ם מרוטנבורג', 'halakha', 'Rabbi Méïr de Rothenbourg', 'maharam_rothenburg', 1250, 1293, true, 'Rothenbourg', 'Les réponses de la plus haute autorité d’Allemagne.');
    w('piskei_rosh', 'Piské HaRosh', 'פסקי הרא״ש', 'halakha', 'Rabbénou Acher (le Rosh)', 'rosh', 1300, 1327, true, 'Tolède', 'Le Talmud résumé en halakha, dans la ligne du Rif.');
    w('tur', 'Arbaa Tourim', 'ארבעה טורים', 'halakha', 'Rabbi Yaakov ben Acher (Baal HaTourim)', 'yaakov_acher', 1320, 1340, true, 'Tolède', 'Le code en quatre rangées (Orah Haïm, Yoré Déa, Even HaEzer, Hochen Michpat) : le plan du Choulhan Aroukh.');
    w('zohar', 'Le Zohar', 'ספר הזוהר', 'kabbale', 'Rabbi Moché de Léon ; attribué à Rabbi Chimon bar Yohaï', 'moche_leon', 1270, 1300, true, 'Espagne (Castille)', 'Commentaire mystique de la Torah, en araméen.', 'Rabbi Chimon bar Yohaï (IIe siècle), selon la tradition');
    w('bahir', 'Séfer HaBahir', 'ספר הבהיר', 'kabbale', 'Anonyme ; attribué à Rabbi Nehounya ben HaKana', 'nehounya', 1170, 1200, true, 'Provence', 'L’un des plus anciens livres de la Kabbale.', 'Rabbi Nehounya ben HaKana (Ier siècle)');
    w('sefer_yetsira', 'Séfer Yétsira', 'ספר יצירה', 'kabbale', 'Anonyme ; attribué à Abraham', null, 200, 600, true, 'Terre d’Israël ou Babylonie', 'Le livre de la Création : les 22 lettres et les dix séfirot.', 'Abraham, notre père');

    // --- Richonim : commentaires -----------------------------------------------------------------------------
    w('rachi_torah', 'Commentaire de Rachi sur la Torah', 'פירוש רש״י על התורה', 'commentaire', 'Rabbi Chlomo Yitzhaki (Rachi)', 'rachi', 1070, 1105, true, 'Troyes', 'Le commentaire de référence de la Torah, imprimé avec tous les Houmachim.');
    w('rachi_talmud', 'Commentaire de Rachi sur le Talmud', 'פירוש רש״י על התלמוד', 'commentaire', 'Rabbi Chlomo Yitzhaki (Rachi)', 'rachi', 1070, 1105, true, 'Troyes', 'Le commentaire de référence du Talmud de Babylone, imprimé à côté du texte.');
    w('tosafot', 'Tossafot', 'תוספות', 'commentaire', 'Les Tossafistes : Rabbénou Tam, le Ri, le Rach de Sens…', 'rabbenou_tam', 1100, 1300, true, 'France et Allemagne', 'Les gloses des petits-fils et élèves de Rachi, imprimées en face de Rachi.');
    w('rachbam_torah', 'Commentaire du Rachbam sur la Torah', 'פירוש הרשב״ם על התורה', 'commentaire', 'Rabbi Chmouel ben Méïr (le Rachbam)', 'rachbam', 1120, 1158, true, 'Ramerupt', 'Le sens simple (péchat) de la Torah.');
    w('ibn_ezra_torah', 'Commentaire d’Ibn Ezra sur la Torah', 'פירוש אבן עזרא על התורה', 'commentaire', 'Rabbi Avraham ibn Ezra', 'ibn_ezra', 1140, 1167, true, 'Italie, France, Angleterre', 'Grammaire et sens simple, avec des allusions mystérieuses.');
    w('radak_neviim', 'Commentaire du Radak sur les Prophètes', 'פירוש הרד״ק על הנביאים', 'commentaire', 'Rabbi David Kimhi (le Radak)', 'radak', 1190, 1235, true, 'Narbonne', 'Le commentaire de référence des Prophètes et des Psaumes.');
    w('ramban_torah', 'Commentaire du Ramban sur la Torah', 'פירוש הרמב״ן על התורה', 'commentaire', 'Rabbi Moché ben Nahman (le Ramban)', 'ramban', 1263, 1270, true, 'Barcelone, Terre d’Israël', 'Rachi et la Kabbale : le commentaire de la Torah le plus lu après celui de Rachi.');
    w('raavad_hassagot', 'Hassagot du Raavad sur le Michné Torah', 'השגות הראב״ד', 'commentaire', 'Rabbi Avraham ben David (le Raavad)', 'raavad', 1180, 1198, true, 'Posquières', 'Les critiques du Michné Torah, imprimées en bas de page.');
    w('ritva_hidushim', 'Hidouchim du Ritva', 'חידושי הריטב״א', 'commentaire', 'Rabbi Yom Tov Achbili (le Ritva)', 'ritva', 1300, 1330, true, 'Séville', 'Commentaires sur le Talmud, clairs et sûrs.');
    w('beit_habehira', 'Beit HaBéhira', 'בית הבחירה', 'commentaire', 'Rabbi Menahem HaMéïri', 'meiri', 1280, 1315, true, 'Perpignan', 'Un commentaire du Talmud qui résume les débats des Richonim.');
    w('bahya_torah', 'Commentaire de Rabbénou Bahya sur la Torah', 'פירוש רבנו בחיי', 'commentaire', 'Rabbi Bahya ben Acher', 'bahya_acher', 1291, 1291, false, 'Saragosse', 'Quatre niveaux : sens simple, midrach, raison et Kabbale.');
    w('abarbanel', 'Commentaire d’Abravanel sur la Torah et les Prophètes', 'פירוש אברבנאל', 'commentaire', 'Don Yitzhak Abravanel', 'abarbanel', 1483, 1508, true, 'Lisbonne, Naples, Venise', 'Des commentaires qui posent une série de questions sur chaque passage.');
    w('bartenura', 'Commentaire de Bartenura sur la Michna', 'פירוש ברטנורא', 'commentaire', 'Rabbi Ovadia de Bertinoro', 'bartenura', 1486, 1490, true, 'Jérusalem', 'Le commentaire de la Michna le plus répandu, d’après Rachi et le Rambam.');

    // --- 'Aharonim ----------------------------------------------------------------------------------------------
    w('beit_yossef', 'Beit Yossef', 'בית יוסף', 'halakha', 'Rabbi Yossef Karo (Maran)', 'karo', 1522, 1542, true, 'Édirne, Tsfat', 'Le commentaire monumental du Tour, qui suit toutes les opinions des Richonim.');
    w('shulhan_aroukh', 'Choulhan Aroukh', 'שולחן ערוך', 'halakha', 'Rabbi Yossef Karo (Maran)', 'karo', 1555, 1565, false, 'Tsfat (imprimé à Venise, 1565)', 'Le code de la halakha, en quatre parties, qui s’impose à tout le monde juif.');
    w('mapa', 'HaMapa (gloses du Rema)', 'המפה', 'halakha', 'Rabbi Moché Isserlès (le Rema)', 'rema', 1569, 1571, false, 'Cracovie', 'Les coutumes des Ashkénazes : ajoutées au Choulhan Aroukh, elles en font le code de toutes les communautés.');
    w('maggid_meisharim', 'Maguid Méicharim', 'מגיד מישרים', 'kabbale', 'Rabbi Yossef Karo (Maran)', 'karo', 1550, 1575, true, 'Tsfat', 'Le journal mystique de Rabbi Yossef Karo ; imprimé en 1646.');
    w('pardes_rimonim', 'Pardès Rimonim', 'פרדס רימונים', 'kabbale', 'Rabbi Moché Cordovero (le Ramak)', 'ramak', 1548, 1548, false, 'Tsfat', 'L’ordre de la Kabbale avant le Ari, selon les séfirot.');
    w('etz_haim', 'Étz Haïm', 'עץ חיים', 'kabbale', 'Rabbi Haïm Vital, d’après le Ari', 'haim_vital', 1572, 1600, true, 'Tsfat, Damas', 'La Kabbale du Ari : la création, les mondes et les restitutions.');
    w('gour_arye', 'Gour Aryé et Guévourot HaChem', 'גור אריה, גבורות ה׳', 'philosophie', 'Rabbi Yéhouda Loew (le Maharal)', 'maharal', 1578, 1582, true, 'Prague', 'Un commentaire de Rachi sur la Torah, et un livre sur l’exode.');
    w('netivot_olam', 'Netivot Olam', 'נתיבות עולם', 'philosophie', 'Rabbi Yéhouda Loew (le Maharal)', 'maharal', 1595, 1595, false, 'Prague', 'Les chemins du monde : les qualités morales et la vie d’étude.');
    w('shelah', 'Chné Loukhot HaBrit (le Chelah)', 'שני לוחות הברית', 'philosophie', 'Rabbi Yéchaya Horowitz (le Chelah HaKadoch)', 'shelah', 1618, 1623, true, 'Prague, Francfort, Jérusalem', 'Une somme sur toute la vie du juif : halakha, morale et Kabbale.');
    w('tosafot_yomtov', 'Tossafot Yom Tov', 'תוספות יום טוב', 'commentaire', 'Rabbi Yom Tov Lipman Heller', 'tosafot_yomtov', 1614, 1617, true, 'Prague', 'Un commentaire de la Michna, imprimé avec elle.');
    w('taz_shakh', 'Tourei Zahav (Taz) et Siftei Cohen (Chakh)', 'טורי זהב, שפתי כהן', 'commentaire', 'Rabbi David HaLévi Segal et Rabbi Chabtaï HaKohen', 'taz', 1646, 1646, false, 'Lvov, Vilnius', 'Les deux commentaires principaux du Choulhan Aroukh, imprimés en marge.');
    w('mesillat_yesharim', 'Messilat Yécharim', 'מסילת ישרים', 'philosophie', 'Rabbi Moché Haïm Luzzatto (le Ramhal)', 'ramhal', 1740, 1740, false, 'Amsterdam', 'Le chemin de la perfection morale : de la vigilance à la sainteté.');
    w('or_hahaim', 'Or HaHaïm', 'אור החיים', 'commentaire', 'Rabbi Haïm ibn Attar', 'or_hahaim', 1742, 1742, false, 'Livourne', 'Un commentaire de la Torah, très lu en milieu séfarade et hassidique.');
    w('biur_hagra', 'Biour HaGra', 'ביאור הגר״א', 'commentaire', 'Rabbi Éliyahou de Vilna (le Gaon de Vilna)', 'gra', 1750, 1797, true, 'Vilnius', 'Un commentaire du Choulhan Aroukh, sur la base du Talmud et du Zohar.');
    w('nefesh_haim', 'Néfech HaHaïm', 'נפש החיים', 'philosophie', 'Rabbi Haïm de Volozhin', 'haim_volozhin', 1820, 1821, false, 'Volozhin', 'Les fondements de l’étude et de la prière, selon le Gaon de Vilna.');
    w('hatam_sofer_resp', 'Réponses du Hatam Sofer', 'שו״ת חתם סופר', 'halakha', 'Rabbi Moché Sofer (le Hatam Sofer)', 'hatam_sofer', 1800, 1839, true, 'Presbourg', 'Six volumes de réponses : la référence de l’Europe centrale.');
    w('hirsch_horev', 'Dix-neuf lettres et Horev', 'אגרות צפון, חורב', 'philosophie', 'Rabbi Chimchon Raphaël Hirsch', 'hirsch', 1836, 1837, false, 'Altona, Oldenbourg', 'Un exposé du judaïsme à l’époque moderne.');
    w('aroukh_hashulhan', 'Aroukh HaChoulhan', 'ערוך השולחן', 'halakha', 'Rabbi Yehiel Mikhel Epstein', 'epstein', 1884, 1907, false, 'Novogrudok', 'Un code qui reprend le plan du Choulhan Aroukh, avec les raisons de chaque loi.');
    w('mishna_berura', 'Michna Beroura', 'משנה ברורה', 'halakha', 'Rabbi Israël Méïr Kagan (le Hafets Haïm)', 'chafetz_haim', 1884, 1907, false, 'Radin', 'Le commentaire de l’Orah Haïm : la référence de la pratique quotidienne.');
    w('kitsour_shulhan', 'Kitsour Choulhan Aroukh', 'קיצור שולחן ערוך', 'halakha', 'Rabbi Chlomo Ganzfried', null, 1864, 1864, false, 'Ungvár', 'Un résumé du Choulhan Aroukh pour tous.');
    w('orot', 'Orot', 'אורות', 'philosophie', 'Rabbi Avraham Yitzhak HaCohen Kook', 'kook', 1920, 1920, true, 'Jaffa, Jérusalem', 'La pensée du Rav Kook : le peuple, la Terre et la Torah.');
    w('ben_ish_hai', 'Ben Ich Haï', 'בן איש חי', 'halakha', 'Rabbi Yossef Haïm de Bagdad', 'ben_ish_hai', 1898, 1898, false, 'Bagdad', 'Des lois et des sermons pour chaque parachat, selon le rite séfarade.');
    w('igrot_moshe', 'Iguerot Moché', 'אגרות משה', 'halakha', 'Rabbi Moché Feinstein', 'feinstein', 1959, 1985, false, 'New York', 'Des milliers de réponses : la référence pour les questions modernes.');
    w('yabia_omer', 'Yabia Omer', 'יביע אומר', 'halakha', 'Rabbi Ovadia Yossef', 'ovadia_yossef', 1954, 2002, false, 'Jérusalem', 'Les réponses de la plus haute autorité séfarade du XXe siècle.');
    w('ich_halakha', 'Halakhic Man (Ich HaHalakha)', 'איש ההלכה', 'philosophie', 'Rabbi Yossef Dov Soloveitchik', 'joseph_solov', 1944, 1944, false, 'New York', 'Un essai sur le juif de la halakha.');
    w('hidushei_haim', 'Hidouchei Rabbénou Haïm HaLévi', 'חידושי רבנו חיים הלוי', 'commentaire', 'Rabbi Haïm Soloveitchik de Brisk', 'haim_brisk', 1890, 1918, true, 'Brest-Litovsk', 'L’analyse conceptuelle du Michné Torah du Rambam.');
    w('chazon_ich', 'Hazon Ich', 'חזון איש', 'halakha', 'Rabbi Avraham Yéchayahou Karelitz', 'chazon_ich', 1911, 1953, true, 'Vilnius, Bné Brak', 'Les hidouchim et les réponses du Hazon Ich.');

    // --- Hassidout (les auteurs sont des fiches de la carte « Hassidout ») ---------------------------------------
    w('toldot_yaakov_yossef', 'Toldot Yaakov Yossef', 'תולדות יעקב יוסף', 'hassidout', 'Rabbi Yaakov Yossef de Polonne', 'yaakov_yosef', 1780, 1780, false, 'Koretz', 'Le premier livre de la Hassidout imprimé : les enseignements du Baal Chem Tov.');
    w('noam_elimelekh', 'Noam Élimélekh', 'נועם אלימלך', 'hassidout', 'Rabbi Élimélekh de Lizhensk', 'elimelech', 1788, 1788, false, 'Lizhensk', 'Sermons sur la Torah et le rôle du tsadik.');
    w('kedushat_levi', 'Kédouchat Lévi', 'קדושת לוי', 'hassidout', 'Rabbi Lévi Yitzhak de Berditchev', 'levi_yitzhak', 1798, 1798, false, 'Berditchev', 'Enseignements sur la Torah et les fêtes.');
    w('tanya', 'Likouté Amarim (Tanya)', 'ליקוטי אמרים תניא', 'hassidout', 'Rabbi Chnéour Zalman de Liadi', 'schneur', 1796, 1797, false, 'Liozna, Liady', 'Le livre fondamental de la Hassidout Habad : l’âme, la prière et le service de D.ieu.');
    w('likoute_moharan', 'Likouté Moharan', 'ליקוטי מוהר״ן', 'hassidout', 'Rabbi Nahman de Breslev', 'nahman', 1808, 1808, false, 'Breslev', 'Les enseignements de Rabbi Nahman, écrits par Rabbi Nathan.');
    w('sefat_emet', 'Séfat Émet', 'שפת אמת', 'hassidout', 'Rabbi Yéhouda Aryé Leib Alter de Ger', 'sefat_emet', 1870, 1905, true, 'Ger', 'Sermons sur la Torah et les fêtes, la référence de Ger.');


    // --- Complément : la « Bibliographie du Commentaire » (commentaires, études sur Rachi, codes, midrachim, ouvrages de Moussar et de Hassidout) ---------
    // Ces œuvres sont datées par la vie de l'auteur (« auteur : 1526–1609 »), faute de date de rédaction sûre : `life` vaut alors 'life', 'died' (seule la date de décès est
    // connue), 'contemp' (auteur contemporain, sans dates) ou '' (date de l'œuvre). La période (eraOf) se calcule alors au milieu de la vie de l'auteur.
    // Elles ne sont pas posées dans le jeu « Auteur et œuvre » (bib : true) : les dates de vie ne suffisent pas à classer une œuvre. À relire par une personne compétente.
    function b(id, fr, he, genre, author, authorId, from, to, life, approx, place, desc, trad) {
        var o = { id: id, fr: fr, he: he, genre: genre, author: author, authorId: authorId, from: from, to: to, approx: !!approx, place: place, desc: desc, trad: trad || '', life: life || '', bib: true };
        WORKS.push(o);
        BY[id] = o;
    }

    // Commentaires sur la Torah
    b('adderet_eliyahu', 'Adéret Eliyahou', 'אדרת אליהו', 'commentaire', 'Le Gaon de Vilna (Rabbi Eliyahou ben Chlomo Zalman)', 'gra', 1720, 1797, 'life', false, 'Vilnius', 'Un commentaire du Pentateuque par le Gaon de Vilna.');
    b('torat_moshe_alshich', 'Alchikh (Torat Moché)', 'תורת משה', 'commentaire', 'Rabbi Moché Alchikh', 'alshich', 1508, 1593, 'life', true, 'Safed', 'Un très célèbre commentaire du Tanakh, par un dayan et prédicateur de Safed à l’âge d’or de la ville.');
    b('abraham_rambam_torah', 'Commentaire de Rabbi Avraham ben HaRambam sur la Torah', 'פירוש רבי אברהם בן הרמב״ם', 'commentaire', 'Rabbi Avraham ben HaRambam', 'avraham_rambam', 1186, 1237, 'life', false, 'Égypte', 'Un commentaire en arabe sur le Pentateuque, dont seules les sections de la Genèse et de l’Exode nous sont parvenues. Son auteur a succédé à son père comme Naguid, chef officiel des Juifs d’Égypte.');
    b('baal_hatourim', 'Baal HaTourim (Péroush HaTour HaAroukh)', 'בעל הטורים', 'commentaire', 'Rabbi Yaakov ben Acher (Baal HaTourim)', 'yaakov_acher', 1275, 1340, 'life', true, 'Tolède', 'Un commentaire du Pentateuque en deux volets : un précis de guématria et d’interprétation massorétique (le Baal HaTourim) et un large commentaire exégétique (Péroush HaTour HaAroukh).');
    b('bekhor_shor', 'Commentaire de Bekhor Chor sur la Torah', 'פירוש בכור שור', 'commentaire', 'Rabbi Yossef Bekhor Chor', null, 1140, 1190, 'life', false, 'France', 'Un commentaire du Pentateuque par un tossafiste, disciple de Rabbénou Tam.');
    b('daat_zekenim', 'Daat Zékénim', 'דעת זקנים', 'commentaire', 'Les Tossafistes des XIIe et XIIIe siècles', null, 1100, 1300, '', true, 'France et Allemagne', 'Un recueil de commentaires sur le Pentateuque émis par les Tossafistes.');
    b('hadar_zekenim', 'Hadar Zékénim', 'הדר זקנים', 'commentaire', 'Les Tossafistes (XIe et XIIe siècles) et le Roch', null, 1050, 1327, '', true, 'France et Allemagne', 'Un recueil de commentaires sur le Pentateuque attribués aux Tossafistes et au Roch, Rabbi Acher ben Yéhiel.');
    b('mochav_zekenim', 'Mochav Zékénim', 'מושב זקנים', 'commentaire', 'Les Tossafistes des XIIe et XIIIe siècles', null, 1100, 1300, '', true, 'France et Allemagne', 'Un recueil de commentaires sur le Pentateuque émis par les Tossafistes.');
    b('hizkouni', 'Hizkouni', 'חזקוני', 'commentaire', 'Rabbi Hizkiya Hizkouni', null, 1200, 1299, '', true, 'France (probablement)', 'Un commentaire du Pentateuque attribué à Rabbi Hizkiya Hizkouni, qui a vécu au XIIIe siècle.');
    b('ralbag_torah', 'Commentaire du Ralbag sur la Torah', 'פירוש הרלב״ג', 'commentaire', 'Rabbi Lévi ben Guerchom (le Ralbag)', null, 1288, 1344, 'life', false, 'Provence', 'Un commentaire rationnel de l’Écriture : il explique le texte, puis résume les leçons philosophiques et morales de chaque section.');
    b('sforno', 'Commentaire du Sforno sur la Torah', 'פירוש ספורנו', 'commentaire', 'Rabbi Ovadia Sforno', null, 1470, 1550, 'life', false, 'Rome, Bologne', 'Un commentaire classique du Pentateuque. Ses Kavanot HaTorah sont des réflexions préliminaires sur le but des récits de la Torah, le sens de certains préceptes et le Tabernacle.');
    b('recanati_torah', 'Commentaire de Rabbi Mena’hem Recanati sur la Torah', 'פירוש הרקנאטי על התורה', 'kabbale', 'Rabbi Mena’hem Recanati', null, 1280, 1320, '', true, 'Italie', 'Une interprétation mystique du Pentateuque, par un cabaliste italien de la fin du XIIIe ou du début du XIVe siècle.');
    b('tsror_hamor', 'Tsror HaMor', 'צרור המור', 'commentaire', 'Rabbi Avraham Saba', null, 1440, 1508, 'life', true, 'Espagne, Portugal, Maroc', 'Un commentaire du Pentateuque. Devant la menace de l’Inquisition, l’auteur a enseveli le livre au Portugal, puis l’a réécrit de mémoire en fuyant au Maroc.');
    b('kli_yakar', 'Kli Yakar', 'כלי יקר', 'commentaire', 'Rabbi Chlomo Efraïm Lunshitz', null, 1550, 1619, 'life', true, 'Lemberg, Prague', 'Un commentaire célèbre du Pentateuque, par un roch yéchiva et Rav de Prague.');
    b('minhat_yehouda', 'Min’hat Yéhouda', 'מנחת יהודה', 'commentaire', 'Rabbi Yéhouda Eliézer', null, 1300, 1330, '', true, 'France', 'Un commentaire du Pentateuque qui rapporte de nombreuses interprétations des Tossafistes.');
    b('minha_beloula', 'Min’ha Béloula', 'מנחה בלולה', 'commentaire', 'Rabbi Avraham Rapa de Porto', null, 1593, 1593, 'died', false, 'Venise', 'Un commentaire du Pentateuque, par un rabbin de Porto et de Venise, mort en 1593.');
    b('chibolei_haleket', 'Chibolei HaLéket', 'שבלי הלקט', 'halakha', 'Rabbi Tsidkiya HaRofé de Rome', null, 1230, 1300, 'life', true, 'Rome', 'Un compendium halakhique.');
    b('panim_yafot', 'Panim Yafot', 'פנים יפות', 'commentaire', 'Rabbi Pin’has Horowitz', null, 1730, 1805, 'life', false, 'Francfort-sur-le-Main', 'Un commentaire du Pentateuque par l’auteur des classiques Haflaa et HaMakné sur le Talmud.');
    b('beit_halevi_torah', 'Beit HaLévi', 'בית הלוי', 'commentaire', 'Rabbi Yossef Dov HaLévi Soloveitchik (le Beit HaLévi)', 'beit_halevi', 1820, 1892, 'life', false, 'Volozhin, Slutsk, Brisk', 'Un commentaire du Pentateuque, par l’un des plus brillants talmudistes du XIXe siècle.');
    b('haamek_davar', 'Haamek Davar', 'העמק דבר', 'commentaire', 'Rabbi Naftali Tsvi Yéhouda Berlin (le Nétsiv)', 'netziv', 1817, 1893, 'life', false, 'Volozhin', 'Un commentaire du Pentateuque, par le directeur de la célèbre yéchiva de Volozhin.');
    b('haketav_vehakabbala', 'Haketav VéHaKabbala', 'הכתב והקבלה', 'commentaire', 'Rabbi Yaakov Tsvi Mecklenburg', null, 1785, 1865, 'life', false, 'Kœnigsberg', 'Un commentaire du Pentateuque qui montre comment la Tradition orale (la Kabbala) découle du texte écrit (le Ketav).');
    b('malbim', 'Malbim', 'מלבי״ם', 'commentaire', 'Rabbi Méïr Leibush ben Yéhiel Mikhel (le Malbim)', null, 1809, 1879, 'life', false, 'Allemagne, Roumanie, Russie', 'Un commentaire biblique éminent des temps modernes, qui montre que la Tradition orale est implicite dans le texte de la Bible.');
    b('meam_loez', 'Méam Loèz', 'מעם לועז', 'commentaire', 'Rabbi Yaakov Couli, puis ses continuateurs', null, 1689, 1732, 'life', false, 'Constantinople', 'Un vaste commentaire en ladino sur l’ensemble du Tanakh, la plus célèbre collection d’ouvrages de Torah publiée en ladino ; il a été traduit en hébreu et en français.');
    b('maharil_diskin', 'Maharil Diskin', 'מהרי״ל דיסקין', 'commentaire', 'Rabbi Yéhochoua Leib Diskin', null, 1818, 1898, 'life', false, 'Brisk, Jérusalem', 'Un commentaire sur le Pentateuque, par un Rav de plusieurs communautés de Lituanie puis de Jérusalem.');
    b('hirsch_torah', 'Commentaire de Rabbi Hirsch sur le Pentateuque', 'פירוש הרש״ר הירש על התורה', 'commentaire', 'Rabbi Chimchon Raphaël Hirsch', 'hirsch', 1808, 1888, 'life', false, 'Francfort-sur-le-Main', 'Un commentaire en six volumes sur le Pentateuque, par la figure de proue de l’orthodoxie juive moderne allemande.');
    b('hoffmann_torah', 'Commentaires de Rabbi David Tsvi Hoffmann (en allemand)', 'פירוש ר׳ דוד צבי הופמן', 'commentaire', 'Rabbi David Tsvi Hoffmann', null, 1843, 1921, 'life', false, 'Berlin', 'Des commentaires sur la quasi-totalité du Pentateuque, parus en allemand. L’auteur a dirigé le Séminaire rabbinique orthodoxe de Berlin et réfuté les thèses du Révisionnisme biblique.');
    b('oznaim_latorah', 'Oznaïm LaTorah', 'אזנים לתורה', 'commentaire', 'Rabbi Zalman Sorotzkin (le « Lutzker Rav »)', null, 1881, 1966, 'life', false, 'Lituanie, Israël', 'Un commentaire du Pentateuque, par un Rabbin influent de Lituanie puis d’Israël.');
    b('emet_leyaakov', 'Emet LéYaakov', 'אמת ליעקב', 'commentaire', 'Rabbi Yaakov Kamenetsky', null, 1891, 1986, 'life', false, 'Tzitevian, Toronto, New York', 'Des commentaires et propos sur le Pentateuque (Iyounim BeMikra).');
    b('daat_sofrim', 'Daat Sofrim', 'דעת סופרים', 'commentaire', 'Rabbi Haïm D. Rabinowitz', null, 1950, 2000, 'contemp', true, 'Israël', 'Un commentaire contemporain sur tout le Tanakh (sauf les Cinq Méguilot), par un grand expert biblique, savant et conférencier israélien.');
    b('muenk_voix', 'La Voix de la Torah (et Le Monde des Prières)', '', 'commentaire', 'Rabbi Elie Munk', null, 1900, 1980, 'life', false, 'Paris', 'Un commentaire du Pentateuque paru en français, puis traduit en anglais. Du même auteur, le célèbre Monde des Prières.');
    b('darach_moshe', 'Darach Moché et Dibrot Moché', 'דרש משה, דברות משה', 'commentaire', 'Rabbi Moché Feinstein', 'feinstein', 1895, 1986, 'life', false, 'New York', 'Des commentaires sur le Pentateuque (Darach Moché) et des réflexions sur le Talmud (Dibrot Moché).');
    b('kol_dodi', 'Kol Dodi', 'קול דודי', 'commentaire', 'Rabbi David Feinstein', null, 1950, 2020, 'contemp', true, 'Jérusalem, New York', 'Des commentaires sur la Torah, par un roch yéchiva de la Métivta Tiféret Jérusalem et éminent décisionnaire contemporain.');
    b('torah_shelema', 'Torah Chéléma', 'תורה שלמה', 'reference', 'Rabbi Mena’hem Kasher', null, 1895, 1983, 'life', false, 'Jérusalem', 'Une encyclopédie monumentale qui regroupe les sources talmudiques et midrachiques reliées au Pentateuque, avec notes et réflexions. Trente-huit volumes jusqu’à Béhaalotékha avant le décès de l’auteur ; l’œuvre est achevée par ses disciples.');

    // Études sur le commentaire de Rachi
    b('amar_nekeh', 'Amar Néké', 'אמר נקי', 'commentaire', 'Rabbi Ovadia de Bertinoro (Bartenura)', 'bartenura', 1440, 1516, 'life', true, 'Italie, Jérusalem', 'Une étude du commentaire de Rachi sur le Pentateuque.');
    b('mizrahi', 'Mizra’hi', 'ספר המזרחי', 'commentaire', 'Rabbi Eliyahou Mizra’hi', null, 1450, 1525, 'life', false, 'Constantinople', 'L’étude essentielle du commentaire de Rachi sur le Pentateuque, par le Grand Rabbin de l’Empire ottoman.');
    b('sifte_hakhamim', 'Sifté ’Hakhamim', 'שפתי חכמים', 'commentaire', 'Rabbi Chabtaï Bass', null, 1641, 1718, 'life', false, '', 'Une étude populaire du commentaire de Rachi sur le Pentateuque.');
    b('divrei_david', 'Divrei David', 'דברי דוד', 'commentaire', 'Rabbi David ben Chmouel HaLévi (le Taz)', 'taz', 1586, 1667, 'life', false, '', 'Une étude du commentaire de Rachi sur le Pentateuque, par l’auteur du Taz sur le Choulhan Aroukh.');
    b('maskil_ledavid', 'Maskil LéDavid', 'משכיל לדוד', 'commentaire', 'Rabbi David Pardo', null, 1710, 1792, 'life', false, 'Sarajevo, Jérusalem', 'Une étude du commentaire de Rachi sur le Pentateuque, par une figure de proue séfarade du XVIIIe siècle.');
    b('beer_basade', 'Béer Bassadé', 'באר בשדה', 'commentaire', 'Rabbi Méïr Binyamin Ménachem Danon', null, 1800, 1830, '', true, 'Sarajevo', 'Une étude du commentaire de Rachi sur le Pentateuque et des travaux sur le Mizra’hi, par le grand Rabbin de Sarajevo au début du XIXe siècle.');
    b('beer_haguola', 'Béer HaGola', 'באר הגולה', 'philosophie', 'Rabbi Yéhouda Loew (le Maharal)', 'maharal', 1526, 1609, 'life', false, 'Prague', 'Des analyses de certaines aggadot qui, de prime abord, semblent contredire la science.');
    b('beer_mayim_haim_betsalel', 'Béer Mayim ’Haïm (Rabbi ’Haïm Bétsalel)', 'באר מים חיים', 'commentaire', 'Rabbi ’Haïm Bétsalel de Worms', null, 1515, 1588, 'life', false, 'Worms', 'Une étude du commentaire de Rachi sur le Pentateuque, par le grand Rabbin de Worms, frère aîné du Maharal.');
    b('beer_yitshak', 'Béer Yits’hak', 'באר יצחק', 'commentaire', 'Rabbi Yits’hak Yaakov Horowitz de Yaroslav', null, 1864, 1864, 'died', false, 'Yaroslav', 'Une étude du commentaire de Rachi sur le Pentateuque ; son auteur est mort en 1864.');
    b('sefer_zikaron', 'Séfer HaZikaron', 'ספר הזכרון', 'commentaire', 'Rabbi Avraham Bakrat', null, 1480, 1500, '', true, 'Espagne', 'Une étude du commentaire de Rachi sur le Pentateuque, par un contemporain de l’expulsion des Juifs d’Espagne (1492).');
    b('havanat_hamikra', 'Havanat Hamikra', 'הבנת המקרא', 'commentaire', 'Rabbi Wolf Heidenheim', null, 1757, 1832, 'life', false, '', 'Une étude du commentaire de Rachi. Son auteur est un philologue, expert en littérature biblique et en liturgie, dont les éditions du ’Houmach, du Sidour et des Ma’hzorim ont été très populaires.');
    b('rachach', 'Rachach', 'רש״ש', 'commentaire', 'Rabbi Chmouel Strashun', null, 1794, 1872, 'life', false, 'Vilnius', 'Des annotations et gloses sur presque chaque traité de la Michna, du Talmud et sur le Midrach Rabba, imprimées dans les éditions Romm de Vilna.');
    b('harekhassim', 'HaRékhassim LéBika', 'הרכסים לבקעה', 'commentaire', 'Rabbi Yéhouda Leib Chapira (« Lœb Frankfurter »)', null, 1700, 1799, '', true, 'Allemagne', 'Un commentaire sur le Pentateuque du XVIIIe siècle, par le grand-oncle de Rabbi Chimchon Raphaël Hirsch.');

    // Midrach
    b('agadat_berechit', 'Agadat Béréchit', 'אגדת בראשית', 'midrash', 'Anonyme', null, 900, 1000, '', true, '', 'Un midrach sur la Genèse, compilé vers le Xe siècle à partir de sources antérieures.');
    b('berechit_rabbati', 'Béréchit Rabbati', 'בראשית רבתי', 'midrash', 'Rabbi Moché HaDarchan (ou fondé sur ses enseignements)', null, 1050, 1050, '', true, 'Narbonne', 'Un midrach sur la Genèse.');
    b('beraita_melekhet_hamishkan', 'Béraïta DéMeleket HaMichkan', 'ברייתא דמלאכת המשכן', 'michna', 'Anonyme (tannaïm)', null, 100, 300, '', true, '', 'Un ouvrage tannaïque sur la construction du Tabernacle dans le désert, telle qu’elle est décrite dans l’Exode.');
    b('midrash_hagadol', 'Midrach HaGadol', 'מדרש הגדול', 'midrash', 'Rabbi David el Adéni', null, 1280, 1300, '', true, 'Aden (Yémen)', 'Une compilation colossale de matériaux halakhiques et agadiques du Talmud, arrangés selon les versets de la Torah. Découvert au XXe siècle, il contient beaucoup d’éléments inédits.');
    b('midrash_hahefets', 'Midrach Ha’héfets', 'מדרש החפץ', 'midrash', 'Rabbi Zékharia ben Chlomo HaRofé', null, 1400, 1425, '', true, 'Yémen', 'Une anthologie midrachique sur le Pentateuque et les Haftarot.');
    b('lekah_tov', 'Léka’h Tov (Pessikta Zoutrata)', 'לקח טוב', 'midrash', 'Rabbi Tovia (ben Eliézer) HaGadol', null, 1036, 1108, 'life', false, 'Grèce, Bulgarie', 'Une œuvre midrachique sur le Pentateuque et les Cinq Méguilot.');
    b('sekhel_tov', 'Sékhel Tov', 'שכל טוב', 'midrash', 'Rabbi Menachem ben Chlomo d’Italie', null, 1100, 1199, '', true, 'Italie', 'Une compilation de midrachim classés selon les versets du Pentateuque et des Cinq Méguilot, parsemée d’annotations halakhiques et de commentaires inédits de l’auteur.');
    b('pessikta_rabbati', 'Pessikta Rabbati', 'פסיקתא רבתי', 'midrash', 'Anonyme', null, 650, 1040, '', true, '', 'Un recueil de midrachim compilés à l’ère des Guéonim, sur certains passages de la portion hebdomadaire de la Torah, des Haftarot et des Chabbatot particuliers.');
    b('yalkout_chimoni', 'Yalkout Chimoni', 'ילקוט שמעוני', 'midrash', 'Rabbi Chimon HaDarchan de Francfort (selon la tradition)', null, 1200, 1299, '', true, 'Francfort', 'L’anthologie midrachique la plus connue et la plus complète, qui embrasse tout le Tanakh.', 'Rabbi Chimon HaDarchan de Francfort (XIIIe siècle)');
    b('yafe_toar', 'Yafé Toar', 'יפה תואר', 'commentaire', 'Rabbi Chemouel Yafé Achkénazi', null, 1525, 1595, 'life', false, 'Constantinople', 'Un commentaire volumineux et classique du Midrach Rabba. Les sections sur Bamidbar Rabba et Devarim Rabba n’ont pas été publiées.');
    b('maharzou', 'Maharzou', 'מהרז״ו', 'commentaire', 'Rabbi Zéev Wolf Einhorn', null, 1862, 1862, 'died', false, 'Vilnius', 'Un vaste commentaire sur le Midrach Rabba ; son auteur est mort en 1862.');
    b('matanot_kehouna', 'Matanot Kéhouna', 'מתנות כהונה', 'commentaire', 'Rabbi Yissakhar Ber HaCohen', null, 1520, 1590, 'life', true, '', 'Un commentaire sur le Midrach Rabba, par un disciple du Rama.');

    // Halakha, codes et responsa
    b('hafets_haim_livre', 'Hafets Haïm', 'חפץ חיים', 'halakha', 'Rabbi Israël Méïr HaCohen de Radin (le Hafets Haïm)', 'chafetz_haim', 1838, 1933, 'life', false, 'Radin', 'Le livre sur les lois de la médisance, par l’auteur de la Michna Beroura ; ses vertus sont restées légendaires.');
    b('kol_bo', 'Kol Bo', 'כל בו', 'halakha', 'Anonyme', null, 1280, 1320, '', true, '', 'Un compendium halakhique anonyme de la fin du XIIIe ou du début du XIVe siècle.');
    b('magen_avraham', 'Maguen Avraham', 'מגן אברהם', 'halakha', 'Rabbi Avraham Gombiner', null, 1634, 1682, 'life', false, 'Kalisz (Pologne)', 'Un commentaire essentiel du Choulhan Aroukh Orah Haïm.');
    b('pri_megadim', 'Pri Mégadim', 'פרי מגדים', 'halakha', 'Rabbi Yossef Téomim', null, 1727, 1792, 'life', false, 'Lemberg, Francfort-sur-l’Oder', 'Une étude globale sur les commentaires du Choulhan Aroukh (Maguen Avraham, Tourei Zahav, Siftei Cohen).');
    b('pithei_teshouva', 'Pit’hei Téchouva', 'פתחי תשובה', 'halakha', 'Rabbi Avraham Tsvi Hirsch Eisenstadt', null, 1813, 1868, 'life', false, 'Utian (Lituanie)', 'Un condensé de responsa dont l’ordre suit celui du Choulhan Aroukh (sauf l’Orah Haïm) : une sorte de commentaire de ce code.');
    b('maharit', 'Outéchouvot Maharit', 'שו״ת מהרי״ט', 'halakha', 'Rabbi Yossef Tirani (le Maharit)', null, 1568, 1639, 'life', false, 'Constantinople', 'Le recueil des responsa d’un décisionnaire séfarade prépondérant du début du XVIIe siècle, qui fait largement autorité.');
    b('radvaz', 'Responsa du Radvaz', 'שו״ת הרדב״ז', 'halakha', 'Rabbi David ibn Zimra (le Radvaz)', null, 1480, 1573, 'life', true, 'Égypte', 'Le recueil de ses responsa fait largement autorité ; il a été Grand Rabbin d’Égypte, figure dominante du XVIe siècle.');
    b('imrei_shefer', 'Imrei Chéfer', 'אמרי שפר', 'commentaire', 'Rabbi Chlomo Kluger', null, 1785, 1869, 'life', false, 'Brody (Galicie)', 'Des commentaires sur le Pentateuque, par un éminent savant du XIXe siècle.');
    b('avnei_nezer', 'Avnei Nézer', 'אבני נזר', 'halakha', 'Rabbi Avraham Borenstein de Sochachov', null, 1839, 1910, 'life', false, 'Sochachov', 'Le corpus de responsa d’un éminent Rabbi ’hassidique et érudit du XIXe siècle.');
    b('ktav_sofer', 'Ktav Sofer', 'כתב סופר', 'halakha', 'Rabbi Avraham Chmouel Binyamin Sofer (le Ketav Sofer)', 'ketav_sofer', 1815, 1879, 'life', false, 'Presbourg', 'Un recueil de responsa et un commentaire du Pentateuque, par le fils et successeur du ’Hatam Sofer.');
    b('chiourim_torah', 'Chiourim chel Torah', 'שיעורי תורה', 'halakha', 'Rabbi Yaakov Yisraël Kanievsky (le « Steipler »)', null, 1985, 1985, 'died', false, 'Bné Brak', 'Une étude sur les mesures halakhiques réglementaires, par un grand érudit et maître de Torah contemporain.');
    b('kaftor_vaferah', 'Kaftor VaFéra’h', 'כפתור ופרח', 'reference', 'Rabbi Echtori HaFar’hi', null, 1282, 1357, 'life', true, 'Terre d’Israël', 'Un ouvrage fameux sur l’histoire, la géographie et les halakhot relatives à Erets Israël.');
    b('tevouot_haarets', 'Tévouot Haarets', 'תבואות הארץ', 'reference', 'Rabbi Yéhossef Schwartz', null, 1804, 1865, 'life', false, 'Jérusalem', 'Un manuel de géographie sur l’histoire et les frontières d’Erets Israël, sa topographie, ses sites bibliques et talmudiques, sa flore et sa faune.');
    b('aroukh', 'Aroukh et Aroukh HaChalem', 'ערוך, ערוך השלם', 'reference', 'Rabbi Nathan Yé’hiel de Rome ; version élargie par A. Kohut', null, 1045, 1103, 'life', true, 'Rome', 'Un fameux dictionnaire-compendium médiéval de littérature talmudique ; la version élargie (Aroukh HaChalem) est l’œuvre de A. Kohut, sage du XIXe siècle.');
    b('chorachim', 'Séfer HaChorachim', 'ספר השרשים', 'reference', 'Rabbi Yona ibn Jana’h', null, 1000, 1055, 'life', true, 'Cordoue, Saragosse', 'Une encyclopédie des racines de tous les mots employés dans la Bible, classées par ordre alphabétique ; écrite en arabe, elle n’a paru en hébreu qu’au XIXe siècle.');

    // Commentaires du Talmud et de la Michna
    b('hidushei_haran', 'Hidouchei HaRan', 'חידושי הר״ן', 'commentaire', 'Rabbénou Nissim de Gérone (le Ran)', 'ran', 1290, 1375, 'life', true, 'Gérone, Espagne', 'Son commentaire sur le Talmud lui a rendu sa célébrité.');
    b('drachot_haran', 'Drachot HaRan', 'דרשות הר״ן', 'philosophie', 'Rabbénou Nissim de Gérone (le Ran)', 'ran', 1290, 1375, 'life', true, 'Gérone, Espagne', 'Un recueil de discours : un exposé classique des fondements du judaïsme.');
    b('maharcha', 'Maharcha (Hidouchei Aggadot)', 'חידושי הרש״א', 'commentaire', 'Rabbi Chlomo Eidels (le Maharcha)', null, 1555, 1632, 'life', false, 'Ostroh', 'Un commentaire monumental sur les sections halakhiques et agadiques du Talmud de Babylone.');
    b('maharam_lublin', 'Hidouchei HaMaharam de Lublin (Torah Or)', 'מהר״ם מלובלין', 'commentaire', 'Rabbi Méïr ben Guédalia de Lublin (le Maharam)', null, 1558, 1616, 'life', false, 'Lublin', 'Un commentaire sur le Talmud et des responsa ; ses sermons ont été rassemblés dans Torah Or.');
    b('maharshal_yam', 'Yam chel Chlomo', 'ים של שלמה', 'halakha', 'Rabbi Chlomo Louria (le Maharchal)', 'maharshal', 1510, 1573, 'life', false, 'Pologne', 'Un ouvrage relatif au Talmud et à la halakha, par un Rabbin très influent en Pologne au XVIe siècle.');
    b('ibn_caspi', 'Michné Kessef (Ibn Caspi)', 'משנה כסף', 'commentaire', 'Rabbi Yossef ibn Caspi', null, 1280, 1340, 'life', false, 'Provence', 'Un commentaire relatif au Pentateuque, par un philosophe, exégète biblique et grammairien. Ne pas le confondre avec le Kessef Michné de Rabbi Yossef Karo.');
    b('korban_aharon', 'Korban Aharon', 'קרבן אהרן', 'commentaire', 'Rabbi Aharon ben Avraham ibn Haïm', null, 1545, 1632, 'life', true, 'Maroc', 'Un commentaire élémentaire sur le Sifra.');
    b('tiferet_israel', 'Tiféret Israël', 'תפארת ישראל', 'commentaire', 'Rabbi Israël Lipschutz', null, 1782, 1860, 'life', false, 'Allemagne', 'Un commentaire complet sur la Michna, par un Rav de diverses communautés juives d’Allemagne.');
    b('hiddouchei_harim', 'Hidouchei HaRim', 'חידושי הרי״ם', 'commentaire', 'Rabbi Yits’hak Méïr de Gour (le Hidouchei HaRim)', 'yitzhak_meir_ger', 1799, 1866, 'life', false, 'Gour', 'L’œuvre du fondateur du ’Hassidisme de Gour, talmudiste éminent du XIXe siècle.');
    b('nahalat_yaakov', 'Na’halat Yaakov', 'נחלת יעקב', 'commentaire', 'Rabbi Yaakov Lœrberbaum', null, 1832, 1832, 'died', false, 'Lissa (Pologne prussienne)', 'Un commentaire sur le Pentateuque, par un érudit de renom, auteur aussi de Nétivot HaMichpat et de ’Hovat Daat sur le Choulhan Aroukh.');

    // Philosophie et Moussar
    b('akedat_yitshak', 'Akédat Yits’hak', 'עקדת יצחק', 'philosophie', 'Rabbi Yits’hak Arama', null, 1420, 1494, 'life', false, 'Espagne', 'Un commentaire philosophique profond sur le Pentateuque, par un éminent Rabbin de l’Espagne du XVe siècle.');
    b('daat_tevounot', 'Daat Tévounot', 'דעת תבונות', 'philosophie', 'Rabbi Moché Haïm Luzzatto (le Ramhal)', 'ramhal', 1707, 1746, 'life', false, '', 'Un ouvrage de philosophie juive sous la forme d’un dialogue entre l’âme et l’intellect, par le poète, cabaliste et auteur de Messilat Yécharim.');
    b('or_hatsafoun', 'Or Hatsafoun', 'אור הצפון', 'moussar', 'Rabbi Nathan Tsvi Finkel (l’Alter de Slabodka)', null, 1849, 1927, 'life', false, 'Slabodka (Lituanie)', 'Les discours du chef spirituel de la yéchiva de Slabodka, figure de proue du mouvement du Moussar de Lituanie.');
    b('daat_hokhma_moussar', 'Daat ’Hokhma OuMoussar', 'דעת חכמה ומוסר', 'moussar', 'Rabbi Sim’ha Zissel Ziv (l’Alter de Kelm)', 'alter_kelm', 1824, 1898, 'life', false, 'Kelm (Lituanie)', 'Les discours du fondateur de la yéchiva de Moussar de Kelm, disciple de Rabbi Israël Salanter.');
    b('mikhtav_meeliyahou', 'Mikhtav MéEliyahou', 'מכתב מאליהו', 'moussar', 'Rabbi Eliyahou Eliézer Dessler', null, 1891, 1954, 'life', false, 'Londres, Bné Brak', 'Un recueil d’écrits et de discours, par une grande figure du mouvement du Moussar.');
    b('pahad_yitshak', 'Pa’had Yits’hak', 'פחד יצחק', 'moussar', 'Rabbi Yits’hak Hutner', null, 1907, 1980, 'life', false, 'New York', 'Un recueil de propos, par le roch yéchiva de la Métivta Rabbi ’Haïm Berlin, éminent penseur ; ses travaux s’articulent beaucoup autour de l’œuvre du Maharal.');
    b('or_gedalyahou', 'Or Guédalyahou', 'אור גדליהו', 'moussar', 'Rabbi Guédaliah Schorr', null, 1910, 1979, 'life', false, 'Brooklyn, New York', 'Trois volumes de propos sur la Genèse, l’Exode et les fêtes, par le roch yéchiva de la Métivta Torah Vadaat, considéré comme le premier gadol formé aux États-Unis.');
    b('ale_shour', 'Alé Chour', 'עלי שור', 'moussar', 'Rabbi Chlomo Wolbe', null, 1950, 2000, 'contemp', true, 'Israël', 'Deux volumes de hachkafa, par une personnalité contemporaine de l’univers du Moussar en Israël.');
    b('leka_tov_beifus', 'Léka’h Tov (anthologie de Moussar)', 'לקח טוב', 'moussar', 'Rabbi Yaakov Yisraël Beifus', null, 1950, 2000, 'contemp', true, 'Israël', 'Une anthologie contemporaine d’extraits de Moussar et de Hachkafa, arrangés au fil des sections hebdomadaires du Pentateuque.');
    b('sefer_haparachiyot', 'Séfer HaParachiyot', 'ספר הפרשיות', 'moussar', 'Rabbi Eliyahou Kitov', null, 1912, 1976, 'life', false, '', 'Une anthologie de textes rabbiniques arrangés au fil des sections hebdomadaires de la Torah, par un célèbre pédagogue.');
    b('ohel_yaakov', 'Ohel Yaakov', 'אהל יעקב', 'moussar', 'Rabbi Yaakov Krantz (le Maguid de Doubno)', null, 1741, 1804, 'life', false, 'Doubno', 'Les sermons et paraboles du plus célèbre des maguidim, prédicateurs d’Europe de l’Est.');
    b('ahavat_yehonatan', 'Ahavat Yéhonathan', 'אהבת יהונתן', 'commentaire', 'Rabbi Yéhonathan Eybeschutz', null, 1690, 1764, 'life', true, 'Prague, Metz, Altona', 'Un commentaire sur les Haftarot hebdomadaires, par une figure de proue du XVIIIe siècle.');

    // Hassidout
    b('degel_mahane_efraim', 'Dégel Ma’hané Efraïm', 'דגל מחנה אפרים', 'hassidout', 'Rabbi Moché ’Haïm Efraïm de Sudylkov', null, 1748, 1800, 'life', false, 'Sudylkov', 'Un commentaire d’inspiration ’hassidique sur le Pentateuque, par le petit-fils du Baal Chem Tov.');
    b('kol_simha', 'Kol Sim’ha, ’Hedvat Sim’ha', 'קול שמחה, חדוות שמחה', 'hassidout', 'Rabbi Bounem de Pschiskha', 'simhah_bunem', 1765, 1827, 'life', false, 'Pologne', 'Des enseignements d’une figure de proue du ’Hassidisme, Rabbin en Pologne au début du XIXe siècle, compilés dans ’Hedvat Sim’ha, Kol Sim’ha et Ramatayim Tsofim.');
    b('imrei_emet', 'Imrei Emet', 'אמרי אמת', 'hassidout', 'Rabbi Avraham Mordékhaï Alter, troisième Rabbi de Gour', 'imrei_emet', 1865, 1948, 'life', false, 'Gour (Pologne), Jérusalem', 'Des propos ’hassidiques relatifs au Pentateuque, par une figure de proue du Judaïsme polonais.');
    b('chem_michemouel', 'Chem MiChemouel', 'שם משמואל', 'hassidout', 'Rabbi Chemouel de Sochatchov', null, 1856, 1920, 'life', false, 'Sochatchov', 'Des propos ’hassidiques sur le Pentateuque et d’autres thèmes, par le fils de Rabbi Avraham de Sochachov.');
    b('neot_hadeche', 'Néot HaDéché', 'נאות הדשא', 'hassidout', 'Rabbi Avraham Borenstein de Sochachov', null, 1839, 1910, 'life', false, 'Sochachov', 'Un recueil de commentaires sur le Pentateuque, par l’auteur d’Avnei Nézer.');
    b('irin_kadichin', 'Irin Kadichin et autres ouvrages de Rizhin', 'עירין קדישין', 'hassidout', 'Rabbi Israël de Rizhin', 'israel_ruzhin', 1797, 1851, 'life', false, 'Pologne', 'Des commentaires d’un illustre Rabbi ’hassidique de Pologne, aussi dans Knesset Israël, Beit Israël et Niflaot Israël.');
    b('beer_mayim_haim_czernowitz', 'Béer Mayim ’Haïm (’Haïm de Czernowitz)', 'באר מים חיים', 'hassidout', 'Rabbi ’Haïm Tyer de Czernowitz', null, 1760, 1818, 'life', false, 'Czernowitz', 'Un commentaire du Pentateuque par un maître ’hassidique.');
    b('sidouro_chabbat', 'Sidouro chel Chabbat', 'סידורו של שבת', 'hassidout', 'Rabbi ’Haïm Tyer de Czernowitz', null, 1760, 1818, 'life', false, 'Czernowitz', 'Une œuvre ’hassidique qui traite de la sainteté du Chabbat.');
    b('beer_moshe', 'Béer Moché', 'באר משה', 'hassidout', 'Rabbi Moché Yé’hiel HaLévi d’Ozharov', null, 1890, 1971, 'life', false, 'Ozharov', 'Un commentaire du Pentateuque à vocation ’hassidique.');
    b('resisse_laila', 'Ressissé Laïla', 'רסיסי לילה', 'hassidout', 'Rabbi Tsadok HaCohen de Lublin', null, 1823, 1900, 'life', false, 'Lublin', 'Un recueil de dissertations d’un sage et penseur ’hassidique du XIXe siècle.');
    b('pri_tsadik', 'Pri Tsadik', 'פרי צדיק', 'hassidout', 'Rabbi Tsadok HaCohen de Lublin', null, 1823, 1900, 'life', false, 'Lublin', 'Le plus grand de ses livres : le recueil de ses discours sur le Pentateuque.');
    b('sifte_cohen_safed', 'Siftei Cohen (Mordékhaï HaCohen de Safed)', 'שפתי כהן', 'kabbale', 'Rabbi Mordékhaï HaCohen de Safed', null, 1500, 1599, '', true, 'Safed', 'Un commentaire mystique sur le Pentateuque. Ne pas le confondre avec les Siftei Cohen (le Chakh) sur le Choulhan Aroukh.');
    b('iguerot_teman', 'Iguéret Téman', 'אגרת תימן', 'philosophie', 'Rabbi Moché ben Maïmon (le Rambam)', 'rambam', 1172, 1172, '', true, 'Fustat (Le Caire)', 'Une épître célèbre adressée aux Juifs du Yémen, qu’elle exhorte à garder la foi et à résister aux perturbations des faux messies et aux persécutions religieuses musulmanes ; elle aborde divers principes fondamentaux de hachkafa.');
    b('sefer_hapardess', 'Séfer HaPardess', 'ספר הפרדס', 'halakha', 'École de Rachi', null, 1100, 1150, '', true, 'France', 'Un compendium halakhique issu de l’école de Rachi, qui contient certains de ses arrêts.');
    WORKS.sort(function (a, b) { return a.from - b.from || a.to - b.to; });

    function byId(id) { return BY[id] || null; }
    function ofGenre(genre) { return WORKS.filter(function (x) { return x.genre === genre; }); }
    function worksOf(authorId) { return WORKS.filter(function (x) { return x.authorId === authorId; }); }
    // La période : l'année de rédaction ; pour une œuvre datée par la vie de son auteur (life), le milieu de cette vie.
    function eraOf(work) {
        var year = work.life ? Math.round((work.from + work.to) / 2) : work.from;
        for (var i = 0; i < ERAS.length; i++) if (year <= ERAS[i].to) return ERAS[i].id;
        return ERAS[ERAS.length - 1].id;
    }
    function ofEra(era) { return WORKS.filter(function (x) { return eraOf(x) === era; }); }
    function normalize(text) {
        return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`ʿʻ-]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function search(text) {
        var q = normalize(text);
        if (!q) return WORKS.slice();
        return WORKS.filter(function (x) { return normalize(x.fr + ' ' + x.author).indexOf(q) !== -1 || x.he.indexOf(String(text).trim()) !== -1; });
    }
    // « vers 1565 », « 200–220 », « 1796–1797 ».
    function dating(work) {
        if (work.life === 'contemp') return 'auteur contemporain';
        if (work.life === 'died') return 'auteur mort en ' + work.to;
        if (work.life === 'life') return 'auteur : ' + (work.approx ? 'vers ' : '') + work.from + '–' + work.to;
        var span = work.from === work.to ? String(work.from) : work.from + '–' + work.to;
        return (work.approx ? 'vers ' : '') + span;
    }

    return { GENRES: GENRES, ERAS: ERAS, WORKS: WORKS, byId: byId, ofGenre: ofGenre, worksOf: worksOf, eraOf: eraOf, ofEra: ofEra, search: search, dating: dating };
}));
