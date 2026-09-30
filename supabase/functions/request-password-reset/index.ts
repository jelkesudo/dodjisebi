import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAIL=/^[^\s@<>(),;:"[\]\\]+@[^\s@<>(),;:"[\]\\]+\.[^\s@<>(),;:"[\]\\]+$/;
const allowed=()=>new Set((Deno.env.get('ALLOWED_ORIGINS')??'').split(',').map(x=>x.trim()).filter(Boolean));
const headers=(origin:string|null)=>{const h:Record<string,string>={'Content-Type':'application/json','Vary':'Origin','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};if(origin&&allowed().has(origin)){h['Access-Control-Allow-Origin']=origin;h['Access-Control-Allow-Headers']='authorization, x-client-info, apikey, content-type';h['Access-Control-Allow-Methods']='POST, OPTIONS'}return h};
const out=(status:number,body:Record<string,unknown>,h:Record<string,string>)=>new Response(JSON.stringify(body),{status,headers:h});
const ip=(req:Request)=>req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')?.trim()||null;
async function hmac(secret:string,value:string){const e=new TextEncoder();const key=await crypto.subtle.importKey('raw',e.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,e.encode(value));return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function sendEmail(apiKey:string,payload:Record<string,unknown>){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(`Resend ${r.status}: ${await r.text()}`)}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));

Deno.serve(async(req)=>{
  const origin=req.headers.get('origin'),h=headers(origin),origins=allowed();
  if(req.method==='OPTIONS')return origin&&origins.has(origin)?new Response(null,{status:204,headers:h}):out(403,{error:'Forbidden'},h);
  if(req.method!=='POST')return out(405,{error:'Method not allowed'},h);
  if(!origin||!origins.has(origin))return out(403,{error:'Forbidden'},h);

  const supa=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),rateSecret=Deno.env.get('RATE_LIMIT_SECRET');
  const resend=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('EMAIL_FROM');
  if(!supa||!service||!rateSecret||!resend||!from)return out(500,{error:'Service unavailable'},h);

  let data:any;try{data=await req.json()}catch{return out(400,{error:'Invalid request'},h)}
  const email=typeof data?.email==='string'?data.email.normalize('NFC').trim().toLowerCase():'';
  if(!EMAIL.test(email)||email.length>254)return out(200,{ok:true},h); // anti-enumeration
  const clientIp=ip(req);if(!clientIp)return out(400,{error:'Invalid request'},h);

  const key=await hmac(rateSecret,`password-reset:${clientIp}`);
  const db=createClient(supa,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:rateOk,error:rateErr}=await db.rpc('check_password_reset_rate_limit',{p_key:key});
  if(rateErr){console.error('reset rate limit',rateErr);return out(500,{error:'Service unavailable'},h)}
  if(!rateOk)return out(429,{error:'Previše pokušaja. Pokušaj ponovo malo kasnije.'},h);

  const {data:userId,error:lookupErr}=await db.rpc('get_auth_user_id_by_email',{p_email:email});
  if(lookupErr){console.error('reset lookup',lookupErr);return out(500,{error:'Service unavailable'},h)}
  if(!userId)return out(200,{ok:true},h); // do not reveal whether account exists

  const redirectTo=`${origin.replace(/\/$/,'')}/reset-lozinke`;
  const {data:link,error:linkErr}=await db.auth.admin.generateLink({type:'recovery',email,options:{redirectTo}});
  if(linkErr){console.error('recovery generateLink',linkErr);return out(200,{ok:true},h)}
  const actionLink=link.properties?.action_link;
  if(!actionLink){console.error('recovery action link missing');return out(200,{ok:true},h)}

  const isLocal=origin.startsWith('http://localhost:')||origin.startsWith('http://127.0.0.1:');
  if(isLocal)return out(200,{ok:true,devResetUrl:actionLink},h);

  try{
    await sendEmail(resend,{from,to:[email],subject:'DOĐI SEBI — postavi novu lozinku',html:`<!doctype html><html><body style="margin:0;background:#f7f4ef;font-family:Arial,sans-serif;color:#2e171c"><div style="max-width:600px;margin:0 auto;padding:40px 24px"><div style="font-size:18px;font-weight:700;letter-spacing:2px;margin-bottom:36px">DOĐI SEBI</div><div style="background:#fff;padding:36px;border-radius:18px"><h1 style="margin:0 0 16px;font-size:30px">Postavi novu lozinku</h1><p style="line-height:1.6;color:#6f6265">Primili smo zahtev za promenu lozinke za tvoj DOĐI SEBI nalog.</p><p style="margin:28px 0"><a href="${esc(actionLink)}" style="display:inline-block;background:#6b1722;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700">Postavi novu lozinku</a></p><p style="font-size:13px;line-height:1.6;color:#8a7c7f">Ako nisi tražila promenu lozinke, ignoriši ovu poruku. Lozinka neće biti promenjena.</p></div></div></body></html>`});
  }catch(e){console.error('reset resend',e);return out(500,{error:'Email trenutno nije moguće poslati.'},h)}
  return out(200,{ok:true},h);
});
