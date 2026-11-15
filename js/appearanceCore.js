// Apparence : thème (Auto / Clair / Sombre), fond d'écran, motif et intensité du motif.
// Pur (sauf `apply`, qui écrit dans l'élément qu'on lui donne) : testable sous `npm test`.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.AppearanceCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    var KEY = 'torahaxeAppearance';
    var THEMES = ['auto', 'light', 'dark'];
    var WALLPAPERS = ['none', 'sand', 'sky', 'sage', 'slate'];
    var MOTIFS = ['none', 'dots', 'grid', 'meander'];
    var INTENSITIES = ['low', 'medium', 'high'];
    var DEFAULTS = { theme: 'light', wallpaper: 'none', motif: 'none', intensity: 'medium' };

    function pick(v, list, fallback) { return list.indexOf(v) >= 0 ? v : fallback; }

    // Accepte n'importe quoi (JSON abîmé, valeur inconnue) et rend toujours un réglage complet et valide.
    function normalize(raw) {
        var r = raw && typeof raw === 'object' ? raw : {};
        return {
            theme: pick(r.theme, THEMES, DEFAULTS.theme),
            wallpaper: pick(r.wallpaper, WALLPAPERS, DEFAULTS.wallpaper),
            motif: pick(r.motif, MOTIFS, DEFAULTS.motif),
            intensity: pick(r.intensity, INTENSITIES, DEFAULTS.intensity)
        };
    }

    function resolveTheme(theme, prefersDark) {
        if (theme === 'dark') return 'dark';
        if (theme === 'light') return 'light';
        return prefersDark ? 'dark' : 'light';
    }

    // Pose les attributs lus par css/style.css (data-theme, data-wallpaper, data-motif, data-motif-intensity).
    function apply(el, prefs, prefersDark) {
        var p = normalize(prefs);
        el.setAttribute('data-theme', resolveTheme(p.theme, !!prefersDark));
        el.setAttribute('data-wallpaper', p.wallpaper);
        el.setAttribute('data-motif', p.motif);
        el.setAttribute('data-motif-intensity', p.intensity);
        return p;
    }

    return { KEY: KEY, THEMES: THEMES, WALLPAPERS: WALLPAPERS, MOTIFS: MOTIFS, INTENSITIES: INTENSITIES, DEFAULTS: DEFAULTS, normalize: normalize, resolveTheme: resolveTheme, apply: apply };
}));
