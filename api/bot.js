import { createClient } from "@supabase/supabase-js"

export const config = { api: { bodyParser: true } }

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

    if (!chatId) return res.status(200).send("No chat")

    // ================= START =================
    if (message?.text === "/start") {

      await sendMessage(chatId,
        "🛒 *Do‘konga xush kelibsiz!*",
        {
          keyboard: [
            [{ text: "🛍 Mahsulotlar" }],
            [{ text: "📦 Buyurtmalarim" }]
          ],
          resize_keyboard: true
        },
        true
      )
    }

    // ================= MAHSULOTLAR =================
    if (message?.text === "🛍 Mahsulotlar") {

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
          `🛍 *${product.name}*\n💰 ${product.price} USD`,
          {
            inline_keyboard: [
              [
                { text: "➖", callback_data: `minus_${product.id}_1` },
                { text: "1", callback_data: "count" },
                { text: "➕", callback_data: `plus_${product.id}_1` }
              ],
              [
                { text: "🛒 Savatga qo‘shish", callback_data: `buy_${product.id}_1` }
              ]
            ]
          },
          true
        )
      }
    }

    // ================= PLUS / MINUS =================
    if (callback?.data?.startsWith("plus_") ||
        callback?.data?.startsWith("minus_")) {

      const [type, productId, count] = callback.data.split("_")
      let newCount = parseInt(count)

      if (type === "plus") newCount++
      if (type === "minus" && newCount > 1) newCount--

      await answerCallback(callback.id)

      await sendMessage(
        chatId,
        "Miqdor yangilandi",
        {
          inline_keyboard: [
            [
              { text: "➖", callback_data: `minus_${productId}_${newCount}` },
              { text: `${newCount}`, callback_data: "count" },
              { text: "➕", callback_data: `plus_${productId}_${newCount}` }
            ],
            [
              { text: "🛒 Savatga qo‘shish", callback_data: `buy_${productId}_${newCount}` }
            ]
          ]
        }
      )
    }

    // ================= SOTIB OLISH =================
    if (callback?.data?.startsWith("buy_")) {

      const [, productId, count] = callback.data.split("_")

      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single()

      if (!product) {
        return sendMessage(chatId, "Mahsulot topilmadi")
      }

      const total = product.price * count

      await supabase.from("orders").insert([
        {
          user_id: chatId,
          items: [{
            name: product.name,
            price: product.price,
            count: count
          }],
          total: total,
          status: "NEW"
        }
      ])

      await sendMessage(
        ADMIN_ID,
        `🆕 *Yangi buyurtma!*\n👤 ${chatId}\n📦 ${product.name}\n🔢 ${count} dona\n💰 ${total} USD`,
        null,
        true
      )

      await sendMessage(chatId,
        `✅ Buyurtma qabul qilindi!\n💰 Jami: ${total} USD`
      )

      await answerCallback(callback.id)
    }

    res.status(200).send("OK")

  } catch (error) {
    console.error("SERVER ERROR:", error)
    res.status(200).send("ERROR")
  }
}

async function sendMessage(chatId, text, keyboard = null, markdown = false) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: markdown ? "Markdown" : undefined,
      reply_markup: keyboard
    })
  })
}

async function answerCallback(callbackId) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackId
    })
  })
}
