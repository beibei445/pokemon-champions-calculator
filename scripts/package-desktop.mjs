import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
const env={...process.env,ELECTRON_BUILDER_CACHE:resolve(root,'.builder-cache')};

function run(script,args=[],override={}){
 const result=spawnSync(process.execPath,[resolve(root,script),...args],{
  cwd:root,env:{...env,...override},stdio:'inherit'
 });
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}

if(!existsSync(resolve(root,'node_modules/electron/path.txt'))){
 run('node_modules/electron/install.js',[],{
  ELECTRON_MIRROR:env.ELECTRON_MIRROR||'https://npmmirror.com/mirrors/electron/'
 });
}
run('node_modules/electron-builder/cli.js',['--win','nsis']);
