import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { galleryAsset } from './gallery-assets.mjs';
import { previewPage,previewAddon } from './pagination-data.mjs';
import { optimizeImage,IMAGE_WIDTHS } from '../../server/image-variants.ts';
import sharp from 'sharp';
const pngs=new Map();
const gallery=process.argv[2]==='gallery';
const pagination=process.argv[2]==='pagination';
const receipt=process.argv[2]==='receipt';
const support=process.argv[2]==='support'||process.argv[2]==='support-limit'||receipt;
const webhookReport=process.argv[2]==='webhook-report';
const stripeReport=process.argv[2]==='stripe-report';
const root=resolve(process.argv[2]==='assets'?'dist/assets-preview/browser':support?'dist/support-preview/browser':pagination?'dist/pagination-preview/browser':process.argv[2]==='categories'?'dist/categories-preview/browser':gallery?'dist/gallery-preview/browser':'dist/editorial-preview/browser');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Content-Security-Policy',`default-src 'self'; connect-src ${pagination||support?"'self'":"'none'"}; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'`);
  if(receipt&&req.url==='/api/support-status'){
    if(req.method!=='POST'){res.writeHead(405).end();return;}
    res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({mode:'test',state:process.argv[3]==='pending'?'pending':'paid',amount:300,currency:'eur'}));return;
  }
  if(support && req.url==='/api/support-checkout') {res.setHeader('Content-Type','application/json'); if(req.method==='GET'){res.writeHead(200).end(JSON.stringify({enabled:true,mode:'test',currency:'eur',amounts:[300,500,1000,2000]}));}else if(process.argv[2]==='support-limit'){res.writeHead(429,{'Retry-After':'60'}).end(JSON.stringify({error:'support_rate_limited',retryAfter:60}));}else{res.writeHead(503).end(JSON.stringify({error:'preview_no_stripe_connection'}));}return;}
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1:4201').pathname);}catch{res.writeHead(400).end();return;}
  const url=new URL(req.url,'http://127.0.0.1:4201');
  if(stripeReport){if(pathname!=='/'){res.writeHead(404).end();return;}try{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(await readFile('docs/capturas/fase6-stripe-validacion.html'));}catch{res.writeHead(503).end('Informe pendiente.');}return;}
  if(webhookReport){if(pathname!=='/'){res.writeHead(404).end();return;}try{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(await readFile('docs/capturas/fase6-webhook-informe-local.html'));}catch{res.writeHead(503).end('Run node scripts/verify-support-local.ts first.');}return;}
  if(pagination && (pathname==='/api/catalog'||pathname==='/api/addon')){try{const data=pathname==='/api/catalog'?previewPage(url):{addon:previewAddon(url.searchParams.get('slug'))};res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(data));}catch{res.writeHead(400).end('{}');}return;}
  if((gallery||pagination) && pathname==='/api/image'){
    const id=url.searchParams.get('image'),asset=galleryAsset(id);
    if(!asset){res.writeHead(404).end();return;}
    const size=url.searchParams.get('size');
    if(size && Object.hasOwn(IMAGE_WIDTHS,size)){try{if(!pngs.has(id)){pngs.set(id,await sharp(Buffer.from(asset)).png().toBuffer());}const bytes=await optimizeImage(pngs.get(id),size);res.writeHead(200,{'Content-Type':'image/webp','Content-Length':bytes.length}).end(bytes);}catch{res.writeHead(503).end();}return;}
    res.writeHead(200,{'Content-Type':'image/svg+xml'}).end(asset);return;
  }
  const path=resolve(root,'.'+pathname);
  if(path!==root && !path.startsWith(root+sep)){res.writeHead(403).end();return;}
  const target=extname(path)?path:resolve(root,'index.html');
  try{const bytes=await readFile(target);res.setHeader('Content-Type',types[extname(target)]??'application/octet-stream');res.writeHead(200).end(bytes);}catch{res.writeHead(404).end();}
}).listen(4201,'127.0.0.1',()=>console.log('Vista previa aislada: http://127.0.0.1:4201'));
