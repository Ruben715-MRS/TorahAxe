// Construit le siddour 'Habad : le Tehilat Hachem (Sefaria : « Weekday Siddur Chabad », alias « Siddur Tehilat Hashem », texte Wikisource, domaine public).
// Écrit data/siddur/habad/index.json et une section par fichier. Le texte hébreu n'est pas retouché (seuls les espaces en trop sont retirés).
// L'application l'utilise à la place du siddour d'Edot HaMizrach quand le rite choisi est 'Habad (js/app/siddur.js, sdBase).
// Usage : NODE_USE_ENV_PROXY=1 node scripts/build_siddur_habad.js   (derrière un proxy ; sinon sans la variable). Idempotent.
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'data', 'siddur', 'habad');
const BOOK = 'Weekday Siddur Chabad';

// [groupe, nom français du groupe, [[identifiant, référence sous le livre, titre hébreu, titre français], ...]]
const G = [
    ['reveil', 'Au réveil', [
        ['hatsot-note', 'Shacharit, Upon Arising', 'השכמת הבוקר', 'Au réveil (minuit et lever)'],
        ['birkhot-hachahar', 'Shacharit, Morning Blessings', 'ברכות השחר', 'Birkhot haChahar (bénédictions du matin)']]],
    ['chacharit', 'Chaharit (jours de semaine)', [
        ['chacharit-talit', 'Shacharit, Tzitzit and Tallit', 'ציצית וטלית גדול', 'Talit et tsitsit'],
        ['chacharit-tefilin', 'Shacharit, Tefillin', 'תפילין', 'Mise des téfilin'],
        ['chacharit-debut', 'Shacharit, Morning Prayer', 'תפלת השחר', 'Prière du matin'],
        ['chacharit-kaddish-derabanan', 'Shacharit, Kaddish DeRabbanan', 'קדיש דרבנן', 'Qaddich dérabanan'],
        ['chacharit-hodou', 'Shacharit, Hodu', 'הודו', 'Hodou'],
        ['chacharit-pessoukei', 'Shacharit, Pesukei Dezimra', 'פסוקי דזמרה', 'Pessoukei dézimra'],
        ['chacharit-chema', 'Shacharit, Blessings of the Shema', 'ברכות קריאת שמע', 'Chéma et ses bénédictions'],
        ['chacharit-amida', 'Shacharit, The Amidah', 'עמידה', 'Amida'],
        ['chacharit-vidoui', 'Shacharit, Tachnun', 'תחנון', 'Tahanoun'],
        ['chacharit-tora', 'Shacharit, Torah Reading', 'קריאת התורה', 'Lecture de la Torah'],
        ['chacharit-achre', 'Shacharit, Ashrei Uva LeZion', 'אשרי ובא לציון', 'Achré et Ouva lé-Tsion'],
        ['chacharit-chir-chel-yom', 'Shacharit, Song of the Day', 'שיר של יום', 'Chir chel yom (le psaume du jour)'],
        ['chacharit-kaddish-yatom', 'Shacharit, Mourner\'s Kaddish', 'קדיש יתום', 'Qaddich yatom'],
        ['chacharit-qave', 'Shacharit, Kaveh', 'קוה', 'Qavé'],
        ['chacharit-alenou', 'Shacharit, Aleinu', 'עלינו', 'Alénou'],
        ['chacharit-rabenou-tam', 'Shacharit, Rabbenu Tam', 'תפילין דרבינו תם', 'Téfilin de Rabbénou Tam'],
        ['chacharit-six-souvenirs', 'Shacharit, Six Remembrances', 'שש זכירות', 'Les six souvenirs']]],
    ['minha', 'Minha (jours de semaine)', [
        ['minha-qorbanot', 'Mincha, Korbanot', 'קרבנות', 'Qorbanot (les offrandes)'],
        ['minha-achre', 'Mincha, Ashrei', 'אשרי', 'Achré'],
        ['minha-amida', 'Mincha, Amidah', 'עמידה', 'Amida'],
        ['minha-vidoui', 'Mincha, Tachanun', 'תחנון', 'Tahanoun'],
        ['minha-alenou', 'Mincha, Aleinu', 'עלינו', 'Alénou']]],
    ['arvit', 'Arvit (jours de semaine)', [
        ['arvit', 'Maariv', 'ערבית', 'Arvit (office du soir)']]],
    ['rituels', 'Omer, lune, coucher', [
        ['omer', 'Sefirat HaOmer', 'סדר ספירת העומר', 'Sefirat haOmer (le compte de l\'Omer)'],
        ['birkat-halevana', 'Kiddush Levanah', 'סדר קידוש לבנה', 'Birkat haLévana (la bénédiction de la lune)'],
        ['chema-coucher', 'Bedtime Shema', 'סדר קריאת שמע על המיטה', 'Chéma du coucher']]],
    ['repas', 'Après les repas et bénédictions', [
        ['birkat-hamazon-habad', 'Blessings, Birkat HaMazon', 'סדר ברכת המזון', 'Birkat haMazon'],
        ['al-hamihya-ashkenaze', 'Blessings, Berakha Acharona', 'ברכה אחרונה', 'Bérakha méeïn chalosh (Al haMih\'ya…)'],
        ['birkat-hamazon-brit', 'Blessings, Birkat HaMazon for Circumcision', 'הרחמן לברית מילה', 'Harakhaman de la Brit Mila']]],
    ['roch-hodech', 'Roch \'Hodesh', [
        ['rh-ordre', 'Rosh Chodesh', 'ראש חודש', 'Roch \'Hodesh']]],
    ['hol-hamoed', 'Fêtes (Soukkot, Hallel, Moussaf)', [
        ['hm-loulav', 'Lulav', 'לולב', 'Loulav'],
        ['hm-hallel', 'Hallel', 'סדר הלל', 'Hallel'],
        ['hm-moussaf', 'Musaf for Festivals', 'מוסף לשלש רגלים', 'Moussaf des trois fêtes']]],
    ['temps', 'Hanouka, Pourim, Nissan', [
        ['hanouka', 'Chanukah', 'חנוכה', 'Hanouka'],
        ['pourim', 'Purim', 'פורים', 'Pourim'],
        ['nissan-nessiim', 'Reading of the Nassi', 'פרשת הנשיאים לחודש ניסן', 'Les princes (lecture de Nissan)']]],
    ['divers', 'Bénédictions et prières diverses', [
        ['tefilat-haderekh', 'Blessings, The Travelers\' Prayer', 'תפלת הדרך', 'Tefilat haDérékh (la prière du voyageur)'],
        ['berakhot-diverses', 'Blessings, Various Blessings', 'סדר ברכות', 'Bénédictions diverses'],
        ['cheva-berakhot', 'Blessings, Sheva Berakhot', 'שבע ברכות', 'Chéva berakhot (les sept bénédictions)'],
        ['fiancailles', 'Blessings of Marriage Ceremony', 'ברכות אירוסין ונשואין', 'Fiançailles et mariage'],
        ['brit-mila', 'Order of a Circumcision', 'סדר המילה', 'Brit Mila'],
        ['pidyon-haben', 'Pidyon HaBen', 'סדר פדיון הבן', 'Pidyon haBen'],
        ['hatarat-nedarim', 'Annulment of Vows', 'סדר התרת נדרים', 'Hatarat nédarim (annulation des vœux)'],
        ['kaparot', 'Kapparot', 'סדר כפרות', 'Kapparot'],
        ['deuil', 'Mishnayot for a Mourner', 'סדר הלימוד לאבל', 'Michnayot pour l\'endeuillé']]]
];

