// =========================================================================
// === COMMANDEMENTS BIBLIQUES (écran de l'Atelier) ===
// =========================================================================
// Quatre listes, dans l'ordre — les sept lois de Noé, les dix commandements, les trente-neuf travaux du Chabbat, les 613 commandements — avec des
// boutons pour passer de l'une à l'autre. Chaque élément a son numéro, son nom, sa source et son explication ; chaque liste a un chapeau et des
// « à savoir ». La structure est dans js/commandmentsCore.js, les textes dans ui/fr.json (`tools.cmd_*`). Les 613 (js/commandments613Data.js) ont
// deux sous-listes, positifs et négatifs, regroupées par thème, et une recherche. Tout passe par textContent, jamais par du HTML.

let commandmentsSet = 'noah';
let commandments613Kind = 'all';
let commandments613Query = '';
// Le bouton « A / א » (comme sur la généalogie) : les noms hébreux en transcription (« A », par défaut) ou en lettres hébraïques (« א »).
let commandmentsLang = 'fr';
try { if (localStorage.getItem('commandmentsLang') === 'he') commandmentsLang = 'he'; } catch (e) { /* stockage indisponible : « A » */ }

function cmdText(key) { return t(key.indexOf('tools.') === 0 ? key : 'tools.' + key); }

// Profil « Femme » : à la première ouverture de l'écran dans la séance, il s'ouvre sur l'onglet des mitsvot des femmes (un autre choix ensuite est respecté).
let commandmentsProfileApplied = false;

function toolCommandmentsInit() {
    if (!commandmentsProfileApplied) {
        commandmentsProfileApplied = true;
        if (typeof profileGender === 'function' && profileGender() === 'f') commandmentsSet = 'femmes';
    }
    renderCommandments();
}

function commandmentsSetLang(lang) {
    commandmentsLang = lang === 'he' ? 'he' : 'fr';
    try { localStorage.setItem('commandmentsLang', commandmentsLang); } catch (e) { /* stockage indisponible */ }
    renderCommandments();
}

// Un texte en lettres hébraïques : lu de droite à gauche, avec la langue déclarée pour les lecteurs d'écran.
function cmdHebrew(el, text) {
    el.lang = 'he';
    el.dir = 'rtl';
    el.textContent = text;
    return el;
}

function toolCommandmentsPick(setId) {
    commandmentsSet = setId;
    renderCommandments();
    const screen = toolEl('screen-tool-commandments');
    if (screen) screen.scrollTop = 0;
}

