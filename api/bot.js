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
  try {

    if (req.method !== "POST") {
      return res.status(200).send("OK")
    }

    const update = req.body
    const message = update.message
    const callback = update.callback_query

    const chatId =
      message?.chat?.id ||
      callback?.message?.chat?.id

    if (!chatId) {
      return res.status(200).send("No chat")
    }

    // ================= START =================
    if (message?.text === "/start") {

      await sendMessage(chatId,
        "🛒 Do‘konga xush kelibsiz!",
        {
          inline_keyboard: [
            [{ text: "📦 Mahsulotlar", callback_data: "products" }]
          ]
        }
      )
    }

    // ================= MAHSULOTLAR =================
    if (callback?.data === "products") {

      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)

      if (!products?.length) {
        return sendMessage(chatId, "Mahsulot yo‘q")
      }

      for (const product of products) {
        await sendMessage(
          chatId,
          `🛍 ${product.name}\n💰 ${product.price} USD`,
          {
            inline_keyboard: [
              [
                {
                  text: "Sotib olish",
                  callback_data: `buy_${product.id}`
                }
              ]
            ]
          }
        )
      }
    }

    // ================= SOTIB OLISH =================
    if (callback?.data?.startsWith("buy_")) {

      const productId = callback.data.replace("buy_", "")

      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single()

      if (!product) {
        return sendMessage(chatId, "Mahsulot topilmadi")
      }

      // DB ga yozish
      await supabase.from("orders").insert([
        {
          user_id: chatId,
          items: [{ name: product.name, price: product.price }],
          total: product.price,
          status: "NEW"
        }
      ])

      // Admin ga xabar
      await sendMessage(
        ADMIN_ID,
        `🆕 Yangi buyurtma!\n👤 ${chatId}\n📦 ${product.name}\n💰 ${product.price} USD`
      )

      await sendMessage(chatId, "✅ Buyurtma qabul qilindi!")
    }

    res.status(200).send("OK")

  } catch (error) {
    console.error("SERVER ERROR:", error)
    res.status(200).send("ERROR")
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
