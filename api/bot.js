export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  const TOKEN = "8253928399:AAGcYrHrDGXkUTi61AeTavLN0Hfr0TuhSR4";
  const ADMIN_ID = 5809105110;
  const COOK_ID = 7630046950;

  if (req.method !== "POST") {
    return res.status(200).json({ status: "Bot running" });
  }

  const body = req.body;

  // START komandasi
  if (body.message && body.message.text === "/start") {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: body.message.chat.id,
        text: "🛒 Do‘konni oching:",
        reply_markup: {
          inline_keyboard: [
            [{
              text: "🛒 Do‘konni ochish",
              web_app: { url: "https://my-shop-xi-five.vercel.app" }
            }]
          ]
        }
      })
    });
  }

  // WebApp data
  if (body?.message?.web_app_data) {
    const user = body.message.from;
    const product = body.message.web_app_data.data;

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

  res.status(200).json({ ok: true });
}
