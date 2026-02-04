export default async function handler(req, res) {
  try {
    const BOT_TOKEN = process.env.BOT_TOKEN

    if (req.method !== "POST") {
      return res.status(200).send("OK")
    }

    const update = req.body

    console.log("UPDATE:", JSON.stringify(update))

    const chatId =
      update.message?.chat?.id ||
      update.callback_query?.message?.chat?.id

    if (!chatId) {
      return res.status(200).send("No chat id")
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Bot ishlayapti ✅"
      })
    })

    res.status(200).send("OK")

  } catch (error) {
    console.error("ERROR:", error)
    res.status(200).send("ERROR")
  }
}
