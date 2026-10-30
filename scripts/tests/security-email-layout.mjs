import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({headless:true});
try {
 const page = await browser.newPage();
 const banner = Buffer.from(await (await fetch('https://res.cloudinary.com/dxu1jawbs/image/upload/v1791202212/KHYATIGEMS_Luxury_Gemstone_Banner_agficv.png')).arrayBuffer());
 await page.setRequestInterception(true);
 page.on('request', request => request.respond({status:200,contentType:'image/png',body:banner}));
 for (const name of ['otp','sign-in-verified','recovery-sign-in']) {
  for (const width of [1920,1440,640,390,320]) {
   await page.setViewport({width,height:1000});
   await page.setContent(await readFile(`output/security/${name}-email-preview.html`,'utf8'),{waitUntil:'load'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name} overflow at ${width}`);
   assert.equal(await page.$eval('img',img=>img.complete&&img.naturalWidth>0),true,'brand banner loads');
   if (width >= 640) {
    const bounds = await page.$eval('.email-content', element => { const rect = element.getBoundingClientRect(); return {width: rect.width, center: rect.x + rect.width / 2}; });
    assert.ok(bounds.width <= 580, 'email remains readable on wide desktop screens');
    assert.ok(Math.abs(bounds.center - width / 2) < 2, 'email card stays centered');
   }
   if (name==='otp') assert.equal(await page.$eval('.otp-value',el=>el.textContent),'012345');
   await page.screenshot({path:`output/security/${name}-email-${width}.png`,fullPage:true});
  }
 }
 console.log('All three email variants rendered at 320, 390, 640, 1440 and 1920px: banner loaded, no overflow, centered desktop layout.');
} finally {await browser.close();}
