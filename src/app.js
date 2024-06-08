const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs');

// Register fastify-formbody to parse form data
fastify.register(require('@fastify/formbody'));

// Register fastify-static to serve static files
fastify.register(require('fastify-static'), {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
});

// Handle form submission
fastify.post('/configure', async (request, reply) => {
  const { email, password, appState, prefixes, adminRoles } = request.body;

  const config = {
    credentials: appState ? { appState: JSON.parse(appState) } : { email, password },
    prefixes: prefixes.split(',').map(p => p.trim()),
    adminRoles: adminRoles.split(',').map(id => id.trim())
  };

  fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
  reply.send('Configuration saved successfully!');
});

// Start the server
const start = async () => {
  try {
    await fastify.listen(process.env.PORT || 3000);
    fastify.log.info(`Server running on http://localhost:${process.env.PORT || 3000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
