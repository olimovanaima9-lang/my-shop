import { createClient } from "@supabase/supabase-js"

export const config = {
  api: { bodyParser: true }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const BOT_TOKEN = process.env.BOT_TOKEN
const SUPER_ADMIN = 5809105110 // birinchi admin

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

    // ================= /ID =================
    if (message?.text === "/id") {
      return sendMessage(chatId, `🆔 Sizning ID: ${chatId}`)
    }

    // ================= /START =================
    if (message?.text === "/start") {
      return sendMessage(chatId,
        "🛒 Do‘konga xush kelibsiz!",
        {
          keyboard: [
            [{ text: "🛍 Mahsulotlar" }],
            [{ text: "📦 Buyurtmalarim" }]
          ],
          resize_keyboard: true
        }
      )
    }

    // ================= ADMIN TEKSHIRUV =================
    const { data: adminCheck } = await supabase
      .from("admins")
      .select("*")
      .eq("id", chatId)
      .single()

    const isAdmin = adminCheck || chatId === SUPER_ADMIN

    // ================= /ADMIN =================
    if (message?.text === "/admin") {

      if (!isAdmin) {
        return sendMessage(chatId, "⛔ Siz admin emassiz")
      }

      return sendMessage(chatId,
        "👨‍💼 Admin Panel",
        {
          keyboard: [
            [{ text: "📦 Buyurtmalar" }],
            [{ text: "➕ Mahsulot qo‘shish" }],
            [{ text: "👥 Admin qo‘shish" }]
          ],
          resize_keyboard: true
        }
      )
    }

    // ================= ADMIN QO‘SHISH =================
    if (message?.text?.startsWith("/addadmin")) {

      if (chatId !== SUPER_ADMIN) {
        return sendMessage(chatId, "⛔ Faqat super admin qo‘sha oladi")
      }

      const newAdminId = parseInt(message.text.split(" ")[1])

      if (!newAdminId) {
        return sendMessage(chatId, "ID kiriting: /addadmin 123456")
      }

      await supabase.from("admins").insert([{ id: newAdminId }])

      return sendMessage(chatId, `✅ Admin qo‘shildi: ${newAdminId}`)
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
          `🛍 ${product.name}\n💰 ${product.price} USD`,
          {
            inline_keyboard: [
              [
                {
                  text: "🛒 Sotib olish",
                  callback_data: `buy_${product.id}`
                }
              ]
            ]
          }
        )
      }
    }

    // ================= BUY =================
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

      // Adminlarga yuborish
      const { data: admins } = await supabase
        .from("admins")
        .select("*")

      if (admins) {
        for (const admin of admins) {
          await sendMessage(
            admin.id,
            `🆕 Yangi buyurtma!\n👤 ${chatId}\n📦 ${product.name}\n💰 ${product.price} USD`
          )
        }
      }

      if (chatId === SUPER_ADMIN) {
        await sendMessage(
          SUPER_ADMIN,
          `🆕 Yangi buyurtma!\n👤 ${chatId}\n📦 ${product.name}\n💰 ${product.price} USD`
        )
      }

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
