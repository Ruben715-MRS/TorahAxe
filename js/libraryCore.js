// =========================================================================
// === LA BIBLIOTHÈQUE JUIVE (DONNÉES ET RÈGLES, outil de la boîte à outils) ===
// =========================================================================
// Qui a écrit quoi, quand et où : les grandes œuvres de la tradition juive après la Bible, de la Michna à nos jours. Pur, sans DOM : testé dans
// tests/libraryCore.test.js. Pas de texte de prière, pas d'image de livre.
//
// Une œuvre : { id, fr, he, genre, author (texte libre : l'auteur, ou l'école qui l'a mise en forme), authorId (l'identifiant d'un maître de la chaîne de
//   transmission, ou null), from, to (années de l'ère commune ; l'œuvre a été écrite ou mise en forme entre les deux), approx (vrai si la datation varie
//   selon les sources), place, desc (ce que c'est), trad (l'attribution traditionnelle quand elle diffère de ce que disent les historiens, ou '') }.
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
        { id: 'kabbale', fr: 'Kabbale' },
        { id: 'hassidout', fr: 'Hassidout' }
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

    WORKS.sort(function (a, b) { return a.from - b.from || a.to - b.to; });

    function byId(id) { return BY[id] || null; }
    function ofGenre(genre) { return WORKS.filter(function (x) { return x.genre === genre; }); }
    function worksOf(authorId) { return WORKS.filter(function (x) { return x.authorId === authorId; }); }
    function eraOf(work) {
        for (var i = 0; i < ERAS.length; i++) if (work.from <= ERAS[i].to) return ERAS[i].id;
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
        var span = work.from === work.to ? String(work.from) : work.from + '–' + work.to;
        return (work.approx ? 'vers ' : '') + span;
    }

    return { GENRES: GENRES, ERAS: ERAS, WORKS: WORKS, byId: byId, ofGenre: ofGenre, worksOf: worksOf, eraOf: eraOf, ofEra: ofEra, search: search, dating: dating };
}));
