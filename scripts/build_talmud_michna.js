// Produit data/talmud/michna-ref.json : pour chaque traité, les endroits de la Guémara où une michna est citée, rattachés à la michna de data/michna/.
// Principe (déterministe, sans devinette) : un segment qui ouvre une michna dans la Guémara commence par « מתני׳ » (ou ouvre un chapitre) ; on compare ses premiers mots
// (sans voyelles ni ponctuation) à ceux de chaque michna du traité, et on retient la première michna, à partir de la dernière trouvée, dont le début correspond.
// Un segment qui reprend une michna au milieu (« מתני׳ » suivants) est rattaché à la michna dont il contient le début de phrase.
// Usage : node scripts/build_talmud_michna.js   (sans réseau : ne lit que data/talmud/ et data/michna/)
// Fichier : { v, tractates: { <traité>: [ [amoud (indice), segment (depuis 0), chapitre (depuis 1), michna (depuis 1), début (1) ou reprise (0)] ] } }

const fs = require('fs');
const path = require('path');
const T = path.resolve(__dirname, '..', 'data', 'talmud');
const M = path.resolve(__dirname, '..', 'data', 'michna');

const MARKS = /[֑-ׇ]/g;
const words = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(MARKS, '').replace(/־/g, ' ').replace(/[^א-ת\s]/g, ' ').split(/\s+/).filter(Boolean);
// Une même mot écrit avec ou sans lettres de lecture (יו/ו, י) : on compare sans י ו א ה internes.
const skel = (w) => w.replace(/[יואה]/g, '');
const same = (a, b) => a === b || (skel(a).length > 0 && skel(a) === skel(b));

function matchPrefix(gw, mw, n) {
    let k = 0;
    for (let i = 0; i < n && i < gw.length && i < mw.length; i++) { if (same(gw[i], mw[i])) k++; else break; }
    return k;
}

function findIn(mw, gw, n) {
    // la suite gw[0..n) apparaît-elle dans mw ?
    const g = gw.slice(0, n);
    if (g.length < n) return -1;
    for (let i = 0; i + n <= mw.length; i++) {
        let ok = true;
        for (let k = 0; k < n; k++) if (!same(mw[i + k], g[k])) { ok = false; break; }
        if (ok) return i;
    }
    return -1;
}

const index = JSON.parse(fs.readFileSync(path.join(T, 'index.json'), 'utf8'));
const out = { v: 1, tractates: {} };
const stats = [];
index.sedarim.forEach(s => s.tractates.forEach(tr => {
    const book = JSON.parse(fs.readFileSync(path.join(T, tr.id + '.json'), 'utf8'));
    const mich = JSON.parse(fs.readFileSync(path.join(M, tr.id + '.json'), 'utf8'));
    const list = [];   // [{c, m, words}]
    mich.chapters.forEach((ch, c) => ch.forEach((text, i) => list.push({ c: c + 1, m: i + 1, words: words(text) })));
    const chapterStarts = new Set(book.chapters.map(ch => ch.from[0] + ':' + ch.from[1]));
    const anchors = [];
    let last = -1;   // indice dans `list` de la dernière michna trouvée
    let unmatched = 0, candidates = 0;
    book.pages.forEach((page, p) => page.forEach((seg, sidx) => {
        const plain = seg.replace(/<[^>]*>/g, '').replace(MARKS, '').trim();
        const labelled = /^(מתני׳|מתני'|מתניתין)/.test(plain);
        const opens = chapterStarts.has(p + ':' + sidx);
        if (!labelled && !opens) return;
        candidates++;
        let gw = words(plain);
        if (labelled) gw = gw.slice(1);
        gw = gw.filter(w => w !== 'וכו');
        if (gw.length < 3) { unmatched++; return; }   // trop court pour rattacher sans risque
        // 1. début de michna : on compare les huit premiers mots à chaque michna du traité (l'ordre des chapitres de la Guémara n'est pas toujours celui de la Michna :
        //    Méguila, Menahot…) ; la meilleure correspondance l'emporte, à égalité la plus proche en avançant depuis la dernière trouvée.
        const n = Math.min(8, gw.length);
        const need = 3;
        let best = -1, bestScore = 0;
        for (let k = 0; k < list.length; k++) {
            const sc = matchPrefix(gw, list[k].words, n);
            if (sc < need) continue;
            const dist = k >= last ? k - last : list.length + (last - k);
            if (sc > bestScore || (sc === bestScore && dist < (best >= last ? best - last : list.length + (last - best)))) { best = k; bestScore = sc; }
        }
        if (best >= 0) { anchors.push([p, sidx, list[best].c, list[best].m, 1]); last = best; return; }
        // 2. reprise au milieu d'une michna : la même ou l'une des trois suivantes
        for (let k = Math.max(last, 0); k < list.length && k <= Math.max(last, 0) + 3; k++) {
            if (findIn(list[k].words, gw, Math.min(3, gw.length)) >= 0) { anchors.push([p, sidx, list[k].c, list[k].m, 0]); last = k; return; }
        }
        unmatched++;
    }));
    out.tractates[tr.id] = anchors;
    const distinct = new Set(anchors.filter(a => a[4] === 1).map(a => a[2] + ':' + a[3])).size;
    stats.push([tr.id, list.length, distinct, candidates, anchors.length, unmatched]);
}));
fs.writeFileSync(path.join(T, 'michna-ref.json'), JSON.stringify(out));
console.log('traité : michnayot | michnayot retrouvées | candidats | ancres | non rattachés');
stats.forEach(s => console.log(s.join(' | ')));
console.log('total ancres :', stats.reduce((n, s) => n + s[4], 0), '; michnayot retrouvées :', stats.reduce((n, s) => n + s[2], 0), '/', stats.reduce((n, s) => n + s[1], 0));
