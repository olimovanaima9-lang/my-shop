import { createClient } from "@supabase/supabase-js"

export const config = { api: { bodyParser: true } }

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const BOT_TOKEN = process.env.BOT_TOKEN

export default async function handler(req, res) {
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
    return res.status(200).send("OK")
  }

  // ================= START =================
  if (message?.text === "/start") {

    await supabase.from("users").upsert({ id: chatId })

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

  // ================= ADD TO CART =================
  if (callback?.data?.startsWith("add_")) {

    const productId = callback.data.replace("add_", "")

    const { data: existing } = await supabase
      .from("cart")
      .select("*")
      .eq("user_id", chatId)
      .eq("product_id", productId)
      .single()

    if (existing) {
      await supabase
        .from("cart")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id)
    } else {
      await supabase.from("cart").insert({
        user_id: chatId,
        product_id: productId,
        quantity: 1
      })
    }

    await sendMessage(chatId, "✅ Savat yangilandi")
  }

  // ================= SAVAT =================
  if (message?.text === "🛒 Savat") {

    const { data: items } = await supabase
      .from("cart")
      .select("*, products(*)")
      .eq("user_id", chatId)

    if (!items?.length) {
      return sendMessage(chatId, "Savat bo‘sh")
    }

    for (const item of items) {

      await sendMessage(
        chatId,
        `🛍 ${item.products.name}\n💰 ${item.products.price} USD\n🔢 ${item.quantity}`,
        {
          inline_keyboard: [
            [
              { text: "➖", callback_data: `minus_${item.id}` },
              { text: "➕", callback_data: `plus_${item.id}` },
              { text: "❌", callback_data: `remove_${item.id}` }
            ]
          ]
        }
      )
    }

    await sendMessage(chatId,
      "📦 Buyurtma berish?",
      {
        inline_keyboard: [
          [{ text: "✅ Buyurtma berish", callback_data: "order_now" }]
        ]
      }
    )
  }

  // ================= PLUS =================
  if (callback?.data?.startsWith("plus_")) {

    const id = callback.data.replace("plus_", "")

    const { data } = await supabase
      .from("cart")
      .select("*")
      .eq("id", id)
      .single()

    await supabase
      .from("cart")
      .update({ quantity: data.quantity + 1 })
      .eq("id", id)

    await sendMessage(chatId, "➕ Ko‘paytirildi")
  }

  // ================= MINUS =================
  if (callback?.data?.startsWith("minus_")) {

    const id = callback.data.replace("minus_", "")

    const { data } = await supabase
      .from("cart")
      .select("*")
      .eq("id", id)
      .single()

    if (data.quantity > 1) {
      await supabase
        .from("cart")
        .update({ quantity: data.quantity - 1 })
        .eq("id", id)
    }

    await sendMessage(chatId, "➖ Kamaytirildi")
  }

  // ================= REMOVE =================
  if (callback?.data?.startsWith("remove_")) {

    const id = callback.data.replace("remove_", "")

    await supabase
      .from("cart")
      .delete()
      .eq("id", id)

    await sendMessage(chatId, "❌ O‘chirildi")
  }

  // ================= ORDER =================
  if (callback?.data === "order_now") {

    const { data: items } = await supabase
      .from("cart")
      .select("*, products(*)")
      .eq("user_id", chatId)

    let total = 0

    items.forEach(i => {
      total += i.products.price * i.quantity
    })

    const { data: order } = await supabase
      .from("orders")
      .insert({
        user_id: chatId,
        total,
        status: "NEW"
      })
      .select()
      .single()

    for (const i of items) {
      await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: i.product_id,
        quantity: i.quantity
      })
    }

    await supabase
      .from("cart")
      .delete()
      .eq("user_id", chatId)

    await sendMessage(chatId, "✅ Buyurtma qabul qilindi")

    // Adminlarga yuborish
    const { data: admins } = await supabase
      .from("admins")
      .select("*")

    for (const admin of admins) {
      await sendMessage(
        admin.id,
        `🆕 Yangi buyurtma\n👤 ${chatId}\n💰 ${total} USD`
      )
    }
  }

  res.status(200).send("OK")
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
