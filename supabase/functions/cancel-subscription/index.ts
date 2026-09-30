import { headersFor,json,preflight,assertOrigin,readJson } from '../_shared/http.ts';
import { requireUser,serviceClient } from '../_shared/auth.ts';
Deno.serve(async req=>{const pf=preflight(req);if(pf)return pf;const h=headersFor(req.headers.get('origin'));
 if(!assertOrigin(req))return json(403,{error:'Forbidden'},h);if(req.method!=='POST')return json(405,{error:'Method not allowed'},h);
 const user=await requireUser(req);if(!user)return json(401,{error:'Unauthorized'},h);let b;try{b=await readJson(req);}catch{return json(400,{error:'Invalid request'},h)}
 const id=typeof b.subscriptionId==='string'?b.subscriptionId:'';if(!id)return json(400,{error:'Invalid request'},h);const db=serviceClient();
 const {data,error}=await db.from('client_subscriptions').update({cancel_at_period_end:true,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).in('status',['active','trialing']).select('id,status,cancel_at_period_end,current_period_end').maybeSingle();
 if(error||!data)return json(404,{error:'Subscription not found'},h);return json(200,{subscription:data},h);
});
