// Exercise the real SSE proxy with boundaries that used to concatenate words.
const assert = require('node:assert/strict');
process.env.OPENROUTER_API_KEY = 'test-only';
process.env.PORT = '0';
const { proxyStream } = require('./server.js');
async function answer(parts) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({start(controller) {
    for (const part of parts) controller.enqueue(encoder.encode(`data: ${JSON.stringify({choices:[{delta:{content:part}}]})}\n\n`));
    controller.close();
  }});
  let output='';
  await proxyStream({body},{write(chunk){output+=chunk;},end(){}});
  return output.split('\n').filter(line=>line.startsWith('data:')).map(line=>JSON.parse(line.slice(5))).filter(x=>typeof x.text==='string').map(x=>x.text).join('');
}
(async()=>{
  for(const parts of [
    ['You',' have made us for yourself, O Lord.'],
    ['Peace be',' with you, friend.'],
    ['Your heart is made for a lasting home.',' Come and rest.'],
    ['You',' have made us for yourself.\n','May the Lord give you peace.'],
  ]) assert.equal(await answer(parts),parts.join(''));
  console.log('PASS: SSE boundaries preserve spaces and line breaks.');
})().then(()=>process.exit(0),error=>{console.error(error);process.exit(1);});
