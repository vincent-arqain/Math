import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../site.config.json' with {type:'json'};
const root=path.resolve('dist');
const base=new URL(config.siteUrl).pathname;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.pdf':'application/pdf','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname===base.slice(0,-1)){res.writeHead(301,{Location:base});res.end();return;}
    if(!url.pathname.startsWith(base))throw new Error('not found');
    let target=path.resolve(root,decodeURIComponent(url.pathname.slice(base.length)));
    if(target!==root&&!target.startsWith(root+path.sep))throw new Error('not found');
    if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(await fs.readFile(target));
  }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await fs.readFile(path.join(root,'404.html')));}
});
server.listen(4178,'127.0.0.1',()=>console.log(`Preview http://127.0.0.1:4178${base}`));