function renderCommandments() {
    const set = CommandmentsCore.getSet(commandmentsSet);
    const tabs = toolEl('tool-commandments-tabs');
    toolClear(tabs);
    CommandmentsCore.SETS.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-commandments-tab-' + s.id;
        btn.setAttribute('aria-pressed', s.id === set.id ? 'true' : 'false');
        btn.textContent = s.icon + ' ' + cmdText('commandments_tab_' + s.id);
        btn.onclick = () => toolCommandmentsPick(s.id);
        tabs.appendChild(btn);
    });

    // Le bouton « A / א » : sans objet pour les 613, dont les énoncés sont en français.
    toolEl('tool-commandments-lang').parentNode.classList.toggle('hidden', set.kind === 'list613');
    toolEl('tool-commandments-lang-fr').setAttribute('aria-pressed', commandmentsLang === 'fr' ? 'true' : 'false');
    toolEl('tool-commandments-lang-he').setAttribute('aria-pressed', commandmentsLang === 'he' ? 'true' : 'false');
    const hebrew = commandmentsLang === 'he' && set.kind !== 'list613';

    const body = toolEl('tool-commandments-body');
    toolClear(body);

    const head = document.createElement('header');
    head.className = 'cmd-head';
    const h = document.createElement('h3');
    h.className = 'tool-h cmd-title';
    h.textContent = cmdText('cmd_' + set.id + '_title');
    const sub = document.createElement('p');
    sub.className = 'cmd-subtitle';
    if (hebrew) cmdHebrew(sub, cmdText('cmd_' + set.id + '_he'));
    else sub.textContent = cmdText('cmd_' + set.id + '_subtitle');
    const lead = document.createElement('p');
    lead.className = 'tool-small';
    lead.textContent = cmdText('cmd_' + set.id + '_lead');
    head.append(h, sub, lead);
    body.appendChild(head);

    // Ce qui a quitté cet écran (parachiot, méguilot, Michna, Pirkei Avot) a sa place ailleurs : des renvois, pas des doublons.
    const also = document.createElement('div');
    also.className = 'tool-history-chips';
    also.setAttribute('role', 'group');
    also.setAttribute('aria-label', cmdText('cmd_see_also'));
    // Les principes de foi 12 et 13 (le Machiah, la résurrection) ont leur écran.
    const seeAlso = [['tanakh', '📘'], ['library', '📚'], ['transmission', '🔗']];
    if (set.id === 'principes') seeAlso.push(['messiah', '👑']);
    seeAlso.forEach(([tool, icon]) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'tool-history-chip';
        chip.id = 'tool-commandments-see-' + tool;
        chip.textContent = icon + ' ' + cmdText('cmd_see_' + tool);
        chip.onclick = () => openTool(tool, 'screen-tool-commandments');
        also.appendChild(chip);
    });
    body.appendChild(also);

    if (set.themeMenu) body.appendChild(sectionThemeMenu(set));

    if (set.kind === 'list613') render613(body, set);

    // Les éléments, par groupe. Les numéros courent d'un groupe à l'autre.
    let number = 0;
    set.groups.forEach(group => {
        if (set.restartPerGroup && !group.continues) number = 0; // chaque thème recommence à 1, sauf la suite d'un thème
        const section = document.createElement('section');
        section.className = group.continues ? 'cmd-group cmd-group-complement' : 'cmd-group';
        section.id = 'cmd-group-' + set.id + '-' + group.id;
        if (set.groups.length > 1) {
            const gh = document.createElement('h4');
            gh.className = 'cmd-group-title';
            gh.textContent = cmdText('cmd_' + set.id + '_group_' + group.id);
            section.appendChild(gh);
            // Le résumé du thème, sous son titre, quand il existe (les six ordres de la Michna).
            const sumKey = 'tools.cmd_' + set.id + '_group_' + group.id + '_summary';
            if (t(sumKey) !== sumKey) {
                const sum = document.createElement('p');
                sum.className = 'tool-small cmd-group-summary';
                sum.textContent = t(sumKey);
                section.appendChild(sum);
            }
        }
        const list = document.createElement('ol');
        list.className = 'cmd-list';
        list.start = number + 1;
        group.items.forEach(itemId => {
            number++;
            const item = commandmentItem(set.id, itemId, hebrew, !group.hideRefs);
            if (set.id === 'femmes' && itemId === 'hallah') item.appendChild(hallahCalculator());
            if (set.id === 'femmes' && itemId === 'nidda' && typeof profileGender === 'function' && profileGender() === 'f') item.appendChild(niddaCalculator());
            list.appendChild(item);
        });
        section.appendChild(list);
        body.appendChild(section);
    });

    // À savoir.
    const know = document.createElement('section');
    know.className = 'cmd-know';
    const kh = document.createElement('h4');
    kh.className = 'cmd-group-title';
    kh.textContent = cmdText('commandments_know');
    know.appendChild(kh);
    const kl = document.createElement('ul');
    kl.className = 'cmd-know-list';
    for (let i = 1; ; i++) {
        const key = 'cmd_' + set.id + '_know_' + i;
        const text = cmdText(key);
        if (!text || text === 'tools.' + key) break; // la clé n'existe pas : plus de « à savoir »
        const li = document.createElement('li');
        li.textContent = text;
        kl.appendChild(li);
    }
    know.appendChild(kl);
    body.appendChild(know);

    const note = document.createElement('p');
    note.className = 'tool-small cmd-note';
    note.textContent = cmdText('commandments_tradition');
    body.appendChild(note);

    // Les boutons pour passer à la liste d'avant ou d'après.
    const nav = document.createElement('div');
    nav.className = 'cmd-nav';
    [[-1, 'commandments_prev', '‹ '], [1, 'commandments_next', ' ›']].forEach(([step, labelKey, deco]) => {
        const other = CommandmentsCore.neighbor(set.id, step);
        if (!other) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn cmd-nav-btn';
        const small = document.createElement('small');
        small.textContent = cmdText(labelKey);
        const name = document.createElement('strong');
        name.textContent = step < 0 ? deco + cmdText('commandments_tab_' + other.id) : cmdText('commandments_tab_' + other.id) + deco;
        btn.append(small, name);
        btn.onclick = () => toolCommandmentsPick(other.id);
        nav.appendChild(btn);
    });
    body.appendChild(nav);
}

