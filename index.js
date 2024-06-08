const { loadSessions, startSession, activeSessions } = require('./system/manager');

loadSessions();

process.on('exit', () => {
  activeSessions = 0;
});

process.on('SIGINT', () => {
  activeSessions = 0;
  process.exit();
});

process.on('SIGTERM', () => {
  activeSessions = 0;
  process.exit();
});

process.on("unhandledRejection", reason => {
  console.error('Unhandled Rejection:', reason);
});

process.on("uncaughtException", reason => {
  console.error('Uncaught Exception:', reason);
});
