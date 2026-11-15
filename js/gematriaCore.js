// =========================================================================
// === HISTORIAXE — GUÉMATRIA (calcul, sans DOM) ===
// =========================================================================
// La valeur numérique des lettres hébraïques, selon quatre modes de calcul (voir js/app/gematria.js pour l'écran) :
//  - « standard » (mispar hechrechi) : alef = 1 … yod = 10, kaf = 20 … qof = 100 … tav = 400. Les cinq lettres finales (ך ם ן ף ץ) valent
//    la même chose que leur forme ordinaire (20, 40, 50, 80, 90), et non 500 à 900 comme dans le décompte « grand » (mispar gadol).
//  - « katan » (mispar katan) : chaque lettre est ramenée à un seul chiffre, en supprimant les zéros (30 → 3, 400 → 4).
//  - « milui » (mispar milui) : la valeur de la lettre écrite en toutes lettres (alef = אלף = 1 + 30 + 80 = 111). Les lettres du nom
//    comptent à leur valeur standard. Plusieurs écritures existent pour quelques lettres (hé : הא ou הי) ; on retient הא.
//  - « atbash » (א–ת ב–ש) : la première lettre de l'alphabet prend la valeur de la dernière, la deuxième celle de l'avant-dernière, etc.
// Option « mispar gadol » (le « grand » décompte) : les cinq lettres finales prennent leur propre valeur, ך = 500, ם = 600, ן = 700, ף = 800, ץ = 900.
// Elle s'applique au standard, au katan (ך = 5…) et au milui (où les lettres finales du nom comptent aussi : אלף = 1 + 30 + 800 = 831) ; elle est sans effet
// sur l'atbash, dont les valeurs sont celles des lettres miroirs, toutes ordinaires.
// À cela s'ajoute, au choix, la réduction à un chiffre : on additionne les chiffres du total, jusqu'à n'en avoir plus qu'un (1994 → 23 → 5). Les voyelles et les signes de cantillation (U+0591–U+05C7) sont ignorés, de même que tout ce qui n'est pas une
// lettre hébraïque.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else root.GematriaCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les 22 lettres, dans l'ordre de l'alphabet : lettre, valeur standard, nom écrit en toutes lettres (pour le milui), et nom français.
    var LETTERS = [
        { letter: 'א', value: 1, spelling: 'אלף', name: 'alef' },
        { letter: 'ב', value: 2, spelling: 'בית', name: 'bet' },
        { letter: 'ג', value: 3, spelling: 'גימל', name: 'guimel' },
        { letter: 'ד', value: 4, spelling: 'דלת', name: 'dalet' },
        { letter: 'ה', value: 5, spelling: 'הא', name: 'hé' },
        { letter: 'ו', value: 6, spelling: 'ואו', name: 'vav' },
        { letter: 'ז', value: 7, spelling: 'זין', name: 'zayin' },
        { letter: 'ח', value: 8, spelling: 'חית', name: 'het' },
        { letter: 'ט', value: 9, spelling: 'טית', name: 'tet' },
        { letter: 'י', value: 10, spelling: 'יוד', name: 'yod' },
        { letter: 'כ', value: 20, spelling: 'כף', name: 'kaf' },
        { letter: 'ל', value: 30, spelling: 'למד', name: 'lamed' },
        { letter: 'מ', value: 40, spelling: 'מם', name: 'mem' },
        { letter: 'נ', value: 50, spelling: 'נון', name: 'noun' },
        { letter: 'ס', value: 60, spelling: 'סמך', name: 'samekh' },
        { letter: 'ע', value: 70, spelling: 'עין', name: 'ayin' },
        { letter: 'פ', value: 80, spelling: 'פא', name: 'pé' },
        { letter: 'צ', value: 90, spelling: 'צדי', name: 'tsadi' },
        { letter: 'ק', value: 100, spelling: 'קוף', name: 'qof' },
        { letter: 'ר', value: 200, spelling: 'ריש', name: 'resh' },
        { letter: 'ש', value: 300, spelling: 'שין', name: 'shin' },
        { letter: 'ת', value: 400, spelling: 'תיו', name: 'tav' }
    ];

    // Les formes finales, avec la lettre ordinaire qu'elles prolongent.
    var FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

    // Valeur des formes finales dans le mispar gadol.
    var GADOL = { 'ך': 500, 'ם': 600, 'ן': 700, 'ף': 800, 'ץ': 900 };

    var MODES = ['standard', 'katan', 'milui', 'atbash'];

    var BY_LETTER = {};
    LETTERS.forEach(function (l, i) { BY_LETTER[l.letter] = { entry: l, index: i }; });

    // La lettre ordinaire d'un caractère (« ם » → « מ »), ou null si ce n'est pas une lettre hébraïque.
    function baseLetter(ch) {
        var c = FINALS[ch] || ch;
        return BY_LETTER[c] ? c : null;
    }

    function standardValue(base) { return BY_LETTER[base].entry.value; }

    // La valeur d'un caractère (ordinaire ou final) : la valeur standard, ou celle du mispar gadol pour une lettre finale si `gadol`.
    function charValue(ch, gadol) { return gadol && GADOL[ch] ? GADOL[ch] : standardValue(baseLetter(ch)); }

    // 30 → 3, 400 → 4, 7 → 7, ך (gadol) 500 → 5 : le premier chiffre.
    function katanValue(ch, gadol) { return parseInt(String(charValue(ch, gadol)).charAt(0), 10); }

    // Les valeurs des lettres du nom de la lettre : alef → 1 + 30 + 80 (ou 1 + 30 + 800 en gadol : le ף final compte 800).
    function spellingParts(base, gadol) {
        var parts = [];
        var spelling = BY_LETTER[base].entry.spelling;
        for (var i = 0; i < spelling.length; i++) parts.push(charValue(spelling.charAt(i), gadol));
        return parts;
    }
    function miluiValue(base, gadol) { return spellingParts(base, gadol).reduce(function (a, b) { return a + b; }, 0); }

    // La lettre en miroir : א ↔︎ ת, ב ↔︎ ש, ג ↔︎ ר…
    function atbashLetter(base) { return LETTERS[LETTERS.length - 1 - BY_LETTER[base].index].letter; }
    function atbashValue(base) { return standardValue(atbashLetter(base)); }

    // Le texte → ses lettres hébraïques, dans l'ordre, avec un indicateur de début de mot. Tout le reste est ignoré (et compté dans `ignored`).
    // Retour : { letters: [{ char, base, final, startsWord }], ignored: n }
    function parse(text) {
        var letters = [];
        var ignored = 0;
        var newWord = true;
        String(text == null ? '' : text).split('').forEach(function (ch) {
            var base = baseLetter(ch);
            if (base) {
                letters.push({ char: ch, base: base, final: ch !== base, startsWord: newWord });
                newWord = false;
            } else {
                // Le maqaf (U+05BE) lie deux mots en un seul groupe de lecture, mais les sépare pour le calcul : comme l'espace.
                if (/\s|\u05BE|[-–—]/.test(ch)) newWord = true;
                // Voyelles et cantillation (U+0591–U+05C7) : collées à la lettre, ni mot coupé ni caractère « ignoré » à signaler.
                else if (!/[\u0591-\u05C7]/.test(ch)) ignored++;
            }
        });
        return { letters: letters, ignored: ignored };
    }

    // La valeur d'une lettre dans un mode : { value, via?, parts? }.
    //  - atbash : via = la lettre en miroir
    //  - milui : via = le nom écrit en toutes lettres, parts = les valeurs additionnées
    // `ch` : le caractère tel qu'il est écrit (ordinaire ou final) ; `gadol` : le mispar gadol (sans effet sur l'atbash).
    function letterValue(base, mode, ch, gadol) {
        ch = ch || base;
        if (mode === 'katan') return { value: katanValue(ch, gadol) };
        if (mode === 'milui') return { value: miluiValue(base, gadol), via: BY_LETTER[base].entry.spelling, parts: spellingParts(base, gadol) };
        if (mode === 'atbash') return { value: atbashValue(base), via: atbashLetter(base) };
        return { value: charValue(ch, gadol) };
    }

    // Additionne les chiffres jusqu'à n'en avoir plus qu'un : 1994 → 23 → 5. Retour : la suite des étapes, la première étant le nombre de départ
    // ([1994, 23, 5]). Un nombre déjà d'un seul chiffre donne [n].
    function reduceSteps(n) {
        var steps = [n];
        while (n > 9) {
            n = String(n).split('').reduce(function (a, d) { return a + parseInt(d, 10); }, 0);
            steps.push(n);
        }
        return steps;
    }

    // Le calcul complet. Retour :
    //  { mode, gadol, letters: [{ char, base, final, startsWord, value, via?, parts? }], ignored, total, reduced: [steps] | null }
    // `gadol` (le mispar gadol) est ramené à faux pour l'atbash, où il ne change rien.
    function compute(text, mode, reduce, gadol) {
        var m = MODES.indexOf(mode) >= 0 ? mode : 'standard';
        var g = !!gadol && m !== 'atbash';
        var parsed = parse(text);
        var total = 0;
        var letters = parsed.letters.map(function (l) {
            var v = letterValue(l.base, m, l.char, g);
            total += v.value;
            return { char: l.char, base: l.base, final: l.final, startsWord: l.startsWord, value: v.value, via: v.via, parts: v.parts };
        });
        return { mode: m, gadol: g, letters: letters, ignored: parsed.ignored, total: total, reduced: reduce && letters.length ? reduceSteps(total) : null };
    }

    return {
        LETTERS: LETTERS, FINALS: FINALS, GADOL: GADOL, MODES: MODES,
        baseLetter: baseLetter, parse: parse, letterValue: letterValue, reduceSteps: reduceSteps, compute: compute
    };
});
