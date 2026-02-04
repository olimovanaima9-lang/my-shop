export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).send("OK")
  }

  // ⚡ Telegramga darhol javob beramiz
  res.status(200).send("OK")

  try {

    const update = req.body
    const message = update.message
    const callback = update.callback_query

    const chatId =
      message?.chat?.id ||
      callback?.message?.chat?.id

    if (!chatId) return

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
                text: "Sotib olish",
                callback_data: `buy_${product.id}`
              }]
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

      await supabase.from("orders").insert([
        {
          user_id: chatId,
          items: [{ name: product.name, price: product.price }],
          total: product.price,
          status: "NEW"
        }
      ])

      await sendMessage(chatId, "✅ Buyurtma qabul qilindi!")

      await sendMessage(
        5809105110,
        `🆕 Yangi buyurtma!\n👤 ${chatId}\n📦 ${product.name}\n💰 ${product.price} USD`
      )
    }

  } catch (error) {
    console.error("SERVER ERROR:", error)
  }
}
