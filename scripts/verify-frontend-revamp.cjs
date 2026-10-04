const fs = require('fs');
const vm = require('vm');
const cp = require('child_process');
const assert = require('assert/strict');
const branch = cp.execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const preview = process.argv.includes('--preview') || branch === 'frontend-revamp-test';
const original = cp.execFileSync('git',['show','825e6d0:index.html'],{encoding:'utf8'});
const current = fs.readFileSync('index.html','utf8');
const ids = html => [...html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<!--[\s\S]*?-->/g,'').matchAll(/(?<![\w-])id="([^"]+)"/g)].map(m => m[1]);
const oldIds = ids(original), newIds = ids(current);
assert.equal(new Set(newIds).size,newIds.length,'Duplicate HTML IDs');
assert.deepEqual(oldIds.filter(id=>!newIds.includes(id)),[],'Existing controls removed');
for(const name of ['lessons.js','config.js','backend/server.js']) {
  const baseline = cp.execFileSync('git',['show',`825e6d0:${name}`],{encoding:'utf8'});
  assert.ok(fs.readFileSync(name,'utf8').replace(/\r\n/g,'\n') === baseline.replace(/\r\n/g,'\n'),`${name} changed`);
}
let scripts = 0;
for(const match of current.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if(!/\bsrc=/.test(match[1]) && match[2].trim()) {new vm.Script(match[2],{filename:`index.inline.${scripts++}.js`});}
}
new vm.Script(fs.readFileSync('frontend-revamp.js','utf8'),{filename:'frontend-revamp.js'});
const landing = fs.readFileSync('landing.html','utf8');
const deployment = JSON.parse(fs.readFileSync('vercel.json','utf8'));
const robotsHeader = (deployment.headers || []).some(rule => (rule.headers || []).some(header => header.key.toLowerCase()==='x-robots-tag'&&header.value.toLowerCase().includes('noindex')));
if(preview) {
  assert.match(current,/name="robots" content="noindex,nofollow"/,'Preview app must remain out of search results');
  assert.ok(!landing.includes('href="https://staugustineai.vercel.app/"'),'Preview landing escapes to production app');
  assert.ok(robotsHeader,'Preview deployment must send the noindex response header');
} else {
  assert.doesNotMatch(current,/name="robots" content="noindex\s*,\s*nofollow"/i,'Production app must be indexable');
  assert.ok(!robotsHeader,'Production deployment must not send a noindex response header');
  const originalLanding = cp.execFileSync('git',['show','825e6d0:landing.html'],{encoding:'utf8',maxBuffer:32*1024*1024});
  assert.equal(landing.replace(/\r\n/g,'\n'),originalLanding.replace(/\r\n/g,'\n'),'Production landing page should remain unchanged');
}
const cssVersion = current.match(/<link\s+rel="stylesheet"\s+href="frontend-revamp\.css\?v=([^"]+)"/);
assert.ok(cssVersion,'Revamp stylesheet needs a versioned URL for client and service-worker cache updates');
const sw = fs.readFileSync('sw.js','utf8');
assert.ok(sw.includes(`./frontend-revamp.css?v=${cssVersion[1]}`),'Offline shell stylesheet version must match index.html');
console.log(`${oldIds.length} original DOM IDs retained; ${scripts} inline scripts parse; content, API configuration, and backend unchanged; ${preview?'preview isolation and noindex':'production indexing and landing-page preservation'} checked.`);
