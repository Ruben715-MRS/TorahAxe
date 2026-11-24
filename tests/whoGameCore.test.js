const test = require('node:test');
const assert = require('node:assert');
const Q = require('../js/quizCore.js');
const W = require('../js/whoGameCore.js');
const D = require('../js/whoData.js');
const Gemara = require('../js/gemaraCore.js');

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const person = id => W.PEOPLE.find(p => p.id === id);

test('quizCore : une manche à indices — coûts, dévoilement à zéro, une réponse déjà essayée ne compte pas', () => {
    const cfg = { start: 100, hintCost: 20, wrongCost: 20, maxHints: 5 };
    const s = Q.createState([{ id: 'a', options: [{}, {}] }, { id: 'b', options: [{}, {}] }], {});
    Q.resetRound(s, cfg);
    assert.deepStrictEqual(Q.roundHint(s, cfg), ['hint']);
    assert.strictEqual(s.points, 80);
    assert.deepStrictEqual(Q.roundGuess(s, 'x', false, cfg), ['wrong']);
    assert.deepStrictEqual(Q.roundGuess(s, 'x', false, cfg), []);
    assert.strictEqual(s.points, 60);
    assert.deepStrictEqual(Q.roundGuess(s, 'y', true, cfg), ['right']);
    assert.strictEqual(s.score, 60);
    assert.deepStrictEqual(Q.roundHint(s, cfg), []);
    Q.next(s); Q.resetRound(s, cfg);
    for (let i = 0; i < 4; i++) Q.roundHint(s, cfg);
    assert.strictEqual(s.points, 20);
    assert.deepStrictEqual(Q.roundGuess(s, 'z', false, cfg), ['wrong', 'revealed']);
    assert.strictEqual(s.resolved, 'revealed');
    assert.strictEqual(s.score, 60);
    assert.deepStrictEqual(s.results.map(r => [r.id, r.right, r.revealed, r.points]), [['a', true, false, 60], ['b', false, true, 0]]);
});

test('la Bible : vingt-neuf personnages, cinq indices chacun, identifiants et noms uniques', () => {
    assert.strictEqual(D.BIBLE.length, 29);
    assert.strictEqual(new Set(D.BIBLE.map(p => p.id)).size, 29);
    assert.strictEqual(new Set(D.BIBLE.map(p => p.fr)).size, 29);
    D.BIBLE.forEach(p => {
        assert.ok(p.he && ['m', 'f'].includes(p.sex) && p.grp, p.id);
        assert.strictEqual(p.clues.length, 5, p.id);
        assert.strictEqual(new Set(p.clues).size, 5, p.id + ' : indices distincts');
        p.clues.forEach(c => assert.ok(c.length > 15 && c.length < 230 && /[.»]$/.test(c), p.id + ' : ' + c));
    });
});

test('aucun indice ne contient le nom du personnage ni l\'un de ses autres noms (Bible et sages)', () => {
    W.PEOPLE.forEach(p => {
        assert.ok(W.namesOf(p).length >= 1, p.id);
        p.clues.forEach(c => assert.ok(!W.mentionsPerson(c, p), p.fr + ' se nomme dans : ' + c));
    });
});

test('les indices de la Bible parlent à la première personne ; les femmes accordent au féminin', () => {
    D.BIBLE.forEach(p => {
        const first = p.clues.filter(c => /\b(je|j’|j'|mon|ma|mes|me|m’|m')\b/i.test(c));
        assert.ok(first.length >= 4, p.id + ' : première personne');
    });
    const feminine = /(née|morte|emmenée|élevée|suivie|réintégrée|devenue|rachetée|stérile|aînée|cadette|donnée|prophétesse|reine|épouse|sœur|fille)/;
    D.BIBLE.filter(p => p.sex === 'f').forEach(p => assert.ok(p.clues.some(c => feminine.test(c)), p.id));
});

