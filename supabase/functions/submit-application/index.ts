import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_BODY_BYTES=12_000, MAX_MESSAGE=2000;
const NAME=/^\p{L}[\p{L}\p{M}]*(?:[ '-][\p{L}\p{M}]+)*$/u;
const EMAIL=/^[^\s@<>(),;:"[\]\\]+@[^\s@<>(),;:"[\]\\]+\.[^\s@<>(),;:"[\]\\]+$/;
const CTRL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const PASSWORD=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
const allowed=()=>new Set((Deno.env.get('ALLOWED_ORIGINS')??'').split(',').map(x=>x.trim()).filter(Boolean));
const headers=(origin:string|null)=>{const h:Record<string,string>={'Content-Type':'application/json','Vary':'Origin','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};if(origin&&allowed().has(origin)){h['Access-Control-Allow-Origin']=origin;h['Access-Control-Allow-Headers']='authorization, x-client-info, apikey, content-type';h['Access-Control-Allow-Methods']='POST, OPTIONS'}return h};
const out=(status:number,body:Record<string,unknown>,h:Record<string,string>)=>new Response(JSON.stringify(body),{status,headers:h});
const normName=(v:unknown)=>typeof v==='string'?v.normalize('NFC').trim().replace(/\s+/gu,' '):'';
const normEmail=(v:unknown)=>typeof v==='string'?v.normalize('NFC').trim().toLowerCase():'';
const normMsg=(v:unknown)=>typeof v==='string'?v.normalize('NFC').replace(/\r\n?/gu,'\n').trim():'';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));

async function body(req:Request){
 if(!(req.headers.get('content-type')??'').toLowerCase().startsWith('application/json')) throw 415;
 const cl=req.headers.get('content-length'); if(cl!==null){const n=Number(cl);if(!Number.isFinite(n)||n<0||n>MAX_BODY_BYTES)throw 413}
 if(!req.body)throw 400;const r=req.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 while(true){const {done,value}=await r.read();if(done)break;if(value){total+=value.byteLength;if(total>MAX_BODY_BYTES){await r.cancel();throw 413}chunks.push(value)}}
 const all=new Uint8Array(total);let off=0;for(const c of chunks){all.set(c,off);off+=c.byteLength}
 let text='';try{text=new TextDecoder('utf-8',{fatal:true}).decode(all)}catch{throw 400}
 let parsed:unknown;try{parsed=JSON.parse(text)}catch{throw 400}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw 400;return parsed as Record<string,unknown>;
}
async function hmac(secret:string,value:string){const e=new TextEncoder();const key=await crypto.subtle.importKey('raw',e.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,e.encode(value));return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function ip(req:Request){return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')?.trim()||null}
async function turnstile(token:string,remoteIp:string|null,secret:string){const f=new FormData();f.append('secret',secret);f.append('response',token);if(remoteIp)f.append('remoteip',remoteIp);try{const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:f});if(!r.ok)return false;const j=await r.json();return j?.success===true}catch{return false}}
async function sendEmail(apiKey:string,payload:Record<string,unknown>){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(`Resend ${r.status}: ${await r.text()}`);}

Deno.serve(async(req)=>{
 const origin=req.headers.get('origin'), h=headers(origin), origins=allowed();
 if(req.method==='OPTIONS')return origin&&origins.has(origin)?new Response(null,{status:204,headers:h}):out(403,{error:'Forbidden'},h);
 if(req.method!=='POST')return out(405,{error:'Method not allowed'},h);
 if(!origin||!origins.has(origin))return out(403,{error:'Forbidden'},h);
 const supa=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),rateSecret=Deno.env.get('RATE_LIMIT_SECRET'),tsSecret=Deno.env.get('TURNSTILE_SECRET_KEY');
 if(!supa||!service||!rateSecret||!tsSecret)return out(500,{error:'Service unavailable'},h);
 let d:Record<string,unknown>;try{d=await body(req)}catch(e){return out(e===413?413:e===415?415:400,{error:e===413?'Request too large':e===415?'Unsupported media type':'Invalid request'},h)}
 if(typeof d.website==='string'&&d.website.trim())return out(200,{ok:true},h);
 const firstName=normName(d.firstName),lastName=normName(d.lastName),email=normEmail(d.email),message=normMsg(d.message),password=typeof d.password==='string'?d.password:'',token=typeof d.turnstileToken==='string'?d.turnstileToken.trim():'';
 const at=email.lastIndexOf('@'),local=at>0?email.slice(0,at):'',domain=at>0?email.slice(at+1):'';
 if(!NAME.test(firstName)||firstName.length>80||!NAME.test(lastName)||lastName.length>80||!EMAIL.test(email)||email.length>254||local.length>64||domain.length>253||CTRL.test(email)||message.length>MAX_MESSAGE||CTRL.test(message)||!token||token.length>2048)return out(400,{error:'Invalid fields'},h);
 if(!PASSWORD.test(password))return out(400,{error:'Weak password',code:'WEAK_PASSWORD'},h);
 const clientIp=ip(req);if(!clientIp)return out(400,{error:'Invalid request'},h);
 if(!await turnstile(token,clientIp,tsSecret))return out(400,{error:'Verification failed'},h);
 const [ipKey,emailHash]=await Promise.all([hmac(rateSecret,`ip:${clientIp}`),hmac(rateSecret,`email:${email}`)]);
 const db=createClient(supa,service,{auth:{persistSession:false,autoRefreshToken:false}});

 // Application is the account-creation entry point. Never create another
 // application for an email that already belongs to an Auth user.
 const {data:existingAuthUserId,error:existingAuthErr}=await db.rpc('get_auth_user_id_by_email',{p_email:email});
 if(existingAuthErr){console.error('auth lookup',existingAuthErr);return out(500,{error:'Service unavailable'},h)}
 if(existingAuthUserId)return out(409,{error:'Nalog sa ovim emailom već postoji. Prijavi se.',code:'ACCOUNT_EXISTS'},h);

 const {data:created,error:createErr}=await db.rpc('create_application_secure_v2',{p_first_name:firstName,p_last_name:lastName,p_email:email,p_message:message||null,p_ip_key:ipKey,p_email_hash:emailHash});
 if(createErr){console.error(createErr);return out(500,{error:'Service unavailable'},h)}
 const status=created?.status;
 if(status==='rate_limited')return out(429,{error:'Previše pokušaja. Pokušaj kasnije.'},h);
 if(status==='invalid')return out(400,{error:'Invalid fields'},h);
 if(status==='duplicate')return out(409,{error:'Nalog sa ovim emailom već postoji. Prijavi se.',code:'ACCOUNT_EXISTS'},h);
 if(status!=='created'||!created?.application_id)return out(500,{error:'Service unavailable'},h);
 const applicationId=created.application_id as string;

 // Authorize this one account creation through the existing Auth hook.
 const {error:pendingErr}=await db.from('pending_client_invites').upsert({email,first_name:firstName,last_name:lastName,application_id:applicationId,expires_at:new Date(Date.now()+15*60*1000).toISOString()},{onConflict:'email'});
 if(pendingErr){console.error('pending client',pendingErr);await db.from('applications').delete().eq('id',applicationId);await db.from('application_email_cooldowns').delete().eq('email_hash',emailHash);return out(500,{error:'Account setup failed'},h)}

 // generateLink(type=signup) creates an UNCONFIRMED Auth user with the password the
 // user chose and gives us a one-time email-verification URL. No generic password.
 const redirectTo=`${origin.replace(/\/$/,'')}/nalog`;
 const {data:signup,error:userErr}=await db.auth.admin.generateLink({
   type:'signup',
   email,
   password,
   options:{redirectTo,data:{account_type:'client',first_name:firstName,last_name:lastName}}
 });
 if(userErr){
   console.error('generateLink',userErr);
   await db.from('pending_client_invites').delete().eq('email',email);
   await db.from('applications').delete().eq('id',applicationId);
   await db.from('application_email_cooldowns').delete().eq('email_hash',emailHash);
   if((userErr as any)?.status===422 || /already|registered|exists/i.test((userErr as any)?.message??'')) return out(409,{error:'Nalog sa ovim emailom već postoji. Prijavi se.',code:'ACCOUNT_EXISTS'},h);
   return out(500,{error:'Account setup failed'},h);
 }
 const userId=signup.user?.id??null;
 const verificationUrl=signup.properties?.action_link??null;
 if(!userId||!verificationUrl){
   console.error('signup link missing user/action link');
   return out(500,{error:'Account setup failed'},h);
 }
 const {error:linkError}=await db.from('applications').update({user_id:userId}).eq('id',applicationId);
 if(linkError) console.error('link application',linkError);

 const isLocal=origin.startsWith('http://localhost:')||origin.startsWith('http://127.0.0.1:');
 if(isLocal)return out(201,{ok:true,accountCreated:true,verificationRequired:true,verificationUrl},h);

 const resend=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('EMAIL_FROM'),admin=Deno.env.get('ADMIN_NOTIFICATION_EMAIL');
 if(!resend||!from||!admin){console.error('Email secrets missing');return out(201,{ok:true,accountCreated:true,verificationRequired:true,emailWarning:true},h)}
 const safeName=esc(`${firstName} ${lastName}`),safeEmail=esc(email),safeMessage=esc(message).replace(/\n/g,'<br>');
 const jobs:Promise<void>[]=[
   sendEmail(resend,{from,to:[admin],reply_to:email,subject:`Nova prijava — ${firstName} ${lastName}`,html:`<h2>Nova prijava</h2><p><strong>Ime:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Poruka:</strong><br>${safeMessage||'—'}</p>`}),
   sendEmail(resend,{from,to:[email],reply_to:admin,subject:'DOĐI SEBI — potvrdi email adresu',html:`<h2>Dobrodošla, ${esc(firstName)}.</h2><p>Tvoj DOĐI SEBI nalog je kreiran.</p><p>Potvrdi email adresu klikom na dugme ispod. Nakon potvrde bićeš preusmerena na svoj nalog.</p><p><a href="${esc(verificationUrl)}" style="display:inline-block;padding:12px 20px;background:#6b1722;color:#fff;text-decoration:none">Potvrdi email</a></p><p>Ako ti nisi napravila ovaj nalog, ignoriši ovu poruku.</p>`})
 ];
 const results=await Promise.allSettled(jobs);results.forEach(r=>{if(r.status==='rejected')console.error('email',r.reason)});
 return out(201,{ok:true,accountCreated:true,verificationRequired:true},h);
});
