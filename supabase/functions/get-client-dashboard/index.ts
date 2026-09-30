import { headersFor, json, preflight, assertOrigin } from '../_shared/http.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';
Deno.serve(async req=>{
 const pf=preflight(req); if(pf) return pf; const h=headersFor(req.headers.get('origin'));
 if(!assertOrigin(req)) return json(403,{error:'Forbidden'},h); if(req.method!=='GET') return json(405,{error:'Method not allowed'},h);
 const user=await requireUser(req); if(!user) return json(401,{error:'Unauthorized'},h); const db=serviceClient();
 const [profile,access,subs,orders]=await Promise.all([
   db.from('client_profiles').select('first_name,last_name,phone,created_at').eq('user_id',user.id).maybeSingle(),
   db.from('access_grants').select('id,offering_id,starts_at,ends_at,status,offerings(id,type,title,slug)').eq('user_id',user.id).eq('status','active').order('created_at',{ascending:false}),
   db.from('client_subscriptions').select('id,offering_id,status,current_period_start,current_period_end,cancel_at_period_end,offerings(id,title,slug)').eq('user_id',user.id).order('created_at',{ascending:false}),
   db.from('orders').select('id,order_number,status,currency,subtotal_amount,discount_amount,total_amount,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
 ]);
 if(profile.error||access.error||subs.error||orders.error) return json(500,{error:'Service unavailable'},h);
 return json(200,{profile:profile.data,email:user.email,access:access.data??[],subscriptions:subs.data??[],orders:orders.data??[]},h);
});
