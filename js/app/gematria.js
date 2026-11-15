// =========================================================================
// === GUÉMATRIA (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// On tape un mot hébreu : chaque lettre s'affiche avec sa valeur dessous (comme les chiffres romains), puis l'addition. Quatre modes de calcul
// (standard, katan, milui, atbash) et, en options, le mispar gadol (lettres finales à 500–900) et la réduction à un chiffre. Les calculs sont dans js/gematriaCore.js (pur, testé) ; les textes
// sous `tools.gematria_*` de ui/fr.json. Tout ce qui vient de la saisie passe par textContent, jamais par du HTML.

let gematriaMode = 'standard';

function toolGematriaInit() {
    toolGematriaRender();
}

function toolGematriaPick(mode) {
    gematriaMode = GematriaCore.MODES.indexOf(mode) >= 0 ? mode : 'standard';
    toolGematriaRender();
}

// Les boutons des quatre modes, puis le résultat.
function toolGematriaRender() {
    const tabs = toolEl('tool-gematria-modes');
    toolClear(tabs);
    GematriaCore.MODES.forEach(mode => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-gematria-mode-' + mode;
        btn.setAttribute('aria-pressed', mode === gematriaMode ? 'true' : 'false');
        btn.textContent = t('tools.gematria_mode_' + mode);
        btn.onclick = () => toolGematriaPick(mode);
        tabs.appendChild(btn);
    });
    toolEl('tool-gematria-help').textContent = t('tools.gematria_help_' + gematriaMode);
    toolGematriaUpdate();
}

function gematriaChip(letter, mode) {
    const chip = document.createElement('span');
    chip.className = 'tool-chip gem-chip';
    chip.setAttribute('role', 'listitem');
    const glyph = document.createElement('strong');
    glyph.lang = 'he';
    glyph.textContent = letter.char;
    chip.appendChild(glyph);
    // Atbash : la lettre en miroir ; milui : le nom de la lettre écrit en toutes lettres. La valeur vient en dernier, dessous.
    if (letter.via) {
        const via = document.createElement('small');
        via.className = 'gem-via';
        via.lang = 'he';
        via.textContent = (mode === 'atbash' ? '→ ' : '') + letter.via;
        chip.appendChild(via);
    }
    const value = document.createElement('small');
    value.className = 'gem-value';
    value.textContent = String(letter.value);
    chip.appendChild(value);
    chip.setAttribute('aria-label', letter.char + ' : ' + letter.value);
    return chip;
}

function toolGematriaUpdate() {
    const msg = toolEl('tool-gematria-msg');
    const result = toolEl('tool-gematria-result');
    result.classList.add('hidden');
    msg.textContent = '';
    const text = toolEl('tool-gematria-input').value;
    // Le mispar gadol ne change rien à l'atbash : la case est alors grisée, avec son explication.
    const gadolBox = toolEl('tool-gematria-gadol');
    gadolBox.disabled = gematriaMode === 'atbash';
    toolEl('tool-gematria-gadol-note').textContent = gadolBox.disabled ? t('tools.gematria_gadol_atbash') : (gadolBox.checked ? t('tools.gematria_gadol_help') : '');
    const calc = GematriaCore.compute(text, gematriaMode, toolEl('tool-gematria-reduce').checked, gadolBox.checked);
    if (!calc.letters.length) {
        msg.textContent = t(text.trim() ? 'tools.gematria_none' : 'tools.gematria_empty');
        return;
    }
    if (calc.ignored) msg.textContent = t('tools.gematria_ignored', { n: calc.ignored });
    result.classList.remove('hidden');
    toolEl('tool-gematria-big').textContent = String(calc.reduced ? calc.reduced[calc.reduced.length - 1] : calc.total);

    // Les lettres, mot par mot : un groupe par mot, pour que l'œil voie où il commence.
    const holder = toolEl('tool-gematria-parts');
    toolClear(holder);
    let word = null;
    calc.letters.forEach(letter => {
        if (letter.startsWord || !word) {
            word = document.createElement('span');
            word.className = 'gem-word';
            word.setAttribute('role', 'presentation');
            holder.appendChild(word);
        }
        word.appendChild(gematriaChip(letter, calc.mode));
    });

    // L'addition, dans l'ordre de lecture (de droite à gauche) : « 300 + 30 + 6 + 40 = 376 ».
    toolEl('tool-gematria-sum').textContent = calc.letters.map(l => l.value).join(' + ') + ' = ' + calc.total;
    toolEl('tool-gematria-reduced').textContent = calc.reduced && calc.reduced.length > 1
        ? t('tools.gematria_sum_reduced', { steps: calc.reduced.join(' → ') })
        : '';
}
