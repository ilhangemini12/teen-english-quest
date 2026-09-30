import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://ilhangemini12.github.io",
  "https://batumhub.pages.dev",
  "https://batum.pages.dev",
]);
const MODEL = "canopylabs/orpheus-v1-english";
const VOICES = new Set(["autumn","diana","hannah","austin","daniel","troy"]);
const DAILY_LIMIT = 60;

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://ilhangemini12.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeaders(req),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},
  });
}
function toBase64(bytes: Uint8Array) {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, {status:204, headers:corsHeaders(req)});
  if (req.method !== "POST") return json(req,{error:"Method not allowed."},405);
  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(req,{error:"Origin not allowed."},403);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(req,{error:"Please sign in to use natural voice."},401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !groqKey) return json(req,{error:"Voice service configuration is incomplete."},503);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global:{headers:{Authorization:authHeader}},
    auth:{persistSession:false,autoRefreshToken:false},
  });
  const {data:userData,error:userError} = await supabase.auth.getUser();
  if (userError || !userData?.user) return json(req,{error:"Your session has expired. Please sign in again."},401);

  let payload:any;
  try { payload = await req.json(); } catch { return json(req,{error:"Invalid request."},400); }
  const input = typeof payload?.text === "string" ? payload.text.replace(/\s+/g," ").trim() : "";
  if (!input) return json(req,{error:"No text to speak."},400);
  if (input.length > 190) return json(req,{error:"Voice chunk is too long."},413);

  const voice = VOICES.has(payload?.voice) ? payload.voice : "hannah";
  const rawSpeed = Number(payload?.speed);
  const speed = Number.isFinite(rawSpeed) ? Math.max(.8,Math.min(1.15,rawSpeed)) : .96;

  const {data:quota,error:quotaError} = await supabase.rpc("consume_voice_quota",{p_limit:DAILY_LIMIT});
  if (quotaError) return json(req,{error:"Could not check today's voice allowance."},503);
  if (!quota?.allowed) return json(req,{error:"Today's natural voice allowance has been used.",code:"voice_daily_limit",quota},429);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/speech",{
      method:"POST",
      headers:{"Authorization":`Bearer ${groqKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:MODEL,voice,input,response_format:"wav",speed}),
    });
    if (!response.ok) {
      const detail = await response.text().catch(()=>"");
      console.error("groq tts error",response.status,detail.slice(0,300));
      return json(req,{
        error:response.status===429?"Natural voice is busy right now.":"Natural voice could not be generated.",
        code:"provider_error",quota,
      },response.status===429?429:502);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return json(req,{audio_base64:toBase64(bytes),mime:"audio/wav",voice,model:MODEL,quota});
  } catch (error) {
    console.error("voice request error",error instanceof Error?error.message:String(error));
    return json(req,{error:"Natural voice is temporarily unavailable.",code:"provider_error",quota},502);
  }
});
