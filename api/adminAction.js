import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.SUPABASE_URL,
process.env.SUPABASE_KEY
)

export default async function handler(req,res){

const {type,...data}=req.body

if(type==="addRole"){
await supabase.from("users").upsert([
{id:data.userId,role:data.role}
])
}

if(type==="addCategory"){
await supabase.from("categories").insert([
{name:data.name}
])
}

if(type==="addProduct"){
await supabase.from("products").insert([
{
name:data.name,
price:data.price,
description:data.description,
image:data.image
}
])
}

res.status(200).json({ok:true})
}
