const app = require('./app');
const config = require('./src/config/env');
const { connectDB, closeDB } = require('./src/config/db');
const { initReminderCron } = require('./src/jobs/reminders');

async function startServer() {
  await connectDB();

  // Start cron jobs
  let cronTask = null;
  if (config.NODE_ENV !== 'test') {
    cronTask = initReminderCron();
  }

  const server = app.listen(config.PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   📦 GATEKEPT HOSTEL PARCEL SYSTEM — ACTIVE       ║
║   Listening on port: ${config.PORT.toString().padEnd(29)}║
║   Environment: ${config.NODE_ENV.padEnd(33)}║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
  });

  const handleShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await closeDB();
      console.log('Server and database connections closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
