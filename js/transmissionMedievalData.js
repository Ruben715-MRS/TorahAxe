// =========================================================================
// === LA CHAÎNE DE TRANSMISSION — DES SAVORAÏM À NOS JOURS (données) ===
// =========================================================================
// Les maîtres venus après la Guémara : savoraïm et guéonim (grp « gueonim »), richonim (« richonim »), 'aharonim (« aharonim »), chacun avec ses dates, son lieu
// et ses œuvres. Consommé par js/transmissionCore.js (la chaîne) et par js/libraryCore.js (la « Bibliothèque juive »). Pur, sans DOM.
//
// Une personne : { id, fr, he, grp, row (rang de transmission), born, died (année de l'ère commune ; `approx` vrai si une date au moins est approximative ;
//   null si inconnue), place, works : [[titre français, titre hébreu ou ''], …], note (texte libre, ou '') , group (vrai pour un ensemble) }.
// Un lien : [maître, élève, genre ('maitre' | 'second' | 'pere' | 'beaupere' | 'famille'), source, doute (vrai si discuté)].
//
// Écrit à la main d'après les notices usuelles (Séder haDorot, Jewish Encyclopedia, Encyclopaedia Judaica, Sefaria) ; les dates sont celles couramment admises,
// `approx` signale celles qui varient selon les sources. Les liens de maître à élève sont ceux que les notices établissent ; les liens tenus pour probables mais
// discutés portent `doute`. Pas de lien lorsque les sources n'en disent rien (le Maharal, le Gaon de Vilna, etc. : pas de maître principal). À relire par une
// personne compétente.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TransmissionMedievalData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var PEOPLE = [];
    var EDGES = [];
    // p(id, fr, he, grp, rang, né, mort, approx, lieu, [[œuvre fr, œuvre he], …], note, ensemble)
    function p(id, fr, he, grp, row, born, died, approx, place, works, note, group) {
        PEOPLE.push({ id: id, fr: fr, he: he, grp: grp, row: row, born: born, died: died, approx: !!approx, place: place || '', works: works || [], note: note || '', group: !!group });
    }
    function e(from, to, kind, src, doubt) { EDGES.push([from, to, kind, src || '', !!doubt]); }

    // --- Savoraïm et guéonim (VIe – XIe siècle, Babylonie) ----------------------------------------------------
    p('savoraim', 'Les Savoraïm', 'הסבוראים', 'gueonim', 24, 500, 589, true, 'Babylonie', [['Dernières retouches du Talmud de Babylone', '']], 'Les maîtres entre Ravina et Rav Achi (fin de la Guémara) et les Guéonim : ils achèvent la mise en forme du Talmud.', true);
    p('gueonim', 'Les Guéonim', 'הגאונים', 'gueonim', 25, 589, 1038, false, 'Soura et Pumbedita (Babylonie)', [['Réponses (Techouvot HaGuéonim)', 'תשובות הגאונים']], 'Les chefs des deux grandes académies de Babylonie, qui font autorité pour tout le monde juif jusqu’en 1038.', true);
    p('ahai_gaon', 'Rav Ahaï Gaon de Chabha', 'רב אחאי גאון', 'gueonim', 26, 680, 752, true, 'Chabha (Babylonie)', [['Chéiltot', 'שאלתות']], 'Auteur de la plus ancienne œuvre halakhique connue des Guéonim, organisée selon les sections de la Torah.');
    p('amram_gaon', 'Rav Amram Gaon', 'רב עמרם גאון', 'gueonim', 26, null, 875, true, 'Soura', [['Séder Rav Amram (premier livre de prières complet)', 'סדר רב עמרם גאון']], 'Son livre de prières est l’ancêtre de tous les sidourim.');
    p('saadia_gaon', 'Rav Saadia Gaon', 'רב סעדיה גאון', 'gueonim', 26, 882, 942, false, 'Fayoum (Égypte), puis Soura', [['Emounot VéDéot (philosophie)', 'אמונות ודעות'], ['Tafsir (traduction arabe de la Torah)', 'תפסיר'], ['Sidour de Rav Saadia', 'סדור רס״ג']], 'Il a nommé Rav Saadia « Gaon » de Soura en 928.');
    p('chmouel_hofni', 'Rav Chmouel ben Hofni Gaon', 'רב שמואל בן חפני גאון', 'gueonim', 26, null, 1013, true, 'Soura', [['Commentaires en arabe sur la Torah', ''], ['Introduction au Talmud', '']]);
    p('sherira_gaon', 'Rav Chérira Gaon', 'רב שרירא גאון', 'gueonim', 26, 906, 1006, true, 'Poumbedita', [['Iguéret Rav Chérira Gaon (histoire de la transmission)', 'אגרת רב שרירא גאון']], 'Sa célèbre lettre raconte comment la Michna et le Talmud ont été transmis.');
    p('hai_gaon', 'Rav Haï Gaon', 'רב האי גאון', 'gueonim', 27, 939, 1038, false, 'Poumbedita', [['Réponses', 'תשובות'], ['Michpetei Chevouot', 'משפטי שבועות'], ['Hamékhaker', 'המקח והממכר']], 'Le dernier des grands Guéonim ; avec lui se ferme l’époque des Guéonim (1038).');
    e('savoraim', 'gueonim', 'maitre', 'Succession des académies de Babylonie');
    e('ravina', 'savoraim', 'maitre', 'Lettre de Rav Chérira Gaon : les Savoraïm achèvent la Guémara après Ravina');
    e('rav_achi', 'savoraim', 'maitre', 'Lettre de Rav Chérira Gaon');
    ['ahai_gaon', 'amram_gaon', 'saadia_gaon', 'chmouel_hofni', 'sherira_gaon'].forEach(function (id) { e('gueonim', id, 'maitre', 'Chef de l’académie de Soura ou de Poumbedita'); });
    e('sherira_gaon', 'hai_gaon', 'pere', 'Iguéret Rav Chérira Gaon ; Séder haDorot');
    e('chmouel_hofni', 'hai_gaon', 'beaupere', 'Rav Haï a épousé la fille de Rav Chmouel ben Hofni (fait bien attesté)');

    // --- Richonim : Afrique du Nord et Espagne ---------------------------------------------------------
    p('hananel', 'Rabbénou Hananel ben Houchiel', 'רבנו חננאל בן חושיאל', 'richonim', 28, 990, 1055, true, 'Kairouan', [['Commentaire sur le Talmud', 'פירוש רבנו חננאל']], 'Son commentaire est cité par Rachi et par les Tossafistes.');
    p('nissim_gaon', 'Rabbénou Nissim Gaon', 'רבנו נסים גאון', 'richonim', 28, 990, 1062, true, 'Kairouan', [['Hakdama léMafteah (introduction au Talmud)', 'המפתח'], ['Méguilat Sétarim', 'מגילת סתרים']]);
    p('rif', 'Rabbi Yitzhak Alfassi (le Rif)', 'רבי יצחק אלפסי (הרי״ף)', 'richonim', 29, 1013, 1103, false, 'Fès, puis Lucena', [['Halakhot (Séfer HaHalakhot : le Talmud mis en lois)', 'הלכות הרי״ף']], 'Né près de Constantine, il a enseigné à Fès, puis à Lucena (Espagne).');
    p('ri_migash', 'Rabbi Yossef ibn Migach (le Ri Migach)', 'רבי יוסף אבן מיגאש', 'richonim', 30, 1077, 1141, false, 'Lucena', [['Réponses', 'שו״ת הרי״ם מיגש'], ['Commentaire sur Bava Batra et Chevouot', '']]);
    p('yehouda_halevi', 'Rabbi Yéhouda HaLévi', 'רבי יהודה הלוי', 'richonim', 30, 1075, 1141, true, 'Tolède et Cordoue', [['Le Kouzari', 'ספר הכוזרי'], ['Poèmes (Tsion halo tichali)', 'ציון הלא תשאלי']]);
    p('ibn_ezra', 'Rabbi Avraham ibn Ezra', 'רבי אברהם אבן עזרא', 'richonim', 29, 1089, 1167, false, 'Tolède, voyages', [['Commentaire sur la Torah', 'פירוש אבן עזרא על התורה'], ['Yessod Moura', 'יסוד מורא']]);
    p('maimon_dayan', 'Rabbi Maïmon, père du Rambam', 'רבי מיימון הדיין', 'richonim', 31, 1110, 1165, true, 'Cordoue, puis Fès', [['Iguéret HaNéhama (lettre de consolation)', '']]);
    p('rambam', 'Rabbi Moché ben Maïmon (Maïmonide, le Rambam)', 'רבי משה בן מימון (הרמב״ם)', 'richonim', 32, 1138, 1204, false, 'Cordoue, Fès, Fustat (Le Caire)', [
        ['Michné Torah (Yad HaHazaka : tout le droit juif)', 'משנה תורה'], ['Moré Névoukhim (Le Guide des égarés)', 'מורה נבוכים'],
        ['Commentaire sur la Michna (Perouch HaMichna)', 'פירוש המשנה'], ['Séfer HaMitsvot (les 613 commandements)', 'ספר המצוות'], ['Iguéret Teiman', 'אגרת תימן']], 'Médecin du sultan et chef de la communauté du Caire.');
    p('avraham_rambam', 'Rabbi Avraham, fils du Rambam', 'רבי אברהם בן הרמב״ם', 'richonim', 33, 1186, 1237, false, 'Le Caire', [['Milhamot HaChem (défense de son père)', ''], ['Hamaspik léOvdei HaChem', 'המספיק לעובדי השם']]);
    e('hai_gaon', 'hananel', 'maitre', 'Transmission indirecte, surtout par correspondance : Rav Haï n’est pas son maître en personne');
    e('hai_gaon', 'nissim_gaon', 'maitre', 'Transmission indirecte, par correspondance ; le père de Rabbénou Nissim avait étudié auprès de Rav Haï');
    e('hananel', 'rif', 'maitre', 'Notices usuelles : le Rif a eu pour maîtres Rabbénou Nissim et Rabbénou Hananel');
    e('nissim_gaon', 'rif', 'maitre', 'Notices usuelles');
    e('rif', 'ri_migash', 'maitre', 'Notices usuelles : le Ri Migach fut l’élève du Rif douze ans');
    e('rif', 'yehouda_halevi', 'maitre', 'Le Rif dirigeait l’académie de Lucena, où Rabbi Yéhouda HaLévi fut son élève');
    e('ri_migash', 'maimon_dayan', 'maitre', 'Notices usuelles : Rabbi Maïmon, élève du Ri Migach');
    e('maimon_dayan', 'rambam', 'pere', 'Notices usuelles : le Rambam a étudié d’abord auprès de son père');
    e('rambam', 'avraham_rambam', 'pere', 'Notices usuelles');

    // --- Richonim : France et Allemagne (Rachi, les Tossafistes) ---------------------------------------
    p('yehouda_leontin', 'Rabbi Yéhouda ben Méïr HaCohen (Léontin)', 'רבי יהודה בן מאיר הכהן (לאונטין)', 'richonim', 26, null, 1000, true, 'Mayence', [], 'Maître principal de Rabbénou Guershom à Mayence.');
    p('guershom', 'Rabbénou Guershom Méor HaGola', 'רבנו גרשום מאור הגולה', 'richonim', 27, 960, 1040, true, 'Mayence', [['Commentaires sur le Talmud', ''], ['Takanot : interdiction de la polygamie et de lire le courrier d’autrui', 'תקנות רבנו גרשום']], 'La « lumière de l’exil » : il est à l’origine de l’école ashkénaze.');
    p('yaakov_yakar', 'Rabbi Yaakov ben Yakar', 'רבי יעקב בן יקר', 'richonim', 28, 990, 1064, true, 'Mayence', [], 'Maître de Rachi à Mayence.');
    p('yitzhak_yehouda', 'Rabbi Yitzhak ben Yéhouda', 'רבי יצחק בן יהודה', 'richonim', 28, 990, 1070, true, 'Mayence', [], 'Maître de Rachi à Mayence.');
    p('yitzhak_halevi', 'Rabbi Yitzhak HaLévi', 'רבי יצחק הלוי', 'richonim', 28, 990, 1070, true, 'Worms', [], 'Maître de Rachi à Worms.');
    p('rachi', 'Rabbi Chlomo Yitzhaki (Rachi)', 'רבי שלמה יצחקי (רש״י)', 'richonim', 29, 1040, 1105, false, 'Troyes', [['Commentaire sur la Torah', 'פירוש רש״י על התורה'], ['Commentaire sur le Talmud de Babylone', 'פירוש רש״י על הש״ס'], ['Commentaire sur les Prophètes et les Écrits', '']], 'Né et mort à Troyes ; a étudié à Mayence et à Worms.');
    p('meir_chmouel', 'Rabbi Meïr ben Chmouel', 'רבי מאיר בן שמואל', 'richonim', 30, 1060, 1135, true, 'Ramerupt', [['Responsa et gloses', '']], 'Gendre de Rachi, père du Rachbam et de Rabbénou Tam.');
    p('yossef_kara', 'Rabbi Yossef Kara', 'רבי יוסף קרא', 'richonim', 30, 1065, 1135, true, 'Troyes', [['Commentaires sur les Prophètes', 'פירוש רבי יוסף קרא']]);
    p('rachbam', 'Rabbi Chmouel ben Meïr (le Rachbam)', 'רבי שמואל בן מאיר (רשב״ם)', 'richonim', 31, 1085, 1158, true, 'Ramerupt', [['Commentaire sur la Torah (le sens littéral : péchat)', 'פירוש הרשב״ם על התורה'], ['Commentaire sur Bava Batra et Pessahim', '']], 'Petit-fils de Rachi.');
    p('rabbenou_tam', 'Rabbi Yaakov ben Meïr (Rabbénou Tam)', 'רבי יעקב בן מאיר (רבנו תם)', 'richonim', 31, 1100, 1171, false, 'Ramerupt', [['Séfer HaYachar', 'ספר הישר'], ['Tossafot', 'תוספות']], 'Petit-fils de Rachi ; chef des Tossafistes.');
    p('ri_zaken', 'Rabbi Yitzhak ben Chmouel de Dampierre (le Ri HaZaken)', 'רבי יצחק בן שמואל (הריא״ז הזקן)', 'richonim', 32, 1115, 1184, true, 'Dampierre', [['Tossafot (de Dampierre)', 'תוספות הרי״ד']], 'Neveu de Rabbénou Tam.');
    p('rash_michants', 'Rabbi Chimchon de Sens (le Rach de Sens)', 'רבי שמשון משאנץ (הר״ש משאנץ)', 'richonim', 33, 1150, 1230, true, 'Sens, puis Terre d’Israël', [['Tossafot de Sens', 'תוספות שאנץ'], ['Commentaire sur la Michna (Zéraïm, Tohorot)', '']]);
    p('yehouda_sir_leon', 'Rabbi Yéhouda Sir Léon de Paris', 'רבי יהודה שיר ליאון', 'richonim', 33, 1166, 1224, true, 'Paris', [['Tossafot de Paris (Sir Léon)', 'תוספות סיר ליאון']], 'Tossafiste de Paris ; maître de Rabbi Yehiel de Paris.');
    p('yehiel_paris', 'Rabbi Yehiel de Paris', 'רבי יחיאל מפריז', 'richonim', 34, 1200, 1268, true, 'Paris', [['Débat sur le Talmud (Paris, 1240)', '']], 'Il défend le Talmud lors de la dispute de Paris (1240).');
    p('maharam_rothenburg', 'Rabbi Meïr de Rothenbourg (le Maharam)', 'רבי מאיר מרוטנבורג (המהר״ם)', 'richonim', 35, 1215, 1293, false, 'Rothenbourg', [['Responsa (des milliers)', 'שו״ת מהר״ם מרוטנבורג'], ['Tossafot de Rothenbourg', '']], 'Mort en prison (Ensisheim) ; son corps ne fut racheté que 14 ans plus tard.');
    p('mordekhai', 'Rabbi Mordekhaï ben Hillel', 'רבי מרדכי בן הלל', 'richonim', 36, 1240, 1298, true, 'Nuremberg', [['Le Mordekhaï (commentaire halakhique sur le Talmud)', 'ספר מרדכי']]);
    p('rosh', 'Rabbénou Acher ben Yehiel (le Rosh)', 'רבנו אשר בן יחיאל (הרא״ש)', 'richonim', 36, 1250, 1327, true, 'Rothenbourg, puis Tolède', [['Piskei HaRosh (le Talmud mis en lois)', 'פסקי הרא״ש'], ['Réponses', 'שו״ת הרא״ש']], 'Il fuit l’Allemagne vers l’Espagne et devient rabbin de Tolède.');
    p('yaakov_acher', 'Rabbi Yaakov ben Acher (Baal HaTourim)', 'רבי יעקב בן אשר (בעל הטורים)', 'richonim', 37, 1269, 1343, true, 'Tolède', [['Arbaa Tourim (« les quatre rangées »)', 'ארבעה טורים'], ['Commentaire sur la Torah (Baal HaTourim)', 'פירוש הטורים']], 'Les quatre parties de son Tour ont donné leur plan au Choulhan Aroukh.');
    e('gueonim', 'guershom', 'maitre', 'Pas de continuité personnelle : la transmission de Babylonie vers l’Ashkenaz est diffuse (réponses, voyageurs) ; son maître principal est Rabbi Yéhouda ben Méïr Léontin', true);
    e('yehouda_leontin', 'guershom', 'maitre', 'Notices usuelles : son maître principal à Mayence');
    e('guershom', 'yaakov_yakar', 'maitre', 'Notices usuelles');
    e('guershom', 'yitzhak_yehouda', 'maitre', 'Notices usuelles');
    e('guershom', 'yitzhak_halevi', 'maitre', 'Notices usuelles');
    ['yaakov_yakar', 'yitzhak_yehouda', 'yitzhak_halevi'].forEach(function (id) { e(id, 'rachi', 'maitre', 'Notices usuelles : les maîtres de Rachi à Mayence et à Worms'); });
    e('rachi', 'meir_chmouel', 'beaupere', 'Rabbi Meïr ben Chmouel épousa la fille de Rachi');
    e('rachi', 'yossef_kara', 'maitre', 'Notices usuelles : élève et parent de Rachi');
    e('meir_chmouel', 'rachbam', 'pere', 'Notices usuelles');
    e('meir_chmouel', 'rabbenou_tam', 'pere', 'Notices usuelles');
    e('rachi', 'rachbam', 'famille', 'Petit-fils et élève de Rachi');
    e('rachi', 'rabbenou_tam', 'famille', 'Petit-fils de Rachi');
    e('rabbenou_tam', 'ri_zaken', 'maitre', 'Notices usuelles : neveu et élève de Rabbénou Tam');
    e('ri_zaken', 'rash_michants', 'maitre', 'Notices usuelles');
    e('yehouda_sir_leon', 'yehiel_paris', 'maitre', 'Notices usuelles : Rabbi Yehiel de Paris fut surtout l’élève de Rabbi Yéhouda Sir Léon');
    e('yehiel_paris', 'maharam_rothenburg', 'maitre', 'Notices usuelles : le Maharam a étudié à Paris');
    e('maharam_rothenburg', 'mordekhai', 'maitre', 'Notices usuelles');
    e('maharam_rothenburg', 'rosh', 'maitre', 'Notices usuelles');
    e('rosh', 'yaakov_acher', 'pere', 'Notices usuelles');

    // --- Richonim : Provence, Catalogne et Espagne (Ramban, Rachba, Ritva, Ran) --------------------------
    p('raavad', 'Rabbi Avraham ben David de Posquières (le Raavad)', 'רבי אברהם בן דוד מפושקיירא (הראב״ד)', 'richonim', 31, 1125, 1198, false, 'Posquières (Provence)', [['Hassagot sur le Michné Torah', 'השגות הראב״ד'], ['Baalei HaNéfech', 'בעלי הנפש']], 'Le critique le plus célèbre du Rambam.');
    p('yitzhak_aveugle', 'Rabbi Yitzhak l’Aveugle (Sagui Nahor)', 'רבי יצחק סגי נהור', 'richonim', 32, 1160, 1235, true, 'Posquières', [['Commentaire sur le Séfer Yétsira', '']], 'Fils du Raavad ; l’un des premiers kabbalistes de Provence.');
    p('yonah_gerondi', 'Rabbénou Yona de Gérone', 'רבנו יונה מגירונה', 'richonim', 33, 1200, 1263, true, 'Gérone, Barcelone', [['Chaaréi Téchouva (Les portes du repentir)', 'שערי תשובה'], ['Séfer HaYir’a', '']]);
    p('ramban', 'Rabbi Moché ben Nahman (Nahmanide, le Ramban)', 'רבי משה בן נחמן (הרמב״ן)', 'richonim', 33, 1194, 1270, false, 'Gérone, Barcelone, puis Akko', [['Commentaire sur la Torah', 'פירוש הרמב״ן על התורה'], ['Hidouchim sur le Talmud', 'חידושי הרמב״ן'], ['Milhamot HaChem', 'מלחמות ה׳'], ['Chaar HaGmoul', 'שער הגמול']], 'Il défend le judaïsme lors de la dispute de Barcelone (1263) ; il achève sa vie en Terre d’Israël.');
    p('rachba', 'Rabbi Chlomo ben Avraham Adret (le Rachba)', 'רבי שלמה בן אדרת (הרשב״א)', 'richonim', 34, 1235, 1310, false, 'Barcelone', [['Réponses (plus de 7000)', 'שו״ת הרשב״א'], ['Torat HaBayit', 'תורת הבית'], ['Hidouchim sur le Talmud', 'חידושי הרשב״א']], 'Chef de la communauté de Barcelone.');
    p('raah', 'Rabbi Aharon HaLévi de Barcelone (le Raah)', 'רבי אהרן הלוי (הראב״ה)', 'richonim', 34, 1235, 1290, true, 'Barcelone', [['Hidouchim sur le Talmud (Hidouchei HaRaah)', 'חידושי הרא״ה']], 'On lui attribuait le Séfer HaHinoukh ; cette attribution est aujourd’hui largement écartée (voir la Bibliothèque).');
    p('ritva', 'Rabbi Yom Tov Achbili (le Ritva)', 'רבי יום טוב אשבילי (הריטב״א)', 'richonim', 35, 1250, 1330, true, 'Séville', [['Hidouchim sur le Talmud', 'חידושי הריטב״א']]);
    p('bahya_acher', 'Rabbi Bahya ben Acher', 'רבי בחיי בן אשר', 'richonim', 35, 1255, 1340, true, 'Saragosse', [['Commentaire sur la Torah (Rabbénou Bahya)', 'פירוש רבנו בחיי'], ['Kad HaKémah', 'כד הקמח']]);
    p('ran', 'Rabbénou Nissim Gérondi (le Ran)', 'רבנו נסים גירונדי (הר״ן)', 'richonim', 35, 1320, 1376, true, 'Barcelone', [['Commentaire sur le Rif', 'פירוש הר״ן על הרי״ף'], ['Drachot HaRan', 'דרשות הר״ן'], ['Réponses', 'שו״ת הר״ן']]);
    p('abarbanel', 'Don Yitzhak Abravanel', 'רבי יצחק אברבנאל', 'richonim', 36, 1437, 1508, false, 'Lisbonne, Tolède, Naples, Venise', [['Commentaire sur la Torah et les Prophètes', 'פירוש אברבנאל'], ['Roch Amana', 'ראש אמנה']], 'Ministre des finances des rois d’Espagne ; il quitte l’Espagne lors de l’expulsion de 1492.');
    e('raavad', 'yitzhak_aveugle', 'pere', 'Notices usuelles');
    e('yitzhak_aveugle', 'ramban', 'maitre', 'Transmission kabbalistique de Provence à Gérone (Ezra et Azriel), puis au Ramban : par l’école de Gérone, non en élève direct');
    e('ramban', 'rachba', 'maitre', 'Notices usuelles : le Rachba fut l’élève du Ramban et de Rabbénou Yona');
    e('yonah_gerondi', 'rachba', 'second', 'Notices usuelles');
    e('ramban', 'raah', 'maitre', 'Notices usuelles : le Raah fut l’élève du Ramban');
    e('rachba', 'ritva', 'maitre', 'Notices usuelles : le Ritva fut l’élève du Rachba et du Raah');
    e('raah', 'ritva', 'second', 'Notices usuelles');
    e('rachba', 'bahya_acher', 'maitre', 'Notices usuelles');
    e('rachba', 'ran', 'maitre', 'Tradition : le Ran aurait reçu du Rachba par Rabbi Pérets HaKohen ; lien indirect', true);

    // --- Autres richonim, sans maître principal connu des sources usuelles ----------------------------
    p('radak', 'Rabbi David Kimhi (le Radak)', 'רבי דוד קמחי (רד״ק)', 'richonim', 31, 1160, 1235, true, 'Narbonne', [['Commentaire sur les Prophètes et les Psaumes', 'פירוש הרד״ק'], ['Séfer HaChorachim (dictionnaire)', 'ספר השרשים'], ['Mikhlol (grammaire)', 'מכלול']]);
    p('meiri', 'Rabbi Menahem HaMéïri', 'רבי מנחם המאירי', 'richonim', 35, 1249, 1315, true, 'Perpignan', [['Beit HaBéhira (commentaire sur le Talmud)', 'בית הבחירה']]);
    p('moche_leon', 'Rabbi Moché de Léon', 'רבי משה די ליאון', 'richonim', 35, 1240, 1305, true, 'Guadalajara, Ávila', [['Diffusion du Zohar', 'ספר הזוהר']], 'La tradition attribue le Zohar à Rabbi Chimon bar Yohaï ; Moché de Léon l’a fait connaître au XIIIe siècle.');
    p('bartenura', 'Rabbi Ovadia de Bertinoro (Bartenura)', 'רבי עובדיה מברטנורא', 'richonim', 37, 1445, 1515, true, 'Bertinoro, puis Jérusalem', [['Commentaire sur la Michna', 'פירוש ברטנורא']]);

    // --- 'Aharonim : XVIe – XVIIIe siècle ----------------------------------------------------------------
    p('yaakov_berav', 'Rabbi Yaakov Berav (le Maharav)', 'רבי יעקב בירב', 'aharonim', 38, 1474, 1546, true, 'Tsfat', [['Rétablissement de l’ordination (sémikha) à Tsfat, 1538', '']], 'Expulsé d’Espagne ; il tente de rétablir la sémikha à Tsfat. Collègue de Rabbi Yossef Karo (même cercle).');
    p('karo', 'Rabbi Yossef Karo (Maran)', 'רבי יוסף קארו (מרן)', 'aharonim', 39, 1488, 1575, false, 'Tolède, Nicopolis, puis Tsfat', [['Choulhan Aroukh', 'שולחן ערוך'], ['Beit Yossef (commentaire sur le Tour)', 'בית יוסף'], ['Késsef Michné', 'כסף משנה'], ['Maguid Méicharim', 'מגיד מישרים']], 'Collègue de Rabbi Yaakov Berav à Tsfat (même cercle, pas de lien de maître à élève). Le Choulhan Aroukh, d’après le Beit Yossef, devient le code de référence pour tout le monde juif.');
    p('alshich', 'Rabbi Moché Alshikh (l’Alshikh)', 'רבי משה אלשיך', 'aharonim', 40, 1508, 1593, true, 'Tsfat', [['Torat Moché (commentaire sur la Torah)', 'תורת משה']]);
    p('alkabetz', 'Rabbi Chlomo Alkabetz', 'רבי שלמה אלקבץ', 'aharonim', 38, 1505, 1584, true, 'Salonique, puis Tsfat', [['Lékha Dodi', 'לכה דודי'], ['Manot HaLévi', 'מנות הלוי']], 'L’auteur de Lékha Dodi, chanté le vendredi soir.');
    p('ramak', 'Rabbi Moché Cordovero (le Ramak)', 'רבי משה קורדוברו (הרמ״ק)', 'aharonim', 39, 1522, 1570, false, 'Tsfat', [['Pardès Rimonim', 'פרדס רימונים'], ['Or Néérav', 'אור נאהב']], 'Le grand systématisateur de la Kabbale avant le Ari.');
    p('ari', 'Rabbi Yitzhak Louria (le Ari HaKadoch)', 'רבי יצחק לוריא (האר״י הקדוש)', 'aharonim', 40, 1534, 1572, false, 'Le Caire, puis Tsfat', [['Ses enseignements, écrits par Rabbi Haïm Vital : Étz Haïm', 'עץ חיים'], ['Chmoné Chéarim', 'שמונה שערים']], 'Il n’a presque rien écrit lui-même : ses élèves ont mis ses paroles par écrit.');
    p('haim_vital', 'Rabbi Haïm Vital', 'רבי חיים ויטאל', 'aharonim', 41, 1542, 1620, false, 'Tsfat, Damas', [['Étz Haïm', 'עץ חיים'], ['Chaaré Kédoucha', 'שערי קדושה']]);
    p('yaakov_pollak', 'Rabbi Yaakov Pollak', 'רבי יעקב פולק', 'aharonim', 38, 1460, 1541, true, 'Prague, puis Cracovie', [['Diffusion du pilpoul', '']], 'Fondateur de l’école de pilpoul de Cracovie.');
    p('chakhna', 'Rabbi Chalom Chakhna de Lublin', 'רבי שלום שכנא מלובלין', 'aharonim', 39, 1510, 1558, true, 'Lublin', [['Enseignement', '']], 'Maître de la yéchiva de Lublin.');
    p('rema', 'Rabbi Moché Isserlès (le Rema)', 'רבי משה איסרלס (הרמ״א)', 'aharonim', 40, 1530, 1572, false, 'Cracovie', [['HaMapa (gloses ashkénazes sur le Choulhan Aroukh)', 'המפה'], ['Darkhei Moché', 'דרכי משה'], ['Torat HaOla', 'תורת העולה']], 'Avec la Mapa, le Choulhan Aroukh devient le code des Ashkénazes comme des Séfarades.');
    p('maharshal', 'Rabbi Chlomo Louria (le Maharchal)', 'רבי שלמה לוריא (מהרש״ל)', 'aharonim', 40, 1510, 1573, true, 'Lublin', [['Yam chel Chlomo', 'ים של שלמה'], ['Hokhmat Chlomo', 'חכמת שלמה']]);
    p('maharal', 'Rabbi Yéhouda Loew (le Maharal de Prague)', 'רבי יהודה לווא (המהר״ל מפראג)', 'aharonim', 41, 1520, 1609, true, 'Prague', [['Guévourot HaChem', 'גבורות ה׳'], ['Netivot Olam', 'נתיבות עולם'], ['Tiféret Israël', 'תפארת ישראל'], ['Gour Aryé', 'גור אריה']], 'Pas de maître principal connu : on le dit « autodidacte ».');
    p('tosafot_yomtov', 'Rabbi Yom Tov Lipman Heller', 'רבי יום טוב ליפמן העלער', 'aharonim', 42, 1578, 1654, false, 'Prague, Cracovie', [['Tossafot Yom Tov (commentaire sur la Michna)', 'תוספות יום טוב']]);
    p('shelah', 'Rabbi Yéchaya Horowitz (le Chelah HaKadoch)', 'רבי ישעיה הורוויץ (השל״ה הקדוש)', 'aharonim', 42, 1565, 1630, true, 'Prague, Francfort, Jérusalem', [['Chné Loukhot HaBrit', 'שני לוחות הברית']]);
    p('bach', 'Rabbi Yoël Sirkès (le Bah)', 'רבי יואל סירקיס (הב״ח)', 'aharonim', 42, 1561, 1640, true, 'Cracovie', [['Bayit Hadach (sur le Tour)', 'בית חדש']]);
    p('taz', 'Rabbi David HaLévi Segal (le Taz)', 'רבי דוד הלוי סגל (הט״ז)', 'aharonim', 43, 1586, 1667, true, 'Ostroh, Lvov', [['Tourei Zahav (sur le Choulhan Aroukh)', 'טורי זהב']]);
    p('shakh', 'Rabbi Chabtaï HaKohen (le Chakh)', 'רבי שבתי הכהן (הש״ך)', 'aharonim', 43, 1621, 1662, true, 'Vilnius', [['Siftei Cohen (sur le Choulhan Aroukh)', 'שפתי כהן']]);
    p('ramhal', 'Rabbi Moché Haïm Luzzatto (le Ramhal)', 'רבי משה חיים לוצאטו (הרמח״ל)', 'aharonim', 44, 1707, 1746, false, 'Padoue, Amsterdam, Akko', [['Messilat Yécharim', 'מסילת ישרים'], ['Dérekh HaChem', 'דרך ה׳']]);
    p('or_hahaim', 'Rabbi Haïm ibn Attar (Or HaHaïm)', 'רבי חיים בן עטר', 'aharonim', 44, 1696, 1743, false, 'Maroc, Livourne, Jérusalem', [['Or HaHaïm (commentaire sur la Torah)', 'אור החיים']]);
    p('gra', 'Rabbi Éliyahou de Vilna (le Gaon de Vilna, le Gra)', 'רבי אליהו מווילנא (הגר״א)', 'aharonim', 45, 1720, 1797, false, 'Vilnius', [['Biour HaGra (sur le Choulhan Aroukh)', 'ביאור הגר״א'], ['Adéret Éliyahou', 'אדרת אליהו']], 'Chef des Mitnagdim ; il est considéré comme un génie de tous les domaines de la Torah.');

    e('karo', 'alshich', 'maitre', 'Notices usuelles');
    e('alkabetz', 'ramak', 'beaupere', 'Rabbi Moché Cordovero épousa la sœur de la femme de Rabbi Chlomo Alkabetz ; il fut son élève');
    e('ramak', 'ari', 'maitre', 'Notices usuelles : le Ari a étudié auprès du Ramak peu de temps');
    e('ari', 'haim_vital', 'maitre', 'Notices usuelles : son élève principal');
    e('yaakov_pollak', 'chakhna', 'maitre', 'Notices usuelles');
    e('chakhna', 'rema', 'maitre', 'Notices usuelles : le Rema a étudié à Lublin et épousa la fille de Rabbi Chalom Chakhna');
    e('chakhna', 'maharshal', 'maitre', 'Notices usuelles : le Maharchal a succédé à Rabbi Chalom Chakhna à la tête de la yéchiva de Lublin');
    e('maharal', 'tosafot_yomtov', 'maitre', 'Notices usuelles');
    e('bach', 'taz', 'beaupere', 'Le Taz a épousé la fille du Bah et a étudié chez lui');

    // --- 'Aharonim : XIXe – XXe siècle (hors Hassidout, qui a sa propre carte) ----------------------------------------
    p('haim_volozhin', 'Rabbi Haïm de Volozhin', 'רבי חיים מוולוז׳ין', 'aharonim', 46, 1749, 1821, false, 'Volozhin', [['Néfech HaHaïm', 'נפש החיים'], ['Fondation de la yéchiva de Volozhin (1803)', '']], 'Premier élève du Gaon de Vilna ; sa yéchiva est la mère des yéchivot de Lituanie.');
    p('yitzhak_volozhin', 'Rabbi Yitzhak de Volozhin (Reb Itzélé)', 'רבי יצחק מוולוז׳ין', 'aharonim', 47, 1780, 1849, true, 'Volozhin', [['Enseignement à la yéchiva de Volozhin', '']]);
    p('zundel_salant', 'Rabbi Yossef Zundel de Salant', 'רבי יוסף זונדל מסלנט', 'aharonim', 47, 1786, 1866, true, 'Salant, puis Jérusalem', [['Enseignement', '']], 'Élève de Rabbi Haïm de Volozhin ; maître de Rabbi Israël Salanter.');
    p('beit_halevi', 'Rabbi Yossef Dov Soloveitchik (le Beit HaLévi)', 'רבי יוסף דב סולובייצ׳יק (בית הלוי)', 'aharonim', 48, 1820, 1892, true, 'Slutsk, Brest-Litovsk', [['Beit HaLévi', 'בית הלוי']]);
    p('netziv', 'Rabbi Naftali Tsvi Yehouda Berlin (le Nétsiv)', 'רבי נפתלי צבי יהודה ברלין (הנצי״ב)', 'aharonim', 48, 1816, 1893, false, 'Volozhin', [['Haamek Davar (commentaire sur la Torah)', 'העמק דבר'], ['Haamek Chééla', 'העמק שאלה']], 'Dernier chef de la yéchiva de Volozhin.');
    p('salanter', 'Rabbi Israël Salanter', 'רבי ישראל סלנטר', 'aharonim', 48, 1810, 1883, false, 'Vilnius, Kovno', [['Iguéret HaMoussar', 'אגרת המוסר'], ['Or Israël', 'אור ישראל']], 'Fondateur du mouvement du Moussar.');
    p('alter_kelm', 'Rabbi Simha Zissel Ziv (le Sabba de Kelm)', 'רבי שמחה זיסל זיו (סבא מקלם)', 'aharonim', 49, 1824, 1898, true, 'Kelm', [['Hokhmah UMoussar', 'חכמה ומוסר']]);
    p('kook', 'Rabbi Avraham Yitzhak HaCohen Kook', 'רבי אברהם יצחק הכהן קוק', 'aharonim', 49, 1865, 1935, false, 'Volozhin, Jaffa, Jérusalem', [['Orot', 'אורות'], ['Orot HaKodech', 'אורות הקודש'], ['Olat Réiya (commentaire sur le sidour)', 'עולת ראי״ה']], 'Premier grand-rabbin ashkénaze de la Terre d’Israël.');
    p('haim_brisk', 'Rabbi Haïm Soloveitchik de Brisk', 'רבי חיים סולובייצ׳יק מבריסק', 'aharonim', 49, 1853, 1918, false, 'Brest-Litovsk', [['Hidouchei Rabbénou Haïm HaLévi (sur le Rambam)', 'חידושי רבנו חיים הלוי']], 'Fondateur de la méthode d’analyse de Brisk.');
    p('moche_solov', 'Rabbi Moché Soloveitchik', 'רבי משה סולובייצ׳יק', 'aharonim', 50, 1876, 1941, true, 'Brest-Litovsk, Varsovie', []);
    p('joseph_solov', 'Rabbi Yossef Dov Soloveitchik (le Rav)', 'רבי יוסף דב סולובייצ׳יק (הרב)', 'aharonim', 51, 1903, 1993, false, 'Boston, New York', [['Halakhic Man (Ich HaHalakha)', 'איש ההלכה'], ['Divré HaGuéon (Hidouchim)', '']], 'Petit-fils de Rabbi Haïm de Brisk, chef de l’école de Yeshiva University.');
    p('nathan_adler', 'Rabbi Natan Adler de Francfort', 'רבי נתן אדלר', 'aharonim', 44, 1741, 1800, false, 'Francfort', [['Enseignement (kabbale et halakha)', '']]);
    p('hatam_sofer', 'Rabbi Moché Sofer (le Hatam Sofer)', 'רבי משה סופר (החתם סופר)', 'aharonim', 45, 1762, 1839, false, 'Presbourg (Bratislava)', [['Responsa Hatam Sofer', 'שו״ת חתם סופר'], ['Torat Moché', 'תורת משה'], ['Hidouchim sur le Talmud', 'חידושי החתם סופר']], 'Chef de la yéchiva de Presbourg ; chef de file du judaïsme orthodoxe en Europe centrale.');
    p('ketav_sofer', 'Rabbi Avraham Chmouel Binyamin Sofer (le Ketav Sofer)', 'רבי אברהם שמואל בנימין סופר (כתב סופר)', 'aharonim', 46, 1815, 1871, false, 'Presbourg, Cracovie', [['Responsa Ketav Sofer', 'שו״ת כתב סופר']]);
    p('akiva_eger', 'Rabbi Akiva Eger', 'רבי עקיבא איגר', 'aharonim', 44, 1761, 1837, false, 'Posen', [['Guilyon HaChas', 'גליון הש״ס'], ['Responsa', 'שו״ת רבי עקיבא איגר']]);
    p('ettlinger', 'Rabbi Yaakov Ettlinger (Aroukh LaNer)', 'רבי יעקב עטלינגר (ערוך לנר)', 'aharonim', 45, 1798, 1871, false, 'Altona', [['Aroukh LaNer', 'ערוך לנר'], ['Binyan Tsion', 'בנין ציון']]);
    p('hirsch', 'Rabbi Chimchon Raphaël Hirsch', 'רבי שמשון רפאל הירש', 'aharonim', 46, 1808, 1888, false, 'Hambourg, Francfort', [['Dix-neuf lettres (Igrot Tsafon)', 'אגרות צפון'], ['Horev', 'חורב'], ['Commentaire sur la Torah', 'פירוש הירש על התורה']], 'Fondateur de la néo-orthodoxie allemande : « Torah im Derekh Erets ».');
    p('epstein', 'Rabbi Yehiel Mikhel Epstein', 'רבי יחיאל מיכל אפשטיין', 'aharonim', 46, 1829, 1908, false, 'Novogrudok', [['Aroukh HaChoulhan', 'ערוך השולחן']], 'Un code qui reprend le plan du Choulhan Aroukh, avec les raisons.');
    p('chafetz_haim', 'Rabbi Israël Méïr Kagan (le Hafets Haïm)', 'רבי ישראל מאיר הכהן (החפץ חיים)', 'aharonim', 49, 1838, 1933, false, 'Radin', [['Hafets Haïm (lois de la médisance)', 'חפץ חיים'], ['Michna Beroura', 'משנה ברורה']], 'La Michna Beroura, commentaire de l’Orah Haïm, est la référence de la pratique quotidienne.');
    p('ben_ish_hai', 'Rabbi Yossef Haïm de Bagdad (Ben Ich Haï)', 'רבי יוסף חיים (בן איש חי)', 'aharonim', 49, 1835, 1909, false, 'Bagdad', [['Ben Ich Haï', 'בן איש חי'], ['Rav Péalim', 'רב פעלים']], 'La grande figure des Juifs d’Irak.');
    p('chazon_ich', 'Rabbi Avraham Yéchayahou Karelitz (le Hazon Ich)', 'רבי אברהם ישעיהו קרליץ (החזון איש)', 'aharonim', 50, 1878, 1953, false, 'Vilnius, puis Bné Brak', [['Hazon Ich', 'חזון איש']]);
    p('feinstein', 'Rabbi Moché Feinstein', 'רבי משה פיינשטיין', 'aharonim', 50, 1895, 1986, false, 'New York', [['Iguerot Moché', 'אגרות משה']], 'Le décisionnaire principal des États-Unis au XXe siècle.');
    p('ovadia_yossef', 'Rabbi Ovadia Yossef', 'רבי עובדיה יוסף', 'aharonim', 51, 1920, 2013, false, 'Bagdad (naissance), Jérusalem', [['Yabia Omer', 'יביע אומר'], ['Yékhavé Daat', 'יחווה דעת']], 'Grand-rabbin séfarade d’Israël ; il pose la halakha d’après le Choulhan Aroukh de Maran.');
    e('gra', 'haim_volozhin', 'maitre', 'Notices usuelles : le principal élève du Gaon de Vilna');
    e('haim_volozhin', 'yitzhak_volozhin', 'pere', 'Notices usuelles');
    e('haim_volozhin', 'zundel_salant', 'maitre', 'Notices usuelles');
    e('zundel_salant', 'salanter', 'maitre', 'Notices usuelles');
    e('salanter', 'alter_kelm', 'maitre', 'Notices usuelles');
    e('yitzhak_volozhin', 'beit_halevi', 'maitre', 'Continuité de lignée et d’institution (Volozhin → Brisk) plus que lien direct de maître à élève', true);
    e('yitzhak_volozhin', 'netziv', 'maitre', 'Notices usuelles : élève et gendre de Rabbi Yitzhak');
    e('netziv', 'kook', 'maitre', 'Notices usuelles : le Rav Kook a étudié à Volozhin sous la direction du Nétsiv');
    e('beit_halevi', 'haim_brisk', 'pere', 'Notices usuelles');
    e('haim_brisk', 'moche_solov', 'pere', 'Notices usuelles');
    e('moche_solov', 'joseph_solov', 'pere', 'Notices usuelles');
    e('haim_brisk', 'joseph_solov', 'famille', 'Petit-fils de Rabbi Haïm de Brisk ; il a étudié avec lui');
    e('nathan_adler', 'hatam_sofer', 'maitre', 'Notices usuelles');
    e('hatam_sofer', 'ketav_sofer', 'pere', 'Notices usuelles');
    e('akiva_eger', 'ettlinger', 'maitre', 'Notices usuelles');
    e('ettlinger', 'hirsch', 'maitre', 'Notices usuelles : le Rav Hirsch a étudié à Mannheim chez Rabbi Yaakov Ettlinger');

    return { PEOPLE: PEOPLE, EDGES: EDGES };
}));
