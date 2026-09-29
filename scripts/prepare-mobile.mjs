import { rm, mkdir, copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
const out=new URL('../www/',import.meta.url);
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
const candidates=['index.html','feed.json','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest','mobile-native.js'];
for(const name of candidates){
  const src=new URL('../'+name,import.meta.url);
  try{await access(src,constants.R_OK);await copyFile(src,new URL(name,out));}
  catch(e){if(!name.endsWith('.png'))throw e}
}
console.log('BatumHub mobile web bundle prepared in www/');
