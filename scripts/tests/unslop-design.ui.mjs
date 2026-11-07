// Actual ERP presentation components with explicit synthetic data and auth/API
// fixtures. No database, production account or outgoing email is used.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

const dashboard = {
  updatedAt:"2026-11-06T06:00:00Z",period:"November 2026",unavailable:[],
  access:{inventory:true,listings:true,sales:true,customers:true,activity:true,teamActivity:true},
  inventory:{total:229,listed:172,unlisted:57,preparedUnlisted:57,gemstones:[{name:"Sapphire",count:120},{name:"Emerald",count:69},{name:"Ruby",count:40}]},
  marketplace:{total:243,shops:[{id:"ebay",platform:"EBAY",name:"KhyatiGems eBay",connected:true,active:142,drafts:12,errors:0,lastSyncedAt:"2026-11-06T06:00:00Z"},{id:"etsy",platform:"ETSY",name:"KhyatiGems Etsy",connected:false,active:101,drafts:4,errors:2,lastSyncedAt:null}]},
  invoices:{total:24,export:18,tax:6,other:0,unpaid:3,recent:[{id:"one",number:"INV-1042",type:"EXPORT",currency:"USD",amount:250,inrAmount:20000,paymentStatus:"PAID",customer:"Gemstone Trading Company",country:"US"},{id:"two",number:"INV-1043",type:"TAX",currency:"INR",amount:48000,inrAmount:48000,paymentStatus:"UNPAID",customer:"Emerald Collections",country:"IN"}]},
  customers:{new:12,returningBuyers:8},activity:[{id:"a",actorId:"user",actor:"Review user",role:"ADMIN",action:"UPDATE",entity:"Inventory",reference:"GEM-1042",createdAt:"2026-11-06T06:00:00Z",changes:[{field:"status",before:"DRAFT",after:"IN_STOCK"}]}],
};
const fixture = `
import React from 'react';import{createRoot}from'react-dom/client';
import{LoginShell}from'./components/auth/login-shell';import{LoginForm}from'./components/auth/login-form';
import{TradingDashboard}from'./components/dashboard/trading-dashboard';
import{DashboardHeader}from'./components/dashboard/dashboard-header';import{BusinessHealthCards}from'./components/dashboard/business-health-cards';
import{Card,CardHeader,CardTitle,CardContent}from'./components/ui/card';import{Button}from'./components/ui/button';
import{Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription}from'./components/ui/dialog';
import{EmptyState}from'./components/ui/empty-state';import{WorkspaceHeader}from'./components/layout/workspace-header';
const view=new URLSearchParams(location.search).get('view');
createRoot(document.getElementById('app')).render(view==='login'?<LoginShell companyName="KhyatiGems" logoUrl="/brand.png" subtitle="Gemstone inventory, marketplace channels and business operations" accessNotice="Authorized staff access" highlights={[{title:'Inventory',desc:'Images and certificates'},{title:'Invoices',desc:'Domestic and export sales'}]} whatsNewItems={[]}><LoginForm/></LoginShell>:<main data-erp-dashboard className="erp-workspace mx-auto min-h-dvh max-w-[1500px] p-4 lg:p-6">{view==='trading'?<TradingDashboard userId="fixture" initialData={window.fixtureData}/>:<div className="space-y-6"><WorkspaceHeader><h1>Business overview</h1><p>Gemstone inventory and sales</p></WorkspaceHeader><DashboardHeader name="Review user" dbConnection="Turso Cloud"/><BusinessHealthCards data={{todayOrders:4,inventory:{total:229},labelCart:{count:12},readyToSell:{count:57},salesThisMonth:24}}/><Card data-testid="stable-card"><CardHeader><CardTitle>Inventory operations</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-[9px] uppercase tracking-widest">Certificate readiness</p><Dialog><DialogTrigger asChild><Button>Review inventory</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Inventory details</DialogTitle><DialogDescription>Review certificate details before continuing</DialogDescription></DialogHeader><input className="min-h-10 rounded-lg border px-3" aria-label="Reference" defaultValue="GEM-1042"/></DialogContent></Dialog></CardContent></Card><EmptyState variant="search"/></div>}</main>);
`;
const bundle = await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,format:"iife",platform:"browser",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"design-fixtures",setup(builder){
  builder.onResolve({filter:/^(next\/navigation|next\/link|next\/image|next-auth\/react|next-themes|swr)$/},args=>({path:args.path,namespace:"fixture"}));
  builder.onLoad({filter:/.*/,namespace:"fixture"},args=>({resolveDir:process.cwd(),loader:"tsx",contents:args.path==='next/navigation'?`export const useRouter=()=>({push(){},refresh(){}});`:args.path==='next/image'?`import React from'react';export default function Image({fill,priority,unoptimized,fetchPriority,...props}){return<img {...props}/>} `:args.path==='next/link'?`import React from'react';export default function Link({children,prefetch,...props}){return<a {...props}>{children}</a>}`:args.path==='next-auth/react'?`export async function signIn(provider,credentials){window.fixtureCredentials=credentials;return{error:null}}`:args.path==='next-themes'?`export const useTheme=()=>({resolvedTheme:document.documentElement.classList.contains('dark')?'dark':'light'});`:`export default function useSWR(){return{data:window.fixtureData,isLoading:false,isValidating:false,mutate:async()=>{}}}`}));
}}]});
const globals=(await postcss([tailwind()]).process(await readFile("app/globals.css","utf8"),{from:"app/globals.css"})).css;
const css=globals+await readFile("app/workspace-theme.css","utf8");
const logo=await readFile("public/khyati-gems-icon-white.png");
const server=createServer(async(req,res)=>{
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}
  if(['/ebay-logo.svg','/etsy-logo.svg'].includes(req.url)){res.setHeader('Content-Type','image/svg+xml');res.end(await readFile('public'+req.url));return;}
  if(req.url==='/brand.png'){res.setHeader('Content-Type','image/png');res.end(logo);return;}
  if(req.url?.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url==='/api/auth/otp'?{required:true,method:'authenticator',emailAvailable:true}:dashboard));return;}
  const theme=new URL(req.url,'http://fixture.test').searchParams.get('theme')||'light';
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html class="${theme==='light'?'':'dark'}" data-workspace-theme="sapphire-facet" data-workspace-mode="${theme}" data-surface="slate"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="background:var(--background);color:var(--foreground)"><div id="app"></div><script>window.fixtureData=${JSON.stringify(dashboard)}</script><script src="/bundle.js"></script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  await mkdir('tmp/unslop-review',{recursive:true});browser=await puppeteer.launch({headless:true});
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const width of[320,390,1440])for(const theme of['light','dark','dim'])for(const view of['login','trading','shared']){
    await page.setViewport({width,height:1000});await page.goto(`${base}/?view=${view}&theme=${theme}`,{waitUntil:'networkidle0'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Overflow: ${view}/${theme}/${width}`);
    if(view==='login'){
      await page.screenshot({path:`tmp/unslop-review/${view}-${theme}-${width}.png`,fullPage:false});
      await page.waitForSelector('#password').catch(error=>{throw new Error('Login render failed: '+JSON.stringify(errors)+'; '+error.message)});
      assert.equal(await page.$('::-p-text(Sign in with passkey)'),null);
      assert.equal(await page.$eval('#password',element=>element.required),true);
      assert.equal(await page.$eval('button[type="submit"]',element=>getComputedStyle(element).backgroundImage),'none');
      await page.type('#email','review@example.test');await page.type('#password','synthetic-password');
      await page.click('button[type="submit"]');await page.waitForSelector('#login-verification');
      await page.type('#login-verification','123456');await page.click('button[type="submit"]');
      await page.waitForFunction(()=>window.fixtureCredentials);assert.equal((await page.evaluate(()=>window.fixtureCredentials)).authenticatorCode,'123456');
    }
    if(view==='shared'){
      const card=await page.$('[data-testid="stable-card"]');await card.hover();
      assert.equal(await card.evaluate(element=>getComputedStyle(element).transform),'none');
      assert.equal(await page.$eval('[data-testid="stable-card"] p',element=>getComputedStyle(element).fontSize),'12px');
      assert.equal(await page.$eval('[data-testid="stable-card"] p',element=>getComputedStyle(element).textTransform),'none');
      assert.equal(await page.$eval('.workspace-header',element=>getComputedStyle(element).backgroundImage),'none');
      assert.equal(await page.$('::-p-text(Good Morning)'),null);
      await page.locator('::-p-text(Review inventory)').click();await page.waitForSelector('[role="dialog"]');
      assert.equal(await page.$eval('[role="dialog"]',element=>element.contains(document.activeElement)),true);
      await page.keyboard.press('Escape');await page.waitForSelector('[role="dialog"]',{hidden:true});
    }
    if(view==='trading'&&width<768){await page.click('nav[aria-label="Dashboard sections"] button:nth-child(2)');assert.equal(await page.$eval('nav [aria-current="page"]',element=>element.textContent),'Stock');}
    if(view!=='login') await page.screenshot({path:`tmp/unslop-review/${view}-${theme}-${width}.png`,fullPage:false});
  }
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.goto(`${base}/?view=shared&theme=dark`,{waitUntil:'networkidle0'});
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(animation=>animation.playState==='running').length),0);
  assert.deepEqual(errors,[]);
  console.log('Unslop browser checks passed: real login/MFA, trading/classic/shared components, 320/390/1440px, light/dark/dim, no overflow, readable captions, quiet surfaces, stable hover, dialog focus/dismissal and reduced motion. Screenshots: tmp/unslop-review');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