test('les sages : au moins une quarantaine, quatre indices au moins, la fiche en dernier, des phrases entières', () => {
    const sages = W.people('sages');
    assert.ok(sages.length >= 40, 'sages jouables : ' + sages.length);
    sages.forEach(p => {
        assert.ok(p.clues.length >= 4 && p.clues.length <= 5, p.fr);
        assert.match(p.clues[p.clues.length - 1], /^Ce que l’on dit de moi : /, p.fr);
        p.clues.forEach(c => {
            assert.ok(((c.match(/«/g) || []).length) === ((c.match(/»/g) || []).length), p.fr + ' : citation coupée : ' + c);
            assert.ok(!/\.\.$/.test(c), p.fr + ' : double point : ' + c);
        });
    });
    assert.ok(sages.some(p => p.fr === 'Hillel') && sages.some(p => p.fr === 'Rabbi Akiva'));
});

test('mentionsPerson : « Rav » n\'est pas reconnu dans « Rav Houna », mais bien seul ; « Rabbi Yehouda » ni dans « Rabbi Yehouda bar Ilaï »', () => {
    const rav = person('s:Rav'), hanasi = person('s:Rabbi Yehouda HaNasi');
    assert.strictEqual(W.mentionsPerson('Parmi mes disciples : Rav Houna, Rav Yehouda.', rav), false);
    assert.strictEqual(W.mentionsPerson('Rav a fondé l’académie de Soura.', rav), true);
    assert.strictEqual(W.mentionsPerson('Mon maître : Rabbi Yehouda bar Ilaï.', hanasi), false);
    assert.strictEqual(W.mentionsPerson('Rabbi Yehouda HaNasi a réuni la Michna.', hanasi), true);
    assert.strictEqual(W.mentionsPerson('Adam fut le premier.', person('adam')), true);
});

test('sentences : une citation « … ? … » n\'est pas coupée', () => {
    assert.deepStrictEqual(W.sentences('Avot 4:1 : « Qui est sage ? Celui qui apprend de tout homme ». Il vécut à Yavné.'), ['Avot 4:1 : « Qui est sage ? Celui qui apprend de tout homme ».', 'Il vécut à Yavné.']);
    assert.deepStrictEqual(W.sentences('Né v. 50. Mort v. 135.'), ['Né v. 50.', 'Mort v. 135.']);
});

test('makeQuestion : quatre noms distincts, la bonne réponse incluse, des fausses réponses de la même section et du même sexe', () => {
    for (let seed = 1; seed <= 40; seed++) {
        const rng = seeded(seed);
        W.PEOPLE.forEach(p => {
            if (seed > 3 && p.section === 'sages') return;
            const q = W.makeQuestion(p, rng);
            assert.strictEqual(q.options.length, 4);
            assert.strictEqual(new Set(q.options.map(o => o.id)).size, 4);
            assert.strictEqual(q.options[q.answer].id, p.id);
            q.options.forEach(o => assert.ok(/[א-ת]/.test(o.he), 'nom hébreu de ' + o.label));
            q.options.forEach(o => assert.strictEqual(person(o.id).section, p.section));
            if (p.section === 'bible') q.options.forEach(o => assert.strictEqual(person(o.id).sex, p.sex, p.fr + ' / ' + o.label));
        });
    }
});

test('createGame : cinq personnages distincts ; « tous » mêle la Bible et les sages', () => {
    const kinds = new Set();
    for (let seed = 1; seed <= 20; seed++) {
        const g = W.createGame({ section: 'all', rng: seeded(seed) });
        assert.strictEqual(g.questions.length, 5);
        assert.strictEqual(new Set(g.questions.map(q => q.id)).size, 5);
        g.questions.forEach(q => kinds.add(q.person.section));
        assert.strictEqual(g.questions.filter(q => q.person.section === 'bible').length, 3);
    }
    assert.deepStrictEqual([...kinds].sort(), ['bible', 'sages']);
    W.SECTIONS.filter(s => s !== 'all').forEach(section => W.createGame({ section, rng: seeded(2) }).questions.forEach(q => assert.strictEqual(q.person.section, section)));
});

