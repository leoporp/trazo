// Barra (anotar solo discos), parecidos al cambiar ejercicio y estiramiento libre.
// Uso: node tests/barra-parecidos-estirar.test.js
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
server.listen(8803,async()=>{const b=await chromium.launch();const errors=[];
 try{const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await ctx.exposeBinding('__srv',()=>null);const p=await ctx.newPage();await p.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('no'))}})});p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:8803/');await p.waitForTimeout(500);
  const LS=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('trazo_v1')));
  const c=async sel=>{await p.click(sel);await p.waitForTimeout(120)};
  const toFue=async()=>{await c('[data-a=start]');await c('[data-a=jump][data-v=fue]');if(await p.$('[data-a=endtrans]'))await c('[data-a=endtrans]')};

  let s=await LS();
  ok(['f1','f11','f16','f17'].every(id=>s.ex[id].bar===true)&&!s.ex.f3.bar,'banca, sentadilla, hip thrust y rumano vienen con barra');
  // estiramiento libre
  await c('[data-a=start]');await c('[data-a=jump][data-v=est]');
  ok(await p.isVisible('[data-a=estfree]'),'en estiramiento sale "Hoy estiré a mi manera"');
  await c('[data-a=estfree]');s=await LS();
  ok(s.draft.estFree&&s.draft.log._cal.sets[0].done,'marca el estiramiento (y el calentamiento)');
  const tab=await p.textContent('[data-a=jump][data-v=est]');ok(/listo/.test(tab),'el bloque Estirar queda listo: '+tab.trim());
  const foot=await p.textContent('#sfoot');ok(/Press de banca/.test(foot),'"Siguiente" salta a fuerza: '+foot.replace(/\s+/g,' ').trim());
  await p.screenshot({path:path.join(DIR,'tests','shots-estirar.png')});
  // barra en press de banca
  await c('[data-a=jump][data-v=fue]');if(await p.$('[data-a=endtrans]'))await c('[data-a=endtrans]');
  s=await LS();ok(s.draft.steps[s.draft.step].id==='f1','en press de banca');
  const hd=await p.textContent('.sethead');ok(/DISCOS/.test(hd),'columna dice DISCOS');
  ok(await p.isChecked('input[data-in=bar]'),'chulito "Incluye barra" marcado');
  await p.fill('#kg_f1_0','40');await c('[data-a=toggleset][data-id=f1][data-k="0"]');
  await p.screenshot({path:path.join(DIR,'tests','shots-barra.png')});
  // parecidos
  await c('[data-a=next]');s=await LS();const cur=s.draft.steps[s.draft.step].id;
  await p.evaluate(()=>{});
  // ir a press militar si está en el día (Torso A: f1,f4,f3,...)
  const i3=s.draft.steps.findIndex(x=>x.id==='f3');await c('[data-a=goto][data-v="'+i3+'"]');
  await c('[data-a=swap]');
  const sims=await p.$$eval('[data-a=swapsust]',r=>r.map(x=>x.querySelector('b').textContent));
  ok(sims.includes('Press de hombro en máquina')&&sims.includes('Press militar en Smith'),'parecidos de press militar: '+sims.join(', '));
  await (await p.$('.how:has(#swapq)')).screenshot({path:path.join(DIR,'tests','shots-parecidos.png')});
  await c('[data-a=swapsust][data-v=hombromaq]');s=await LS();const nid=s.draft.steps[s.draft.step].id;const ne=s.ex[nid];
  ok(ne.name==='Press de hombro en máquina'&&ne.base==='f3'&&ne.how&&ne.how.length>2&&ne.sil==='militar','crea la variante con ficha y recuerda el original');
  ok(JSON.stringify(s.days.find(d=>d.id===s.draft.dayId).fue).includes('"f3"'),'la rutina sigue con el press militar');
  await c('[data-a=swap]');
  const back=await p.$$eval('[data-a=swapto]',r=>r.map(x=>x.dataset.v));ok(back.includes('f3'),'desde la variante puedes volver al original');
  await c('[data-a=swap]');
  // barra se puede quitar
  await c('[data-a=goto][data-v="'+s.draft.steps.findIndex(x=>x.id==='f1')+'"]');
  await p.click('input[data-in=bar]');await p.waitForTimeout(150);s=await LS();ok(s.ex.f1.bar===false,'se puede quitar el chulito');
  await p.click('input[data-in=bar]');await p.waitForTimeout(150);
  // terminar
  await c('[data-a=finish]');if(await p.$('[data-a=finish][data-sure]'))await c('.confirm [data-a=finish][data-sure]');
  s=await LS();const last=s.sessions[s.sessions.length-1];
  ok(last&&last.ex._est&&last.ex._est.name==='Estiramiento libre'&&last.ex.f1.bar===true,'la sesión guarda "Estiramiento libre" y que la banca fue con barra');
  if(await p.$('[data-a="closecard"]'))await c('[data-a="closecard"]');await c('[data-a="tab"][data-v="progreso"]');await c('[data-a="aicopy"]');await p.waitForTimeout(200);const txt=await p.inputValue('#aiout');ok(/Estiramiento libre/.test(txt)&&/solo discos/.test(txt),'Copiar para Claude lo menciona');
  // reabrir: un estado viejo sin barInit recibe las barras una vez, sin pisar si Leo la quitó
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));delete S.barInit;delete S.ex.f1.bar;S.ex.f17.bar=false;localStorage.setItem('trazo_v1',JSON.stringify(S))});
  await p.reload();await p.waitForTimeout(300);s=await LS();
  ok(s.ex.f1.bar===true&&s.ex.f17.bar===false,'migración: pone barra donde no había dato y respeta lo que quitaste');
  ok(!errors.length,'sin errores de JS '+(errors.join('; ')||''));
 }finally{await b.close();server.close();}});
