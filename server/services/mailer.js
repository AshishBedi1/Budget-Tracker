function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim()) return value.trim().replace(/^"|"$/g, '')
  }
  return ''
}

async function sendSignupOtp(email, otp) {
  const apiKey = envValue('BREVO_API_KEY')
  const from = envValue('MAIL_USER', 'SMTP_USER')
  if (!apiKey || !from) {
    const error = new Error('email sending is not set up. add BREVO_API_KEY and MAIL_USER')
    error.status = 503
    throw error
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Expense Tracker', email: from },
      to: [{ email }],
      subject: 'Your Expense Tracker code',
      textContent: `Your signup code is ${otp}. It expires in 10 minutes. If you did not try to create an account, ignore this email.`,
      htmlContent: `<p>Your signup code is <strong style="font-size:22px;letter-spacing:4px">${otp}</strong>.</p><p>It expires in 10 minutes. If you did not try to create an account, ignore this email.</p>`,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('Brevo send failed', response.status, detail)
    const error = new Error('could not send the code to that email. check the address and try again.')
    error.status = 502
    throw error
  }
}

module.exports = { sendSignupOtp }
