import { createClient } from "@supabase/supabase-js"

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_ID = 5809105110

export default async function handler(req, res) {

  // ❗ MUHIM: DARROV OK QAYTARAMIZ
  res.status(200).send("OK")

  try {

    if (req.method !== "POST") return

    const update = req.body
    const message = update.message
    const callback = update.callback_query

    const chatId =
      message?.chat?.id ||
      callback?.message?.chat?.id

    if (!chatId) return

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

      // DB ga yozamiz (awaitsiz)
      supabase.from("users").upsert([{ id: chatId }])

      return
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
              [{
                text: "🛒 Sotib olish",
                callback_data: `buy_${product.id}`
              }]
            ]
          }
        )
      }

      return
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

      await supabase.from("orders").insert([
        {
          user_id: chatId,
          items: [{ name: product.name, price: product.price }],
          total: product.price,
          status: "NEW"
        }
      ])

      await sendMessage(
        ADMIN_ID,
        `🆕 Yangi buyurtma!
👤 ${chatId}
📦 ${product.name}
💰 ${product.price} USD`
      )

      await sendMessage(chatId, "✅ Buyurtma qabul qilindi!")

      return
    }

  } catch (error) {
    console.log("BOT ERROR:", error)
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
