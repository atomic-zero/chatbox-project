const fs = require('fs');
const path = require('path');
const login = require('./fca/index.js');
const { onChat, fonts } = require('./system/chat');
const tsNode = require('ts-node');
const Fuse = require('fuse.js');

// Register ts-node to handle TypeScript files
tsNode.register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
        target: 'es6'
    }
});

// Load all commands
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'cmd'))
    .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
    const commandModule = require(path.join(__dirname, 'cmd', file));
    const command = commandModule.meta || commandModule.config || commandModule;
    commands.set(command.name, command);
    if (command.aliases) {
        for (const alias of command.aliases) {
            commands.set(alias, command);
        }
    }
}

// Define user roles and permissions
const userRoles = {
    'admin': ['user_id_1', 'user_id_2'],
    'moderator': ['user_id_3', 'user_id_4'],
};

// Default command settings
const defaultPrefixEnabled = true;
const defaultRequiredRole = null;

let credentials = { email: '61559890234441', password: '@Ken2024' };

if (fs.existsSync('appstate.json')) {
    credentials = { appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8')) };
}

// Login to Facebook
login(credentials, (err, api) => {
    if (err) {
        return console.error(err);
    }

    // Save appstate to avoid login every time
    fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState(), null, '\t'));
    console.log('Bot logged in and AppState saved');

    // Convert commands map to array for Fuse
    const commandArray = Array.from(commands.values());
    const fuse = new Fuse(commandArray, {
        keys: ['name', 'aliases']
    });

    // Listen for messages
    api.listenMqtt((err, event) => {
        if (err) {
            return console.error(err);
        }

        if (event.body) {
            const chat = new onChat(api, event);
            const message = event.body.trim();

            // List of prefixes 
            const prefixes = ['!', '?', '/'];

            // Find the prefix that is used in the body then proceeds to execute command with prefix 
            const matchedPrefix = prefixes.find(p => message.startsWith(p));

            if (message.toLowerCase() === 'prefix') {
                chat.reply(fonts.monospace(`The prefixes of the bot are: ${JSON.stringify(prefixes)}`));
                return;
            }

            let commandBody = message;
            if (matchedPrefix) {
                commandBody = message.slice(matchedPrefix.length).trim();
            }

            const args = commandBody.split(/\s+/);
            const commandName = args.shift().toLowerCase();
            const params = { api, chat, event, args, fonts };

            // Handle commands with prefixes
            if (matchedPrefix) {
                const fuseResult = fuse.search(commandName);
                if (fuseResult.length > 0) {
                    const command = fuseResult[0].item;
                    const prefixEnabled = command.isPrefix !== undefined ? command.isPrefix : defaultPrefixEnabled;
                    if (!prefixEnabled) {
                        chat.reply(fonts.monospace(`Command ${command.name} does not need a prefix.`));
                        return;
                    }

                    const requiredRole = command.role !== undefined ? command.role : defaultRequiredRole;
                    if (requiredRole && !userRoles[requiredRole].includes(event.senderID)) {
                        chat.reply(fonts.monospace("You don't have permission to use this command."));
                        return;
                    }

                    try {
                        command.exec(params);
                    } catch (error) {
                        console.error(`Error executing command ${command.name}: ${error.message}`);
                        chat.reply(fonts.monospace('There was an error executing that command.'));
                    }
                } else {
                    chat.reply(fonts.monospace(`I'm not sure what you mean. Please check the command name.`));
                }
            } else {
                // Handle exact match commands without prefixes
                const command = commands.get(commandName);
                if (command) {
                    const prefixEnabled = command.isPrefix !== undefined ? command.isPrefix : defaultPrefixEnabled;
                    if (prefixEnabled) {
                        chat.reply(fonts.monospace(`Command ${command.name} requires a prefix.`));
                        return;
                    }

                    const requiredRole = command.role !== undefined ? command.role : defaultRequiredRole;
                    if (requiredRole && !userRoles[requiredRole].includes(event.senderID)) {
                        chat.reply(fonts.monospace("You don't have permission to use this command."));
                        return;
                    }

                    try {
                        command.exec(params);
                    } catch (error) {
                        console.error(`Error executing command ${command.name}: ${error.message}`);
                        chat.reply(fonts.monospace('There was an error executing that command.'));
                    }
                } else {
                    chat.reply(fonts.monospace(`I'm not sure what you mean. Please check the command name.`));
                }
            }
        } else {
            console.error('Received an event without a body:', event);
        }
    });
});
