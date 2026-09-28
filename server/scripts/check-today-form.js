require('dotenv').config()
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const mongoose = require('mongoose')
const User = require('../models/userModel')
const { sign } = require('../middleware/auth')

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9333
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'et-check-'))

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForPage() {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/json/list' }, (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          const pages = JSON.parse(body).filter((target) => target.type === 'page' && target.webSocketDebuggerUrl)
          if (pages[0]) resolve(pages[0])
          else if (Date.now() - start > 15000) reject(new Error('no browser page'))
          else setTimeout(tick, 250)
        })
      })
      req.on('error', () => {
        if (Date.now() - start > 15000) reject(new Error('browser did not start'))
        else setTimeout(tick, 250)
      })
    }
    tick()
  })
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 })
  const user = await User.findOne({ email: 'ashishbedi02@gmail.com' })
  if (!user) throw new Error('account missing')
  const token = sign(user)
  await mongoose.disconnect()

  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userData}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  try {
    const target = await waitForPage()
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve)
      ws.addEventListener('error', () => reject(new Error('devtools failed')))
    })

    let id = 0
    const pending = new Map()
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id)
        pending.delete(data.id)
        if (data.error) reject(new Error(data.error.message))
        else resolve(data.result)
      }
    })

    function send(method, params = {}) {
      const msgId = ++id
      return new Promise((resolve, reject) => {
        pending.set(msgId, { resolve, reject })
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    async function evalJson(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw new Error('page script failed')
      return JSON.parse(result.result.value)
    }

    await send('Runtime.enable')
    await send('Page.navigate', { url: 'http://localhost:5173/' })
    await sleep(800)
    await send('Runtime.evaluate', {
      expression: `localStorage.setItem('expense-tracker.token', ${JSON.stringify(token)})`,
    })
    await send('Page.navigate', { url: 'http://localhost:5173/' })

    let view = null
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await sleep(400)
      view = await evalJson(`(() => JSON.stringify({
        heading: document.querySelector('.add-form h2')?.textContent || '',
        date: document.querySelector('.add-form input[type="date"]')?.value || '',
        day: document.querySelector('.day-switch span')?.textContent || '',
        hasSaveSpend: document.body.innerText.includes('save spend'),
        hasAmountLabel: [...document.querySelectorAll('.add-form label')].some((label) => label.childNodes[0]?.textContent?.trim() === 'amount'),
        hasNote: [...document.querySelectorAll('.add-form label')].some((label) => label.childNodes[0]?.textContent?.trim() === 'note'),
        button: document.querySelector('.add-form button.primary')?.textContent?.trim() || ''
      }))()`)
      if (view.heading) break
    }

    const changed = await evalJson(`(() => {
      const input = document.querySelector('.add-form input[type="date"]')
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(input, '2026-09-26')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return JSON.stringify({
        date: input.value,
        day: document.querySelector('.day-switch span')?.textContent || ''
      })
    })()`)

    console.log(JSON.stringify({ view, changed }))
    ws.close()
  } finally {
    child.kill()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
