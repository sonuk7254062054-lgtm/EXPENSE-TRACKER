import 'dotenv/config';
import mongoose from 'mongoose';

function maskUri(uri) {
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch {
    return uri;
  }
}

async function checkConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in your environment or .env file.');
    process.exit(1);
  }

  console.log(`🔍 Checking MongoDB connection to: ${maskUri(uri)}`);

  const startTime = Date.now();
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const duration = Date.now() - startTime;
    console.log(`✅ MongoDB Connected Successfully in ${duration}ms!`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   ReadyState: ${mongoose.connection.readyState} (connected)`);

    // Ping the database to verify active round-trip communication
    await mongoose.connection.db.admin().ping();
    console.log('✅ Ping check passed!');

    await mongoose.disconnect();
    console.log('🔌 Disconnected cleanly.');
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ MongoDB connection failed after ${duration}ms:`);
    console.error(`   Error Name: ${error.name}`);
    console.error(`   Error Message: ${error.message}`);

    if (error.code === 8000 || error.message?.includes('authentication failed') || error.message?.includes('bad auth')) {
      console.error('\n💡 Diagnosis: Authentication Failed (bad auth)');
      console.error('   - The username or password in MONGODB_URI does not match MongoDB Atlas.');
      console.error('   - In MongoDB Atlas, verify your user in "Database Access".');
      console.error('   - Ensure the user has "Read and write to any database" privileges.');
      console.error('   - If your password contains special characters, ensure it is properly URL-encoded.');
    } else if (error.name === 'MongooseServerSelectionError') {
      console.error('\n💡 Diagnosis: Server Selection Timeout / Network Unreachable');
      console.error('   - For MongoDB Atlas: verify your IP address is whitelisted in "Network Access" (or set 0.0.0.0/0 for testing).');
      console.error('   - For Local MongoDB: verify that the MongoDB service is running (e.g. net start MongoDB or mongod).');
    }

    process.exit(1);
  }
}

checkConnection();
