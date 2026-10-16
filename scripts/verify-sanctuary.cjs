/* Presentation contract checks. API fixtures are test data, never shipped content. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const vm = require('node:vm');
const base = process.env.SANCTUARY_BASE || 'http://127.0.0.1:8781/';
const out = process.env.SANCTUARY_OUT || path.resolve('..','artifacts','sanctuary-redesign');
fs.mkdirSync(out,{recursive:true});
const source = fs.readFileSync('index.html','utf8');
const original = cp.execFileSync('git',['show','55a978a:index.html'],{encoding:'utf8',maxBuffer:8*1024*1024});
const ids = html => [...html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<!--[\s\S]*?-->/g,'').matchAll(/(?<![\w-])id="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(ids(original).filter(id=>!ids(source).includes(id)),[]);
assert.equal(new Set(ids(source)).size,ids(source).length);
const inline = html => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/\bsrc\s*=/.test(m[1])).map(m=>m[2]);
assert.deepEqual(inline(source),inline(original),'Original inline behavior changed');
for(const name of ['lessons.js','lesson-sources.js','app-data.js','app-features.js','frontend-revamp.js','config.js','backend/server.js','landing.html']) {
  const previous = cp.execFileSync('git',['show',`55a978a:${name}`],{encoding:'utf8',maxBuffer:32*1024*1024});
  assert.equal(fs.readFileSync(name,'utf8').replace(/\r\n/g,'\n'),previous.replace(/\r\n/g,'\n'),`${name} changed`);
}
new vm.Script(fs.readFileSync('sanctuary-ui.js','utf8'));
const report = {base,source:{ids:ids(source).length,inlineBehaviorUnchanged:true,backendContentStorageSourcesUnchanged:true},viewports:[],themes:[],backgrounds:[],errors:[]};
const fixtures = {
  models:{models:[{id:'ui-verification',name:'UI verification',featured:true}]},
  readings:{first:'A reading fixture for responsive verification.',psalm:'A psalm fixture.',gospel:'A Gospel fixture.',source:'USCCB',link:'https://bible.usccb.org/daily-bible-readings'},
  saint:{name:'Saint layout fixture',date:'October 16',bio:'A long biography fixture used only to check expansion, wrapping, and scrolling. '.repeat(14),conn:'A connection fixture for checking readable layout.',source:'Franciscan Media',link:'https://www.franciscanmedia.org/saint-of-the-day/'}
};
async function prepare(context) {
  await context.addInitScript(()=>{localStorage.setItem('sa_beta_ok','1');localStorage.setItem('sa_tut_v1','1');});
  await context.route('**/config.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.SA_API_BASE=location.origin;'}));
  await context.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(fixtures[new URL(r.request().url()).pathname.split('/').pop()] || {ok:true})}));
}
// Computed opaque UI surfaces only. Photograph-only decoration is not text contrast evidence.
async function contrast(page,selector) {
  return page.locator(selector).evaluateAll(nodes=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
    const colorContext=canvas.getContext('2d',{willReadFrequently:true});
    function rgb(s){colorContext.clearRect(0,0,1,1);colorContext.fillStyle=s;colorContext.fillRect(0,0,1,1);return [...colorContext.getImageData(0,0,1,1).data].slice(0,3);}
    function lum(c){return c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
    return nodes.filter(e=>e.getClientRects().length&&!e.disabled&&e.textContent.trim()).map(e=>{
      let bg=e;while(bg&&getComputedStyle(bg).backgroundColor==='rgba(0, 0, 0, 0)')bg=bg.parentElement;
      const a=lum(rgb(getComputedStyle(e).color)),b=lum(rgb(bg?getComputedStyle(bg).backgroundColor:'rgb(255,255,255)'));
      return {id:e.id,text:e.textContent.trim().slice(0,30),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    });
  });
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const [width,height] of [[320,568],[375,812],[390,844],[430,932],[768,1024],[1024,900],[1440,1000],[844,390]]) {
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<1000,isMobile:width<600||height<500,serviceWorkers:'block'});
    await prepare(context);
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    await page.goto(base+'#chat');await page.evaluate(()=>document.fonts.ready);
    const row={width,height,pages:[]};
    for(const slug of ['chat','study','prayer','today']) {
      await page.locator(`.nav-tab[data-page="${slug}"]`).click();await page.waitForTimeout(260);
      const data=await page.evaluate(slug=>{
        const intro=document.querySelector('.page.on .dp-head');
        const nav=document.querySelector('.nav-tab.on').getBoundingClientRect(),marker=document.querySelector('.sc-selection-nav').getBoundingClientRect();
        return {slug,overflow:document.documentElement.scrollWidth-innerWidth,introParent:intro?.parentElement.className,navCenterError:Math.abs((nav.x+nav.width/2)-(marker.x+marker.width/2))};
      },slug);
      assert.equal(data.overflow,0,`${width} ${slug} overflow`);
      assert.ok(data.navCenterError<2,`${width} ${slug} navigation marker is off center`);
      if(slug==='study')assert.equal(data.introParent,'daily-page');
      if(slug==='prayer')assert.equal(data.introParent,'pray-page');
      row.pages.push(data);
      await page.mouse.move(0,0);
      await page.screenshot({path:path.join(out,`verified-${width}x${height}-${slug}.png`)});
    }
    await page.locator('#settingsBtn').click();
    for(const name of ['Appearance','Atmosphere','Conversation','Data']) {
      await page.getByRole('tab',{name,exact:true}).click();
      await page.waitForTimeout(200);
      const overflowing=await page.locator('#settingsSheet').evaluate(e=>e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left<0);
      assert.equal(overflowing,false,`${width} ${name} settings overflow`);
      if(name==='Atmosphere') {
        const tilesFit=await page.locator('#bgGrid').evaluate(grid=>{const p=grid.getBoundingClientRect();return [...grid.children].every(e=>{const r=e.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;});});
        assert.equal(tilesFit,true,`${width} atmosphere tiles overflow their columns`);
      }
      if([390,768,1440].includes(width))await page.screenshot({path:path.join(out,`verified-${width}-settings-${name.toLowerCase()}.png`)});
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#settingsBtn').evaluate(e=>e===document.activeElement),true,'Settings focus was not restored');
    if(width===390) {
      await page.locator('#settingsBtn').click();await page.getByRole('tab',{name:'Appearance',exact:true}).click();
      const themes=await page.locator('.swatch[data-theme]').evaluateAll(es=>es.map(e=>e.dataset.theme));
      for(const theme of themes) {
        await page.locator(`.swatch[data-theme="${theme}"]`).click();await page.locator('#settingsClose').click();
        await page.locator('.nav-tab[data-page="prayer"]').click();
        const ratios=await contrast(page,'#page-prayer .dp-head h2,#page-prayer .sc-intro-copy > p,#page-prayer .dp-act,#page-prayer .dp-act small');
        report.themes.push({theme,ratios});
        assert.ok(ratios.every(r=>r.ratio>=4.5),`${theme} text contrast: ${JSON.stringify(ratios)}`);
        await page.locator('#settingsBtn').click();await page.getByRole('tab',{name:'Appearance',exact:true}).click();
      }
      await page.locator('.swatch[data-theme="parchment"]').click();await page.getByRole('tab',{name:'Atmosphere',exact:true}).click();
      const backgrounds=await page.locator('#bgGrid button').evaluateAll(es=>es.map(e=>({id:e.dataset.bg,label:e.getAttribute('aria-label')})));
      assert.equal(backgrounds.length,17);
      for(const bg of backgrounds) {
        const button=page.locator(`#bgGrid [data-bg="${bg.id}"]`);await button.click();
        assert.equal(await button.getAttribute('aria-pressed'),'true');
        assert.equal(await button.locator('.sc-scene-name').count(),1);
        report.backgrounds.push(bg);
      }
      await page.locator('#settingsClose').click();await page.reload();await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sa_prefs_v1')).background.id),backgrounds.at(-1).id);
      await page.locator('.nav-tab[data-page="chat"]').click();
      for(const label of ['Quick','Thoughtful','Contemplative']) {
        await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(260);
        const geometry=await page.evaluate(()=>{const a=document.querySelector('#composer .seg[aria-pressed="true"]').getBoundingClientRect(),b=document.querySelector('#composer .sc-selection-mode').getBoundingClientRect();return {left:b.left-a.left,right:a.right-b.right};});
        assert.ok(Math.abs(geometry.left-2)<1&&Math.abs(geometry.right-2)<1,`${label} selection inset`);
      }
      await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.nav-tab[data-page="study"]').click();
      await page.locator('.lesson-flow details[data-step="2"] summary').click();await page.waitForTimeout(50);
      const running=await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);
      assert.equal(running,0,'Motion runs with prefers-reduced-motion');
      await page.locator('.nav-tab[data-page="prayer"]').focus();await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('#page-prayer h2')),true,'Keyboard page change did not focus heading');
      row.preferencesPersist=true;row.modesAligned=true;row.reducedMotion=true;row.keyboardHeadingFocus=true;
    }
    report.viewports.push(row);await context.close();
  }
  assert.deepEqual(report.errors,[]);
  fs.writeFileSync(path.join(out,'presentation-verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({viewports:report.viewports.length,pages:report.viewports.length*4,themes:report.themes.length,backgrounds:report.backgrounds.length,errors:report.errors,source:report.source},null,2));
 } finally {await browser.close();}
})().catch(e=>{fs.writeFileSync(path.join(out,'presentation-verification-failure.json'),JSON.stringify({message:e.message,report},null,2));console.error(e);process.exitCode=1;});
