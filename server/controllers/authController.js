const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const User = require('../models/userModel')
const SignupOtp = require('../models/signupOtpModel')
const { sign } = require('../middleware/auth')
const { sendSignupOtp } = require('../services/mailer')

const OTP_MINUTES = 10

function cleanEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function presentUser(user) {
  return { id: user._id.toString(), email: user.email }
}

function hashOtp(otp) {
  const pepper = process.env.JWT_SECRET || 'expense-tracker-secret'
  return crypto.createHash('sha256').update(`${otp}:${pepper}`).digest('hex')
}

function newOtp() {
  return String(crypto.randomInt(100000, 1000000))
}

async function issueOtp(email, passwordHash) {
  const otp = newOtp()
  const expiresAt = new Date(Date.now() + OTP_MINUTES * 60 * 1000)
  await SignupOtp.findOneAndUpdate(
    { email },
    { email, passwordHash, otpHash: hashOtp(otp), expiresAt, attempts: 0 },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  try {
    await sendSignupOtp(email, otp)
  } catch (error) {
    await SignupOtp.deleteOne({ email })
    const status = error.status || 502
    const message = error.status
      ? error.message
      : 'could not send the code to that email. check the address and try again.'
    const wrapped = new Error(message)
    wrapped.status = status
    throw wrapped
  }
}

async function register(req, res) {
  try {
    const email = cleanEmail(req.body.email)
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (!isEmail(email)) return res.status(400).json({ message: 'enter a valid email.' })
    if (password.length < 4) return res.status(400).json({ message: 'use a password with at least 4 characters.' })

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: 'that email is already registered. log in instead.' })

    await issueOtp(email, await bcrypt.hash(password, 10))
    res.status(202).json({ otpRequired: true, email })
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'something went wrong.' })
  }
}

async function resendOtp(req, res) {
  try {
    const email = cleanEmail(req.body.email)
    const pending = isEmail(email) ? await SignupOtp.findOne({ email }) : null
    if (!pending) return res.status(400).json({ message: 'sign up again to get a new code.' })
    await issueOtp(email, pending.passwordHash)
    res.json({ otpRequired: true, email })
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'something went wrong.' })
  }
}

async function verifyOtp(req, res) {
  const email = cleanEmail(req.body.email)
  const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : ''
  if (!isEmail(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: 'enter the 6-digit code from your email.' })
  }

  const pending = await SignupOtp.findOne({ email })
  if (!pending || pending.expiresAt.getTime() < Date.now()) {
    if (pending) await SignupOtp.deleteOne({ email })
    return res.status(400).json({ message: 'that code expired. sign up again.' })
  }
  if (pending.attempts >= 5) {
    await SignupOtp.deleteOne({ email })
    return res.status(400).json({ message: 'too many tries. sign up again.' })
  }

  const matches = crypto.timingSafeEqual(Buffer.from(hashOtp(otp)), Buffer.from(pending.otpHash))
  if (!matches) {
    pending.attempts += 1
    await pending.save()
    return res.status(401).json({ message: 'that code is wrong.' })
  }

  const already = await User.findOne({ email })
  if (already) {
    await SignupOtp.deleteOne({ email })
    return res.status(409).json({ message: 'that email is already registered. log in instead.' })
  }

  let user
  try {
    user = await User.create({ email, passwordHash: pending.passwordHash })
  } catch (error) {
    if (error && error.code === 11000) {
      await SignupOtp.deleteOne({ email })
      return res.status(409).json({ message: 'that email is already registered. log in instead.' })
    }
    throw error
  }
  await SignupOtp.deleteOne({ email })
  res.status(201).json({ token: sign(user), user: presentUser(user) })
}

async function login(req, res) {
  const email = cleanEmail(req.body.email)
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  const user = isEmail(email) ? await User.findOne({ email }) : null
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'email or password is wrong.' })
  }
  res.json({ token: sign(user), user: presentUser(user) })
}

async function me(req, res) {
  const user = await User.findById(req.userId)
  if (!user) return res.status(401).json({ message: 'please log in again.' })
  res.json(presentUser(user))
}

module.exports = { register, resendOtp, verifyOtp, login, me }
