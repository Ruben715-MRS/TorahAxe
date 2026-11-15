// =========================================================================
// === LA CHAÎNE DE TRANSMISSION — PIRKÉ AVOT (DONNÉES ET RÈGLES, outil de la boîte à outils) ===
// =========================================================================
// Qui a reçu la Torah de qui : de Moïse aux maîtres cités dans le traité Pirké Avot. Ce n'est PAS un arbre (contrairement à js/genealogyCore.js) :
// un maître a souvent plusieurs élèves, et un élève plusieurs maîtres (Rabbi Meïr : Rabbi Akiva et Elisha ben Abouya). C'est un graphe orienté
// « maître → élève », rangé par rangs de transmission (le rang d'un élève est toujours plus bas que celui de ses maîtres).
// Pur, sans DOM : testé dans tests/transmissionCore.test.js.
//
// Un maître : { id, fr, he (sans voyelles), grp ('sinai' | 'zougot' | 'tannaim' | 'amoraim_israel' | 'amoraim_babylonie' | 'gueonim' | 'richonim' | 'aharonim'), row (rang), role ('nassi' | 'avbeitdin' | null), avot (référence
//   dans Pirké Avot, texte libre, ou null si le maître n'y est pas cité), dict (nom français de sa fiche du dictionnaire araméen, ou null),
//   group (true pour un ensemble : les Anciens, les Prophètes, la Grande Assemblée), more (true pour un maître ajouté au-delà de Pirké Avot : les autres
//   tannaïm de la Michna ; le mode « Pirké Avot » de l'écran les masque) }.
// Un lien : { from, to, kind, src, doubt } — kind : 'maitre' (a reçu de lui), 'second' (second maître), 'pere' (son père, qui fut aussi son maître),
//   'beaupere' (son beau-père, qui fut aussi son maître), 'famille' (descendant et héritier de la fonction) ; src : la source en texte libre ; doubt : vrai quand le lien est discuté ou connu par la seule tradition tardive.
//
// Le contenu est écrit à la main d'après le texte de Pirké Avot (1:1 à 2:8 : la chaîne y est dite en toutes lettres : « X a reçu de Y »),
// la Michna Haguiga 2:2 (qui était Nassi et Av Beth Din dans chaque paire), le Talmud (Yévamot 62b, Haguiga 15a, Souka 28a, Sanhédrin 68a) et la
// tradition (Séder haDorot, Séfer Yo'hassin). Les liens que le texte d'Avot ne dit pas sont signalés par `src` ; ceux de la seule tradition tardive
// portent `doubt`. À relire par une personne compétente.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./hassidoutData.js'), require('./transmissionMedievalData.js'));
    else root.TransmissionCore = factory(root.HassidoutData || null, root.TransmissionMedievalData || null);
}(typeof self !== 'undefined' ? self : this, function (HD, MD) {
    'use strict';

    var SAGES = [];
    var BY = {};
    var EDGES = [];

    // Les courants de la Hassidout, dans l'ordre de l'affichage : une clé (pour la couleur) et le nom du courant tel qu'il figure dans les données.
    var HASS_COURANTS = [{ key: 'baal', label: 'Premier cercle du Baal Shem Tov' },{ key: 'mezeritch', label: 'Mezeritch (le Maggid)' },{ key: 'breslev', label: 'Breslev' },{ key: 'karlin', label: 'Karlin' },{ key: 'pshischa', label: 'Pshischa' },{ key: 'lublin', label: 'Lublin (le Voyant)' },{ key: 'kotzk', label: 'Kotzk' },{ key: 'ruzhin', label: 'Ruzhin' },{ key: 'ger', label: 'Ger' },{ key: 'habad', label: 'Habad' },{ key: 'belz', label: 'Belz' },{ key: 'satmar', label: 'Satmar' },{ key: 'sanz', label: 'Sanz' },{ key: 'sighet', label: 'Sighet' },{ key: 'spinka', label: 'Spinka' },{ key: 'vizhnitz', label: 'Vizhnitz' }];
    var HASS_KEYS = {'Premier cercle du Baal Shem Tov': 'baal','Mezeritch (le Maggid)': 'mezeritch','Breslev': 'breslev','Karlin': 'karlin','Pshischa': 'pshischa','Lublin (le Voyant)': 'lublin','Kotzk': 'kotzk','Ruzhin': 'ruzhin','Ger': 'ger','Habad': 'habad','Belz': 'belz','Satmar': 'satmar','Sanz': 'sanz','Sighet': 'sighet','Spinka': 'spinka','Vizhnitz': 'vizhnitz'};
    function s(id, fr, he, grp, row, o) {
        var opts = o || {};
        var p = { id: id, fr: fr, he: he, grp: grp, row: row, role: opts.role || null, avot: opts.avot || null, dict: opts.dict || null, group: !!opts.group, more: !!opts.more };
        SAGES.push(p);
        BY[id] = p;
        return p;
    }
    function e(from, to, kind, src, doubt) { EDGES.push({ from: from, to: to, kind: kind, src: src || '', doubt: !!doubt }); }

    // --- De Moïse à la Grande Assemblée (Avot 1:1) -------------------------------------------------------
    s('moche', 'Moïse', 'משה', 'sinai', 0, { avot: '1:1' });
    s('josue', 'Josué', 'יהושע', 'sinai', 1, { avot: '1:1' });
    s('anciens', 'Les Anciens', 'הזקנים', 'sinai', 2, { avot: '1:1', group: true });
    s('prophetes', 'Les Prophètes', 'הנביאים', 'sinai', 3, { avot: '1:1', group: true });
    s('grande_assemblee', 'Les hommes de la Grande Assemblée', 'אנשי כנסת הגדולה', 'sinai', 4, { avot: '1:1', group: true });

    // --- Les Zougot : les « paires » (Michna Haguiga 2:2 : le premier nommé est Nassi, le second Av Beth Din) ------
    s('chimon_tsadik', 'Chimon HaTsadik', 'שמעון הצדיק', 'zougot', 5, { avot: '1:2', dict: 'Chimon HaTsadik' });
    s('antigonos', 'Antigonos de Sokho', 'אנטיגנוס איש סוכו', 'zougot', 6, { avot: '1:3', dict: 'Antigonos de Sokho' });
    s('yossi_yoezer', 'Yossi ben Yoezer', 'יוסי בן יועזר', 'zougot', 7, { avot: '1:4', role: 'nassi', dict: 'Yossi ben Yoezer' });
    s('yossi_yohanan', 'Yossi ben Yohanan', 'יוסי בן יוחנן', 'zougot', 7, { avot: '1:5', role: 'avbeitdin' });
    s('yehoshoua_perahia', 'Yehoshoua ben Perahia', 'יהושע בן פרחיה', 'zougot', 8, { avot: '1:6', role: 'nassi', dict: 'Yehoshoua ben Perahia' });
    s('nittai', 'Nittaï d’Arbel', 'נתאי הארבלי', 'zougot', 8, { avot: '1:7', role: 'avbeitdin', dict: 'Nittaï d’Arbel' });
    s('yehouda_tabai', 'Yehouda ben Tabaï', 'יהודה בן טבאי', 'zougot', 9, { avot: '1:8', role: 'nassi', dict: 'Yehouda ben Tabaï' });
    s('chimon_chetah', 'Chimon ben Chétah', 'שמעון בן שטח', 'zougot', 9, { avot: '1:9', role: 'avbeitdin', dict: 'Chimon ben Chétah' });
    s('chemaya', 'Chémaya', 'שמעיה', 'zougot', 10, { avot: '1:10', role: 'nassi', dict: 'Chémaya' });
    s('avtalyon', 'Avtalyon', 'אבטליון', 'zougot', 10, { avot: '1:11', role: 'avbeitdin', dict: 'Avtalyon' });
    s('hillel', 'Hillel', 'הלל', 'zougot', 11, { avot: '1:12', role: 'nassi', dict: 'Hillel' });
    s('chammai', 'Chammaï', 'שמאי', 'zougot', 11, { avot: '1:15', role: 'avbeitdin', dict: 'Chammaï' });

    // --- Les Tannaïm ---------------------------------------------------------------------------------------
    // Rang 12 : élèves de Hillel et Chammaï, et leurs contemporains.
    s('ben_hehe', 'Ben Hé Hé', 'בן הא הא', 'tannaim', 12, { avot: '5:22' });
    s('ben_bagbag', 'Ben Bag Bag', 'בן בג בג', 'tannaim', 12, { avot: '5:22' });
    s('gamliel_ancien', 'Rabban Gamliel l’Ancien', 'רבן גמליאל הזקן', 'tannaim', 12, { avot: '1:16', role: 'nassi', dict: 'Rabban Gamliel l’Ancien' });
    s('yohanan_zakkai', 'Rabban Yohanan ben Zakkaï', 'רבן יוחנן בן זכאי', 'tannaim', 12, { avot: '2:8', dict: 'Rabban Yohanan ben Zakkaï' });
    s('akavya', 'Akavya ben Mahalalel', 'עקביא בן מהללאל', 'tannaim', 12, { avot: '3:1' });
    s('hanina_segan', 'Rabbi Hanina, adjoint des prêtres', 'רבי חנינא סגן הכהנים', 'tannaim', 12, { avot: '3:2' });
    s('dosa_harkinas', 'Rabbi Dosa ben Harkinas', 'רבי דוסא בן הרכינס', 'tannaim', 12, { avot: '3:10' });
    s('nehounya', 'Rabbi Nehounya ben HaQana', 'רבי נחוניא בן הקנה', 'tannaim', 12, { avot: '3' });
    // Rang 13 : les cinq élèves de Rabban Yohanan ben Zakkaï (Avot 2:8) et leurs contemporains.
    s('chimon_gamliel1', 'Rabban Chimon ben Gamliel (le premier)', 'רבן שמעון בן גמליאל הראשון', 'tannaim', 13, { avot: '1:17', role: 'nassi' });
    s('eliezer_hyrcanus', 'Rabbi Eliezer ben Hyrcanus', 'רבי אליעזר בן הורקנוס', 'tannaim', 13, { avot: '2:10', dict: 'Rabbi Eliezer ben Hyrcanus' });
    s('yehoshoua_hananya', 'Rabbi Yehoshoua ben Hananya', 'רבי יהושע בן חנניה', 'tannaim', 13, { avot: '2:11', dict: 'Rabbi Yehoshua ben Hananya' });
    s('yossi_cohen', 'Rabbi Yossi HaCohen', 'רבי יוסי הכהן', 'tannaim', 13, { avot: '2:12' });
    s('chimon_netanel', 'Rabbi Chimon ben Netanel', 'רבי שמעון בן נתנאל', 'tannaim', 13, { avot: '2:13' });
    s('elazar_arakh', 'Rabbi Elazar ben Arakh', 'רבי אלעזר בן ערך', 'tannaim', 13, { avot: '2:14', dict: 'Rabbi Elazar ben Arakh' });
    s('tarfon', 'Rabbi Tarfon', 'רבי טרפון', 'tannaim', 13, { avot: '2:15', dict: 'Rabbi Tarfon' });
    s('nahoum_gamzou', 'Nahoum Ich Gamzou', 'נחום איש גם זו', 'tannaim', 13, { dict: 'Nahoum Ich Gamzou' });
    // Rang 14 : la génération de Yavné et de Rabbi Akiva.
    s('gamliel_yavne', 'Rabban Gamliel de Yavné', 'רבן גמליאל דיבנה', 'tannaim', 14, { role: 'nassi', dict: 'Rabban Gamliel de Yavné' });
    s('akiva', 'Rabbi Akiva', 'רבי עקיבא', 'tannaim', 14, { avot: '3:13', dict: 'Rabbi Akiva' });
    s('ichmael', 'Rabbi Ichmaël', 'רבי ישמעאל', 'tannaim', 14, { avot: '3:12', dict: 'Rabbi Ichmaël' });
    s('elazar_azarya', 'Rabbi Elazar ben Azaria', 'רבי אלעזר בן עזריה', 'tannaim', 14, { avot: '3:17', role: 'nassi', dict: 'Rabbi Elazar ben Azaria' });
    s('elazar_modai', 'Rabbi Elazar HaModaï', 'רבי אלעזר המודעי', 'tannaim', 14, { avot: '3:11' });
    s('hanania_teradion', 'Rabbi Hanina ben Teradion', 'רבי חנינא בן תרדיון', 'tannaim', 14, { avot: '3:2', dict: 'Rabbi Hanina ben Teradion' });
    s('halafta', 'Rabbi Halafta de Kfar Hananya', 'רבי חלפתא איש כפר חנניה', 'tannaim', 14, { avot: '3' });
    s('yohanan_berokah', 'Rabbi Yohanan ben Berokah', 'רבי יוחנן בן ברוקה', 'tannaim', 14, { avot: '4' });
    s('elisha_abouya', 'Elisha ben Abouya', 'אלישע בן אבויה', 'tannaim', 14, { avot: '4', dict: 'Elisha ben Abouya' });
    s('ben_zoma', 'Ben Zoma', 'בן זומא', 'tannaim', 14, { avot: '4:1', dict: 'Ben Zoma' });
    // Rang 15 : les élèves de Rabbi Akiva.
    s('ben_azzai', 'Ben Azzaï', 'בן עזאי', 'tannaim', 15, { avot: '4:2', dict: 'Ben Azzaï' });
    s('elazar_hisma', 'Rabbi Elazar ben Hisma', 'רבי אלעזר בן חסמא', 'tannaim', 15, { avot: '3:18' });
    s('chimon_gamliel2', 'Rabban Chimon ben Gamliel (le second)', 'רבן שמעון בן גמליאל השני', 'tannaim', 15, { avot: '1:18', role: 'nassi', dict: 'Rabban Chimon ben Gamliel' });
    s('meir', 'Rabbi Meïr', 'רבי מאיר', 'tannaim', 15, { avot: '4', dict: 'Rabbi Meïr' });
    s('yehouda_ilai', 'Rabbi Yehouda bar Ilaï', 'רבי יהודה בר אילעאי', 'tannaim', 15, { avot: '4', dict: 'Rabbi Yehouda bar Ilaï' });
    s('yossi_halafta', 'Rabbi Yossi ben Halafta', 'רבי יוסי בן חלפתא', 'tannaim', 15, { avot: '4', dict: 'Rabbi Yossi ben Halafta' });
    s('chimon_yohai', 'Rabbi Chimon bar Yohaï', 'רבי שמעון בר יוחאי', 'tannaim', 15, { avot: '4', dict: 'Rabbi Chimon bar Yohaï' });
    s('elazar_chamoua', 'Rabbi Elazar ben Chamoua', 'רבי אלעזר בן שמוע', 'tannaim', 15, { avot: '4', dict: 'Rabbi Elazar ben Chamoua' });
    s('ichmael_berokah', 'Rabbi Ichmaël, fils de Rabbi Yohanan ben Berokah', 'רבי ישמעאל בנו של רבי יוחנן בן ברוקה', 'tannaim', 15, { avot: '4' });
    // Rangs 16-17 : la fin de la Michna.
    s('yehouda_nassi', 'Rabbi Yehouda HaNasi', 'רבי יהודה הנשיא', 'tannaim', 16, { avot: '2:1', role: 'nassi', dict: 'Rabbi Yehouda HaNasi' });
    s('gamliel3', 'Rabban Gamliel, fils de Rabbi Yehouda HaNasi', 'רבן גמליאל בנו של רבי יהודה הנשיא', 'tannaim', 17, { avot: '2:2', role: 'nassi' });


    // --- Les autres tannaïm de la Michna (ajout) : `more`. Rangés par génération de tannaïm (rang 12 = génération de Hillel, 13 = Yavné, 14 = Rabbi Akiva,
    // 15 = Ousha, 16 = Rabbi). Un maître sans lien n'a pas de maître que les sources nomment : il est rangé par époque.
    function mo(id, fr, he, row, o) { var q = o || {}; q.more = true; return s(id, fr, he, 'tannaim', row, q); }
    mo('yonatan_ouziel', 'Yonatan ben Ouziel', 'יונתן בן עוזיאל', 12);
    mo('chmouel_qatan', 'Chmouel HaQatan', 'שמואל הקטן', 12, { avot: '4:19' });
    mo('tsadok', 'Rabbi Tsadok', 'רבי צדוק', 12, { avot: '4' });
    mo('baba_buta', 'Baba ben Bouta', 'בבא בן בוטא', 12);
    mo('admon', 'Admon', 'אדמון', 12);
    mo('hanan_mitsri', 'Hanan HaMitsri', 'חנן המצרי', 12);
    mo('hanina_dossa', 'Rabbi Hanina ben Dossa', 'רבי חנינא בן דוסא', 13, { avot: '3:9', dict: 'Rabbi Hanina ben Dossa' });
    mo('yehouda_bathyra', 'Rabbi Yehouda ben Bathyra', 'רבי יהודה בן בתירא', 13);
    mo('zekharia_haqatsav', 'Rabbi Zekharia ben HaQatsav', 'רבי זכריה בן הקצב', 13);
    mo('yossi_galili', 'Rabbi Yossi HaGalili', 'רבי יוסי הגלילי', 14);
    mo('yohanan_nouri', 'Rabbi Yohanan ben Nouri', 'רבי יוחנן בן נורי', 14);
    mo('hanina_hakhinai', 'Rabbi Hanina ben Hakhinaï', 'רבי חנינא בן חכינאי', 14, { avot: '3' });
    mo('chimon_timni', 'Rabbi Chimon HaTimni', 'רבי שמעון התימני', 14);
    mo('hananya_akachya', 'Rabbi Hananya ben Akachya', 'רבי חנניה בן עקשיא', 14);
    mo('yehouda_tema', 'Rabbi Yehouda ben Téma', 'רבי יהודה בן תימא', 14, { avot: '5:20' });
    mo('elazar_bartota', 'Rabbi Elazar de Bartota', 'רבי אלעזר איש ברתותא', 14, { avot: '3:7' });
    mo('yehouda_bava', 'Rabbi Yehouda ben Bava', 'רבי יהודה בן בבא', 14, { dict: 'Rabbi Yehouda ben Bava' });
    mo('yehoshoua_korha', 'Rabbi Yehoshoua ben Korha', 'רבי יהושע בן קרחה', 15);
    mo('nehemia', 'Rabbi Nehemia', 'רבי נחמיה', 15);
    mo('yohanan_sandlar', 'Rabbi Yohanan HaSandlar', 'רבי יוחנן הסנדלר', 15, { avot: '4' });
    mo('nathan_babli', 'Rabbi Nathan HaBabli', 'רבי נתן הבבלי', 15, { role: 'avbeitdin' });
    mo('chimon_elazar', 'Rabbi Chimon ben Elazar', 'רבי שמעון בן אלעזר', 16);
    mo('elazar_chimon', 'Rabbi Elazar ben Chimon', 'רבי אלעזר בן שמעון', 16);
    mo('pinhas_yair', 'Rabbi Pinhas ben Yaïr', 'רבי פנחס בן יאיר', 16);
    mo('ichmael_yossi', 'Rabbi Ichmaël, fils de Rabbi Yossi', 'רבי ישמעאל בר רבי יוסי', 16);
    mo('yossi_yehouda', 'Rabbi Yossi bar Yehouda', 'רבי יוסי בר יהודה', 16, { avot: '4' });
    mo('elazar_kappar', 'Rabbi Elazar HaKappar', 'רבי אלעזר הקפר', 16, { avot: '4' });
    mo('bar_kappara', 'Bar Kappara', 'בר קפרא', 17);

    // --- Les amoraïm principaux (ajout) : ceux de la Guémara, d'Israël (`amoraim_israel`) et de Babylonie (`amoraim_babylonie`). Rang 17 : la première
    // génération, élèves de Rabbi Yehouda HaNasi (Rav, élève aussi de Rabbi Hiyya, est au rang 18) ; chaque génération suivante descend d'un rang. Les maîtres et élèves sont ceux du dictionnaire araméen.
    function am(id, fr, he, grp, row, o) { var q = o || {}; q.more = true; return s(id, fr, he, grp, row, q); }
    mo('hiyya', 'Rabbi Hiyya', 'רבי חייא', 17, { dict: 'Rabbi Hiyya' });
    am('rav', 'Rav', 'רב', 'amoraim_babylonie', 18, { dict: 'Rav' });
    am('chmouel', 'Chmouel', 'שמואל', 'amoraim_babylonie', 17, { dict: 'Chmouel' });
    am('mar_oukba', 'Mar Oukba', 'מר עוקבא', 'amoraim_babylonie', 17, { dict: 'Mar Oukba' });
    am('hanina_hama', 'Rabbi Hanina bar Hama', 'רבי חנינא בר חמא', 'amoraim_israel', 17, { dict: 'Rabbi Hanina bar Hama' });
    am('yannai', 'Rabbi Yannaï', 'רבי ינאי', 'amoraim_israel', 17, { dict: 'Rabbi Yannaï' });
    am('yohanan', 'Rabbi Yohanan', 'רבי יוחנן', 'amoraim_israel', 18, { dict: 'Rabbi Yohanan' });
    am('yehoshoua_levi', 'Rabbi Yehoshoua ben Lévi', 'רבי יהושע בן לוי', 'amoraim_israel', 18, { dict: 'Rabbi Yehoshua ben Levi' });
    am('simlai', 'Rabbi Simlaï', 'רבי שמלאי', 'amoraim_israel', 18, { dict: 'Rabbi Simlaï' });
    am('rav_houna', 'Rav Houna', 'רב הונא', 'amoraim_babylonie', 19, { dict: 'Rav Houna' });
    am('rav_yehouda', 'Rav Yehouda', 'רב יהודה', 'amoraim_babylonie', 19, { dict: 'Rav Yehouda' });
    am('rav_hisda', 'Rav Hisda', 'רב חסדא', 'amoraim_babylonie', 19, { dict: 'Rav Hisda' });
    am('rav_chechet', 'Rav Chéchet', 'רב ששת', 'amoraim_babylonie', 19, { dict: 'Rav Chéchet' });
    am('rav_nahman', 'Rav Nahman', 'רב נחמן', 'amoraim_babylonie', 18, { dict: 'Rav Nahman' });
    am('rech_lakich', 'Rech Lakich', 'ריש לקיש', 'amoraim_israel', 19, { dict: 'Rech Lakich' });
    am('elazar_pedat', 'Rabbi Elazar ben Pedat', 'רבי אלעזר בן פדת', 'amoraim_israel', 19, { dict: 'Rabbi Elazar ben Pedat' });
    am('ami', 'Rabbi Ami', 'רבי אמי', 'amoraim_israel', 19, { dict: 'Rabbi Ami' });
    am('assi', 'Rabbi Assi', 'רבי אסי', 'amoraim_israel', 19, { dict: 'Rabbi Assi' });
    am('abahou', 'Rabbi Abahou', 'רבי אבהו', 'amoraim_israel', 19, { dict: 'Rabbi Abahou' });
    am('rabba', 'Rabba', 'רבה', 'amoraim_babylonie', 20, { dict: 'Rabba' });
    am('rav_yossef', 'Rav Yossef', 'רב יוסף', 'amoraim_babylonie', 20, { dict: 'Rav Yossef' });
    am('zeira', 'Rabbi Zeira', 'רבי זירא', 'amoraim_israel', 20, { dict: 'Rabbi Zeira' });
    am('yirmiya', 'Rabbi Yirmiya', 'רבי ירמיה', 'amoraim_israel', 20, { dict: 'Rabbi Yirmiya' });
    am('abaye', 'Abayé', 'אביי', 'amoraim_babylonie', 21, { dict: 'Abayé' });
    am('rava', 'Rava', 'רבא', 'amoraim_babylonie', 21, { dict: 'Rava' });
    am('rav_papa', 'Rav Papa', 'רב פפא', 'amoraim_babylonie', 22, { dict: 'Rav Papa' });
    am('rav_achi', 'Rav Achi', 'רב אשי', 'amoraim_babylonie', 23, { dict: 'Rav Achi' });
    am('ravina', 'Ravina', 'רבינא', 'amoraim_babylonie', 23, { dict: 'Ravina' });

    // --- Les liens maître → élève --------------------------------------------------------------------------
    // Avot 1:1 : la chaîne dite en toutes lettres.
    e('moche', 'josue', 'maitre', 'Avot 1:1');
    e('josue', 'anciens', 'maitre', 'Avot 1:1');
    e('anciens', 'prophetes', 'maitre', 'Avot 1:1');
    e('prophetes', 'grande_assemblee', 'maitre', 'Avot 1:1');
    e('grande_assemblee', 'chimon_tsadik', 'maitre', 'Avot 1:2 : « l’un des restes de la Grande Assemblée »');
    // Avot 1:3 à 1:12 : « X a reçu de Y ».
    e('chimon_tsadik', 'antigonos', 'maitre', 'Avot 1:3');
    e('antigonos', 'yossi_yoezer', 'maitre', 'Avot 1:4');
    e('antigonos', 'yossi_yohanan', 'maitre', 'Avot 1:4');
    e('yossi_yoezer', 'yehoshoua_perahia', 'maitre', 'Avot 1:6');
    e('yossi_yohanan', 'yehoshoua_perahia', 'maitre', 'Avot 1:6');
    e('yossi_yoezer', 'nittai', 'maitre', 'Avot 1:6');
    e('yossi_yohanan', 'nittai', 'maitre', 'Avot 1:6');
    e('yehoshoua_perahia', 'yehouda_tabai', 'maitre', 'Avot 1:8');
    e('nittai', 'yehouda_tabai', 'maitre', 'Avot 1:8');
    e('yehoshoua_perahia', 'chimon_chetah', 'maitre', 'Avot 1:8');
    e('nittai', 'chimon_chetah', 'maitre', 'Avot 1:8');
    e('yehouda_tabai', 'chemaya', 'maitre', 'Avot 1:10');
    e('chimon_chetah', 'chemaya', 'maitre', 'Avot 1:10');
    e('yehouda_tabai', 'avtalyon', 'maitre', 'Avot 1:10');
    e('chimon_chetah', 'avtalyon', 'maitre', 'Avot 1:10');
    e('chemaya', 'hillel', 'maitre', 'Avot 1:12');
    e('avtalyon', 'hillel', 'maitre', 'Avot 1:12');
    e('chemaya', 'chammai', 'maitre', 'Avot 1:12');
    e('avtalyon', 'chammai', 'maitre', 'Avot 1:12');
    // Rabban Yohanan ben Zakkaï et ses cinq élèves (Avot 2:8).
    e('hillel', 'yohanan_zakkai', 'maitre', 'Avot 2:8 ; Souka 28a');
    e('chammai', 'yohanan_zakkai', 'maitre', 'Avot 2:8');
    ['eliezer_hyrcanus', 'yehoshoua_hananya', 'yossi_cohen', 'chimon_netanel', 'elazar_arakh'].forEach(function (id) {
        e('yohanan_zakkai', id, 'maitre', 'Avot 2:8');
    });
    // La famille des Nassi (Avot 1:16, 1:17, 1:18, 2:1, 2:2).
    e('hillel', 'gamliel_ancien', 'famille', 'Tradition : Rabban Gamliel l’Ancien descend de Hillel', true);
    e('gamliel_ancien', 'chimon_gamliel1', 'pere', 'Avot 1:17 : « Chimon, son fils »');
    e('chimon_gamliel1', 'gamliel_yavne', 'pere', 'Tradition (Séder haDorot)');
    e('gamliel_yavne', 'chimon_gamliel2', 'pere', 'Tradition (Séder haDorot)');
    e('chimon_gamliel2', 'yehouda_nassi', 'pere', 'Avot 1:18 et 2:1');
    e('yehouda_nassi', 'gamliel3', 'pere', 'Avot 2:2 : « Rabban Gamliel, fils de Rabbi Yehouda HaNasi »');
    // Les élèves de Hillel (Souka 28a : quatre-vingts élèves) : les deux convertis ou élèves cités à la fin d’Avot.
    e('hillel', 'ben_bagbag', 'maitre', 'Haguiga 9b : Ben Bag Bag, élève de Hillel (selon certains, Hillel lui-même)', true);
    e('hillel', 'ben_hehe', 'maitre', 'Haguiga 9b : Ben Hé Hé s’entretient avec Hillel', true);
    // La génération de Rabbi Akiva.
    e('eliezer_hyrcanus', 'akiva', 'maitre', 'Sanhédrin 68a ; Avot de-Rabbi Natan 6');
    e('yehoshoua_hananya', 'akiva', 'maitre', 'Tradition (Séder haDorot)');
    e('nahoum_gamzou', 'akiva', 'maitre', 'Tradition (Haguiga 12a ; Séder haDorot)');
    e('nehounya', 'ichmael', 'maitre', 'Tradition (Séder haDorot)', true);
    e('yehoshoua_hananya', 'ben_zoma', 'maitre', 'Haguiga 15a');
    e('akiva', 'ben_azzai', 'maitre', 'Tradition (Séder haDorot)');
    e('yohanan_berokah', 'ichmael_berokah', 'pere', 'Avot 4 : « Rabbi Ichmaël, son fils »');
    // Les cinq élèves de Rabbi Akiva (Yévamot 62b) et Elisha ben Abouya.
    ['meir', 'yehouda_ilai', 'yossi_halafta', 'chimon_yohai', 'elazar_chamoua'].forEach(function (id) {
        e('akiva', id, 'maitre', 'Yévamot 62b');
    });
    e('elisha_abouya', 'meir', 'second', 'Haguiga 15a');
    e('tarfon', 'yehouda_ilai', 'second', 'Tradition (Séder haDorot)');
    // Rabbi Yehouda HaNasi, élève de son père et de Rabbi Yehouda bar Ilaï.
    e('yehouda_ilai', 'yehouda_nassi', 'second', 'Tradition (Séder haDorot)');


    // --- Liens des autres tannaïm de la Michna ---------------------------------------------------------------
    e('hillel', 'yonatan_ouziel', 'maitre', 'Souka 28a : le plus grand des quatre-vingts élèves de Hillel');
    e('hillel', 'chmouel_qatan', 'maitre', 'Tradition (Séder haDorot)', true);
    e('chammai', 'baba_buta', 'maitre', 'Beitsa 20a : Baba ben Bouta, élève de Chammaï');
    e('yohanan_zakkai', 'hanina_dossa', 'maitre', 'Berakhot 34b');
    e('akiva', 'nehemia', 'maitre', 'Tradition (Séder haDorot)');
    e('akiva', 'yohanan_sandlar', 'maitre', 'Tradition (Séder haDorot)', true);
    e('meir', 'chimon_elazar', 'maitre', 'Tradition (Séder haDorot)');
    e('chimon_yohai', 'elazar_chimon', 'pere', 'Bava Metsia 84b');
    e('chimon_yohai', 'pinhas_yair', 'beaupere', 'Méïla 17b : son gendre');
    e('yossi_halafta', 'ichmael_yossi', 'pere', 'Michna ; Séder haDorot');
    e('yehouda_ilai', 'yossi_yehouda', 'pere', 'Michna ; Séder haDorot');
    e('elazar_kappar', 'bar_kappara', 'pere', 'Tradition (Séder haDorot)');

    // --- Liens des amoraïm (les liens de la Michna au Talmud : élèves de Rabbi Yehouda HaNasi, puis de génération en génération) -----------------
    var AM = 'Tradition (Séder haDorot)';
    e('yehouda_nassi', 'hiyya', 'maitre', AM);
    e('yehouda_nassi', 'rav', 'maitre', AM);
    e('hiyya', 'rav', 'second', AM + ' : son oncle et son maître');
    e('yehouda_nassi', 'hanina_hama', 'maitre', AM);
    e('yehouda_nassi', 'yannai', 'maitre', AM);
    e('bar_kappara', 'yehoshoua_levi', 'maitre', AM, true);
    e('hanina_hama', 'yohanan', 'maitre', AM);
    e('yannai', 'yohanan', 'maitre', AM);
    e('yohanan', 'rech_lakich', 'maitre', 'Bava Metsia 84a');
    ['elazar_pedat', 'ami', 'assi', 'abahou', 'zeira'].forEach(function (id) { e('yohanan', id, 'maitre', AM); });
    e('elazar_pedat', 'zeira', 'second', AM);
    e('chmouel', 'rav_yehouda', 'second', AM);
    e('rav', 'rav_yehouda', 'maitre', AM);
    e('rav_yehouda', 'zeira', 'second', AM);
    e('rav', 'rav_houna', 'maitre', AM);
    e('rav', 'rav_hisda', 'maitre', AM);
    e('chmouel', 'rav_nahman', 'maitre', AM);
    e('rav_houna', 'rabba', 'maitre', AM);
    e('rav_yehouda', 'rabba', 'maitre', AM);
    e('rav_yehouda', 'rav_yossef', 'maitre', AM);
    e('rabba', 'abaye', 'maitre', AM);
    e('rav_yossef', 'abaye', 'maitre', AM);
    e('rav_nahman', 'rava', 'maitre', AM);
    e('rav_yossef', 'rava', 'maitre', AM);
    e('abaye', 'rav_papa', 'maitre', AM);
    e('rava', 'rav_papa', 'maitre', AM);
    e('rav_papa', 'rav_achi', 'maitre', 'Rav Achi et Rav Papa sont de la même génération d’amoraïm : pas de lien de maître à élève linéaire, la transmission passe par les académies de Babylonie', true);
    e('rava', 'ravina', 'maitre', 'Plusieurs maîtres portent le nom de Ravina ; celui de la rédaction finale, avec Rav Achi, n’est pas élève direct de Rava', true);

    // --- Après la Guémara : savoraïm, guéonim, richonim, 'aharonim (js/transmissionMedievalData.js) ---------------------------------
    // Rang : donné par les données (24 et au-delà) ; `med` vrai, `more` vrai (hors Pirké Avot et hors Michna), dates, lieu et œuvres dans la fiche.
    if (MD && MD.PEOPLE) {
        MD.PEOPLE.forEach(function (q) {
            var p = s(q.id, q.fr, q.he, q.grp, q.row, { more: true, group: q.group });
            p.med = true;
            p.born = q.born;
            p.died = q.died;
            p.approx = q.approx;
            p.place = q.place;
            p.works = q.works;
            p.note = q.note;
        });
        MD.EDGES.forEach(function (x) { e(x[0], x[1], x[2], x[3], x[4]); });
    }

    // --- La hassidout (js/hassidoutData.js, généré depuis scripts/hassidout) --------------------------------
    // Personnes hors Pirké Avot et hors Guémara : `hass` vrai, grp « hassidout », courant précis (Habad, Breslev, Ger…), conjoint et statut.
    // Les successions (père → fils, rebbe → successeur) sont des liens `succession`, tracés autrement que les liens maître → élève.
    // Le rang d'une personne = 23 + la profondeur de son plus long chemin d'ascendance (les amoraïm s'arrêtent au rang 22).
    if (HD && HD.PEOPLE) {
        var HASS_BASE = 23;
        var parentsOf = {};
        HD.PEOPLE.forEach(function (q) { parentsOf[q.id] = q.maitres.concat(q.succession ? [q.succession] : []); });
        var depth = {};
        function hdepth(id) {
            if (depth[id] !== undefined) return depth[id];
            var ps = parentsOf[id] || [];
            depth[id] = ps.length ? 1 + Math.max.apply(null, ps.map(hdepth)) : 0;
            return depth[id];
        }
        HD.PEOPLE.forEach(function (q) {
            var p = s(q.id, q.fr, q.he, 'hassidout', HASS_BASE + hdepth(q.id), { more: true });
            p.hass = true;
            p.courant = q.courant;
            p.ckey = HASS_KEYS[q.courant] || 'autre';
            p.naissance = q.naissance;
            p.deces = q.deces;
            p.statut = q.statut;
            p.conjoint = q.conjoint;
            p.sources = q.sources;
        });
        HD.EDGES.forEach(function (x) {
            e(x.from, x.to, x.kind, x.kind === 'succession' ? 'Succession (voir la fiche de la personne)' : 'Maître (voir la fiche de la personne)', x.doubt);
        });
    }

    // --- Accès ---------------------------------------------------------------------------------------------
    function byId(id) { return BY[id] || null; }
    function mastersOf(id) { return EDGES.filter(function (x) { return x.to === id; }); }
    function studentsOf(id) { return EDGES.filter(function (x) { return x.from === id; }); }

    // Tous les maîtres en amont (jusqu'à Moïse), du plus proche au plus lointain, sans doublon.
    function ancestorsOf(id) {
        var seen = {}, out = [], queue = [id];
        while (queue.length) {
            var cur = queue.shift();
            mastersOf(cur).forEach(function (x) { if (!seen[x.from]) { seen[x.from] = true; out.push(x.from); queue.push(x.from); } });
        }
        return out;
    }
    // Tous les élèves en aval, sans doublon.
    function descendantsOf(id) {
        var seen = {}, out = [], queue = [id];
        while (queue.length) {
            var cur = queue.shift();
            studentsOf(cur).forEach(function (x) { if (!seen[x.to]) { seen[x.to] = true; out.push(x.to); queue.push(x.to); } });
        }
        return out;
    }
    // La chaîne qui mène de Moïse à un maître : ses ancêtres, lui, et les liens entre eux (pour la mettre en valeur).
    function chainTo(id) {
        var ids = ancestorsOf(id);
        ids.unshift(id);
        var set = {};
        ids.forEach(function (i) { set[i] = true; });
        return { ids: ids, edges: EDGES.filter(function (x) { return set[x.from] && set[x.to]; }) };
    }

    function normalize(text) {
        return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`ʿʻ-]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    // Recherche par nom français (sans accents ni apostrophes) ou hébreu (sans voyelles).
    function search(text, limit) {
        var q = normalize(text);
        if (!q) return [];
        var out = SAGES.filter(function (p) { return normalize(p.fr).indexOf(q) !== -1 || p.he.indexOf(String(text).trim()) !== -1; });
        return limit ? out.slice(0, limit) : out;
    }

    // --- Mise en page ---------------------------------------------------------------------------------------
    // Un rang par ligne ; dans un rang, l'ordre limite les croisements (le barycentre de la position des maîtres, en descendant, puis des élèves,
    // en remontant, trois fois). Un rang de plus de `maxPerLine` cartes se range sur plusieurs lignes égales, l'une sous l'autre.
    // Rend, pour chaque maître, la position de sa carte (left, top) ; `edges` ne garde que les liens entre maîtres affichés.
    // opts : { cardWidth, gap, rowGap, rowHeight (rang → hauteur), maxPerLine (0 : une seule ligne par rang), only (maître → vrai s'il est affiché) }.
    function layout(opts) {
        var o = opts || {};
        var cardW = o.cardWidth || 132, gap = o.gap || 14, rowGap = o.rowGap || 46;
        var rowHeight = o.rowHeight || function () { return 56; };
        var maxPerLine = o.maxPerLine || 0;
        var shown = SAGES.filter(function (p) { return !o.only || o.only(p); });
        var visible = {};
        shown.forEach(function (p) { visible[p.id] = true; });
        var edges = EDGES.filter(function (x) { return visible[x.from] && visible[x.to]; });
        function mastersIn(id) { return edges.filter(function (x) { return x.to === id; }); }
        function studentsIn(id) { return edges.filter(function (x) { return x.from === id; }); }
        var rows = [];
        shown.forEach(function (p) { (rows[p.row] = rows[p.row] || []).push(p.id); });
        for (var r0 = 0; r0 < rows.length; r0++) rows[r0] = rows[r0] || [];
        var pos = {};
        rows.forEach(function (r) { r.forEach(function (id, i) { pos[id] = i; }); });
        function bary(id, getEdges, key) {
            var ps = getEdges(id).map(function (x) { return pos[x[key]]; });
            return ps.length ? ps.reduce(function (a, b) { return a + b; }, 0) / ps.length : null;
        }
        function sweep(order, getEdges, key) {
            order.forEach(function (r) {
                var keyed = r.map(function (id, i) { var b = bary(id, getEdges, key); return { id: id, b: b === null ? i : b, i: i }; });
                keyed.sort(function (a, b) { return a.b - b.b || a.i - b.i; });
                keyed.forEach(function (k, i) { pos[k.id] = i; });
                r.length = 0;
                keyed.forEach(function (k) { r.push(k.id); });
            });
        }
        for (var it = 0; it < 3; it++) {
            sweep(rows.slice(1), mastersIn, 'from');
            sweep(rows.slice(0, -1).reverse(), studentsIn, 'to');
        }
        var step = cardW + gap;
        var lines = [];   // chaque ligne : { row, ids }
        rows.forEach(function (r, ri) {
            if (!r.length) return;
            var n = maxPerLine && r.length > maxPerLine ? Math.ceil(r.length / maxPerLine) : 1;
            var size = Math.ceil(r.length / n);
            for (var k = 0; k < n; k++) lines.push({ row: ri, ids: r.slice(k * size, (k + 1) * size) });
        });
        var width = 0;
        lines.forEach(function (l) { width = Math.max(width, l.ids.length * step - gap); });
        var nodes = {}, y = 0;
        lines.forEach(function (l, li) {
            var h = rowHeight(l.row);
            var left = (width - (l.ids.length * step - gap)) / 2;
            l.ids.forEach(function (id, i) { nodes[id] = { row: l.row, line: li, cx: left + i * step + cardW / 2, left: left + i * step, top: y, h: h }; });
            y += h + rowGap;
        });
        return { nodes: nodes, lines: lines, width: width, height: Math.max(0, y - rowGap), edges: edges };
    }

    return {
        HASS_COURANTS: HASS_COURANTS,
        SAGES: SAGES, EDGES: EDGES, byId: byId, mastersOf: mastersOf, studentsOf: studentsOf,
        ancestorsOf: ancestorsOf, descendantsOf: descendantsOf, chainTo: chainTo, search: search, layout: layout
    };
}));
