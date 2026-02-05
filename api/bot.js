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
if (message && message.text && message.text.startsWith("/start")) {

  await sendMessage(chatId, "🛒 Do‘konga xush kelibsiz!", {
    inline_keyboard: [
      [{ text: "📦 Mahsulotlar", callback_data: "products" }],
      [{ text: "🛒 Savat", callback_data: "cart" }]
    ]
  })

  return
}

    // ================= PRODUCTS =================
    if (callback?.data === "products") {

      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)

      if (!products?.length) {
        return sendMessage(chatId, "Mahsulot yo‘q")
      }

      for (const product of products) {
        await sendMessage(chatId,
          `🛍 ${product.name}\n💰 ${product.price} USD`,
          {
            inline_keyboard: [
              [{
                text: "➕ Savatga qo‘shish",
                callback_data: `add_${product.id}`
              }]
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
        await supabase.from("cart").insert([
          {
            user_id: chatId,
            product_id: productId,
            quantity: 1
          }
        ])
      }

      await sendMessage(chatId, "✅ Savatga qo‘shildi")
    }

    // ================= VIEW CART =================
    if (callback?.data === "cart") {

      const { data: items } = await supabase
        .from("cart")
        .select("*, products(name,price)")
        .eq("user_id", chatId)

      if (!items?.length) {
        return sendMessage(chatId, "🛒 Savat bo‘sh")
      }

      let text = "🛒 Savat:\n\n"
      let total = 0

      const keyboard = { inline_keyboard: [] }

      items.forEach(item => {
        const price = item.products.price
        const sum = price * item.quantity
        total += sum

        text += `📦 ${item.products.name}\n`
        text += `💰 ${price} x ${item.quantity} = ${sum} USD\n\n`

        keyboard.inline_keyboard.push([
          {
            text: "➖",
            callback_data: `minus_${item.id}`
          },
          {
            text: "➕",
            callback_data: `plus_${item.id}`
          },
          {
            text: "❌",
            callback_data: `remove_${item.id}`
          }
        ])
      })

      text += `\n💵 Jami: ${total} USD`

      keyboard.inline_keyboard.push([
        { text: "✅ Buyurtma berish", callback_data: "checkout" }
      ])

      await sendMessage(chatId, text, keyboard)
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

      await sendMessage(chatId, "➕ Yangilandi")
    }

    // ================= MINUS =================
    if (callback?.data?.startsWith("minus_")) {

      const id = callback.data.replace("minus_", "")

      const { data } = await supabase
        .from("cart")
        .select("*")
        .eq("id", id)
        .single()

      if (data.quantity <= 1) {
        await supabase.from("cart").delete().eq("id", id)
      } else {
        await supabase
          .from("cart")
          .update({ quantity: data.quantity - 1 })
          .eq("id", id)
      }

      await sendMessage(chatId, "➖ Yangilandi")
    }

    // ================= REMOVE =================
    if (callback?.data?.startsWith("remove_")) {

      const id = callback.data.replace("remove_", "")

      await supabase.from("cart").delete().eq("id", id)

      await sendMessage(chatId, "❌ O‘chirildi")
    }

    // ================= CHECKOUT =================
    if (callback?.data === "checkout") {

      const { data: items } = await supabase
        .from("cart")
        .select("*, products(name,price)")
        .eq("user_id", chatId)

      if (!items?.length) {
        return sendMessage(chatId, "Savat bo‘sh")
      }

      let total = 0

      const orderItems = items.map(item => {
        total += item.products.price * item.quantity
        return {
          name: item.products.name,
          price: item.products.price,
          quantity: item.quantity
        }
      })

      await supabase.from("orders").insert([
        {
          user_id: chatId,
          items: orderItems,
          total,
          status: "NEW"
        }
      ])

      await supabase.from("cart")
        .delete()
        .eq("user_id", chatId)

      await sendMessage(chatId, "✅ Buyurtma yuborildi!")

      await sendMessage(
        ADMIN_ID,
        `🆕 Yangi buyurtma\n👤 ${chatId}\n💵 ${total} USD`
      )
    }

  } catch (err) {
    console.log(err)
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
