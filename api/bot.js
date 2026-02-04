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

  // START
  if (body.message && body.message.text === "/start") {
    await sendMessage(TOKEN, body.message.chat.id, "🛒 Do‘konni oching:", {
      inline_keyboard: [[{
        text: "🛒 Do‘konni ochish",
        web_app: { url: "https://my-shop-xi-five.vercel.app" }
      }]]
    });
  }

  // SAVAT BUYURTMA
  if (body?.message?.web_app_data) {
    const user = body.message.from;
    const cart = JSON.parse(body.message.web_app_data.data);

    let total = 0;
    let text = `🆕 Yangi buyurtma #${orders.length + 1}\n\n`;
    text += `👤 ${user.first_name}\n\n`;

    cart.forEach((item, index) => {
      text += `${index + 1}. ${item.name} - $${item.price}\n`;
      total += item.price;
    });

    text += `\n💰 Jami: $${total}`;

    const orderId = orders.length + 1;

    orders.push({
      id: orderId,
      user: user.id,
      items: cart,
      total: total,
      status: "new"
    });

    await sendMessage(TOKEN, ADMIN_ID, text, {
      inline_keyboard: [[{
        text: "👨‍🍳 Tayyorlashga yuborish",
        callback_data: `cook_${orderId}`
      }]]
    });
  }

  // TUGMALAR
  if (body?.callback_query) {
    const data = body.callback_query.data;

    if (data.startsWith("cook_")) {
      const id = parseInt(data.split("_")[1]);
      const order = orders.find(o => o.id === id);

      if (!order) return;

      order.status = "cooking";

      await sendMessage(TOKEN, COOK_ID,
        `👨‍🍳 Buyurtma #${id} tayyorlash boshlandi`,
        {
          inline_keyboard: [[{
            text: "✅ Tayyor bo‘ldi",
            callback_data: `ready_${id}`
          }]]
        }
      );
    }

    if (data.startsWith("ready_")) {
      const id = parseInt(data.split("_")[1]);
      const order = orders.find(o => o.id === id);

      if (!order) return;

      order.status = "ready";

      await sendMessage(TOKEN, ADMIN_ID,
        `✅ Buyurtma #${id} tayyor bo‘ldi`,
        {
          inline_keyboard: [[{
            text: "🚚 Yetkazildi",
            callback_data: `delivered_${id}`
          }]]
        }
      );
    }

    if (data.startsWith("delivered_")) {
      const id = parseInt(data.split("_")[1]);
      const order = orders.find(o => o.id === id);

      if (!order) return;

      order.status = "done";

      await sendMessage(TOKEN, ADMIN_ID,
        `🎉 Buyurtma #${id} yetkazildi!`
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
