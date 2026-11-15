// =========================================================================
// === GÉNÉALOGIE : LES 48 PROPHÈTES ET LA CHRONOLOGIE DES RÈGNES (données, sans DOM) ===
// =========================================================================
// Deux jeux de données pour les catégories de js/app/genealogy.js :
//  - les 48 prophètes : le Talmud en donne le nombre (Meguila 14a) sans les nommer ; la liste est celle de Rachi (Meguila 14a, « Nevoua chehoutserkha
//    ledorot »), tirée du Seder Olam : 46 noms, puis « pour deux, je ne sais pas ». Texte de Rachi lu sur Sefaria. Les versets sont ceux où l'on trouve
//    le prophète, vérifiés quand c'est dans data/tanakh ; `id` renvoie à la personne de l'arbre (null : elle n'y est pas) ;
//  - les règnes : les durées sont celles du texte (Rois, Chroniques) ; les dates absolues sont celles de quatre chronologues (Albright, Thiele, Galil,
//    Kitchen), recopiées du tableau de Wikipédia « Kings of Judah » et « Kings of Israel and Judah » ; la tradition rabbinique (Seder Olam) ne donne ici
//    que des repères, car elle tranche les règnes qui se chevauchent cas par cas.
// Contenu écrit à la main en français : **à relire par une personne compétente**. Testé dans tests/genealogyChronology.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.GenealogyChronology = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Les 48 prophètes selon Rachi (Meguila 14a) ---------------------------------------------------------------------------------
    var PROPHETS48 = [
        { n: 1, fr: 'Abraham', he: 'אברהם', id: 'abraham', ref: 'Genèse 20:7' },
        { n: 2, fr: 'Isaac', he: 'יצחק', id: 'isaac', ref: 'Genèse 26:2-5' },
        { n: 3, fr: 'Jacob', he: 'יעקב', id: 'jacob', ref: 'Genèse 28:12-15 ; 35:9-12' },
        { n: 4, fr: 'Moïse', he: 'משה', id: 'moise', ref: 'Deutéronome 34:10' },
        { n: 5, fr: 'Aaron', he: 'אהרן', id: 'aaron', ref: 'Exode 7:1' },
        { n: 6, fr: 'Josué', he: 'יהושע', id: 'josue', ref: 'Josué 1:1' },
        { n: 7, fr: "Pin'has", he: 'פנחס', id: 'pinhas', ref: "Juges 2:1 (l'ange de l'Éternel, selon Rachi)" },
        { n: 8, fr: 'Elkana', he: 'אלקנה', id: 'elkana', ref: "1 Samuel 2:27 (l'homme de Dieu, selon Rachi)" },
        { n: 9, fr: 'Éli', he: 'עלי', id: 'eli', ref: '', note: 'Nommé par Rachi, sans verset précis.' },
        { n: 10, fr: 'Samuel', he: 'שמואל', id: 'samuel', ref: '1 Samuel 3:20' },
        { n: 11, fr: 'Gad (le voyant)', he: 'גד', id: null, ref: '1 Samuel 22:5 ; 2 Samuel 24:11' },
        { n: 12, fr: 'Nathan', he: 'נתן', id: 'nathan_prophete', ref: '2 Samuel 7:2 ; 12:1' },
        { n: 13, fr: 'David', he: 'דוד', id: 'david', ref: '2 Samuel 23:2' },
        { n: 14, fr: 'Salomon', he: 'שלמה', id: 'salomon', ref: '1 Rois 3:5 ; 11:9' },
        { n: 15, fr: 'Iddo', he: 'עידו', id: null, ref: "1 Rois 13:1-2 (celui qui crie contre l'autel de Béthel, selon Rachi) ; 2 Chroniques 9:29" },
        { n: 16, fr: 'Michaïhou fils de Yimla', he: 'מיכיהו בן ימלה', id: null, ref: '1 Rois 22:8' },
        { n: 17, fr: 'Abdias', he: 'עובדיה', id: null, ref: 'Abdias 1:1' },
        { n: 18, fr: 'Ahiya le Chilonite', he: 'אחיה השילוני', id: null, ref: '1 Rois 11:29' },
        { n: 19, fr: 'Jéhu fils de Hanani', he: 'יהוא בן חנני', id: null, ref: '1 Rois 16:1' },
        { n: 20, fr: 'Azaria fils d’Oded', he: 'עזריה בן עודד', id: null, ref: '2 Chroniques 15:1' },
        { n: 21, fr: 'Yahaziel, descendant de Matthania', he: 'יחזיאל', id: null, ref: '2 Chroniques 20:14' },
        { n: 22, fr: 'Éliézer fils de Dodavahou, de Marécha', he: 'אליעזר בן דודו ממרשה', id: null, ref: '2 Chroniques 20:37' },
        { n: 23, fr: 'Osée', he: 'הושע', id: 'hosea', ref: 'Osée 1:1' },
        { n: 24, fr: 'Amos', he: 'עמוס', id: 'amos', ref: 'Amos 1:1' },
        { n: 25, fr: 'Michée de Morécheth', he: 'מיכה המורשתי', id: 'micah', ref: 'Michée 1:1' },
        { n: 26, fr: 'Amots', he: 'אמוץ', id: 'amoz', ref: '2 Chroniques 25:15-16 (le prophète qui parle à Amatsia, selon Rachi)' },
        { n: 27, fr: 'Élie', he: 'אליהו', id: 'elijah', ref: '1 Rois 17:1' },
        { n: 28, fr: 'Élisée', he: 'אלישע', id: 'elisha', ref: '2 Rois 2:15' },
        { n: 29, fr: 'Jonas fils d’Amitaï', he: 'יונה בן אמיתי', id: 'jonah', ref: '2 Rois 14:25 ; Jonas 1:1' },
        { n: 30, fr: 'Isaïe', he: 'ישעיהו', id: 'isaiah', ref: 'Isaïe 1:1' },
        { n: 31, fr: 'Joël', he: 'יואל', id: 'joel_prophete', ref: 'Joël 1:1' },
        { n: 32, fr: 'Nahoum', he: 'נחום', id: 'nahum', ref: 'Nahoum 1:1' },
        { n: 33, fr: 'Habacuc', he: 'חבקוק', id: 'habakkuk', ref: 'Habacuc 1:1' },
        { n: 34, fr: 'Sophonie', he: 'צפניה', id: 'zephaniah', ref: 'Sophonie 1:1' },
        { n: 35, fr: 'Ouriyahou de Qiryat-Yéarim', he: 'אוריה מקרית יערים', id: null, ref: 'Jérémie 26:20' },
        { n: 36, fr: 'Jérémie', he: 'ירמיהו', id: 'jeremiah', ref: 'Jérémie 1:1' },
        { n: 37, fr: 'Ézéchiel', he: 'יחזקאל', id: 'ezekiel', ref: 'Ézéchiel 1:3' },
        { n: 38, fr: 'Chemaya (à la place de Daniel)', he: 'שמעיה', id: null, ref: '1 Rois 12:22-24 ; 2 Chroniques 11:2',
            note: "Le Seder Olam compte ici Daniel. Rachi l'écarte (Meguila 3a : les autres sont prophètes, lui non) et le remplace par Chemaya, qui parle à Roboam." },
        { n: 39, fr: 'Baruch', he: 'ברוך', id: null, ref: 'Jérémie 36:4' },
        { n: 40, fr: 'Nériya', he: 'נריה', id: null, ref: 'Jérémie 32:12' },
        { n: 41, fr: 'Seraya fils de Nériya', he: 'שריה', id: null, ref: 'Jérémie 51:59' },
        { n: 42, fr: 'Mahseya', he: 'מחסיה', id: null, ref: 'Jérémie 32:12' },
        { n: 43, fr: 'Aggée', he: 'חגי', id: 'haggai', ref: 'Aggée 1:1' },
        { n: 44, fr: 'Zacharie', he: 'זכריה', id: 'zechariah', ref: 'Zacharie 1:1' },
        { n: 45, fr: 'Malachie', he: 'מלאכי', id: null, ref: 'Malachie 1:1' },
        { n: 46, fr: 'Mardochée Bilchan', he: 'מרדכי בלשן', id: 'mordechai', ref: 'Esther 2:5 ; Esdras 2:2' },
        { n: 47, fr: 'Deux prophètes que Rachi ne connaît pas', he: 'שנים לא ידעתי', id: null, ref: '', unknown: 2,
            note: 'Rachi ne nomme que 46 prophètes et écrit : « pour deux, je ne sais pas ». Les 48 comptent donc ces deux-là.' }
    ];
    var PROPHETS48_SOURCE = 'Rachi, Meguila 14a (« Nevoua chehoutserkha ledorot »), d\'après le Seder Olam';

    // --- Les règnes -----------------------------------------------------------------------------------------------------------
    // Pour chaque roi : l'identifiant dans l'arbre (null : il n'y est pas), le nom, la durée selon le texte, et les dates (av. J.-C.) de quatre chronologues.
    var SCHOLARS = ['thiele', 'albright', 'galil', 'kitchen'];
    var SCHOLAR_NAMES = { thiele: 'Thiele', albright: 'Albright', galil: 'Galil', kitchen: 'Kitchen' };
    function k(id, fr, length, albright, thiele, galil, kitchen) {
        return { id: id, fr: fr, length: length, dates: { albright: albright, thiele: thiele, galil: galil, kitchen: kitchen } };
    }
    var JUDAH = [
        k('rehoboam', 'Roboam', '17 ans', '922–915', '931–913', '931–914', '931–915'),
        k('abijam', 'Abija', '3 ans', '915–913', '913–911', '914–911', '915–912'),
        k('asa_roi', 'Asa', '41 ans', '913–873', '911–870', '911–870', '912–871'),
        k('josaphat', 'Josaphat', '25 ans', '873–849', '870–848', '870–845', '871–849'),
        k('joram_roi', 'Joram', '8 ans', '849–842', '848–841', '851–843', '849–842'),
        k('achazia', 'Achazia', '1 an', '842', '841', '843–842', '842–841'),
        k('athalie', 'Athalie (reine)', '6 ans', '842–837', '841–835', '842–835', '841–835'),
        k('joas', 'Joas', '40 ans', '837–800', '835–796', '835–802', '835–796'),
        k('amatsia', 'Amatsia', '29 ans', '800–783', '796–767', '805–776', '796–776'),
        k('azaria', 'Ozias (Azaria)', '52 ans', '783–742', '767–740', '788–736', '776–736'),
        k('jotham_roi', 'Jotham', '16 ans', '742–735', '740–732', '758–742', '750–735/30'),
        k('achaz', 'Achaz', '16 ans', '735–715', '732–716', '742–726', '735/31–715'),
        k('ezechias', 'Ézéchias', '29 ans', '715–687', '716–687', '726–697', '715–687'),
        k('manasse_roi', 'Manassé', '55 ans', '687–642', '687–643', '697–642', '687–642'),
        k('amon_roi', 'Amon', '2 ans', '642–640', '643–641', '642–640', '642–640'),
        k('josias', 'Josias', '31 ans', '640–609', '641–609', '640–609', '640–609'),
        k('shallum_josias', 'Yehoachaz (Schallum)', '3 mois', '609', '609', '609', '609'),
        k('jehoiakim', 'Yehoyakim (Jojakim)', '11 ans', '609–598', '609–598', '609–598', '609–598'),
        k('jeconiah', 'Yehoyakhin (Jéconias)', '3 mois et 10 jours', '598', '598', '598–597', '598–597'),
        k('zedekiah', 'Sédécias', '11 ans', '597–587', '597–586', '597–586', '597–586')
    ];
    var ISRAEL = [
        k('jeroboam', 'Jéroboam', '22 ans', '922–901', '931–910', '931–909', '931–911'),
        k('nadab_jer', 'Nadab', '2 ans', '901–900', '910–909', '909–908', '911–910'),
        k('baasha', 'Baasha', '24 ans', '900–877', '909–886', '908–885', '910–887'),
        k('elah_israel', 'Éla', '2 ans', '877–876', '886–885', '885–884', '887–886'),
        k('zimri', 'Zimri', '7 jours', '876', '885', '884', '886'),
        k('omri', 'Omri', '12 ans', '876–869', '885–874', '884–873', '886–875'),
        k('achab', 'Achab', '22 ans', '869–850', '874–853', '873–852', '875–853'),
        k('achazia_israel', 'Achazia', '2 ans', '850–849', '853–852', '852–851', '853–852'),
        k('joram_israel', 'Joram', '12 ans', '849–842', '852–841', '851–842', '852–841'),
        k('jehu', 'Jéhu', '28 ans', '842–815', '841–814', '842–815', '841–814'),
        k('jehoachaz_israel', 'Yehoachaz', '17 ans', '815–801', '814–798', '819–804', '814–806'),
        k('joas_israel', 'Joas', '16 ans', '801–786', '798–782', '805–790', '806–791'),
        k('jeroboam_ii', 'Jéroboam II', '41 ans', '786–746', '782–753', '790–750', '791–750'),
        k(null, 'Zacharie', '6 mois', '746', '753', '750–749', '750'),
        k(null, 'Challoum', '1 mois', '745', '752', '749', '749'),
        k(null, 'Menahem', '10 ans', '745–738', '752–742', '749–738', '749–739'),
        k(null, 'Pekahya', '2 ans', '738–737', '742–740', '738–736', '739–737'),
        k(null, 'Pekah', '20 ans', '737–732', '740–732', '736–732', '737–732'),
        k(null, 'Osée', '9 ans', '732–722', '732–722', '732–722', '732–722')
    ];
    var CHRONOLOGY_SOURCE = 'Durées : 1 et 2 Rois, 2 Chroniques. Dates : tableaux de Wikipédia (Kings of Judah ; Kings of Israel and Judah), d\'après Albright, Thiele, Galil et Kitchen.';

    // --- La datation de la tradition, roi par roi ------------------------------------------------------------------------------------------
    // Le Seder Olam ne donne pas de date par roi : il donne les durées, des synchronismes (« la n-ième année de tel roi ») et quatre totaux que j'ai lus dans
    // le texte (Sefaria, Seder Olam Rabba 15 à 28) :
    //  - Roboam règne 17 ans et Abija 3 : Asa commence la 20e année de Jéroboam (SO 16) ; Asa règne 41 ans ;
    //  - 155 ans de la fondation du Temple (4e année de Salomon, 2928) à la réfection de Joas, en sa 23e année (SO 18) ;
    //  - 218 ans de la réfection de Joas à celle de Josias, en sa 18e année (SO 24) ;
    //  - le premier Temple tient 410 ans (Yoma 9a) : de 2928 à 3338.
    // Les dates additionnent ces durées à partir de la division du royaume (2964). `status` : 'anchor' (ancré par un de ces totaux), 'chain' (déduit en
    // ajoutant les durées), 'approx' (ajusté, à ± quelques années). L'année N de la création est 3761 − N av. J.-C. Les règnes se suivent (la fin de l'un est
    // le début de l'autre), sauf deux chevauchements : les 16 ans de Jotham sont dans les 52 d'Ozias (SO 19 : Jotham juge le peuple pendant la maladie
    // d'Ozias ; seul ce chevauchement rend exact l'écart de 218 ans) ; Josaphat et Joram se chevauchent de 4 ans (le texte dit 7 ans, SO 17, mais 7 ans donneraient 152 ans
    // au lieu de 155 : on retient 4, qui retombe sur les 155 ans, sur la fin en 3338 et sur le tableau de Chabad à un an près).
    var TRAD = {
        rehoboam: [2964, 2981, 'anchor'], abijam: [2981, 2984, 'anchor'], asa_roi: [2984, 3025, 'anchor'], josaphat: [3025, 3050, 'anchor'],
        joram_roi: [3046, 3054, 'approx'], achazia: [3054, 3055, 'approx'], athalie: [3055, 3061, 'approx'], joas: [3061, 3101, 'anchor'],
        amatsia: [3101, 3130, 'chain'], azaria: [3130, 3182, 'chain'], jotham_roi: [3166, 3182, 'approx'], achaz: [3182, 3198, 'chain'],
        ezechias: [3198, 3227, 'chain'], manasse_roi: [3227, 3282, 'chain'], amon_roi: [3282, 3284, 'chain'], josias: [3284, 3315, 'anchor'],
        shallum_josias: [3315, 3315, 'chain'], jehoiakim: [3315, 3326, 'chain'], jeconiah: [3326, 3326, 'chain'], zedekiah: [3326, 3337, 'anchor']
    };
    var TRAD_NOTES = {
        joram_roi: "Le Seder Olam le fait régner dès la 19e année de Josaphat (SO 17) ; les 155 ans de SO 18 n'en laissent que 4 de chevauchement.",
        jotham_roi: "Ses 16 ans sont les derniers des 52 d'Ozias (SO 19).",
        shallum_josias: "Trois mois (2 Rois 23:31).", jeconiah: "Trois mois et dix jours (2 Chroniques 36:9).",
        zedekiah: "Sa 11e année s'achève avec la destruction du Temple, en 3338 (les deux règnes de trois mois font l'écart d'un an)."
    };
    // Les rois d'Israël : les Rois donnent à chacun l'année du roi de Juda où il commence. Pour ceux qui commencent sous Asa, Josaphat et Joas (dont la date est
    // ancrée), on en tire l'année de la création ; au-delà, les synchronismes se contredisent (Zacharie, Challoum, Menahem, Pekahya et Pekah sont rattachés aux
    // années d'Ozias, dont Jéroboam II enterre trois successeurs, SO 19) : on donne seulement le synchronisme.
    var ISRAEL_SYNC = {
        jeroboam: { of: null, year: 1, ref: '1 Rois 12 : à la division du royaume' },
        nadab_jer: { of: 'asa_roi', year: 2, ref: '1 Rois 15:25' }, baasha: { of: 'asa_roi', year: 3, ref: '1 Rois 15:33' },
        elah_israel: { of: 'asa_roi', year: 26, ref: '1 Rois 16:8' }, zimri: { of: 'asa_roi', year: 27, ref: '1 Rois 16:15' },
        omri: { of: 'asa_roi', year: 31, ref: '1 Rois 16:23' }, achab: { of: 'asa_roi', year: 38, ref: '1 Rois 16:29' },
        achazia_israel: { of: 'josaphat', year: 17, ref: '1 Rois 22:52' }, joram_israel: { of: 'josaphat', year: 18, ref: '2 Rois 3:1' },
        jehu: { of: 'joas', year: -5, ref: '2 Rois 12:2 (Joas commence la 7e année de Jéhu)' },
        jehoachaz_israel: { of: 'joas', year: 23, ref: '2 Rois 13:1' }, joas_israel: { of: 'joas', year: 37, ref: '2 Rois 13:10' },
        jeroboam_ii: { of: 'amatsia', year: 15, ref: '2 Rois 14:23' },
        zacharie: { of: 'azaria', year: 38, ref: '2 Rois 15:8', only: true }, challoum: { of: 'azaria', year: 39, ref: '2 Rois 15:13', only: true },
        menahem: { of: 'azaria', year: 39, ref: '2 Rois 15:17', only: true }, pekahya: { of: 'azaria', year: 50, ref: '2 Rois 15:23', only: true },
        pekah: { of: 'azaria', year: 52, ref: '2 Rois 15:27', only: true }, osee: { of: 'achaz', year: 12, ref: '2 Rois 17:1', only: true }
    };
    var ISRAEL_ID_BY_NAME = { 'Zacharie': 'zacharie', 'Challoum': 'challoum', 'Menahem': 'menahem', 'Pekahya': 'pekahya', 'Pekah': 'pekah', 'Osée': 'osee' };
    function syncKey(king) { return king.id || ISRAEL_ID_BY_NAME[king.fr] || null; }
    function judahStart(id) { return TRAD[id] ? TRAD[id][0] : null; }
    // Les dates de la tradition d'un roi : { start, end (années de la création), startBce, endBce, status, note } ou, pour un roi d'Israël,
    // { start, sync: { of, year, ref } } quand le synchronisme permet de dater, ou seulement { sync }.
    function traditional(king) {
        var t = king.id && TRAD[king.id];
        if (t) {
            return { start: t[0], end: t[1], startBce: bce(t[0]), endBce: bce(t[1]), status: t[2], note: TRAD_NOTES[king.id] || '' };
        }
        var key = syncKey(king), sy = key && ISRAEL_SYNC[key];
        if (!sy) return null;
        if (sy.of === null) return { start: 2964, startBce: bce(2964), status: 'anchor', sync: sy };
        if (sy.only) return { sync: sy, status: 'sync' };
        var base = judahStart(sy.of);
        var start = base + sy.year - 1;
        return { start: start, startBce: bce(start), status: 'chain', sync: sy };
    }
    var TRADITION_METHOD = "Datation du Seder Olam, en années depuis la création (AM) ; l'année N correspond à 3761 − N av. J.-C. Le Seder Olam ne donne pas de date par roi : il donne des durées, des synchronismes et quatre totaux (Asa commence la 20e année de Jéroboam, SO 16 ; 155 ans de la fondation du Temple à la réfection de Joas, SO 18 ; 218 ans de celle-ci à celle de Josias, SO 24 ; 410 ans de Temple, soit jusqu'en 3338, Yoma 9a). Ces dates les additionnent. ✓ : ancré par un de ces totaux ; ≈ : ajusté ; sans signe : déduit en ajoutant les durées. Ozias et Jotham : les 16 ans de Jotham sont dans les 52 d'Ozias (SO 19). Josaphat, Joram, Achazia et Athalie : le texte parle de 7 ans de chevauchement (SO 17) mais les 155 ans n'en laissent que 4 ; ces trois règnes sont donc à quelques années près. Un an d'écart est possible partout (comptage des années d'avènement) : le tableau de Chabad donne par exemple 3199 pour Ézéchias, ici 3198. Pour Israël, les Rois donnent seulement l'année du roi de Juda où chacun commence : on en tire la date quand elle est sûre, et le synchronisme sinon.";

    // --- Les repères des deux datations ---------------------------------------------------------------------------------------
    // La tradition rabbinique (Seder Olam) compte les années depuis la création, et place l'an 1 en 3761 av. J.-C. : l'année N de la création est donc
    // 3761 − N av. J.-C. (le début de l'année, à Tichri). Les historiens datent d'après les sources assyriennes et babyloniennes.
    var CREATION_OFFSET = 3761;
    function bce(am) { return CREATION_OFFSET - am; }
    var ANCHORS = [
        { id: 'exodus', am: 2448, historians: 'XIIIe siècle av. J.-C. (très discuté)', ref: 'Seder Olam' },
        { id: 'david', am: 2884, historians: 'vers 1010 av. J.-C.', ref: '2 Samuel 5:4' },
        { id: 'temple', am: 2928, historians: 'vers 966 av. J.-C.', ref: '1 Rois 6:1 ; Seder Olam 15' },
        { id: 'division', am: 2964, historians: '931 av. J.-C.', ref: '1 Rois 11:42' },
        { id: 'destruction', am: 3338, historians: '586 av. J.-C.', ref: '2 Rois 25:8-9 ; Seder Olam 28' }
    ];
    // Le Seder Olam fixe ces années, mais pas chaque roi : il traite les règnes qui se chevauchent cas par cas (par exemple Ozias et Jotham, Seder Olam 19).

    function dateOf(king, scholar) { return king.dates[scholar] || king.dates.thiele; }
    function anchorBce(a) { return bce(a.am); }

    return { PROPHETS48: PROPHETS48, PROPHETS48_SOURCE: PROPHETS48_SOURCE, SCHOLARS: SCHOLARS, SCHOLAR_NAMES: SCHOLAR_NAMES, JUDAH: JUDAH, ISRAEL: ISRAEL,
        CHRONOLOGY_SOURCE: CHRONOLOGY_SOURCE, TRAD: TRAD, TRAD_NOTES: TRAD_NOTES, ISRAEL_SYNC: ISRAEL_SYNC, TRADITION_METHOD: TRADITION_METHOD, traditional: traditional, ANCHORS: ANCHORS, CREATION_OFFSET: CREATION_OFFSET, bce: bce, dateOf: dateOf, anchorBce: anchorBce };
}));
