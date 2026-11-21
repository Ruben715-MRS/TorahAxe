// Génère js/mishnaYomiTable.js : pour chacun des 63 traités (dans l'ordre de la Michna), le nombre de michnayot de chaque chapitre.
// Source : le programme Mishna Yomi de @hebcal/learning (installer avant : npm install --no-save @hebcal/learning@5), croisé avec nos propres
// données (data/michna/<traité>.json) : le script REFUSE d'écrire si un seul chapitre diffère ou si le total n'est pas 4192.
const fs = require('fs'), path = require('path');
const learning = require('@hebcal/learning');
const root = path.join(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'data/michna/index.json'), 'utf8'));
const ours = [];
index.sedarim.forEach(s => s.tractates.forEach(t => ours.push(t)));

// Les michnayot dans l'ordre du cycle (2 par jour sur 2096 jours depuis le 20 mai 1947).
const idx = new learning.MishnaYomiIndex();
const counts = {}, order = [];
for (let i = 0; i < 2096; i++) {
    idx.lookup(new Date(1947, 4, 20 + i)).forEach(m => {
        const [c, v] = m.v.split(':').map(Number);
        if (!counts[m.k]) { counts[m.k] = []; order.push(m.k); }
        counts[m.k][c - 1] = Math.max(counts[m.k][c - 1] || 0, v);
    });
}
if (order.length !== ours.length) throw new Error('nombre de traités différent : ' + order.length + ' / ' + ours.length);
let total = 0;
const table = order.map((k, i) => {
    const t = ours[i];
    const data = JSON.parse(fs.readFileSync(path.join(root, 'data/michna', t.id + '.json'), 'utf8'));
    const mine = data.chapters.map(c => c.length);
    const theirs = counts[k];
    if (JSON.stringify(mine) !== JSON.stringify(theirs)) throw new Error('désaccord pour ' + t.id + ' : ' + mine + ' / ' + theirs);
    total += theirs.reduce((a, b) => a + b, 0);
    return [t.id, t.fr, t.he, theirs];
});
if (total !== 4192) throw new Error('total ' + total);
const out = '// GÉNÉRÉ par scripts/build_mishna_yomi.js : ne pas modifier à la main.\n// [ identifiant du traité (data/michna), nom français, nom hébreu, michnayot de chaque chapitre ] ; 63 traités, 4192 michnayot.\n' +
    'var MISHNA_YOMI_TABLE = ' + JSON.stringify(table) + ';\nif (typeof module === \'object\' && module.exports) module.exports = MISHNA_YOMI_TABLE;\n';
fs.writeFileSync(path.join(root, 'js/mishnaYomiTable.js'), out);
console.log('ok', table.length, total);
