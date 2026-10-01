import {mkdirSync} from 'node:fs';
import {localDB} from '../server/local-db.mjs';
import {teamsAPI} from '../server/teams-api.mjs';
export function localAPI(){return {name:'champions-local-api',configureServer(server){
 mkdirSync('.sites-runtime',{recursive:true});const DB=localDB('.sites-runtime/teams.sqlite');
 server.httpServer?.once('close',()=>DB.close());
 server.middlewares.use(async(req,res,next)=>{
  if(!req.url?.startsWith('/api/'))return next();
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){res.statusCode=403;res.end();return}
  try{
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){res.statusCode=413;res.end();return}chunks.push(chunk)}
   const headers=new Headers();for(const [key,value]of Object.entries(req.headers)){if(!key.startsWith('oai-')&&value)headers.set(key,Array.isArray(value)?value.join(','):value)}
   headers.set('oai-authenticated-user-id','local-preview');headers.set('oai-authenticated-user-email','preview@local.test');
   const method=req.method||'GET';const request=new Request('http://'+req.headers.host+req.url,{method,headers,...(method!=='GET'&&method!=='HEAD'?{body:Buffer.concat(chunks)}:{})});
   const response=await teamsAPI(request,{DB});res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'本地队伍服务暂时不可用。'}));console.error(error.message)}
 });
}}}
