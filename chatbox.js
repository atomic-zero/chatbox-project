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

            // Find the prefix that is used in the body
            const prefixes = ['!', '?', '/'];
            const matchedPrefix = prefixes.find(p => event.body.startsWith(p));

            // Check if there is a matched prefix or execute command directly
            if (matchedPrefix) {
                // Command with prefix
                const commandBody = event.body.slice(matchedPrefix.length).trim();
                executeCommand(commandBody, chat, fuse, event);
            } else {
                // Command without prefix
                executeCommand(event.body.trim(), chat, fuse, event);
            }
        } else {
            console.error('Received an event without a body:', event);
        }
    });
});

// Function to execute command
function executeCommand(commandBody, chat, fuse, event) {
    const fuseResult = fuse.search(commandBody);
    if (fuseResult.length > 0) {
        // Execute the closest matched command
        const command = fuseResult[0].item;

        // Check if the command supports prefixes
        const prefixEnabled = command.isPrefix !== undefined ? command.isPrefix : defaultPrefixEnabled;
        if (!prefixEnabled) {
            chat.reply(mono(`Command ${command.name} does not need a prefix.`));
            return;
        }

        const requiredRole = command.role !== undefined ? command.role : defaultRequiredRole;
        if (requiredRole && !userRoles[requiredRole].includes(event.senderID)) {
            chat.reply(mono("You don't have permission to use this command."));
            return;
        }

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
        chat.reply(mono(`Command not found. Type 'prefix' to see available prefixes.`));
    }
}
