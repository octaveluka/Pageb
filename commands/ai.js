const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// **********************************************
// ⚠️ IMPORTANT : REMPLACEZ CES CLEFS PAR VOS VRAIES CLEFS GEMINI
// Pour la sécurité, il est FORTEMENT recommandé d'utiliser des variables d'environnement.
// **********************************************
const API_KEYS = [
    "AIzaSyAaF8ys4LQ1xVsOENiqMA_X7rHeyjqJr8U", // Clé Primaire
    "AIzaSyBIiZ37xczuhK5QCM0afwmvi45uinYqnmU",
    "AIzaSyBfr5DAdxD9VJNEP9bCcbcMiFU5XA2Ku48",
    "AIzaSyBSQ_Tpq84lOvFvffgTTWMDoGZDWwTN0Yg", // J'ai corrigé la concaténation de votre clé
    "AIzaSyBKnJmBbeqRLVkkl0guyFKM577k21LEt28",
];

// L'historique des conversations est stocké ici.
// C'est simple, mais l'idéal serait d'utiliser une base de données pour la persistance.
const conversationHistory = {}; 
const MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

/**
 * Normalise l'historique de conversation pour l'API Gemini.
 * @param {Array} history L'historique brut de l'application.
 * @returns {Array} L'historique au format attendu par Gemini.
 */
function formatHistoryForGemini(history) {
    return history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));
}

/**
 * Appelle l'API Gemini avec un modèle et une clé spécifique.
 * @param {string} apiKey La clé API à utiliser.
 * @param {Array} history L'historique de conversation formaté.
 * @param {string} prompt Le nouveau message de l'utilisateur.
 * @returns {Promise<string>} Le texte de réponse du modèle.
 */
async function callGemini(apiKey, history, prompt) {
    const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];
    
    const payload = {
        contents: contents,
        config: {
            // Vous pouvez ajuster le comportement ici si besoin
            // maxOutputTokens: 2048,
        }
    };

    const url = GEMINI_API_URL(apiKey);
    
    try {
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000 // Temps maximum pour la première clé (8 secondes)
        });

        const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Vérifier si la réponse est vide, ce qui déclenche le basculement
        if (!responseText || responseText.trim().length === 0) {
            throw new Error(`API Key ${apiKey.substring(0, 8)}... returned empty response.`);
        }
        
        return responseText;
    } catch (error) {
        // En cas d'erreur de réseau, timeout, ou réponse vide
        console.error(`Erreur avec l'API Key ${apiKey.substring(0, 8)}... :`, error.message);
        throw error; 
    }
}


module.exports = {
  name: 'ai',
  description: 'Interact with Gemini AI with failover logic.',
  usage: 'ai [votre message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, {
        text: "❓ Veuillez poser une question ou tapez 'help' pour voir les commandes."
      }, pageAccessToken);
    }

    // 1. Initialiser l'historique pour l'utilisateur s'il n'existe pas
    if (!conversationHistory[senderId]) {
      conversationHistory[senderId] = [];
    }
    
    // Formater l'historique existant pour la requête
    const history = formatHistoryForGemini(conversationHistory[senderId]);
    
    // Déclaration pour le résultat final
    let responseText = null;
    let fallbackTriggered = false;

    // **********************************************
    // 2. TENTATIVE N°1 : Appeler la première clé API (Séquentiel)
    // **********************************************
    try {
        responseText = await callGemini(API_KEYS[0], history, prompt);
    } catch (error) {
        console.warn("La clé primaire a échoué. Déclenchement du basculement sur les clés secondaires.");
        fallbackTriggered = true;
    }

    // **********************************************
    // 3. BASCULEMENT (FALLBACK) : Lancer les requêtes simultanément
    // **********************************************
    if (fallbackTriggered) {
        const secondaryKeys = API_KEYS.slice(1); 
        
        // Créer un tableau de promesses pour toutes les clés secondaires
        const promises = secondaryKeys.map(apiKey => 
            callGemini(apiKey, history, prompt).catch(err => {
                // Les erreurs sont capturées pour ne pas faire échouer Promise.any
                console.error(`Clé secondaire (${apiKey.substring(0, 8)}...) a échoué aussi.`);
                return null;
            })
        );
        
        try {
            // Promise.race renvoie la première promesse qui est résolue
            // Utiliser Promise.any serait mieux pour garantir la première réponse valide
            // Cependant, nous n'avons pas la version du runtime Node.js ici.
            // Utilisons une boucle simple pour la robustesse sur Node.js 10+
            
            const results = await Promise.all(promises);
            responseText = results.find(res => res !== null);

            if (!responseText) {
                throw new Error("Toutes les clés API ont échoué.");
            }

        } catch (error) {
            // Gérer le cas où toutes les clés secondaires échouent.
            console.error("Échec total du basculement :", error.message);
            sendMessage(senderId, {
                text: "❌ Service AI indisponible. Toutes les tentatives de connexion ont échoué."
            }, pageAccessToken);
            return;
        }
    }

    // **********************************************
    // 4. Traitement et Envoi de la Réponse
    // **********************************************
    if (responseText) {
        // Ajouter la requête utilisateur et la réponse de l'AI à l'historique
        conversationHistory[senderId].push({ role: 'user', content: prompt });
        conversationHistory[senderId].push({ role: 'assistant', content: responseText });

        const formattedResponse = `🤖 Gemini AI\n・───────────・\n${responseText}\n・──── ⭐️ ────・`;

        // Découpe en morceaux de 1900 caractères (limite de sécurité de Messenger)
        const parts = [];
        for (let i = 0; i < formattedResponse.length; i += 1900) {
            parts.push(formattedResponse.substring(i, i + 1900));
        }

        for (const part of parts) {
            await sendMessage(senderId, { text: part }, pageAccessToken);
        }
    } else {
         // Ce cas ne devrait pas arriver si le code précédent est correct, mais par sécurité
        sendMessage(senderId, {
            text: "🤖 La réponse de l'AI est vide, même après le basculement. Réessayez."
        }, pageAccessToken);
    }
  }
};
