module.exports=[494127,e=>e.a(async(t,a)=>{try{var r=e.i(463021),i=e.i(15270),n=e.i(828424),o=t([i,n]);function s(e){let t=null;if("WHATSAPP"===e.sourceType&&e.payload)try{let a=JSON.parse(e.payload);if(a&&"object"==typeof a&&!Array.isArray(a)){let e=a.message;t="string"==typeof e?e:null}}catch(e){console.error("[communication-center] Invalid WhatsApp message payload:",e)}return{...e,recipient:"WHATSAPP"===e.sourceType?function(e){if(!e)return null;try{let t=JSON.parse(e);if(!t||"object"!=typeof t||Array.isArray(t))return null;let a=t.phone;return"string"==typeof a?a:null}catch(e){return console.error("[communication-center] Invalid WhatsApp campaign payload:",e),null}}(e.payload??null):e.recipient,bodyRef:"WHATSAPP"===e.sourceType?t:e.bodyRef,isRead:!!e.isRead}}[i,n]=o.then?(await o)():o;let c=r.Prisma.sql`
  SELECT
    e."id" AS "id",
    e."id" AS "sourceId",
    'EMAIL' AS "sourceType",
    'EMAIL' AS "channel",
    e."direction" AS "direction",
    e."recipient" AS "recipient",
    e."subject" AS "subject",
    e."status" AS "status",
    e."emailType" AS "emailType",
    e."provider" AS "provider",
    e."customerId" AS "customerId",
    c."name" AS "customerName",
    e."orderId" AS "orderId",
    i."invoiceNumber" AS "invoiceNumber",
    e."bodyRef" AS "bodyRef",
    COALESCE(e."receivedAt", e."createdAt") AS "createdAt",
    e."attemptCount" AS "attemptCount",
    e."nextRetryAt" AS "nextRetryAt",
    e."failureCode" AS "failureCode",
    e."lastError" AS "lastError",
    e."isRead" AS "isRead",
    e."threadId" AS "threadId",
    NULL AS "followUpAction",
    NULL AS "followUpNote",
    CASE WHEN e."threadId" IS NULL THEN 1 ELSE
      (SELECT COUNT(*) FROM "EmailLog" e2 WHERE e2."threadId" = e."threadId")
    END AS "threadCount",
    NULL AS "payload"
  FROM "EmailLog" e
  LEFT JOIN "Customer" c ON c."id" = e."customerId"
  LEFT JOIN "Invoice" i ON i."id" = e."orderId"

  UNION ALL

  SELECT
    'whatsapp:' || w."id" AS "id",
    w."id" AS "sourceId",
    'WHATSAPP' AS "sourceType",
    'WHATSAPP' AS "channel",
    'OUTBOUND' AS "direction",
    NULL AS "recipient",
    w."eventType" AS "subject",
    w."status" AS "status",
    w."templateKey" AS "emailType",
    w."channel" AS "provider",
    w."customerId" AS "customerId",
    c."name" AS "customerName",
    w."invoiceId" AS "orderId",
    wi."invoiceNumber" AS "invoiceNumber",
    NULL AS "bodyRef",
    w."createdAt" AS "createdAt",
    0 AS "attemptCount",
    NULL AS "nextRetryAt",
    NULL AS "failureCode",
    NULL AS "lastError",
    1 AS "isRead",
    NULL AS "threadId",
    NULL AS "followUpAction",
    NULL AS "followUpNote",
    1 AS "threadCount",
    w."payload" AS "payload"
  FROM "CustomerCampaignLog" w
  LEFT JOIN "Customer" c ON c."id" = w."customerId"
  LEFT JOIN "Invoice" wi ON wi."id" = w."invoiceId"
  WHERE w."channel" LIKE 'WHATSAPP%'

  UNION ALL

  SELECT
    'followup:' || f."id" AS "id",
    f."id" AS "sourceId",
    'FOLLOW_UP' AS "sourceType",
    'FOLLOW_UP' AS "channel",
    'OUTBOUND' AS "direction",
    NULL AS "recipient",
    COALESCE(f."action", f."channel") AS "subject",
    f."status" AS "status",
    f."channel" AS "emailType",
    NULL AS "provider",
    COALESCE(s."customerId", q."customerId") AS "customerId",
    fc."name" AS "customerName",
    f."invoiceId" AS "orderId",
    i."invoiceNumber" AS "invoiceNumber",
    f."note" AS "bodyRef",
    f."date" AS "createdAt",
    0 AS "attemptCount",
    f."promisedDate" AS "nextRetryAt",
    NULL AS "failureCode",
    NULL AS "lastError",
    1 AS "isRead",
    NULL AS "threadId",
    f."channel" AS "followUpAction",
    f."note" AS "followUpNote",
    1 AS "threadCount",
    NULL AS "payload"
  FROM "FollowUp" f
  LEFT JOIN "Sale" s ON s."id" = (
    SELECT s2."id" FROM "Sale" s2
    WHERE s2."invoiceId" = f."invoiceId"
    ORDER BY s2."saleDate" ASC LIMIT 1
  )
  LEFT JOIN "Invoice" i ON i."id" = f."invoiceId"
  LEFT JOIN "Quotation" q ON q."id" = i."quotationId"
  LEFT JOIN "Customer" fc ON fc."id" = COALESCE(s."customerId", q."customerId")
`;async function l(e){await Promise.all([(0,n.ensureMarketplaceFoundationSchema)(),(0,i.ensureBillfreePhase1Schema)(),(0,i.ensureFollowUpSchema)()]);let t=[];if(e.channel&&["EMAIL","WHATSAPP","FOLLOW_UP"].includes(e.channel)&&t.push(r.Prisma.sql`"channel" = ${e.channel}`),e.direction&&["INBOUND","OUTBOUND"].includes(e.direction)&&t.push(r.Prisma.sql`"direction" = ${e.direction}`),e.status&&t.push(r.Prisma.sql`"status" = ${e.status}`),e.emailType&&t.push(r.Prisma.sql`"emailType" = ${e.emailType}`),e.customerId&&t.push(r.Prisma.sql`"customerId" = ${e.customerId}`),e.orderId&&t.push(r.Prisma.sql`"orderId" = ${e.orderId}`),e.provider&&t.push(r.Prisma.sql`"provider" = ${e.provider}`),e.from&&t.push(r.Prisma.sql`"createdAt" >= ${e.from}`),e.to&&t.push(r.Prisma.sql`"createdAt" <= ${e.to}`),"unread"===e.read&&t.push(r.Prisma.sql`"sourceType" = 'EMAIL' AND "isRead" = 0`),"read"===e.read&&t.push(r.Prisma.sql`("sourceType" != 'EMAIL' OR "isRead" = 1)`),e.q?.trim()){let a=`%${e.q.trim()}%`;t.push(r.Prisma.sql`(
      "subject" LIKE ${a} OR
      COALESCE("recipient", '') LIKE ${a} OR
      COALESCE("customerName", '') LIKE ${a} OR
      COALESCE("invoiceNumber", '') LIKE ${a} OR
      COALESCE("bodyRef", '') LIKE ${a}
    )`)}let a=t.length?r.Prisma.sql`WHERE ${r.Prisma.join(t," AND ")}`:r.Prisma.empty,o=Math.min(Math.max("number"==typeof e.limit&&Number.isFinite(e.limit)?Math.trunc(e.limit):25,1),200),l=Number.isFinite(e.page)?Math.max(1,Math.trunc(e.page)):1,[d,u,m,p,A,S,E,h]=await Promise.all([i.prisma.$queryRaw(r.Prisma.sql`
      SELECT COUNT(*) AS "total" FROM (${c}) communications ${a}
    `),i.prisma.$queryRaw(r.Prisma.sql`
      SELECT * FROM (${c}) communications ${a}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT ${o} OFFSET ${(l-1)*o}
    `),i.prisma.$queryRaw(r.Prisma.sql`
      SELECT DISTINCT "channel" AS "channel" FROM (${c}) communications
      ORDER BY "channel"
    `),i.prisma.$queryRaw(r.Prisma.sql`
      SELECT DISTINCT "status" AS "status" FROM (${c}) communications
      WHERE "status" IS NOT NULL ORDER BY "status"
    `),i.prisma.$queryRaw(r.Prisma.sql`
      SELECT "channel", COUNT(*) AS "count" FROM (${c}) communications
      GROUP BY "channel"
    `),i.prisma.$queryRaw(r.Prisma.sql`
      SELECT DISTINCT "emailType" FROM (${c}) communications
      WHERE "emailType" IS NOT NULL ORDER BY "emailType"
    `),i.prisma.$queryRaw(r.Prisma.sql`
      SELECT DISTINCT "provider" FROM (${c}) communications
      WHERE "provider" IS NOT NULL ORDER BY "provider"
    `),i.prisma.$queryRaw(r.Prisma.sql`
      SELECT DISTINCT "customerId" FROM (${c}) communications
      WHERE "customerId" IS NOT NULL ORDER BY "customerId"
    `)]),R=h.length?await i.prisma.customer.findMany({where:{id:{in:h.map(({customerId:e})=>e)}},select:{id:!0,name:!0},orderBy:{name:"asc"}}):[],N=Number(d[0]?.total||0),I=Math.max(1,Math.ceil(N/o)),L=Math.min(l,I);return{rows:L===l?u.map(s):await i.prisma.$queryRaw(r.Prisma.sql`
        SELECT * FROM (${c}) communications ${a}
        ORDER BY "createdAt" DESC, "id" DESC
        LIMIT ${o} OFFSET ${(L-1)*o}
      `).then(e=>e.map(s)),total:N,page:L,pageSize:o,totalPages:I,options:{channels:m.map(({channel:e})=>e),statuses:p.map(({status:e})=>e),emailTypes:S.map(({emailType:e})=>e),providers:E.map(({provider:e})=>e),customers:R},summary:{total:A.reduce((e,t)=>e+Number(t.count),0),whatsapp:Number(A.find(e=>"WHATSAPP"===e.channel)?.count||0),followUps:Number(A.find(e=>"FOLLOW_UP"===e.channel)?.count||0)}}}e.s(["getUnifiedCommunications",()=>l]),a()}catch(e){a(e)}},!1),716617,e=>e.a(async(t,a)=>{try{var r=e.i(15270),i=e.i(828424),n=e.i(494127),o=t([r,i,n]);async function s(e){let{rows:t}=await (0,n.getUnifiedCommunications)({customerId:e.customerId,orderId:e.orderId,limit:e.limit});return t.map(e=>({id:e.id,direction:e.direction,channel:"FOLLOW_UP"===e.sourceType&&e.followUpAction||e.channel,recipient:e.recipient,subject:e.subject,bodyRef:e.bodyRef,status:e.status,timestamp:e.createdAt,customerId:e.customerId,customerName:e.customerName,orderId:e.orderId,invoiceNumber:e.invoiceNumber,sourceType:e.sourceType,followUpNote:e.followUpNote}))}[r,i,n]=o.then?(await o)():o,e.s(["getCommunicationTimeline",()=>s]),a()}catch(e){a(e)}},!1),809329,e=>e.a(async(t,a)=>{try{var r=e.i(89171),i=e.i(368105),n=e.i(787683),o=e.i(716617),s=t([n,o]);async function l(e){let t=await (0,i.auth)();if(!t?.user?.id)return r.NextResponse.json({error:"Unauthorized"},{status:401});if(!await (0,n.checkUserPermission)(t.user.id,n.PERMISSIONS.COMMUNICATION_VIEW))return r.NextResponse.json({error:"Forbidden"},{status:403});let a=e.nextUrl.searchParams.get("customerId")||void 0,s=e.nextUrl.searchParams.get("orderId")||void 0,l=Number(e.nextUrl.searchParams.get("limit")||50);if(!a&&!s)return r.NextResponse.json({error:"customerId or orderId is required"},{status:400});let c=await (0,o.getCommunicationTimeline)({customerId:a,orderId:s,limit:l});return r.NextResponse.json({entries:c})}[n,o]=s.then?(await s)():s,e.s(["GET",()=>l]),a()}catch(e){a(e)}},!1),547302,e=>e.a(async(t,a)=>{try{var r=e.i(747909),i=e.i(174017),n=e.i(996250),o=e.i(759756),s=e.i(561916),l=e.i(174677),c=e.i(869741),d=e.i(316795),u=e.i(487718),m=e.i(995169),p=e.i(47587),A=e.i(666012),S=e.i(570101),E=e.i(626937),h=e.i(10372),R=e.i(193695);e.i(52474);var N=e.i(600220),I=e.i(809329),L=t([I]);[I]=L.then?(await L)():L;let T=new r.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/email/communication/route",pathname:"/api/email/communication",filename:"route",bundlePath:""},distDir:".next-weekly-audit",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/email/communication/route.ts",nextConfigOutput:"",userland:I}),{workAsyncStorage:O,workUnitAsyncStorage:C,serverHooks:w}=T;function f(){return(0,n.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:C})}async function y(e,t,a){T.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/api/email/communication/route";r=r.replace(/\/index$/,"")||"/";let n=await T.prepare(e,t,{srcPage:r,multiZoneDraftMode:!1});if(!n)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:I,params:L,nextConfig:f,parsedUrl:y,isDraftMode:O,prerenderManifest:C,routerServerContext:w,isOnDemandRevalidate:v,revalidateOnlyGenerated:P,resolvedPathname:U,clientReferenceManifest:b,serverActionsManifest:g}=n,q=(0,c.normalizeAppPath)(r),$=!!(C.dynamicRoutes[q]||C.routes[U]),M=async()=>((null==w?void 0:w.render404)?await w.render404(e,t,y,!1):t.end("This page could not be found"),null);if($&&!O){let e=!!C.routes[U],t=C.dynamicRoutes[q];if(t&&!1===t.fallback&&!e){if(f.experimental.adapterPath)return await M();throw new R.NoFallbackError}}let x=null;!$||T.isDev||O||(x=U,x="/index"===x?"/":x);let F=!0===T.isDev||!$,D=$&&!F;g&&b&&(0,l.setManifestsSingleton)({page:r,clientReferenceManifest:b,serverActionsManifest:g});let H=e.method||"GET",W=(0,s.getTracer)(),_=W.getActiveScopeSpan(),j={params:L,prerenderManifest:C,renderOpts:{experimental:{authInterrupts:!!f.experimental.authInterrupts},cacheComponents:!!f.cacheComponents,supportsDynamicResponse:F,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:f.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,i)=>T.onRequestError(e,t,r,i,w)},sharedContext:{buildId:I}},B=new d.NodeNextRequest(e),k=new d.NodeNextResponse(t),K=u.NextRequestAdapter.fromNodeNextRequest(B,(0,u.signalFromNodeResponse)(t));try{let n=async e=>T.handle(K,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=W.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=a.get("next.route");if(i){let t=`${H} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${r}`)}),l=!!(0,o.getRequestMeta)(e,"minimalMode"),c=async o=>{var s,c;let d=async({previousCacheEntry:i})=>{try{if(!l&&v&&P&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await n(o);e.fetchMetrics=j.renderOpts.fetchMetrics;let s=j.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let c=j.renderOpts.collectedTags;if(!$)return await (0,A.sendResponse)(B,k,r,j.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,S.toNodeOutgoingHttpHeaders)(r.headers);c&&(t[h.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,i=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:N.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:i}}}}catch(t){throw(null==i?void 0:i.isStale)&&await T.onRequestError(e,t,{routerKind:"App Router",routePath:r,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:v})},!1,w),t}},u=await T.handleResponse({req:e,nextConfig:f,cacheKey:x,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:C,isRoutePPREnabled:!1,isOnDemandRevalidate:v,revalidateOnlyGenerated:P,responseGenerator:d,waitUntil:a.waitUntil,isMinimalMode:l});if(!$)return null;if((null==u||null==(s=u.value)?void 0:s.kind)!==N.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(c=u.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});l||t.setHeader("x-nextjs-cache",v?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,S.fromNodeOutgoingHttpHeaders)(u.value.headers);return l&&$||m.delete(h.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,E.getCacheControlHeader)(u.cacheControl)),await (0,A.sendResponse)(B,k,new Response(u.value.body,{headers:m,status:u.value.status||200})),null};_?await c(_):await W.withPropagatedContext(e.headers,()=>W.trace(m.BaseServerSpan.handleRequest,{spanName:`${H} ${r}`,kind:s.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},c))}catch(t){if(t instanceof R.NoFallbackError||await T.onRequestError(e,t,{routerKind:"App Router",routePath:q,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:v})},!1,w),$)throw t;return await (0,A.sendResponse)(B,k,new Response(null,{status:500})),null}}e.s(["handler",()=>y,"patchFetch",()=>f,"routeModule",()=>T,"serverHooks",()=>w,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>C]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_cc44a829._.js.map