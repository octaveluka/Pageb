const fs = require('fs');
const path = require('path');

const CODES_FILE = path.join(__dirname, '../data/codes.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// --- VERIFICATION DE LA STRUCTURE ---
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Initialisation des fichiers s'ils n'existent pas
if (!fs.existsSync(CODES_FILE)) {
    fs.writeFileSync(CODES_FILE, JSON.stringify({ 
        available: ["CODE-EXEMPLE-001"], // Assurez-vous qu'il y a au moins un code
        redeemed: {} 
    }, null, 2));
}

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}
// ------------------------------------

function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Erreur FATALE de lecture du fichier ${filePath}. Vérifiez la syntaxe JSON.`, e);
        // Retourner un objet vide pour éviter le crash
        return {}; 
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Erreur FATALE d'écriture du fichier ${filePath}:`, e);
        return false;
    }
}

module.exports = {
    getUsers: () => readData(USERS_FILE),
    saveUsers: (data) => writeData(USERS_FILE, data),
    getCodes: () => readData(CODES_FILE),
    saveCodes: (data) => writeData(CODES_FILE, data),
};
