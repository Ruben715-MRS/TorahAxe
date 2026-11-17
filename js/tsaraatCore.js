// =========================================================================
// === TORAHAXE — TSARAAT : LES PARCOURS ET LE MODE « COHEN » (sans DOM) ===
// =========================================================================
// Les données sont dans js/tsaraatData.js ; l'écran est dans js/app/tsaraat.js. Ici, ce qui se calcule, testé dans tests/tsaraatCore.test.js :
//  - walk(support, choix) : rejouer un parcours (une suite de numéros d'options) et dire où il en est : question suivante ou verdict ;
//  - timeline(support, parcours) : les jours de la frise (0, 7, 14, 21) et le dernier jour atteint ;
//  - allPaths(support) : tous les parcours possibles, de la première question jusqu'à un verdict ;
//  - validate() : les contrôles de cohérence des arbres (aucune impasse, aucun cycle, tout est atteignable, les jours augmentent, les versets existent) ;
//  - makeCase(hasard) et checkCase(cas, choix) : le mode « Mets-toi à la place du cohen », un cas tiré au sort avec deux à quatre réponses.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./tsaraatData.js'));
    else root.TsaraatCore = factory(root.TsaraatData);
}(typeof self !== 'undefined' ? self : this, function (Data) {
    'use strict';

    var SUPPORT_BY_ID = {};
    Data.SUPPORTS.forEach(function (s) { SUPPORT_BY_ID[s.id] = s; });

    // Combien de versets compte chaque chapitre cité (Lévitique 13 et 14) : les `ref` sont vérifiées par les tests contre le texte hébreu.
    var VERSES = { 13: 59, 14: 57 };

    function isLeaf(node) { return !!node.verdict; }

    // Les versets cités par une `ref` : « 13:3, 13:10-11 » → [{ch: 13, from: 3, to: 3}, {ch: 13, from: 10, to: 11}].
    function parseRef(ref) {
        var out = [];
        var re = /(\d+):(\d+)(?:-(\d+))?/g;
        var m;
        while ((m = re.exec(String(ref || '')))) {
            out.push({ ch: Number(m[1]), from: Number(m[2]), to: Number(m[3] || m[2]) });
        }
        return out;
    }

    // Rejoue un parcours. `choices` : les numéros d'options choisis, dans l'ordre. Rend { steps, nodeId, node, done, error } :
    // `steps` : [{ nodeId, optionIndex }] ; `node` : le nœud où l'on en est (une question, ou une feuille avec `done: true`).
    function walk(supportId, choices) {
        var support = SUPPORT_BY_ID[supportId];
        if (!support) return { steps: [], nodeId: null, node: null, done: false, error: 'support' };
        var nodes = support.nodes;
        var nodeId = 'start';
        var steps = [];
        var list = choices || [];
        for (var i = 0; i < list.length; i++) {
            var node = nodes[nodeId];
            if (isLeaf(node)) return { steps: steps, nodeId: nodeId, node: node, done: true, error: 'trop de choix' };
            var opt = node.options[list[i]];
            if (!opt) return { steps: steps, nodeId: nodeId, node: node, done: false, error: 'option' };
            steps.push({ nodeId: nodeId, optionIndex: list[i] });
            nodeId = opt.to;
        }
        return { steps: steps, nodeId: nodeId, node: nodes[nodeId], done: isLeaf(nodes[nodeId]), error: null };
    }

    // La frise des jours : de 0 à `maxDay` de sept en sept ; `reached` : le dernier jour d'examen atteint par le parcours.
    function timeline(supportId, choices) {
        var support = SUPPORT_BY_ID[supportId];
        var marks = [];
        for (var d = 0; d <= support.maxDay; d += 7) marks.push(d);
        var w = walk(supportId, choices);
        var reached = 0;
        w.steps.forEach(function (s) {
            var n = support.nodes[s.nodeId];
            if (n.day > reached) reached = n.day;
        });
        if (!w.done && w.node && w.node.day > reached) reached = w.node.day;
        else if (w.done) {
            // Un verdict arrive au dernier examen : le jour du nœud précédent.
            var last = w.steps.length ? support.nodes[w.steps[w.steps.length - 1].nodeId] : null;
            if (last && last.day > reached) reached = last.day;
        }
        return { marks: marks, reached: reached, maxDay: support.maxDay };
    }

    // Tous les parcours d'un support, de la première question à un verdict : [{ choices: [...], leafId }].
    function allPaths(supportId) {
        var nodes = SUPPORT_BY_ID[supportId].nodes;
        var out = [];
        (function go(nodeId, choices) {
            var node = nodes[nodeId];
            if (isLeaf(node)) { out.push({ choices: choices, leafId: nodeId }); return; }
            node.options.forEach(function (opt, i) { go(opt.to, choices.concat([i])); });
        })('start', []);
        return out;
    }

    // Le résultat d'un choix, en une ligne : le verdict d'une feuille, ou ce que fait le cohen au nœud suivant.
    function outcomeLabel(supportId, nodeId) {
        var node = SUPPORT_BY_ID[supportId].nodes[nodeId];
        return isLeaf(node) ? node.short : node.action;
    }

    // Ce que voit le cohen, en une phrase : « La plaie s'est étendue » (le sujet du nœud, puis l'option) ou l'option seule.
    function observation(node, option) {
        var text = node.subject ? node.subject + ' ' + option.t : option.t;
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // --- Les contrôles de cohérence -----------------------------------------------------------------------------------------------
    // Rend la liste des problèmes (vide si tout est cohérent). Les tests exigent une liste vide.
    function validate() {
        var problems = [];
        function bad(id, msg) { problems.push(id + ' : ' + msg); }
        function checkRef(id, ref) {
            var cited = parseRef(ref);
            if (!cited.length) bad(id, 'source absente ou illisible (« ' + ref + ' »)');
            cited.forEach(function (c) {
                if (!VERSES[c.ch]) bad(id, 'chapitre ' + c.ch + ' hors Lévitique 13-14');
                else if (c.from < 1 || c.to < c.from || c.to > VERSES[c.ch]) bad(id, 'verset ' + c.ch + ':' + c.from + '-' + c.to + ' inexistant');
            });
        }
        Data.SUPPORTS.forEach(function (support) {
            var nodes = support.nodes;
            var sid = support.id;
            if (!nodes.start || isLeaf(nodes.start)) bad(sid, 'pas de première question');
            checkRef(sid, support.ref);
            var seen = {};
            var maxDay = 0;
            (function go(nodeId, from, stack) {
                var id = sid + '/' + nodeId;
                var node = nodes[nodeId];
                if (!node) { bad(id, 'nœud inconnu, cité depuis ' + from); return; }
                if (stack.indexOf(nodeId) >= 0) { bad(id, 'cycle'); return; }
                seen[nodeId] = true;
                checkRef(id, node.ref);
                if (isLeaf(node)) {
                    if (!Data.VERDICTS[node.verdict]) bad(id, 'verdict inconnu : ' + node.verdict);
                    if (!node.short || !node.text) bad(id, 'résultat sans texte');
                    if (!Array.isArray(node.todo) || !node.todo.length) bad(id, 'rien à faire indiqué');
                    return;
                }
                if (typeof node.day !== 'number') bad(id, 'jour absent');
                if (node.day > support.maxDay) bad(id, 'jour ' + node.day + ' au-delà du maximum ' + support.maxDay);
                if (node.day > maxDay) maxDay = node.day;
                if (!node.q || !node.action) bad(id, 'question ou action absente');
                if (!Array.isArray(node.options) || !node.options.length) { bad(id, 'impasse : aucune option'); return; }
                node.options.forEach(function (opt, i) {
                    var oid = id + '#' + i;
                    if (!opt.t) bad(oid, 'option sans texte');
                    checkRef(oid, opt.ref);
                    var next = nodes[opt.to];
                    if (next && !isLeaf(next) && next.day <= node.day) bad(oid, 'le jour n\'augmente pas (' + node.day + ' → ' + next.day + ')');
                    go(opt.to, nodeId, stack.concat([nodeId]));
                });
            })('start', '(départ)', []);
            Object.keys(nodes).forEach(function (nodeId) { if (!seen[nodeId]) bad(sid + '/' + nodeId, 'jamais atteint'); });
            if (maxDay !== support.maxDay) bad(sid, 'le dernier jour d\'examen est ' + maxDay + ', pas ' + support.maxDay);
        });
        return problems;
    }

    // --- Le mode « Mets-toi à la place du cohen » ----------------------------------------------------------------------------------
    // Un cas = un parcours tiré au hasard, arrêté à une décision : ce que le cohen a déjà vu (`story`), ce qu'il voit maintenant (`observation`), et
    // jusqu'à quatre réponses (la bonne et trois autres résultats possibles du même arbre). `random` : une fonction qui rend un nombre dans [0, 1[.
    function pick(list, random) { return list[Math.min(list.length - 1, Math.floor(random() * list.length))]; }

    function shuffle(list, random) {
        var a = list.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function makeCase(random, supportId) {
        var rnd = random || Math.random;
        var support = supportId ? SUPPORT_BY_ID[supportId] : pick(Data.SUPPORTS, rnd);
        var nodes = support.nodes;
        var path = pick(allPaths(support.id), rnd);
        // Les décisions possibles : les étapes du parcours qui offrent un vrai choix (au moins deux options).
        var decisions = [];
        var nodeId = 'start';
        path.choices.forEach(function (c, i) {
            if (nodes[nodeId].options.length > 1) decisions.push(i);
            nodeId = nodes[nodeId].options[c].to;
        });
        var at = pick(decisions, rnd);
        var story = [];
        nodeId = 'start';
        var current = null;
        for (var i = 0; i <= at; i++) {
            var node = nodes[nodeId];
            var opt = node.options[path.choices[i]];
            var entry = { day: node.day, text: observation(node, opt), q: node.q, ref: opt.ref, trad: !!opt.trad };
            if (i < at) story.push(entry); else current = { node: node, option: opt, entry: entry };
            nodeId = opt.to;
        }
        var answerLabel = outcomeLabel(support.id, current.option.to);
        // Les autres résultats possibles de l'arbre : les verdicts, et les étapes qui viennent plus tard que cette décision (jamais une étape déjà passée,
        // ni la première question). Un arbre court peut n'offrir que deux réponses, par exemple « pur ou métsora ? ».
        var pool = [];
        Object.keys(nodes).forEach(function (id) {
            if (isLeaf(nodes[id])) return;
            nodes[id].options.forEach(function (o) {
                var target = nodes[o.to];
                if (!isLeaf(target) && target.day <= current.node.day) return;
                var label = outcomeLabel(support.id, o.to);
                if (label !== answerLabel && pool.indexOf(label) < 0) pool.push(label);
            });
        });
        var labels = [answerLabel].concat(shuffle(pool, rnd).slice(0, 3));
        var choices = shuffle(labels, rnd);
        return {
            support: support.id, story: story, observation: current.entry.text, day: current.node.day, q: current.node.q,
            choices: choices, answer: choices.indexOf(answerLabel),
            leaf: isLeaf(nodes[current.option.to]) ? current.option.to : null,
            explain: {
                label: answerLabel, ref: current.option.ref, trad: !!current.option.trad,
                text: isLeaf(nodes[current.option.to]) ? nodes[current.option.to].text : nodes[current.option.to].action
            }
        };
    }

    function checkCase(kase, choice) { return choice === kase.answer; }

    return {
        SUPPORT_BY_ID: SUPPORT_BY_ID, VERSES: VERSES, isLeaf: isLeaf, parseRef: parseRef, walk: walk, timeline: timeline, allPaths: allPaths,
        outcomeLabel: outcomeLabel, observation: observation, validate: validate, makeCase: makeCase, checkCase: checkCase
    };
}));
