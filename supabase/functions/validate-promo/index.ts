import { headersFor,json,preflight,assertOrigin,readJson } from '../_shared/http.ts';
import { requireUser,serviceClient } from '../_shared/auth.ts';
Deno.serve(async req=>{ const pf=preflight(req); if(pf)return pf; const h=headersFor(req.headers.get('origin'));
 if(!assertOrigin(req))return json(403,{error:'Forbidden'},h); if(req.method!=='POST')return json(405,{error:'Method not allowed'},h);
 const user=await requireUser(req); if(!user)return json(401,{error:'Unauthorized'},h);
 let b; try{b=await readJson(req);}catch{return json(400,{error:'Invalid request'},h)}
 const code=typeof b.code==='string'?b.code.trim().toUpperCase():''; const offeringId=typeof b.offeringId==='string'?b.offeringId:'';
 if(!code||!offeringId)return json(400,{error:'Invalid request'},h); const db=serviceClient();
 const {data,error}=await db.rpc('quote_offering_for_user',{p_user_id:user.id,p_offering_id:offeringId,p_promo_code:code});
 if(error)return json(400,{valid:false,error:'Promo code is not valid'},h); return json(200,{valid:true,quote:data},h);
});
