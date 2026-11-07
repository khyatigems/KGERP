// Real presentation components; synthetic records and local assets only.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

const fixture = `
import React,{useState} from'react';import{createRoot}from'react-dom/client';
import{InventoryTable}from'./components/inventory/inventory-table';
import{VirtualList}from'./components/ui/virtual-list';import{SegmentedControl}from'./components/ui/segmented-control';
import{Tabs,TabsList,TabsTrigger,TabsContent}from'./components/ui/tabs';
import{VerificationExperience}from'./components/qr-page/verification-experience';
import{SkuPreviewContent}from'./components/preview/sku-preview-content';
import{CreatePackagingWizard}from'./app/erp/packaging/create/create-wizard';
const records=Array.from({length:1200},(_,index)=>({id:String(index),sku:'KG-TEST-'+index,itemName:index%3?'Natural emerald':'A longer gemstone name with extra dimensions for variable height measurement',status:'IN_STOCK',gemType:'Emerald',weightValue:6,weightUnit:'cts',pricingMode:'PER_CARAT',sellingRatePerCarat:550,shape:'Oval',color:'Green',originCountry:'Zambia',certificateNo:'REPORT-123',lab:'GCI',imageUrl:'/gem.svg',createdAt:'2026-11-06',media:[],certificates:[]}));
const view=new URLSearchParams(location.search).get('view');
function App(){const[items,setItems]=useState(records);const[mode,setMode]=useState('table');
if(view==='wizard')return <main className="erp-workspace p-4"><CreatePackagingWizard/></main>;
if(view==='table')return <main className="erp-workspace p-4"><h1>Inventory performance fixture</h1><button id="filter" onClick={()=>setItems(records.filter(item=>Number(item.id)<125))}>Filter</button><button id="empty" onClick={()=>setItems([])}>Empty</button><InventoryTable data={items} vendors={[]} categories={[]} gemstones={[]} colors={[]} rashis={[]} certificates={[]} collections={[]}/></main>;
if(view==='cart')return <main className="erp-workspace p-4"><output id="total">{items.length}</output><div style={{display:'flex',flexDirection:'column',height:500}}><VirtualList items={items} getKey={item=>item.id} label="Packaging batch items" renderItem={item=><article style={{padding:12,border:'1px solid var(--border)',borderRadius:8}}><p>{item.sku}</p><p>{item.itemName}</p><button onClick={()=>setItems(prev=>prev.filter(entry=>entry.id!==item.id))} aria-label={'Remove '+item.sku}>Remove</button></article>}/></div></main>;
if(view==='verify')return <VerificationExperience supportEmail="support@example.test" items={[{serialNumber:'KG-VERIFY-000001-LONG-PACKAGING-REFERENCE',status:'verified',packedOn:'6 November 2026',inventory:{...records[0],sellingPrice:3300,dimensionsMm:'10 × 8'}},{serialNumber:'PREVIEW-001',status:'preview'},{serialNumber:'UNKNOWN-001',status:'unmatched'}]}/>;
if(view==='sku')return <SkuPreviewContent item={{...records[0],media:[{id:'one',type:'IMAGE',mediaUrl:'/gem.svg',isPrimary:true},{id:'two',type:'IMAGE',mediaUrl:'/second.svg',isPrimary:false},{id:'three',type:'VIDEO',mediaUrl:'/video.mp4',isPrimary:false}],certification:'GCI'}} companySettings={{email:'support@example.test',phone:'+919915270295'}} rate={550} totalAmount={3300} isPerCarat={true} descriptionHtml="<p>Gemstone details retained.</p>" qrPaymentAmount={null} qrPaymentDue={0} qrAllowPartial={false} certificateUrl={null}/>;
return <main className="erp-workspace p-4"><SegmentedControl label="Inventory view" value={mode} onValueChange={setMode} options={[{value:'table',label:'Table'},{value:'cards',label:'Cards'}]}/><output id="mode">{mode}</output><Tabs defaultValue="one"><TabsList aria-label="Test sections"><TabsTrigger value="one">First</TabsTrigger><TabsTrigger value="skip" disabled>Disabled</TabsTrigger><TabsTrigger value="two">Second</TabsTrigger></TabsList><TabsContent value="one"><input aria-label="Saved first value" defaultValue="Preserved"/></TabsContent><TabsContent value="skip">Skipped</TabsContent><TabsContent value="two">Second panel</TabsContent></Tabs></main>;
}createRoot(document.getElementById('root')).render(<App/>);
`;
const mocks = {
  navigation: `export const useRouter=()=>({push:(url)=>{window.fixtureRoute=url},refresh(){}});`,
  link: `import React from'react';export default function Link({children,prefetch,...props}){return<a {...props}>{children}</a>}`,
  image: `import React from'react';export default function Image({fill,priority,unoptimized,fetchPriority,sizes,style,...props}){return<img {...props} style={{...(fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{}),...style}}/>}`,
  dynamic: `export default function dynamic(){return()=>null}`,
  loader: `export const useGlobalLoader=()=>({showLoader(){},hideLoader(){}});`,
  actions: `export async function updateInventoryStatus(){return{success:true}}`,
  dialogs: `export const BulkEditDialog=()=>null;export const BulkCertificateDialog=()=>null;export const RegenerateEbayButton=()=>null;export const RegenerateEtsyButton=()=>null;`,
  empty: `export {};`,
  packaging: `let cart=Array.from({length:1200},(_,index)=>({inventoryId:String(index),quantity:2,location:'Studio',inventory:{id:String(index),sku:'BATCH-'+index,itemName:'Synthetic emerald',status:'IN_STOCK',pieces:4,weightValue:6,weightUnit:'cts'}}));export const getPackagingCart=async()=>cart;export const removeFromPackagingCart=async(id)=>{window.fixtureRemoved=id;cart=cart.filter(item=>item.inventoryId!==id)};export const getPackagingInventory=async()=>({success:true,data:cart.slice(0,10).map(item=>item.inventory),pagination:{pages:120}});export const addToPackagingCart=async()=>{};export const clearPackagingCart=async()=>{cart=[]};export const createPackagingPrintFromCart=async()=>({success:true,labels:[]});export const previewPackagingFromCart=async()=>({success:true,labels:[]});export const completePackagingThermalPrint=async()=>{};`,
  pdf: `export const generatePackagingPdfBlob=async()=>new Blob();export const createObjectUrl=()=>'';`,
};
const bundle=await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:"tsx"},outfile:"fixture.js",bundle:true,write:false,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"isolated-experience",setup(builder){
  builder.onResolve({filter:/^next\/(navigation|link|image|dynamic)$/},({path})=>({path:path.split('/')[1],namespace:'fixture'}));
  builder.onResolve({filter:/components\/global-loader-provider$/},()=>({path:'loader',namespace:'fixture'}));
  builder.onResolve({filter:/app\/\(dashboard\)\/inventory\/actions$/},()=>({path:'actions',namespace:'fixture'}));
  builder.onResolve({filter:/(?:bulk-edit-dialog|bulk-certificate-dialog|regenerate-ebay-button)$/},()=>({path:'dialogs',namespace:'fixture'}));
  builder.onResolve({filter:/(?:inventory-qr|packaging-print-dialog|label-print-dialog|inventory-detail-drawer)$/},()=>({path:'empty',namespace:'fixture'}));
  builder.onResolve({filter:/app\/erp\/packaging\/actions$/},()=>({path:'packaging',namespace:'fixture'}));
  builder.onResolve({filter:/lib\/packaging-pdf-generator$/},()=>({path:'pdf',namespace:'fixture'}));
  builder.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:mocks[path],loader:'tsx',resolveDir:process.cwd()}));
}}]});
const css=(await postcss([tailwind()]).process(await readFile('app/globals.css','utf8'),{from:'app/globals.css'})).css
  +await readFile('app/workspace-theme.css','utf8')+await readFile('components/inventory/inventory-layout.css','utf8')
  +bundle.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n');
