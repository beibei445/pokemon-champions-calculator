import {normalizeTeam} from '../src/team-model.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function dbFor(env){if(!env.DB)throw new Error('D1 binding DB is unavailable');return env.DB}
export async function teamsAPI(request,env){
 const url=new URL(request.url),userId=request.headers.get('oai-authenticated-user-id');
 if(!userId)return json({error:'请登录 ChatGPT 后使用云端队伍。',code:'signin_required'},401);
 if(!['GET','PUT','DELETE'].includes(request.method))return json({error:'请求方法不支持。'},405);
 if(request.method!=='GET'){
  const origin=request.headers.get('Origin');
  if((origin&&origin!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'请求来源不正确。'},403);
 }
 try{
  const db=dbFor(env);
  if(url.pathname==='/api/teams'&&request.method==='GET'){
   const {results}=await db.prepare('SELECT payload, updated_at, revision FROM teams WHERE user_id = ? ORDER BY updated_at DESC').bind(userId).all();
   return json({teams:results.map(row=>({...JSON.parse(row.payload),updatedAt:row.updated_at,revision:row.revision})),account:request.headers.get('oai-authenticated-user-email')||'已登录 ChatGPT'});
  }
  const match=url.pathname.match(/^\/api\/teams\/([a-zA-Z0-9-]{8,80})$/);if(!match)return json({error:'找不到该队伍。'},404);
  const id=match[1];
  if(request.method==='PUT'){
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'请使用 JSON 格式。'},415);
   if(Number(request.headers.get('Content-Length'))>65536)return json({error:'队伍文件过大。'},413);
   const bytes=await request.arrayBuffer();if(bytes.byteLength>65536)return json({error:'队伍文件过大。'},413);
   let team;try{team=normalizeTeam(JSON.parse(new TextDecoder().decode(bytes)))}catch(error){return json({error:error.message},400)}
   if(team.id!==id)return json({error:'队伍编号不一致。'},400);
   const existing=await db.prepare('SELECT revision FROM teams WHERE user_id = ? AND id = ?').bind(userId,id).first();
   if((existing?.revision??0)!==team.revision)return json({error:'这支云端队伍已在其他设备修改。请先导出当前草稿，刷新云端后重新载入，或另存为新队伍。',code:'conflict'},409);
   if(!existing){const count=await db.prepare('SELECT COUNT(*) AS total FROM teams WHERE user_id = ?').bind(userId).first();if(count.total>=100)return json({error:'云端最多保存 100 支队伍。'},409)}
   const updatedAt=Date.now(),payload=JSON.stringify({...team,updatedAt,revision:team.revision+1});
   // Conditional writes stop concurrent devices from silently overwriting each other.
   const saved=existing?await db.prepare('UPDATE teams SET name = ?, payload = ?, updated_at = ?, revision = revision + 1 WHERE user_id = ? AND id = ? AND revision = ?').bind(team.name,payload,updatedAt,userId,id,team.revision).run():await db.prepare('INSERT OR IGNORE INTO teams (user_id, id, name, payload, updated_at, revision) VALUES (?, ?, ?, ?, ?, 1)').bind(userId,id,team.name,payload,updatedAt).run();
   if(saved.meta.changes!==1)return json({error:'云端队伍已有更新，请另存或重新载入。',code:'conflict'},409);
   return json({team:JSON.parse(payload)});
  }
  if(request.method==='DELETE'){
   const revision=Number(request.headers.get('If-Match'));
   if(!Number.isInteger(revision)||revision<1)return json({error:'缺少有效的队伍版本。'},400);
   const deleted=await db.prepare('DELETE FROM teams WHERE user_id = ? AND id = ? AND revision = ?').bind(userId,id,revision).run();
   return deleted.meta.changes===1?json({deleted:true}):json({error:'云端队伍已改变，请刷新后再删除。',code:'conflict'},409);
  }
  return json({error:'请求方法不支持。'},405);
 }catch(error){console.error('Team storage unavailable',error.message);return json({error:'云端队伍暂时无法使用，草稿已保留。你可以先保存到本地或导出文件。',code:'storage_unavailable'},503)}
}
