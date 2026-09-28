require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { connectDb } = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const expenseRoutes = require('./routes/expenseRoutes')

const PORT = Number(process.env.PORT) || 4000

async function main() {
  await connectDb()

  const app = express()
  app.use(cors())
  app.use(express.json())

  app.use('/api/auth', authRoutes)
  app.use('/api/categories', categoryRoutes)
  app.use('/api/expenses', expenseRoutes)

  app.use((error, _req, res, _next) => {
    console.error(error)
    res.status(500).json({ message: 'something went wrong.' })
  })

  app.listen(PORT, () => {
    console.log(`API on http://localhost:${PORT}`)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
