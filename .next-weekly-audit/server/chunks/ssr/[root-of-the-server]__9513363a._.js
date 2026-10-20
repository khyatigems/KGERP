module.exports=[193695,(a,b,c)=>{b.exports=a.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},709094,a=>{a.n(a.i(359310))},70864,a=>{a.n(a.i(233290))},43619,a=>{a.n(a.i(379962))},13718,a=>{a.n(a.i(685523))},118198,a=>{a.n(a.i(545518))},262212,a=>{a.n(a.i(866114))},370809,a=>{a.n(a.i(503605))},32705,a=>{a.n(a.i(688770))},386124,a=>{a.n(a.i(734462))},268624,a=>{"use strict";let b={amp:"&",apos:"'",bull:"•",copy:"©",deg:"°",divide:"÷",euro:"€",hellip:"…",gt:">",ldquo:"“",lsquo:"‘",lt:"<",mdash:"—",ndash:"–",nbsp:" ",pound:"£",quot:'"',rdquo:"”",reg:"®",rsquo:"’",trade:"™",yen:"¥"};function c(a){return a.replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,"").replace(/<\s*br\s*\/?>/gi,"\n").replace(/<\/\s*(?:p|div|li|tr|h[1-6]|blockquote)\s*>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(a,c)=>{if("#"===c[0]){let b=c[1]?.toLowerCase()==="x",d=Number.parseInt(c.slice(b?2:1),b?16:10);if(!Number.isFinite(d)||d<0||d>1114111)return a;try{return String.fromCodePoint(d)}catch{return a}}return b[c.toLowerCase()]??a}).replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim()}a.s(["htmlToPlainText",()=>c])},236193,a=>{"use strict";a.s(["websiteEnquiryTemplate",0,{key:"email_website_enquiry_acknowledgement",title:"Website enquiry acknowledgement",subject:"We received your enquiry — {{company_name}}",htmlBody:"<p>Dear {{customer_name}},</p><p>Thank you for contacting {{company_name}}. Your enquiry has been received and saved for our team to review.</p><p><strong>Reference:</strong> {{enquiry_reference}}<br/><strong>Subject:</strong> {{enquiry_subject}}</p><p>We will respond after reviewing your message. This acknowledgement does not confirm a purchase or gemstone assessment.</p><p>Kind regards,<br/>KhyatiGems</p>",plainTextBody:"Dear {{customer_name}},\n\nThank you for contacting {{company_name}}. Your enquiry has been received and saved for our team to review.\n\nReference: {{enquiry_reference}}\nSubject: {{enquiry_subject}}\n\nWe will respond after reviewing your message. This acknowledgement does not confirm a purchase or gemstone assessment.\n\nKind regards,\nKhyatiGems"}])},479443,a=>a.a(async(b,c)=>{try{var d=a.i(236193),e=a.i(254799),f=a.i(231191),g=a.i(820938),h=b([f,g]);[f,g]=h.then?(await h)():h;let o=[d.websiteEnquiryTemplate,{key:"email_invoice",title:"Invoice Email",subject:"Your Invoice {{invoice_number}} from {{company_name}}",htmlBody:'<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for your purchase on {{purchase_date}}. Please find your invoice <strong>{{invoice_number}}</strong> attached for your records.</p><p>{{order_number_line}}</p><p>If you have any questions, reply to this email or contact us at <a href="mailto:support@khyatigems.com">support@khyatigems.com</a>.</p><p>Kind regards,<br/>KhyatiGems</p>',plainTextBody:"Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for your purchase on {{purchase_date}}. Please find your invoice {{invoice_number}} attached for your records.\n{{order_number_line}}\n\nIf you have any questions, reply to this email or contact us at support@khyatigems.com.\n\nKind regards,\nKhyatiGems"},{key:"email_certificate",title:"Certificate Email",subject:"Your Gemstone Certificate {{certificate_number}}",htmlBody:'<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for choosing KhyatiGems. We are pleased to share the certificate for your purchase made on <strong>{{purchase_date}}</strong>.</p><p>The certificate for <strong>{{gemstone_name}}</strong> (Certificate No. <strong>{{certificate_number}}</strong>) is attached to this email. Please keep the PDF with your purchase records.</p><p>{{order_number_line}}</p><p>You can also check your certificate online using the button below:</p><p style="margin:24px 0;text-align:center;"><a href="{{certificate_verification_url}}" target="_blank" style="display:inline-block;padding:14px 24px;background-color:#171717;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:700;">Verify Your Certificate Online</a></p><p>If the verification page asks for a certificate number, enter <strong>{{certificate_number}}</strong>.</p><p>If you have questions about your gemstone or certificate, reply to this email or contact us at <a href="mailto:support@khyatigems.com">support@khyatigems.com</a>. We will be happy to assist.</p><p>Thank you for your trust in KhyatiGems.</p><p>Kind regards,<br/>KhyatiGems</p>',plainTextBody:"Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for choosing KhyatiGems. We are pleased to share the certificate for your purchase made on {{purchase_date}}.\n\nThe certificate for {{gemstone_name}} (Certificate No. {{certificate_number}}) is attached to this email. Please keep the PDF with your purchase records.\n{{order_number_line}}\n\nYou can also verify your certificate online at:\n{{certificate_verification_url}}\n\nIf the verification page asks for a certificate number, enter {{certificate_number}}.\n\nIf you have questions about your gemstone or certificate, reply to this email or contact us at support@khyatigems.com. We will be happy to assist.\n\nThank you for your trust in KhyatiGems.\n\nKind regards,\nKhyatiGems"},{key:"email_certificate_invoice",title:"Certificate + Invoice Email",subject:"Your Invoice {{invoice_number}} and Certificate from {{company_name}}",htmlBody:'<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for choosing KhyatiGems. This email contains the documents for your purchase made on <strong>{{purchase_date}}</strong>.</p><p>Attached for your records are:</p><ul><li>Invoice <strong>{{invoice_number}}</strong></li><li>Certificate No. <strong>{{certificate_number}}</strong> for <strong>{{gemstone_name}}</strong></li></ul><p>{{order_number_line}}</p><p>For your convenience, you can check the certificate online using the button below:</p><p style="margin:24px 0;text-align:center;"><a href="{{certificate_verification_url}}" target="_blank" style="display:inline-block;padding:14px 24px;background-color:#171717;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:700;">Verify Your Certificate Online</a></p><p>If the verification page asks for a certificate number, enter <strong>{{certificate_number}}</strong>.</p><p>Please retain the attached invoice and certificate for your records. If you need assistance with your purchase or certificate, reply to this email or contact us at <a href="mailto:support@khyatigems.com">support@khyatigems.com</a>.</p><p>Thank you for your trust in KhyatiGems.</p><p>Kind regards,<br/>KhyatiGems</p>',plainTextBody:"Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for choosing KhyatiGems. This email contains the documents for your purchase made on {{purchase_date}}.\n\nAttached for your records are:\n- Invoice {{invoice_number}}\n- Certificate No. {{certificate_number}} for {{gemstone_name}}\n{{order_number_line}}\n\nFor your convenience, you can verify the certificate online at:\n{{certificate_verification_url}}\n\nIf the verification page asks for a certificate number, enter {{certificate_number}}.\n\nPlease retain the attached invoice and certificate for your records. If you need assistance with your purchase or certificate, reply to this email or contact us at support@khyatigems.com.\n\nThank you for your trust in KhyatiGems.\n\nKind regards,\nKhyatiGems"}],p=[{key:"email_certificate",subject:"Your Gemstone Certificate {{certificate_number}}",html:'<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for your purchase on {{purchase_date}}. Please find the certificate <strong>{{certificate_number}}</strong> for {{gemstone_name}} attached for your records.</p><p>{{order_number_line}}</p><p>If you have any questions, reply to this email or contact us at <a href="mailto:support@khyatigems.com">support@khyatigems.com</a>.</p><p>Kind regards,<br/>KhyatiGems</p>',text:"Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for your purchase on {{purchase_date}}. Please find the certificate {{certificate_number}} for {{gemstone_name}} attached for your records.\n{{order_number_line}}\n\nIf you have any questions, reply to this email or contact us at support@khyatigems.com.\n\nKind regards,\nKhyatiGems"},{key:"email_certificate_invoice",subject:"Your Invoice {{invoice_number}} and Certificate from {{company_name}}",html:'<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for your purchase on {{purchase_date}}. Please find your invoice <strong>{{invoice_number}}</strong> and certificate <strong>{{certificate_number}}</strong> for {{gemstone_name}} attached for your records.</p><p>{{order_number_line}}</p><p>If you have any questions, reply to this email or contact us at <a href="mailto:support@khyatigems.com">support@khyatigems.com</a>.</p><p>Kind regards,<br/>KhyatiGems</p>',text:"Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for your purchase on {{purchase_date}}. Please find your invoice {{invoice_number}} and certificate {{certificate_number}} for {{gemstone_name}} attached for your records.\n{{order_number_line}}\n\nIf you have any questions, reply to this email or contact us at support@khyatigems.com.\n\nKind regards,\nKhyatiGems"},{key:"email_invoice",subject:"Your Invoice {{invoice_number}} from {{company_name}}",html:"<p>Hi {{customer_name}},</p><p>Thank you for your purchase from {{company_name}} on {{purchase_date}}.</p><p>Please find invoice {{invoice_number}} attached.</p><p>{{order_number_line}}</p><p>Warm regards,<br/>Team {{company_name}}</p>",text:"Hi {{customer_name}},\n\nThank you for your purchase from {{company_name}} on {{purchase_date}}.\n\nPlease find invoice {{invoice_number}} attached.\n{{order_number_line}}\n\nWarm regards,\nTeam {{company_name}}"},{key:"email_certificate",subject:"Your Gemstone Certificate {{certificate_number}}",html:"<p>Hi {{customer_name}},</p><p>Thank you for your purchase from {{company_name}} on {{purchase_date}}.</p><p>Please find the certificate {{certificate_number}} for {{gemstone_name}} attached.</p><p>{{order_number_line}}</p><p>Warm regards,<br/>Team {{company_name}}</p>",text:"Hi {{customer_name}},\n\nThank you for your purchase from {{company_name}} on {{purchase_date}}.\n\nPlease find the certificate {{certificate_number}} for {{gemstone_name}} attached.\n{{order_number_line}}\n\nWarm regards,\nTeam {{company_name}}"},{key:"email_certificate_invoice",subject:"Your Invoice {{invoice_number}} and Certificate from {{company_name}}",html:"<p>Hi {{customer_name}},</p><p>Thank you for your purchase from {{company_name}} on {{purchase_date}}.</p><p>Please find your invoice {{invoice_number}} and certificate {{certificate_number}} for {{gemstone_name}} attached.</p><p>{{order_number_line}}</p><p>Warm regards,<br/>Team {{company_name}}</p>",text:"Hi {{customer_name}},\n\nThank you for your purchase from {{company_name}} on {{purchase_date}}.\n\nPlease find your invoice {{invoice_number}} and certificate {{certificate_number}} for {{gemstone_name}} attached.\n{{order_number_line}}\n\nWarm regards,\nTeam {{company_name}}"}],q=[{key:"email_invoice",subject:"Your Invoice {{invoice_number}} from {{company_name}}",html:"<p>Dear {{customer_name}},</p><p>Thank you for your order {{order_number}}. Your invoice {{invoice_number}} is attached.</p><p>Warm regards,<br/>{{company_name}}</p>",text:"Dear {{customer_name}},\n\nThank you for your order {{order_number}}. Your invoice {{invoice_number}} is attached.\n\nWarm regards,\n{{company_name}}"},{key:"email_certificate",subject:"Your Gemstone Certificate {{certificate_number}}",html:"<p>Dear {{customer_name}},</p><p>Your certificate {{certificate_number}} for {{gemstone_name}} is attached.</p><p>Warm regards,<br/>{{company_name}}</p>",text:"Dear {{customer_name}},\n\nYour certificate {{certificate_number}} for {{gemstone_name}} is attached.\n\nWarm regards,\n{{company_name}}"},{key:"email_certificate_invoice",subject:"Your Certificate & Invoice ({{order_number}})",html:"<p>Dear {{customer_name}},</p><p>Thank you for your order {{order_number}}. Your certificate {{certificate_number}} and invoice {{invoice_number}} are attached.</p><p>Warm regards,<br/>{{company_name}}</p>",text:"Dear {{customer_name}},\n\nThank you for your order {{order_number}}. Your certificate {{certificate_number}} and invoice {{invoice_number}} are attached.\n\nWarm regards,\n{{company_name}}"}];async function i(){for(let a of(await (0,f.ensureBillfreePhase1Schema)(),await (0,g.ensureMarketplaceFoundationSchema)(),o))try{for(let b of(await f.prisma.$executeRawUnsafe(`INSERT OR IGNORE INTO "MessageTemplate" ("id", "key", "title", "body", "channel", "isActive", "subject", "htmlBody", "plainTextBody", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, 'EMAIL', 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,e.default.randomUUID(),a.key,a.title,a.plainTextBody,a.subject,a.htmlBody,a.plainTextBody),[...q,...p].filter(b=>b.key===a.key)))await f.prisma.$executeRawUnsafe(`UPDATE "MessageTemplate"
           SET subject = ?, htmlBody = ?, plainTextBody = ?, body = ?, updatedAt = CURRENT_TIMESTAMP
           WHERE key = ? AND channel = 'EMAIL' AND subject = ? AND htmlBody = ? AND plainTextBody = ?`,a.subject,a.htmlBody,a.plainTextBody,a.plainTextBody,a.key,b.subject,b.html,b.text)}catch(b){console.error(`[email-templates] failed to seed ${a.key}:`,b)}}async function j(){return await i(),f.prisma.$queryRawUnsafe(`SELECT id, key, title, subject, htmlBody, plainTextBody, isActive, channel
     FROM "MessageTemplate" WHERE channel = 'EMAIL' ORDER BY createdAt DESC LIMIT 200`).catch(()=>[])}async function k(a){return await i(),(await f.prisma.$queryRawUnsafe(`SELECT id, key, title, subject, htmlBody, plainTextBody, isActive, channel
     FROM "MessageTemplate" WHERE key = ? AND channel = 'EMAIL' LIMIT 1`,a).catch(()=>[]))[0]??null}async function l(a){let b=String(a.key||"").trim().toLowerCase(),c=String(a.title||"").trim(),d=String(a.subject||"").trim();return b&&c&&d?(await (0,f.ensureBillfreePhase1Schema)(),await (0,g.ensureMarketplaceFoundationSchema)(),await f.prisma.$executeRawUnsafe(`INSERT INTO "MessageTemplate" ("id", "key", "title", "body", "channel", "isActive", "subject", "htmlBody", "plainTextBody", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, 'EMAIL', 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,e.default.randomUUID(),b,c,a.plainTextBody||"",d,a.htmlBody||null,a.plainTextBody||null),{success:!0}):{success:!1,message:"Key, title and subject are required"}}async function m(a){return(await f.prisma.$queryRawUnsafe("SELECT id FROM \"MessageTemplate\" WHERE id = ? AND channel = 'EMAIL' LIMIT 1",a.id).catch(()=>[]))[0]?(await f.prisma.$executeRawUnsafe('UPDATE "MessageTemplate" SET title = ?, subject = ?, htmlBody = ?, plainTextBody = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',a.title??null,a.subject??null,a.htmlBody??null,a.plainTextBody??null,a.id),{success:!0}):{success:!1,message:"Email template not found"}}async function n(a,b){return await (0,f.ensureBillfreePhase1Schema)(),await (0,g.ensureMarketplaceFoundationSchema)(),await f.prisma.$executeRawUnsafe('UPDATE "MessageTemplate" SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',+!!b,a),{success:!0}}a.s(["createEmailTemplate",()=>l,"getEmailTemplateByKey",()=>k,"listEmailTemplates",()=>j,"toggleEmailTemplate",()=>n,"updateEmailTemplate",()=>m]),c()}catch(a){c(a)}},!1),515764,a=>a.a(async(b,c)=>{try{var d=a.i(231191),e=b([d]);async function f(a){let b=[...new Set(a.filter(Boolean))];if(!b.length)return new Map;let c=await d.prisma.sale.findMany({where:{OR:[{invoiceId:{in:b}},{legacyInvoiceId:{in:b}}]},orderBy:{saleDate:"asc"},select:{invoiceId:!0,legacyInvoiceId:!0,orderId:!0,marketplaceOrderItemId:!0}}),e=[...new Set(c.map(a=>a.marketplaceOrderItemId).filter(a=>!!a))],f=e.length?await d.prisma.marketplaceOrderItem.findMany({where:{id:{in:e}},select:{id:!0,order:{select:{orderNumber:!0,marketplaceOrderId:!0}}}}):[],g=new Map(f.map(a=>[a.id,a.order.orderNumber?.trim()||a.order.marketplaceOrderId.trim()])),h=new Map;for(let a of c){let b=a.invoiceId||a.legacyInvoiceId;if(!b||h.has(b))continue;let c=(a.marketplaceOrderItemId?g.get(a.marketplaceOrderItemId):null)||a.orderId?.trim();c&&h.set(b,c)}return h}async function g(a){return(await f([a])).get(a)??null}[d]=e.then?(await e)():e,a.s(["getInvoiceOrderReference",()=>g,"getInvoiceOrderReferences",()=>f]),c()}catch(a){c(a)}},!1),452194,a=>a.a(async(b,c)=>{try{var d=a.i(463021),e=a.i(231191),f=a.i(820938),g=b([e,f]);function h(a){let b=null;if("WHATSAPP"===a.sourceType&&a.payload)try{let c=JSON.parse(a.payload);if(c&&"object"==typeof c&&!Array.isArray(c)){let a=c.message;b="string"==typeof a?a:null}}catch(a){console.error("[communication-center] Invalid WhatsApp message payload:",a)}return{...a,recipient:"WHATSAPP"===a.sourceType?function(a){if(!a)return null;try{let b=JSON.parse(a);if(!b||"object"!=typeof b||Array.isArray(b))return null;let c=b.phone;return"string"==typeof c?c:null}catch(a){return console.error("[communication-center] Invalid WhatsApp campaign payload:",a),null}}(a.payload??null):a.recipient,bodyRef:"WHATSAPP"===a.sourceType?b:a.bodyRef,isRead:!!a.isRead}}[e,f]=g.then?(await g)():g;let k=d.Prisma.sql`
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
`;async function i(a){await Promise.all([(0,f.ensureMarketplaceFoundationSchema)(),(0,e.ensureBillfreePhase1Schema)(),(0,e.ensureFollowUpSchema)()]);let b=[];if(a.channel&&["EMAIL","WHATSAPP","FOLLOW_UP"].includes(a.channel)&&b.push(d.Prisma.sql`"channel" = ${a.channel}`),a.direction&&["INBOUND","OUTBOUND"].includes(a.direction)&&b.push(d.Prisma.sql`"direction" = ${a.direction}`),a.status&&b.push(d.Prisma.sql`"status" = ${a.status}`),a.emailType&&b.push(d.Prisma.sql`"emailType" = ${a.emailType}`),a.customerId&&b.push(d.Prisma.sql`"customerId" = ${a.customerId}`),a.orderId&&b.push(d.Prisma.sql`"orderId" = ${a.orderId}`),a.provider&&b.push(d.Prisma.sql`"provider" = ${a.provider}`),a.from&&b.push(d.Prisma.sql`"createdAt" >= ${a.from}`),a.to&&b.push(d.Prisma.sql`"createdAt" <= ${a.to}`),"unread"===a.read&&b.push(d.Prisma.sql`"sourceType" = 'EMAIL' AND "isRead" = 0`),"read"===a.read&&b.push(d.Prisma.sql`("sourceType" != 'EMAIL' OR "isRead" = 1)`),a.q?.trim()){let c=`%${a.q.trim()}%`;b.push(d.Prisma.sql`(
      "subject" LIKE ${c} OR
      COALESCE("recipient", '') LIKE ${c} OR
      COALESCE("customerName", '') LIKE ${c} OR
      COALESCE("invoiceNumber", '') LIKE ${c} OR
      COALESCE("bodyRef", '') LIKE ${c}
    )`)}let c=b.length?d.Prisma.sql`WHERE ${d.Prisma.join(b," AND ")}`:d.Prisma.empty,g=Math.min(Math.max("number"==typeof a.limit&&Number.isFinite(a.limit)?Math.trunc(a.limit):25,1),200),i=Number.isFinite(a.page)?Math.max(1,Math.trunc(a.page)):1,[j,l,m,n,o,p,q,r]=await Promise.all([e.prisma.$queryRaw(d.Prisma.sql`
      SELECT COUNT(*) AS "total" FROM (${k}) communications ${c}
    `),e.prisma.$queryRaw(d.Prisma.sql`
      SELECT * FROM (${k}) communications ${c}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT ${g} OFFSET ${(i-1)*g}
    `),e.prisma.$queryRaw(d.Prisma.sql`
      SELECT DISTINCT "channel" AS "channel" FROM (${k}) communications
      ORDER BY "channel"
    `),e.prisma.$queryRaw(d.Prisma.sql`
      SELECT DISTINCT "status" AS "status" FROM (${k}) communications
      WHERE "status" IS NOT NULL ORDER BY "status"
    `),e.prisma.$queryRaw(d.Prisma.sql`
      SELECT "channel", COUNT(*) AS "count" FROM (${k}) communications
      GROUP BY "channel"
    `),e.prisma.$queryRaw(d.Prisma.sql`
      SELECT DISTINCT "emailType" FROM (${k}) communications
      WHERE "emailType" IS NOT NULL ORDER BY "emailType"
    `),e.prisma.$queryRaw(d.Prisma.sql`
      SELECT DISTINCT "provider" FROM (${k}) communications
      WHERE "provider" IS NOT NULL ORDER BY "provider"
    `),e.prisma.$queryRaw(d.Prisma.sql`
      SELECT DISTINCT "customerId" FROM (${k}) communications
      WHERE "customerId" IS NOT NULL ORDER BY "customerId"
    `)]),s=r.length?await e.prisma.customer.findMany({where:{id:{in:r.map(({customerId:a})=>a)}},select:{id:!0,name:!0},orderBy:{name:"asc"}}):[],t=Number(j[0]?.total||0),u=Math.max(1,Math.ceil(t/g)),v=Math.min(i,u);return{rows:v===i?l.map(h):await e.prisma.$queryRaw(d.Prisma.sql`
        SELECT * FROM (${k}) communications ${c}
        ORDER BY "createdAt" DESC, "id" DESC
        LIMIT ${g} OFFSET ${(v-1)*g}
      `).then(a=>a.map(h)),total:t,page:v,pageSize:g,totalPages:u,options:{channels:m.map(({channel:a})=>a),statuses:n.map(({status:a})=>a),emailTypes:p.map(({emailType:a})=>a),providers:q.map(({provider:a})=>a),customers:s},summary:{total:o.reduce((a,b)=>a+Number(b.count),0),whatsapp:Number(o.find(a=>"WHATSAPP"===a.channel)?.count||0),followUps:Number(o.find(a=>"FOLLOW_UP"===a.channel)?.count||0)}}}async function j(a){if(await Promise.all([(0,e.ensureBillfreePhase1Schema)(),(0,e.ensureFollowUpSchema)()]),a.startsWith("whatsapp:")){let b=a.slice(9),c=(await e.prisma.$queryRaw(d.Prisma.sql`
      SELECT w."id", w."customerId", c."name" AS "customerName", w."eventType",
        w."channel", w."templateKey", w."payload", w."status", w."createdAt",
        w."launchedById", u."name" AS "launchedByName",
        w."invoiceId", i."invoiceNumber"
      FROM "CustomerCampaignLog" w
      LEFT JOIN "Customer" c ON c."id" = w."customerId"
      LEFT JOIN "User" u ON u."id" = w."launchedById"
      LEFT JOIN "Invoice" i ON i."id" = w."invoiceId"
      WHERE w."id" = ${b} AND w."channel" LIKE 'WHATSAPP%'
      LIMIT 1
    `))[0];if(!c)return null;let f=null,g=null;if(c.payload)try{let a=JSON.parse(c.payload);a&&"object"==typeof a&&!Array.isArray(a)&&(f="string"==typeof a.message?a.message:null,g="string"==typeof a.phone?a.phone:null)}catch(a){console.error("[communication-detail] Invalid WhatsApp payload:",a)}return{id:a,sourceId:c.id,sourceType:"WHATSAPP",channel:"WHATSAPP",customerId:c.customerId,customerName:c.customerName,subject:c.eventType,status:c.status,provider:"WhatsApp Web · manual handoff",templateKey:c.templateKey,createdAt:c.createdAt,phone:g,message:f,launchedById:c.launchedById,createdByName:c.launchedByName,invoiceId:c.invoiceId,invoiceNumber:c.invoiceNumber}}if(a.startsWith("followup:")){let b=a.slice(9),c=await e.prisma.followUp.findUnique({where:{id:b},include:{invoice:{select:{id:!0,invoiceNumber:!0,sales:{take:1,orderBy:{saleDate:"asc"},select:{customer:{select:{id:!0,name:!0}}}}}},createdBy:{select:{name:!0}}}});if(!c)return null;let d=c.invoice.sales[0]?.customer??null;return{id:a,sourceId:c.id,sourceType:"FOLLOW_UP",channel:c.channel,customerId:d?.id??null,customerName:d?.name??null,subject:c.action||`${c.channel} follow-up`,status:c.status,provider:null,templateKey:null,createdAt:c.date,phone:null,message:c.note,launchedById:c.createdById,invoiceId:c.invoice.id,invoiceNumber:c.invoice.invoiceNumber,completedAt:c.completedAt,cancelledAt:c.cancelledAt,promisedDate:c.promisedDate,rescheduledTo:c.rescheduledTo,createdByName:c.createdBy?.name??null}}return null}a.s(["getUnifiedCommunicationDetail",()=>j,"getUnifiedCommunications",()=>i]),c()}catch(a){c(a)}},!1),189477,a=>a.a(async(b,c)=>{try{var d=a.i(231191),e=a.i(820938),f=a.i(452194),g=b([d,e,f]);async function h(a){await Promise.all([(0,e.ensureMarketplaceFoundationSchema)(),(0,d.ensureActivityLogSchema)()]);let b=await d.prisma.emailLog.findUnique({where:{id:a}});if(!b)return null;let[c,f,g,h,i]=await Promise.all([b.customerId?d.prisma.customer.findUnique({where:{id:b.customerId},select:{id:!0,name:!0}}):null,b.orderId?d.prisma.invoice.findUnique({where:{id:b.orderId},select:{id:!0,invoiceNumber:!0}}):null,d.prisma.emailLog.findMany({where:b.threadId?{threadId:b.threadId}:{id:b.id},orderBy:{createdAt:"asc"}}),d.prisma.emailProviderEvent.findMany({where:{communicationId:b.id},orderBy:{occurredAt:"asc"}}),d.prisma.activityLog.findMany({where:{OR:[{module:"communication",referenceId:b.id},{entityType:"EmailLog",entityId:b.id}]},orderBy:{createdAt:"desc"},take:50,select:{id:!0,action:!0,actionType:!0,userName:!0,userEmail:!0,createdAt:!0,fieldChanges:!0}})]);return{...b,customer:c,invoice:f,conversation:g,providerEvents:h,auditEvents:i}}[d,e,f]=g.then?(await g)():g,a.s(["getCommunicationDetail",()=>h]),c()}catch(a){c(a)}},!1),841199,a=>{"use strict";a.s(["CommunicationComposer",()=>b]);let b=(0,a.i(211857).registerClientReference)(function(){throw Error("Attempted to call CommunicationComposer() from the server but CommunicationComposer is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/components/communication/communication-composer.tsx <module evaluation>","CommunicationComposer")},556091,a=>{"use strict";a.s(["CommunicationComposer",()=>b]);let b=(0,a.i(211857).registerClientReference)(function(){throw Error("Attempted to call CommunicationComposer() from the server but CommunicationComposer is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/components/communication/communication-composer.tsx","CommunicationComposer")},100450,a=>{"use strict";a.i(841199);var b=a.i(556091);a.n(b)},658764,a=>a.a(async(b,c)=>{try{var d=a.i(907997);a.i(570396);var e=a.i(673727),f=a.i(100450),g=a.i(409223),h=a.i(189477),i=a.i(479443),j=a.i(231191),k=a.i(302316),l=a.i(268624),m=a.i(182248),n=a.i(515764),o=b([h,i,j,k,n]);async function p({searchParams:a}){let b=await (0,g.auth)();b?.user?.id||(0,e.redirect)("/login"),await (0,k.checkUserPermission)(b.user.id,k.PERMISSIONS.COMMUNICATION_MANAGE)||(0,e.redirect)("/");let c=await a,[o,p,q,r]=await Promise.all([j.prisma.customer.findMany({where:{email:{not:null}},select:{id:!0,name:!0,email:!0},orderBy:{name:"asc"},take:500}),j.prisma.invoice.findMany({select:{id:!0,invoiceNumber:!0,quotationId:!0,createdAt:!0,sales:{take:1,orderBy:{saleDate:"asc"},select:{saleDate:!0}}},orderBy:{createdAt:"desc"},take:500}),(0,i.listEmailTemplates)(),c.reply?(0,h.getCommunicationDetail)(c.reply):null]),s=await (0,n.getInvoiceOrderReferences)(p.map(a=>a.id)),t=p.map(a=>({id:a.id,invoiceNumber:a.invoiceNumber,quotationId:a.quotationId,orderNumber:s.get(a.id)||"",purchaseDate:(0,m.formatDate)(a.sales[0]?.saleDate||a.createdAt)})),u=r?.id,v="forward"===c.mode?"forward":"replyAll"===c.mode?"replyAll":"reply",w=r?.direction==="INBOUND"?r.recipient.match(/<([^>]+)>/)?.[1]||r.recipient:r?.recipient||"",x=r&&"forward"!==v?w:"",y=r?`${"forward"===v?"Fwd: ":"Re: "}${r.subject.replace(/^(?:(?:re|fwd):\s*)+/i,"")}`:"",z=r?[...function(a){if(!a)return[];try{let b=JSON.parse(a);return Array.isArray(b)?b.filter(a=>"string"==typeof a):[]}catch(a){return console.error("[communication-compose] Invalid thread references:",a),[]}}(r.referencesJson),...r.messageId?[r.messageId]:[]].slice(-20):[],A=r?r.bodyText||(r.bodyHtml?(0,l.htmlToPlainText)(r.bodyHtml):r.bodyRef||""):"",B=r&&"forward"===v?`

---------- Forwarded message ----------
From: ${r.recipient}
Subject: ${r.subject}

${A}`:r?`

On ${(0,m.formatMarketplaceDateTime)(r.receivedAt||r.createdAt)}, ${r.recipient} wrote:
${A.split(/\r?\n/).map(a=>`> ${a}`).join("\n")}`:"";return(0,d.jsx)("div",{className:"p-6",children:(0,d.jsx)(f.CommunicationComposer,{customers:o,invoices:t,templates:q.filter(a=>1===a.isActive),initial:{to:x,cc:"replyAll"===v&&r?.cc||"",subject:y,body:B,customerId:r?.customerId||"",orderId:r?.orderId||"",attachInvoice:!1,threadId:r?.threadId||r?.id||"",inReplyTo:r?.messageId||"",references:z,sourceId:u||"",mode:v}})})}[h,i,j,k,n]=o.then?(await o)():o,a.s(["default",()=>p,"dynamic",0,"force-dynamic","metadata",0,{title:"Compose Email",robots:{index:!1,follow:!1}}]),c()}catch(a){c(a)}},!1)];

//# sourceMappingURL=%5Broot-of-the-server%5D__9513363a._.js.map