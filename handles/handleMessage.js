const fs = require('fs');
const path = require('path');
const { sendMessage } = require('./sendMessage');

const commands = new Map();
const prefix = '-';

// Load command modules
// Le try...catch ici est essentiel pour identifier si un fichier pose problème
fs.readdirSync(path.join(__dirname, '../commands'))
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    try {
      const command = require(`../commands/${file}`);
      // Vérification de base pour s'assurer que l'objet est bien exporté
      if (command.name && typeof command.execute === 'function') {
        commands.set(command.name.toLowerCase(), command);
      } else {
        console.error(`[LOAD ERROR] Le fichier ${file} n'exporte pas correctement 'name' ou 'execute'.`);
      }
    } catch (error) {
      console.error(`[FATAL LOAD ERROR] Échec du chargement de la commande ${file}:`, error.message);
      // Le programme continuera, mais la commande ne sera pas disponible.
    }
  });

async function handleMessage(event, pageAccessToken) {
  const senderId = event?.sender?.id;
  if (!senderId) return console.error('Invalid event object');

  const messageText = event?.message?.text?.trim();
  if (!messageText) return console.log('Received event without message text');

  const [commandName, ...args] = messageText.startsWith(prefix)
    ? messageText.slice(prefix.length).split(' ')
    : [messageText.split(' ')[0], ...messageText.split(' ').slice(1)]; // Conserve le message complet si pas de préfixe

  try {
    const executedCommand = commands.get(commandName.toLowerCase());

    if (executedCommand) {
      // 1. Commande explicite trouvée (Ex: !ai ou !code)
      // Note: Le 'ai' recevra ici uniquement les arguments après !ai
      await executedCommand.execute(senderId, args, pageAccessToken, sendMessage);
    } else {
      // 2. Commande implicite (traitée comme une question AI)
      const aiCommand = commands.get('ai'); // Tente de récupérer la commande 'ai'

      if (aiCommand) {
        // La commande AI existe bien, on l'exécute avec le message complet
        await aiCommand.execute(senderId, [messageText], pageAccessToken);
      } else {
        // C'est le bloc de sécurité qui empêche l'erreur précédente!
        console.warn("La commande 'ai' est introuvable ou n'a pas pu être chargée. Impossible de répondre.");
        await sendMessage(senderId, { text: "Désolé, le service de commande AI est actuellement indisponible." }, pageAccessToken);
      }
    }
  } catch (error) {
    console.error(`Error executing command:`, error);
    await sendMessage(senderId, { text: error.message || 'There was an error executing that command.' }, pageAccessToken);
  }
}

module.exports = { handleMessage };
