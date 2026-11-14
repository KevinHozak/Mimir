import {createHash} from "node:crypto";
import {openSync,readSync,closeSync} from "node:fs";
/** Constant-memory digest for full SQLite snapshots and archives. */
export function fileDigest(path:string,algorithm:"sha256"|"md5"="sha256",encoding:"hex"|"base64"="hex"):string {
 const fd=openSync(path,"r"),hash=createHash(algorithm),buffer=Buffer.allocUnsafe(65536);
 try {for(;;){const size=readSync(fd,buffer,0,buffer.length,null);if(!size)break;hash.update(buffer.subarray(0,size));}return hash.digest(encoding);} finally {closeSync(fd);}
}