test('une partie : 100 points au premier indice, 80, 60, 40, 20 ; une erreur vaut 0 point et dévoile ; bonne réponse = les points restants', () => {
    const adam = person('adam');
    const g = W.createGame({ questions: [W.makeQuestion(adam, seeded(1)), W.makeQuestion(person('noe'), seeded(2))] });
    assert.strictEqual(W.shownClues(g).length, 1);
    assert.strictEqual(g.points, 100);
    const q = W.question(g);
    assert.deepStrictEqual(W.hint(g), ['hint']); assert.strictEqual(g.points, 80);
    assert.deepStrictEqual(W.hint(g), ['hint']); assert.strictEqual(g.points, 60);
    assert.deepStrictEqual(W.hint(g), ['hint']); assert.strictEqual(g.points, 40);
    assert.deepStrictEqual(W.hint(g), ['hint']); assert.strictEqual(g.points, 20);
    assert.deepStrictEqual(W.hint(g), []);                          // cinq indices en tout, il n'y en a plus
    assert.strictEqual(W.shownClues(g).length, 5);
    const wrong = [0, 1, 2, 3].find(i => i !== q.answer);
    assert.deepStrictEqual(W.guess(g, wrong), ['wrong', 'revealed']);
    assert.strictEqual(g.resolved, 'revealed');
    assert.strictEqual(g.score, 0);
    assert.deepStrictEqual(W.next(g), []);
    assert.strictEqual(g.points, 100);
    assert.deepStrictEqual(W.guess(g, W.question(g).answer), ['right']);
    assert.strictEqual(g.score, 100);
    assert.deepStrictEqual(W.next(g), ['done']);
});

test('une seule réponse : une erreur dès le premier indice vaut 0 point (essayer les quatre noms ne rapporte rien)', () => {
    const g = W.createGame({ questions: [W.makeQuestion(person('david'), seeded(4)), W.makeQuestion(person('esther'), seeded(5))] });
    const q = W.question(g);
    const wrong = [0, 1, 2, 3].find(i => i !== q.answer);
    assert.deepStrictEqual(W.guess(g, wrong), ['wrong', 'revealed']);
    assert.strictEqual(g.points, 0);
    assert.strictEqual(g.resolved, 'revealed');
    assert.deepStrictEqual(W.guess(g, q.answer), []);               // plus de seconde chance
    assert.strictEqual(g.score, 0);
    assert.strictEqual(g.results[0].wrong, 1);
    // Au bout de trois indices (60 points), la bonne réponse rapporte 60.
    W.next(g);
    W.hint(g); W.hint(g);
    assert.deepStrictEqual(W.guess(g, W.question(g).answer), ['right']);
    assert.strictEqual(g.score, 60);
});

test('un sage à quatre indices : trois indices au plus', () => {
    const four = W.people('sages').find(p => p.clues.length === 4);
    const g = W.createGame({ questions: [W.makeQuestion(four, seeded(3))] });
    assert.deepStrictEqual([W.hint(g), W.hint(g), W.hint(g)].map(e => e.length), [1, 1, 1]);
    assert.deepStrictEqual(W.hint(g), []);
    assert.strictEqual(W.shownClues(g).length, 4);
    assert.strictEqual(g.points, 40);
});

test('une partie parfaite : 500 points', () => {
    const g = W.createGame({ section: 'all', rng: seeded(8) });
    while (!g.over) { W.guess(g, W.question(g).answer); W.next(g); }
    assert.strictEqual(g.score, 500);
});

test('chaque indice ne convient qu\'à une seule des quatre propositions : aucune fausse réponse ne partage un indice, une époque, un siècle ou un maître avec la bonne', () => {
    for (let seed = 1; seed <= 20; seed++) {
        const rng = seeded(seed);
        W.PEOPLE.forEach(p => {
            const q = W.makeQuestion(p, rng);
            assert.strictEqual(new Set(q.options.map(o => o.id)).size, 4, p.fr + ' : quatre propositions distinctes');
            q.options.forEach(o => {
                if (o.id === p.id) return;
                const other = person(o.id);
                assert.ok(!W.clashes(p, other), p.fr + ' / ' + other.fr + ' : un indice convient aux deux');
                if (p.section === 'sages') assert.notStrictEqual(other.grp, p.grp, p.fr + ' / ' + other.fr + ' : même époque, le premier indice ne départage pas');
            });
        });
    }
});
