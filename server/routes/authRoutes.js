const express = require('express')
const authController = require('../controllers/authController')
const { auth } = require('../middleware/auth')

const router = express.Router()

router.post('/register', authController.register)
router.post('/verify-otp', authController.verifyOtp)
router.post('/resend-otp', authController.resendOtp)
router.post('/login', authController.login)
router.get('/me', auth, authController.me)

module.exports = router
