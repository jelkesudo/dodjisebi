import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export function serviceClient() {
  const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key) throw new Error('server_config');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function requireUser(req:Request) {
  const url=Deno.env.get('SUPABASE_URL'); const anon=Deno.env.get('SUPABASE_ANON_KEY');
  const auth=req.headers.get('authorization'); if(!url||!anon||!auth?.startsWith('Bearer ')) return null;
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser(); return error?null:user;
}