async function getJson(url) {
    for (let attempt = 1; attempt <= 8; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('http ' + res.status);
            return await res.json();
        } catch (e) {
            if (attempt === 8) throw e;
            await new Promise(r => setTimeout(r, 4000 * attempt));
        }
    }
}
function flatten(x) { return Array.isArray(x) ? x.reduce((a, y) => a.concat(flatten(y)), []) : [x]; }
function clean(s) { return String(s).replace(/<\/?em>/g, '').replace(/ {2,}/g, ' ').trim(); }

(async () => {
    fs.mkdirSync(DIR, { recursive: true });
    const index = { v: 1, source: 'Sefaria : Siddur Tehilat Hashem (Weekday Siddur Chabad), Wikisource (domaine public)', edition: 'Tehilat Hachem', license: 'Public Domain', groups: [] };
    for (const [gid, gfr, secs] of G) {
        const group = { id: gid, fr: gfr, sections: [] };
        for (const [id, ref, he, fr] of secs) {
            await new Promise(r => setTimeout(r, 700));
            const full = BOOK + ', ' + ref;
            const data = await getJson('https://www.sefaria.org/api/texts/' + encodeURIComponent(full) + '?context=0&pad=0');
            const segments = flatten(data.he || []).map(clean).filter(x => x.length);
            if (!segments.length) throw new Error('texte absent : ' + full);
            fs.writeFileSync(path.join(DIR, id + '.json'), JSON.stringify({ v: 1, id, he, fr, ref: full + ' — Tehilat Hachem (via Sefaria)', segments }) + '\n');
            group.sections.push({ id, he, fr, segments: segments.length });
            console.log(id.padEnd(30), String(segments.length).padStart(5));
        }
        index.groups.push(group);
    }
    fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(index));
})().catch(e => { console.error(e); process.exit(1); });
