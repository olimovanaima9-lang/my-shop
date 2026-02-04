export default async function handler(req, res) {
  const TOKEN = "8253928399:AAGcYrHrDGXkUTi61AeTavLN0Hfr0TuhSR4";
  const ADMIN_ID = 5809105110;
  const COOK_ID = 7630046950;

  if (req.method !== "POST") {
    return res.status(200).json({ status: "Bot running" });
  }

  const body = req.body;

  // WebApp dan kelgan data
  if (body.message && body.message.web_app_data) {
    const user = body.message.from;
    const product = body.message.web_app_data.data;

    // Admin ga xabar
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        text: `🆕 Yangi buyurtma!\n\n👤 ${user.first_name}\n🛒 ${product}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "👨‍🍳 Tayyorlashga yuborish", callback_data: "send_to_cook" }]
          ]
        }
      })
    });
  }

  // Tugmalar ishlashi
  if (body.callback_query) {
    const data = body.callback_query.data;
    const message = body.callback_query.message;

    if (data === "send_to_cook") {
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: COOK_ID,
          text: `👨‍🍳 Yangi buyurtma tayyorlash uchun!`,
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Tayyor bo‘ldi", callback_data: "ready_done" }]
            ]
          }
        })
      });
    }

    if (data === "ready_done") {
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_ID,
          text: `✅ Buyurtma tayyor bo‘ldi!`
        })
      });
    }
  }

  res.status(200).json({ ok: true });
}