// --- Les 613 : tous, positifs ou négatifs ; un menu de thèmes ; une recherche ; des regroupements par thème ---------------------------------
function render613(body, set) {
    const intro = document.createElement('div');
    intro.className = 'cmd-613-controls';

    const kinds = document.createElement('div');
    kinds.className = 'tool-history-chips';
    kinds.setAttribute('role', 'group');
    kinds.setAttribute('aria-label', cmdText('cmd_mitzvot_kind_aria'));
    ['all', 'pos', 'neg'].forEach(kind => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-commandments-kind-' + kind;
        btn.setAttribute('aria-pressed', kind === commandments613Kind ? 'true' : 'false');
        btn.textContent = cmdText('cmd_' + set.id + '_' + kind);
        btn.onclick = () => {
            commandments613Kind = kind;
            kinds.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
            update613();
        };
        kinds.appendChild(btn);
    });

    const lead = document.createElement('p');
    lead.className = 'tool-small';
    lead.id = 'tool-commandments-kind-lead';

    // Le menu des thèmes : on y choisit où aller, la liste reste entière. Ses options suivent le choix (tous, positifs ou négatifs).
    const theme = document.createElement('select');
    theme.id = 'tool-commandments-theme';
    theme.className = 'tool-input';
    theme.setAttribute('aria-label', cmdText('cmd_mitzvot_theme_label'));
    theme.onchange = () => {
        const target = theme.value && document.getElementById(theme.value);
        if (target) {
            const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
        }
        theme.value = ''; // pour pouvoir choisir deux fois de suite le même thème
    };

    const search = document.createElement('input');
    search.type = 'search';
    search.id = 'tool-commandments-search';
    search.className = 'tool-input';
    search.autocomplete = 'off';
    search.value = commandments613Query;
    search.placeholder = cmdText('cmd_mitzvot_search_placeholder');
    search.setAttribute('aria-label', cmdText('cmd_mitzvot_search_label'));
    search.oninput = () => { commandments613Query = search.value; update613(); };

    const count = document.createElement('p');
    count.className = 'tool-small';
    count.id = 'tool-commandments-count';
    count.setAttribute('role', 'status');
    intro.append(kinds, lead, theme, search, count);
    body.appendChild(intro);

    const host = document.createElement('div');
    host.id = 'tool-commandments-613';
    host.className = 'cmd-613-list';
    body.appendChild(host);
    update613();
}

