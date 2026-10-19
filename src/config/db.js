const mongoose = require('mongoose');

let cachedPromise = null;

/**
 * Connect to MongoDB Atlas or local MongoDB with connection promise caching.
 * Prevents race conditions during connection initialization in serverless and concurrent environments.
 */
async function connectDB() {
  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const errorMsg = '❌ MONGODB_URI is not defined in .env file!';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
      })
      .then((conn) => {
        console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      })
      .catch((error) => {
        cachedPromise = null; // Reset so subsequent requests can retry
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        throw error;
      });
  }

  await cachedPromise;
  return mongoose.connection;
}

mongoose.connection.on('disconnected', () => {
  cachedPromise = null;
  console.warn('⚠️ MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  cachedPromise = null;
  console.error(`❌ MongoDB connection event error: ${err.message}`);
});

module.exports = connectDB;
