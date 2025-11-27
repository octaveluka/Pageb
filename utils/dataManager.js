// utils/dataManager.js
const fs = require('fs');
const path = require('path');

const CODES_FILE = path.join(__dirname, '../data/codes.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// --- FONCTION DE VERIFICATION ET DE CREATION DES FICHIERS ---
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    console.log("Création du répertoire /data...");
    fs.mkdirSync(dataDir);
}

// Initialisation des fichiers s'ils n'existent pas ou sont vides
function initializeFile(filePath, defaultContent) {
    if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8').trim() === '') {
        console.log(`Initialisation de ${path.basename(filePath)}...`);
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
    }
}

// Assurez-vous que les fichiers existent avec un contenu de base
initializeFile(CODES_FILE, { available: ["CODE-INIT-000"], redeemed: {} });
initializeFile(USERS_FILE, {});
// -------------------------------------------------------------

function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        return parsed;
    } catch (e) {
        // C'est le point critique: Si la lecture échoue, on log l'erreur mais on retourne un objet vide.
        // Cela empêche le module de planter et de renvoyer 'undefined'.
        console.error(`Erreur de lecture/parsing du fichier ${path.basename(filePath)}. Retourne un objet vide.`, e.message);
        // Si c'est codes.json qui est en cause, on retourne la structure de base pour éviter d'autres erreurs.
        return filePath === CODES_FILE ? { available: [], redeemed: {} } : {}; 
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Erreur d'écriture du fichier ${path.basename(filePath)}:`, e.message);
        return false;
    }
}

module.exports = {
    getUsers: () => readData(USERS_FILE),
    saveUsers: (data) => writeData(USERS_FILE, data),
    getCodes: () => readData(CODES_FILE),
    saveCodes: (data) => writeData(CODES_FILE, data),
};
