import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';

test('emitted backend loads every API using JavaScript imports, without TypeScript sources',async()=>{
 const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
 const options=ts.convertCompilerOptionsFromJson(config.config.compilerOptions,process.cwd()).options;
 assert.equal(options.rewriteRelativeImportExtensions,true);
 await mkdir('dist',{recursive:true});const root=await mkdtemp(resolve('dist/backend-packaging-'));
 const entries=[];
 async function compile(dir){for(const item of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,item.name);if(item.isDirectory()){await compile(path);continue;}
  if(!path.endsWith('.ts'))continue;
  const output=ts.transpileModule(await readFile(path,'utf8'),{fileName:path,compilerOptions:options}).outputText;
  assert.doesNotMatch(output,/(?:from\s*|import\s*\()(['"])[^'"\n]+\.ts\1/);
  const target=join(root,path.replace(/\.ts$/,'.js'));await mkdir(dirname(target),{recursive:true});await writeFile(target,output);
  if(dir==='api')entries.push('./'+path.replace(/\\/g,'/').replace(/\.ts$/,'.js'));
 }}
 try{
  await compile('api');await compile('server');
  const code=`for(const path of ${JSON.stringify(entries)}){const m=await import(path);if(typeof m.default!=='function')throw Error('Missing handler')}console.log('Loaded '+${entries.length});`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:root,encoding:'utf8',timeout:20000,env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH}});
  assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),'Loaded '+entries.length);
 }finally{await rm(root,{recursive:true,force:true});}
});
