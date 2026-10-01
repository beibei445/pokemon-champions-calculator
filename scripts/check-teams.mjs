import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {LOCAL_TEAM_KEY} from '../src/team-model.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const url=process.env.CALC_TEST_URL||'http://127.0.0.1:5173/';
const name='验证队伍-'+Date.now();let cloudId;
mkdirSync('verification',{recursive:true});
async function noOverflow(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
try{
 await page.goto(url,{waitUntil:'networkidle'});
 await page.getByRole('link',{name:'我的队伍',exact:true}).click();
 assert.equal(await page.locator('.team-member').count(),6);
 await page.getByRole('textbox',{name:'队伍名称',exact:true}).fill(name);
 await page.getByRole('button',{name:'将我方配置存入第1位',exact:true}).click();
 await page.getByRole('button',{name:'将对手配置存入第2位',exact:true}).click();
 assert.match(await page.getByLabel('队伍第2位',{exact:true}).innerText(),/Mega Y/);
 await page.getByRole('button',{name:'保存到本地',exact:true}).click();
 await page.getByRole('button',{name:'载入队伍 '+name,exact:true}).waitFor();
 const local=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LOCAL_TEAM_KEY);
 assert.equal(local.teams[0].members[1].ability,'Drought');assert.equal(local.teams[0].members[1].moveSlots.length,4);
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'载入队伍 '+name,exact:true}).click();
 await page.getByLabel('队伍第2位',{exact:true}).getByRole('button',{name:'载入我方',exact:true}).click();
 assert.match(await page.locator('.left .pokemon-english').innerText(),/Charizard-Mega-Y/);
 assert.equal(await page.getByRole('spinbutton',{name:'我方特攻能力点数值',exact:true}).inputValue(),'32');
 await page.locator('.left .presets').getByRole('button',{name:'清空能力点',exact:true}).click();
 await page.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).fill('15');
 await page.getByRole('button',{name:'更新回队伍槽位',exact:true}).click();
 await page.getByRole('link',{name:'返回队伍保存',exact:true}).click();
 assert.match(await page.getByLabel('队伍第2位',{exact:true}).innerText(),/S 15/);
 await page.getByRole('button',{name:'保存到本地',exact:true}).click();
 await page.getByRole('button',{name:'保存到云端',exact:true}).click();
 await page.getByRole('status').filter({hasText:'已保存到云端'}).waitFor();
 const cloudData=await (await context.request.get(url+'api/teams')).json();cloudId=cloudData.teams.find(t=>t.name===name).id;
 // A fresh browser context has no local teams but can read the same signed-in cloud account.
 const otherContext=await browser.newContext({viewport:{width:390,height:844}}),other=await otherContext.newPage();
 await other.goto(url+'#teams',{waitUntil:'networkidle'});
 await other.locator('.team-storage-tabs').getByRole('button',{name:/云端/}).click();
 await other.getByRole('button',{name:'载入队伍 '+name,exact:true}).click();
 assert.match(await other.getByLabel('队伍第2位',{exact:true}).innerText(),/S 15/);
 assert.equal(await other.evaluate(key=>localStorage.getItem(key),LOCAL_TEAM_KEY),null);
 await otherContext.close();
 await page.screenshot({path:'verification/teams-desktop.png',fullPage:true});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出这支队伍',exact:true}).click();
 const file=await download;await file.saveAs('verification/teams-roundtrip.json');
 const exported=JSON.parse(readFileSync('verification/teams-roundtrip.json','utf8'));assert.equal(exported.teams[0].members[1].points.spe,15);
 await page.getByLabel('导入队伍文件',{exact:true}).setInputFiles('verification/teams-roundtrip.json');
 await page.getByRole('status').filter({hasText:'已导入 1 支队伍'}).waitFor();
 await page.getByLabel('导入队伍文件',{exact:true}).setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{"bad":true}')});
 await page.getByRole('alert').filter({hasText:'请导入冠军实验室'}).waitFor();
 // Cloud conflict preserves current edits and never claims save success.
 await page.locator('.team-storage-tabs').getByRole('button',{name:/云端/}).click();
 await page.getByRole('button',{name:'载入队伍 '+name,exact:true}).click();
 const latest=(await (await context.request.get(url+'api/teams')).json()).teams.find(t=>t.id===cloudId);
 const external=await context.request.put(url+'api/teams/'+cloudId,{data:{...latest,name:name+'-另一设备'}});assert.equal(external.status(),200);
 await page.getByRole('textbox',{name:'队伍名称',exact:true}).fill(name+'-保留草稿');
 await page.getByRole('button',{name:'保存到云端',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'其他设备修改'}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'队伍名称',exact:true}).inputValue(),name+'-保留草稿');
 await page.getByRole('button',{name:'保存到本地',exact:true}).click();
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:900});await noOverflow();
  if(width===390)await page.screenshot({path:'verification/teams-mobile.png',fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1050});
 await page.getByRole('link',{name:'伤害计算',exact:true}).click();
 await page.getByRole('button',{name:'重置',exact:true}).click();
 await page.getByRole('button',{name:'我方宝可梦',exact:true}).click();
 await page.getByRole('textbox',{name:'搜索我方宝可梦',exact:true}).fill('沙奈朵');
 await page.getByRole('option',{name:'沙奈朵 Gardevoir',exact:true}).click();
 await page.getByRole('button',{name:'我方招式1',exact:true}).click();
 await page.getByRole('textbox',{name:'搜索我方招式1',exact:true}).fill('广域战力');
 await page.getByRole('option',{name:'广域战力 Expanding Force 超能力',exact:true}).click();
 await page.getByLabel('场地',{exact:true}).selectOption('Psychic');
 await page.getByRole('button',{name:'双打',exact:true}).click();
 const note=await page.locator('.left .move-slot').first().locator('.terrain-note').innerText();
 assert.match(note,/威力 ×1.5/);assert.match(note,/场地增伤 ×1.3/);assert.match(note,/双打群攻 ×0.75/);
 await page.getByRole('button',{name:'计算条件',exact:true}).click();
 assert.match(await page.locator('.condition-list').innerText(),/攻击方接地 \/ 防守方未接地/);
 await page.screenshot({path:'verification/terrain-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);
 writeFileSync('verification/teams-checks.json',JSON.stringify({result:'passed',checks:['six team slots','Mega build save/load','local reload persistence','edit member and update slot','cloud save/load in fresh browser context','file roundtrip','invalid import','concurrent edit conflict preserves draft','320/390/768/1024/1440 responsive','terrain conditions and spread visible'],errors},null,2));
 console.log('Teams and terrain browser checks passed');
}finally{
 if(cloudId){const all=await (await context.request.get(url+'api/teams')).json();const team=all.teams.find(t=>t.id===cloudId);if(team)await context.request.delete(url+'api/teams/'+cloudId,{headers:{'If-Match':String(team.revision)}})}
 await browser.close();
}
