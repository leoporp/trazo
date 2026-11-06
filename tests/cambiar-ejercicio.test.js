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
server.listen(8801,async()=>{const b=await chromium.launch();const errors=[];
 try{const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await ctx.exposeBinding('__srv',()=>null);const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:8801/');await p.waitForTimeout(500);
  const LS=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('trazo_v1')));
  const c=async sel=>{await p.click(sel);await p.waitForTimeout(120)};
  const toFue=async()=>{await c('[data-a=start]');await c('[data-a=jump][data-v=fue]');if(await p.$('[data-a=endtrans]'))await c('[data-a=endtrans]')};
  await c('[data-a=start]');
  let s0=await LS();
  ok(s0.draft.steps.filter(x=>x.t==='cal').length===1&&s0.draft.steps[0].id==='_cal','calentamiento = un solo paso libre');
  await c('[data-a=toggleset][data-id="_cal"]');s0=await LS();ok(s0.draft.log._cal.sets[0].done,'"Ya calenté" queda marcado');
  await c('[data-a=exitsession]');
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.draft.log._cal.sets[0].done=false;S.draft.step=S.draft.steps.length-1;localStorage.setItem('trazo_v1',JSON.stringify(S))});await p.reload();await p.waitForTimeout(300);
  await c('[data-a=start]');const nxt=await p.textContent('#sfoot');ok(!/Calentamiento/.test(nxt),'"Siguiente" no te devuelve al calentamiento: '+nxt.replace(/\s+/g,' ').trim());
  await c('[data-a=exitsession]');
  await toFue();
  const before=await LS();const D0=before.draft;const old=D0.steps[D0.step].id;const day=before.days.find(d=>d.id===D0.dayId);
  await c('[data-a=swap]');await p.fill('#swapq','Press declinado en máquina');await c('#swapnew');
  const title=await p.textContent('.ov h1');
  let s=await LS();const nid=s.draft.steps[s.draft.step].id;
  ok(title.trim()==='Press declinado en máquina'&&nid!==old,'crea la variante y la pone en el paso actual');
  ok(JSON.stringify(s.days.find(d=>d.id===D0.dayId).fue)===JSON.stringify(day.fue),'la rutina del día no cambia');
  ok(!s.draft.log[old],'el original sin series no queda como "sin hacer"');
  ok(s.ex[nid].sil==='declinado'&&s.ex[nid].how&&s.ex[nid].how.length>2,'"Press declinado en máquina" recibe su ficha (dibujo y pasos)');
  ok(s.draft.log._cal.sets[0].done,'ir a fuerza marca el calentamiento solo');
  await p.screenshot({path:path.join(DIR,'tests','shots-declinado.png')});
  const n=s.draft.log[nid].sets.length;
  for(let k=0;k<n;k++){await p.fill('#kg_'+nid+'_'+k,'30');await p.fill('#rp_'+nid+'_'+k,'10');await c('[data-a=toggleset][data-id="'+nid+'"][data-k="'+k+'"]');if(await p.$('[data-a=skiprest]'))await c('[data-a=skiprest]')}
  await c('.shead [data-a=finish]');if(await p.$('.confirm [data-a=finish]'))await c('.confirm [data-a=finish]');
  s=await LS();const last=s.sessions[s.sessions.length-1];
  ok(last&&last.ex[nid]&&!last.ex[old],'la sesión guarda la variante y no el original');
  ok(last.ex[nid].sets.every(x=>x.kg===30),'pesos guardados en la variante');
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.ex.xz={id:'xz',name:'Remo raro',block:'fue',kind:'reps',sets:3,target:'10',rest:90,sil:'empuje'};localStorage.setItem('trazo_v1',JSON.stringify(S))});
  await p.goto('http://localhost:8801/');await p.waitForTimeout(400);
  await c('[data-a=tab][data-v=progreso]');ok((await p.textContent('[data-a=fichacopy]')).includes('(1)'),'Progreso ofrece "Pedir fichas" solo para los que no tienen');
  await p.goto('http://localhost:8801/');await p.waitForTimeout(400);
  await toFue();await c('[data-a=swap]');
  ok(!!(await p.$('[data-a=swapto][data-v="'+nid+'"]')),'la variante aparece en la lista para la próxima vez');
  await p.fill('#swapq','declinado');
  const vis=await p.$$eval('#swaplist [data-n]',rs=>rs.filter(r=>r.style.display!=='none').map(r=>r.dataset.n));
  ok(vis.length===1&&vis[0].includes('declinado'),'el buscador filtra (sin tildes): '+vis.join(','));
  ok(await p.isVisible('#swapnew'),'si no coincide exacto, ofrece crear');
  await p.fill('#swapq','press declinado en maquina');
  ok(!(await p.isVisible('#swapnew')),'si ya existe con ese nombre (sin tildes), no ofrece crearlo de nuevo');
  await p.screenshot({path:path.join(DIR,'tests','shots-swap.png')});
  await c('[data-a=swapto][data-v="'+nid+'"]');
  const ph=await p.getAttribute('#kg_'+nid+'_0','placeholder');
  ok(ph==='30'||ph==='32,5'||ph==='32.5','sugiere peso desde su propio historial ('+ph+')');
  ok(!errors.length,'sin errores de JS '+(errors.join('; ')||''));
 }finally{await b.close();server.close();}});
