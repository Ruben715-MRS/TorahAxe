// =========================================================================
// === TORAHAXE — GÉNÉRATEUR DES TABLES DE LA PARACHA DE LA SEMAINE (js/sedraTables.js) ===
// =========================================================================
// À lancer à la main, quand on veut régénérer les tables (jamais au build de l'application) :
//     npm install --no-save @hebcal/core@5 && node scripts/build_sedra.js
// La lecture de la Torah suit un cycle arithmétique : la suite des parachiot d'une année hébraïque ne dépend que de son TYPE, c'est-à-dire de trois choses (l'année est-elle
// embolismique ? quel jour de la semaine tombe Roch Hachana ? 'Hechvan et Kislev ont-ils 30 jours, 29 jours, ou l'un de chaque ?), et, pour Israël, du fait que le 8ᵉ jour de Pessa'h
// ou le 2ᵉ de Chavouot tombe un Chabbat. Il n'y a donc que quatorze types, deux fois (diaspora, Israël).
// Ce script demande à @hebcal/core (Sedra, la source des données d'origine de l'application : data/torah/calendar.json) la suite de chaque année hébraïque que le calendrier de
// l'application sait calculer, regroupe par type, VÉRIFIE que deux années du même type ont toujours la même suite (sinon il s'arrête), et écrit js/sedraTables.js.
const fs = require('fs');
const path = require('path');
const { Sedra, parshiot } = require('@hebcal/core');
const HC = require('../js/hebrewCalendarCore.js');
const CY = require('../js/calendarYearCore.js');

// Le type d'une année : « L » (embolismique) ou « p » (simple), le jour de Roch Hachana (1 lundi, 2 mardi, 4 jeudi, 6 Chabbat), et la longueur : D (déficiente : 'Hechvan et Kislev à 29),
// R (régulière : 'Hechvan à 29, Kislev à 30) ou C (complète : 'Hechvan et Kislev à 30). Même clé que js/sedraCore.js.
function keyOf(year) {
    const months = HC.monthsOf(year);
    const heshvan = months.find(m => m.id === 'Heshvan').days, kislev = months.find(m => m.id === 'Kislev').days;
    const type = heshvan === 30 && kislev === 30 ? 'C' : heshvan === 29 && kislev === 29 ? 'D' : 'R';
    return (HC.leap(year) ? 'L' : 'p') + HC.weekdayOf(CY.hebrewToFixed(year, 'Tishri', 1)) + type;
}

const tables = {};
let years = 0;
[false, true].forEach(il => {
    for (let y = HC.HEBREW_MIN; y <= HC.HEBREW_MAX; y++) {
        const rh = CY.hebrewToFixed(y, 'Tishri', 1), next = CY.hebrewToFixed(y + 1, 'Tishri', 1);
        const first = rh + ((6 - HC.weekdayOf(rh) + 7) % 7);
        const sedra = new Sedra(y, il);
        const seq = [];
        for (let f = first; f < next; f += 7) {
            const r = sedra.lookup(f);
            if (r.chag) { seq.push(-1); continue; }
            const idx = r.parsha.map(n => parshiot.indexOf(n));
            if (idx.some(i => i < 0)) throw new Error('paracha inconnue : ' + r.parsha);
            if (idx.length === 2 && idx[1] !== idx[0] + 1) throw new Error('paire non consécutive : ' + r.parsha);
            seq.push(idx.length === 1 ? idx[0] : 100 + idx[0]);            // 100 + n : les parachiot n et n + 1 réunies
        }
        const key = keyOf(y), str = seq.join(',');
        tables[key] = tables[key] || {};
        const slot = il ? 'i' : 'd';
        if (tables[key][slot] === undefined) tables[key][slot] = str;
        else if (tables[key][slot] !== str) throw new Error('deux années du type ' + key + ' ont des suites différentes (' + y + ', ' + (il ? 'Israël' : 'diaspora') + ')');
        years += 1;
    }
});

const lines = Object.keys(tables).sort().map(key => {
    const t = tables[key];
    return "        '" + key + "': { d: '" + t.d + "'" + (t.i !== t.d ? ", i: '" + t.i + "'" : '') + ' }';
});
const out = `// GÉNÉRÉ par scripts/build_sedra.js à partir de @hebcal/core (${HC.HEBREW_MIN} à ${HC.HEBREW_MAX}, ${years} années vérifiées). Ne pas éditer à la main.
// La suite des parachiot d'une année hébraïque, selon son type (voir js/sedraCore.js). Une suite : un nombre par Chabbat, à partir du premier Chabbat de l'année (le premier à partir de
// Roch Hachana, inclus) ; -1 : un Chabbat de fête, sans paracha ordinaire ; 0 à 52 : l'indice de la paracha dans data/torah/parashot.json ; 100 + n : les parachiot n et n + 1 réunies.
// « d » : la diaspora ; « i » : Israël, seulement quand elle diffère (le 8ᵉ jour de Pessa'h, ou le 2ᵉ de Chavouot, un Chabbat).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SedraTables = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    return {
${lines.join(',\n')}
    };
}));
`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'sedraTables.js'), out);
console.log('js/sedraTables.js écrit : ' + Object.keys(tables).length + ' types, ' + years + ' années vérifiées (' + HC.HEBREW_MIN + ' à ' + HC.HEBREW_MAX + ').');
