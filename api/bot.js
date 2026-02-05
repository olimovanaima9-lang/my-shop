import { createClient } from "@supabase/supabase-js"

export const config = {
  api: { bodyParser: true }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_ID = 5809105110

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).send("OK")
  }

  try {

    const update = req.body
    const message = update.message
    const callback = update.callback_query

    const chatId =
      message?.chat?.id ||
      callback?.message?.chat?.id

    if (!chatId) {
      return res.status(200).send("OK")
    }

    // ================= START =================
    if (message?.text === "/start") {

      await sendMessage(
        chatId,
        "🛒 Do‘konga xush kelibsiz!",
        {
          inline_keyboard: [
            [{ text: "📦 Mahsulotlar", callback_data: "products" }]
          ]
        }
      )

      return res.status(200).send("OK")
    }

    // ================= PRODUCTS =================
    if (callback?.data === "products") {

      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)

      if (!products?.length) {
        await sendMessage(chatId, "Mahsulot yo‘q")
        return res.status(200).send("OK")
      }

      for (const product of products) {
        await sendMessage(
          chatId,
          `🛍 ${product.name}\n💰 ${product.price} USD`,
          {
            inline_keyboard: [
              [{
                text: "🛒 Sotib olish",
                callback_data: `buy_${product.id}`
              }]
            ]
          }
        )
      }

      return res.status(200).send("OK")
    }

    return res.status(200).send("OK")

  } catch (error) {
    console.log("BOT ERROR:", error)
    return res.status(200).send("OK")
  }
}

async function sendMessage(chatId, text, keyboard = null) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: keyboard
    })
  })
}
