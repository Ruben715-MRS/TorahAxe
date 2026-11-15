// =========================================================================
// === LES KORBANOT : LE RITUEL, OÙ ET COMMENT (données, sans DOM) ===
// =========================================================================
// Pour chaque sorte d'offrande : où on l'abat, où va le sang, ce qu'on fait du reste du sang, qui mange la viande et où, et jusqu'à quand.
// Les textes suivent le Lévitique (1 à 7), l'Exode 12, les Nombres 18 et la Michna (Zevachim 5, Pessa'him 5), vérifiés sur data/tanakh ; la
// division en « sainteté suprême » (kodechei kodachim) et « moindre sainteté » (kodachim kalim) est celle de la tradition. Les repères du
// diagramme de l'autel (`bloodMark`, `residualMark`) sont lus par js/app/korbanot-ritual.js. Contenu écrit à la main en français : **à relire par
// une personne compétente**. Testé dans tests/korbanotRitual.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.KorbanotRitual = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var LEVELS = {
        kk: { fr: 'Sainteté suprême (kodechei kodachim)', short: 'Sainteté suprême' },
        kal: { fr: 'Moindre sainteté (kodachim kalim)', short: 'Moindre sainteté' }
    };

    // Où l'on met le sang sur l'autel extérieur (vu du dessus, le nord en haut ; la rampe est au sud, le sanctuaire à l'ouest) :
    // 'ne-sw' : angles nord-est et sud-ouest, en bas des parois ; 'horns' : les quatre cornes ; 'bird-upper' : paroi supérieure, angle sud-est ;
    // 'bird-lower' : paroi inférieure, angle sud-ouest ; 'lower-once' : le bas des parois, en une fois ; 'inner' : pas sur cet autel (voir le texte).
    var BLOOD_MARKS = ['ne-sw', 'horns', 'bird-upper', 'bird-lower', 'lower-once', 'inner'];
    // Le reste du sang : 'south' (base sud), 'west' (base ouest), 'none' (le texte n'en parle pas à part).
    var RESIDUAL_MARKS = ['south', 'west', 'none'];
    // Le délai : 'none' (tout monte sur l'autel), 'midnight' (le jour de l'offrande et la nuit suivante jusqu'à minuit), 'two' (deux jours et la nuit
    // entre les deux), 'pesach' (la nuit du 15 Nissan, jusqu'à minuit).
    var DEADLINES = ['none', 'midnight', 'two', 'pesach'];
    // Où l'on abat : 'north' (au nord de l'autel), 'court' (n'importe où dans la cour), 'melika-se' et 'melika-sw' (la mélika des oiseaux, aux angles de l'autel).
    var SLAUGHTER_MARKS = ['north', 'court', 'melika-se', 'melika-sw'];
    // Qui mange, et où : 'court-cohanim', 'jerusalem', 'outside' (brûlé hors de Jérusalem), 'none' (tout monte sur l'autel).
    var EATEN = ['court-cohanim', 'jerusalem', 'outside', 'none'];

    var CATEGORIES = [
        { id: 'ola', he: 'עולת בהמה', fr: 'Ola de bétail', level: 'kk',
            cases: "Des mâles : veau, taureau, agneau, bélier, chevreau ou bouc. C'est l'offrande du tamid et du moussaf, et celle des dons et des vœux.",
            slaughter: "Au nord de la cour, au côté nord de l'autel (Lévitique 1:11).",
            slaughterMark: 'north',
            blood: "Jeté depuis un récipient sur les angles nord-est et sud-ouest de l'autel, en bas des parois : le sang touche ainsi les quatre côtés (Lévitique 1:5, 11).", bloodMark: 'ne-sw',
            residual: "Versé sur la base sud de l'autel.", residualMark: 'south',
            meat: "On dépouille l'animal (la peau revient au cohen, Lévitique 7:8), on le découpe et on le brûle tout entier sur l'autel : personne n'en mange.",
            eaten: 'none', deadline: 'none', deadlineText: "Rien à manger : tout monte sur l'autel.", ref: 'Lévitique 1:3-13 ; Zevachim 5' },
        { id: 'olaBird', he: 'עולת העוף', fr: 'Ola des oiseaux', level: 'kk',
            cases: 'Une tourterelle ou une jeune colombe (Lévitique 1:14).',
            slaughter: "Par la mélika : le cohen incise la nuque avec l'ongle, au sommet de l'autel, à l'angle sud-est.",
            slaughterMark: 'melika-se',
            blood: "Le sang est exprimé contre la paroi supérieure de l'autel (Lévitique 1:15).", bloodMark: 'bird-upper',
            residual: "Le texte n'en dit rien de plus.", residualMark: 'none',
            meat: "Le jabot et ses plumes sont jetés à l'est de l'autel, au dépôt des cendres (Lévitique 1:16) ; le reste est brûlé sur l'autel.",
            eaten: 'none', deadline: 'none', deadlineText: "Rien à manger : tout est brûlé.", ref: 'Lévitique 1:14-17' },
        { id: 'hatatOut', he: 'חטאת חיצונית', fr: "'Hatat extérieure (bétail)", level: 'kk',
            cases: "L'offrande de faute (faute involontaire) : chèvre ou agnelle pour un individu ; bouc pour un prince, ou pour la communauté (Roch 'Hodesh et fêtes).",
            slaughter: "Au nord de la cour, là où l'on abat la ola (Lévitique 6:18).",
            slaughterMark: 'north',
            blood: "Le cohen en met, du doigt, sur les quatre cornes de l'autel extérieur (Lévitique 4:25, 30).", bloodMark: 'horns',
            residual: "Le reste est versé sur la base sud de l'autel.", residualMark: 'south',
            meat: "Les graisses brûlent sur l'autel ; le reste est mangé par les cohanim mâles, dans la cour (Lévitique 6:19).",
            eaten: 'court-cohanim', deadline: 'midnight', deadlineText: "Le jour de l'offrande et la même nuit, jusqu'à 'hatsot (minuit astronomique).", ref: 'Lévitique 4:22-35 ; 6:17-23' },
        { id: 'hatatBird', he: 'חטאת העוף', fr: "'Hatat des oiseaux", level: 'kk',
            cases: "Une tourterelle ou une jeune colombe, pour la faute d'un pauvre (Lévitique 5:7).",
            slaughter: "Par la mélika, dans la partie de la cour attenante à l'angle sud-ouest de l'autel.",
            slaughterMark: 'melika-sw',
            blood: "Une partie du sang est aspergée directement du corps de l'oiseau (et non du doigt) sur la paroi inférieure de l'autel ; le reste est exprimé sur la base (Lévitique 5:8-9).", bloodMark: 'bird-lower',
            residual: "Exprimé sur la base de l'autel.", residualMark: 'none',
            meat: "Mangé par les cohanim mâles, dans la cour.",
            eaten: 'court-cohanim', deadline: 'midnight', deadlineText: "Le jour de l'offrande et la même nuit, jusqu'à 'hatsot.", ref: 'Lévitique 5:7-10' },
        { id: 'hatatIn', he: 'חטאת פנימית', fr: "'Hatat intérieure", level: 'kk',
            cases: "Le taureau du grand prêtre ; le taureau pour une erreur de l'assemblée ; le taureau du cohen oint ; le bouc de l'idolâtrie collective. À Yom Kippour : le taureau du grand prêtre et le bouc.",
            slaughter: "Au nord de la cour.",
            slaughterMark: 'north',
            blood: "Le grand prêtre asperge du doigt vers la parokhet, une fois vers le haut et sept fois vers le bas ; il met du sang sur les quatre cornes de l'autel d'or, et en asperge sept fois le dessus. À Yom Kippour seulement, il asperge aussi vers le couvercle de l'arche, une fois en haut et sept fois en bas (Lévitique 4:6-7 ; 16:14-19). Ce sang n'est pas mis sur l'autel extérieur.", bloodMark: 'inner',
            residual: "Le reste du sang est versé sur la base ouest de l'autel extérieur (Lévitique 4:7).", residualMark: 'west',
            meat: "Les graisses brûlent sur l'autel extérieur ; le reste, que personne ne mange (Lévitique 6:23), est brûlé hors de Jérusalem, au dépôt des cendres (Lévitique 4:11-12).",
            eaten: 'outside', deadline: 'none', deadlineText: "Rien à manger : tout est brûlé, dedans puis dehors.", ref: 'Lévitique 4:3-21 ; 16' },
        { id: 'acham', he: 'אשם', fr: "Acham (offrande de délit)", level: 'kk',
            cases: "Un bélier pour le vol, la méila (profit d'un bien consacré), la servante fiancée et le doute ; un agneau pour le nazir impur et le métsora.",
            slaughter: "Au nord de la cour, là où l'on abat la ola (Lévitique 7:2).",
            slaughterMark: 'north',
            blood: "Jeté depuis un récipient sur les angles nord-est et sud-ouest de l'autel, en bas des parois (Lévitique 7:2).", bloodMark: 'ne-sw',
            residual: "Versé sur la base sud de l'autel.", residualMark: 'south',
            meat: "Les graisses brûlent sur l'autel ; le reste est mangé par les cohanim mâles, dans la cour (Lévitique 7:6).",
            eaten: 'court-cohanim', deadline: 'midnight', deadlineText: "Le jour de l'offrande et la même nuit, jusqu'à 'hatsot.", ref: 'Lévitique 5:14-26 ; 7:1-7' },
        { id: 'shavuot', he: 'שלמי ציבור', fr: 'Chelamim collectifs de Chavouot', level: 'kk',
            cases: 'Les deux agneaux (mâles) offerts avec les deux pains de Chavouot (Lévitique 23:19-20).',
            slaughter: "Au nord de la cour.",
            slaughterMark: 'north',
            blood: "Jeté depuis un récipient sur les angles nord-est et sud-ouest de l'autel, en bas des parois.", bloodMark: 'ne-sw',
            residual: "Versé sur la base sud de l'autel.", residualMark: 'south',
            meat: "Mangés par les cohanim mâles, dans la cour.",
            eaten: 'court-cohanim', deadline: 'midnight', deadlineText: "Le jour de l'offrande et la même nuit, jusqu'à 'hatsot.", ref: 'Lévitique 23:19-20 ; Zevachim 5' },
        { id: 'shelamim', he: 'שלמים', fr: 'Chelamim (offrandes de paix)', level: 'kal',
            cases: "Les offrandes de paix volontaires, de célébration ('haguiga) ou de joie (sim'ha) : gros ou menu bétail, mâle ou femelle.",
            slaughter: "N'importe où dans la cour (Lévitique 3:2, 8).",
            slaughterMark: 'court',
            blood: "Jeté depuis un récipient sur les angles nord-est et sud-ouest de l'autel, en bas des parois (Lévitique 3:2, 8).", bloodMark: 'ne-sw',
            residual: "Versé sur la base sud de l'autel.", residualMark: 'south',
            meat: "Les graisses brûlent sur l'autel. La poitrine et la cuisse droite, balancées par le propriétaire et le cohen dans les quatre directions, vers le haut et vers le bas, reviennent aux cohanim et à leur famille ; le reste se mange à Jérusalem, par toute personne pure (Lévitique 7:30-34).",
            eaten: 'jerusalem', deadline: 'two', deadlineText: "Deux jours et la nuit entre les deux (Lévitique 7:16-18).", ref: 'Lévitique 3 ; 7:11-21, 28-34' },
        { id: 'toda', he: 'תודה ואיל נזיר', fr: 'Toda et bélier du nazir', level: 'kal',
            cases: "La toda (remerciement) : gros ou menu bétail, avec quarante pains, dix de chaque sorte (galettes non levées, pains non levés, pains échaudés, pains levés). Le nazir : un bélier avec vingt pains (dix galettes, dix pains non levés).",
            slaughter: "N'importe où dans la cour.",
            slaughterMark: 'court',
            blood: "Jeté depuis un récipient sur les angles nord-est et sud-ouest de l'autel, en bas des parois.", bloodMark: 'ne-sw',
            residual: "Versé sur la base sud de l'autel.", residualMark: 'south',
            meat: "Comme pour les chelamim ; un pain de chaque sorte est prélevé pour le cohen (Lévitique 7:14), et pour le nazir la patte avant cuite est balancée avec la poitrine et la cuisse (Nombres 6:19-20). Tout se mange à Jérusalem.",
            eaten: 'jerusalem', deadline: 'midnight', deadlineText: "Le jour de l'offrande et la même nuit, jusqu'à 'hatsot (Lévitique 7:15).", ref: 'Lévitique 7:12-15 ; Nombres 6:13-20' },
        { id: 'pesach', he: 'קרבן פסח', fr: 'Sacrifice pascal (Korban Pessa\'h)', level: 'kal',
            cases: "Un agneau ou un chevreau mâle, abattu le 14 Nissan après le tamid de l'après-midi (Exode 12:5-6).",
            slaughter: "Partout dans la cour, en trois groupes qui entrent à tour de rôle ; on récite le Hallel pendant l'abattage (Pessa'him 5).",
            slaughterMark: 'court',
            blood: "Reçu dans des bassins que les cohanim se passent de main en main ; celui qui est près de l'autel le verse d'un seul coup sur le bas de la paroi (Pessa'him 5:6).", bloodMark: 'lower-once',
            residual: "Le texte n'en dit rien de plus.", residualMark: 'none',
            meat: "Rôti entier, sur une broche de bois de grenadier, jamais bouilli (Exode 12:8-9) ; mangé à Jérusalem par ceux qui s'y sont inscrits d'avance, avec la matsa et le maror.",
            eaten: 'jerusalem', deadline: 'pesach', deadlineText: "La nuit du 15 Nissan (la première nuit de Pessa'h), jusqu'à 'hatsot.", ref: 'Exode 12 ; Pessa\'him 5' },
        { id: 'bekhor', he: 'בכור ומעשר בהמה', fr: 'Premier-né et dîme du bétail', level: 'kal',
            cases: "Le premier-né pur d'un bœuf, d'une brebis ou d'une chèvre (Nombres 18:17), et la dîme du bétail (Lévitique 27:32).",
            slaughter: "N'importe où dans la cour.",
            slaughterMark: 'court',
            blood: "Le cohen le met, depuis un récipient et en une fois, sur le bas des parois de l'autel (Nombres 18:17).", bloodMark: 'lower-once',
            residual: "Le texte n'en dit rien de plus.", residualMark: 'none',
            meat: "Les graisses brûlent sur l'autel. Le premier-né revient aux cohanim, à leur famille et à leurs esclaves purs, à Jérusalem ; la dîme du bétail se mange par toute personne pure, à Jérusalem.",
            eaten: 'jerusalem', deadline: 'two', deadlineText: "Deux jours et la nuit entre les deux.", ref: 'Nombres 18:15-18 ; Lévitique 27:32-33' }
    ];

    function find(id) {
        for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
        return null;
    }
    function ofLevel(level) { return CATEGORIES.filter(function (c) { return c.level === level; }); }

    // Les repères du délai sur une ligne de temps de 0 à 220 : le jour de l'offrande [0, 80], la nuit [80, 140], le jour suivant [140, 220] ;
    // minuit est à 110. Renvoie la plage où l'on peut manger : [début, fin], ou null quand on ne mange pas.
    var TIMELINE = { day1: [0, 80], night: [80, 140], day2: [140, 220], midnight: 110, end: 220 };
    function eatingWindow(deadline) {
        if (deadline === 'midnight') return [TIMELINE.day1[0], TIMELINE.midnight];
        if (deadline === 'two') return [TIMELINE.day1[0], TIMELINE.end];
        if (deadline === 'pesach') return [TIMELINE.night[0], TIMELINE.midnight];
        return null;
    }

    return { LEVELS: LEVELS, CATEGORIES: CATEGORIES, BLOOD_MARKS: BLOOD_MARKS, RESIDUAL_MARKS: RESIDUAL_MARKS, DEADLINES: DEADLINES, SLAUGHTER_MARKS: SLAUGHTER_MARKS, EATEN: EATEN, TIMELINE: TIMELINE,
        find: find, ofLevel: ofLevel, eatingWindow: eatingWindow };
}));
