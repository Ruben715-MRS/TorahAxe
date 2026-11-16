// Ajoute au siddour les bénédictions finales dans les nusha'ot ashkénaze et 'Habad (sections du groupe « repas », à la suite de l'édition séfarade) :
//  - birkat-hamazon-ashkenaze : Birkat haMazon, Siddur Ashkenaz, Metsudah 1981 (CC-BY, via Sefaria) ;
//  - birkat-hamazon-habad     : Birkat haMazon, Siddur Sefard, Torat Emet 357 (domaine public) : c'est le nusach Sefard (Ari) sur lequel se fonde l'usage 'Habad ;
//                               le texte exact des siddourim 'Habad peut différer sur quelques mots ;
//  - al-hamihya-ashkenaze     : Méeïn Chalosh, Siddur Ashkenaz, Daat (domaine public), utilisé aussi pour 'Habad.
// Boré Nefachot est le même dans les trois rites (section birkhot-hanehenin). Le texte n'est pas retouché ; seuls les espaces en trop et les balises <em> sont retirés.
// Usage : NODE_USE_ENV_PROXY=1 node scripts/build_siddur_rites.js   (derrière un proxy ; sinon sans la variable). Idempotent.

const fs = require('fs');
const path = require('path');
const DIR = path.resolve(__dirname, '..', 'data', 'siddur');

const SECTIONS = [
    { id: 'birkat-hamazon-ashkenaze', he: 'ברכת המזון › נוסח אשכנז', fr: 'Birkat haMazon (nusach ashkénaze)', after: 'birkat-hamazon',
        ref: 'Siddur Ashkenaz, Berachot, Birkat HaMazon', version: 'hebrew|The Metsudah siddur, 1981' },
    { id: 'birkat-hamazon-habad', he: 'ברכת המזון › נוסח ספרד', fr: 'Birkat haMazon (nusach Sefard, base de l\'usage \'Habad)', after: 'birkat-hamazon-ashkenaze',
        ref: 'Siddur Sefard, Birchat HaMazon, Birchat HaMazon', version: 'hebrew|Torat Emet 357' },
    { id: 'al-hamihya-ashkenaze', he: 'ברכת מעין שלוש › נוסח אשכנז', fr: 'Bérakha méeïn chalosh (nusach ashkénaze)', after: 'al-hamihya',
        ref: 'Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Al Hamichyah', version: 'hebrew|Daat Siddur Ashkenaz' }
];

async function getJson(url) {
    for (let attempt = 1; attempt <= 4; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('http ' + res.status);
            return await res.json();
        } catch (e) {
            if (attempt === 4) throw e;
            await new Promise(r => setTimeout(r, 800 * attempt));
        }
    }
}
function flatten(x) { return Array.isArray(x) ? x.reduce((a, y) => a.concat(flatten(y)), []) : [x]; }
function clean(s) { return String(s).replace(/<\/?em>/g, '').replace(/ {2,}/g, ' ').trim(); }

(async () => {
    const indexPath = path.join(DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const sec of SECTIONS) {
        const data = await getJson('https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(sec.ref) + '?version=' + encodeURIComponent(sec.version) + '&return_format=default');
        const version = (data.versions || [])[0];
        if (!version || !version.text) throw new Error('texte absent : ' + sec.ref);
        let segments = flatten(version.text).map(clean).filter(x => x.length);
        segments.unshift('<big><b>' + sec.he.split(' › ')[0] + '</b></big>');
        const credit = sec.version.replace('hebrew|', '') + ' (via Sefaria)';
        fs.writeFileSync(path.join(DIR, sec.id + '.json'), JSON.stringify({ v: 1, id: sec.id, he: sec.he, fr: sec.fr, ref: sec.ref + ' — ' + credit, segments: segments }) + '\n');
        const group = index.groups.filter(g => g.sections.some(s => s.id === sec.after))[0];
        const entry = { id: sec.id, he: sec.he, fr: sec.fr, segments: segments.length };
        const same = group.sections.findIndex(s => s.id === sec.id);
        if (same !== -1) group.sections[same] = entry;
        else group.sections.splice(group.sections.findIndex(s => s.id === sec.after) + 1, 0, entry);
        console.log(sec.id.padEnd(28), String(segments.length).padStart(4), 'segments');
    }
    fs.writeFileSync(indexPath, JSON.stringify(index));     // sans retour à la ligne final, comme le fichier d'origine
})().catch(e => { console.error(e); process.exit(1); });
