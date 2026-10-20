module.exports=[673432,(a,b,c)=>{"use strict";var d,e,f,g,h=Object.defineProperty,i=Object.getOwnPropertyDescriptor,j=Object.getOwnPropertyNames,k=Object.prototype.hasOwnProperty,l=(a,b)=>{for(var c in b)h(a,c,{get:b[c],enumerable:!0})},m={};l(m,{Debug:()=>X,clearLogs:()=>Z,default:()=>$,getLogs:()=>Y}),b.exports=((a,b,c,d)=>{if(b&&"object"==typeof b||"function"==typeof b)for(let e of j(b))k.call(a,e)||e===c||h(a,e,{get:()=>b[e],enumerable:!(d=i(b,e))||d.enumerable});return a})(h({},"__esModule",{value:!0}),m);var n={};l(n,{$:()=>p,bgBlack:()=>J,bgBlue:()=>N,bgCyan:()=>P,bgGreen:()=>L,bgMagenta:()=>O,bgRed:()=>K,bgWhite:()=>Q,bgYellow:()=>M,black:()=>z,blue:()=>D,bold:()=>s,cyan:()=>F,dim:()=>t,gray:()=>H,green:()=>B,grey:()=>I,hidden:()=>x,inverse:()=>w,italic:()=>u,magenta:()=>E,red:()=>A,reset:()=>r,strikethrough:()=>y,underline:()=>v,white:()=>G,yellow:()=>C});var o=!0;"u">typeof process&&({FORCE_COLOR:d,NODE_DISABLE_COLORS:e,NO_COLOR:f,TERM:g}=process.env||{},o=process.stdout&&process.stdout.isTTY);var p={enabled:!e&&null==f&&"dumb"!==g&&(null!=d&&"0"!==d||o)};function q(a,b){let c=RegExp(`\\x1b\\[${b}m`,"g"),d=`\x1b[${a}m`,e=`\x1b[${b}m`;return function(a){return p.enabled&&null!=a?d+(~(""+a).indexOf(e)?a.replace(c,e+d):a)+e:a}}var r=q(0,0),s=q(1,22),t=q(2,22),u=q(3,23),v=q(4,24),w=q(7,27),x=q(8,28),y=q(9,29),z=q(30,39),A=q(31,39),B=q(32,39),C=q(33,39),D=q(34,39),E=q(35,39),F=q(36,39),G=q(37,39),H=q(90,39),I=q(90,39),J=q(40,49),K=q(41,49),L=q(42,49),M=q(43,49),N=q(44,49),O=q(45,49),P=q(46,49),Q=q(47,49),R=["green","yellow","blue","magenta","cyan","red"],S=[],T=Date.now(),U=0,V="u">typeof process?process.env:{};globalThis.DEBUG??=V.DEBUG??"",globalThis.DEBUG_COLORS??=!V.DEBUG_COLORS||"true"===V.DEBUG_COLORS;var W={enable(a){"string"==typeof a&&(globalThis.DEBUG=a)},disable(){let a=globalThis.DEBUG;return globalThis.DEBUG="",a},enabled(a){let b=globalThis.DEBUG.split(",").map(a=>a.replace(/[.+?^${}()|[\]\\]/g,"\\$&")),c=b.some(b=>""!==b&&"-"!==b[0]&&a.match(RegExp(b.split("*").join(".*")+"$"))),d=b.some(b=>""!==b&&"-"===b[0]&&a.match(RegExp(b.slice(1).split("*").join(".*")+"$")));return c&&!d},log:(...a)=>{let[b,c,...d]=a;(console.warn??console.log)(`${b} ${c}`,...d)},formatters:{}},X=new Proxy(function(a){let b={color:R[U++%R.length],enabled:W.enabled(a),namespace:a,log:W.log,extend:()=>{}};return new Proxy((...a)=>{let{enabled:c,namespace:d,color:e,log:f}=b;if(0!==a.length&&S.push([d,...a]),S.length>100&&S.shift(),W.enabled(d)||c){let b=a.map(a=>"string"==typeof a?a:function(a,b=2){let c=new Set;return JSON.stringify(a,(a,b)=>{if("object"==typeof b&&null!==b){if(c.has(b))return"[Circular *]";c.add(b)}else if("bigint"==typeof b)return b.toString();return b},b)}(a)),c=`+${Date.now()-T}ms`;T=Date.now(),globalThis.DEBUG_COLORS?f(n[e](s(d)),...b,n[e](c)):f(d,...b,c)}},{get:(a,c)=>b[c],set:(a,c,d)=>b[c]=d})},{get:(a,b)=>W[b],set:(a,b,c)=>W[b]=c});function Y(a=7500){let b=S.map(([a,...b])=>`${a} ${b.map(a=>"string"==typeof a?a:JSON.stringify(a)).join(" ")}`).join("\n");return b.length<a?b:b.slice(-a)}function Z(){S.length=0}var $=X},828641,a=>{"use strict";var b=a.i(673432);function c(a){return{ok:!0,value:a,map:b=>c(b(a)),flatMap:b=>b(a)}}Error("timeout while waiting for mutex to become available"),Error("mutex already locked");let d=Error("request for lock canceled");class e{constructor(a,b=d){this._value=a,this._cancelError=b,this._queue=[],this._weightedWaiters=[]}acquire(a=1,b=0){if(a<=0)throw Error(`invalid weight ${a}: must be positive`);return new Promise((c,d)=>{let e={resolve:c,reject:d,weight:a,priority:b},g=f(this._queue,a=>b<=a.priority);-1===g&&a<=this._value?this._dispatchItem(e):this._queue.splice(g+1,0,e)})}runExclusive(a){var b,c,d,e;return b=this,c=arguments,d=void 0,e=function*(a,b=1,c=0){let[d,e]=yield this.acquire(b,c);try{return yield a(d)}finally{e()}},new(d||(d=Promise))(function(a,f){function g(a){try{i(e.next(a))}catch(a){f(a)}}function h(a){try{i(e.throw(a))}catch(a){f(a)}}function i(b){var c;b.done?a(b.value):((c=b.value)instanceof d?c:new d(function(a){a(c)})).then(g,h)}i((e=e.apply(b,c||[])).next())})}waitForUnlock(a=1,b=0){if(a<=0)throw Error(`invalid weight ${a}: must be positive`);return this._couldLockImmediately(a,b)?Promise.resolve():new Promise(c=>{var d,e;let g;this._weightedWaiters[a-1]||(this._weightedWaiters[a-1]=[]),d=this._weightedWaiters[a-1],e={resolve:c,priority:b},g=f(d,a=>e.priority<=a.priority),d.splice(g+1,0,e)})}isLocked(){return this._value<=0}getValue(){return this._value}setValue(a){this._value=a,this._dispatchQueue()}release(a=1){if(a<=0)throw Error(`invalid weight ${a}: must be positive`);this._value+=a,this._dispatchQueue()}cancel(){this._queue.forEach(a=>a.reject(this._cancelError)),this._queue=[]}_dispatchQueue(){for(this._drainUnlockWaiters();this._queue.length>0&&this._queue[0].weight<=this._value;)this._dispatchItem(this._queue.shift()),this._drainUnlockWaiters()}_dispatchItem(a){let b=this._value;this._value-=a.weight,a.resolve([b,this._newReleaser(a.weight)])}_newReleaser(a){let b=!1;return()=>{b||(b=!0,this.release(a))}}_drainUnlockWaiters(){if(0===this._queue.length)for(let a=this._value;a>0;a--){let b=this._weightedWaiters[a-1];b&&(b.forEach(a=>a.resolve()),this._weightedWaiters[a-1]=[])}else{let a=this._queue[0].priority;for(let b=this._value;b>0;b--){let c=this._weightedWaiters[b-1];if(!c)continue;let d=c.findIndex(b=>b.priority<=a);(-1===d?c:c.splice(0,d)).forEach(a=>a.resolve())}}}_couldLockImmediately(a,b){return(0===this._queue.length||this._queue[0].priority<b)&&a<=this._value}}function f(a,b){for(let c=a.length-1;c>=0;c--)if(b(a[c]))return c;return -1}class g{constructor(a){this._semaphore=new e(1,a)}acquire(){var a,b,c,d;return a=this,b=arguments,c=void 0,d=function*(a=0){let[,b]=yield this._semaphore.acquire(1,a);return b},new(c||(c=Promise))(function(e,f){function g(a){try{i(d.next(a))}catch(a){f(a)}}function h(a){try{i(d.throw(a))}catch(a){f(a)}}function i(a){var b;a.done?e(a.value):((b=a.value)instanceof c?b:new c(function(a){a(b)})).then(g,h)}i((d=d.apply(a,b||[])).next())})}runExclusive(a,b=0){return this._semaphore.runExclusive(()=>a(),1,b)}isLocked(){return this._semaphore.isLocked()}waitForUnlock(a=0){return this._semaphore.waitForUnlock(1,a)}release(){this._semaphore.isLocked()&&this._semaphore.release()}cancel(){return this._semaphore.cancel()}}var h=(0,b.Debug)("prisma:driver-adapter:libsql:conversion"),i=class extends Error{constructor(a){const b=typeof a;super(`unexpected value of type ${b}: ${"object"===b?JSON.stringify(a):String(a)}`),this.name="UnexpectedTypeError"}},j=(0,b.Debug)("prisma:driver-adapter:libsql"),k=Symbol(),l=class{constructor(a){this.client=a,this.provider="sqlite",this.adapterName="@prisma/adapter-libsql",this[k]=new g}async queryRaw(a){return j("[js::query_raw] %O",a),(await this.performIO(a)).map(({columns:a,rows:b,columnTypes:c})=>{let d=function(a,b){let c,[d,e]=(c=new Set,[a.map((a,b)=>{let d=function(a){switch(a.toUpperCase()){case"":return null;case"DECIMAL":return 4;case"FLOAT":return 2;case"DOUBLE":case"DOUBLE PRECISION":case"NUMERIC":case"REAL":return 3;case"TINYINT":case"SMALLINT":case"MEDIUMINT":case"INT":case"INTEGER":case"SERIAL":case"INT2":return 0;case"BIGINT":case"UNSIGNED BIG INT":case"INT8":return 1;case"DATETIME":case"TIMESTAMP":return 10;case"TIME":return 9;case"DATE":return 8;case"TEXT":case"CLOB":case"CHARACTER":case"VARCHAR":case"VARYING CHARACTER":case"NCHAR":case"NATIVE CHARACTER":case"NVARCHAR":return 7;case"BLOB":return 13;case"BOOLEAN":return 5;default:return h("unknown decltype:",a),null}}(a);return null===d&&c.add(b),d}),c]);if(0===e.size)return d;a:for(let a of e){for(let c=0;c<b.length;c++){let e=b[c][a];if(null!==e){d[a]=function(a){switch(typeof a){case"string":return 7;case"bigint":return 1;case"boolean":return 5;case"number":return 128;case"object":var b=a;if(b instanceof ArrayBuffer)return 13;throw new i(b);default:throw new i(a)}}(e);continue a}}d[a]=0}return d}(c,b);return{columnNames:a,columnTypes:d,rows:b.map(a=>(function(a,b){let c=Array.from(a);for(let a=0;a<c.length;a++){let d=c[a];if(d instanceof ArrayBuffer){c[a]=Array.from(new Uint8Array(d));continue}if("number"==typeof d&&(0===b[a]||1===b[a])&&!Number.isInteger(d)){c[a]=Math.trunc(d);continue}if(["number","bigint"].includes(typeof d)&&10===b[a]){c[a]=new Date(Number(d)).toISOString();continue}if("bigint"==typeof d){c[a]=d.toString();continue}}return c})(a,d))}})}async executeRaw(a){return j("[js::execute_raw] %O",a),(await this.performIO(a)).map(({rowsAffected:a})=>a??0)}async performIO(a){let b=await this[k].acquire();try{let b=await this.client.execute(a);return c(b)}catch(b){j("Error in performIO: %O",b);let a=b.rawCode??b.cause?.rawCode;if("number"==typeof a)return function a(b){return{ok:!1,error:b,map:()=>a(b),flatMap:()=>a(b)}}({kind:"Sqlite",extendedCode:a,message:b.message});throw b}finally{b()}}},m=class extends l{constructor(a,b,c){super(a),this.options=b,this.unlockParent=c}async commit(){j("[js::commit]");try{await this.client.commit()}finally{this.unlockParent()}return c(void 0)}async rollback(){j("[js::rollback]");try{await this.client.rollback()}catch(a){j("error in rollback:",a)}finally{this.unlockParent()}return c(void 0)}},n=class extends l{constructor(a,b){super(a),this.client=a,this.release=b}async startTransaction(){let a={usePhantomQuery:!0};j("%s options: %O","[js::startTransaction]",a);try{let b=await this.client.transaction("deferred");return c(new m(b,a,this.release))}catch(a){throw this.release(),a}}},o=class extends l{constructor(a){super(a)}async transactionContext(){let a=await this[k].acquire();return c(new n(this.client,a))}};a.s(["PrismaLibSQL",()=>o],828641)},945185,(a,b,c)=>{let d=a.r(522734),e=a.r(814747),f=a.r(446786),g=a.r(254799),h=a.r(180490).version,i=["🔐 encrypt with Dotenvx: https://dotenvx.com","🔐 prevent committing .env to code: https://dotenvx.com/precommit","🔐 prevent building .env in docker: https://dotenvx.com/prebuild","📡 add observability to secrets: https://dotenvx.com/ops","👥 sync secrets across teammates & machines: https://dotenvx.com/ops","🗂️ backup and recover secrets: https://dotenvx.com/ops","✅ audit secrets and track compliance: https://dotenvx.com/ops","🔄 add secrets lifecycle management: https://dotenvx.com/ops","🔑 add access controls to secrets: https://dotenvx.com/ops","🛠️  run anywhere with `dotenvx run -- yourcommand`","⚙️  specify custom .env file path with { path: '/custom/path/.env' }","⚙️  enable debug logging with { debug: true }","⚙️  override existing env vars with { override: true }","⚙️  suppress all logs with { quiet: true }","⚙️  write to custom object with { processEnv: myObject }","⚙️  load multiple .env files with { path: ['.env.local', '.env'] }"];function j(a){return"string"==typeof a?!["false","0","no","off",""].includes(a.toLowerCase()):!!a}let k=/(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;function l(a){console.log(`[dotenv@${h}][DEBUG] ${a}`)}function m(a){console.log(`[dotenv@${h}] ${a}`)}function n(a){return a&&a.DOTENV_KEY&&a.DOTENV_KEY.length>0?a.DOTENV_KEY:process.env.DOTENV_KEY&&process.env.DOTENV_KEY.length>0?process.env.DOTENV_KEY:""}function o(a){let b=null;if(a&&a.path&&a.path.length>0)if(Array.isArray(a.path))for(let c of a.path)d.existsSync(c)&&(b=c.endsWith(".vault")?c:`${c}.vault`);else b=a.path.endsWith(".vault")?a.path:`${a.path}.vault`;else b=e.resolve(process.cwd(),".env.vault");return d.existsSync(b)?b:null}function p(a){return"~"===a[0]?e.join(f.homedir(),a.slice(1)):a}let q={configDotenv:function(a){let b,c=e.resolve(process.cwd(),".env"),f="utf8",g=process.env;a&&null!=a.processEnv&&(g=a.processEnv);let h=j(g.DOTENV_CONFIG_DEBUG||a&&a.debug),k=j(g.DOTENV_CONFIG_QUIET||a&&a.quiet);a&&a.encoding?f=a.encoding:h&&l("No encoding is specified. UTF-8 is used by default");let n=[c];if(a&&a.path)if(Array.isArray(a.path))for(let b of(n=[],a.path))n.push(p(b));else n=[p(a.path)];let o={};for(let c of n)try{let b=q.parse(d.readFileSync(c,{encoding:f}));q.populate(o,b,a)}catch(a){h&&l(`Failed to load ${c} ${a.message}`),b=a}let r=q.populate(g,o,a);if(h=j(g.DOTENV_CONFIG_DEBUG||h),k=j(g.DOTENV_CONFIG_QUIET||k),h||!k){var s;let a=Object.keys(r).length,c=[];for(let a of n)try{let b=e.relative(process.cwd(),a);c.push(b)}catch(c){h&&l(`Failed to load ${a} ${c.message}`),b=c}m(`injecting env (${a}) from ${c.join(",")} ${(s=`-- tip: ${i[Math.floor(Math.random()*i.length)]}`,process.stdout.isTTY?`\x1b[2m${s}\x1b[0m`:s)}`)}return b?{parsed:o,error:b}:{parsed:o}},_configVault:function(a){let b=j(process.env.DOTENV_CONFIG_DEBUG||a&&a.debug),c=j(process.env.DOTENV_CONFIG_QUIET||a&&a.quiet);(b||!c)&&m("Loading env from encrypted .env.vault");let d=q._parseVault(a),e=process.env;return a&&null!=a.processEnv&&(e=a.processEnv),q.populate(e,d,a),{parsed:d}},_parseVault:function(a){let b,c=o(a=a||{});a.path=c;let d=q.configDotenv(a);if(!d.parsed){let a=Error(`MISSING_DATA: Cannot parse ${c} for an unknown reason`);throw a.code="MISSING_DATA",a}let e=n(a).split(","),f=e.length;for(let a=0;a<f;a++)try{let c=e[a].trim(),f=function(a,b){let c;try{c=new URL(b)}catch(a){if("ERR_INVALID_URL"===a.code){let a=Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");throw a.code="INVALID_DOTENV_KEY",a}throw a}let d=c.password;if(!d){let a=Error("INVALID_DOTENV_KEY: Missing key part");throw a.code="INVALID_DOTENV_KEY",a}let e=c.searchParams.get("environment");if(!e){let a=Error("INVALID_DOTENV_KEY: Missing environment part");throw a.code="INVALID_DOTENV_KEY",a}let f=`DOTENV_VAULT_${e.toUpperCase()}`,g=a.parsed[f];if(!g){let a=Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${f} in your .env.vault file.`);throw a.code="NOT_FOUND_DOTENV_ENVIRONMENT",a}return{ciphertext:g,key:d}}(d,c);b=q.decrypt(f.ciphertext,f.key);break}catch(b){if(a+1>=f)throw b}return q.parse(b)},config:function(a){if(0===n(a).length)return q.configDotenv(a);let b=o(a);if(!b){var c;return c=`You set DOTENV_KEY but you are missing a .env.vault file at ${b}. Did you forget to build it?`,console.error(`[dotenv@${h}][WARN] ${c}`),q.configDotenv(a)}return q._configVault(a)},decrypt:function(a,b){let c=Buffer.from(b.slice(-64),"hex"),d=Buffer.from(a,"base64"),e=d.subarray(0,12),f=d.subarray(-16);d=d.subarray(12,-16);try{let a=g.createDecipheriv("aes-256-gcm",c,e);return a.setAuthTag(f),`${a.update(d)}${a.final()}`}catch(d){let a=d instanceof RangeError,b="Invalid key length"===d.message,c="Unsupported state or unable to authenticate data"===d.message;if(a||b){let a=Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");throw a.code="INVALID_DOTENV_KEY",a}if(c){let a=Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");throw a.code="DECRYPTION_FAILED",a}throw d}},parse:function(a){let b,c={},d=a.toString();for(d=d.replace(/\r\n?/mg,"\n");null!=(b=k.exec(d));){let a=b[1],d=b[2]||"",e=(d=d.trim())[0];d=d.replace(/^(['"`])([\s\S]*)\1$/mg,"$2"),'"'===e&&(d=(d=d.replace(/\\n/g,"\n")).replace(/\\r/g,"\r")),c[a]=d}return c},populate:function(a,b,c={}){let d=!!(c&&c.debug),e=!!(c&&c.override),f={};if("object"!=typeof b){let a=Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");throw a.code="OBJECT_REQUIRED",a}for(let c of Object.keys(b))Object.prototype.hasOwnProperty.call(a,c)?(!0===e&&(a[c]=b[c],f[c]=b[c]),d&&(!0===e?l(`"${c}" is already defined and WAS overwritten`):l(`"${c}" is already defined and was NOT overwritten`))):(a[c]=b[c],f[c]=b[c]);return f}};b.exports.configDotenv=q.configDotenv,b.exports._configVault=q._configVault,b.exports._parseVault=q._parseVault,b.exports.config=q.config,b.exports.decrypt=q.decrypt,b.exports.parse=q.parse,b.exports.populate=q.populate,b.exports=q},231191,a=>a.a(async(b,c)=>{try{let F;var d=a.i(463021),e=a.i(828641),f=a.i(418520),g=b([f]);if([f]=g.then?(await g)():g,!process.env.DATABASE_URL)try{let{config:b}=a.r(945185);b({path:".env.local"}),b({path:".env"})}catch{}let G=process.env.DATABASE_URL||"file:./dev.db",H=process.env.TURSO_DATABASE_URL||process.env.TURSO_URL||"";process.env.DATABASE_URL;let I=a.g,J=!!H||G.startsWith("libsql:")||G.startsWith("https:"),K=J?(()=>{let a=H||G,{url:b,authToken:c}=function(a){let[b,c=""]=(a.startsWith("https://")?a.replace(/^https:\/\//,"libsql://"):a).split("?"),d=new URLSearchParams(c).get("authToken")??process.env.TURSO_AUTH_TOKEN??process.env.TURSO_TOKEN??void 0;return{url:b,authToken:d}}(a);return(0,f.createClient)({url:b,authToken:c})})():null,L=K?new e.PrismaLibSQL(K):null,M=I.prisma??(F={log:["error","warn"]},J&&L?F.adapter=L:F.datasources={db:{url:G}},new d.PrismaClient(F));async function h(a,b){if(!a.length)return!0;if(!K)return!1;try{return await K.batch(a.map(a=>"string"==typeof a?{sql:a,args:[]}:{sql:a.sql,args:a.args??[]}),b),!0}catch{return!1}}async function i(a){if(a.length&&!await h(a,"write"))for(let b of a)try{"string"==typeof b?await M.$executeRawUnsafe(b):await M.$executeRawUnsafe(b.sql,...b.args??[])}catch{}}async function j(a){if(!a.length)return[];if(K)try{return(await K.batch(a.map(a=>({sql:a,args:[]})),"read")).map(a=>a.rows)}catch{}let b=[];for(let c of a)try{b.push(await M.$queryRawUnsafe(c))}catch{b.push([])}return b}async function k(a){let b=Array.from(new Set(a.map(([a])=>a))),c=await j(b.map(a=>`PRAGMA table_info("${a}")`)),d=new Map;b.forEach((a,b)=>{d.set(a,new Set((c[b]||[]).map(a=>a.name)))});let e=new Set;for(let[b,c]of a)d.get(b)?.has(c)||e.add(`${b}.${c}`);return e}function l(a,b){let c=[];for(let[d,e,f]of a)b.has(`${d}.${e}`)&&c.push(`ALTER TABLE "${d}" ADD COLUMN ${f};`);return c}let N=null,O=null,P=!1,Q=!1,R=null;async function m(){if(!Q)return P&&R?R:(P=!0,R=(async()=>{try{await i(['CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status")','CREATE INDEX IF NOT EXISTS "Quotation_status_validUntil_idx" ON "Quotation"("status", "validUntil")','CREATE INDEX IF NOT EXISTS "Quotation_status_createdAt_idx" ON "Quotation"("status", "createdAt")','CREATE INDEX IF NOT EXISTS "Quotation_createdAt_idx" ON "Quotation"("createdAt")','CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status")','CREATE INDEX IF NOT EXISTS "Invoice_status_paymentStatus_idx" ON "Invoice"("status", "paymentStatus")','CREATE INDEX IF NOT EXISTS "Invoice_status_paymentStatus_dueDate_idx" ON "Invoice"("status", "paymentStatus", "dueDate")','CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt")','CREATE INDEX IF NOT EXISTS "Invoice_dueDate_idx" ON "Invoice"("dueDate")','CREATE INDEX IF NOT EXISTS "Listing_status_idx" ON "Listing"("status")','CREATE INDEX IF NOT EXISTS "Listing_status_platform_idx" ON "Listing"("status", "platform")','CREATE INDEX IF NOT EXISTS "Listing_createdAt_idx" ON "Listing"("createdAt")','CREATE INDEX IF NOT EXISTS "Sale_paymentStatus_idx" ON "Sale"("paymentStatus")','CREATE INDEX IF NOT EXISTS "Sale_saleDate_paymentStatus_idx" ON "Sale"("saleDate", "paymentStatus")','CREATE INDEX IF NOT EXISTS "Vendor_status_idx" ON "Vendor"("status")','CREATE INDEX IF NOT EXISTS "Expense_paymentStatus_idx" ON "Expense"("paymentStatus")'])}catch{}finally{Q=!0,P=!1,R=null}})())}let S=null,T=null;async function n(a){return S?.has(a)?!!S.get(a):(T||(T=(async()=>{try{let a=await M.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"),b=new Map;for(let c of a||[])c?.name&&b.set(String(c.name),!0);return S=b,b}catch{return S=new Map}finally{T=null}})()),!!(await T).get(a))}async function o(a){for(let b of a)if(!await n(b))return!1;return!0}async function p(){return null!==N?N:O||(O=(async()=>{try{let a=await M.$queryRawUnsafe('PRAGMA table_info("User")');return N=new Set((a||[]).map(a=>a.name)).has("roleId")}catch{return N=!1,!1}finally{O=null}})())}let U=!1,V=!1,W=null;async function q(){if(!V)return U&&W?W:(U=!0,W=(async()=>{try{if(!await p())try{await M.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "roleId" TEXT;'),N=!0}catch{N=null,await p()}}catch{}finally{V=!0,U=!1,W=null}})())}let X=!1,Y=!1,Z=null;async function r(){if(!Y)return X&&Z?Z:(X=!0,Z=(async()=>{try{await i([`CREATE TABLE IF NOT EXISTS "Role" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "isSystem" INTEGER NOT NULL DEFAULT 0,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );`,`CREATE TABLE IF NOT EXISTS "Permission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "module" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "key" TEXT NOT NULL UNIQUE,
          "description" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );`,`CREATE TABLE IF NOT EXISTS "RolePermission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "roleId" TEXT NOT NULL,
          "permissionId" TEXT NOT NULL
        );`,`CREATE TABLE IF NOT EXISTS "UserPermission" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "permissionId" TEXT NOT NULL,
          "allow" INTEGER NOT NULL
        );`,'CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId","permissionId");','CREATE UNIQUE INDEX IF NOT EXISTS "UserPermission_userId_permissionId_key" ON "UserPermission"("userId","permissionId");','CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission"("roleId");','CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");','CREATE INDEX IF NOT EXISTS "UserPermission_userId_idx" ON "UserPermission"("userId");','CREATE INDEX IF NOT EXISTS "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");'])}catch{}finally{S&&(S.set("Role",!0),S.set("Permission",!0),S.set("RolePermission",!0),S.set("UserPermission",!0)),Y=!0,X=!1,Z=null}})())}let $=!1,_=!1,aa=null;async function s(){if(!_)return $&&aa?aa:($=!0,aa=(async()=>{try{await i([`CREATE TABLE IF NOT EXISTS "ActivityLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "entityType" TEXT,
          "entityId" TEXT,
          "entityIdentifier" TEXT,
          "actionType" TEXT,
          "userId" TEXT,
          "userName" TEXT,
          "userEmail" TEXT,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "source" TEXT,
          "fieldChanges" TEXT,
          "details" TEXT,
          "module" TEXT,
          "action" TEXT,
          "referenceId" TEXT,
          "description" TEXT,
          "metadata" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`]);let a=[["ActivityLog","module",'"module" TEXT'],["ActivityLog","action",'"action" TEXT'],["ActivityLog","referenceId",'"referenceId" TEXT'],["ActivityLog","description",'"description" TEXT'],["ActivityLog","metadata",'"metadata" TEXT'],["ActivityLog","userEmail",'"userEmail" TEXT'],["ActivityLog","ipAddress",'"ipAddress" TEXT'],["ActivityLog","userAgent",'"userAgent" TEXT'],["ActivityLog","source",'"source" TEXT'],["ActivityLog","fieldChanges",'"fieldChanges" TEXT'],["ActivityLog","details",'"details" TEXT'],["ActivityLog","idempotencyKey",'"idempotencyKey" TEXT']];try{let b=await k(a.map(([a,b])=>[a,b]));await i([...l(a,b),'CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");','CREATE INDEX IF NOT EXISTS "ActivityLog_module_idx" ON "ActivityLog"("module");','CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");','CREATE INDEX IF NOT EXISTS "ActivityLog_entityId_idx" ON "ActivityLog"("entityId");','CREATE INDEX IF NOT EXISTS "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");','CREATE UNIQUE INDEX IF NOT EXISTS "ActivityLog_user_action_idempotency_key_unique" ON "ActivityLog"("userId","actionType","idempotencyKey");'])}catch{}}catch{}finally{S&&S.set("ActivityLog",!0),_=!0,$=!1,aa=null}})())}let ab=!1,ac=!1,ad=null;async function t(){if(!ac)return ab&&ad?ad:(ab=!0,ad=(async()=>{try{await i([`CREATE TABLE IF NOT EXISTS "FollowUp" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "channel" TEXT NOT NULL DEFAULT 'CALL',
          "action" TEXT,
          "note" TEXT,
          "promisedDate" DATETIME,
          "status" TEXT NOT NULL DEFAULT 'OPEN',
          "completedAt" DATETIME,
          "cancelledAt" DATETIME,
          "rescheduledTo" DATETIME,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "FollowUp_invoiceId_idx" ON "FollowUp"("invoiceId");','CREATE INDEX IF NOT EXISTS "FollowUp_createdBy_idx" ON "FollowUp"("createdBy");']);let a=[["FollowUp","channel","\"channel\" TEXT NOT NULL DEFAULT 'CALL'"],["FollowUp","status","\"status\" TEXT NOT NULL DEFAULT 'OPEN'"],["FollowUp","completedAt",'"completedAt" DATETIME'],["FollowUp","cancelledAt",'"cancelledAt" DATETIME'],["FollowUp","rescheduledTo",'"rescheduledTo" DATETIME'],["FollowUp","updatedAt",'"updatedAt" DATETIME']],b=await k(a.map(([a,b])=>[a,b]));await i([...l(a,b),'UPDATE "FollowUp" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;',`UPDATE "FollowUp" SET "channel" = UPPER("action")
         WHERE "action" IS NOT NULL AND UPPER("action") IN ('CALL', 'EMAIL', 'WHATSAPP')
           AND ("channel" IS NULL OR "channel" = 'CALL');`,'CREATE INDEX IF NOT EXISTS "FollowUp_status_date_idx" ON "FollowUp"("status", "date");'])}catch(a){console.error("[follow-up] Failed to initialize follow-up schema:",a)}finally{S&&S.set("FollowUp",!0),ac=!0,ab=!1,ad=null}})())}let ae=!1,af=!1,ag=null;async function u(){return(await k([["Invoice","invoiceType"],["Invoice","iecCode"],["Invoice","exportType"],["Invoice","countryOfDestination"],["Invoice","portOfDispatch"],["Invoice","modeOfTransport"],["Invoice","courierPartner"],["Invoice","trackingId"],["Invoice","invoiceCurrency"],["Invoice","conversionRate"],["Invoice","totalInrValue"],["CompanySettings","invoicePrefix"],["CompanySettings","invoicingStartNumber"],["CompanySettings","invoiceLogoUrl"],["CompanySettings","quotationLogoUrl"],["CompanySettings","logoUrl"],["CompanySettings","skuViewLogoUrl"],["CompanySettings","otherDocsLogoUrl"],["CompanySettings","address"],["CompanySettings","email"],["CompanySettings","phone"],["CompanySettings","website"],["CompanySettings","gstin"],["CompanySettings","enableExportInvoice"],["CompanySettings","defaultExportType"],["CompanySettings","companyIec"],["CompanySettings","defaultCurrency"],["CompanySettings","defaultPort"],["CompanySettings","swiftCode"],["CompanySettings","termsAndConditions"],["CompanySettings","createdAt"],["CompanySettings","updatedAt"],["PaymentSettings","swiftCode"]])).size>0}async function v(a=!1){if(!a){let b=await u();if(!b&&af)return;a=b}if(!af||a)return ae&&ag?ag:(ae=!0,ag=(async()=>{try{await t(),await i([`CREATE TABLE IF NOT EXISTS "Payment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "method" TEXT NOT NULL,
          "reference" TEXT,
          "notes" TEXT,
          "recordedBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");',`CREATE TABLE IF NOT EXISTS "InvoiceVersion" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "versionNumber" INTEGER NOT NULL,
          "reason" TEXT,
          "snapshot" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "InvoiceVersion_invoiceId_idx" ON "InvoiceVersion"("invoiceId");',`CREATE TABLE IF NOT EXISTS "SalesReturn" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "returnNumber" TEXT NOT NULL UNIQUE,
          "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "disposition" TEXT NOT NULL,
          "taxableAmount" REAL NOT NULL DEFAULT 0,
          "igst" REAL NOT NULL DEFAULT 0,
          "cgst" REAL NOT NULL DEFAULT 0,
          "sgst" REAL NOT NULL DEFAULT 0,
          "totalTax" REAL NOT NULL DEFAULT 0,
          "totalAmount" REAL NOT NULL DEFAULT 0,
          "remarks" TEXT,
          "createdById" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "SalesReturn_invoiceId_idx" ON "SalesReturn"("invoiceId");',`CREATE TABLE IF NOT EXISTS "SalesReturnItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "salesReturnId" TEXT NOT NULL,
          "inventoryId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "sellingPrice" REAL NOT NULL,
          "resaleable" INTEGER NOT NULL DEFAULT 1
        );`,'CREATE INDEX IF NOT EXISTS "SalesReturnItem_salesReturnId_idx" ON "SalesReturnItem"("salesReturnId");','CREATE INDEX IF NOT EXISTS "SalesReturnItem_inventoryId_idx" ON "SalesReturnItem"("inventoryId");',`CREATE TABLE IF NOT EXISTS "CreditNote" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT,
          "invoiceId" TEXT,
          "creditNoteNumber" TEXT NOT NULL UNIQUE,
          "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "totalAmount" REAL NOT NULL,
          "taxableAmount" REAL NOT NULL DEFAULT 0,
          "igst" REAL NOT NULL DEFAULT 0,
          "cgst" REAL NOT NULL DEFAULT 0,
          "sgst" REAL NOT NULL DEFAULT 0,
          "totalTax" REAL NOT NULL DEFAULT 0,
          "balanceAmount" REAL NOT NULL,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "CreditNote_customerId_idx" ON "CreditNote"("customerId");','CREATE INDEX IF NOT EXISTS "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");']);let a=[["Invoice","invoiceType",'"invoiceType" TEXT DEFAULT "TAX"'],["Invoice","iecCode",'"iecCode" TEXT'],["Invoice","exportType",'"exportType" TEXT'],["Invoice","countryOfDestination",'"countryOfDestination" TEXT'],["Invoice","portOfDispatch",'"portOfDispatch" TEXT'],["Invoice","modeOfTransport",'"modeOfTransport" TEXT'],["Invoice","courierPartner",'"courierPartner" TEXT'],["Invoice","trackingId",'"trackingId" TEXT'],["Invoice","invoiceCurrency",'"invoiceCurrency" TEXT'],["Invoice","conversionRate",'"conversionRate" REAL'],["Invoice","totalInrValue",'"totalInrValue" REAL'],["Invoice","totalUsdValue",'"totalUsdValue" REAL'],["CompanySettings","invoicePrefix",'"invoicePrefix" TEXT'],["CompanySettings","invoicingStartNumber",'"invoicingStartNumber" INTEGER'],["CompanySettings","invoiceLogoUrl",'"invoiceLogoUrl" TEXT'],["CompanySettings","quotationLogoUrl",'"quotationLogoUrl" TEXT'],["CompanySettings","logoUrl",'"logoUrl" TEXT'],["CompanySettings","skuViewLogoUrl",'"skuViewLogoUrl" TEXT'],["CompanySettings","otherDocsLogoUrl",'"otherDocsLogoUrl" TEXT'],["CompanySettings","address",'"address" TEXT'],["CompanySettings","email",'"email" TEXT'],["CompanySettings","phone",'"phone" TEXT'],["CompanySettings","website",'"website" TEXT'],["CompanySettings","gstin",'"gstin" TEXT'],["CompanySettings","enableExportInvoice",'"enableExportInvoice" INTEGER NOT NULL DEFAULT 0'],["CompanySettings","defaultExportType",'"defaultExportType" TEXT'],["CompanySettings","companyIec",'"companyIec" TEXT'],["CompanySettings","defaultCurrency",'"defaultCurrency" TEXT'],["CompanySettings","defaultPort",'"defaultPort" TEXT'],["CompanySettings","swiftCode",'"swiftCode" TEXT'],["CompanySettings","termsAndConditions",'"termsAndConditions" TEXT'],["CompanySettings","createdAt",'"createdAt" DATETIME'],["CompanySettings","updatedAt",'"updatedAt" DATETIME'],["PaymentSettings","swiftCode",'"swiftCode" TEXT'],["InvoiceSettings","exportTerms",'"exportTerms" TEXT'],["Sale","usdPrice",'"usdPrice" REAL']],b=await k(a.map(([a,b])=>[a,b]));await i([...l(a,b),'UPDATE "CompanySettings" SET "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)','UPDATE "CompanySettings" SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)',`CREATE TABLE IF NOT EXISTS "CustomerAdvance" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT NOT NULL,
          "amount" REAL NOT NULL,
          "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
          "reference" TEXT,
          "notes" TEXT,
          "isAdjusted" INTEGER NOT NULL DEFAULT 0,
          "adjustedAmount" REAL NOT NULL DEFAULT 0,
          "remainingAmount" REAL NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "CustomerAdvance_customerId_idx" ON "CustomerAdvance"("customerId");',`CREATE TABLE IF NOT EXISTS "CustomerAdvanceAdjustment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "advanceId" TEXT NOT NULL,
          "saleId" TEXT NOT NULL,
          "amountUsed" REAL NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_advanceId_idx" ON "CustomerAdvanceAdjustment"("advanceId");','CREATE INDEX IF NOT EXISTS "CustomerAdvanceAdjustment_saleId_idx" ON "CustomerAdvanceAdjustment"("saleId");',`CREATE TABLE IF NOT EXISTS "ExportInvoice" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL UNIQUE,
          "customsDeclarationNumber" TEXT,
          "fobValue" REAL,
          "freightCharges" REAL,
          "insuranceCharges" REAL,
          "shippingBillNumber" TEXT,
          "portCode" TEXT,
          "hsnCodes" TEXT,
          "buyerReference" TEXT,
          "contractNumber" TEXT,
          "preCarriageBy" TEXT,
          "preCarriagePort" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "ExportInvoice_invoiceId_idx" ON "ExportInvoice"("invoiceId");','CREATE INDEX IF NOT EXISTS "ExportInvoice_customsDeclarationNumber_idx" ON "ExportInvoice"("customsDeclarationNumber");'])}catch{}finally{S&&["Payment","InvoiceVersion","SalesReturn","SalesReturnItem","CreditNote","CustomerAdvance","CustomerAdvanceAdjustment","ExportInvoice"].forEach(a=>S.set(a,!0)),af=!0,ae=!1,ag=null}})())}let ah=!1,ai=!1,aj=null;async function w(){if(!ai)return ah&&aj?aj:(ah=!0,aj=(async()=>{try{await i([`CREATE TABLE IF NOT EXISTS "SalesReturnReplacement" (
          "salesReturnId" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "memoId" TEXT,
          "createdBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "SalesReturnReplacement_invoiceId_idx" ON "SalesReturnReplacement"("invoiceId");'])}catch{}finally{S&&S.set("SalesReturnReplacement",!0),ai=!0,ah=!1,aj=null}})())}let ak=!1,al=!1,am=null;async function x(a,b,c){try{let d=await M.$queryRawUnsafe(`PRAGMA table_info("${a}")`);Array.isArray(d)&&d.some(a=>a.name===b)||await M.$executeRawUnsafe(`ALTER TABLE "${a}" ADD COLUMN ${c};`)}catch{}}async function y(){if(!al)return ak&&am?am:(ak=!0,am=(async()=>{try{await i([`CREATE TABLE IF NOT EXISTS "OfferBanner" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "title" TEXT NOT NULL,
          "subtitle" TEXT,
          "imageUrl" TEXT,
          "ctaText" TEXT,
          "ctaLink" TEXT,
          "displayOn" TEXT NOT NULL DEFAULT 'invoice',
          "audienceFilter" TEXT NOT NULL DEFAULT 'all',
          "priority" INTEGER NOT NULL DEFAULT 0,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "startDate" DATETIME,
          "endDate" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "OfferBanner_displayOn_idx" ON "OfferBanner"("displayOn");','CREATE INDEX IF NOT EXISTS "OfferBanner_isActive_idx" ON "OfferBanner"("isActive");',`CREATE TABLE IF NOT EXISTS "Coupon" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "code" TEXT NOT NULL UNIQUE,
          "type" TEXT NOT NULL,
          "value" REAL NOT NULL,
          "maxDiscount" REAL,
          "minInvoiceAmount" REAL,
          "validFrom" DATETIME,
          "validTo" DATETIME,
          "usageLimitTotal" INTEGER,
          "usageLimitPerCustomer" INTEGER,
          "applicableScope" TEXT NOT NULL DEFAULT 'all',
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "Coupon_code_idx" ON "Coupon"("code");','CREATE INDEX IF NOT EXISTS "Coupon_isActive_idx" ON "Coupon"("isActive");',`CREATE TABLE IF NOT EXISTS "CouponRedemption" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "couponId" TEXT NOT NULL,
          "invoiceId" TEXT,
          "customerId" TEXT,
          "discountAmount" REAL NOT NULL DEFAULT 0,
          "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");','CREATE INDEX IF NOT EXISTS "CouponRedemption_invoiceId_idx" ON "CouponRedemption"("invoiceId");','CREATE INDEX IF NOT EXISTS "CouponRedemption_customerId_idx" ON "CouponRedemption"("customerId");',`CREATE TABLE IF NOT EXISTS "LoyaltyLedger" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT NOT NULL,
          "invoiceId" TEXT,
          "type" TEXT NOT NULL,
          "points" REAL NOT NULL DEFAULT 0,
          "rupeeValue" REAL NOT NULL DEFAULT 0,
          "remarks" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "LoyaltyLedger_customerId_idx" ON "LoyaltyLedger"("customerId");','CREATE INDEX IF NOT EXISTS "LoyaltyLedger_invoiceId_idx" ON "LoyaltyLedger"("invoiceId");',`CREATE TABLE IF NOT EXISTS "MessageTemplate" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "key" TEXT NOT NULL UNIQUE,
          "title" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "channel" TEXT NOT NULL DEFAULT 'WHATSAPP_WEB',
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,`CREATE TABLE IF NOT EXISTS "CustomerCampaignLog" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "customerId" TEXT NOT NULL,
          "eventType" TEXT NOT NULL,
          "channel" TEXT NOT NULL,
          "templateKey" TEXT,
          "payload" TEXT,
          "status" TEXT NOT NULL,
          "openedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "CustomerCampaignLog_customerId_idx" ON "CustomerCampaignLog"("customerId");','CREATE INDEX IF NOT EXISTS "CustomerCampaignLog_eventType_idx" ON "CustomerCampaignLog"("eventType");',`CREATE TABLE IF NOT EXISTS "CustomerProfileExtra" (
          "customerId" TEXT NOT NULL PRIMARY KEY,
          "dateOfBirth" DATETIME,
          "anniversaryDate" DATETIME,
          "communicationOptIn" INTEGER NOT NULL DEFAULT 1,
          "preferredLanguage" TEXT,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,`CREATE TABLE IF NOT EXISTS "InvoicePromotionSettings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "dobRewardAmount" REAL NOT NULL DEFAULT 0,
          "anniversaryRewardAmount" REAL NOT NULL DEFAULT 0,
          "enableReviewCta" INTEGER NOT NULL DEFAULT 1,
          "enableReferralCta" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,`CREATE TABLE IF NOT EXISTS "LoyaltySettings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "pointsPerRupee" REAL NOT NULL DEFAULT 0.01,
          "redeemRupeePerPoint" REAL NOT NULL DEFAULT 1,
          "minRedeemPoints" REAL NOT NULL DEFAULT 0,
          "maxRedeemPercent" REAL NOT NULL DEFAULT 30,
          "dobProfilePoints" REAL NOT NULL DEFAULT 0,
          "anniversaryProfilePoints" REAL NOT NULL DEFAULT 0,
          "expiryDays" INTEGER,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`]);let a=[["Customer","stateCode",'"stateCode" TEXT'],["Customer","countryCode",'"countryCode" TEXT'],["Customer","isInternational",'"isInternational" INTEGER NOT NULL DEFAULT 0'],["Invoice","invoiceType",'"invoiceType" TEXT DEFAULT "TAX"'],["Invoice","iecCode",'"iecCode" TEXT'],["Invoice","exportType",'"exportType" TEXT'],["Invoice","countryOfDestination",'"countryOfDestination" TEXT'],["Invoice","portOfDispatch",'"portOfDispatch" TEXT'],["Invoice","modeOfTransport",'"modeOfTransport" TEXT'],["Invoice","courierPartner",'"courierPartner" TEXT'],["Invoice","trackingId",'"trackingId" TEXT'],["Invoice","invoiceCurrency",'"invoiceCurrency" TEXT'],["Invoice","conversionRate",'"conversionRate" REAL'],["Invoice","totalInrValue",'"totalInrValue" REAL'],["Customer","dateOfBirth",'"dateOfBirth" DATETIME'],["Customer","anniversaryDate",'"anniversaryDate" DATETIME'],["Customer","communicationOptIn",'"communicationOptIn" INTEGER NOT NULL DEFAULT 1'],["Customer","preferredLanguage",'"preferredLanguage" TEXT'],["CustomerCampaignLog","launchedById",'"launchedById" TEXT'],["CustomerCampaignLog","invoiceId",'"invoiceId" TEXT'],["LoyaltySettings","dobProfilePoints",'"dobProfilePoints" REAL NOT NULL DEFAULT 0'],["LoyaltySettings","anniversaryProfilePoints",'"anniversaryProfilePoints" REAL NOT NULL DEFAULT 0'],["CouponRedemption","discountAmount",'"discountAmount" REAL NOT NULL DEFAULT 0'],["CouponRedemption","redeemedAt",'"redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP']],b=await k(a.map(([a,b])=>[a,b]));await i(l(a,b));try{await M.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerCampaignLog_invoiceId_idx" ON "CustomerCampaignLog"("invoiceId")')}catch(a){console.error("[schema] Could not create the WhatsApp invoice index:",a)}}catch{}finally{S&&["OfferBanner","Coupon","CouponRedemption","LoyaltyLedger","MessageTemplate","CustomerCampaignLog","CustomerProfileExtra","InvoicePromotionSettings","LoyaltySettings"].forEach(a=>S.set(a,!0)),al=!0,ak=!1,am=null}})())}let an=!1,ao=!1,ap=null;async function z(){if(!ao)return an&&ap?ap:(an=!0,ap=(async()=>{try{let a=[["User","avatarUrl",'"avatarUrl" TEXT'],["User","avatarHistory","\"avatarHistory\" TEXT DEFAULT '[]'"]],b=await k(a.map(([a,b])=>[a,b]));await i([...l(a,b),`CREATE TABLE IF NOT EXISTS "WhatsNewEntry" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "message" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`])}catch{}finally{ao=!0,an=!1,ap=null}})())}let aq=!1,ar=!1,as=null;async function A(){if(!ar)return aq&&as?as:(aq=!0,as=(async()=>{try{await x("User","themePreference","\"themePreference\" TEXT DEFAULT 'default'")}catch{}finally{ar=!0,aq=!1,as=null}})())}let at=!1,au=!1,av=null;async function B(){if(!au)return at&&av?av:(at=!0,av=(async()=>{try{await x("User","premiumMode",'"premiumMode" INTEGER DEFAULT 0')}catch{}finally{au=!0,at=!1,av=null}})())}let aw=!1,ax=!1,ay=null;async function C(){if(!ax)return aw&&ay?ay:(aw=!0,ay=(async()=>{try{await M.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "expiresAt" DATETIME NOT NULL,
          "used" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(()=>null)}catch{}finally{ax=!0,aw=!1,ay=null}})())}let az=!1,aA=!1,aB=null;async function D(){if(!aA)return az&&aB?aB:(az=!0,aB=(async()=>{try{await i([`CREATE TABLE IF NOT EXISTS "ListingMetricSnapshot" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "inventoryId" TEXT NOT NULL,
          "marketplace" TEXT NOT NULL,
          "externalId" TEXT NOT NULL,
          "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "views" INTEGER NOT NULL DEFAULT 0,
          "watches" INTEGER NOT NULL DEFAULT 0,
          "favourites" INTEGER NOT NULL DEFAULT 0,
          "orders" INTEGER NOT NULL DEFAULT 0,
          "revenue" REAL NOT NULL DEFAULT 0,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "rawPayload" TEXT,
          "source" TEXT NOT NULL,
          CONSTRAINT "ListingMetricSnapshot_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );`,`CREATE TABLE IF NOT EXISTS "ListingOpportunity" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "inventoryId" TEXT NOT NULL,
          "marketplace" TEXT NOT NULL,
          "externalId" TEXT,
          "currentViews" INTEGER NOT NULL DEFAULT 0,
          "currentWatches" INTEGER NOT NULL DEFAULT 0,
          "currentFavourites" INTEGER NOT NULL DEFAULT 0,
          "currentOrders" INTEGER NOT NULL DEFAULT 0,
          "currentRevenue" REAL NOT NULL DEFAULT 0,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "lastSyncedAt" DATETIME,
          "updatedAt" DATETIME NOT NULL
        );`,'DROP INDEX IF EXISTS "ListingOpportunity_inventoryId_key";','CREATE UNIQUE INDEX IF NOT EXISTS "ListingOpportunity_inventoryId_marketplace_key" ON "ListingOpportunity"("inventoryId", "marketplace");','CREATE INDEX IF NOT EXISTS "ListingMetricSnapshot_inventoryId_capturedAt_idx" ON "ListingMetricSnapshot"("inventoryId", "capturedAt");','CREATE INDEX IF NOT EXISTS "ListingMetricSnapshot_marketplace_capturedAt_idx" ON "ListingMetricSnapshot"("marketplace", "capturedAt");','CREATE UNIQUE INDEX IF NOT EXISTS "ListingMetricSnapshot_inventoryId_marketplace_externalId_capt_key" ON "ListingMetricSnapshot"("inventoryId", "marketplace", "externalId", "capturedAt");','CREATE INDEX IF NOT EXISTS "ListingOpportunity_marketplace_externalId_idx" ON "ListingOpportunity"("marketplace", "externalId");','CREATE INDEX IF NOT EXISTS "ListingOpportunity_lastSyncedAt_idx" ON "ListingOpportunity"("lastSyncedAt");'])}catch{}finally{S&&(S.set("ListingMetricSnapshot",!0),S.set("ListingOpportunity",!0)),aA=!0,az=!1,aB=null}})())}let aC=!1,aD=!1,aE=null;async function E(){if(!aD)return aC&&aE?aE:(aC=!0,aE=(async()=>{try{let a=[];for(let b of["internalShippingCost","internalPackagingCost","internalInsuranceCost","internalHandlingCost","internalOtherCharges","internalCostTotal"])a.push(["Invoice",b,`"${b}" REAL NOT NULL DEFAULT 0`]),a.push(["Sale",b,`"${b}" REAL NOT NULL DEFAULT 0`]);a.push(["Sale","actualProfit",'"actualProfit" REAL']);let b=await k(a.map(([a,b])=>[a,b])),c=[["SHOPIFY","Shopify","USD",0,0],["ETSY","Etsy","USD",1,0],["EBAY","eBay","USD",0,0],["AMAZON","Amazon","USD",0,0],["WEBSITE","Website","INR",0,0],["WHOLESALE","Wholesale","INR",0,0],["OFFLINE","Offline Sales","INR",0,0]].map(([a,b,c,d,e])=>({sql:`INSERT OR IGNORE INTO "MarketplaceProfile" ("id", "name", "displayName", "currency", "isActive", "isDefault", "marginType", "marginValue", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, 1, ?, 'PERCENT', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,args:[crypto.randomUUID(),a,b,c,d,e]})),d=[["INR",1,1],["USD",0,0],["EUR",0,0],["GBP",0,0],["AUD",0,0],["CAD",0,0],["SGD",0,0],["AED",0,0],["JPY",0,0],["CHF",0,0],["CNY",0,0],["HKD",0,0],["NZD",0,0],["SAR",0,0],["QAR",0,0],["KWD",0,0],["ZAR",0,0],["THB",0,0],["MYR",0,0]].map(([a,b,c])=>({sql:`INSERT OR IGNORE INTO "CurrencyRate" ("id", "code", "rateToInr", "isBase", "updatedAt")
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,args:[crypto.randomUUID(),a,b,c]}));await i([`CREATE TABLE IF NOT EXISTS "MarketplaceProfile" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "displayName" TEXT NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'INR',
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "isDefault" INTEGER NOT NULL DEFAULT 0,
          "marginType" TEXT NOT NULL DEFAULT 'PERCENT',
          "marginValue" REAL NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceProfile_name_key" ON "MarketplaceProfile"("name");',`CREATE TABLE IF NOT EXISTS "MarketplaceCharge" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "profileId" TEXT NOT NULL,
          "chargeKey" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "enabled" INTEGER NOT NULL DEFAULT 1,
          "amountType" TEXT NOT NULL DEFAULT 'PERCENT',
          "amount" REAL NOT NULL DEFAULT 0,
          "countryCode" TEXT,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MarketplaceCharge_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "MarketplaceProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );`,'CREATE INDEX IF NOT EXISTS "MarketplaceCharge_profileId_idx" ON "MarketplaceCharge"("profileId");',`CREATE TABLE IF NOT EXISTS "CurrencyRate" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "code" TEXT NOT NULL,
          "rateToInr" REAL NOT NULL DEFAULT 0,
          "isBase" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE UNIQUE INDEX IF NOT EXISTS "CurrencyRate_code_key" ON "CurrencyRate"("code");',...l(a,b),'CREATE INDEX IF NOT EXISTS "Inventory_origin_idx" ON "Inventory"("origin");','CREATE INDEX IF NOT EXISTS "Inventory_hsnCode_idx" ON "Inventory"("hsn_code");','CREATE INDEX IF NOT EXISTS "Inventory_hideFromAttention_idx" ON "Inventory"("hideFromAttention");','CREATE INDEX IF NOT EXISTS "Inventory_status_sellingPrice_idx" ON "Inventory"("status", "sellingPrice");',...c,...d,{sql:`INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "description", "updatedAt")
         VALUES (?, 'default_marketplace', 'ETSY', 'Marketplace profile used for single-row MSP/MRP planning in the Opportunity Report', CURRENT_TIMESTAMP)`,args:[crypto.randomUUID()]},{sql:`INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "description", "updatedAt")
         VALUES (?, 'pricing_engine_enabled', 'false', 'Enables the pricing analysis view in the Opportunity Report', CURRENT_TIMESTAMP)`,args:[crypto.randomUUID()]}])}catch(a){console.error("ensurePricingEngineSchema failed:",a)}finally{aD=!0,aC=!1,aE=null}})())}a.s(["buildAddColumnStatements",()=>l,"ensureActivityLogSchema",()=>s,"ensureAvatarWhatsNewSchema",()=>z,"ensureBillfreePhase1Schema",()=>y,"ensureFollowUpSchema",()=>t,"ensureInvoiceSupportSchema",()=>v,"ensureMarketplaceMetricsSchema",()=>D,"ensurePasswordResetSchema",()=>C,"ensurePerformanceIndexes",()=>m,"ensurePremiumModeSchema",()=>B,"ensurePricingEngineSchema",()=>E,"ensureRbacSchema",()=>r,"ensureSalesReturnReplacementSchema",()=>w,"ensureUserRoleIdColumn",()=>q,"ensureUserThemeSchema",()=>A,"executeDdlBatch",()=>i,"executeReadBatch",()=>j,"getMissingColumns",()=>k,"hasTable",()=>n,"hasTables",()=>o,"hasUserRoleIdColumn",()=>p,"prisma",0,M]),c()}catch(a){c(a)}},!1)];

//# sourceMappingURL=_2a3ddbd1._.js.map