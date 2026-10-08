const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
const browser=await chromium.launch({headless:true});const results=[];
try{for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},hasTouch:width===390,reducedMotion:'reduce'});
 await context.addInitScript(()=>{localStorage.setItem('sa_beta_ok','1');localStorage.setItem('sa_tut_v1','1');});
 await context.route('**/config.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.SA_API_BASE=location.origin;'}));
 let readingRequests=0;
 await context.route('**/api/**',r=>{
  const url=new URL(r.request().url());
  if(url.pathname==='/api/models')return r.fulfill({json:{models:[{id:'qa',name:'QA model'}]}});
  if(url.pathname==='/api/readings'){readingRequests++;return readingRequests===1?r.fulfill({status:503,json:{error:'fixture'}}):r.fulfill({json:{first:'A recovered reading fixture.',psalm:'A recovered psalm fixture.',gospel:'A recovered gospel fixture.'}});}
  if(url.pathname==='/api/saint')return r.fulfill({json:{name:'Saint fixture',bio:'A short supplied biography.',connection:'A supplied connection.',image:'/portrait-fixture.svg'}});
  return r.fulfill({status:404,json:{}});
 });
 await context.route('**/portrait-fixture.svg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect width="120" height="160" fill="#d9c4a9"/></svg>'}));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/#today');
 await page.getByText('Today’s readings could not be loaded.',{exact:false}).waitFor();
 await page.locator('#sec-readings').getByRole('button',{name:'Try again',exact:true}).click();
 await page.getByText('A recovered reading fixture.',{exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('.saint-portrait-image')?.naturalWidth===120);
 assert.equal(await page.locator('#saintPortrait').evaluate(e=>e.classList.contains('is-fallback')),false);
 const row={width,readingRecovery:true,loadedPortrait:true};
 row.metadata=await page.locator('#page-today .dp-eyebrow,#page-today .ts-l').evaluateAll(els=>els.map(e=>({label:e.textContent.trim(),size:parseFloat(getComputedStyle(e).fontSize)})));
 assert.ok(row.metadata.every(e=>e.size>=12));
 await page.screenshot({path:path.join(path.resolve(__dirname,'../../artifacts'),`reading-details-${width}-today.png`),fullPage:true});
 await page.getByRole('tab',{name:'Study',exact:true}).click();
 await page.locator('#lessonBrowse').click();await page.waitForTimeout(200);
 await page.keyboard.press('Escape');await page.waitForTimeout(100);
 assert.equal(await page.locator('#lessonBrowserScrim').evaluate(e=>e.inert),true);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'lessonBrowse');
 await page.locator('#glossaryBtn').click();await page.waitForTimeout(150);await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'glossaryBtn');
 await page.locator('details.ls').evaluateAll(els=>els.forEach(e=>e.open=true));
 row.sources=await page.locator('#page-study .source-kind').allTextContents();assert.ok(row.sources.includes('Reading notes'));
 await page.screenshot({path:path.join(path.resolve(__dirname,'../../artifacts'),`reading-details-${width}-study-expanded.png`),fullPage:true});
 row.motion=await page.locator('.page.on').evaluate(e=>getComputedStyle(e).animationDuration);assert.ok(row.motion==='0s'||parseFloat(row.motion)<=0.001);
 await page.locator('#settingsBtn').click();await page.waitForTimeout(150);
 await page.getByRole('tab',{name:'Appearance',exact:true}).focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.getByRole('tab',{name:'Atmosphere',exact:true}).getAttribute('aria-selected'),'true');
 await page.locator('#settingsClose').focus();await page.keyboard.press('Shift+Tab');
 assert.ok(await page.locator('#settingsSheet').evaluate(e=>e.contains(document.activeElement)));
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'settingsBtn');
 row.keyboardDialogs=true;row.settingsKeyboard=true;
 await page.getByRole('tab',{name:'Pray',exact:true}).click();await page.screenshot({path:path.join(path.resolve(__dirname,'../../artifacts'),`reading-details-${width}-prayer-full.png`),fullPage:true});
 assert.equal(await page.locator('#page-prayer .reader-ask').isVisible(),true);
 row.errors=errors;assert.deepEqual(errors,[]);results.push(row);await context.close();
}
console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
