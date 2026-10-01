import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.CALC_TEST_URL||'http://127.0.0.1:5173/';
async function choose(label,query,option){
 await page.getByRole('button',{name:label,exact:true}).click();
 await page.getByRole('textbox',{name:'搜索'+label,exact:true}).fill(query);
 await page.getByRole('option',{name:option,exact:true}).click();
}
function overflow(){return page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}
mkdirSync('verification',{recursive:true});
try{
 await page.goto(url,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.move-slot').count(),8);
 assert.equal(await page.locator('.comparison-row').count(),8);
 await choose('我方招式2','水炮','水炮 Hydro Pump 水');
 await page.locator('.left .move-slot').nth(1).getByRole('checkbox').check();
 assert.equal(await page.locator('.left .move-slot').nth(1).getByRole('checkbox').isChecked(),true);
 assert.equal(await page.locator('.left .move-slot').nth(0).getByRole('checkbox').isChecked(),false);
 await page.getByRole('button',{name:'我方招式1 岩崩计算结果',exact:true}).click();
 assert.equal(await page.locator('.left .move-slot').nth(1).getByRole('checkbox').isChecked(),true);
 await page.getByRole('button',{name:'重置',exact:true}).click();
 await choose('我方宝可梦','沙奈朵','沙奈朵 Gardevoir');
 await choose('我方招式1','巨声','巨声 Hyper Voice 一般');
 assert.ok((await page.locator('.left .move-slot').nth(0).innerText()).includes('一般'));
 await page.locator('.left .forms').getByRole('button',{name:'Mega',exact:true}).click();
 assert.equal(await page.locator('.left .pair-fields select').inputValue(),'Pixilate');
 const slot=page.locator('.left .move-slot').nth(0);
 assert.ok((await slot.locator('.slot-type').innerText()).includes('妖精'));
 assert.ok((await slot.locator('.conversion-note').innerText()).includes('威力 ×1.2'));
 assert.ok((await slot.locator('.conversion-note').innerText()).includes('本系 ×1.5'));
 await page.getByRole('button',{name:'计算条件',exact:true}).click();
 assert.ok((await page.locator('.condition-list').innerText()).includes('一般 → 妖精'));
 await page.screenshot({path:'verification/mega-pixilate-desktop.png',fullPage:true});
 await page.locator('.left .forms').getByRole('button',{name:'普通形态',exact:true}).click();
 assert.equal(await page.locator('.left .move-slot').nth(0).locator('.conversion-note').count(),0);
 await page.getByRole('button',{name:'重置',exact:true}).click();
 await page.locator('.left .presets').getByRole('button',{name:'清空能力点',exact:true}).click();
 await page.getByRole('link',{name:'速度线',exact:true}).click();
 await page.getByLabel('我方速度性格',{exact:true}).selectOption('Jolly');
 await page.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).fill('32');
 assert.equal((await page.locator('.speed-editor.left .speed-value').innerText()).replace(/\D/g,''),'169');
 assert.ok((await page.getByLabel('速度比较结果').innerText()).includes('我方先手'));
 await page.locator('.speed-editor.left').getByRole('checkbox',{name:'麻痹',exact:true}).check();
 assert.equal((await page.locator('.speed-editor.left .speed-value').innerText()).replace(/\D/g,''),'84');
 assert.ok((await page.getByLabel('速度比较结果').innerText()).includes('对手先手'));
 await page.getByRole('checkbox',{name:'戏法空间',exact:true}).check();
 assert.ok((await page.getByLabel('速度比较结果').innerText()).includes('我方先手'));
 await page.getByRole('textbox',{name:'搜索速度线宝可梦',exact:true}).fill('沙奈朵');
 assert.equal(await page.locator('.speed-table tbody tr').count(),2);
 const megaRow=page.locator('.speed-table tbody tr').filter({hasText:'Gardevoir-Mega'});
 assert.equal(await megaRow.locator('td').nth(7).innerText(),'334');
 assert.equal(await megaRow.locator('td').nth(6).innerText(),'—');
 await page.locator('.speed-form-tabs').getByRole('button',{name:'Mega',exact:true}).click();
 assert.equal(await page.locator('.speed-table tbody tr').count(),1);
 await page.getByRole('link',{name:'伤害计算',exact:true}).click();
 assert.equal(await page.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).inputValue(),'32');
 await page.getByRole('link',{name:'速度线',exact:true}).click();
 assert.equal(await page.getByRole('spinbutton',{name:'我方速度能力点数值',exact:true}).inputValue(),'32');
 await page.goBack();
 assert.ok(await page.locator('.calculator-grid').isVisible());
 await page.getByRole('button',{name:'交换双方',exact:true}).click();
 assert.ok((await page.locator('.left .pokemon-english').innerText()).includes('Charizard-Mega-Y'));
 await page.getByRole('button',{name:'重置',exact:true}).click();
 await page.screenshot({path:'verification/four-moves-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'速度线',exact:true}).click();
 await page.screenshot({path:'verification/speed-desktop.png',fullPage:true});
 for(const width of [390,320,768,1024]){
  await page.setViewportSize({width,height:900});
  assert.equal(await overflow(),false,'Speed page overflow at '+width);
  if(width===390)await page.screenshot({path:'verification/speed-mobile.png',fullPage:true});
  await page.getByRole('link',{name:'伤害计算',exact:true}).click();
  assert.equal(await overflow(),false,'Damage page overflow at '+width);
  if(width===390)await page.screenshot({path:'verification/four-moves-mobile.png',fullPage:true});
  await page.getByRole('link',{name:'速度线',exact:true}).click();
 }
 // Browser zoom to 200% effectively halves the CSS layout viewport.
 await page.setViewportSize({width:720,height:550});
 assert.equal(await overflow(),false);
 assert.deepEqual(errors,[]);
 const missing=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
 assert.deepEqual(missing,[]);
 writeFileSync('verification/update-checks.json',JSON.stringify({result:'passed',errors,checks:['eight slots','eight simultaneous results','independent critical flags','Mega Pixilate type/boost/STAB','normal-form reversion','speed stages and allocation','paralysis','Trick Room','Mega tier separation','Mega scarf unavailable','cross-page state','browser back','swap/reset','320/390/768/1024 responsive layouts','200% zoom layout']},null,2));
 console.log('Update browser checks passed.');
}finally{await browser.close()}
