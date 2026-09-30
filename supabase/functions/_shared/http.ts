export function allowedOrigins() {
  return new Set((Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(x => x.trim()).filter(Boolean));
}
export function headersFor(origin: string | null) {
  const h: Record<string,string> = {'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if (origin && allowedOrigins().has(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type';
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  }
  return h;
}
export function json(status:number, body:unknown, headers:Record<string,string>) { return new Response(JSON.stringify(body), {status, headers}); }
export function preflight(req:Request) {
  const origin=req.headers.get('origin'); const h=headersFor(origin);
  if (req.method !== 'OPTIONS') return null;
  if (!origin || !allowedOrigins().has(origin)) return json(403,{error:'Forbidden'},h);
  return new Response(null,{status:204,headers:h});
}
export function assertOrigin(req:Request) {
  const origin=req.headers.get('origin'); return !!origin && allowedOrigins().has(origin);
}
export async function readJson(req:Request, max=16_384):Promise<Record<string,unknown>> {
  const ct=req.headers.get('content-type')??''; if(!ct.toLowerCase().startsWith('application/json')) throw new Error('bad_content_type');
  const text=await req.text(); if(new TextEncoder().encode(text).byteLength>max) throw new Error('too_large');
  const value=JSON.parse(text); if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('bad_json');
  return value as Record<string,unknown>;
}
