// src/tests/setup.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;
global.console = require('console');

// Disconnect from any existing connection
const disconnect = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    console.error('Error disconnecting from test database:', err);
  }
};

// Connect to the in-memory database
const connect = async () => {
  try {
    await disconnect();
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  } catch (err) {
    console.error('Error connecting to test database:', err);
  }
};

// Clean up after tests
const clear = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (err) {
    console.error('Error clearing test database:', err);
  }
};

export const dbSetup = {
  connect,
  disconnect,
  clear,
};

// Jest hooks
beforeAll(async () => await connect());
afterEach(async () => await clear());
afterAll(async () => {
  await disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }

});
