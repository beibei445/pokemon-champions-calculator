import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const errors=[];
let signedIn=false,cloudWrites=0;
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/teams**',async route=>{
 if(!signedIn){await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'请登录 ChatGPT 后使用云端队伍。',code:'signin_required'})});return}
 if(route.request().method()==='GET'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({teams:[],account:'preview@local.test'})});return}
 cloudWrites++;
 const team=route.request().postDataJSON();
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({team:{...team,revision:1,updatedAt:Date.now()}})});
});
await page.route('**/signin-with-chatgpt?**',async route=>{
 signedIn=true;
 await route.fulfill({status:302,headers:{Location:'/#teams'}});
});
const url=process.env.CALC_TEST_URL||'http://127.0.0.1:5173/';
try{
 await page.goto(url,{waitUntil:'networkidle'});
 await page.getByRole('link',{name:'速度线',exact:true}).click();
 assert.match(await page.title(),/速度线/);
 await page.getByRole('link',{name:'伤害计算',exact:true}).click();
 assert.ok(await page.locator('.damage-result').count()>0);
 await page.getByRole('link',{name:'我的队伍',exact:true}).click();
 await page.getByRole('link',{name:'登录后保存云端'}).waitFor();
 await page.getByRole('textbox',{name:'队伍名称'}).fill('游客测试队伍');
 await page.getByRole('button',{name:'配置第1位'}).click();
 await page.getByRole('button',{name:'保存到本地'}).click();
 await page.getByRole('button',{name:'载入队伍 游客测试队伍'}).waitFor();
 await page.locator('.team-storage-tabs').getByRole('button',{name:/云端/}).click();
 await page.getByText('游客模式',{exact:true}).waitFor();
 assert.equal(cloudWrites,0);
 await page.getByRole('link',{name:'登录后保存云端'}).click();
 await page.getByRole('status').filter({hasText:'已恢复登录前的队伍草稿'}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'队伍名称'}).inputValue(),'游客测试队伍');
 await page.getByRole('button',{name:'保存到云端'}).click();
 await page.getByRole('status').filter({hasText:'已保存到云端'}).waitFor();
 assert.equal(cloudWrites,1);
 assert.deepEqual(errors,[]);
 console.log('Guest access, local save, sign-in draft restore and cloud save passed');
}finally{await browser.close()}
