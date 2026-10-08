const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const sizes=[[320,568],[375,812],[390,844],[430,932],[844,390],[768,1024],[1440,900]];
const out=path.resolve(__dirname,'../../artifacts');
const legacy='A short answer about beginning again.\n\n*Augustine was still drawing breath when the length limit arrived. Tap Continue for the rest.*';
const biography='This is a visual fixture for a long biography. The full supplied biography must remain available when the reader expands this card. '.repeat(12);
const result=[];
(async()=>{
const browser=await chromium.launch({headless:true});
try{for(const [width,height] of sizes.filter(s=>!process.env.QA_WIDTH||s[0]===Number(process.env.QA_WIDTH))){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<1000,isMobile:width<1000,permissions:['clipboard-read','clipboard-write']});
 await context.addInitScript(({legacy})=>{
  window.__qaClipboard='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__qaClipboard=t;},readText:async()=>window.__qaClipboard}});
  localStorage.setItem('sa_beta_ok','1');localStorage.setItem('sa_tut_v1','1');
  if(!localStorage.getItem('__refinementFixture')){
   localStorage.setItem('__refinementFixture','1');
   localStorage.setItem('sa_sessions',JSON.stringify([{id:'qa-legacy',title:'Saved answer',page:'chat',created:Date.now(),updated:Date.now(),history:[{role:'user',content:'How do I begin?'},{role:'assistant',content:legacy}],threadHtml:'<div class="msg user"><div class="bubble">How do I begin?</div></div><div class="msg assistant"><div class="av">A</div><div class="bubble md"><span class="who">St. Augustine</span><p>A short answer about beginning again.</p><p><em>Augustine was still drawing breath when the length limit arrived. Tap Continue for the rest.</em></p></div></div>'}]));
   localStorage.setItem('sa_active','{}');
  }
 },{legacy});
 await context.route('**/config.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.SA_API_BASE=location.origin;'}));
 let chats=0;const requests=[];
 await context.route('**/api/**',async r=>{
  const url=new URL(r.request().url()); let body={};
  if(url.pathname==='/api/models')body={models:[{id:'qa-model',name:'Test model',context:8192}]};
  if(url.pathname==='/api/readings')body={first:'Reading fixture: a short passage displayed on a readable surface.',psalm:'Psalm fixture: a brief response.',gospel:'Gospel fixture: a passage for layout verification.',link:'https://bible.usccb.org/daily-bible-readings'};
  if(url.pathname==='/api/saint')body={name:'Saint fixture',date:'October 8',bio:biography,connection:'A fixture reflection for typography checks.',image:'/missing-portrait.png',link:'https://www.franciscanmedia.org/saint-of-the-day/'};
  if(url.pathname==='/api/chat'){
   chats++;requests.push(r.request().postDataJSON());
   return r.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({text:'A response delivered in a single stream chunk.',truncated:true})+'\n\ndata: [DONE]\n\n'});
  }
  return r.fulfill({contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/?qa=reading-room#chat');
 await page.waitForFunction(()=>document.querySelector('#modelBtn')?.textContent.includes('Test model'));
 const row={width,height,pages:{}};
 const capture=async name=>{await page.waitForTimeout(450);await page.screenshot({path:path.join(out,`reading-room-${width}x${height}-${name}.png`)});};
 for(const [tab,slug] of [['Chat','chat'],['Study','study'],['Pray','prayer'],['Today','today']]){
  await page.getByRole('tab',{name:tab,exact:true}).click();await capture(slug);
  row.pages[slug]=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,heroImage:getComputedStyle(document.querySelector('.page.on .dp-head')||document.querySelector('#greet')).backgroundImage}));
  assert.equal(row.pages[slug].overflow,false,`${width} ${slug} horizontal overflow`);
 }
 await page.locator('.saint-bio-toggle').click();assert.equal(await page.locator('#saintBio').textContent(),biography);
 assert.equal(await page.locator('.saint-bio-toggle').getAttribute('aria-expanded'),'true');
 await page.locator('.saint-bio-toggle').click();
 row.biography={fullRetained:true,collapsed:true,fallback:await page.locator('#saintPortrait').evaluate(e=>e.classList.contains('is-fallback'))};
 if(width===390||width===1440){
  await page.locator('#settingsBtn').click();
  for(const category of ['Appearance','Atmosphere','Conversation','Data']){
   await page.getByRole('tab',{name:category,exact:true}).click();
   assert.equal(await page.locator('.settings-category[aria-selected=true]').textContent(),category);
   assert.equal(await page.locator('.settings-body > .set-sec:not([hidden])').count(),1);
   await capture('settings-'+category.toLowerCase());
  }
  await page.locator('#settingsClose').click();
  await page.getByRole('tab',{name:'Study',exact:true}).click();
  await page.locator('#glossaryBtn').click();await page.locator('#glossarySearch').fill('grace');
  assert.ok((await page.locator('#glossaryList').textContent()).includes('Prevenient grace'));
  await page.locator('#glossaryClose').click();
  await page.locator('#lessonBrowse').click();await page.locator('#lessonSearch').fill('Mary');
  await page.locator('#lessonBrowserGrid button').click();assert.ok((await page.locator('#lessonName').textContent()).includes('Virgin Mary'));
  await page.locator('#quizOpts [role=radio]').first().click();await page.locator('#quizNext').click();
  assert.ok((await page.locator('#sec-quiz-study').textContent()).includes('Question 2'));
  await page.locator('#page-study .reader-ask-secondary').click();assert.equal(await page.locator('#composer').getAttribute('role'),'dialog');
  await page.locator('.reader-composer-close').click();
  await page.getByRole('tab',{name:'Pray',exact:true}).click();await page.locator('#prayIntent2').fill('A long intention that spans more than one line so its contents remain readable on a small screen.');
  await page.locator('#examenGuided').click();await capture('examen');await page.locator('#examenClose').click();
  if(width===1440){await page.locator('#sbToggle').click();assert.equal(await page.locator('#sidebar').evaluate(e=>e.inert),false);await page.locator('#revampHistoryClose').click();assert.equal(await page.locator('#sidebar').evaluate(e=>e.inert),true);}
 }
 await page.getByRole('tab',{name:'Chat',exact:true}).click();
 if(width<=1000)await page.locator('#sbToggle').click();
 await capture('history-open'); await page.locator('.sb-item .txt').click();
 await page.waitForTimeout(350);
 assert.equal(await page.locator('#greet').evaluate(e=>getComputedStyle(e).display),'none');
 assert.equal(await page.locator('#thread [data-continue]').count(),1);
 assert.ok(!(await page.locator('#thread .bubble.md').textContent()).includes('drawing breath'));
 if(width<1000)await page.locator('.reply-action-trigger').click();
 await capture('reply-actions');
 row.reply=await page.evaluate(()=>{const panel=document.querySelector('#thread .reply-action-panel'),p=panel.getBoundingClientRect(),c=document.querySelector('#composer').getBoundingClientRect();return {hiddenGreeting:getComputedStyle(document.querySelector('#greet')).display==='none',continuation:!!panel.querySelector('[data-continue]'),overlap:p.width>0&&p.bottom>c.top&&p.top<c.bottom,buttons:[...panel.querySelectorAll('button')].map(b=>({label:b.textContent.trim(),height:b.getBoundingClientRect().height}))};});
 assert.equal(row.reply.overlap,false,`${width} menu overlap`);
 if(width<1000)await page.keyboard.press('Escape');
 await page.locator('#threadShareStart').click();await page.locator('.msg-share-toggle').first().click();assert.equal(await page.locator('.msg-share-toggle[aria-pressed=true]').count(),1);await capture('sharing');await page.locator('#threadShareCancel').click();
 if(width===390){
  await page.locator('.reply-action-trigger').click();await page.locator('[data-continue]').click();
  await page.waitForFunction(()=>document.querySelectorAll('#thread [data-continue]').length>0&&document.querySelector('#thread').textContent.includes('single stream chunk'));
  assert.ok(requests[0].messages.some(m=>m.content.includes('Continue exactly')));
  await page.reload();await page.waitForTimeout(350);assert.ok(await page.locator('#thread [data-continue]').count());
  await page.locator('#newChat').evaluate(el=>el.click());await page.locator('#prompt').fill('A test question.');await page.locator('#send').click();
  await page.waitForFunction(()=>document.querySelector('#thread').textContent.includes('single stream chunk'));
  assert.ok(await page.locator('#thread [data-continue]').count());
  row.streaming={singleChunk:true,continuationRequest:true,truncatedReload:true,chats};
  await context.route('**/api/chat',r=>r.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({text:'A complete answer for response action verification.'})+'\n\ndata: [DONE]\n\n'}));
  await page.locator('#newChat').evaluate(el=>el.click());await page.locator('#prompt').fill('Another test question.');await page.locator('#send').click();
  await page.waitForFunction(()=>document.querySelector('#thread').textContent.includes('complete answer'));
  await page.locator('.reply-action-trigger').click();
  assert.equal(await page.locator('.reply-action-panel .act').count(),6);
  assert.equal(await page.locator('.reply-feedback-group .act').count(),3);
  await capture('complete-reply-actions');
  await page.locator('[data-fb=report]').click();await page.waitForTimeout(200);
  assert.ok(await page.locator('.report-scrim .dialog-close').isVisible());await capture('report');
  await page.keyboard.press('Escape');await page.waitForTimeout(250);assert.equal(await page.locator('.report-scrim').count(),0);
  await page.locator('.reply-action-trigger').click();await page.locator('[data-copy]').click();
  assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('complete answer'));
  await page.locator('#threadShareStart').click();await page.locator('.msg-share-toggle').last().click();await page.locator('#threadShareSelected').click();
  assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('complete answer'));
  assert.equal(await page.locator('#thread').evaluate(e=>e.classList.contains('share-selecting')),false);
  await page.locator('#fileInput').setInputFiles({name:'reflection.txt',mimeType:'text/plain',buffer:Buffer.from('A local attachment fixture.')});
  assert.ok((await page.locator('#attachRow').textContent()).includes('reflection.txt'));await page.locator('#attachRow .fx').click();assert.ok(await page.locator('#attachRow').evaluate(e=>e.hidden));
  await page.locator('#settingsBtn').click();await page.getByRole('tab',{name:'Appearance',exact:true}).click();
  await page.locator('.swatch[data-theme=vellum]').click();await page.locator('[data-seg=textScale] [data-val=xl]').click();await page.locator('[data-seg=motion] [data-val=reduced]').click();
  await page.locator('#settingsClose').click();await page.reload();await page.waitForTimeout(250);
  assert.equal(await page.locator('html').getAttribute('data-theme'),'vellum');assert.equal(await page.locator('html').getAttribute('data-motion'),'reduced');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sa_prefs_v1')).textScale),'xl');
  row.extra={completeActions:true,reportDismissal:true,copy:true,selectedShare:true,attachment:true,preferencesPersist:true};
 }
 row.errors=errors;assert.deepEqual(errors,[]);result.push(row);
 await context.close();
}
console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
