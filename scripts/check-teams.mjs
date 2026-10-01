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
 assert.equal(await page.locator('.team-slot-tab').count(),6);
 await page.getByRole('textbox',{name:'队伍名称',exact:true}).fill(name);
 assert.equal(await page.getByRole('button',{name:/加入对手|载入对手|更新为对手/}).count(),0);
 await page.getByRole('button',{name:'配置第1位',exact:true}).click();
 async function choose(label,query,option){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.getByRole('textbox',{name:'搜索'+label,exact:true}).fill(query);
  await page.getByRole('option',{name:option,exact:true}).click();
 }
 await choose('我方宝可梦','沙奈朵','沙奈朵 Gardevoir');
 await page.locator('.team-builder-card .forms').getByRole('button',{name:'Mega',exact:true}).click();
 await page.getByLabel('性格 / 能力倾向',{exact:true}).selectOption('Modest');
 await page.getByRole('spinbutton',{name:'我方特攻能力点数值',exact:true}).fill('32');
 await page.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).fill('32');
 await page.getByRole('spinbutton',{name:'我方HP能力点数值',exact:true}).fill('2');
 await choose('我方招式1','巨声','巨声 Hyper Voice 一般');
 await choose('我方招式2','广域战力','广域战力 Expanding Force 超能力');
 await page.getByRole('button',{name:'配置第2位',exact:true}).click();
 await choose('我方宝可梦','喷火龙','喷火龙 Charizard');
 await page.locator('.team-builder-card .forms').getByRole('button',{name:'Mega Y',exact:true}).click();
 await page.getByRole('spinbutton',{name:'我方特攻能力点数值',exact:true}).fill('20');
 await page.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).fill('15');
 for(const [index,query,option]of [[3,'雷丘','雷丘 Raichu'],[4,'轰擂金刚猩','轰擂金刚猩 Rillaboom'],[5,'耿鬼','耿鬼 Gengar'],[6,'巨金怪','巨金怪 Metagross']]){
  await page.getByRole('button',{name:'配置第'+index+'位',exact:true}).click();await choose('我方宝可梦',query,option);
 }
 await page.getByRole('button',{name:'配置第1位',exact:true}).click();
 assert.equal(await page.getByRole('spinbutton',{name:'我方特攻能力点数值',exact:true}).inputValue(),'32');
 assert.equal(await page.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).inputValue(),'32');
 assert.match(await page.locator('.team-builder-card .pokemon-english').innerText(),/Gardevoir-Mega/);
 assert.equal(await page.locator('.team-builder-card .slot-damage').count(),0);
 await page.getByRole('button',{name:'保存到本地',exact:true}).click();
 await page.getByRole('button',{name:'载入队伍 '+name,exact:true}).waitFor();
 const local=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LOCAL_TEAM_KEY);
 const savedLocal=local.teams.find(t=>t.name===name);assert.equal(savedLocal.members.filter(Boolean).length,6);
 assert.equal(savedLocal.members[0].ability,'Pixilate');assert.equal(savedLocal.members[0].moveSlots[0].move,'Hyper Voice');assert.equal(savedLocal.members[1].points.spe,15);
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'载入队伍 '+name,exact:true}).click();
 await page.getByRole('button',{name:'保存到云端',exact:true}).click();
 await page.getByRole('status').filter({hasText:'已保存到云端'}).waitFor();
 const cloudData=await (await context.request.get(url+'api/teams')).json();cloudId=cloudData.teams.find(t=>t.name===name).id;
 await page.screenshot({path:'verification/teams-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'伤害计算',exact:true}).click();
 await page.getByLabel('选择已保存队伍',{exact:true}).selectOption('local:'+savedLocal.id);
 const originalOpponent=await page.locator('.right .pokemon-english').innerText();
 await page.getByRole('button',{name:'载入第1位 沙奈朵 · Mega',exact:true}).click();
 assert.match(await page.locator('.left .pokemon-english').innerText(),/Gardevoir-Mega/);
 assert.equal(await page.getByRole('spinbutton',{name:'我方特攻能力点数值',exact:true}).inputValue(),'32');
 assert.equal(await page.locator('.right .pokemon-english').innerText(),originalOpponent);
 assert.match(await page.locator('.left .move-slot').first().innerText(),/妖精皮肤/);
 await page.getByRole('button',{name:'载入第2位 喷火龙 · Mega Y',exact:true}).click();
 assert.equal(await page.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).inputValue(),'15');
 await page.locator('.left .presets').getByRole('button',{name:'清空能力点',exact:true}).click();
 await page.getByRole('button',{name:'载入第1位 沙奈朵 · Mega',exact:true}).click();
 assert.equal(await page.getByRole('spinbutton',{name:'我方特攻能力点数值',exact:true}).inputValue(),'32');
 const unchanged=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LOCAL_TEAM_KEY);assert.equal(unchanged.teams.find(t=>t.id===savedLocal.id).members[1].points.spe,15);
 await page.screenshot({path:'verification/team-loadout-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'我的队伍',exact:true}).click();
 await page.locator('.team-storage-tabs').getByRole('button',{name:/云端/}).click();
 await page.getByRole('button',{name:'载入队伍 '+name,exact:true}).click();
 // A fresh browser context has no local teams but can read the same signed-in cloud account.
 const otherContext=await browser.newContext({viewport:{width:390,height:844}}),other=await otherContext.newPage();
 await other.goto(url+'#teams',{waitUntil:'networkidle'});
 await other.locator('.team-storage-tabs').getByRole('button',{name:/云端/}).click();
 await other.getByRole('button',{name:'载入队伍 '+name,exact:true}).click();
 await other.getByRole('link',{name:'伤害计算',exact:true}).click();
 await other.getByLabel('选择已保存队伍',{exact:true}).selectOption('cloud:'+cloudId);
 await other.getByRole('button',{name:'载入第2位 喷火龙 · Mega Y',exact:true}).click();
 assert.equal(await other.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).inputValue(),'15');
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
  await page.getByRole('link',{name:'伤害计算',exact:true}).click();await noOverflow();
  if(width===390)await page.screenshot({path:'verification/team-loadout-mobile.png',fullPage:true});
  await page.getByRole('link',{name:'我的队伍',exact:true}).click();
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
 writeFileSync('verification/teams-checks.json',JSON.stringify({result:'passed',checks:['direct six-member editing','no opponent team controls','independent form/nature/points/move configuration','Mega build save/load','local reload persistence','damage-page party selection','independent calculator and saved-party state','cloud save/load in fresh browser context','file roundtrip','invalid import','concurrent edit conflict preserves draft','320/390/768/1024/1440 responsive','terrain conditions and spread visible'],errors},null,2));
 console.log('Teams and terrain browser checks passed');
}finally{
 if(cloudId){const all=await (await context.request.get(url+'api/teams')).json();const team=all.teams.find(t=>t.id===cloudId);if(team)await context.request.delete(url+'api/teams/'+cloudId,{headers:{'If-Match':String(team.revision)}})}
 await browser.close();
}
