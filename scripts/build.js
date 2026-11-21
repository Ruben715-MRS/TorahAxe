const fs = require('fs');
const path = require('path');

// Résolu relativement à ce script (scripts/../ = racine du repo), et non codé en dur sur un poste
// précis : ainsi `node scripts/build.js` fonctionne sur n'importe quelle machine, CI ou environnement.
const projectDir = path.resolve(__dirname, '..');
const wwwDir = path.join(projectDir, 'www');
const { writeVersionFile } = require('./swManifest');

// Version et liste de la coquille pour le service worker (sw.js) : écrites à la racine, car Vercel sert la racine (outputDirectory « . »), et copiées dans www/ ci-dessous.
const shell = writeVersionFile(projectDir);
console.log(`✓ sw-version.js : version ${shell.version}, ${shell.files.length} fichiers de coquille`);

console.log('Building web bundle into www/...');
if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else if (exists) {
        fs.copyFileSync(src, dest);
    }
}

// Fichiers et dossiers embarqués dans l'app (complétés au fil des migrations de contenu).
const itemsToCopy = [
    'index.html',
    'sw.js',
    'sw-version.js',
    'manifest.webmanifest',
    'apple_icon.jpg',
    'splash_ipad_landscape.jpg',
    'splash_iphone_portrait.jpg',
    'css',
    'js',
    'data',
    'ui',
    'assets'
];

itemsToCopy.forEach(item => {
    const srcPath = path.join(projectDir, item);
    const destPath = path.join(wwwDir, item);
    if (fs.existsSync(srcPath)) {
        copyRecursiveSync(srcPath, destPath);
        console.log(`✓ Copied ${item} to www/`);
    }
});

console.log('Web bundle built successfully in www/!');
