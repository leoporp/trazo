// Cambiar ejercicio en plena sesión (máquina ocupada): solo afecta la sesión, historial separado por variante.
// Uso: node tests/cambiar-ejercicio.test.js
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium}=PW;const http=require('http'),fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.woff2':'font/woff2','.png':'image/png'};
const MOCK=`window.supabase={createClient:()=>{const srv=(...a)=>window.__srv(...a);let session={user:{id:'uid-0',email:'leo@x.com'}};
 return {auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},
  from:()=>({upsert:async row=>{const r=await srv('upsert',row);return {error:r}},select:()=>({eq:(c,v)=>({maybeSingle:async()=>{const r=await srv('get',v);return r&&r.err?{data:null,error:r.err}:{data:r,error:null}}})})})}}};`;
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/vendor/supabase.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(MOCK);}
 if(u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('window.TRAZO_CONFIG={url:"x",key:"y"}');}
 const f=path.join(DIR,u==='/'?'index.html':u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));}else{res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};
// La fila de ejercicios del bloque no se devuelve al primero al tocar uno que estaba fuera de vista.
server.listen(8806,async()=>{const b=await chromium.launch();const errors=[];
 try{const ctx=await b.newContext({viewport:{width:360,height:740},serviceWorkers:'block'});await ctx.exposeBinding('__srv',()=>null);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:8806/');await p.waitForTimeout(500);
  const c=async sel=>{await p.click(sel);await p.waitForTimeout(150)};
  await c('[data-a=start]');await c('[data-a=jump][data-v=fue]');if(await p.$('[data-a=endtrans]'))await c('[data-a=endtrans]');
  const max=await p.$eval('.exr',e=>e.scrollWidth-e.clientWidth);ok(max>0,'la fila de fuerza se desplaza de lado ('+max+'px)');
  await p.$eval('.exr',e=>{e.scrollLeft=e.scrollWidth});const x0=await p.$eval('.exr',e=>e.scrollLeft);
  const btns=await p.$$('.exr button');await btns[btns.length-1].click();await p.waitForTimeout(200);
  const x1=await p.$eval('.exr',e=>e.scrollLeft);
  ok(x1>0&&Math.abs(x1-x0)<20,'al tocar el último la fila se queda ('+x0+' → '+x1+')');
  ok(await p.$eval('.exr button:last-child',e=>e.classList.contains('on')),'quedó elegido el último');
  await c('[data-a=prev]');const x2=await p.$eval('.exr',e=>e.scrollLeft);
  const vis=await p.$eval('.exr',r=>{const o=r.querySelector('button.on');const l=o.offsetLeft-r.offsetLeft;return l>=r.scrollLeft-1&&l+o.offsetWidth<=r.scrollLeft+r.clientWidth+1});
  ok(vis,'con "anterior" el ejercicio actual queda a la vista ('+x2+')');
 }catch(e){ok(false,'excepción '+e.message)}
 ok(errors.length===0,'sin errores '+errors.join(';'));await b.close();server.close();});
