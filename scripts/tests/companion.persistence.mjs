import assert from 'node:assert/strict';
import {mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {PrismaClient} from '@prisma/client';
const root=process.cwd();
const dir=resolve('tmp/companion-persistence');await mkdir(dir,{recursive:true});
const db=resolve(dir,'preferences.db');
const prisma=new PrismaClient({datasources:{db:{url:`file:${db.replaceAll('\\','/')}`}}});
globalThis.__companionPrisma=prisma;globalThis.__companionIdentity=null;globalThis.__companionAllowed=false;
const outfile=resolve(dir,'actions.mjs');
await build({entryPoints:[resolve('app/(dashboard)/settings/companion/actions.ts')],outfile,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent',plugins:[{name:'isolated-session',setup(b){
 b.onResolve({filter:/^(@\/lib\/(auth|prisma|permissions)|next\/cache)$/},a=>({path:a.path,namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},a=>({resolveDir:root,contents:a.path.endsWith('/auth')?'export async function auth(){return globalThis.__companionIdentity}':a.path.endsWith('/prisma')?'export const prisma=globalThis.__companionPrisma':a.path.endsWith('/permissions')?'export const PERMISSIONS={SETTINGS_MANAGE:"settings:manage"};export async function checkUserPermission(){return globalThis.__companionAllowed}':'export function revalidatePath(){}'}));
}}]});
try{
 await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS Setting (id TEXT PRIMARY KEY NOT NULL, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL, description TEXT, updatedAt DATETIME NOT NULL)');
 await prisma.setting.deleteMany();
 const {saveCompanionPreferences}=await import(pathToFileURL(outfile).href);
 assert.ok((await saveCompanionPreferences({enabled:true})).error,'anonymous denied');
 globalThis.__companionIdentity={user:{id:'alice'}};
 assert.ok((await saveCompanionPreferences({enabled:true})).error,'permission denied');
 assert.equal(await prisma.setting.count(),0);
 globalThis.__companionAllowed=true;
 assert.ok((await saveCompanionPreferences({enabled:'yes'})).error,'invalid body denied');
 assert.ok((await saveCompanionPreferences({enabled:true,position:'top-left',quiet:true,character:'owl',size:128,dock:{x:0.3,y:0.6},pinned:['/inventory']})).preferences);
 globalThis.__companionIdentity={user:{id:'bob'}};
 assert.ok((await saveCompanionPreferences({enabled:false,character:'sapphire'})).preferences);
 await prisma.$disconnect();
 const fresh=new PrismaClient({datasources:{db:{url:`file:${db.replaceAll('\\','/')}`}}});
 try{
 const a=JSON.parse((await fresh.setting.findUniqueOrThrow({where:{key:'companion:v1:alice'}})).value);
 const b=JSON.parse((await fresh.setting.findUniqueOrThrow({where:{key:'companion:v1:bob'}})).value);
 assert.equal(a.enabled,true);assert.equal(a.quiet,true);assert.equal(a.character,'owl');assert.equal(a.size,128);assert.equal(a.position,'top-left');assert.deepEqual(a.dock,{x:0.3,y:0.6});assert.deepEqual(a.pinned,['/inventory']);assert.equal(b.enabled,false);assert.equal(b.character,'sapphire');assert.equal(await fresh.setting.count(),2);
 }finally{await fresh.$disconnect()}
 console.log('Companion persistence passed: real save action and SQLite storage, anonymous/permission/validation rejection, account isolation and fresh-client readback. Authentication and cache invalidation use test adapters.');
}finally{await prisma.$disconnect();await rm(db,{force:true});}
