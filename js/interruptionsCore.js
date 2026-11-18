// =========================================================================
// === LE TABLEAU DES INTERRUPTIONS DANS LA PRIÈRE (calculs purs, sans DOM) ===
// =========================================================================
// Données : data/siddur/interruptions.json, le tableau du rav Yits'haq Yossef chalita imprimé dans le siddour Maguen Avot, transcrit à la main
// (scripts/build_interruptions.py). Chaque ligne est un moment de la prière (« au milieu du Chéma »), chaque colonne ce qu'on voudrait dire
// (« Amen », « Barékhou »…), chaque case { t: texte du livre, c: 'o' oui | 'c' avec limite | 'n' non, idem? } ou null (case vide).
// Ce fichier dit, pour une partie du siddour, à quelle ligne on se trouve. Contenu halakhique : **à relire sur le livre**.
// Testé dans tests/interruptionsCore.test.js. Écran : js/app/siddur.js (sdOpenInterruptions).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.InterruptionsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // La ligne la plus probable quand on lit une partie du siddour. Dans la Amida, l'écran précise avec la bénédiction en cours
    // (« Prière personnelle » : Élokaï nétsor). Les autres parties n'ont pas de ligne : on laisse choisir.
    var BY_SECTION = [
        [/^birkhot-hachahar$/, 'birkhot'],
        [/^birkhot-hatorah$/, 'avantTora'],
        [/^chacharit-(ketoret|hodou)$/, 'elokenou'],
        [/pessoukei/, 'pdz'],
        [/barekhou/, 'barekhouYotser'],
        [/chema$/, 'chemaParagraphe'],
        [/amida|moussaf/, 'amida']
    ];

    function rowForPlace(sectionId, berakhaId) {
        var id = String(sectionId || '');
        if (/^chema-coucher/.test(id)) return null;
        for (var i = 0; i < BY_SECTION.length; i++) {
            if (BY_SECTION[i][0].test(id)) {
                var row = BY_SECTION[i][1];
                if (row === 'amida' && berakhaId === 'netsor') return 'netsor';
                return row;
            }
        }
        return null;
    }

    function tally(row) {
        var n = { o: 0, c: 0, n: 0, empty: 0 };
        row.cells.forEach(function (cell) { if (!cell) n.empty++; else n[cell.c]++; });
        return n;
    }

    // Les colonnes d'un groupe, dans l'ordre du tableau, avec la case de la ligne.
    function byGroup(data, row) {
        return data.groups.map(function (g) {
            var items = [];
            data.cols.forEach(function (col, j) { if (col.group === g.id) items.push({ col: col, cell: row.cells[j] }); });
            return { group: g, items: items };
        });
    }

    return { rowForPlace: rowForPlace, tally: tally, byGroup: byGroup };
}));
