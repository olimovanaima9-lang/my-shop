import { createClient } from "@supabase/supabase-js"

export const config = {
  api: { bodyParser: true }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const BOT_TOKEN = process.env.BOT_TOKEN

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

    // ================= ADMIN TEKSHIRISH =================
    const { data: adminCheck } = await supabase
      .from("admins")
      .select("*")
      .eq("id", chatId)
      .single()

    const isAdmin = !!adminCheck

    // ================= /START =================
    if (message?.text === "/start") {

      return sendMessage(chatId,
        "🛒 Do‘konga xush kelibsiz!",
        {
          inline_keyboard: [
            [{ text: "📦 Mahsulotlar", callback_data: "products" }],
            [{ text: "🛍 Savat", callback_data: "cart" }]
          ]
        }
      )
    }

    // ================= ADMIN QO‘SHISH =================
    if (message?.text?.startsWith("/addadmin")) {

      if (!isAdmin) {
        return sendMessage(chatId, "❌ Siz admin emassiz")
      }

      const newId = message.text.split(" ")[1]

      if (!newId) {
        return sendMessage(chatId, "ID yozing: /addadmin 123456")
      }

      await supabase.from("admins").insert([
        { id: Number(newId) }
      ])

      return sendMessage(chatId, "✅ Admin qo‘shildi")
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

      const { data: order } = await supabase
        .from("orders")
        .insert([
          {
            user_id: chatId,
            total: product.price,
            status: "NEW"
          }
        ])
        .select()
        .single()

      await supabase.from("order_items").insert([
        {
          order_id: order.id,
          product_id: product.id,
          quantity: 1
        }
      ])

      // ADMINLARGA XABAR
      const { data: admins } = await supabase
        .from("admins")
        .select("*")

      for (const admin of admins) {
        await sendMessage(
          admin.id,
          `🆕 Yangi buyurtma!\n👤 ${chatId}\n📦 ${product.name}\n💰 ${product.price} USD`
        )
      }

      return sendMessage(chatId, "✅ Buyurtma qabul qilindi!")
    }

    res.status(200).send("OK")

  } catch (error) {
    console.error("SERVER ERROR:", error)
    res.status(200).send("ERROR")
  }
}

async function sendMessage(chatId, text, keyboard = null) {
  await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: keyboard
    })
  })
}
