import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import cron from 'node-cron'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  }).listen(port, () => {
    console.log(`FamilyKitchen kører på http://localhost:${port}`)
  })

  // Tjek Telegram-sendetidspunkt hvert minut
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const isSunday = now.getDay() === 0
      if (!isSunday) return

      // Hent konfigureret tidspunkt fra database via API
      const res = await fetch(`http://localhost:${port}/api/settings`)
      const settings = await res.json() as Record<string, string>
      const sendTime = settings.telegram_send_time || '09:00'
      const [hour, minute] = sendTime.split(':').map(Number)

      if (now.getHours() === hour && now.getMinutes() === minute) {
        console.log('Sender ugentlig Telegram-besked...')
        await fetch(`http://localhost:${port}/api/cron`, { method: 'POST' })
      }
    } catch (e) {
      console.error('Cron-fejl:', e)
    }
  })
})
