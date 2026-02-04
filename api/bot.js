import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req, res) {
  const BOT_TOKEN = process.env.BOT_TOKEN

  if (req.method !== "POST") {
    return res.status(200).send("OK")
  }

  const update = req.body

  const message = update.message
  const chatId =
    message?.chat?.id ||
    update.callback_query?.message?.chat?.id

  if (!chatId) {
    return res.status(200).send("No chat id")
  }

  // ===== START =====
  if (message?.text === "/start") {
    await sendMessage(BOT_TOKEN, chatId, "Assalomu alaykum 👋", {
      keyboard: [[{ text: "🛍 Do'kon" }]],
      resize_keyboard: true
    })
  }

  // ===== DO'KON =====
  if (message?.text === "🛍 Do'kon") {
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)

    if (!products.length) {
      return sendMessage(BOT_TOKEN, chatId, "Mahsulot yo‘q")
    }

    for (const product of products) {
      await sendMessage(
        BOT_TOKEN,
        chatId,
        `🛒 ${product.name}\n💵 ${product.price} USD`,
        {
          inline_keyboard: [
            [
              {
                text: "Savatga qo‘shish",
                callback_data: `add_${product.id}`
              }
            ]
          ]
        }
      )
    }
  }

  // ===== SAVATGA QO‘SHISH =====
  if (update.callback_query) {
    const data = update.callback_query.data

    if (data.startsWith("add_")) {
      const productId = data.replace("add_", "")

      await sendMessage(
        BOT_TOKEN,
        chatId,
        "Mahsulot savatga qo‘shildi ✅"
      )
    }
  }

  res.status(200).send("OK")
}

async function sendMessage(token, chatId, text, keyboard = null) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: keyboard
    })
  })
}