const gem=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><rect width="900" height="900" fill="#f0f2eb"/><path d="M270 190h360l100 260-280 260-280-260z" fill="#426d56"/><path d="M270 190l180 520 180-520M170 450h560M270 190l180 260 180-260" fill="none" stroke="#b8d2b6" stroke-width="8"/></svg>`;
const server=createServer(async(req,res)=>{
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles.find(file=>file.path.endsWith('.js')).text);return;}
  if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}
  if(req.url?.startsWith('/fonts/')){res.setHeader('Content-Type','font/ttf');res.end(await readFile('public'+req.url));return;}
  if(req.url?.startsWith('/brand/')||req.url?.startsWith('/social/')){res.setHeader('Content-Type',req.url.endsWith('.svg')?'image/svg+xml':'image/png');res.end(await readFile('public'+req.url));return;}
  if(req.url?.endsWith('.svg')||req.url?.endsWith('.png')){res.setHeader('Content-Type','image/svg+xml');res.end(gem);return;}
  const params=new URL(req.url,'http://fixture.test').searchParams;
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html class="${params.get('theme')==='dark'?'dark':''}" data-workspace-theme="sapphire-facet" data-surface="slate"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="background:var(--background);color:var(--foreground)"><div id="root"></div><script src="/bundle.js"></script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await puppeteer.launch({headless:true});const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base=`http://127.0.0.1:${server.address().port}`;
  await browser.defaultBrowserContext().overridePermissions(base,['clipboard-read','clipboard-sanitized-write']);
  await page.setRequestInterception(true);page.on('request',request=>request.url().startsWith(base)||request.url().startsWith('data:')?request.continue():request.respond({status:200,contentType:'image/svg+xml',body:gem}));
  await mkdir('tmp/experience-review',{recursive:true});
  await page.setViewport({width:1440,height:1000});await page.goto(base+'/?view=table',{waitUntil:'networkidle0'});
  await page.waitForSelector('tbody[data-virtualized=true] tr[data-index]');
  const rowCount=()=>page.$$eval('tbody tr[data-index]',rows=>rows.length);
  assert.ok(await rowCount()<40,'1,200 rows must not all mount');
  await page.$eval('tbody [role=checkbox]',element=>element.focus());
  await page.$eval('[data-slot=table-container]',element=>{element.scrollTop=element.scrollHeight});
  await page.waitForFunction(()=>document.querySelector('tr[data-index="1199"]'));
  assert.ok(await rowCount()<40);assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Select KG-TEST-0','Focused row stays mounted');
  await page.click('tr[data-index="1199"] [role=checkbox]');
  assert.match(await page.$eval('body',element=>element.innerText),/1 selected/);
  await page.$eval('[aria-label="Select all"]',element=>element.click());
  assert.match(await page.$eval('body',element=>element.innerText),/1200 selected/,'Select-all covers the complete loaded dataset');
  await page.click('#filter');await page.waitForFunction(()=>document.querySelector('table').getAttribute('aria-rowcount')==='126');
  await page.$eval('[data-slot=table-container]',element=>{element.scrollTop=element.scrollHeight});
  await page.waitForFunction(()=>document.querySelector('tr[data-index="124"]'));
  await page.click('#empty');await page.waitForFunction(()=>document.body.innerText.includes('No inventory items found.'));
  await page.goto(base+'/?view=cart',{waitUntil:'networkidle0'});
  await page.waitForSelector('[role=listitem]');assert.ok(await page.$$eval('[role=listitem]',items=>items.length)<40);
  await page.$eval('[aria-label="Packaging batch items"]',element=>{element.scrollTop=element.scrollHeight});
  await page.waitForSelector('[aria-label="Remove KG-TEST-1199"]');await page.click('[aria-label="Remove KG-TEST-1199"]');
  await page.waitForFunction(()=>document.querySelector('#total').textContent==='1199');
  for(const width of [390,1440]){
    await page.setViewport({width,height:1000});await page.goto(base+'/?view=wizard',{waitUntil:'networkidle0'});
    await page.waitForSelector('[aria-label="Packaging batch items"] [role=listitem]');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Packaging wizard overflow at ${width}`);
    const batch=await page.$('[aria-label="Packaging batch items"]');
    assert.ok(await batch.evaluate(element=>element.clientHeight>100&&element.clientHeight<1000),'Actual batch has a usable bounded viewport');
    assert.ok(await batch.$$eval('[role=listitem]',items=>items.length)<40);
    await batch.evaluate(element=>{element.scrollTop=element.scrollHeight});
    await page.waitForSelector('[aria-label="Remove BATCH-1199 from batch"]');await page.click('[aria-label="Remove BATCH-1199 from batch"]');
    await page.waitForFunction(()=>window.fixtureRemoved==='1199'&&document.body.innerText.includes('2398'));
    await page.screenshot({path:`tmp/experience-review/packaging-batch-${width}.png`,fullPage:false});
  }
  await page.setViewport({width:1440,height:1000});
  await page.goto(base+'/?view=controls',{waitUntil:'networkidle0'});
  await page.focus('[aria-label="Inventory view"] button');await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('#mode',element=>element.textContent),'cards');
  await page.focus('[role=tab]');await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('[role=tab][aria-selected=true]',element=>element.textContent),'Second');
  await page.keyboard.press('Home');assert.equal(await page.$eval('[aria-label="Saved first value"]',element=>element.value),'Preserved');
  for(const width of [320,390,1440])for(const theme of ['light','dark'])for(const view of ['verify','sku']){
    await page.setViewport({width,height:1000});await page.goto(base+'/?view='+view+'&theme='+theme,{waitUntil:'networkidle0'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Overflow ${view}/${width}`);
    await page.click('button[aria-label^="Copy"]');await page.waitForFunction(()=>document.body.innerText.includes('Copied'));
    const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(copied,view==='verify'?'KG-VERIFY-000001-LONG-PACKAGING-REFERENCE':'KG-TEST-0');
    if(view==='verify'){
      assert.match(await page.$eval('body',element=>element.innerText),/This is a preview, not an issued label/);
      assert.match(await page.$eval('body',element=>element.innerText),/couldn’t verify|couldn.t verify/);
      assert.equal(await page.$eval('.kgv-photo-zoom',element=>element.getBoundingClientRect().bottom<=element.closest('.kgv-image-wrap').getBoundingClientRect().bottom),true,'Enlarge control remains inside image');
      await page.click('[aria-label^="Enlarge photograph"]');await page.waitForSelector('[role=dialog]');await page.keyboard.press('Escape');await page.waitForSelector('[role=dialog]',{hidden:true});
    }else{
      await page.click('[aria-label="Next image"]');assert.equal(await page.$eval('.kg-gallery-counter',element=>element.textContent),'2 / 8');
      await page.focus('.kg-gallery-arrow-right');await page.keyboard.press('Home');assert.equal(await page.$eval('.kg-gallery-counter',element=>element.textContent),'1 / 8');
      await page.click('.kg-certificate-action');await page.waitForSelector('[role=dialog]');assert.equal(await page.$eval('[role=dialog]',element=>getComputedStyle(element).color),'rgb(32, 37, 33)','Public certificate stays readable with saved dark ERP theme');assert.match(await page.$eval('[role=dialog]',element=>element.innerText),/REPORT-123/);await page.keyboard.press('Escape');await page.waitForSelector('[role=dialog]',{hidden:true});
      await page.click('.kg-gallery-zoom-trigger');await page.waitForSelector('[role=dialog]');await page.keyboard.press('Escape');await page.waitForSelector('[role=dialog]',{hidden:true});
    }
    await page.evaluate(()=>{window.scrollTo(0,0);document.getAnimations().forEach(animation=>{if(animation.effect.getTiming().iterations!==Infinity)animation.finish()})});
    await page.screenshot({path:`tmp/experience-review/${view}-${theme}-${width}.png`,fullPage:false});
  }
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.goto(base+'/?view=sku',{waitUntil:'networkidle0'});
  assert.equal(await page.$eval('.kg-gallery-rotation-toggle',element=>element.disabled),true);
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(animation=>animation.playState==='running').length),0);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Clipboard unavailable')}}}));
  await page.click('button[aria-label^="Copy"]');await page.waitForFunction(()=>document.body.innerText.includes('Could not copy'));
  assert.deepEqual(errors,[]);
  console.log('Experience checks passed: 1,200-row bounded DOM and end-of-list reachability, full-dataset selection, filtering/empty state, retained focus, batch removal/totals, keyboard controls/tabs, 320/390/1440px public QR pages, all verification states, copy/error feedback, image zoom/gallery, certificate details and reduced motion. Screenshots: tmp/experience-review');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
