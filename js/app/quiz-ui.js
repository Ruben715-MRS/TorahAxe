// =========================================================================
// === TORAHAXE — ÉCRAN COMMUN DES JEUX À CHOIX MULTIPLES (pendant DOM de js/quizCore.js) ===
// =========================================================================
// Les trois jeux (« Mots du Tanakh » `lexgame`, « Mots de la Guémara » `gemgame`, « Maîtres et élèves » `trgame`) ont le même écran : réglages
// (`-setup`), question (`-play`), fin de partie (`-over`). Ce fichier fait ce qui est identique pour tous ; chaque jeu garde ce qui lui est propre
// (le texte de la question, la fiche après la réponse, ses réglages, sa mémoire). `p` est le préfixe des identifiants du jeu (`lexgame`…) ET des
// clés de traduction (`lexgame.status`, `lexgame.right`…). Tout ce qui vient des données passe par textContent, jamais par du HTML.
const QuizUI = (function () {
    'use strict';
    const $ = id => document.getElementById(id);

    // Montre une seule des trois phases : 'setup', 'play' ou 'over'. Le bandeau d'état se vide en dehors de la question.
    function phase(p, name) {
        ['setup', 'play', 'over'].forEach(n => $(p + '-' + n).classList.toggle('hidden', n !== name));
        if (name !== 'play') $(p + '-status').textContent = '';
    }

    // « Question 3 sur 10 — 200 points ».
    function status(p, g) {
        $(p + '-status').textContent = t(p + '.status', { n: g.index + 1, total: g.questions.length, score: g.score });
    }

    // Les boutons de réponse. `describe(option)` renvoie { label, lang } : lang 'he' (hébreu, de droite à gauche) ou 'num' (nombre) ; rien pour du français.
    // `onPick(i)` est appelé avec l'indice de la proposition choisie.
    function options(p, q, describe, onPick) {
        $(p + '-feedback').classList.add('hidden');
        const box = $(p + '-options');
        toolClear(box);
        q.options.forEach((option, i) => {
            const d = describe(option);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option cause-card lexgame-option';
            if (d.lang === 'he') { btn.lang = 'he'; btn.dir = 'rtl'; btn.classList.add('lexgame-option-he'); }
            if (d.lang === 'num') btn.classList.add('lexgame-option-num');
            btn.dataset.choice = String(i);
            btn.textContent = d.label;
            btn.setAttribute('aria-label', t(p + '.option_aria', { n: i + 1, label: d.label }));
            btn.onclick = () => onPick(i);
            box.appendChild(btn);
        });
    }

    // Après la réponse : le son, la bonne réponse en vert, la réponse choisie à tort en rouge, puis la fiche.
    // `info` : { line, extra?, note? } (textes bruts) ; `extra` est une ligne en plus (famille de la racine, détail du calcul).
    function resolve(p, g, q, choice, info) {
        const right = g.resolved === 'right';
        arcadeSound(right ? 'good' : 'bad');
        status(p, g);
        document.querySelectorAll('#' + p + '-options .lexgame-option').forEach(btn => {
            const i = Number(btn.dataset.choice);
            btn.disabled = true;
            if (i === q.answer) btn.classList.add('correct');
            else if (i === choice) btn.classList.add('wrong');
        });
        const feedback = $(p + '-feedback');
        feedback.classList.toggle('is-wrong', !right);
        $(p + '-feedback-title').textContent = t(p + (right ? '.right' : '.wrong'));
        $(p + '-feedback-text').textContent = info.line;
        const extra = $(p + '-feedback-extra');
        if (extra) {
            extra.textContent = info.extra || '';
            extra.classList.toggle('hidden', !info.extra);
        }
        const note = $(p + '-feedback-note');
        note.textContent = info.note || '';
        note.classList.toggle('hidden', !info.note);
        const next = $(p + '-next');
        next.textContent = t(p + (g.index + 1 >= g.questions.length ? '.finish' : '.next'));
        feedback.classList.remove('hidden');
        next.focus();
    }

    // Le mot ou la phrase en grand : hébreu (de droite à gauche) ou français.
    function word(p, text, french) {
        const el = $(p + '-word');
        el.textContent = text;
        el.lang = french ? 'fr' : 'he';
        el.dir = french ? 'ltr' : 'rtl';
        el.classList.toggle('is-french', !!french);
    }

    // Fin de partie : « 7 sur 10, 700 points. Meilleur score : … » ; `progressText` (facultatif) : le bilan de la mémoire.
    function finish(p, g, bestKey, progressText) {
        const best = arcadeRecord(bestKey, g.score);
        phase(p, 'over');
        $(p + '-over-text').textContent = t(p + '.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best[bestKey] });
        const prog = $(p + '-over-progress');
        if (prog) prog.textContent = progressText || '';
    }

    // La barre de progression des jeux à mémoire (« 47 mots sur 107 maîtrisés »).
    function progress(p, label, mastered, total) {
        $(p + '-progress-text').textContent = label;
        const bar = $(p + '-bar');
        bar.setAttribute('aria-valuemax', String(total));
        bar.setAttribute('aria-valuenow', String(mastered));
        $(p + '-bar-fill').style.width = (total ? Math.round(100 * mastered / total) : 0) + '%';
    }

    // Une rangée de boutons (sections) : `items` = [{ id, label }], `current` l'identifiant choisi, `onPick(id)`.
    function chips(p, items, current, onPick) {
        const holder = $(p + '-sections');
        toolClear(holder);
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool-history-chip';
            btn.id = p + '-section-' + item.id;
            btn.setAttribute('aria-pressed', item.id === current ? 'true' : 'false');
            btn.textContent = item.label;
            btn.onclick = () => onPick(item.id);
            holder.appendChild(btn);
        });
    }

    // Les réglages de l'appareil (JSON dans le stockage local) : lus sans jamais planter, écrits sans jamais bloquer.
    function loadPrefs(key) {
        try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
    }
    function savePrefs(key, prefs) {
        try { localStorage.setItem(key, JSON.stringify(prefs)); } catch (e) { /* stockage indisponible */ }
    }

    return { phase: phase, status: status, options: options, resolve: resolve, word: word, finish: finish, progress: progress, chips: chips, loadPrefs: loadPrefs, savePrefs: savePrefs };
})();
