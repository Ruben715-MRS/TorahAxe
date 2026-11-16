// =========================================================================
// === TORAHAXE — TEXTES DE L'INTERFACE (ui/fr.json) ===
// =========================================================================
// TorahAxe est en français uniquement : ce fichier charge ui/fr.json, répond à `t('clé.imbriquée', { param })` et traduit les éléments marqués
// `data-i18n` (texte) et `data-i18n-attr` (attributs) du HTML. Pas de packs de langue ni de contenu de jeu à télécharger.

// Dictionnaire de secours intégré : le strict minimum pour que les boutons de retour restent lisibles si ui/fr.json n'a pas pu être chargé.
const DEFAULT_FR_FALLBACK_UI = {
    nav: {
        validate: "Activer",
        back: "Retour",
        quit: "Quitter"
    }
};

class I18nManager {
    constructor() {
        this.currentLang = 'fr';
        this.uiStrings = DEFAULT_FR_FALLBACK_UI;
        this.isLoading = false;
    }

    async init() {
        this.isLoading = true;
        try {
            const res = await fetch('ui/fr.json');
            if (res.ok) this.uiStrings = await res.json();
        } catch (e) {
            console.warn('Could not load ui/fr.json, using built-in strings:', e);
        }
        document.documentElement.lang = 'fr';
        this.applyTranslations();
        try {
            const appTitle = this.t('app.title');
            const appSubtitle = this.t('app.subtitle');
            if (appTitle && appTitle !== 'app.title') {
                document.title = appSubtitle && appSubtitle !== 'app.subtitle' ? `${appTitle} - ${appSubtitle}` : appTitle;
            }
        } catch (e) { /* le titre du fichier HTML reste */ }
        this.isLoading = false;
        // Les anciens packs de langue d'HistoriAxe : leur cache et leurs réglages n'ont plus d'usage.
        try { if ('caches' in window) caches.delete('historiaxe-data-v1.0.224'); } catch (e) { /* sans importance */ }
    }

    t(key, params) {
        if (!key) return '';
        const keys = key.split('.');
        let val = this.resolveKey(this.uiStrings, keys);
        if (val === undefined || val === null) {
            val = this.resolveKey(DEFAULT_FR_FALLBACK_UI, keys);
        }
        if (val === undefined || val === null) {
            return key;
        }

        if (typeof val === 'string' && params && typeof params === 'object') {
            for (const [k, v] of Object.entries(params)) {
                val = val.replaceAll('{' + k + '}', v);
            }
        }
        return val;
    }

    resolveKey(obj, keys) {
        let curr = obj;
        for (const k of keys) {
            if (!curr || typeof curr !== 'object') return undefined;
            curr = curr[k];
        }
        return curr;
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            let params;
            const paramsAttr = el.getAttribute('data-i18n-params');
            if (paramsAttr) {
                try { params = JSON.parse(paramsAttr); } catch (e) { params = undefined; }
            }
            const translated = this.t(key, params);
            if (translated && translated !== key) {
                el.innerText = translated;
            }
        });

        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            const pairs = el.getAttribute('data-i18n-attr').split(';');
            pairs.forEach(pair => {
                const [attr, key] = pair.split(':').map(s => s.trim());
                if (attr && key) {
                    const translated = this.t(key);
                    if (translated && translated !== key) {
                        el.setAttribute(attr, translated);
                    }
                }
            });
        });
    }
}

const i18n = new I18nManager();
const t = (key, params) => i18n.t(key, params);
