// Écrit data/torah/quiz/index.json : la liste des paracha qui ont un quiz et le nombre de questions de chaque niveau. À relancer à chaque paracha ajoutée ou complétée
// (`node scripts/build_quiz_index.js`) : tests/parashaQuizData.test.js vérifie que l'index est à jour.
const fs = require('fs');
const path = require('path');
const Core = require('../js/parashaQuizCore.js');

const dir = path.join(__dirname, '..', 'data', 'torah', 'quiz');
const parashot = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'torah', 'parashot.json'), 'utf8')).parashot;
const out = { v: 1, parashot: {} };
fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').sort().forEach(f => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const id = f.replace(/\.json$/, '');
    const index = parashot.findIndex(p => Core.slug(p.fr) === id);
    if (index < 0) throw new Error(f + ' : aucune paracha de ce nom dans parashot.json');
    out.parashot[id] = { index: index, fr: data.parasha, counts: Core.counts(data) };
});
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(out, null, 1) + '\n');
console.log('index.json : ' + Object.keys(out.parashot).length + ' paracha');
