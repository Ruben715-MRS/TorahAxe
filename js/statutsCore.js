// =========================================================================
// === TORAHAXE — STATUTS PERSONNELS : LE CALCULATEUR PÈRE + MÈRE → UNION ET ENFANT (sans DOM) ===
// =========================================================================
// Les données sont dans js/statutsData.js ; l'écran viendra dans js/app/. Ici, ce qui se calcule, testé dans tests/statutsCore.test.js :
//  - evaluate(père, mère) : l'union est-elle permise, à quel niveau d'interdit, les kidouchin prennent-ils, quel est le statut de l'enfant ;
//  - matrix() : les résultats de toutes les combinaisons (pour vérifier le tableau des règles d'un coup d'œil).
//
// Le raisonnement suit la Michna Kidouchin 3:12 et le Rambam (Issouré Biah) :
//  1. Une femme mariée à un autre est une 'erva : pas de kidouchin, l'enfant est mamzer (15:1) — sauf si le père est un non-Juif ou un esclave (15:3).
//  2. Entre un Juif et une non-Juive ou une esclave : pas de kidouchin, l'enfant suit sa mère (15:4).
//  3. Entre un non-Juif et une Juive : pas de kidouchin non plus, l'enfant suit sa mère, donc il est kasher (15:3) — mamzer si elle est mamzeret.
//  4. Entre deux Juifs, kidouchin valides : sans faute, l'enfant suit son père (19:15) ; avec une faute, il suit le côté diminué (15:7, 19:3).
//     Seuls les interdits du cohen (divorcée, zona, 'halala, convertie, 'halouça) et du mamzer font une « faute » dans ce calculateur.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./statutsData.js'));
    else root.StatutsCore = factory(root.StatutsData);
}(typeof self !== 'undefined' ? self : this, function (Data) {
    'use strict';

    var BY_ID = {};
    Data.STATUSES.forEach(function (s) { BY_ID[s.id] = s; });

    var FATHERS = Data.STATUSES.filter(function (s) { return s.father; });
    var MOTHERS = Data.STATUSES.filter(function (s) { return s.mother; });

    // Les Juifs (hommes ou femmes) dont le statut est un statut « de tribu » ou de naissance ; et les états propres aux femmes juives.
    var JEWISH_MEN = ['cohen', 'levi', 'israel', 'halal', 'ger', 'mamzer'];
    var JEWISH_WOMEN = JEWISH_MEN.concat(['gerushah', 'almanah', 'halutzah', 'zonah', 'eshet_ish']);

    // Les statuts qu'un cohen ne peut pas épouser (Lv 21:7) ; la 'halouça est à part (rabbinique).
    var COHEN_FORBIDDEN_TORAH = ['halal', 'ger', 'gerushah', 'zonah'];

    function has(list, id) { return list.indexOf(id) >= 0; }

    // Le libellé d'un statut, masculin ou féminin ; `female` vrai pour la forme féminine.
    function label(id, female) {
        var s = BY_ID[id];
        if (!s) return '';
        return (female && s.frF) ? s.frF : s.fr;
    }

    // Le libellé d'un statut d'enfant, en tenant compte du sexe inconnu : « Cohen / Bat cohen » quand les deux formes diffèrent.
    function childLabel(id) {
        var s = BY_ID[id];
        if (!s) return '';
        return (s.frF && s.frF !== s.fr) ? s.fr + ' / ' + s.frF : s.fr;
    }

    // Ce qui est dit de l'union et de l'enfant, comme une liste de raisons (identifiants de Data.REASONS) et de notes (identifiants de Data.NOTES).
    function result(f, m, parts) {
        return {
            father: f,
            mother: m,
            scope: parts.scope || 'union',
            union: parts.union || null,
            kiddushin: parts.kiddushin || null,
            rule: parts.rule || null,
            child: parts.child || null,
            notes: parts.notes || []
        };
    }

    function union(level, reasons) {
        return { allowed: level === 'permise', level: level, reasons: reasons };
    }

    // evaluate('cohen', 'gerushah') → l'union est interdite (lav), les kidouchin prennent, l'enfant est 'halal.
    // Renvoie null si un statut est inconnu ou ne peut pas être choisi pour ce rôle (une divorcée n'est pas un père).
    function evaluate(fatherId, motherId) {
        var f = BY_ID[fatherId];
        var m = BY_ID[motherId];
        if (!f || !f.father || !m || !m.mother) return null;

        var fJew = has(JEWISH_MEN, fatherId);
        var mJew = has(JEWISH_WOMEN, motherId);
        var notes = [];

        // 1. Deux personnes hors du peuple juif : aucune loi d'union juive.
        if (!fJew && !mJew) {
            return result(fatherId, motherId, { scope: 'hors-champ', notes: ['hors-champ'] });
        }

        // 2. Un non-Juif et une Juive : l'union est interdite, les kidouchin n'ont pas d'effet, l'enfant suit sa mère.
        if (!fJew && mJew) {
            if (motherId === 'eshet_ish') {
                notes.push('mere-zona');
                return result(fatherId, motherId, {
                    union: union('erva', ['union-eshet-ish', 'union-nochri']),
                    kiddushin: 'sans-effet', rule: 'mere',
                    child: { status: 'israel', reasons: ['enfant-eshet-ish-nochri'] },
                    notes: notes
                });
            }
            if (motherId !== 'zonah') notes.push('mere-zona');
            return result(fatherId, motherId, {
                union: union('lav', ['union-nochri']),
                kiddushin: 'sans-effet', rule: 'mere',
                child: { status: motherId === 'mamzer' ? 'mamzer' : 'israel', reasons: ['enfant-nochri-juive'] },
                notes: notes
            });
        }

        // 3. Un Juif et une non-Juive : même principe, l'enfant est non-Juif.
        if (fJew && motherId === 'nochri') {
            if (fatherId === 'cohen') notes.push('cohen-nochri');
            notes.push('enfant-converti');
            return result(fatherId, motherId, {
                union: union('lav', ['union-nochri']),
                kiddushin: 'sans-effet', rule: 'mere',
                child: { status: 'nochri', reasons: ['enfant-mere'] },
                notes: notes
            });
        }

        // 4. Un Juif et une shifha : interdit par les sages (par la Torah pour le cohen), permis au mamzer ; l'enfant est esclave.
        if (fJew && motherId === 'eved') {
            var u;
            if (fatherId === 'mamzer') u = union('permise', ['union-mamzer-shifha']);
            else if (fatherId === 'cohen') u = union('lav', ['union-cohen-shifha']);
            else u = union('rabbinique', ['union-shifha']);
            return result(fatherId, motherId, {
                union: u, kiddushin: 'sans-effet', rule: 'mere',
                child: { status: 'eved', reasons: ['enfant-mere'] },
                notes: ['enfant-affranchi']
            });
        }

        // 5. Un Juif et une femme mariée à un autre : 'erva, l'enfant est mamzer.
        if (motherId === 'eshet_ish') {
            return result(fatherId, motherId, {
                union: union('erva', ['union-eshet-ish']),
                kiddushin: 'sans-effet', rule: 'erva',
                child: { status: 'mamzer', reasons: ['enfant-erva'] },
                notes: notes
            });
        }

        // 6. Deux Juifs, kidouchin valides.
        var u2, child, childReasons, rule;

        if (fatherId === 'mamzer' || motherId === 'mamzer') {
            // Le mamzer et la mamzeret ne s'unissent qu'entre eux ou avec un guer / une guiyoret ; l'enfant est toujours mamzer.
            var ok = fatherId === 'mamzer' ? has(['mamzer', 'ger'], motherId) : fatherId === 'ger';
            u2 = ok ? union('permise', ['union-mamzer']) : union('lav', ['union-mamzer']);
            child = 'mamzer'; childReasons = ['enfant-pagoum']; rule = 'pagoum';
        } else if (fatherId === 'cohen' && has(COHEN_FORBIDDEN_TORAH, motherId)) {
            u2 = union('lav', ['union-cohen-femmes']);
            child = 'halal'; childReasons = ['enfant-halal']; rule = 'pagoum';
        } else if (fatherId === 'cohen' && motherId === 'halutzah') {
            u2 = union('rabbinique', ['union-cohen-halutzah']);
            child = 'halal'; childReasons = ['enfant-halal-rabbinique']; rule = 'pagoum';
        } else {
            u2 = union('permise', ['union-permise']);
            child = fatherId === 'ger' ? 'israel' : fatherId;
            childReasons = ['enfant-pere']; rule = 'pere';
        }

        if (fatherId === 'ger' && motherId === 'ger') notes.push('convertis-fille');
        if (fatherId === 'israel' && motherId === 'halal') notes.push('halal-fille-israel');
        if ((fatherId === 'halal' || fatherId === 'ger') && motherId === 'cohen') notes.push('bat-cohen-ger-halal');
        if (fatherId === 'cohen' && motherId === 'almanah') notes.push('almanah-cohen');

        return result(fatherId, motherId, {
            union: u2, kiddushin: 'valides', rule: rule,
            child: { status: child, reasons: childReasons },
            notes: notes
        });
    }

    // Les raisons et notes d'un résultat, avec leur texte et leur source, prêtes à afficher.
    function explain(res) {
        var out = { union: [], child: [], notes: [] };
        if (!res) return out;
        if (res.union) out.union = res.union.reasons.map(function (id) { return { id: id, fr: Data.REASONS[id].fr, ref: Data.REASONS[id].ref }; });
        if (res.child) out.child = res.child.reasons.map(function (id) { return { id: id, fr: Data.REASONS[id].fr, ref: Data.REASONS[id].ref }; });
        out.notes = res.notes.map(function (id) { return { id: id, fr: Data.NOTES[id].fr, ref: Data.NOTES[id].ref }; });
        return out;
    }

    // Toutes les combinaisons père × mère : [{ father, mother, result }].
    function matrix() {
        var out = [];
        FATHERS.forEach(function (f) {
            MOTHERS.forEach(function (m) { out.push({ father: f.id, mother: m.id, result: evaluate(f.id, m.id) }); });
        });
        return out;
    }

    return {
        BY_ID: BY_ID, FATHERS: FATHERS, MOTHERS: MOTHERS, JEWISH_MEN: JEWISH_MEN, JEWISH_WOMEN: JEWISH_WOMEN,
        label: label, childLabel: childLabel, evaluate: evaluate, explain: explain, matrix: matrix
    };
}));
