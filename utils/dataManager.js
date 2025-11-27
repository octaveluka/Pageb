// utils/dataManager.js
const fs = require('fs');
const path = require('path');

const CODES_FILE = path.join(__dirname, '../data/codes.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

// Assurez-vous que le dossier 'data' existe
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Initialisation des fichiers s'ils n'existent pas
if (!fs.existsSync(CODES_FILE)) {
    // Liste initiale de codes
    fs.writeFileSync(CODES_FILE, JSON.stringify({ 
        available: [
            "STANLEY-BOT-001", 
            "ALPHA-CODE-2024", 
            "SECRET-COFFEE-X1", 
            // Ajoutez ici TOUTES vos combinaisons de codes
        ], 
        redeemed: {} 
    }, null, 2));
}

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
}

function readData(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Erreur de lecture du fichier ${filePath}:`, e);
        return {}; 
    }
}

function writeData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Erreur d'écriture du fichier ${filePath}:`, e);
        return false;
    }
}

module.exports = {
    getUsers: () => readData(USERS_FILE),
    saveUsers: (data) => writeData(USERS_FILE, data),
    getCodes: () => readData(CODES_FILE),
    saveCodes: (data) => writeData(CODES_FILE, data),
};
