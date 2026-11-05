const mongoose = require('mongoose');
const config = require('./env');

let mongoMemoryServer = null;

async function connectDB() {
  try {
    // In test environment, always isolate with MongoMemoryServer
    let uri = process.env.NODE_ENV === 'test' ? '' : config.MONGO_URI;

    if (!uri) {
      console.log('ℹ️  No MONGO_URI provided in environment (or in test mode). Starting in-memory MongoDB server...');
      process.env.MONGOMS_DISTRO = process.env.MONGOMS_DISTRO || 'ubuntu-22.04';
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        binary: {
          version: '7.0.14',
          os: {
            os: 'linux',
            distro: 'ubuntu',
            release: '22.04',
          },
        },
      });
      uri = mongoMemoryServer.getUri();
      console.log(`✅ In-memory MongoDB running at: ${uri}`);
    }

    await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected to: ${mongoose.connection.host || 'embedded instance'}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function closeDB() {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (error) {
    console.error('Error disconnecting from DB:', error.message);
  }
}

module.exports = { connectDB, closeDB };
