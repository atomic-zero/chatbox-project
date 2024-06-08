const fs = require('fs');
const path = require('path');
const login = require('./fca/index.js');
const { onChat, fonts } = require('./system/chat');
const tsNode = require('ts-node');
const Fuse = require('fuse.js');

tsNode.register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es6'
  }
});

const loadConfig = () => {
  if (fs.existsSync('config.json')) {
    return JSON.parse(fs.readFileSync('config.json', 'utf8'));
  }
  throw new Error('Configuration file not found!');
};

const config = loadConfig();
const { credentials, prefixes, adminRoles } = config;

const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'cmd'))
  .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

commandFiles.forEach(file => {
  const commandModule = require(path.join(__dirname, 'cmd', file));
  const command = commandModule.meta || commandModule.config || commandModule.metadata || 
                  commandModule.chat || commandModule.root || commandModule.local || commandModule;
  commands.set(command.name, command);
  if (command.aliases) {
    command.aliases.forEach(alias => commands.set(alias, command));
  }
});

const userRoles = {
  admin: adminRoles,
  moderator: [],
  group_admin: []
};

const roleHierarchy = {
  group_admin: 1,
  admin: 2,
  moderator: 3
};

const defaultPrefixEnabled = false;
const defaultRequiredRole = null;

login(credentials, (err, api) => {
  if (err) {
    console.error(err);
    return;
  }

  fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState(), null, '\t'));
  console.log('Bot logged in and AppState saved');

  const commandArray = Array.from(commands.values());
  const fuse = new Fuse(commandArray, {
    keys: ['name', 'aliases']
  });

  api.listenMqtt(async (err, event) => {
    if (err) {
      console.error(err);
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
            console.error(`Error executing command ${command.name}: ${error.message}`);
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
            console.error(`Error executing command ${command.name}: ${error.message}`);
            reply('There was an error executing that command.');
          }
        }
      }
    } else {
      console.error('Received an event without a body:', event);
    }
  });
});