function update613() {
    const host = toolEl('tool-commandments-613');
    if (!host) return;
    toolClear(host);
    const kind = commandments613Kind;
    const kinds = CommandmentsCore.kindsOf(kind);
    toolEl('tool-commandments-kind-lead').textContent = cmdText('cmd_mitzvot_' + kind + '_lead');
    const total = CommandmentsCore.list613(kind).length;
    const found = CommandmentsCore.search613(kind, commandments613Query);
    toolEl('tool-commandments-count').textContent = !found.length ? cmdText('cmd_mitzvot_none')
        : found.length === 1 ? t('tools.cmd_mitzvot_count_one', { total: total })
            : t('tools.cmd_mitzvot_count', { shown: found.length, total: total });

    // Le menu : un seul choix de liste → les thèmes ; « tous » → les thèmes des positifs puis ceux des négatifs, sous deux intitulés.
    // Avec une recherche, seuls les thèmes où il reste des commandements (les autres ne sont pas affichés, on ne pourrait pas y aller).
    const theme = toolEl('tool-commandments-theme');
    toolClear(theme);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = cmdText('cmd_mitzvot_theme_placeholder');
    theme.appendChild(placeholder);

    kinds.forEach(k => {
        const outer = kinds.length > 1 ? document.createElement('optgroup') : theme;
        if (kinds.length > 1) outer.label = cmdText('cmd_mitzvot_kind_title_' + k);
        const kindItems = found.filter(c => c.kind === k);
        if (kinds.length > 1 && kindItems.length) {
            const kh = document.createElement('h3');
            kh.className = 'tool-h cmd-kind-title';
            kh.textContent = cmdText('cmd_mitzvot_kind_title_' + k);
            host.appendChild(kh);
        }
        CommandmentsCore.LISTS613[k].groups.forEach(group => {
            const items = kindItems.filter(c => c.group === group.id);
            if (!items.length) return;
            const title = cmdText('cmd_mitzvot_' + k + '_group_' + group.id);
            const sectionId = 'cmd-613-group-' + k + '-' + group.id;

            const option = document.createElement('option');
            option.value = sectionId;
            option.textContent = title;
            outer.appendChild(option);

            const section = document.createElement('section');
            section.className = 'cmd-group';
            section.id = sectionId;
            const gh = document.createElement('h4');
            gh.className = 'cmd-group-title';
            gh.textContent = title + ' (' + t('tools.cmd_mitzvot_range', { from: group.from, to: group.to }) + ')';
            section.appendChild(gh);
            const list = document.createElement('ol');
            list.className = 'cmd-list';
            items.forEach(c => {
                const li = document.createElement('li');
                li.className = 'cmd-item';
                li.value = c.n; // le numéro affiché est celui du commandement, même quand la recherche en cache
                li.id = 'cmd-613-' + c.kind + '-' + c.n;
                const name = document.createElement('strong');
                name.className = 'cmd-name';
                name.textContent = c.text;
                const r = document.createElement('p');
                r.className = 'cmd-ref';
                const label = document.createElement('span');
                label.textContent = cmdText('commandments_source') + ' : ';
                r.append(label, document.createTextNode(c.ref));
                li.append(name, r);
                list.appendChild(li);
            });
            section.appendChild(list);
            host.appendChild(section);
        });
        if (kinds.length > 1 && outer.children.length) theme.appendChild(outer);
    });
}

// Un menu déroulant par thème, pour une liste faite de petites sous-listes : on y va directement, sans cacher les autres.
function sectionThemeMenu(set) {
    const select = document.createElement('select');
    select.id = 'tool-commandments-theme-' + set.id;
    select.className = 'tool-input';
    select.setAttribute('aria-label', cmdText('cmd_mitzvot_theme_label'));
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = cmdText('cmd_mitzvot_theme_placeholder');
    select.appendChild(placeholder);
    set.groups.filter(group => group.menu !== false).forEach(group => {
        const option = document.createElement('option');
        option.value = 'cmd-group-' + set.id + '-' + group.id;
        option.textContent = cmdText('cmd_' + set.id + '_group_' + group.id);
        select.appendChild(option);
    });
    select.onchange = () => {
        const target = select.value && document.getElementById(select.value);
        if (target) {
            const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
        }
        select.value = ''; // pour pouvoir choisir deux fois de suite le même thème
    };
    return select;
}

