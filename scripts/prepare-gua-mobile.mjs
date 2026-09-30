import { rm, mkdir, copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
const out=new URL('../www-gua/',import.meta.url);
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
const srcDir=new URL('../guatemala-citizenship-spanish/',import.meta.url);
const files=['index.html','academy-data.js','academy-v2.js','gua-podcasts.js','gua-podcast-ui.js'];
for(const name of files){
  const src=new URL(name,srcDir);
  await access(src,constants.R_OK);
  await copyFile(src,new URL(name,out));
}
const rootFiles=['icon.svg'];
for(const name of rootFiles){
  const src=new URL('../'+name,import.meta.url);
  try{await access(src,constants.R_OK);await copyFile(src,new URL(name,out));}catch(e){}
}
console.log('GUA mobile web bundle prepared in www-gua/');
