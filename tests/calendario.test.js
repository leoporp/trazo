// Calendario de actividad (gym + baile) en Progreso y etiqueta al tocar un punto de las gráficas.
// Uso: node tests/calendario.test.js
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium}=PW;const http=require('http'),fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.woff2':'font/woff2','.png':'image/png'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/vendor/supabase.js'||u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 const f=path.join(DIR,u==='/'?'index.html':u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));}else{res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
server.listen(8807,async()=>{const b=await chromium.launch();const errors=[];
 try{const ctx=await b.newContext({viewport:{width:360,height:740},serviceWorkers:'block'});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:8807/');await p.waitForTimeout(400);
  await p.click('[data-a=dance]');await p.click('[data-a=dance]');await p.waitForTimeout(100);
  // datos de una versión anterior: sin danceDays, una sesión "tras bailar" y dos sesiones normales
  const today=new Date();const dA=new Date(today.getFullYear(),today.getMonth(),1),dB=new Date(today.getFullYear(),today.getMonth(),Math.min(2,today.getDate()));
  const A=iso(dA),B=iso(today);
  await p.evaluate(([A,B])=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));delete S.danceDays;S.dance=null;
    const id=S.days[0].fue[0];const mk=(sid,date,kg,reps,danced)=>({id:sid,date,start:new Date(date+'T18:00').getTime(),min:60,dayId:S.days[0].id,dayName:'Torso A',focus:'x',n:0,records:[],danced,ex:{[id]:{name:'Press',block:'fue',sets:[{kg,reps,done:true},{kg:kg-5,reps:12,done:true}]}}});
    S.sessions=[mk('a',A,40,8,true),mk('b',B,45,10,false)];localStorage.setItem('trazo_v1',JSON.stringify(S))},[A,B]);
  await p.reload();await p.waitForTimeout(400);
  const dd=await p.evaluate(()=>JSON.parse(localStorage.getItem('trazo_v1')).danceDays||null);
  // migrate corre al cargar; se guarda al primer save. Revisamos en memoria vía la vista.
  await p.click('[data-a=tab][data-v=progreso]');await p.waitForTimeout(250);
  const cA=await p.$eval('[data-a=calday][data-v="'+A+'"]',e=>e.className);
  ok(/\bg\b/.test(cA)&&/\bd\b/.test(cA),'la sesión "tras bailar" sale como gym + baile ('+cA+')');
  const cB=await p.$eval('[data-a=calday][data-v="'+B+'"]',e=>e.className);
  ok(/\bg\b/.test(cB)&&!/\bd\b/.test(cB)&&/today/.test(cB),'hoy: gym sin baile ('+cB+')');
  ok(!(await p.$('[data-a=calday][data-v="'+iso(new Date(today.getTime()+864e5))+'"]')),'los días futuros no se pueden tocar');
  ok(await p.$eval('.calnav [data-v="1"]',e=>e.disabled),'no deja ir a meses futuros');
  // marcar baile en un día sin gym (si el mes tiene un día pasado sin sesión)
  const free=await p.$$eval('[data-a=calday]',els=>{const e=els.find(x=>!x.classList.contains('g'));return e?e.dataset.v:null});
  if(free){await p.click('[data-a=calday][data-v="'+free+'"]');await p.waitForTimeout(200);
    ok(/Sin gym/.test(await p.textContent('.sheet')),'la hoja del día dice que no hubo gym');
    await p.click('[data-a=daydance]');await p.waitForTimeout(200);
    ok(await p.$eval('[data-a=daydance]',e=>e.getAttribute('aria-pressed')==='true'),'queda marcado "Bailé este día"');
    await p.click('[data-a=closesheet]');await p.waitForTimeout(200);
    ok(/\bd\b/.test(await p.$eval('[data-a=calday][data-v="'+free+'"]',e=>e.className)),'el día aparece con baile en el calendario');
    const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('trazo_v1')).danceDays);
    ok(saved.includes(free)&&saved.includes(A),'se guarda: '+saved.join(','));
    ok(!saved.includes(B),'hoy no quedó como baile');
  }
  // marcar hoy desde el calendario = "Hoy bailé"
  await p.click('[data-a=calday][data-v="'+B+'"]');await p.waitForTimeout(200);await p.click('[data-a=daydance]');await p.waitForTimeout(150);await p.click('[data-a=closesheet]');await p.waitForTimeout(150);
  await p.click('[data-a=tab][data-v=hoy]');await p.waitForTimeout(250);
  ok(await p.$eval('[data-a=dance]',e=>e.getAttribute('aria-pressed')==='true'),'marcar hoy en el calendario prende "Hoy bailé"');
  await p.click('[data-a=dance]');await p.waitForTimeout(150);
  ok(!(await p.evaluate(B=>JSON.parse(localStorage.getItem('trazo_v1')).danceDays.includes(B),B)),'apagar "Hoy bailé" lo quita del calendario');
  await p.click('[data-a=dance]');await p.waitForTimeout(150);
  ok(await p.evaluate(B=>JSON.parse(localStorage.getItem('trazo_v1')).danceDays.includes(B),B),'"Hoy bailé" lo pone en el calendario');
  // gráfica de fuerza: tocar un punto
  await p.click('[data-a=tab][data-v=progreso]');await p.waitForTimeout(250);
  const hits=await p.$$('.ch .hit');ok(hits.length>=2,'la gráfica tiene puntos tocables ('+hits.length+')');
  await p.$eval('.ch .hit',e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));await p.waitForTimeout(100);
  const tip=await p.$eval('.ch .tip text',e=>e.textContent).catch(()=>null);
  ok(tip&&/40 kg × 8/.test(tip),'el primer punto dice kg × reps y fecha: '+tip);
  await p.$eval('.ch .hit',e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));await p.waitForTimeout(100);
  ok(!(await p.$('.ch .tip')),'tocarlo otra vez lo quita');
  const r=await p.$eval('.ch',svg=>{svg.querySelectorAll('.hit')[1].dispatchEvent(new MouseEvent('click',{bubbles:true}));const t=svg.querySelector('.tip rect');return {x:+t.getAttribute('x'),w:+t.getAttribute('width'),W:svg.viewBox.baseVal.width}});
  ok(r.x>=0&&r.x+r.w<=r.W,'la etiqueta del último punto no se sale de la gráfica');
  // texto para Claude incluye los días de baile
  const txt=await p.evaluate(()=>new Promise(res=>{const o=navigator.clipboard.writeText;navigator.clipboard.writeText=t=>{res(t);return Promise.resolve()};document.querySelector('[data-a=aicopy]').click()}));
  ok(/Días de baile/.test(txt),'"Copiar para Claude" incluye los días de baile');
  ok(dd===null||Array.isArray(dd),'migración sin errores');
 }catch(e){ok(false,'excepción '+e.message)}
 ok(errors.length===0,'sin errores '+errors.join(';'));await b.close();server.close();});
