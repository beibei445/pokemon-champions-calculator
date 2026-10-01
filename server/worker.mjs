import {teamsAPI} from './teams-api.mjs';
import indexHTML from '../dist/client/index.html';
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/'))return teamsAPI(request,env);
  if(url.pathname==='/'||url.pathname==='/index.html')return new Response(indexHTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
  return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
 }
};
