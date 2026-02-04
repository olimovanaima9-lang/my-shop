export const config = {
  api: {
    bodyParser: true,
  },
};

let orders = [];

export default async function handler(req, res) {
  const TOKEN = "8253928399:AAGcYrHrDGXkUTi61AeTavLN0Hfr0TuhSR4";
  const ADMIN_ID = 5809105110;
  const COOK_ID = 7630046950;

  if (req.method !== "POST") {
    return res.status(200).json({ status: "Bot running" });
  }

  const body = req.body;

  // ================= START =================
  if (body.message && body.message.text === "/start") {
    await sendMessage(TOKEN, body.message.chat.id,
      "🛍 Xush kelibsiz!\n\nDo‘konni oching:",
      {
        inline_keyboard: [
          [{
            text: "🛒 Do‘konni ochish",
            web_app: { url: "https://my-shop-xi-five.vercel.app" }
          }],
          [{
            text: "📦 Buyurtmalarim",
            callback_data: "my_orders"
          }]
        ]
      }
    );
  }

  // ================= WEB APP DATA =================
  if (body?.message?.web_app_data) {
    const user = body.message.from;
    const data = body.message.web_app_data.data;

    // ====== BUYURTMA YUBORILDI ======
    try {
      const cart = JSON.parse(data);

      if (!Array.isArray(cart)) return;

      const orderId = orders.length + 1;
      let total = 0;

      let text = `🆕 Yangi buyurtma #${orderId}\n\n`;
      text += `👤 ${user.first_name}\n\n`;

      cart.forEach((item, i) => {
        const sum = item.price * item.qty;
        total += sum;
        text += `${i + 1}. ${item.name} x${item.qty} - $${sum}\n`;
      });

      text += `\n💰 Jami: $${total}`;

      orders.push({
        id: orderId,
        user: user.id,
        items: cart,
        total,
        status: "Qabul qilindi"
      });

      // Adminga yuborish
      await sendMessage(TOKEN, ADMIN_ID, text, {
        inline_keyboard: [[{
          text: "👨‍🍳 Tayyorlash",
          callback_data: `cook_${orderId}`
        }]]
      });

      // Mijozga tasdiq
      await sendMessage(TOKEN, user.id,
        `✅ Buyurtmangiz qabul qilindi!\n\nBuyurtma raqami: #${orderId}`
      );

    } catch (e) {
      console.log("JSON error");
    }
  }

  // ================= CALLBACKS =================
  if (body?.callback_query) {
    const data = body.callback_query.data;
    const fromId = body.callback_query.from.id;

    // ====== BUYURTMALARIM ======
    if (data === "my_orders") {
      const userOrders = orders.filter(o => o.user === fromId);

      if (userOrders.length === 0) {
        await sendMessage(TOKEN, fromId, "📦 Sizda buyurtmalar yo‘q.");
        return;
      }

      let text = "📦 Sizning buyurtmalaringiz:\n\n";
      userOrders.forEach(o => {
        text += `#${o.id} - ${o.status}\n`;
      });

      await sendMessage(TOKEN, fromId, text);
    }

    // ====== COOK ======
    if (data.startsWith("cook_")) {
      const id = parseInt(data.split("_")[1]);
      const order = orders.find(o => o.id === id);
      if (!order) return;

      order.status = "Tayyorlanmoqda";

      await sendMessage(TOKEN, COOK_ID,
        `👨‍🍳 Buyurtma #${id} tayyorlash boshlandi`,
        {
          inline_keyboard: [[{
            text: "✅ Tayyor bo‘ldi",
            callback_data: `ready_${id}`
          }]]
        }
      );

      await sendMessage(TOKEN, order.user,
        `👨‍🍳 Buyurtmangiz #${id} tayyorlanmoqda`
      );
    }

    // ====== READY ======
    if (data.startsWith("ready_")) {
      const id = parseInt(data.split("_")[1]);
      const order = orders.find(o => o.id === id);
      if (!order) return;

      order.status = "Tayyor";

      await sendMessage(TOKEN, ADMIN_ID,
        `✅ Buyurtma #${id} tayyor bo‘ldi`,
        {
          inline_keyboard: [[{
            text: "🚚 Yetkazildi",
            callback_data: `delivered_${id}`
          }]]
        }
      );

      await sendMessage(TOKEN, order.user,
        `👨‍🍳 Buyurtmangiz #${id} tayyor bo‘ldi!`
      );
    }

    // ====== DELIVERED ======
    if (data.startsWith("delivered_")) {
      const id = parseInt(data.split("_")[1]);
      const order = orders.find(o => o.id === id);
      if (!order) return;

      order.status = "Yetkazildi";

      await sendMessage(TOKEN, ADMIN_ID,
        `🎉 Buyurtma #${id} yetkazildi!`
      );

      await sendMessage(TOKEN, order.user,
        `🚚 Buyurtmangiz #${id} yetkazildi!\nRahmat ❤️`
      );
    }
  }

  res.status(200).json({ ok: true });
}

async function sendMessage(token, chatId, text, keyboard = null) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: keyboard
    })
  });
}
