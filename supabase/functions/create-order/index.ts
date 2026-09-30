import { headersFor,json,preflight,assertOrigin,readJson } from '../_shared/http.ts';
import { requireUser,serviceClient } from '../_shared/auth.ts';
Deno.serve(async req=>{const pf=preflight(req);if(pf)return pf;const h=headersFor(req.headers.get('origin'));
 if(!assertOrigin(req))return json(403,{error:'Forbidden'},h);if(req.method!=='POST')return json(405,{error:'Method not allowed'},h);
 const user=await requireUser(req);if(!user)return json(401,{error:'Unauthorized'},h);let b;try{b=await readJson(req);}catch{return json(400,{error:'Invalid request'},h)}
 const offeringId=typeof b.offeringId==='string'?b.offeringId:'';const promoCode=typeof b.promoCode==='string'?b.promoCode.trim().toUpperCase():null;
 if(!offeringId)return json(400,{error:'Invalid request'},h);const db=serviceClient();const {data,error}=await db.rpc('create_client_order',{p_user_id:user.id,p_offering_id:offeringId,p_promo_code:promoCode});
 if(error){console.error(error);return json(400,{error:'Order could not be created'},h)}
 return json(201,{order:data,note:'Paid orders require payment-provider integration before payment can be completed.'},h);
});
