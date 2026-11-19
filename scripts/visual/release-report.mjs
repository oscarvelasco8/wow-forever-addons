import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");
 if(req.method!=='GET'||req.url!=='/'){res.writeHead(404).end();return;}
 try{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(await readFile(process.argv[2]==='github'?'docs/capturas/fase9-github-informe.html':'docs/capturas/fase9-paquete-informe.html'));}catch{res.writeHead(503).end();}
}).listen(4203,'127.0.0.1',()=>console.log('Informe local en http://127.0.0.1:4203'));
