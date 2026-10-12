import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,truncate,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {MAX_FILE_BYTES,TOTAL_STORAGE_BYTES,validateUpload,validateCapacity,fetchReleaseInventory} from '../public/storage-policy.js';
import {releaseEntries,type LibraryRelease,type ReleaseAsset} from '../src/releases';
import {measureContent} from '../src/storage';
import {loadEntries} from '../src/content';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Article} from '../src/components';

const asset=(id:number,size=MAX_FILE_BYTES):ReleaseAsset=>({id,name:'讲义.pdf',size,state:'uploaded',browser_download_url:`https://github.com/vincent-arqain/Math/releases/download/library-1/notes-${id}.pdf`,content_type:'application/pdf',created_at:'2026-10-12T00:00:00Z',updated_at:'2026-10-12T00:00:00Z'});
const release=(assets=[asset(1)]):LibraryRelease=>({id:1,tag_name:'library-1',name:'Release title',body:'---\nlibrary: true\nsection: english\ncategory: reading-types/inference\ntitle: 推理题\n---\n原始推导 $x^2$\n',draft:false,prerelease:false,html_url:'https://github.com/vincent-arqain/Math/releases/tag/library-1',assets});

test('500 MB per file and 50 GB total are inclusive decimal limits',()=>{
  assert.equal(MAX_FILE_BYTES,500_000_000);assert.equal(TOTAL_STORAGE_BYTES,50_000_000_000);
  assert.doesNotThrow(()=>validateUpload({name:'book.PDF',size:MAX_FILE_BYTES},TOTAL_STORAGE_BYTES-MAX_FILE_BYTES));
  assert.throws(()=>validateUpload({name:'book.pdf',size:MAX_FILE_BYTES+1},0),/500 MB/);
  assert.throws(()=>validateUpload({name:'book.pdf',size:MAX_FILE_BYTES},TOTAL_STORAGE_BYTES-MAX_FILE_BYTES+1),/50 GB/);
  assert.throws(()=>validateUpload({name:'empty.pdf',size:0},0),/空文件/);
  assert.throws(()=>validateUpload({name:'program.exe',size:1},0));
  assert.doesNotThrow(()=>validateCapacity(TOTAL_STORAGE_BYTES));
  assert.throws(()=>validateCapacity(TOTAL_STORAGE_BYTES+1));
  for(const size of [-1,NaN,Infinity,0.5])assert.throws(()=>validateCapacity(size));
});

test('current content counts files once; accepts 500 MB originals and rejects one byte above',async()=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'math-storage-test-'));
  try{
    const root=path.join(temp,'content');await mkdir(path.join(root,'notes'),{recursive:true});
    const file=path.join(root,'notes','original.pdf');await writeFile(file,'%PDF');await truncate(file,MAX_FILE_BYTES);
    const md='---\nattachment: notes/original.pdf\n---\nOriginal $x^2$';await writeFile(path.join(root,'notes','original.md'),md);
    assert.equal(await measureContent(root),MAX_FILE_BYTES+Buffer.byteLength(md));
    const entries=await loadEntries(root);assert.equal(entries.length,1);assert.equal(entries[0].file_size,MAX_FILE_BYTES);
    await truncate(file,MAX_FILE_BYTES+1);
    await assert.rejects(measureContent(root),/500 MB/);await assert.rejects(loadEntries(root),/500 MB/);
  }finally{await rm(temp,{recursive:true,force:true});}
});

