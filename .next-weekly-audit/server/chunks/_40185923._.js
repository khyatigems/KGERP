module.exports=[45671,(e,t,n)=>{"use strict";var T,r,i,a,E=Object.defineProperty,o=Object.getOwnPropertyDescriptor,s=Object.getOwnPropertyNames,c=Object.prototype.hasOwnProperty,N=(e,t)=>{for(var n in t)E(e,n,{get:t[n],enumerable:!0})},l={};N(l,{Debug:()=>W,clearLogs:()=>J,default:()=>z,getLogs:()=>H}),t.exports=((e,t,n,T)=>{if(t&&"object"==typeof t||"function"==typeof t)for(let r of s(t))c.call(e,r)||r===n||E(e,r,{get:()=>t[r],enumerable:!(T=o(t,r))||T.enumerable});return e})(E({},"__esModule",{value:!0}),l);var u={};N(u,{$:()=>I,bgBlack:()=>w,bgBlue:()=>B,bgCyan:()=>k,bgGreen:()=>x,bgMagenta:()=>Y,bgRed:()=>P,bgWhite:()=>G,bgYellow:()=>b,black:()=>D,blue:()=>h,bold:()=>p,cyan:()=>v,dim:()=>U,gray:()=>F,green:()=>g,grey:()=>M,hidden:()=>y,inverse:()=>m,italic:()=>O,magenta:()=>X,red:()=>f,reset:()=>A,strikethrough:()=>S,underline:()=>R,white:()=>_,yellow:()=>C});var L=!0;"u">typeof process&&({FORCE_COLOR:T,NODE_DISABLE_COLORS:r,NO_COLOR:i,TERM:a}=process.env||{},L=process.stdout&&process.stdout.isTTY);var I={enabled:!r&&null==i&&"dumb"!==a&&(null!=T&&"0"!==T||L)};function d(e,t){let n=RegExp(`\\x1b\\[${t}m`,"g"),T=`\x1b[${e}m`,r=`\x1b[${t}m`;return function(e){return I.enabled&&null!=e?T+(~(""+e).indexOf(r)?e.replace(n,r+T):e)+r:e}}var A=d(0,0),p=d(1,22),U=d(2,22),O=d(3,23),R=d(4,24),m=d(7,27),y=d(8,28),S=d(9,29),D=d(30,39),f=d(31,39),g=d(32,39),C=d(33,39),h=d(34,39),X=d(35,39),v=d(36,39),_=d(37,39),F=d(90,39),M=d(90,39),w=d(40,49),P=d(41,49),x=d(42,49),b=d(43,49),B=d(44,49),Y=d(45,49),k=d(46,49),G=d(47,49),V=["green","yellow","blue","magenta","cyan","red"],$=[],K=Date.now(),q=0,j="u">typeof process?process.env:{};globalThis.DEBUG??=j.DEBUG??"",globalThis.DEBUG_COLORS??=!j.DEBUG_COLORS||"true"===j.DEBUG_COLORS;var Q={enable(e){"string"==typeof e&&(globalThis.DEBUG=e)},disable(){let e=globalThis.DEBUG;return globalThis.DEBUG="",e},enabled(e){let t=globalThis.DEBUG.split(",").map(e=>e.replace(/[.+?^${}()|[\]\\]/g,"\\$&")),n=t.some(t=>""!==t&&"-"!==t[0]&&e.match(RegExp(t.split("*").join(".*")+"$"))),T=t.some(t=>""!==t&&"-"===t[0]&&e.match(RegExp(t.slice(1).split("*").join(".*")+"$")));return n&&!T},log:(...e)=>{let[t,n,...T]=e;(console.warn??console.log)(`${t} ${n}`,...T)},formatters:{}},W=new Proxy(function(e){let t={color:V[q++%V.length],enabled:Q.enabled(e),namespace:e,log:Q.log,extend:()=>{}};return new Proxy((...e)=>{let{enabled:n,namespace:T,color:r,log:i}=t;if(0!==e.length&&$.push([T,...e]),$.length>100&&$.shift(),Q.enabled(T)||n){let t=e.map(e=>"string"==typeof e?e:function(e,t=2){let n=new Set;return JSON.stringify(e,(e,t)=>{if("object"==typeof t&&null!==t){if(n.has(t))return"[Circular *]";n.add(t)}else if("bigint"==typeof t)return t.toString();return t},t)}(e)),n=`+${Date.now()-K}ms`;K=Date.now(),globalThis.DEBUG_COLORS?i(u[r](p(T)),...t,u[r](n)):i(T,...t,n)}},{get:(e,n)=>t[n],set:(e,n,T)=>t[n]=T})},{get:(e,t)=>Q[t],set:(e,t,n)=>Q[t]=n});function H(e=7500){let t=$.map(([e,...t])=>`${e} ${t.map(e=>"string"==typeof e?e:JSON.stringify(e)).join(" ")}`).join("\n");return t.length<e?t:t.slice(-e)}function J(){$.length=0}var z=W},694254,e=>{"use strict";var t=e.i(45671);function n(e){return{ok:!0,value:e,map:t=>n(t(e)),flatMap:t=>t(e)}}Error("timeout while waiting for mutex to become available"),Error("mutex already locked");let T=Error("request for lock canceled");class r{constructor(e,t=T){this._value=e,this._cancelError=t,this._queue=[],this._weightedWaiters=[]}acquire(e=1,t=0){if(e<=0)throw Error(`invalid weight ${e}: must be positive`);return new Promise((n,T)=>{let r={resolve:n,reject:T,weight:e,priority:t},a=i(this._queue,e=>t<=e.priority);-1===a&&e<=this._value?this._dispatchItem(r):this._queue.splice(a+1,0,r)})}runExclusive(e){var t,n,T,r;return t=this,n=arguments,T=void 0,r=function*(e,t=1,n=0){let[T,r]=yield this.acquire(t,n);try{return yield e(T)}finally{r()}},new(T||(T=Promise))(function(e,i){function a(e){try{o(r.next(e))}catch(e){i(e)}}function E(e){try{o(r.throw(e))}catch(e){i(e)}}function o(t){var n;t.done?e(t.value):((n=t.value)instanceof T?n:new T(function(e){e(n)})).then(a,E)}o((r=r.apply(t,n||[])).next())})}waitForUnlock(e=1,t=0){if(e<=0)throw Error(`invalid weight ${e}: must be positive`);return this._couldLockImmediately(e,t)?Promise.resolve():new Promise(n=>{var T,r;let a;this._weightedWaiters[e-1]||(this._weightedWaiters[e-1]=[]),T=this._weightedWaiters[e-1],r={resolve:n,priority:t},a=i(T,e=>r.priority<=e.priority),T.splice(a+1,0,r)})}isLocked(){return this._value<=0}getValue(){return this._value}setValue(e){this._value=e,this._dispatchQueue()}release(e=1){if(e<=0)throw Error(`invalid weight ${e}: must be positive`);this._value+=e,this._dispatchQueue()}cancel(){this._queue.forEach(e=>e.reject(this._cancelError)),this._queue=[]}_dispatchQueue(){for(this._drainUnlockWaiters();this._queue.length>0&&this._queue[0].weight<=this._value;)this._dispatchItem(this._queue.shift()),this._drainUnlockWaiters()}_dispatchItem(e){let t=this._value;this._value-=e.weight,e.resolve([t,this._newReleaser(e.weight)])}_newReleaser(e){let t=!1;return()=>{t||(t=!0,this.release(e))}}_drainUnlockWaiters(){if(0===this._queue.length)for(let e=this._value;e>0;e--){let t=this._weightedWaiters[e-1];t&&(t.forEach(e=>e.resolve()),this._weightedWaiters[e-1]=[])}else{let e=this._queue[0].priority;for(let t=this._value;t>0;t--){let n=this._weightedWaiters[t-1];if(!n)continue;let T=n.findIndex(t=>t.priority<=e);(-1===T?n:n.splice(0,T)).forEach(e=>e.resolve())}}}_couldLockImmediately(e,t){return(0===this._queue.length||this._queue[0].priority<t)&&e<=this._value}}function i(e,t){for(let n=e.length-1;n>=0;n--)if(t(e[n]))return n;return -1}class a{constructor(e){this._semaphore=new r(1,e)}acquire(){var e,t,n,T;return e=this,t=arguments,n=void 0,T=function*(e=0){let[,t]=yield this._semaphore.acquire(1,e);return t},new(n||(n=Promise))(function(r,i){function a(e){try{o(T.next(e))}catch(e){i(e)}}function E(e){try{o(T.throw(e))}catch(e){i(e)}}function o(e){var t;e.done?r(e.value):((t=e.value)instanceof n?t:new n(function(e){e(t)})).then(a,E)}o((T=T.apply(e,t||[])).next())})}runExclusive(e,t=0){return this._semaphore.runExclusive(()=>e(),1,t)}isLocked(){return this._semaphore.isLocked()}waitForUnlock(e=0){return this._semaphore.waitForUnlock(1,e)}release(){this._semaphore.isLocked()&&this._semaphore.release()}cancel(){return this._semaphore.cancel()}}var E=(0,t.Debug)("prisma:driver-adapter:libsql:conversion"),o=class extends Error{constructor(e){const t=typeof e;super(`unexpected value of type ${t}: ${"object"===t?JSON.stringify(e):String(e)}`),this.name="UnexpectedTypeError"}},s=(0,t.Debug)("prisma:driver-adapter:libsql"),c=Symbol(),N=class{constructor(e){this.client=e,this.provider="sqlite",this.adapterName="@prisma/adapter-libsql",this[c]=new a}async queryRaw(e){return s("[js::query_raw] %O",e),(await this.performIO(e)).map(({columns:e,rows:t,columnTypes:n})=>{let T=function(e,t){let n,[T,r]=(n=new Set,[e.map((e,t)=>{let T=function(e){switch(e.toUpperCase()){case"":return null;case"DECIMAL":return 4;case"FLOAT":return 2;case"DOUBLE":case"DOUBLE PRECISION":case"NUMERIC":case"REAL":return 3;case"TINYINT":case"SMALLINT":case"MEDIUMINT":case"INT":case"INTEGER":case"SERIAL":case"INT2":return 0;case"BIGINT":case"UNSIGNED BIG INT":case"INT8":return 1;case"DATETIME":case"TIMESTAMP":return 10;case"TIME":return 9;case"DATE":return 8;case"TEXT":case"CLOB":case"CHARACTER":case"VARCHAR":case"VARYING CHARACTER":case"NCHAR":case"NATIVE CHARACTER":case"NVARCHAR":return 7;case"BLOB":return 13;case"BOOLEAN":return 5;default:return E("unknown decltype:",e),null}}(e);return null===T&&n.add(t),T}),n]);if(0===r.size)return T;e:for(let e of r){for(let n=0;n<t.length;n++){let r=t[n][e];if(null!==r){T[e]=function(e){switch(typeof e){case"string":return 7;case"bigint":return 1;case"boolean":return 5;case"number":return 128;case"object":var t=e;if(t instanceof ArrayBuffer)return 13;throw new o(t);default:throw new o(e)}}(r);continue e}}T[e]=0}return T}(n,t);return{columnNames:e,columnTypes:T,rows:t.map(e=>(function(e,t){let n=Array.from(e);for(let e=0;e<n.length;e++){let T=n[e];if(T instanceof ArrayBuffer){n[e]=Array.from(new Uint8Array(T));continue}if("number"==typeof T&&(0===t[e]||1===t[e])&&!Number.isInteger(T)){n[e]=Math.trunc(T);continue}if(["number","bigint"].includes(typeof T)&&10===t[e]){n[e]=new Date(Number(T)).toISOString();continue}if("bigint"==typeof T){n[e]=T.toString();continue}}return n})(e,T))}})}async executeRaw(e){return s("[js::execute_raw] %O",e),(await this.performIO(e)).map(({rowsAffected:e})=>e??0)}async performIO(e){let t=await this[c].acquire();try{let t=await this.client.execute(e);return n(t)}catch(t){s("Error in performIO: %O",t);let e=t.rawCode??t.cause?.rawCode;if("number"==typeof e)return function e(t){return{ok:!1,error:t,map:()=>e(t),flatMap:()=>e(t)}}({kind:"Sqlite",extendedCode:e,message:t.message});throw t}finally{t()}}},l=class extends N{constructor(e,t,n){super(e),this.options=t,this.unlockParent=n}async commit(){s("[js::commit]");try{await this.client.commit()}finally{this.unlockParent()}return n(void 0)}async rollback(){s("[js::rollback]");try{await this.client.rollback()}catch(e){s("error in rollback:",e)}finally{this.unlockParent()}return n(void 0)}},u=class extends N{constructor(e,t){super(e),this.client=e,this.release=t}async startTransaction(){let e={usePhantomQuery:!0};s("%s options: %O","[js::startTransaction]",e);try{let t=await this.client.transaction("deferred");return n(new l(t,e,this.release))}catch(e){throw this.release(),e}}},L=class extends N{constructor(e){super(e)}async transactionContext(){let e=await this[c].acquire();return n(new u(this.client,e))}};e.s(["PrismaLibSQL",()=>L],694254)},497289,(e,t,n)=>{let T=e.r(522734),r=e.r(814747),i=e.r(446786),a=e.r(254799),E=e.r(180490).version,o=["🔐 encrypt with Dotenvx: https://dotenvx.com","🔐 prevent committing .env to code: https://dotenvx.com/precommit","🔐 prevent building .env in docker: https://dotenvx.com/prebuild","📡 add observability to secrets: https://dotenvx.com/ops","👥 sync secrets across teammates & machines: https://dotenvx.com/ops","🗂️ backup and recover secrets: https://dotenvx.com/ops","✅ audit secrets and track compliance: https://dotenvx.com/ops","🔄 add secrets lifecycle management: https://dotenvx.com/ops","🔑 add access controls to secrets: https://dotenvx.com/ops","🛠️  run anywhere with `dotenvx run -- yourcommand`","⚙️  specify custom .env file path with { path: '/custom/path/.env' }","⚙️  enable debug logging with { debug: true }","⚙️  override existing env vars with { override: true }","⚙️  suppress all logs with { quiet: true }","⚙️  write to custom object with { processEnv: myObject }","⚙️  load multiple .env files with { path: ['.env.local', '.env'] }"];function s(e){return"string"==typeof e?!["false","0","no","off",""].includes(e.toLowerCase()):!!e}let c=/(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;function N(e){console.log(`[dotenv@${E}][DEBUG] ${e}`)}function l(e){console.log(`[dotenv@${E}] ${e}`)}function u(e){return e&&e.DOTENV_KEY&&e.DOTENV_KEY.length>0?e.DOTENV_KEY:process.env.DOTENV_KEY&&process.env.DOTENV_KEY.length>0?process.env.DOTENV_KEY:""}function L(e){let t=null;if(e&&e.path&&e.path.length>0)if(Array.isArray(e.path))for(let n of e.path)T.existsSync(n)&&(t=n.endsWith(".vault")?n:`${n}.vault`);else t=e.path.endsWith(".vault")?e.path:`${e.path}.vault`;else t=r.resolve(process.cwd(),".env.vault");return T.existsSync(t)?t:null}function I(e){return"~"===e[0]?r.join(i.homedir(),e.slice(1)):e}let d={configDotenv:function(e){let t,n=r.resolve(process.cwd(),".env"),i="utf8",a=process.env;e&&null!=e.processEnv&&(a=e.processEnv);let E=s(a.DOTENV_CONFIG_DEBUG||e&&e.debug),c=s(a.DOTENV_CONFIG_QUIET||e&&e.quiet);e&&e.encoding?i=e.encoding:E&&N("No encoding is specified. UTF-8 is used by default");let u=[n];if(e&&e.path)if(Array.isArray(e.path))for(let t of(u=[],e.path))u.push(I(t));else u=[I(e.path)];let L={};for(let n of u)try{let t=d.parse(T.readFileSync(n,{encoding:i}));d.populate(L,t,e)}catch(e){E&&N(`Failed to load ${n} ${e.message}`),t=e}let A=d.populate(a,L,e);if(E=s(a.DOTENV_CONFIG_DEBUG||E),c=s(a.DOTENV_CONFIG_QUIET||c),E||!c){var p;let e=Object.keys(A).length,n=[];for(let e of u)try{let t=r.relative(process.cwd(),e);n.push(t)}catch(n){E&&N(`Failed to load ${e} ${n.message}`),t=n}l(`injecting env (${e}) from ${n.join(",")} ${(p=`-- tip: ${o[Math.floor(Math.random()*o.length)]}`,process.stdout.isTTY?`\x1b[2m${p}\x1b[0m`:p)}`)}return t?{parsed:L,error:t}:{parsed:L}},_configVault:function(e){let t=s(process.env.DOTENV_CONFIG_DEBUG||e&&e.debug),n=s(process.env.DOTENV_CONFIG_QUIET||e&&e.quiet);(t||!n)&&l("Loading env from encrypted .env.vault");let T=d._parseVault(e),r=process.env;return e&&null!=e.processEnv&&(r=e.processEnv),d.populate(r,T,e),{parsed:T}},_parseVault:function(e){let t,n=L(e=e||{});e.path=n;let T=d.configDotenv(e);if(!T.parsed){let e=Error(`MISSING_DATA: Cannot parse ${n} for an unknown reason`);throw e.code="MISSING_DATA",e}let r=u(e).split(","),i=r.length;for(let e=0;e<i;e++)try{let n=r[e].trim(),i=function(e,t){let n;try{n=new URL(t)}catch(e){if("ERR_INVALID_URL"===e.code){let e=Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");throw e.code="INVALID_DOTENV_KEY",e}throw e}let T=n.password;if(!T){let e=Error("INVALID_DOTENV_KEY: Missing key part");throw e.code="INVALID_DOTENV_KEY",e}let r=n.searchParams.get("environment");if(!r){let e=Error("INVALID_DOTENV_KEY: Missing environment part");throw e.code="INVALID_DOTENV_KEY",e}let i=`DOTENV_VAULT_${r.toUpperCase()}`,a=e.parsed[i];if(!a){let e=Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${i} in your .env.vault file.`);throw e.code="NOT_FOUND_DOTENV_ENVIRONMENT",e}return{ciphertext:a,key:T}}(T,n);t=d.decrypt(i.ciphertext,i.key);break}catch(t){if(e+1>=i)throw t}return d.parse(t)},config:function(e){if(0===u(e).length)return d.configDotenv(e);let t=L(e);if(!t){var n;return n=`You set DOTENV_KEY but you are missing a .env.vault file at ${t}. Did you forget to build it?`,console.error(`[dotenv@${E}][WARN] ${n}`),d.configDotenv(e)}return d._configVault(e)},decrypt:function(e,t){let n=Buffer.from(t.slice(-64),"hex"),T=Buffer.from(e,"base64"),r=T.subarray(0,12),i=T.subarray(-16);T=T.subarray(12,-16);try{let e=a.createDecipheriv("aes-256-gcm",n,r);return e.setAuthTag(i),`${e.update(T)}${e.final()}`}catch(T){let e=T instanceof RangeError,t="Invalid key length"===T.message,n="Unsupported state or unable to authenticate data"===T.message;if(e||t){let e=Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");throw e.code="INVALID_DOTENV_KEY",e}if(n){let e=Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");throw e.code="DECRYPTION_FAILED",e}throw T}},parse:function(e){let t,n={},T=e.toString();for(T=T.replace(/\r\n?/mg,"\n");null!=(t=c.exec(T));){let e=t[1],T=t[2]||"",r=(T=T.trim())[0];T=T.replace(/^(['"`])([\s\S]*)\1$/mg,"$2"),'"'===r&&(T=(T=T.replace(/\\n/g,"\n")).replace(/\\r/g,"\r")),n[e]=T}return n},populate:function(e,t,n={}){let T=!!(n&&n.debug),r=!!(n&&n.override),i={};if("object"!=typeof t){let e=Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");throw e.code="OBJECT_REQUIRED",e}for(let n of Object.keys(t))Object.prototype.hasOwnProperty.call(e,n)?(!0===r&&(e[n]=t[n],i[n]=t[n]),T&&(!0===r?N(`"${n}" is already defined and WAS overwritten`):N(`"${n}" is already defined and was NOT overwritten`))):(e[n]=t[n],i[n]=t[n]);return i}};t.exports.configDotenv=d.configDotenv,t.exports._configVault=d._configVault,t.exports._parseVault=d._parseVault,t.exports.config=d.config,t.exports.decrypt=d.decrypt,t.exports.parse=d.parse,t.exports.populate=d.populate,t.exports=d},15270,e=>e.a(async(t,n)=>{try{let v;var T=e.i(463021),r=e.i(694254),i=e.i(418520),a=t([i]);if([i]=a.then?(await a)():a,!process.env.DATABASE_URL)try{let{config:t}=e.r(497289);t({path:".env.local"}),t({path:".env"})}catch{}let _=process.env.DATABASE_URL||"file:./dev.db",F=process.env.TURSO_DATABASE_URL||process.env.TURSO_URL||"";process.env.DATABASE_URL;let M=e.g,w=!!F||_.startsWith("libsql:")||_.startsWith("https:"),P=w?(()=>{let e=F||_,{url:t,authToken:n}=function(e){let[t,n=""]=(e.startsWith("https://")?e.replace(/^https:\/\//,"libsql://"):e).split("?"),T=new URLSearchParams(n).get("authToken")??process.env.TURSO_AUTH_TOKEN??process.env.TURSO_TOKEN??void 0;return{url:t,authToken:T}}(e);return(0,i.createClient)({url:t,authToken:n})})():null,x=P?new r.PrismaLibSQL(P):null,b=M.prisma??(v={log:["error","warn"]},w&&x?v.adapter=x:v.datasources={db:{url:_}},new T.PrismaClient(v));async function E(e,t){if(!e.length)return!0;if(!P)return!1;try{return await P.batch(e.map(e=>"string"==typeof e?{sql:e,args:[]}:{sql:e.sql,args:e.args??[]}),t),!0}catch{return!1}}async function o(e){if(e.length&&!await E(e,"write"))for(let t of e)try{"string"==typeof t?await b.$executeRawUnsafe(t):await b.$executeRawUnsafe(t.sql,...t.args??[])}catch{}}async function s(e){if(!e.length)return[];if(P)try{return(await P.batch(e.map(e=>({sql:e,args:[]})),"read")).map(e=>e.rows)}catch{}let t=[];for(let n of e)try{t.push(await b.$queryRawUnsafe(n))}catch{t.push([])}return t}async function c(e){let t=Array.from(new Set(e.map(([e])=>e))),n=await s(t.map(e=>`PRAGMA table_info("${e}")`)),T=new Map;t.forEach((e,t)=>{T.set(e,new Set((n[t]||[]).map(e=>e.name)))});let r=new Set;for(let[t,n]of e)T.get(t)?.has(n)||r.add(`${t}.${n}`);return r}function N(e,t){let n=[];for(let[T,r,i]of e)t.has(`${T}.${r}`)&&n.push(`ALTER TABLE "${T}" ADD COLUMN ${i};`);return n}let B=null,Y=null,k=!1,G=!1,V=null;async function l(){if(!G)return k&&V?V:(k=!0,V=(async()=>{try{await o(['CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status")','CREATE INDEX IF NOT EXISTS "Quotation_status_validUntil_idx" ON "Quotation"("status", "validUntil")','CREATE INDEX IF NOT EXISTS "Quotation_status_createdAt_idx" ON "Quotation"("status", "createdAt")','CREATE INDEX IF NOT EXISTS "Quotation_createdAt_idx" ON "Quotation"("createdAt")','CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status")','CREATE INDEX IF NOT EXISTS "Invoice_status_paymentStatus_idx" ON "Invoice"("status", "paymentStatus")','CREATE INDEX IF NOT EXISTS "Invoice_status_paymentStatus_dueDate_idx" ON "Invoice"("status", "paymentStatus", "dueDate")','CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt")','CREATE INDEX IF NOT EXISTS "Invoice_dueDate_idx" ON "Invoice"("dueDate")','CREATE INDEX IF NOT EXISTS "Listing_status_idx" ON "Listing"("status")','CREATE INDEX IF NOT EXISTS "Listing_status_platform_idx" ON "Listing"("status", "platform")','CREATE INDEX IF NOT EXISTS "Listing_createdAt_idx" ON "Listing"("createdAt")','CREATE INDEX IF NOT EXISTS "Sale_paymentStatus_idx" ON "Sale"("paymentStatus")','CREATE INDEX IF NOT EXISTS "Sale_saleDate_paymentStatus_idx" ON "Sale"("saleDate", "paymentStatus")','CREATE INDEX IF NOT EXISTS "Vendor_status_idx" ON "Vendor"("status")','CREATE INDEX IF NOT EXISTS "Expense_paymentStatus_idx" ON "Expense"("paymentStatus")'])}catch{}finally{G=!0,k=!1,V=null}})())}let $=null,K=null;async function u(e){return $?.has(e)?!!$.get(e):(K||(K=(async()=>{try{let e=await b.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"),t=new Map;for(let n of e||[])n?.name&&t.set(String(n.name),!0);return $=t,t}catch{return $=new Map}finally{K=null}})()),!!(await K).get(e))}async function L(e){for(let t of e)if(!await u(t))return!1;return!0}async function I(){return null!==B?B:Y||(Y=(async()=>{try{let e=await b.$queryRawUnsafe('PRAGMA table_info("User")');return B=new Set((e||[]).map(e=>e.name)).has("roleId")}catch{return B=!1,!1}finally{Y=null}})())}let q=!1,j=!1,Q=null;async function d(){if(!j)return q&&Q?Q:(q=!0,Q=(async()=>{try{if(!await I())try{await b.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "roleId" TEXT;'),B=!0}catch{B=null,await I()}}catch{}finally{j=!0,q=!1,Q=null}})())}let W=!1,H=!1,J=null;async function A(){if(!H)return W&&J?J:(W=!0,J=(async()=>{try{await o([`CREATE TABLE IF NOT EXISTS "Role" (
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
        );`,'CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId","permissionId");','CREATE UNIQUE INDEX IF NOT EXISTS "UserPermission_userId_permissionId_key" ON "UserPermission"("userId","permissionId");','CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission"("roleId");','CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");','CREATE INDEX IF NOT EXISTS "UserPermission_userId_idx" ON "UserPermission"("userId");','CREATE INDEX IF NOT EXISTS "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");'])}catch{}finally{$&&($.set("Role",!0),$.set("Permission",!0),$.set("RolePermission",!0),$.set("UserPermission",!0)),H=!0,W=!1,J=null}})())}let z=!1,Z=!1,ee=null;async function p(){if(!Z)return z&&ee?ee:(z=!0,ee=(async()=>{try{await o([`CREATE TABLE IF NOT EXISTS "ActivityLog" (
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
        );`]);let e=[["ActivityLog","module",'"module" TEXT'],["ActivityLog","action",'"action" TEXT'],["ActivityLog","referenceId",'"referenceId" TEXT'],["ActivityLog","description",'"description" TEXT'],["ActivityLog","metadata",'"metadata" TEXT'],["ActivityLog","userEmail",'"userEmail" TEXT'],["ActivityLog","ipAddress",'"ipAddress" TEXT'],["ActivityLog","userAgent",'"userAgent" TEXT'],["ActivityLog","source",'"source" TEXT'],["ActivityLog","fieldChanges",'"fieldChanges" TEXT'],["ActivityLog","details",'"details" TEXT'],["ActivityLog","idempotencyKey",'"idempotencyKey" TEXT']];try{let t=await c(e.map(([e,t])=>[e,t]));await o([...N(e,t),'CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");','CREATE INDEX IF NOT EXISTS "ActivityLog_module_idx" ON "ActivityLog"("module");','CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");','CREATE INDEX IF NOT EXISTS "ActivityLog_entityId_idx" ON "ActivityLog"("entityId");','CREATE INDEX IF NOT EXISTS "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");','CREATE UNIQUE INDEX IF NOT EXISTS "ActivityLog_user_action_idempotency_key_unique" ON "ActivityLog"("userId","actionType","idempotencyKey");'])}catch{}}catch{}finally{$&&$.set("ActivityLog",!0),Z=!0,z=!1,ee=null}})())}let et=!1,en=!1,eT=null;async function U(){if(!en)return et&&eT?eT:(et=!0,eT=(async()=>{try{await o([`CREATE TABLE IF NOT EXISTS "FollowUp" (
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
        );`,'CREATE INDEX IF NOT EXISTS "FollowUp_invoiceId_idx" ON "FollowUp"("invoiceId");','CREATE INDEX IF NOT EXISTS "FollowUp_createdBy_idx" ON "FollowUp"("createdBy");']);let e=[["FollowUp","channel","\"channel\" TEXT NOT NULL DEFAULT 'CALL'"],["FollowUp","status","\"status\" TEXT NOT NULL DEFAULT 'OPEN'"],["FollowUp","completedAt",'"completedAt" DATETIME'],["FollowUp","cancelledAt",'"cancelledAt" DATETIME'],["FollowUp","rescheduledTo",'"rescheduledTo" DATETIME'],["FollowUp","updatedAt",'"updatedAt" DATETIME']],t=await c(e.map(([e,t])=>[e,t]));await o([...N(e,t),'UPDATE "FollowUp" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;',`UPDATE "FollowUp" SET "channel" = UPPER("action")
         WHERE "action" IS NOT NULL AND UPPER("action") IN ('CALL', 'EMAIL', 'WHATSAPP')
           AND ("channel" IS NULL OR "channel" = 'CALL');`,'CREATE INDEX IF NOT EXISTS "FollowUp_status_date_idx" ON "FollowUp"("status", "date");'])}catch(e){console.error("[follow-up] Failed to initialize follow-up schema:",e)}finally{$&&$.set("FollowUp",!0),en=!0,et=!1,eT=null}})())}let er=!1,ei=!1,ea=null;async function O(){return(await c([["Invoice","invoiceType"],["Invoice","iecCode"],["Invoice","exportType"],["Invoice","countryOfDestination"],["Invoice","portOfDispatch"],["Invoice","modeOfTransport"],["Invoice","courierPartner"],["Invoice","trackingId"],["Invoice","invoiceCurrency"],["Invoice","conversionRate"],["Invoice","totalInrValue"],["CompanySettings","invoicePrefix"],["CompanySettings","invoicingStartNumber"],["CompanySettings","invoiceLogoUrl"],["CompanySettings","quotationLogoUrl"],["CompanySettings","logoUrl"],["CompanySettings","skuViewLogoUrl"],["CompanySettings","otherDocsLogoUrl"],["CompanySettings","address"],["CompanySettings","email"],["CompanySettings","phone"],["CompanySettings","website"],["CompanySettings","gstin"],["CompanySettings","enableExportInvoice"],["CompanySettings","defaultExportType"],["CompanySettings","companyIec"],["CompanySettings","defaultCurrency"],["CompanySettings","defaultPort"],["CompanySettings","swiftCode"],["CompanySettings","termsAndConditions"],["CompanySettings","createdAt"],["CompanySettings","updatedAt"],["PaymentSettings","swiftCode"]])).size>0}async function R(e=!1){if(!e){let t=await O();if(!t&&ei)return;e=t}if(!ei||e)return er&&ea?ea:(er=!0,ea=(async()=>{try{await U(),await o([`CREATE TABLE IF NOT EXISTS "Payment" (
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
        );`,'CREATE INDEX IF NOT EXISTS "CreditNote_customerId_idx" ON "CreditNote"("customerId");','CREATE INDEX IF NOT EXISTS "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");']);let e=[["Invoice","invoiceType",'"invoiceType" TEXT DEFAULT "TAX"'],["Invoice","iecCode",'"iecCode" TEXT'],["Invoice","exportType",'"exportType" TEXT'],["Invoice","countryOfDestination",'"countryOfDestination" TEXT'],["Invoice","portOfDispatch",'"portOfDispatch" TEXT'],["Invoice","modeOfTransport",'"modeOfTransport" TEXT'],["Invoice","courierPartner",'"courierPartner" TEXT'],["Invoice","trackingId",'"trackingId" TEXT'],["Invoice","invoiceCurrency",'"invoiceCurrency" TEXT'],["Invoice","conversionRate",'"conversionRate" REAL'],["Invoice","totalInrValue",'"totalInrValue" REAL'],["Invoice","totalUsdValue",'"totalUsdValue" REAL'],["CompanySettings","invoicePrefix",'"invoicePrefix" TEXT'],["CompanySettings","invoicingStartNumber",'"invoicingStartNumber" INTEGER'],["CompanySettings","invoiceLogoUrl",'"invoiceLogoUrl" TEXT'],["CompanySettings","quotationLogoUrl",'"quotationLogoUrl" TEXT'],["CompanySettings","logoUrl",'"logoUrl" TEXT'],["CompanySettings","skuViewLogoUrl",'"skuViewLogoUrl" TEXT'],["CompanySettings","otherDocsLogoUrl",'"otherDocsLogoUrl" TEXT'],["CompanySettings","address",'"address" TEXT'],["CompanySettings","email",'"email" TEXT'],["CompanySettings","phone",'"phone" TEXT'],["CompanySettings","website",'"website" TEXT'],["CompanySettings","gstin",'"gstin" TEXT'],["CompanySettings","enableExportInvoice",'"enableExportInvoice" INTEGER NOT NULL DEFAULT 0'],["CompanySettings","defaultExportType",'"defaultExportType" TEXT'],["CompanySettings","companyIec",'"companyIec" TEXT'],["CompanySettings","defaultCurrency",'"defaultCurrency" TEXT'],["CompanySettings","defaultPort",'"defaultPort" TEXT'],["CompanySettings","swiftCode",'"swiftCode" TEXT'],["CompanySettings","termsAndConditions",'"termsAndConditions" TEXT'],["CompanySettings","createdAt",'"createdAt" DATETIME'],["CompanySettings","updatedAt",'"updatedAt" DATETIME'],["PaymentSettings","swiftCode",'"swiftCode" TEXT'],["InvoiceSettings","exportTerms",'"exportTerms" TEXT'],["Sale","usdPrice",'"usdPrice" REAL']],t=await c(e.map(([e,t])=>[e,t]));await o([...N(e,t),'UPDATE "CompanySettings" SET "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)','UPDATE "CompanySettings" SET "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)',`CREATE TABLE IF NOT EXISTS "CustomerAdvance" (
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
        );`,'CREATE INDEX IF NOT EXISTS "ExportInvoice_invoiceId_idx" ON "ExportInvoice"("invoiceId");','CREATE INDEX IF NOT EXISTS "ExportInvoice_customsDeclarationNumber_idx" ON "ExportInvoice"("customsDeclarationNumber");'])}catch{}finally{$&&["Payment","InvoiceVersion","SalesReturn","SalesReturnItem","CreditNote","CustomerAdvance","CustomerAdvanceAdjustment","ExportInvoice"].forEach(e=>$.set(e,!0)),ei=!0,er=!1,ea=null}})())}let eE=!1,eo=!1,es=null;async function m(){if(!eo)return eE&&es?es:(eE=!0,es=(async()=>{try{await o([`CREATE TABLE IF NOT EXISTS "SalesReturnReplacement" (
          "salesReturnId" TEXT NOT NULL PRIMARY KEY,
          "invoiceId" TEXT NOT NULL,
          "memoId" TEXT,
          "createdBy" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,'CREATE INDEX IF NOT EXISTS "SalesReturnReplacement_invoiceId_idx" ON "SalesReturnReplacement"("invoiceId");'])}catch{}finally{$&&$.set("SalesReturnReplacement",!0),eo=!0,eE=!1,es=null}})())}let ec=!1,eN=!1,el=null;async function y(e,t,n){try{let T=await b.$queryRawUnsafe(`PRAGMA table_info("${e}")`);Array.isArray(T)&&T.some(e=>e.name===t)||await b.$executeRawUnsafe(`ALTER TABLE "${e}" ADD COLUMN ${n};`)}catch{}}async function S(){if(!eN)return ec&&el?el:(ec=!0,el=(async()=>{try{await o([`CREATE TABLE IF NOT EXISTS "OfferBanner" (
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
        );`]);let e=[["Customer","stateCode",'"stateCode" TEXT'],["Customer","countryCode",'"countryCode" TEXT'],["Customer","isInternational",'"isInternational" INTEGER NOT NULL DEFAULT 0'],["Invoice","invoiceType",'"invoiceType" TEXT DEFAULT "TAX"'],["Invoice","iecCode",'"iecCode" TEXT'],["Invoice","exportType",'"exportType" TEXT'],["Invoice","countryOfDestination",'"countryOfDestination" TEXT'],["Invoice","portOfDispatch",'"portOfDispatch" TEXT'],["Invoice","modeOfTransport",'"modeOfTransport" TEXT'],["Invoice","courierPartner",'"courierPartner" TEXT'],["Invoice","trackingId",'"trackingId" TEXT'],["Invoice","invoiceCurrency",'"invoiceCurrency" TEXT'],["Invoice","conversionRate",'"conversionRate" REAL'],["Invoice","totalInrValue",'"totalInrValue" REAL'],["Customer","dateOfBirth",'"dateOfBirth" DATETIME'],["Customer","anniversaryDate",'"anniversaryDate" DATETIME'],["Customer","communicationOptIn",'"communicationOptIn" INTEGER NOT NULL DEFAULT 1'],["Customer","preferredLanguage",'"preferredLanguage" TEXT'],["CustomerCampaignLog","launchedById",'"launchedById" TEXT'],["CustomerCampaignLog","invoiceId",'"invoiceId" TEXT'],["LoyaltySettings","dobProfilePoints",'"dobProfilePoints" REAL NOT NULL DEFAULT 0'],["LoyaltySettings","anniversaryProfilePoints",'"anniversaryProfilePoints" REAL NOT NULL DEFAULT 0'],["CouponRedemption","discountAmount",'"discountAmount" REAL NOT NULL DEFAULT 0'],["CouponRedemption","redeemedAt",'"redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP']],t=await c(e.map(([e,t])=>[e,t]));await o(N(e,t));try{await b.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerCampaignLog_invoiceId_idx" ON "CustomerCampaignLog"("invoiceId")')}catch(e){console.error("[schema] Could not create the WhatsApp invoice index:",e)}}catch{}finally{$&&["OfferBanner","Coupon","CouponRedemption","LoyaltyLedger","MessageTemplate","CustomerCampaignLog","CustomerProfileExtra","InvoicePromotionSettings","LoyaltySettings"].forEach(e=>$.set(e,!0)),eN=!0,ec=!1,el=null}})())}let eu=!1,eL=!1,eI=null;async function D(){if(!eL)return eu&&eI?eI:(eu=!0,eI=(async()=>{try{let e=[["User","avatarUrl",'"avatarUrl" TEXT'],["User","avatarHistory","\"avatarHistory\" TEXT DEFAULT '[]'"]],t=await c(e.map(([e,t])=>[e,t]));await o([...N(e,t),`CREATE TABLE IF NOT EXISTS "WhatsNewEntry" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "message" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`])}catch{}finally{eL=!0,eu=!1,eI=null}})())}let ed=!1,eA=!1,ep=null;async function f(){if(!eA)return ed&&ep?ep:(ed=!0,ep=(async()=>{try{await y("User","themePreference","\"themePreference\" TEXT DEFAULT 'default'")}catch{}finally{eA=!0,ed=!1,ep=null}})())}let eU=!1,eO=!1,eR=null;async function g(){if(!eO)return eU&&eR?eR:(eU=!0,eR=(async()=>{try{await y("User","premiumMode",'"premiumMode" INTEGER DEFAULT 0')}catch{}finally{eO=!0,eU=!1,eR=null}})())}let em=!1,ey=!1,eS=null;async function C(){if(!ey)return em&&eS?eS:(em=!0,eS=(async()=>{try{await b.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "expiresAt" DATETIME NOT NULL,
          "used" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(()=>null)}catch{}finally{ey=!0,em=!1,eS=null}})())}let eD=!1,ef=!1,eg=null;async function h(){if(!ef)return eD&&eg?eg:(eD=!0,eg=(async()=>{try{await o([`CREATE TABLE IF NOT EXISTS "ListingMetricSnapshot" (
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
        );`,'DROP INDEX IF EXISTS "ListingOpportunity_inventoryId_key";','CREATE UNIQUE INDEX IF NOT EXISTS "ListingOpportunity_inventoryId_marketplace_key" ON "ListingOpportunity"("inventoryId", "marketplace");','CREATE INDEX IF NOT EXISTS "ListingMetricSnapshot_inventoryId_capturedAt_idx" ON "ListingMetricSnapshot"("inventoryId", "capturedAt");','CREATE INDEX IF NOT EXISTS "ListingMetricSnapshot_marketplace_capturedAt_idx" ON "ListingMetricSnapshot"("marketplace", "capturedAt");','CREATE UNIQUE INDEX IF NOT EXISTS "ListingMetricSnapshot_inventoryId_marketplace_externalId_capt_key" ON "ListingMetricSnapshot"("inventoryId", "marketplace", "externalId", "capturedAt");','CREATE INDEX IF NOT EXISTS "ListingOpportunity_marketplace_externalId_idx" ON "ListingOpportunity"("marketplace", "externalId");','CREATE INDEX IF NOT EXISTS "ListingOpportunity_lastSyncedAt_idx" ON "ListingOpportunity"("lastSyncedAt");'])}catch{}finally{$&&($.set("ListingMetricSnapshot",!0),$.set("ListingOpportunity",!0)),ef=!0,eD=!1,eg=null}})())}let eC=!1,eh=!1,eX=null;async function X(){if(!eh)return eC&&eX?eX:(eC=!0,eX=(async()=>{try{let e=[];for(let t of["internalShippingCost","internalPackagingCost","internalInsuranceCost","internalHandlingCost","internalOtherCharges","internalCostTotal"])e.push(["Invoice",t,`"${t}" REAL NOT NULL DEFAULT 0`]),e.push(["Sale",t,`"${t}" REAL NOT NULL DEFAULT 0`]);e.push(["Sale","actualProfit",'"actualProfit" REAL']);let t=await c(e.map(([e,t])=>[e,t])),n=[["SHOPIFY","Shopify","USD",0,0],["ETSY","Etsy","USD",1,0],["EBAY","eBay","USD",0,0],["AMAZON","Amazon","USD",0,0],["WEBSITE","Website","INR",0,0],["WHOLESALE","Wholesale","INR",0,0],["OFFLINE","Offline Sales","INR",0,0]].map(([e,t,n,T,r])=>({sql:`INSERT OR IGNORE INTO "MarketplaceProfile" ("id", "name", "displayName", "currency", "isActive", "isDefault", "marginType", "marginValue", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, 1, ?, 'PERCENT', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,args:[crypto.randomUUID(),e,t,n,T,r]})),T=[["INR",1,1],["USD",0,0],["EUR",0,0],["GBP",0,0],["AUD",0,0],["CAD",0,0],["SGD",0,0],["AED",0,0],["JPY",0,0],["CHF",0,0],["CNY",0,0],["HKD",0,0],["NZD",0,0],["SAR",0,0],["QAR",0,0],["KWD",0,0],["ZAR",0,0],["THB",0,0],["MYR",0,0]].map(([e,t,n])=>({sql:`INSERT OR IGNORE INTO "CurrencyRate" ("id", "code", "rateToInr", "isBase", "updatedAt")
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,args:[crypto.randomUUID(),e,t,n]}));await o([`CREATE TABLE IF NOT EXISTS "MarketplaceProfile" (
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
        );`,'CREATE UNIQUE INDEX IF NOT EXISTS "CurrencyRate_code_key" ON "CurrencyRate"("code");',...N(e,t),'CREATE INDEX IF NOT EXISTS "Inventory_origin_idx" ON "Inventory"("origin");','CREATE INDEX IF NOT EXISTS "Inventory_hsnCode_idx" ON "Inventory"("hsn_code");','CREATE INDEX IF NOT EXISTS "Inventory_hideFromAttention_idx" ON "Inventory"("hideFromAttention");','CREATE INDEX IF NOT EXISTS "Inventory_status_sellingPrice_idx" ON "Inventory"("status", "sellingPrice");',...n,...T,{sql:`INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "description", "updatedAt")
         VALUES (?, 'default_marketplace', 'ETSY', 'Marketplace profile used for single-row MSP/MRP planning in the Opportunity Report', CURRENT_TIMESTAMP)`,args:[crypto.randomUUID()]},{sql:`INSERT OR IGNORE INTO "Setting" ("id", "key", "value", "description", "updatedAt")
         VALUES (?, 'pricing_engine_enabled', 'false', 'Enables the pricing analysis view in the Opportunity Report', CURRENT_TIMESTAMP)`,args:[crypto.randomUUID()]}])}catch(e){console.error("ensurePricingEngineSchema failed:",e)}finally{eh=!0,eC=!1,eX=null}})())}e.s(["buildAddColumnStatements",()=>N,"ensureActivityLogSchema",()=>p,"ensureAvatarWhatsNewSchema",()=>D,"ensureBillfreePhase1Schema",()=>S,"ensureFollowUpSchema",()=>U,"ensureInvoiceSupportSchema",()=>R,"ensureMarketplaceMetricsSchema",()=>h,"ensurePasswordResetSchema",()=>C,"ensurePerformanceIndexes",()=>l,"ensurePremiumModeSchema",()=>g,"ensurePricingEngineSchema",()=>X,"ensureRbacSchema",()=>A,"ensureSalesReturnReplacementSchema",()=>m,"ensureUserRoleIdColumn",()=>d,"ensureUserThemeSchema",()=>f,"executeDdlBatch",()=>o,"executeReadBatch",()=>s,"getMissingColumns",()=>c,"hasTable",()=>u,"hasTables",()=>L,"hasUserRoleIdColumn",()=>I,"prisma",0,b]),n()}catch(e){n(e)}},!1)];

//# sourceMappingURL=_40185923._.js.map