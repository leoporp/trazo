// Prueba de sincronización con un Supabase simulado: dos dispositivos, inicio de sesión,
// subida, bajada y que una sesión de entrenamiento abierta no se pisa.
// Uso: node tests/sync.test.js   (necesita Playwright con Chromium)
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
fs.mkdirSync(__dirname+'/shots',{recursive:true});
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json'};
const SRV={db:{},users:{'leo@x.com':{pw:'secreto1',id:'uid-0'}}};
const MOCK=`window.supabase={createClient:(url,key,opts)=>{
 const srv=(...a)=>window.__srv(...a); let session=JSON.parse(localStorage.getItem('mock-session')||'null'); const L=[];
 const emit=ev=>L.forEach(f=>f(ev,session)); const setS=s=>{session=s; s?localStorage.setItem('mock-session',JSON.stringify(s)):localStorage.removeItem('mock-session');};
 return {auth:{getSession:async()=>({data:{session},error:null}),
   onAuthStateChange:f=>{L.push(f);return{data:{subscription:{unsubscribe(){}}}}},
   signInWithPassword:async({email,password})=>{const r=await srv('signin',email,password); if(r.error) return {data:{},error:r.error}; setS({user:{id:r.id,email}}); setTimeout(()=>emit('SIGNED_IN'),0); return {data:{session,user:session.user},error:null};},
   signOut:async()=>{setS(null); emit('SIGNED_OUT'); return {error:null};}},
  from:t=>{if(t!=='trazo_state')throw new Error('tabla '+t);return {upsert:async row=>(await srv('upsert',row),{error:null}),
    select:()=>({eq:(c,v)=>({maybeSingle:async()=>({data:await srv('get',v),error:null})})})}}};}};`;
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/vendor/supabase.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(MOCK);}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
server.listen(8794,async()=>{
 const b=await chromium.launch(); const errors=[];
 async function device(){ const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
   await ctx.exposeBinding('__srv',(src,op,...a)=>{
     if(op==='signin'){ const u=SRV.users[a[0]]; if(!u||u.pw!==a[1]) return {error:{message:'Invalid login credentials'}}; return {id:u.id}; }
     if(op==='upsert'){ SRV.db[a[0].user_id]=JSON.parse(JSON.stringify(a[0])); return true; }
     if(op==='get'){ const r=SRV.db[a[0]]; return r?{data:r.data}:null; }
   });
   const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message)); await p.goto('http://localhost:8794/'); await p.waitForTimeout(300); return p; }
 const login=async(p,pw='secreto1')=>{ await p.locator('[data-a="account"]').first().click(); await p.locator('#lemail').fill('leo@x.com'); await p.locator('#lpass').fill(pw); await p.locator('[data-a="signin"]').click(); await p.waitForTimeout(1200); };
 try{
  const phone=await device();
  ok(await phone.locator('text=Inicia sesión para guardar en la nube').count()===1,'Hoy invita a iniciar sesión');
  await phone.screenshot({path:__dirname+'/shots/hoy-sin-sesion.png',fullPage:true});
  await login(phone,'mala');
  ok((await phone.locator('#lmsg').innerText()).includes('incorrectos'),'contraseña mala da mensaje claro');
  await phone.locator('#lpass').fill('secreto1'); await phone.locator('[data-a="signin"]').click(); await phone.waitForTimeout(1200);
  ok(!!SRV.db['uid-0'],'al entrar sube los datos del celular');
  ok(await phone.locator('text=Inicia sesión para guardar en la nube').count()===0,'la invitación desaparece');
  // full session on the phone: start, mark first set, exit
  await phone.locator('[data-a="start"]').click(); await phone.waitForTimeout(300);
  await phone.locator('[data-a="toggleset"]').first().click(); await phone.waitForTimeout(900);
  ok(!!SRV.db['uid-0'].data.draft,'la sesión en curso se guarda en la nube');
  // pc: logs in and receives it
  const pc=await device(); await login(pc);
  const pcS=await pc.evaluate(()=>JSON.parse(localStorage.getItem('trazo_v1')));
  ok(pcS && pcS.draft && pcS.draft.dayId===SRV.db['uid-0'].data.draft.dayId,'el computador recibe la sesión del celular');
  // pc records a measure → phone (with session open) must not be overwritten, then wins when it pushes
  await pc.locator('[data-a="tab"][data-v="progreso"]').click();
  await pc.evaluate(()=>{});
  await pc.reload(); await pc.waitForTimeout(800);
  // phone edits during open session; a newer remote should not replace the open session
  SRV.db['uid-0'].data.updatedAt=Date.now()+60000; SRV.db['uid-0'].data.settings.goal=5;
  await phone.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await phone.waitForTimeout(800);
  const ph=await phone.evaluate(()=>JSON.parse(localStorage.getItem('trazo_v1')));
  ok(ph.draft && ph.draft.log && Object.values(ph.draft.log).some(x=>x.sets.some(s=>s.done)),'la sesión abierta no se pisa con la nube');
  // close session; then a pull adopts remote (goal 5) only if remote newer
  await phone.locator('[data-a="exitsession"]').click(); await phone.waitForTimeout(900);
  // phone saved on exit → phone now newer → remote should hold phone's data with the done set
  const rem=SRV.db['uid-0'].data;
  ok(Object.values(rem.draft.log).some(x=>x.sets.some(s=>s.done)),'al salir de la sesión, gana lo del celular');
  // pc goal change propagates to phone
  await pc.locator('[data-a="tab"][data-v="rutina"]').click(); await pc.locator('#setgoal').fill('4'); await pc.waitForTimeout(1000);
  await phone.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await phone.waitForTimeout(800);
  ok(await phone.locator('.pill b').innerText()==='0/4','el cambio de meta del computador llega al celular');
  await phone.locator('[data-a="tab"][data-v="rutina"]').click(); await phone.waitForTimeout(200);
  ok((await phone.locator('[data-a="account"] [data-sync]').innerText())==='Guardado en la nube','Rutina muestra el estado de la nube');
  await phone.screenshot({path:__dirname+'/shots/rutina.png',fullPage:true});
  await phone.locator('[data-a="account"]').click(); await phone.waitForTimeout(200);
  await phone.screenshot({path:__dirname+'/shots/cuenta.png'});
  await phone.locator('[data-a="signout"]').click(); await phone.waitForTimeout(300);
  ok(await phone.evaluate(()=>!!localStorage.getItem('trazo_v1')),'al cerrar sesión los datos siguen en el celular');
  ok(errors.length===0,'sin errores de JavaScript'+(errors.length?': '+errors.join(' | '):''));
 }catch(e){ ok(false,'excepción: '+e.message); }
 await b.close(); server.close();
});
