// Liste de la coquille de l'application et sa version, pour le service worker (sw.js).
// La version est l'empreinte du CONTENU de ces fichiers : elle ne change que si l'un d'eux change (un déploiement qui ne touche que data/ ne renouvelle pas la coquille).
// `node scripts/build.js` écrit le résultat dans sw-version.js (ignoré par git, servi à côté de sw.js).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHELL_FILES = ['index.html', 'manifest.webmanifest', 'apple_icon.jpg'];
const SHELL_DIRS = ['css', 'js', 'ui', 'assets'];
// Rangés nulle part : sources de build, licences, et la police d'icônes (jamais utilisée : 1,1 Mo pour rien).
const SKIP = /(^|\/)(tailwind-input\.css|material-symbols-outlined\.woff2|\.DS_Store)$|\.(txt|map|md)$/;

function walk(root, dir, out) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) return;
    fs.readdirSync(abs, { withFileTypes: true }).forEach(e => {
        const rel = dir + '/' + e.name;
        if (e.isDirectory()) walk(root, rel, out);
        else if (!SKIP.test(rel)) out.push(rel);
    });
}

function buildManifest(root) {
    const files = SHELL_FILES.filter(f => fs.existsSync(path.join(root, f)));
    SHELL_DIRS.forEach(d => walk(root, d, files));
    files.sort();
    const h = crypto.createHash('sha256');
    files.forEach(f => { h.update(f + '\0'); h.update(fs.readFileSync(path.join(root, f))); h.update('\0'); });
    return { version: h.digest('hex').slice(0, 12), files };
}

function writeVersionFile(root) {
    const m = buildManifest(root);
    fs.writeFileSync(path.join(root, 'sw-version.js'), '// Généré par scripts/build.js : ne pas modifier, ne pas committer.\nself.TORAHAXE_SW = ' + JSON.stringify(m) + ';\n');
    return m;
}

module.exports = { buildManifest, writeVersionFile };
