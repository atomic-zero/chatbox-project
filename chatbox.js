const fs = require('fs');
const path = require('path');
const login = require('./fca/index.js');
const { onChat, fonts }  = require('./system/chat');
var mono = txt => fonts.monospace(txt);
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
const commandFiles = fs.readdirSync(path.join(__dirname, 'cmd')).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

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
    // Add more roles and their associated user IDs as needed
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
            var output, box, message = chat;  // alias for chat

            // List of prefixes 
            const prefixes = ['!', '?', '/'];

            // Find the prefix that is used in the body then proceeds to execute command with prefix 
            const matchedPrefix = prefixes.find(p => event.body.startsWith(p));

            // Check the message body if asking for the prefix
            if (event.body.toLowerCase() === 'prefix') {
                if (prefixes) {
                    chat.reply(mono(`The prefix of the bot is: ${JSON.stringify(prefixes)}`));
                } else {
                    chat.reply(mono("I'm sorry, but the bot doesn't have a prefix."));
                }
                return;
            }

            // Check if there is a matched prefix of the command
            if (matchedPrefix) {
                // Remove prefix and trim the command body
                const commandBody = event.body.slice(matchedPrefix.length).trim();

                // execute closer command name only works with prefix!
                const fuseResult = fuse.search(commandBody);
                if (fuseResult.length > 0) {
                    // Execute the closest matched command
                    const command = fuseResult[0].item; // Get the closest matched command

                    // Check if the command supports prefixes : >
                    const prefixEnabled = command.isPrefix !== undefined ? command.isPrefix : defaultPrefixEnabled;
                    if (!prefixEnabled) {
                        console.error(`Command ${command.name} does not support prefixes.`);
                        return;
                    }

                    // Check if the user has the required role to execute the command
                    const requiredRole = command.role !== undefined ? command.role : defaultRequiredRole;
                    if (requiredRole && !userRoles[requiredRole].includes(event.senderID)) {
                        chat.reply(mono("You don't have permission to use this command."));
                        return;
                    }

                    // arguments for the command execution
                    const args = commandBody.split(/\s+/).slice(1);
                    let input = args;// alias of arguments
                    const params = { api, chat, event, args, input, output, box, fonts };

                    // Execute the command
                    try {
                        command.exec(params);
                    } catch (error) {
                        console.error(`Error executing command ${command.name}: ${error.message}`);
                        chat.reply(mono('There was an error executing that command.'));
                    }
                } else {
                    const closestCommands = fuseResult.map(result => result.item.name);
                    chat.reply(mono(`I'm not sure what you mean. Did you mean ${closestCommands.join(', ')}?`));
                }
            } else {
                // No prefix matched, do nothing
            }
        } else {
            console.error('Received an event without a body:', event);
        }
    });
});