function commandmentItem(setId, itemId, hebrew, showRef = true) {
    const key = field => CommandmentsCore.itemKey(setId, itemId, field);
    const li = document.createElement('li');
    li.className = 'cmd-item';
    li.id = 'cmd-' + setId + '-' + itemId;

    const name = document.createElement('strong');
    name.className = 'cmd-name';
    name.textContent = cmdText(key('name'));
    li.appendChild(name);

    // Sous le nom : sa transcription (travaux du Chabbat) ou, avec « א », le nom en lettres hébraïques.
    if (hebrew) {
        li.appendChild(cmdHebrew(Object.assign(document.createElement('span'), { className: 'cmd-heb' }), cmdText(key('he'))));
        // Le passage complet en hébreu, en petits caractères, quand il existe (les douze Psoukim).
        const full = t(key('full'));
        if (full && full !== key('full')) li.appendChild(cmdHebrew(Object.assign(document.createElement('p'), { className: 'cmd-full' }), full));
    } else if (CommandmentsCore.fieldsOf(setId).indexOf('heb') >= 0) {
        const heb = document.createElement('em');
        heb.className = 'cmd-heb';
        heb.textContent = cmdText(key('heb'));
        li.appendChild(heb);
    }

    const text = document.createElement('p');
    text.className = 'tool-small cmd-text';
    text.textContent = cmdText(key('text'));
    li.appendChild(text);

    // Les conditions de la peine (témoins, avertissement…), quand l'élément en a.
    const cond = t(key('cond'));
    if (cond && cond !== key('cond')) {
        const c = document.createElement('p');
        c.className = 'cmd-ref';
        const clabel = document.createElement('span');
        clabel.textContent = cmdText('commandments_cond') + ' : ';
        c.append(clabel, document.createTextNode(cond));
        li.appendChild(c);
    }

    const ref = showRef && cmdText(key('ref'));
    if (ref) {
        const r = document.createElement('p');
        r.className = 'cmd-ref';
        const label = document.createElement('span');
        label.textContent = cmdText('commandments_source') + ' : ';
        r.append(label, document.createTextNode(ref));
        li.appendChild(r);
    }
    return li;
}


// --- Hafrachat halla : le calcul d'après le poids de farine (js/hallahCore.js) -----------------------------------------------------------------------
function hallahCalculator() {
    const box = document.createElement('div');
    box.className = 'cmd-hallah';
    box.id = 'cmd-hallah-calc';
    const h = document.createElement('strong');
    h.className = 'cmd-name';
    h.textContent = t('hallah.title');
    const row = document.createElement('div');
    row.className = 'cmd-hallah-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'cmd-hallah-input';
    input.setAttribute('aria-label', t('hallah.weight'));
    input.placeholder = t('hallah.weight');
    let unit = 'kg';
    const seg = document.createElement('div');
    seg.className = 'segmented cmd-hallah-unit';
    seg.setAttribute('role', 'group');
    const out = document.createElement('div');
    out.setAttribute('aria-live', 'polite');
    const render = () => {
        out.textContent = '';
        const level = HallahCore.assess(HallahCore.toGrams(input.value, unit));
        if (!level) { const p = document.createElement('p'); p.className = 'tool-small'; p.textContent = t('hallah.hint'); out.appendChild(p); return; }
        const r = document.createElement('p');
        r.className = 'cmd-hallah-result';
        r.textContent = t('hallah.r_' + level);
        out.appendChild(r);
        if (level === 'none') return;
        const how = document.createElement('p'); how.className = 'tool-small'; how.textContent = t('hallah.how'); out.appendChild(how);
        // Chaque texte à part : l'hébreu, la phonétique (en italique), puis le français, séparés et aérés.
        const block = (title, he, tr, fr) => {
            const b = document.createElement('div');
            b.className = 'cmd-hallah-block';
            if (title) { const h3 = document.createElement('strong'); h3.className = 'cmd-name'; h3.textContent = title; b.appendChild(h3); }
            b.appendChild(cmdHebrew(Object.assign(document.createElement('p'), { className: 'cmd-hallah-he' }), he));
            const e = document.createElement('p'); e.className = 'cmd-hallah-tr'; const em = document.createElement('em'); em.textContent = tr; e.appendChild(em); b.appendChild(e);
            if (fr) { const f = document.createElement('p'); f.className = 'cmd-hallah-fr'; f.textContent = fr; b.appendChild(f); }
            return b;
        };
        if (level !== 'noBless') out.appendChild(block(t('hallah.bless_title'), t('hallah.bless_he'), t('hallah.bless_tr'), t('hallah.bless_fr')));
        out.appendChild(block(t('hallah.say_title'), t('hallah.say_he'), t('hallah.say_tr'), t('hallah.say_fr')));
    };
    [['kg', 'hallah.unit_kg'], ['g', 'hallah.unit_g']].forEach(([id, key]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t(key);
        b.className = id === unit ? 'active' : '';
        b.setAttribute('aria-pressed', id === unit ? 'true' : 'false');
        b.onclick = () => { unit = id; Array.prototype.forEach.call(seg.children, el => { const on = el === b; el.className = on ? 'active' : ''; el.setAttribute('aria-pressed', on ? 'true' : 'false'); }); render(); };
        seg.appendChild(b);
    });
    input.oninput = render;
    row.append(input, seg);
    const note = document.createElement('p');
    note.className = 'tool-small';
    note.textContent = t('hallah.note');
    box.append(h, row, out, note);
    render();
    return box;
}

