// =========================================================================
// === TORAHAXE — HORS-LIGNE : règles du service worker (pur, sans DOM, testé) ===
// =========================================================================
// Le service worker (sw.js) charge ce fichier et n'y garde que les décisions :
//  - la COQUILLE (index.html, js, css, ui, polices, images) est rangée d'avance, en entier, dans un cache dont le nom porte la version du déploiement
//    (scripts/swManifest.js : empreinte du contenu des fichiers). Un déploiement = une nouvelle version = un nouveau cache ; l'ancien est supprimé ;
//  - les DONNÉES (data/…) sont rangées à la première lecture, puis servies depuis le cache et revalidées en arrière-plan. Leur cache a un nom FIXE
//    (DATA_CACHE) : un déploiement ne vide pas les textes déjà téléchargés. Ne changer ce nom que si le FORMAT d'un fichier de données change de façon
//    incompatible avec l'ancien code (le numéro de version ci-dessous) : les anciens textes sont alors supprimés et relus sur le réseau.
// Tout le reste (autre origine : recherche de lieu de Zmanim…) passe sans que le service worker s'en mêle.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.OfflineCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var PREFIX = 'torahaxe-';
    var SHELL_PREFIX = PREFIX + 'shell-';
    var DATA_FORMAT = 1;
    var DATA_CACHE = PREFIX + 'data-v' + DATA_FORMAT;

    function shellCacheName(version) { return SHELL_PREFIX + version; }

    // Chemin d'une adresse relativement à la portée du service worker ('' pour la page d'accueil), ou null si elle est ailleurs.
    function relativePath(url, scope) {
        var u, s;
        try { u = new URL(url); s = new URL(scope); } catch (e) { return null; }
        if (u.origin !== s.origin || u.pathname.indexOf(s.pathname) !== 0) return null;
        var rel = u.pathname.slice(s.pathname.length);
        return rel === '' ? 'index.html' : rel;
    }

    // 'shell' : fichier de la coquille ; 'data' : un texte de data/ ; 'skip' : tout le reste. `shell` : l'ensemble des chemins de la coquille.
    function classify(url, scope, shell) {
        var rel = relativePath(url, scope);
        if (rel === null) return 'skip';
        if (rel.indexOf('data/') === 0) return 'data';
        if (shell && shell.has(rel)) return 'shell';
        return 'skip';
    }

    // Les caches de TorahAxe à supprimer : coquilles d'autres versions, caches de données d'un autre format. Ceux des autres applications ne sont jamais touchés.
    function staleCaches(names, currentShell) {
        return names.filter(function (n) {
            if (n.indexOf(SHELL_PREFIX) === 0) return n !== currentShell;
            if (n.indexOf(PREFIX + 'data-') === 0) return n !== DATA_CACHE;
            return false;
        });
    }

    return { PREFIX: PREFIX, DATA_CACHE: DATA_CACHE, DATA_FORMAT: DATA_FORMAT, shellCacheName: shellCacheName, relativePath: relativePath, classify: classify, staleCaches: staleCaches };
}));
