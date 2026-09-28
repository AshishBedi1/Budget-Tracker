const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'expense-tracker-secret'

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ message: 'please log in again.' })
  }
}

function sign(user) {
  return jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '30d' })
}

module.exports = { auth, sign }
