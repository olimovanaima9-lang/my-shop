import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: true } };

const supabase = createClient(
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY"
);

const TOKEN = "BOT_TOKEN";
const ADMIN_ID = 5809105110;
const COOK_ID = 7630046950;

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).json({ status: "OK" });
  }

  const body = req.body;

  if (body.message?.text === "/start") {
    await sendMessage(body.message.chat.id,
      "🛍 Xush kelibsiz!",
      {
        inline_keyboard: [[{
          text: "🛒 Do‘kon",
          web_app: { url: "https://YOUR_DOMAIN.vercel.app" }
        }]]
      }
    );
  }

  if (body.message?.web_app_data) {
    const user = body.message.from;
    const cart = JSON.parse(body.message.web_app_data.data);

    let total = 0;
    cart.forEach(i => total += i.price * i.qty);

    const { data: order } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        items: cart,
        total: total,
        status: "NEW"
      })
      .select()
      .single();

    await sendMessage(ADMIN_ID,
      `🆕 Yangi buyurtma\nID: ${order.id}\nJami: $${total}`
    );

    await sendMessage(user.id,
      `✅ Buyurtma qabul qilindi!\nID: ${order.id}`
    );
  }

  res.status(200).json({ ok: true });
}

async function sendMessage(chatId, text, keyboard=null){
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: keyboard
    })
  });
}
