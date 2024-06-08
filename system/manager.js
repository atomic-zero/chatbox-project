const fs = require('fs');
const path = require('path');
const login = require('./fca/index.js');
const Fuse = require('fuse.js');
const { onChat, fonts } = require('./chat');
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, '../cmd'))
  .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

commandFiles.forEach(file => {
  const commandModule = require(path.join(__dirname, '../cmd', file));
  const command = commandModule.meta || commandModule.config || commandModule.metadata || 
                  commandModule.chat || commandModule.root || commandModule.local || commandModule;
  commands.set(command.name, command);
  if (command.aliases) {
    command.aliases.forEach(alias => commands.set(alias, command));
  }
});

const userRoles = {
  admin: [],
  moderator: ['100081201591674', '61556556071548'],
  group_admin: []
};

const roleHierarchy = {
  group_admin: 1,
  admin: 2,
  moderator: 3
};

const defaultPrefixEnabled = false;
const defaultRequiredRole = null;

let prefixes = ['!', '?', '/'];
let activeSessions = 0;

const sessions = {};

function startSession(appState) {
  login({ appState }, async (err, api) => {
    if (err) {
      console.error(`Login error:`, err);
      return;
    }

    const botID = await api.getCurrentUserID();
    console.log(`Bot ${botID} logged in and AppState saved`);

    const commandArray = Array.from(commands.values());
    const fuse = new Fuse(commandArray, {
      keys: ['name', 'aliases']
    });

    sessions[botID] = { api, fuse };
    activeSessions++;

    api.listenMqtt(async (err, event) => {
      if (err) {
        console.error(`Listening error for bot ${botID}:`, err);
        return;
      }

      if (event.body) {
        const chat = new onChat(api, event);
        const mono = txt => fonts.monospace(txt);
        const reply = async (msg) => {
          const msgInfo = await chat.reply(mono(msg));
          msgInfo.unsend(5000);
        };
        const messageBody = event.body.trim();

        const matchedPrefix = prefixes.find(p => messageBody.startsWith(p));

        if (messageBody.toLowerCase() === 'prefix') {
          reply(`The prefixes of the bot are: ${JSON.stringify(prefixes)}`);
          return;
        }

        let commandBody = messageBody;
        if (matchedPrefix) {
          commandBody = messageBody.slice(matchedPrefix.length).trim();
        }

        const args = commandBody.split(/\s+/);
        const commandName = args.shift().toLowerCase();
        const params = { api, chat, event, args, fonts };

        const threadInfo = await chat.threadInfo(event.threadID);
        userRoles.group_admin = threadInfo.adminIDs.map(admin => admin.id);

        const getUserRole = (userId) => {
          for (const [role, ids] of Object.entries(userRoles)) {
            if (ids.includes(userId)) {
              return role;
            }
          }
          return null;
        };

        const hasRequiredRole = (userId, requiredRole) => {
          const userRole = getUserRole(userId);
          if (!userRole || !requiredRole) {
            return false;
          }
          return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
        };

        if (matchedPrefix) {
          const fuseResult = fuse.search(commandName);
          if (fuseResult.length > 0) {
            const command = fuseResult[0].item;
            const prefixEnabled = command.isPrefix !== undefined ? command.isPrefix : defaultPrefixEnabled;
            if (!prefixEnabled) {
              reply(`Command ${command.name} does not need a prefix.`);
              return;
            }

            const requiredRole = command.role !== undefined ? command.role : defaultRequiredRole;
            if (requiredRole && !hasRequiredRole(event.senderID, requiredRole)) {
              reply("You don't have permission to use this command.");
              return;
            }

            try {
              command.exec(params);
            } catch (error) {
              console.error(`Error executing command ${command.name}:`, error);
              reply('There was an error executing that command.');
            }
          } else {
            reply(`I'm not sure what you mean. Please check the command name.`);
          }
        } else {
          const command = commands.get(commandName);
          if (command) {
            const prefixEnabled = command.isPrefix !== undefined ? command.isPrefix : defaultPrefixEnabled;
            if (prefixEnabled) {
              reply(`Command ${command.name} requires a prefix.`);
              return;
            }

            const requiredRole = command.role !== undefined ? command.role : defaultRequiredRole;
            if (requiredRole && !hasRequiredRole(event.senderID, requiredRole)) {
              reply("You don't have permission to use this command.");
              return;
            }

            try {
              command.exec(params);
            } catch (error) {
              console.error(`Error executing command ${command.name}:`, error);
              reply('There was an error executing that command.');
            }
          }
        }
      } else {
        console.error('Received an event without a body:', event);
      }
    });
  });
}

function loadSessions() {
  const appStateFiles = fs.readdirSync(path.join(__dirname, './database/sessions'));
  appStateFiles.forEach(file => {
    const appState = JSON.parse(fs.readFileSync(path.join(__dirname, './database/sessions', file), 'utf8'));
    startSession(appState);
  });
}

module.exports = { startSession, loadSessions, activeSessions, sessions };
