// Casos borde: botón atrás de Android, descanso tras cerrar la app, sin internet,
// día vacío, ejercicio borrado a mitad de sesión, récords, "Hoy bailé" y copia inválida.
// Uso: node tests/casos-borde.test.js
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2'};
const NET={down:false}; const DB={};
const MOCK=`window.supabase={createClient:()=>{const srv=(...a)=>window.__srv(...a);let session={user:{id:'uid-0',email:'leo@x.com'}};
 return {auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},
  from:()=>({upsert:async row=>{const r=await srv('upsert',row);return {error:r}},select:()=>({eq:(c,v)=>({maybeSingle:async()=>{const r=await srv('get',v);return r&&r.err?{data:null,error:r.err}:{data:r,error:null}}})})})}}};`;
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/vendor/supabase.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(MOCK);}
 if(u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('window.TRAZO_CONFIG={url:"x",key:"y"}');}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
server.listen(8798,async()=>{
 const b=await chromium.launch(); const errors=[];
 try{
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.exposeBinding('__srv',(src,op,a)=>{
    if(NET.down) return op==='get'?{err:{message:'Failed to fetch'}}:{message:'Failed to fetch'};
    if(op==='upsert'){DB[a.user_id]=JSON.parse(JSON.stringify(a));return null}
    if(op==='get'){const r=DB[a];return r?r.data:null}});
  const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
  const S=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('trazo_v1')));
  await p.goto('http://localhost:8798/'); await p.waitForTimeout(500);

  // 1. Botón atrás
  await p.locator('[data-a="tab"][data-v="rutina"]').click(); await p.waitForTimeout(100);
  await p.locator('[data-a="editday"]').first().click(); await p.waitForTimeout(100);
  await p.goBack(); await p.waitForTimeout(200);
  ok(await p.locator('.sheet').count()===0 && await p.locator('.nav button.on').innerText()==='Rutina','atrás con una hoja abierta en Rutina: cierra la hoja y sigue en Rutina');
  await p.locator('[data-a="editday"]').first().click(); await p.locator('[data-a="closesheet"]').click(); await p.waitForTimeout(200);
  ok(await p.locator('.nav button.on').innerText()==='Rutina','cerrar la hoja con la X no se lleva también la pestaña');
  await p.locator('[data-a="tab"][data-v="progreso"]').click(); await p.goBack(); await p.waitForTimeout(200);
  ok(await p.locator('.nav button.on').innerText()==='Hoy','atrás desde Progreso vuelve a Hoy (no cierra la app)');
  await p.locator('[data-a="tab"][data-v="rutina"]').click(); await p.locator('[data-a="tab"][data-v="hoy"]').click(); await p.waitForTimeout(150);
  await p.locator('[data-a="start"]').click(); await p.waitForTimeout(150);
  await p.goBack(); await p.waitForTimeout(200);
  ok(await p.locator('.ov').count()===0 && (await p.locator('[data-a="start"]').innerText()).includes('CONTINUAR'),'atrás en la sesión: sale y la deja para Continuar');

  // 2. Descanso sobrevive si Android cierra la app
  await p.locator('[data-a="start"]').click(); await p.locator('[data-a="jump"][data-v="est"]').click();
  await p.locator('[data-a="toggleset"]').first().click(); await p.waitForTimeout(300);
  ok((await S()).draft.rest && (await S()).draft.rest.total===30,'el descanso queda guardado en la sesión');
  await p.reload(); await p.waitForTimeout(400); await p.locator('[data-a="start"]').click(); await p.waitForTimeout(300);
  ok(await p.locator('#tv').count()===1,'al volver a abrir, el descanso sigue corriendo');
  await p.locator('[data-a="skiprest"]').click(); await p.waitForTimeout(100);
  ok(!(await S()).draft.rest,'saltar el descanso lo borra');

  // 3. Sin internet: se guarda local y sube al volver
  NET.down=true; await ctx.setOffline(true);
  await p.locator('[data-a="toggleset"]').nth(1).click(); await p.waitForTimeout(1200);
  const doneOff=(await S()).draft.log; await ctx.setOffline(false); NET.down=false;
  await p.evaluate(()=>window.dispatchEvent(new Event('online'))); await p.waitForTimeout(1200);
  const cloudDraft=DB['uid-0']&&DB['uid-0'].data.draft;
  ok(cloudDraft && JSON.stringify(cloudDraft.log)===JSON.stringify(doneOff),'lo marcado sin internet sube cuando vuelve la señal');

  // 4. Récord y "Hoy bailé"
  await p.locator('[data-a="jump"][data-v="fue"]').click(); await p.waitForTimeout(200);
  if(await p.locator('[data-a="endtrans"]').count()) await p.locator('[data-a="endtrans"]').click();
  const id=await p.locator('input[data-in="kg"]').first().getAttribute('data-id');
  await p.locator('#kg_'+id+'_0').fill('40'); await p.waitForTimeout(100);
  ok(await p.locator('#kg_'+id+'_1').getAttribute('placeholder')==='40','el peso de la serie 1 aparece como sugerencia en la 2');
  for(let k=0;k<3;k++){ await p.locator('[data-a="toggleset"][data-id="'+id+'"][data-k="'+k+'"]').click(); await p.waitForTimeout(80); if(await p.locator('[data-a="skiprest"]').count()) await p.locator('[data-a="skiprest"]').click(); }
  const st=await S(); ok(st.draft.log[id].sets.every(x=>x.done&&x.kg===40),'las 3 series quedan con 40 kg sin escribirlo tres veces');
  await p.locator('.shead [data-a="finish"]').click(); await p.locator('.confirm [data-a="finish"]').click(); await p.waitForTimeout(300);
  await p.locator('[data-a="closecard"]').click(); await p.waitForTimeout(200);
  // segunda sesión del mismo día con más peso → récord
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.next=0;localStorage.setItem('trazo_v1',JSON.stringify(S))}); await p.reload(); await p.waitForTimeout(300);
  await p.locator('[data-a="start"]').click(); await p.locator('[data-a="jump"][data-v="fue"]').click(); await p.waitForTimeout(200);
  if(await p.locator('[data-a="endtrans"]').count()) await p.locator('[data-a="endtrans"]').click();
  await p.locator('#kg_'+id+'_0').fill('45'); await p.locator('[data-a="toggleset"][data-id="'+id+'"][data-k="0"]').click(); await p.waitForTimeout(100);
  await p.locator('.shead [data-a="finish"]').click(); await p.locator('.confirm [data-a="finish"]').click(); await p.waitForTimeout(300);
  ok((await p.locator('#ov').innerText()).includes('Récord'),'subir de 40 a 45 kg marca récord');
  await p.locator('[data-a="closecard"]').click();
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.next=0;localStorage.setItem('trazo_v1',JSON.stringify(S))}); await p.reload(); await p.waitForTimeout(300);
  await p.locator('[data-a="dance"]').click(); await p.locator('[data-a="start"]').click(); await p.locator('[data-a="jump"][data-v="fue"]').click(); await p.waitForTimeout(200);
  if(await p.locator('[data-a="endtrans"]').count()) await p.locator('[data-a="endtrans"]').click();
  ok((await p.locator('.ov').innerText()).includes('Hoy bailaste'),'con "Hoy bailé" no pide subir peso');
  await p.locator('#kg_'+id+'_0').fill('60'); await p.locator('[data-a="toggleset"][data-id="'+id+'"][data-k="0"]').click();
  await p.locator('.shead [data-a="finish"]').click(); await p.locator('.confirm [data-a="finish"]').click(); await p.waitForTimeout(300);
  ok(!(await p.locator('#ov').innerText()).includes('Récord'),'una sesión tras bailar no cuenta para récords');
  await p.locator('[data-a="closecard"]').click();

  // 5. Ejercicio borrado a mitad de sesión
  await p.locator('[data-a="start"]').click(); await p.waitForTimeout(150); const first=(await S()).draft.steps[0].id; await p.locator('[data-a="exitsession"]').click();
  await p.locator('[data-a="tab"][data-v="rutina"]').click(); await p.locator('[data-a="editex"][data-v="'+first+'"]').click();
  await p.locator('[data-a="askconfirm"]').click(); await p.locator('[data-a="delex"]').click(); await p.waitForTimeout(150);
  await p.locator('[data-a="tab"][data-v="hoy"]').click(); await p.locator('[data-a="start"]').click(); await p.waitForTimeout(200);
  ok(await p.locator('.ov h1').count()===1 && !(await S()).draft.steps.some(x=>x.id===first),'la sesión sigue aunque se haya borrado uno de sus ejercicios');
  await p.locator('[data-a="exitsession"]').click();

  // 6. Día sin ejercicios
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.draft=null;S.days[0].cal=[];S.days[0].est=[];S.days[0].fue=[];S.next=0;S.sel=null;localStorage.setItem('trazo_v1',JSON.stringify(S))}); await p.reload(); await p.waitForTimeout(300);
  await p.locator('[data-a="start"]').click(); await p.waitForTimeout(200);
  ok(await p.locator('.ov').count()===0 && (await p.locator('#toast').innerText()).includes('no tiene ejercicios'),'un día vacío avisa en vez de abrir una sesión vacía');

  // 6b. Marcar una serie no devuelve la pantalla arriba (celular pequeño)
  await p.setViewportSize({width:360,height:640});
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.days[0].fue=['f1','f4'];localStorage.setItem('trazo_v1',JSON.stringify(S))}); await p.reload(); await p.waitForTimeout(300);
  await p.locator('[data-a="start"]').click(); await p.locator('[data-a="jump"][data-v="fue"]').click(); await p.waitForTimeout(150);
  if(await p.locator('[data-a="endtrans"]').count()) await p.locator('[data-a="endtrans"]').click();
  await p.evaluate(()=>{document.querySelector('#ov .ov').scrollTop=400}); const y0=await p.evaluate(()=>document.querySelector('#ov .ov').scrollTop);
  await p.locator('[data-a="toggleset"][data-k="1"]').first().click(); await p.waitForTimeout(150);
  const y1=await p.evaluate(()=>document.querySelector('#ov .ov').scrollTop);
  ok(y0>100 && Math.abs(y1-y0)<5,'marcar una serie deja la pantalla donde estaba ('+y0+' → '+y1+')');
  await p.locator('[data-a="skiprest"]').click(); await p.locator('[data-a="exitsession"]').click(); await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.draft=null;localStorage.setItem('trazo_v1',JSON.stringify(S))}); await p.reload(); await p.waitForTimeout(300);

  // 7. Copia de seguridad inválida
  await p.locator('[data-a="tab"][data-v="rutina"]').click(); await p.locator('[data-a="backup"]').click(); await p.locator('#bin').fill('esto no es una copia'); await p.locator('[data-a="askrestore"]').click(); await p.locator('[data-a="restore"]').click(); await p.waitForTimeout(150);
  ok((await p.locator('#toast').innerText()).includes('no es una copia válida') && (await S()).sessions.length>=3,'una copia inválida no borra nada');

  // 8. Migración a la versión 5: dibujos y pasos nuevos sin pisar lo personalizado
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.v=4;S.ex.f1.sil='empuje';delete S.ex.f1.how;delete S.ex.f1.ojo;S.ex.f4.sil='sentadilla';delete S.ex.f4.how;S.ex.f2.how=['mi paso'];localStorage.setItem('trazo_v1',JSON.stringify(S))});
  await p.reload(); await p.waitForTimeout(400);
  const m=await p.evaluate(()=>JSON.parse(localStorage.getItem('trazo_v1')));
  ok(m.v===5 && m.ex.f1.sil==='banca' && m.ex.f1.how && m.ex.f1.how.length>=3,'migración: el press de banca recibe su dibujo y sus pasos');
  ok(m.ex.f4.sil==='sentadilla','migración: un dibujo que cambiaste a mano se respeta');
  ok(m.ex.f2.how.length===1 && m.ex.f2.how[0]==='mi paso','migración: tus pasos escritos no se pisan');
  // 9. ¿Cómo se hace? se abre y se queda abierto al pasar de ejercicio
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.days[0].fue=['f1','f4','f2'];S.next=0;S.draft=null;localStorage.setItem('trazo_v1',JSON.stringify(S))}); await p.reload(); await p.waitForTimeout(300);
  await p.locator('[data-a="start"]').click(); await p.locator('[data-a="jump"][data-v="fue"]').click(); await p.waitForTimeout(150);
  if(await p.locator('[data-a="endtrans"]').count()) await p.locator('[data-a="endtrans"]').click();
  ok(await p.locator('.how').count()===0,'los pasos arrancan cerrados');
  await p.locator('[data-a="how"]').click(); await p.waitForTimeout(100);
  ok(await p.locator('.how li').count()>=3 && (await p.locator('.how').innerText()).includes('Ojo'),'¿Cómo se hace? muestra pasos y error común');
  await p.locator('[data-a="goto"]').nth(1).click(); await p.waitForTimeout(100);
  ok(await p.locator('.how').count()===1,'siguen abiertos en el siguiente ejercicio');
  ok(await p.locator('.bseg button.on').innerText().then(t=>t.includes('FUERZA')||t.includes('Fuerza')),'el bloque activo se marca arriba');
  await p.locator('[data-a="exitsession"]').click();
  ok(errors.length===0,'sin errores de JavaScript'+(errors.length?': '+errors.join(' | '):''));
 }catch(e){ ok(false,'excepción: '+e.message.split('\n')[0]); }
 await b.close(); server.close();
});
