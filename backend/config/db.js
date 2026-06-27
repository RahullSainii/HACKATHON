const mongoose = require('mongoose');

const LOCAL_DEV_MONGO_URI = 'mongodb://127.0.0.1:27017/samadhaan';

const connectionOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const connectWithUri = async (mongoURI, options = connectionOptions) => {
  const conn = await mongoose.connect(mongoURI, options);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
  return conn;
};

const logConnectionHelp = (error) => {
  if (
    error.message.includes('SSL') ||
    error.message.includes('TLS') ||
    error.message.includes('ssl3_read_bytes') ||
    error.message.includes('alert internal error')
  ) {
    console.error('SSL/TLS connection error. Check MongoDB Atlas IP whitelist and connection string.');
  } else if (error.message.includes('authentication failed')) {
    console.error('MongoDB authentication failed. Check username and password.');
  } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
    console.error('MongoDB network/DNS error. Check Atlas cluster URL or internet/DNS access.');
  }
};

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI || !process.env.MONGO_URI.trim()) {
      throw new Error('MONGO_URI is not set. Please add it to your .env file.');
    }

    const mongoURI = process.env.MONGO_URI.trim().replace(/\s+/g, '');
    return await connectWithUri(mongoURI);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    logConnectionHelp(error);

    if (process.env.NODE_ENV !== 'production') {
      try {
        console.error(`Trying local development MongoDB fallback: ${LOCAL_DEV_MONGO_URI}`);
        return await connectWithUri(LOCAL_DEV_MONGO_URI, {
          serverSelectionTimeoutMS: 3000,
          socketTimeoutMS: 45000,
        });
      } catch (fallbackError) {
        console.error(`Local MongoDB fallback failed: ${fallbackError.message}`);
      }
    }

    console.error('Server will continue running, but database operations will fail until MongoDB connects.');

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  return null;
};

module.exports = connectDB;
