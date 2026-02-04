import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: true,
  },
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const TOKEN = process.env.BOT_TOKEN
const ADMIN_ID = 5809105110

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'Bot running' })
  }

  const body = req.body

  // ===== WEB APP DAN BUYURTMA =====
  if (body.message?.web_app_data) {
    const user = body.message.from
    const data = JSON.parse(body.message.web_app_data.data)

    const { items, total } = data

    // 🔥 BUYURTMANI SUPABASE GA YOZAMIZ
    const { error } = await supabase.from('orders').insert([
      {
        user_id: user.id,
        items: items,
        total: total,
        status: 'NEW'
      }
    ])

    if (error) {
      console.log(error)
    }

    // ADMIN GA XABAR
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        text: `🛒 Yangi buyurtma!\n👤 ${user.first_name}\n💰 ${total} USD`
      })
    })

    return res.status(200).json({ ok: true })
  }

  res.status(200).json({ ok: true })
}
