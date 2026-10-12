import {readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fetchReleaseInventory,MAX_FILE_BYTES,TOTAL_STORAGE_BYTES,validateCapacity} from '../public/storage-policy.js';
import type {LibraryRelease} from './releases';

export interface StorageSummary {
  usedBytes:number; sourceBytes:number; releaseBytes:number; draftBytes:number;
  totalBytes:number; maxFileBytes:number; checkedAt:string; includesDrafts:boolean;
}
export async function measureContent(root:string):Promise<number> {
  let bytes=0;
  for(const item of await readdir(root,{withFileTypes:true})) {
    if(item.name.startsWith('.')||item.name==='README.md')continue;
    const file=path.join(root,item.name);
    if(item.isSymbolicLink())throw new Error('不接受符号链接');
    if(item.isDirectory()){bytes+=await measureContent(file);continue;}
    const info=await stat(file);
    if(info.size>MAX_FILE_BYTES)throw new Error(`单个文件不能超过 500 MB：${item.name}`);
    bytes+=info.size;
  }
  return bytes;
}
export async function loadStorage(root:string,repository:string) {
  const token=process.env.GITHUB_TOKEN;
  if(process.env.GITHUB_ACTIONS==='true'&&!token)throw new Error('发布校验需要 GITHUB_TOKEN 以统计未发布附件');
  const sourceBytes=await measureContent(root);
  const inventory=await fetchReleaseInventory(repository,{token});
  for(const release of inventory.releases)for(const asset of release.assets) {
    if(asset.size>MAX_FILE_BYTES)throw new Error(`单个文件不能超过 500 MB：${asset.name}。请在 Releases 移除超限附件后重新发布。`);
  }
  const usedBytes=sourceBytes+inventory.usedBytes;
  validateCapacity(usedBytes);
  const summary:StorageSummary={usedBytes,sourceBytes,releaseBytes:inventory.usedBytes,draftBytes:inventory.draftBytes,totalBytes:TOTAL_STORAGE_BYTES,maxFileBytes:MAX_FILE_BYTES,checkedAt:new Date().toISOString(),includesDrafts:!!token};
  return {summary,releases:inventory.releases as LibraryRelease[]};
}
