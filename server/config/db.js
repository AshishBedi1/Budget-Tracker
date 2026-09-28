const mongoose = require('mongoose')

async function connectDb() {
  const configured = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!configured) throw new Error('MONGO_URI is missing from server/.env')
  await mongoose.connect(configured, { serverSelectionTimeoutMS: 20000 })
  const users = mongoose.connection.collection('users')
  const indexes = await users.indexes().catch(() => [])
  if (indexes.some((index) => index.name === 'nameKey_1')) {
    await users.dropIndex('nameKey_1')
  }
  console.log('MongoDB connected')
}

module.exports = { connectDb }
