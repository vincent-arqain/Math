import {createHash} from 'node:crypto';
import {parseDocument, type PublicEntry} from './content';
import {sections, validCategory, type Section} from './model';
import {validateUpload} from '../public/storage-policy.js';

export interface ReleaseAsset {id:number;name:string;size:number;state:string;browser_download_url:string;content_type:string;created_at:string;updated_at:string}
export interface LibraryRelease {id:number;tag_name:string;name:string;body:string|null;draft:boolean;prerelease:boolean;html_url:string;assets:ReleaseAsset[]}

export function releaseEntries(releases:LibraryRelease[], repository:string):PublicEntry[] {
  const result:PublicEntry[]=[];
  for(const release of releases) {
    if(release.draft || release.prerelease)continue;
    // Only explicitly marked library releases become articles. All release assets still count toward quota.
    if(!/^---\r?\n[\s\S]*?\blibrary:\s*true\s*\r?\n/.test(release.body||''))continue;
    const {meta,body}=parseDocument(release.body||'');
    if(meta.library!==true)continue;
    const field=(key:string,fallback='')=>{const v=meta[key];if(v===undefined)return fallback;if(typeof v!=='string')throw new Error(`Release ${release.tag_name} 的 ${key} 必须为文字`);return v;};
    const section=field('section');
    if(!Object.hasOwn(sections,section)||section==='links')throw new Error(`Release ${release.tag_name} 的栏目无效`);
    const category=field('category');
    if(section==='english'&&!validCategory(category))throw new Error(`未知英语分类：${category}`);
    const tags=meta.tags??[];
    if(!Array.isArray(tags)||tags.some(t=>typeof t!=='string'))throw new Error('Release tags 必须为文字数组');
    if(!release.assets.length)throw new Error(`资料尚未附加文件：${release.tag_name}`);
    const editUrl=`https://github.com/${repository}/releases/edit/${encodeURIComponent(release.tag_name)}`;
    for(const asset of release.assets) {
      validateUpload(asset,0);
      if(asset.state!=='uploaded')throw new Error(`文件尚未上传完成：${asset.name}`);
      const download=new URL(asset.browser_download_url);
      if(download.origin!=='https://github.com'||download.username||download.password||!download.pathname.startsWith(`/${repository}/releases/download/`))throw new Error('附件地址必须来自当前 GitHub 仓库的 Releases');
      for(const value of [asset.created_at,asset.updated_at])if(!Number.isFinite(Date.parse(value)))throw new Error('附件日期无效');
      const title=field('title',release.name||asset.name.replace(/\.[^.]+$/,''));
      result.push({id:createHash('sha256').update(`release-asset:${asset.id}`).digest('hex').slice(0,24),owner_id:'',section:section as Section,category,title:release.assets.length===1?title:`${title} · ${asset.name}`,description:field('description'),subject:field('subject'),tags:JSON.stringify(tags),body,source_url:'',status:'published',file_key:`release:${asset.id}`,file_name:asset.name,file_type:asset.content_type,file_size:asset.size,version:1,created_at:asset.created_at,updated_at:asset.updated_at,deleted_at:null,sourcePath:`release:${asset.id}`,attachmentPath:null,attachmentUrl:download.href,editUrl});
    }
  }
  return result;
}
