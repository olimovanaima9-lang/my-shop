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

  // ===== START =====
  if (body.message?.text === "/start") {
    await sendMessage(body.message.chat.id,
      "🛍 Xush kelibsiz!",
      {
        inline_keyboard: [[{
          text: "🛒 Do‘kon",
          web_app: { url: "https://YOUR_DOMAIN.vercel.app" }
        }],
        [{
          text: "📦 Buyurtmalarim",
          callback_data: "orders"
        }]]
      }
    );
  }

  // ===== WEB APP ORDER =====
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
      `🆕 Yangi buyurtma!\n\nID: ${order.id}\nVaqt: ${order.created_at}\nJami: $${total}`,
      {
        inline_keyboard: [[{
          text: "✅ Qabul qilish",
          callback_data: `accept_${order.id}`
        }],
        [{
          text: "❌ Bekor qilish",
          callback_data: `cancel_${order.id}`
        }]]
      }
    );

    await sendMessage(user.id,
      `✅ Buyurtma qabul qilindi!\nID: ${order.id}`
    );
  }

  // ===== CALLBACK =====
  if (body.callback_query) {

    const data = body.callback_query.data;
    const userId = body.callback_query.from.id;

    // ===== BUYURTMALARIM =====
    if (data === "orders") {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!orders.length) {
        await sendMessage(userId, "📦 Buyurtmalar yo‘q");
        return;
      }

      let text = "📦 Buyurtmalaringiz:\n\n";
      orders.forEach(o => {
        text += `ID: ${o.id}\nStatus: ${o.status}\nVaqt: ${o.created_at}\n\n`;
      });

      await sendMessage(userId, text);
    }

    // ===== ACCEPT =====
    if (data.startsWith("accept_")) {
      const id = data.split("_")[1];

      await supabase
        .from("orders")
        .update({
          status: "ACCEPTED",
          accepted_at: new Date(),
          accepted_by: userId
        })
        .eq("id", id);

      await sendMessage(userId, "✅ Qabul qilindi");

      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      await sendMessage(order.user_id,
        `👨‍🍳 Buyurtmangiz qabul qilindi!`
      );
    }

    // ===== CANCEL =====
    if (data.startsWith("cancel_")) {
      const id = data.split("_")[1];

      await supabase
        .from("orders")
        .update({
          status: "CANCELLED",
          cancelled_at: new Date()
        })
        .eq("id", id);

      await sendMessage(userId, "❌ Bekor qilindi");
    }
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
