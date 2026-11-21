// Profil de l'utilisateur : homme / femme. Le rite (séfarade, ashkénaze, 'Habad) reste dans js/app/settings.js (riteFull).
// Pur : testable sous `npm test`. Ne touche ni au stockage ni à la page.
//
// Le livre (data/siddur/) note les variantes de la femme dans le texte même : « האשה אומרת: מודָה », « האיש מברך », « האשה מברכת ללא שם ומלכות »…
// Ce module les lit et rend, pour un profil, le texte qui le concerne seul. Sans profil (genre inconnu : on a passé l'accueil), rien ne change : le livre s'affiche tel qu'il est écrit.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ProfileCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    var GENDERS = ['m', 'f'];

    // Accepte n'importe quoi (valeur abîmée, inconnue) : 'm', 'f', ou null (pas de choix).
    function normalizeGender(v) { return GENDERS.indexOf(v) >= 0 ? v : null; }

    // La consigne « La femme dit … » en fin de segment : « … שֶׁלֹּא עָשַׂנִי גּוֹי: <small>האשה אומרת: <b>גּוֹיה</b></small> ».
    var SUFFIX_VARIANT = /(\S+?)(:?)\s*<small>האשה אומרת:\s*(?:<b>)?([^<]+?)(?:<\/b>)?<\/small>\s*$/;
    // « <b>מוֹדֶה אֲנִי</b> <small>האשה אומרת: מודָה</small> … » : le mot du livre est remplacé au féminin.
    var MODEH_ANI = /<b>מוֹדֶה אֲנִי<\/b>\s*<small>האשה אומרת:[^<]*<\/small>/;
    var ANY_VARIANT = /\s*<small>האשה אומרת:[^<]*(?:<b>[^<]*<\/b>)?[^<]*<\/small>/g;

    // Les consignes qui forment un bloc avec le segment qui les suit : le segment est montré à l'homme ou à la femme, pas aux deux.
    var MARK_MAN = /^\s*האיש מברך\s*$/;          // « L'homme bénit » : le segment suivant est pour l'homme
    var MARK_WOMAN = /^\s*האשה מברכת/;           // « La femme bénit sans mentionner le Nom » : le segment suivant est pour la femme

    function plainText(html) { return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(); }

    function adaptHtml(html, gender) {
        if (gender === 'm') return html.replace(ANY_VARIANT, '');
        if (MODEH_ANI.test(html)) return html.replace(MODEH_ANI, '<b>מוֹדָה אֲנִי</b>');
        return html.replace(SUFFIX_VARIANT, function (all, word, colon, variant) { return variant.trim() + (colon || ''); });
    }

    // Les segments d'une section pour un profil : { segments: [html adapté], hidden: Set des indices à ne pas montrer }.
    // Les indices restent ceux du livre (les traductions et les repères s'y rapportent).
    function adaptSection(segments, gender) {
        var g = normalizeGender(gender);
        var hidden = new Set();
        if (!g) return { segments: segments, hidden: hidden };
        var out = segments.map(function (html, i) {
            var plain = plainText(html);
            if (MARK_MAN.test(plain)) { hidden.add(i); if (g === 'f') hidden.add(i + 1); }       // la consigne s'efface toujours ; le corps seulement pour la femme
            else if (MARK_WOMAN.test(plain)) { hidden.add(i); if (g === 'm') hidden.add(i + 1); }
            return adaptHtml(html, g);
        });
        return { segments: out, hidden: hidden };
    }

    // La traduction française d'un segment, accordée au profil.
    //   « … qui ne m'as pas fait non-Juif. La femme dit : non-Juive »  →  homme : « … non-Juif. » ; femme : « … non-Juive. »
    //   « … (Variante pour la femme : « Je Te rends grâce » au féminin en hébreu, sans différence en français.) »  →  la parenthèse disparaît.
    function adaptFr(text, gender) {
        var g = normalizeGender(gender);
        if (!g || typeof text !== 'string') return text;
        var s = text.replace(/\s*\(Variante pour la femme[^)]*\)\.?/, '');
        var m = /^(.*?\bfait\s+)([^.]+?)\.\s*La femme dit\s*:\s*(.+?)\.?\s*$/.exec(s);
        if (m) return g === 'f' ? m[1] + m[3] + '.' : m[1] + m[2] + '.';
        return s.replace(/\s*La femme dit\s*:.*$/, '');
    }

    // --- Domicile : Israël ou diaspora --------------------------------------------------------------------------------------------------------
    // Où la personne habite, pas où elle se trouve ce soir : c'est le domicile qui règle les jours de fête (1 ou 2), la paracha et les passages de la prière
    // qui diffèrent. Le lieu des Zmanim, lui, règle les horaires. Sans choix (null), l'application déduit tout du lieu, comme avant.
    var DOMICILES = ['israel', 'diaspora'];
    function normalizeDomicile(v) { return DOMICILES.indexOf(v) >= 0 ? v : null; }

    // Une première suggestion d'après le fuseau horaire de l'appareil (jamais imposée : la personne confirme).
    function guessDomicile(timeZone) {
        return /^Asia\/(Jerusalem|Tel_Aviv)$/.test(String(timeZone || '')) ? 'israel' : 'diaspora';
    }

    // Israël (vrai) ou diaspora (faux) pour les jours de fête : le domicile s'il est choisi, sinon le lieu (placeInIsrael).
    function isIsrael(domicile, placeInIsrael) {
        var d = normalizeDomicile(domicile);
        return d ? d === 'israel' : !!placeInIsrael;
    }

    // Le domicile et le lieu se contredisent-ils ? 'israelAbroad' (habite en Israël, lieu en diaspora), 'diasporaInIsrael', ou null (d'accord, ou pas de choix / de lieu).
    function travelNote(domicile, placeInIsrael) {
        var d = normalizeDomicile(domicile);
        if (!d || placeInIsrael === null || placeInIsrael === undefined) return null;
        if (d === 'israel' && !placeInIsrael) return 'israelAbroad';
        if (d === 'diaspora' && placeInIsrael) return 'diasporaInIsrael';
        return null;
    }

    return { GENDERS: GENDERS, normalizeGender: normalizeGender, adaptSection: adaptSection, adaptFr: adaptFr,
             DOMICILES: DOMICILES, normalizeDomicile: normalizeDomicile, guessDomicile: guessDomicile, isIsrael: isIsrael, travelNote: travelNote };
}));