test('all release and asset pages count including drafts and retained versions',async()=>{
  const pages:string[]=[];
  const fetcher=(async(input:string|URL|Request)=>{
    const url=new URL(String(input));pages.push(url.pathname+url.search);const page=Number(url.searchParams.get('page'));
    if(url.pathname.endsWith('/releases'))return Response.json(page===1?Array.from({length:100},(_,i)=>({id:i+1,draft:i===0})):[{id:101,draft:false}]);
    if(url.pathname.endsWith('/releases/1/assets'))return Response.json(page===1?Array.from({length:100},(_,i)=>asset(i+1,10)):[asset(101,20)]);
    if(url.pathname.endsWith('/releases/101/assets'))return Response.json([asset(102,30)]);
    return Response.json([]);
  }) as typeof fetch;
  const inventory=await fetchReleaseInventory('vincent-arqain/Math',{token:'test-only',fetcher});
  assert.equal(inventory.releases.length,101);assert.equal(inventory.assetCount,102);assert.equal(inventory.usedBytes,1050);assert.equal(inventory.draftBytes,1020);
  assert.ok(pages.some(p=>p.endsWith('/releases?per_page=100&page=2')));assert.ok(pages.some(p=>p.endsWith('/releases/1/assets?per_page=100&page=2')));
});

test('API failures and malformed capacity fail closed, including later pages',async()=>{
  await assert.rejects(fetchReleaseInventory('vincent-arqain/Math',{fetcher:(async()=>new Response('',{status:403})) as typeof fetch}),/HTTP 403/);
  await assert.rejects(fetchReleaseInventory('vincent-arqain/Math',{fetcher:(async(input)=>String(input).includes('/assets')?Response.json([{id:1,size:-1}]):Response.json([{id:1}])) as typeof fetch}),/大小无效/);
  await assert.rejects(fetchReleaseInventory('vincent-arqain/Math',{fetcher:(async(input)=>String(input).includes('page=2')?new Response('',{status:502}):Response.json(Array.from({length:100},(_,i)=>({id:i+1})))) as typeof fetch}),/HTTP 502/);
});

test('a large library reuses embedded asset metadata instead of making one call per file',async()=>{
  let calls=0;
  const fetcher=(async(input:string|URL|Request)=>{
    calls++;const url=new URL(String(input));assert.ok(url.pathname.endsWith('/releases'));
    const page=Number(url.searchParams.get('page'));
    return Response.json(page<=20?Array.from({length:100},(_,i)=>{const id=(page-1)*100+i+1;return {id,draft:false,assets:[asset(id,10)]};}):[]);
  }) as typeof fetch;
  const inventory=await fetchReleaseInventory('vincent-arqain/Math',{fetcher});
  assert.equal(calls,21);assert.equal(inventory.usedBytes,20_000);assert.equal(inventory.assetCount,2000);
});

test('published Release assets become stable classified entries with real download URLs',()=>{
  const r=release();const [entry]=releaseEntries([r],'vincent-arqain/Math');
  assert.equal(entry.section,'english');assert.equal(entry.category,'reading-types/inference');assert.equal(entry.title,'推理题');assert.equal(entry.file_size,MAX_FILE_BYTES);
  assert.equal(entry.attachmentPath,null);assert.equal(entry.attachmentUrl,r.assets[0].browser_download_url);assert.equal(entry.body,'原始推导 $x^2$\n');
  r.name='Renamed';r.tag_name='changed';assert.equal(releaseEntries([r],'vincent-arqain/Math')[0].id,entry.id);
  const html=renderToStaticMarkup(createElement(Article,{entry}));assert.ok(html.includes(r.assets[0].browser_download_url));assert.doesNotMatch(html,/href="\/files\//);
  assert.equal(releaseEntries([{...r,draft:true},{...r,prerelease:true},{...r,body:'ordinary release'}],'vincent-arqain/Math').length,0);
  assert.throws(()=>releaseEntries([{...r,assets:[]}],'vincent-arqain/Math'),/尚未附加/);
  assert.throws(()=>releaseEntries([release([asset(1,MAX_FILE_BYTES+1)])],'vincent-arqain/Math'),/500 MB/);
  assert.throws(()=>releaseEntries([release([{...asset(1),browser_download_url:'https://example.com/forged.pdf'}])],'vincent-arqain/Math'),/当前 GitHub 仓库/);
});
