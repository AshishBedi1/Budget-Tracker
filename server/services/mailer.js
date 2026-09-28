const nodemailer = require('nodemailer')

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim()) return value.trim().replace(/^"|"$/g, '')
  }
  return ''
}

function transport() {
  const user = envValue('SMTP_USER', 'MAIL_USER')
  const pass = envValue('SMTP_PASS', 'MAIL_PASSWORD').replace(/\s+/g, '')
  const host = envValue('SMTP_HOST', 'MAIL_HOST') || 'smtp.gmail.com'
  const port = Number(envValue('SMTP_PORT', 'MAIL_PORT') || 587)
  if (!user || !pass) {
    const error = new Error('email sending is not set up. add MAIL_USER and MAIL_PASSWORD in server/.env')
    error.status = 503
    throw error
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

async function sendSignupOtp(email, otp) {
  const from = envValue('SMTP_FROM', 'SMTP_USER', 'MAIL_USER')
  await transport().sendMail({
    from: `"Expense Tracker" <${from}>`,
    to: email,
    subject: 'Your Expense Tracker code',
    text: `Your signup code is ${otp}. It expires in 10 minutes. If you did not try to create an account, ignore this email.`,
    html: `<p>Your signup code is <strong style="font-size:22px;letter-spacing:4px">${otp}</strong>.</p><p>It expires in 10 minutes. If you did not try to create an account, ignore this email.</p>`,
  })
}

module.exports = { sendSignupOtp, transport }
