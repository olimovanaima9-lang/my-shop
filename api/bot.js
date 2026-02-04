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

      await supabase
        .from("users")
        .upsert({ id: chatId })

      await sendMessage(chatId,
        "🛒 Do‘konga xush kelibsiz!",
        {
          keyboard: [
            [{ text: "📦 Mahsulotlar" }],
            [{ text: "🛒 Savat" }, { text: "👤 Profil" }]
          ],
          resize_keyboard: true
        }
      )
    }

    // ================= MAHSULOTLAR =================
    if (message?.text === "📦 Mahsulotlar") {

      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)

      if (!products?.length) {
        return sendMessage(chatId, "Mahsulot yo‘q")
      }

      for (const product of products) {
        await sendPhoto(
          chatId,
          product.image,
          `🛍 ${product.name}\n💰 ${product.price} USD`,
          {
            inline_keyboard: [
              [
                {
                  text: "➕ Savatga qo‘shish",
                  callback_data: `add_${product.id}`
                }
              ]
            ]
          }
        )
      }
    }

    // ================= SAVATGA QO‘SHISH =================
    if (callback?.data?.startsWith("add_")) {

      const productId = callback.data.replace("add_", "")

      await supabase.from("cart").insert([
        {
          user_id: chatId,
          product_id: productId,
          quantity: 1
        }
      ])

      await sendMessage(chatId, "✅ Savatga qo‘shildi")
    }

    // ================= SAVAT =================
    if (message?.text === "🛒 Savat") {

      const { data: cartItems } = await supabase
        .from("cart")
        .select("*, products(*)")
        .eq("user_id", chatId)

      if (!cartItems?.length) {
        return sendMessage(chatId, "Savat bo‘sh")
      }

      let total = 0
      let text = "🛒 Savatingiz:\n\n"

      cartItems.forEach(item => {
        total += item.products.price * item.quantity
        text += `• ${item.products.name} x${item.quantity}\n`
      })

      text += `\n💰 Jami: ${total} USD`

      await sendMessage(chatId, text, {
        inline_keyboard: [
          [{ text: "📦 Buyurtma berish", callback_data: "order_now" }]
        ]
      })
    }

    // ================= BUYURTMA =================
    if (callback?.data === "order_now") {

      const { data: cartItems } = await supabase
        .from("cart")
        .select("*, products(*)")
        .eq("user_id", chatId)

      if (!cartItems?.length) {
        return sendMessage(chatId, "Savat bo‘sh")
      }

      let total = 0
      cartItems.forEach(item => {
        total += item.products.price * item.quantity
      })

      await supabase.from("orders").insert([
        {
          user_id: chatId,
          total
        }
      ])

      await supabase
        .from("cart")
        .delete()
        .eq("user_id", chatId)

      await sendMessage(chatId, "✅ Buyurtma qabul qilindi!")

      await sendMessage(
        ADMIN_ID,
        `🆕 Yangi buyurtma!\n👤 ${chatId}\n💰 ${total} USD`
      )
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

async function sendPhoto(chatId, photo, caption, keyboard = null) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo,
      caption,
      reply_markup: keyboard
    })
  })
}
