const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// Objet pour stocker l'historique de conversation de chaque utilisateur.
const conversationHistory = {};

// Fonction utilitaire pour formater l'historique en une seule chaîne.
function formatHistory(senderId, currentPrompt) {
    let history = conversationHistory[senderId] || [];
    
    // Limiter l'historique à 5 messages (pour éviter l'échec de l'URL)
    const historyLimit = 5; 
    const recentHistory = history.slice(-historyLimit); 

    let formattedHistory = recentHistory.map(item => `[${item.role}] : ${item.content}`).join('\n') + '\n';
    
    return formattedHistory + "[User] : " + currentPrompt;
}

/**
 * Effectue une recherche Google simple.
 * @param {string} query La requête de recherche.
 * @returns {Promise<string>} Les résultats formatés ou une chaîne vide.
 */
async function performGoogleSearch(query) {
    // IMPORTANT : Utilisation de l'outil google:search
    try {
        const searchResults = await google.search({ queries: [query] });
        
        const resultString = searchResults.result;
        
        if (resultString) {
            // Limiter la taille du contexte pour éviter de dépasser la limite d'URL
            return `[Search Results]: ${resultString.substring(0, 1500)} \n\n`;
        }
        return '';
    } catch (error) {
        console.error('Erreur lors de la recherche Google :', error.message);
        return '';
    }
}


module.exports = {
  name: 'ai',
  description: 'Interact with Pollinations Text API and Google Search.',
  usage: 'ai [votre message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, {
        text: "❓ Veuillez poser une question."
      }, pageAccessToken);
    }

    // Initialiser l'historique
    if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
    }
    
    // 1. Déterminer si une recherche Google est nécessaire
    let searchResultsContext = '';
    // Déclenche la recherche sur les questions factuelles ou d'actualité
    const needsSearch = prompt.toLowerCase().includes('quand') || prompt.toLowerCase().includes('qui') || prompt.toLowerCase().includes('où') || prompt.toLowerCase().includes('actualité');
    
    if (needsSearch) {
        searchResultsContext = await performGoogleSearch(prompt);
    }
    
    // 2. Préparer le prompt final
    // NOUVELLE INSTRUCTION SYSTÈME AVEC LA PERSONNALITÉ
    let systemInstruction = "Tu es Stanley Bot, un assistant conversationnel développé par Stanley Stawa. Quand on te demande ton créateur, tu dois répondre Stanley Stawa. Quand on te demande qui tu es, tu dois répondre Stanley Bot. Réponds de manière concise et utilise les résultats de recherche si fournis.\n\n";
    
    const contextPrompt = systemInstruction + searchResultsContext + "\n\n" + formatHistory(senderId, prompt);
    
    try {
      const encodedPrompt = encodeURIComponent(contextPrompt);
      const url = `https://text.pollinations.ai/${encodedPrompt}`;

      // Envoyer la requête à l'API Pollinations
      const { data } = await axios.get(url, {
        responseType: 'text'
      });

      const responseText = typeof data === 'string' ? data.trim() : 'Réponse vide.';

      // 3. Mettre à jour l'historique de conversation
      conversationHistory[senderId].push({ role: 'user', content: prompt });
      conversationHistory[senderId].push({ role: 'ai', content: responseText.split('\n')[0] || responseText });
      
      // 4. Découper et envoyer la réponse
      const sourceInfo = searchResultsContext ? ' (Source: Google)' : '';
      const formattedResponse = `💬 | Stanley Stawa 😙🚬${sourceInfo}\n・───────────・\n${responseText}\n・──── 💫 ────・`;
      
      const parts = [];
      for (let i = 0; i < formattedResponse.length; i += 1900) {
        parts.push(formattedResponse.substring(i, i + 1900));
      }

      for (const part of parts) {
        await sendMessage(senderId, { text: part }, pageAccessToken);
      }

    } catch (error) {
      console.error('Erreur avec Pollinations Text API :', error.message);
      sendMessage(senderId, {
        text: "🤖 Une erreur est survenue avec Stanley.\nRéessayez plus tard ou posez une autre question."
      }, pageAccessToken);
    }
  }
};
