module.exports=[270406,(e,t,i)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},918622,(e,t,i)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,i)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,i)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},120635,(e,t,i)=>{t.exports=e.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},324725,(e,t,i)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,i)=>{t.exports=e.x("path",()=>require("path"))},418520,e=>e.a(async(t,i)=>{try{let t=await e.y("@libsql/client-6da938047d5fc1cd");e.n(t),i()}catch(e){i(e)}},!0),522734,(e,t,i)=>{t.exports=e.x("fs",()=>require("fs"))},254799,(e,t,i)=>{t.exports=e.x("crypto",()=>require("crypto"))},446786,(e,t,i)=>{t.exports=e.x("os",()=>require("os"))},463021,(e,t,i)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},180490,e=>{e.v({name:"dotenv",version:"17.2.3",description:"Loads environment variables from .env file",main:"lib/main.js",types:"lib/main.d.ts",exports:{".":{types:"./lib/main.d.ts",require:"./lib/main.js",default:"./lib/main.js"},"./config":"./config.js","./config.js":"./config.js","./lib/env-options":"./lib/env-options.js","./lib/env-options.js":"./lib/env-options.js","./lib/cli-options":"./lib/cli-options.js","./lib/cli-options.js":"./lib/cli-options.js","./package.json":"./package.json"},scripts:{"dts-check":"tsc --project tests/types/tsconfig.json",lint:"standard",pretest:"npm run lint && npm run dts-check",test:"tap run tests/**/*.js --allow-empty-coverage --disable-coverage --timeout=60000","test:coverage":"tap run tests/**/*.js --show-full-coverage --timeout=60000 --coverage-report=text --coverage-report=lcov",prerelease:"npm test",release:"standard-version"},repository:{type:"git",url:"git://github.com/motdotla/dotenv.git"},homepage:"https://github.com/motdotla/dotenv#readme",funding:"https://dotenvx.com",keywords:["dotenv","env",".env","environment","variables","config","settings"],readmeFilename:"README.md",license:"BSD-2-Clause",devDependencies:{"@types/node":"^18.11.3",decache:"^4.6.2",sinon:"^14.0.1",standard:"^17.0.0","standard-version":"^9.5.0",tap:"^19.2.0",typescript:"^4.8.4"},engines:{node:">=12"},browser:{fs:!1}})},193695,(e,t,i)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},817374,(e,t,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0});var r={ActionDidNotRevalidate:function(){return a},ActionDidRevalidateDynamicOnly:function(){return o},ActionDidRevalidateStaticAndDynamic:function(){return n}};for(var s in r)Object.defineProperty(i,s,{enumerable:!0,get:r[s]});let a=0,n=1,o=2},787683,e=>e.a(async(t,i)=>{try{var r=e.i(15270),s=t([r]);[r]=s.then?(await s)():s;let d={INVENTORY_VIEW:"inventory:view",INVENTORY_CREATE:"inventory:create",INVENTORY_EDIT:"inventory:edit",INVENTORY_DELETE:"inventory:delete",INVENTORY_VIEW_COST:"inventory:view_cost",PURCHASES_VIEW:"purchases:view",LISTINGS_VIEW:"listings:view",MARKETPLACE_SETTINGS_MANAGE:"marketplace:settings_manage",QUOTATION_VIEW:"quotations:view",QUOTATION_CREATE:"quotations:create",QUOTATION_EDIT:"quotations:edit",QUOTATION_APPROVE:"quotations:approve",SALES_VIEW:"sales:view",SALES_CREATE:"sales:create",SALES_EDIT:"sales:edit",SALES_DELETE:"sales:delete",INVOICE_CREATE:"invoices:create",INVOICE_MANAGE:"invoices:manage",INVOICE_DELETE:"invoices:delete",VENDOR_VIEW:"vendors:view",VENDOR_MANAGE:"vendors:manage",CUSTOMER_VIEW:"customers:view",CUSTOMER_CREATE:"customers:create",CUSTOMER_EDIT:"customers:edit",CUSTOMER_DELETE:"customers:delete",CUSTOMER_MANAGE:"customers:manage",CUSTOMER_EXPORT:"customers:export",COMMUNICATION_VIEW:"communication:view",COMMUNICATION_MANAGE:"communication:manage",RECEIVABLES_VIEW:"receivables:view",RECEIVABLES_MANAGE:"receivables:manage",SETTINGS_MANAGE:"settings:manage",USERS_MANAGE:"users:manage",SETTINGS_LANDING_PAGE:"settings:landing_page",REPORTS_VIEW:"reports:view",REPORTS_FINANCIAL:"reports:financial",REPORTS_VENDOR:"reports:vendor",ADVANCES_MANAGE:"advances:manage",REPORTS_CUSTOMER_INSIGHTS:"reports:customer_insights",LABELS_VIEW:"labels:view",ACTIVITY_VIEW:"activity:view",CUSTOMERS_MERGE:"customers:merge",PACKAGING_MANAGE:"packaging:manage",PACKAGING_VIEW:"packaging:view",PACKAGING_PRINT:"packaging:print"},u={SUPER_ADMIN:Object.values(d),ADMIN:Object.values(d),SALES:[],ACCOUNTS:[d.INVENTORY_VIEW,d.LISTINGS_VIEW,d.REPORTS_VIEW],VIEWER:[]};function a(e){if(!e)return"";let t=e.trim().toUpperCase().replace(/[^A-Z0-9]+/g,"_");return"SUPERADMIN"===t||"SUPER-ADMIN"===t?"SUPER_ADMIN":t}function n(e){let t=a(e);return"SUPER_ADMIN"===t||"ADMINISTRATOR"===t}async function o(e,t){await (0,r.ensureUserRoleIdColumn)();let i=await (0,r.hasUserRoleIdColumn)();await (0,r.ensureRbacSchema)();let s=await (0,r.hasTable)("UserPermission"),a=await (0,r.hasTable)("RolePermission"),o=await (0,r.hasTable)("Role"),p=await (0,r.hasTable)("Permission");if(!(s&&a&&o&&p)||!i){let i=await r.prisma.user.findUnique({where:{id:e},select:{role:!0}});return!!i&&(!!n(i.role)||l(i.role).includes(t))}try{let i=await r.prisma.user.findUnique({where:{id:e},include:{roleRelation:{include:{permissions:{include:{permission:!0}}}},userPermissions:{include:{permission:!0}}}});if(!i)return!1;let s=i.userPermissions?.find(e=>e.permission.key===t);if(s)return s.allow;if(i.roleRelation){if(n(i.roleRelation.name)||(i.roleRelation.permissions?.map(e=>e.permission.key)??[]).includes(t))return!0;return!1}if(n(i.role))return!0;try{let e=await r.prisma.role.findUnique({where:{name:i.role},include:{permissions:{include:{permission:!0}}}});if(n(e?.name)||(e?.permissions?.map(e=>e.permission?.key).filter(Boolean)??[]).includes(t))return!0;if(e)return!1}catch{}return l(i.role).includes(t)}catch(s){let i=s instanceof Error?s.message:String(s);if(i.includes("no such column")&&i.includes("roleId")){let i=await r.prisma.user.findUnique({where:{id:e},select:{role:!0}});if(!i)return!1;if(n(i.role))return!0;return l(i.role).includes(t)}throw s}}function l(e){return u[a(e)]||[]}async function p(e,t){let i=new Map;await (0,r.ensureUserRoleIdColumn)(),await (0,r.ensureRbacSchema)();let s=await (0,r.hasUserRoleIdColumn)(),a=await (0,r.hasTable)("UserPermission"),o=await (0,r.hasTable)("RolePermission"),p=await (0,r.hasTable)("Role"),c=await (0,r.hasTable)("Permission");if(!(a&&o&&p&&c)||!s){let s=await r.prisma.user.findUnique({where:{id:e},select:{role:!0}});if(!s)return t.forEach(e=>i.set(e,!1)),i;let a=n(s.role),o=l(s.role);return t.forEach(e=>i.set(e,a||o.includes(e))),i}try{let s=await r.prisma.user.findUnique({where:{id:e},include:{roleRelation:{include:{permissions:{include:{permission:!0}}}},userPermissions:{include:{permission:!0}}}});if(!s)return t.forEach(e=>i.set(e,!1)),i;if(s.roleRelation&&n(s.roleRelation.name))return t.forEach(e=>i.set(e,!0)),i;let a=new Map;s.userPermissions?.forEach(e=>{e.permission?.key&&a.set(e.permission.key,e.allow)});let o=s.roleRelation||(n(s.role)?null:await r.prisma.role.findUnique({where:{name:s.role},include:{permissions:{include:{permission:!0}}}})),p=new Set(o?.permissions?.map(e=>e.permission?.key).filter(Boolean)??[]);t.forEach(e=>{a.has(e)?i.set(e,a.get(e)):p.has(e)?i.set(e,!0):o?i.set(e,!1):i.set(e,l(s.role).includes(e))})}catch{let s=await r.prisma.user.findUnique({where:{id:e},select:{role:!0}}),a=!!s&&n(s.role),o=s?l(s.role):[];t.forEach(e=>i.set(e,a||o.includes(e)))}return i}function c(e,t){return!!n(e)||l(e).includes(t)}e.s(["PERMISSIONS",0,d,"checkUserPermission",()=>o,"checkUserPermissions",()=>p,"hasPermission",()=>c]),i()}catch(e){i(e)}},!1),2926,e=>{"use strict";let t=["https://images.unsplash.com/photo-1779786000796-effa1636a7fb?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1779786410107-f1729039bb01?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"];function i(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function r(e){return e&&e.trim()||"Not specified"}function s(e){let t=e.trim().match(/^([A-Za-z]+(?:[-_][A-Za-z]+)?)/);return t?t[1].replace(/_/g,"-").toUpperCase():null}function a(e){let t=r(e);if("Not specified"===t)return t;let i=t.toLowerCase();if(!(/^https?:\/\//i.test(t)||i.includes("certificate_number=")))return t;for(let[e,t]of[["igi-gtl","IGI-GTL"],["igigtl","IGI-GTL"],["gemstonecertificationinstitute","GCI"],["gci","GCI"],["igi","IGI"],["gia","GIA"],["gtl","GTL"],["egl","EGL"],["hrd","HRD"]])if(i.includes(e))return t;try{let e=new URL(t),i=e.searchParams.get("certificate_number")||e.searchParams.get("certificateNumber")||e.searchParams.get("cert")||e.searchParams.get("cert_no");if(i){let e=s(i);if(e)return e}}catch{let e=t.match(/certificate[_-]?number=([^&\s]+)/i);if(e?.[1]){let t=s(decodeURIComponent(e[1]));if(t)return t}}return"Certified"}function n(e,t){return e?.toLowerCase().includes("bracelet")?"Crystal Healing / Gemstone Bracelet":e?.toLowerCase().includes("bead")?"Crystal Healing / Gemstone Bead":t?`Natural ${t}`:"Natural Gemstone"}function o(e,s={}){let l,p,c,d,u,m,g,f,h,x,y,b,w,E,v,I,A,T,C,S,R,N,B,$,M,_,U=s.includeMeasurements??!0,G=s.includeCertificate??!0,k=s.includeOrigin??!0,P=s.settings?.companyName||"KhyatiGems",j=s.settings?.tagline||"Precious Gems for your Precious Ones",O=s.settings?.brandLogoUrl||"https://images.unsplash.com/photo-1779794047454-ad379b48d1ed?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";console.log(`[eBay Description] category="${e.category}" gemType="${e.gemType}" hasComboUrls=${!!s.settings?.categoryGemtypeImageUrls} comboKeys=${Object.keys(s.settings?.categoryGemtypeImageUrls||{}).length}`);let D=(m=e.weightValue?`${e.weightValue} ${e.weightUnit||"cts"}`:"",[e.itemName||"Gemstone Product",m].filter(Boolean).join(" – ")),L=(g=[],e.sku&&g.push(`SKU: ${e.sku}`),g.push(`Product Type: ${n(e.category,e.gemType)}`),g.push(`Gemstones: ${r(e.gemType||e.category)}`),e.weightValue&&g.push(`Total Weight: ${e.weightValue} ${e.weightUnit||"cts"}`),e.shape&&g.push(`Bead Shape: ${e.shape}`),e.color&&g.push(`Color: ${e.color}`),e.transparency&&g.push(`Transparency: ${e.transparency}`),e.treatment&&g.push(`Treatment: ${e.treatment}`),G&&e.certification&&g.push(`Certification: ${a(e.certification)}`),g.join("\n")),V=(f=r(e.itemName),h=r(e.gemType),x=e.weightValue?`${e.weightValue} ${e.weightUnit||"cts"}`:"",y=r(e.shape),b=r(e.color),w=r(e.treatment),E=r(e.origin),v=r(e.transparency),I=[`Unlock elegance, authenticity, and value with this stunning ${f.toLowerCase()}.`,`Crafted from ${h.toLowerCase()}, this item is carefully selected for its premium quality and visual appeal.`],x&&I.push(`It weighs ${x}, making it a standout piece for collectors and jewelry enthusiasts.`),b&&"Not specified"!==b&&I.push(`The color profile is ${b.toLowerCase()}, creating a rich and memorable presence.`),y&&"Not specified"!==y&&I.push(`Each piece features a ${y.toLowerCase()} shape with precision and symmetry.`),w&&"none"!==w.toLowerCase()&&I.push(`Treatment: ${w}.`),E&&"Not specified"!==E&&I.push(`Origin: ${E}.`),v&&"Not specified"!==v&&I.push(`Transparency: ${v}.`),I.join(" ")),q=e.notes?.trim(),z=(A=[],e.sku&&A.push(["SKU",r(e.sku)]),A.push(["Product Type",n(e.category,e.gemType)],["Gemstones",r(e.gemType||e.category)],["Color",r(e.color)],["Shape",r(e.shape)],["Weight",e.weightValue?`${e.weightValue} ${e.weightUnit||"cts"}`:"Not specified"],["Dimensions",r(e.dimensionsMm)],["Treatment",r(e.treatment)],["Origin",r(e.origin)],["Transparency",r(e.transparency)]),G&&A.push(["Certification",a(e.certification)]),e.braceletType&&A.push(["Bracelet Type",e.braceletType]),e.beadSizeMm&&A.push(["Bead Size",`${e.beadSizeMm}mm`]),e.beadCount&&A.push(["Bead Count",String(e.beadCount)]),e.holeSizeMm&&A.push(["Hole Size",`${e.holeSizeMm}mm`]),e.innerCircumferenceMm&&A.push(["Inner Circumference",`${e.innerCircumferenceMm}mm`]),e.standardSize&&A.push(["Standard Size",e.standardSize]),A),W=U?`<table style="width:100%;border-collapse:separate;border-spacing:0 4px;margin:18px 0 0 0;font-size:15px;">
        <tbody>
          ${z.map(([e,t])=>`<tr>
                  <td style="padding:10px 12px;background:#F8F9FB;color:#181B4E;font-weight:600;border-radius:8px 0 0 8px;border:1px solid #E0E3EA;border-right:none;">${i(e)}</td>
                  <td style="padding:10px 12px;background:#fff;color:#181B4E;border-radius:0 8px 8px 0;border:1px solid #E0E3EA;">${i(t)}</td>
                </tr>`).join("")}
        </tbody>
      </table>`:"",F=G?`<div style="background:#f0f8ff;padding:18px 20px;margin:24px 0 0 0;border-radius:12px;border-left:5px solid #4a90d9;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="margin-top:0;color:#4a90d9;font-size:18px;font-weight:700;">📜 Certification</h3>
        <p style="margin:0 0 4px 0;"><strong>Certification:</strong> ${i(a(e.certification))}</p>
        <p style="margin:0;">This item is guaranteed to be authentic and carefully curated by KhyatiGems.</p>
      </div>`:"",H=k?`<div style="background:#fff8f0;padding:18px 20px;margin:24px 0 0 0;border-radius:12px;border-left:5px solid #E94B3C;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="margin-top:0;color:#E94B3C;font-size:18px;font-weight:700;">🌍 Origin & Treatment</h3>
        <p style="margin:0 0 4px 0;"><strong>Origin:</strong> ${i(r(e.origin))}</p>
        <p style="margin:0;"><strong>Treatment:</strong> ${i(r(e.treatment))}</p>
      </div>`:"",K=`
    <div style="text-align:center;margin:0 0 32px 0;">
      <img src="${O}" alt="KhyatiGems Logo" style="height:72px;max-width:320px;object-fit:contain;border-radius:12px;box-shadow:0 2px 12px #181B4E22;margin-bottom:8px;background:#fff;" />
      <div style="font-size:18px;font-weight:700;color:#181B4E;letter-spacing:1px;">${i(P)}</div>
      <div style="font-size:13px;color:#E94B3C;font-weight:500;">${i(j)}</div>
    </div>
  `,Y=function(e,i,r,s,a){let n=e?.trim()||null,o=i?.trim()||null;if(n&&o&&r){let e=[...new Set([`${n}|${o}`,`${n}|${o}`.replace(/\s*\|\s*/g,"|")])];for(let t of e){let e=r[t];if(e?.length)return console.log(`[eBay Images] Using combo images for: ${t}`),e}let t=Object.keys(r);console.log(`[eBay Images] Combo key not found. Tried: ${e.join(", ")}. Available keys (${t.length}): ${t.length>0?t.slice(0,10).join(", "):"(none)"}`)}if(n&&s){let e=s[n];if(e?.length)return console.log(`[eBay Images] Using category images for: ${n}`),e}return a?.length?(console.log("[eBay Images] Using global images"),a):(console.log("[eBay Images] Using default images"),t)}(e.category,e.gemType,s.settings?.categoryGemtypeImageUrls,s.settings?.categoryImageUrls||(s.categoryImages?{[e.category||""]:s.categoryImages}:void 0),s.settings?.globalBannerImages),Q=Y[0]||t[0],J=Y[1]||t[1],Z=Y[2]||t[0],X=`
    <div style="background:#F8F9FB;padding:16px 14px;margin:20px 0 28px 0;border-radius:16px;box-shadow:0 2px 12px #181B4E11;">
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
        ${["Authentic Products","Real Product Photos","Secure Packaging","Worldwide Shipping","Carefully Selected","Customer Support"].map(e=>`
              <div style="flex:1 1 160px;min-width:160px;background:#fff;border:1px solid #E0E3EA;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#C0A050;border-radius:9999px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span style="font-size:0.92rem;font-weight:600;color:#181B4E;">${i(e)}</span>
              </div>
            `).join("")}
      </div>
    </div>`,ee=(u=(c=!(p=(l=(e.category||"").toLowerCase()).includes("bracelet"))&&(l.includes("loose")||l.includes("gemstone")||l.includes("stone")),d=[],p&&d.push("Natural Gemstone","Comfortable Wear","Carefully Selected","Gift Ready"),c&&d.push("Natural Stone","Collector Friendly","Jewelry Making Ready","Carefully Inspected"),d).slice(0,4)).length<3?"":`
    <div style="background:#F8F9FB;padding:20px 24px;margin:24px 0 0 0;border-radius:14px;box-shadow:0 2px 12px #181B4E11;">
      <h3 style="margin:0 0 12px 0;color:#C0A050;font-size:1.1rem;font-weight:700;">✨ What Makes This Item Special</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
        ${u.map(e=>`
              <div style="background:#fff;border:1px solid #E0E3EA;border-radius:14px;padding:14px;min-height:96px;display:flex;align-items:flex-start;gap:10px;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#E94B3C;border-radius:9999px;color:#fff;font-size:16px;font-weight:700;">•</span>
                <div style="font-size:0.95rem;font-weight:700;color:#181B4E;">${i(e)}</div>
              </div>
            `).join("")}
      </div>
    </div>`,et=(T=[],C=r(e.treatment),S=r(e.origin),R=a(e.certification),$=!(B=(N=(e.category||"").toLowerCase()).includes("bracelet"))&&(N.includes("loose")||N.includes("gemstone")||N.includes("stone")),e.treatment&&"Not specified"!==C&&"none"!==C.toLowerCase()&&T.push({question:"What treatment has this gemstone received?",answer:`This gemstone has been ${C.toLowerCase()} while preserving its natural character.`}),e.origin&&"Not specified"!==S&&T.push({question:"Where does this gemstone come from?",answer:`It originates from ${S.toLowerCase()} and is selected for quality and authenticity.`}),G&&e.certification&&"Not specified"!==R&&T.push({question:"Does this item come with certification?",answer:`Yes, it includes ${R.toLowerCase()} certification to verify authenticity.`}),B&&T.push({question:"Is this bracelet ready to wear?",answer:"Yes, this bracelet is designed for comfortable everyday wear and is ready to gift."}),$&&T.push({question:"Is this loose gemstone suitable for jewelry making?",answer:"Yes, this natural gemstone is ideal for collectors and jewelry makers."}),0===(M=T.slice(0,5)).length?"":`
    <div style="background:#fff8f0;padding:20px 24px;margin:24px 0 0 0;border-radius:14px;box-shadow:0 2px 12px #181B4E11;">
      <h3 style="margin:0 0 12px 0;color:#C0A050;font-size:1.1rem;font-weight:700;">❓ Smart FAQ</h3>
      <div style="display:grid;gap:12px;">
        ${M.map(e=>`
              <div style="background:#fff;border:1px solid #E0E3EA;border-radius:14px;padding:14px;">
                <div style="font-size:0.95rem;font-weight:700;color:#181B4E;">${i(e.question)}</div>
                <div style="margin-top:8px;color:#475569;font-size:0.95rem;line-height:1.5;">${i(e.answer)}</div>
              </div>
            `).join("")}
      </div>
    </div>`);return`<div style="font-family:Inter,Roboto,Arial,sans-serif;max-width:800px;margin:0 auto;background:#fff;border-radius:18px;box-shadow:0 4px 32px #181B4E11;padding:32px 18px 32px 18px;">
      ${K}
      <h1 style="color:#181B4E;font-size:2rem;font-weight:800;letter-spacing:0.5px;margin:0 0 18px 0;line-height:1.2;">${i(D)}</h1>

      <div style="background:#F8F9FB;padding:20px 24px;margin:0 0 28px 0;border-radius:12px;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="margin:0 0 8px 0;color:#E94B3C;font-size:1.1rem;font-weight:700;">🌟 Welcome to KhyatiGems</h3>
        <p style="margin:0;color:#181B4E;font-size:1rem;">At KhyatiGems, a premier brand by Khyati Precious Gems Private Limited, we bring collectors, crystal enthusiasts, and jewelry connoisseurs authentic, premium-quality treasures. Every piece in our collection is carefully curated and accurately described, ensuring complete peace of mind and a luxurious shopping experience.</p>
      </div>

      <div style="margin:32px 0 28px 0;text-align:center;">
        <img src="${Q}" alt="KhyatiGems banner 1" style="width:100%;max-width:740px;min-width:220px;object-fit:cover;border-radius:14px;box-shadow:0 2px 12px #181B4E22;" />
      </div>

      ${X}

      ${_=e.mediaUrls?.filter(Boolean)||[],(e.mediaUrl&&!_.includes(e.mediaUrl)&&_.unshift(e.mediaUrl),0===_.length)?"":`
          <div style="background:#fff;padding:20px 24px;margin:0 0 24px 0;border-radius:12px;box-shadow:0 2px 8px #181B4E11;">
            <h3 style="color:#C0A050;font-size:1.1rem;font-weight:700;margin:0 0 12px 0;">📸 Product Photos</h3>
            <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">
              ${_.map(e=>`
                <div style="flex:0 0 auto;width:calc(50% - 6px);max-width:360px;min-width:180px;border-radius:12px;overflow:hidden;border:1px solid #E0E3EA;box-shadow:0 2px 8px #181B4E11;">
                  <img src="${i(e)}" alt="Product Image" style="width:100%;height:auto;display:block;aspect-ratio:1;object-fit:cover;" />
                </div>
              `).join("")}
            </div>
          </div>`}

      <div style="background:#fff;padding:20px 24px;margin:0 0 24px 0;border-radius:12px;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="color:#C0A050;font-size:1.1rem;font-weight:700;margin:0 0 8px 0;">📋 Product Specifications</h3>
        <p style="white-space: pre-line;color:#181B4E;font-size:1rem;margin:0 0 8px 0;">${i(L)}</p>
      </div>

      <div style="margin:32px 0 28px 0;text-align:center;">
        <img src="${J}" alt="KhyatiGems banner 2" style="width:100%;max-width:740px;min-width:220px;object-fit:cover;border-radius:14px;box-shadow:0 2px 12px #181B4E22;" />
      </div>

      <div style="background:#fff;padding:20px 24px;margin:0 0 24px 0;border-radius:12px;box-shadow:0 2px 8px #181B4E11;">
        <h3 style="color:#C0A050;font-size:1.1rem;font-weight:700;margin:0 0 8px 0;">🔍 Detailed Description</h3>
        <p style="color:#181B4E;font-size:1rem;margin:0 0 8px 0;">${i(V)}</p>
        ${q?`<p style="color:#181B4E;font-size:1rem;margin:0 0 8px 0;">${i(q)}</p>`:""}
      </div>

      <div style="margin:32px 0 28px 0;text-align:center;">
        <img src="${Z}" alt="KhyatiGems banner 3" style="width:100%;max-width:740px;min-width:220px;object-fit:cover;border-radius:14px;box-shadow:0 2px 12px #181B4E22;" />
      </div>

      ${W}
      ${ee}
      ${F}
      ${H}
      ${et}

      <div style="background:#F8F9FB;padding:18px 20px;margin:32px 0 0 0;border-radius:12px;text-align:center;box-shadow:0 2px 8px #181B4E11;border-top:3px solid #C0A050;">
        <h3 style="color:#C0A050;font-size:1.1rem;font-weight:700;margin:0 0 8px 0;">🛡️ Store Policies & Buying Information</h3>
        <p style="color:#181B4E;font-size:1rem;margin:0 0 4px 0;">Authenticity & Quality Guarantee: We firmly believe our premium products will meet and exceed your expectations. Please allow for slight organic variations in bead patterns and color depth for natural stones.</p>
        <p style="color:#181B4E;font-size:1rem;margin:0 0 4px 0;">Shipping & Handling: Secure packaging, prompt dispatch, and reliable tracking information are provided for each order.</p>
        <p style="color:#181B4E;font-size:1rem;margin:0;">Carefully selected and offered by Khyati Precious Gems Private Limited, bringing authentic gemstones and jewelry to collectors and enthusiasts worldwide.</p>
      </div>

      <div style="background:#fff;padding:18px 20px;margin:32px 0 0 0;border-radius:12px;text-align:center;box-shadow:0 2px 8px #181B4E11;border-top:3px solid #E94B3C;">
        <h3 style="color:#E94B3C;font-size:1.1rem;font-weight:700;margin:0 0 8px 0;">🛍️ Closing Note</h3>
        <p style="color:#181B4E;font-size:1rem;margin:0 0 4px 0;">A statement piece with undeniable presence — this item is crafted for those who value authenticity, luxury, and spiritual alignment.</p>
        <p style="color:#181B4E;font-size:1rem;margin:0;">Exclusively offered by Khyati Precious Gems Private Limited. Don't forget to save khyatigemsofficial to your eBay favorite sellers list for exclusive updates on our latest authentic gemstone arrivals!</p>
      </div>
    </div>`}e.s(["buildEbayHtmlDescription",()=>o])},922447,e=>e.a(async(t,i)=>{try{var r=e.i(15270),s=t([r]);[r]=s.then?(await s)():s;let p=["https://images.unsplash.com/photo-1779786000796-effa1636a7fb?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1779786410107-f1729039bb01?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"];function a(e,t){if(!e)return t;try{return JSON.parse(e)}catch{return t}}async function n(){try{let e=await r.prisma.$queryRawUnsafe('SELECT * FROM "EbaySettings" LIMIT 1');if(!e||0===e.length){let e=JSON.stringify(p);await r.prisma.$executeRawUnsafe(`
        INSERT INTO "EbaySettings" (
          "id",
          "globalBannerImages",
          "categoryImageUrls",
          "categoryGemtypeImageUrls",
          "companyName",
          "tagline",
          "imageRotationMode",
          "maxImagesPerCategory",
          "imagesPerDescription",
          "createdAt",
          "updatedAt"
        ) VALUES (
          'default',
          ?,
          '{}',
          '{}',
          'KhyatiGems',
          'Precious Gems for your Precious Ones',
          'RANDOM',
          4,
          2,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `,e);let t=await r.prisma.$queryRawUnsafe('SELECT * FROM "EbaySettings" LIMIT 1');return{success:!0,data:t?.[0]||null}}return{success:!0,data:e[0]}}catch(e){return console.error("[getEbaySettings] Error:",e),{success:!1,error:e instanceof Error?e.message:"Failed to fetch eBay settings"}}}function o(e,t){if(!t){let t=a(e?.globalBannerImages,p);return t.length>0?t:p}let i=a(e?.categoryImageUrls,{})[t]||[];if(i.length>0)return i;let r=a(e?.globalBannerImages,p);return r.length>0?r:p}function l(e,t=2,i="SEQUENTIAL"){if(0===e.length)return p.slice(0,t);let r=Math.min(t,e.length);if("RANDOM"===i){let t=[],i=[...e];for(let e=0;e<r;e++){let e=Math.floor(Math.random()*i.length);t.push(i[e]),i.splice(e,1)}return t}return e.slice(0,r)}e.s(["getCategoryImages",()=>o,"getEbaySettings",()=>n,"selectImagesForDescription",()=>l]),i()}catch(e){i(e)}},!1),324191,e=>{e.v(e=>Promise.resolve().then(()=>e(15270)))},632683,e=>{e.v(t=>Promise.all(["server/chunks/lib_activity-logger_ts_9a9706ca._.js"].map(t=>e.l(t))).then(()=>t(637564)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__c87afdc7._.js.map