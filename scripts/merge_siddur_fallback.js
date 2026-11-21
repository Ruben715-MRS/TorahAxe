// Complète les index des siddourim 'Habad (Tehilat Hachem) et ashkénaze avec les textes qu'ils n'ont pas, repris du siddour d'Edot HaMizrach (séfarade) :
// Chabbat pour 'Habad (le Tehilat Hachem de Chabbat n'existe pas en texte libre), zemirot, Pourim, jeûnes, mariage, etc. pour les deux.
//  - un groupe absent est repris en entier ;
//  - dans les groupes « thématiques » (FILL), on ajoute les sections dont l'identifiant manque ;
//  - une section reprise porte `from: 'sefarade'` : l'application va la chercher dans data/siddur/ (et sa traduction française aussi).
// Idempotent : les entrées `from` sont retirées avant d'être recalculées. À lancer après build_siddur_habad.js et build_siddur_ashkenaz.js.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', 'data', 'siddur');
const FILL = ['rituels', 'repas', 'hol-hamoed', 'temps', 'divers'];
const main = JSON.parse(fs.readFileSync(path.join(ROOT, 'index.json'), 'utf8'));

for (const rite of ['habad', 'ashkenaz']) {
    const file = path.join(ROOT, rite, 'index.json');
    if (!fs.existsSync(file)) continue;
    const index = JSON.parse(fs.readFileSync(file, 'utf8'));
    index.groups.forEach(g => { g.sections = g.sections.filter(s => !s.from); });
    index.groups = index.groups.filter(g => g.sections.length);
    const have = new Set();
    index.groups.forEach(g => g.sections.forEach(s => have.add(s.id)));
    let added = 0;
    for (const mg of main.groups) {
        const own = index.groups.find(g => g.id === mg.id);
        const take = mg.sections.filter(s => !have.has(s.id)).map(s => Object.assign({}, s, { from: 'sefarade' }));
        if (!take.length) continue;
        if (!own) index.groups.push({ id: mg.id, fr: mg.fr, sections: take });
        else if (FILL.indexOf(mg.id) !== -1) own.sections.push.apply(own.sections, take);
        else continue;
        take.forEach(s => have.add(s.id));
        added += take.length;
    }
    fs.writeFileSync(file, JSON.stringify(index));
    console.log(rite, ':', added, 'sections reprises du siddour séfarade');
}
