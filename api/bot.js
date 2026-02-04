export const config = {
  api: { bodyParser: true },
}

export default async function handler(req, res) {

  const TOKEN = process.env.BOT_TOKEN
  const ADMIN_ID = 5809105110

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true })
  }

  const body = req.body

  // USER BUYURTMA BERGANDA
  if (body.message?.web_app_data) {

    const user = body.message.from
    const data = JSON.parse(body.message.web_app_data.data)

    const itemsText = data.items.map(i =>
      `${i.name} x ${i.qty} = ${i.price * i.qty} USD`
    ).join("\n")

    const text = `
🛒 Yangi buyurtma!

👤 ${user.first_name}
🆔 ${user.id}

${itemsText}

💰 Jami: ${data.total} USD
    `

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        text: text
      })
    })
  }

  return res.status(200).json({ ok: true })
}