// --- Pureté familiale (nidda) : les dates clés d'après les dates saisies (js/niddaCore.js). Profil Femme seulement. Tout reste sur l'appareil ------------
// Stockage (clé v2) : { starts : [{ date, ona }] (historique des débuts de flux, seulement si les vestot sont activées), last, hefsek, usage, note, vestot }.
// La clé v1 ({ onset, last }) est reprise au premier usage. Rien n'est envoyé.
const NIDDA_KEY = 'torahaxe_nidda_v2';
const NIDDA_KEY_V1 = 'torahaxe_nidda_v1';
function niddaEmpty() { return { starts: [], last: '', hefsek: '', usage: '', note: false, vestot: false }; }
function niddaLoad() {
    try {
        const raw = JSON.parse(localStorage.getItem(NIDDA_KEY) || 'null');
        if (raw && typeof raw === 'object') return Object.assign(niddaEmpty(), raw);
        const old = JSON.parse(localStorage.getItem(NIDDA_KEY_V1) || 'null');
        if (old && old.onset) return Object.assign(niddaEmpty(), { starts: [{ date: old.onset, ona: 'day' }], last: old.last || '' });
    } catch (e) { /* stockage illisible : on repart de zéro */ }
    return niddaEmpty();
}
function niddaSave(v) { try { localStorage.setItem(NIDDA_KEY, JSON.stringify(v)); } catch (e) { /* stockage indisponible : les dates ne sont pas gardées */ } }
function niddaFr(iso) {
    const n = NiddaCore.dayNumber(iso);
    return n === null ? '' : new Date(n * 86400000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}
function niddaCalculator() {
    const data = niddaLoad();
    const box = document.createElement('div');
    box.className = 'cmd-hallah cmd-nidda';
    box.id = 'cmd-nidda-calc';
    const h = document.createElement('strong');
    h.className = 'cmd-name';
    h.textContent = t('nidda.title');
    const note = document.createElement('p');
    note.className = 'tool-small';
    note.textContent = t('nidda.note');
    box.appendChild(h);

    // 1. L'usage : aucun choix imposé. Tant qu'il n'est pas choisi, les deux dates sont données.
    const usageBox = document.createElement('div');
    usageBox.className = 'cmd-nidda-usage segmented';
    usageBox.setAttribute('role', 'group');
    usageBox.setAttribute('aria-label', t('nidda.usage_title'));
    const usageBtns = {};
    ['ashk', 'sef'].forEach(u => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t('nidda.usage_' + u);
        b.onclick = () => { data.usage = data.usage === u ? '' : u; niddaSave(data); paint(); };
        usageBtns[u] = b;
        usageBox.appendChild(b);
    });
    const usageHint = document.createElement('p');
    usageHint.className = 'tool-small';
    box.append(usageBox, usageHint);

    // 2. Le cycle : début, dernier jour vu, hefsek.
    const fields = document.createElement('div');
    fields.className = 'cmd-nidda-fields';
    const field = (label, type, value) => {
        const l = document.createElement('label');
        l.className = 'cmd-nidda-field';
        const s = document.createElement('span');
        s.className = 'tool-small';
        s.textContent = label;
        const i = document.createElement('input');
        i.type = type;
        i.className = type === 'date' ? 'cmd-hallah-input' : 'cmd-hallah-input cmd-nidda-ona';
        i.value = value || '';
        l.append(s, i);
        fields.appendChild(l);
        return i;
    };
    const cur = () => data.starts[data.starts.length - 1] || null;
    const onset = field(t('nidda.onset'), 'date', cur() ? cur().date : '');
    const ona = document.createElement('select');
    ona.className = 'cmd-hallah-input cmd-nidda-ona';
    ona.setAttribute('aria-label', t('nidda.ona'));
    [['day', 'nidda.ona_day'], ['night', 'nidda.ona_night']].forEach(([v, k]) => { const o = document.createElement('option'); o.value = v; o.textContent = t(k); ona.appendChild(o); });
    ona.value = cur() ? cur().ona : 'day';
    fields.appendChild(ona);
    const last = field(t('nidda.last'), 'date', data.last);
    const hefsek = field(t('nidda.hefsek'), 'date', data.hefsek);
    box.appendChild(fields);

    // Un début de flux nouveau (date postérieure) ouvre un cycle : l'ancien passe dans l'historique, les dates du cycle s'effacent.
    const setStart = () => {
        const d = onset.value;
        if (!d || NiddaCore.dayNumber(d) === null) return;
        const c = cur();
        if (!c) data.starts.push({ date: d, ona: ona.value });
        else if (d === c.date) c.ona = ona.value;
        else if (d > c.date) { data.starts.push({ date: d, ona: ona.value }); data.last = ''; data.hefsek = ''; last.value = ''; hefsek.value = ''; }
        else { c.date = d; c.ona = ona.value; }
        data.starts.sort((x, y) => NiddaCore.dayNumber(x.date) - NiddaCore.dayNumber(y.date));
        trim();
    };
    const trim = () => {
        if (!data.vestot) data.starts = data.starts.slice(-1);
        else data.starts = data.starts.slice(-NiddaCore.MAX_STARTS);
    };
    onset.oninput = () => { setStart(); niddaSave(data); paint(); };
    ona.onchange = () => { const c = cur(); if (c) c.ona = ona.value; niddaSave(data); paint(); };
    last.oninput = () => { data.last = last.value; niddaSave(data); paint(); };
    hefsek.oninput = () => { data.hefsek = hefsek.value; niddaSave(data); paint(); };

    // 3. Le mode : calcul complet, ou seulement noter le hefsek.
    const noteLabel = document.createElement('label');
    noteLabel.className = 'cmd-nidda-check';
    const noteBox = document.createElement('input');
    noteBox.type = 'checkbox';
    noteBox.checked = !!data.note;
    noteBox.onchange = () => { data.note = noteBox.checked; niddaSave(data); paint(); };
    noteLabel.append(noteBox, document.createTextNode(' ' + t('nidda.note_only')));

    // 4. Les résultats.
    const out = document.createElement('div');
    out.setAttribute('aria-live', 'polite');
    const line = (text, strong) => { const p = document.createElement('p'); p.className = strong ? 'cmd-hallah-result' : 'tool-small'; p.textContent = text; out.appendChild(p); };

    // 5. Les vestot (option) et leur historique.
    const vestotLabel = document.createElement('label');
    vestotLabel.className = 'cmd-nidda-check';
    const vestotBox = document.createElement('input');
    vestotBox.type = 'checkbox';
    vestotBox.checked = !!data.vestot;
    vestotBox.onchange = () => { data.vestot = vestotBox.checked; trim(); niddaSave(data); paint(); };
    vestotLabel.append(vestotBox, document.createTextNode(' ' + t('nidda.vestot_toggle')));
    const vestotBlock = document.createElement('div');
    vestotBlock.className = 'cmd-nidda-vestot';

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'tool-history-chip';
    clear.textContent = t('nidda.clear');
    clear.onclick = () => {
        const keep = { usage: data.usage, note: data.note, vestot: data.vestot };
        Object.assign(data, niddaEmpty(), keep);
        onset.value = ''; last.value = ''; hefsek.value = ''; ona.value = 'day';
        niddaSave(data); paint();
    };

    const reminders = document.createElement('ul');
    reminders.className = 'tool-small cmd-nidda-rem';
    ['rem_bedikah', 'rem_moch', 'rem_ketem', 'rem_zavah'].forEach(k => { const li = document.createElement('li'); li.textContent = t('nidda.' + k); reminders.appendChild(li); });
    const remTitle = document.createElement('p');
    remTitle.className = 'tool-small';
    remTitle.textContent = t('nidda.rem_title');
    box.append(noteLabel, out, vestotLabel, vestotBlock, clear, remTitle, reminders, note);

    function paint() {
        Object.keys(usageBtns).forEach(u => { const on = data.usage === u; usageBtns[u].className = on ? 'active' : ''; usageBtns[u].setAttribute('aria-pressed', on ? 'true' : 'false'); });
        usageHint.textContent = data.usage ? t('nidda.usage_note_' + data.usage) : t('nidda.usage_hint');
        out.textContent = '';
        const c = cur();
        if (!c) { line(t('nidda.hint')); }
        else {
            const r = NiddaCore.compute(c.date, data.last || null, { usage: data.usage || null, hefsek: data.hefsek || null });
            if (!r.ok) line(t('nidda.err_' + r.reason, { date: niddaFr(r.earliest) }));
            else {
                line(t('nidda.nidda', { from: niddaFr(r.nidda.from), to: niddaFr(r.nidda.to) }));
                Object.keys(r.earliest).forEach(u => line(t('nidda.earliest', { usage: t('nidda.usage_' + u), date: niddaFr(r.earliest[u]) })));
                if (r.hefsek && data.note) line(t('nidda.hefsek_noted', { date: niddaFr(r.hefsek) }), true);
                else if (r.hefsek) {
                    line(t('nidda.clean', { from: niddaFr(r.clean.from), to: niddaFr(r.clean.to) }));
                    line(t('nidda.tevila', { date: niddaFr(r.tevila) }), true);
                }
            }
        }
        // Historique et vestot
        vestotBlock.textContent = '';
        if (!data.vestot) return;
        const starts = document.createElement('div');
        starts.className = 'cmd-nidda-starts';
        const title = document.createElement('p');
        title.className = 'tool-small';
        title.textContent = t('nidda.starts_title');
        starts.appendChild(title);
        data.starts.slice().reverse().forEach((s, idx) => {
            const row = document.createElement('p');
            row.className = 'tool-small';
            row.textContent = niddaFr(s.date) + ' · ' + t(s.ona === 'night' ? 'nidda.ona_night' : 'nidda.ona_day');
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'tool-history-chip';
            del.textContent = t('nidda.starts_delete');
            del.onclick = () => { data.starts = data.starts.filter(x => x !== s); niddaSave(data); paint(); };
            row.appendChild(document.createTextNode(' '));
            row.appendChild(del);
            starts.appendChild(row);
        });
        vestotBlock.appendChild(starts);
        const v = NiddaCore.vestot(data.starts);
        if (!v.ok) { const p = document.createElement('p'); p.className = 'tool-small'; p.textContent = t('nidda.vestot_none'); vestotBlock.appendChild(p); return; }
        v.list.forEach(x => {
            const p = document.createElement('p');
            p.className = x.kind === 'beinonit' ? 'cmd-hallah-result' : 'tool-small';
            p.textContent = t('nidda.vestot_' + x.kind, { date: niddaFr(x.date), ona: t(x.ona === 'night' ? 'nidda.ona_night' : 'nidda.ona_day') });
            vestotBlock.appendChild(p);
        });
        const u = document.createElement('p');
        u.className = 'tool-small';
        u.textContent = t('nidda.vestot_usages');
        vestotBlock.appendChild(u);
    }
    paint();
    return box;
}
