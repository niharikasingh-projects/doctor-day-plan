const mongoose = require('mongoose');

/**
 * Establishes a secure, persistent connection to the MongoDB cluster.
 * Utilizes parameters sourced safely from local environment variables.
 */
const connectDB = async () => {
  try {
    // 1. Cleanly isolate connection parameters
    const connURI = process.env.MONGO_URI;
    
    if (!connURI) {
      console.error('❌ Error: MONGO_URI variable is completely missing from your .env configuration file.');
      process.exit(1); 
    }

    // 2. Clear out legacy string-parsing warnings from newer Mongoose compiles
    mongoose.set('strictQuery', false);

    // 3. Initiate the database connection stream
    const conn = await mongoose.connect(connURI);

    console.log(`==================================================`);
    console.log(`📡 MongoDB Cluster Connection Initialized Successfully`);
    console.log(`🏠 Connected Host Gateways: ${conn.connection.host}`);
    console.log(`🗃️ Active Database Target Workspace: ${conn.connection.name}`);
    console.log(`==================================================`);

  } catch (error) {
    console.error(`❌ Database Connection Critical Failure: ${error.message}`);
    // Shut down the process immediately so developers don't execute broken memory instances
    process.exit(1);
  }
};

// Listen globally for runtime connectivity crashes or drops after the initial boot
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Warning: Express application lost connectivity stream with MongoDB server.');
});

mongoose.connection.on('error', (err) => {
  console.error(`🚨 Runtime MongoDB Database Stream Error Encountered: ${err}`);
});

module.exports = connectDB;
