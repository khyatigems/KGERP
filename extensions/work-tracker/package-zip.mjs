import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// A small, dependency-free ZIP writer for this extension's public static assets.
// Entries use ZIP's uncompressed storage method; no secrets or ERP source enter it.
export function packageExtension(source, destination) {
 const local = [], central = []; let offset = 0, count = 0;
 function visit(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
   const filename = path.join(folder, entry.name);
   if (entry.isDirectory()) { visit(filename); continue; }
   if (!entry.isFile()) throw new Error("Unexpected extension package entry");
   const name = Buffer.from(path.relative(source, filename).split(path.sep).join("/"));
   const data = readFileSync(filename);
   let crc = 0xffffffff;
   for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
   crc = (crc ^ 0xffffffff) >>> 0;
   const header = Buffer.alloc(30);
   header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
   header.writeUInt16LE(0x21, 12); header.writeUInt32LE(crc, 14);
   header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
   const index = Buffer.alloc(46);
   index.writeUInt32LE(0x02014b50, 0); index.writeUInt16LE(20, 4); index.writeUInt16LE(20, 6); index.writeUInt16LE(0x800, 8);
   index.writeUInt16LE(0x21, 14); index.writeUInt32LE(crc, 16);
   index.writeUInt32LE(data.length, 20); index.writeUInt32LE(data.length, 24); index.writeUInt16LE(name.length, 28); index.writeUInt32LE(offset, 42);
   local.push(header, name, data); central.push(index, name); offset += header.length + name.length + data.length; count++;
  }
 }
 visit(source);
 const directory = Buffer.concat(central), end = Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10);
 end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
 mkdirSync(path.dirname(destination), { recursive: true });
 writeFileSync(destination, Buffer.concat([...local, directory, end]));
}
