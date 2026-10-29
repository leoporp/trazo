// Recorre todas las pantallas con datos de ejemplo y guarda pantallazos en tests/shots/<nombre>/.
// Uso: node tests/pantallas.js [nombre]   (claro y oscuro). Imprime errores de JavaScript.
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const NAME=process.argv[2]||'actual';
const OUT=__dirname+'/shots/'+NAME; fs.mkdirSync(OUT,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/vendor/supabase.js'||u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
// Datos de ejemplo: 6 sesiones en 3 semanas y 3 medidas
function seed(){
  const S=JSON.parse(localStorage.getItem('trazo_v1')||'null'); if(!S) return false;
  const day=n=>{const d=new Date();d.setDate(d.getDate()-n);return d};
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const mk=(n,di,kg,danced)=>{const D=S.days[di];const ex={};
    D.fue.forEach((id,j)=>{const e=S.ex[id];ex[id]={name:e.name,block:'fue',sets:Array.from({length:e.sets*(e.side?2:1)},()=>({kg:e.kind==='time'?null:kg+j*5,reps:e.kind==='time'?null:10,done:true,secs:e.kind==='time'?40:null}))}});
    D.est.slice(0,3).forEach(id=>{const e=S.ex[id];ex[id]={name:e.name,block:'est',sets:Array.from({length:e.sets*(e.side?2:1)},()=>({kg:null,reps:e.kind==='time'?null:8,done:true,secs:e.kind==='time'?45:null}))}});
    const st=day(n);st.setHours(18,0,0,0);return {id:'s'+n,date:iso(st),start:st.getTime(),min:62+n%7,dayId:D.id,dayName:D.name,focus:D.focus,n:0,ex,records:[],danced:!!danced}};
  S.sessions=[mk(20,0,30),mk(18,1,40),mk(15,2,20),mk(13,3,30,true),mk(8,0,32.5),mk(6,1,42.5),mk(1,2,22.5)];
  S.sessions.forEach((s,i)=>s.n=i+1); S.next=3;
  S.measures=[{id:'m1',date:iso(day(21)),v:{p1:-12,t2:62,t3:60,peso:71.5,cintura:82}},{id:'m2',date:iso(day(11)),v:{p1:-9,t2:66,t3:63,peso:71}},{id:'m3',date:iso(day(2)),v:{p1:-7,t2:68,t3:66,peso:70.6,cintura:81}}];
  localStorage.setItem('trazo_v1',JSON.stringify(S)); return true;
}
server.listen(8796,async()=>{
 const b=await chromium.launch(); const errors=[];
 for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,colorScheme:scheme,serviceWorkers:'block'});
  const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(scheme+': '+e.message)); p.on('console',m=>{if(m.type()==='error')errors.push(scheme+' console: '+m.text())});
  const shot=async n=>{await p.waitForTimeout(250);await p.screenshot({path:OUT+'/'+scheme+'-'+n+'.png'})};
  await p.goto('http://localhost:8796/'); await p.waitForTimeout(300);
  await shot('01-hoy-vacio');
  await p.locator('[data-a="dance"]').click(); await p.locator('[data-a="dance"]').click();
  if(!(await p.evaluate(seed))) errors.push('no se pudo sembrar datos'); await p.reload(); await p.waitForTimeout(300);
  await shot('02-hoy'); await p.mouse.wheel(0,700); await shot('03-hoy-abajo'); await p.mouse.wheel(0,-2000);
  await p.locator('[data-a="duv"][data-v="espalda"]').click(); await shot('04-hoy-duvan');
  // sesión
  await p.locator('[data-a="start"]').click(); await shot('05-sesion-cal');
  await p.locator('[data-a="toggleset"]').first().click(); await shot('06-sesion-cal-marcada');
  await p.locator('[data-a="jump"][data-v="est"]').click(); await shot('07-sesion-est');
  await p.locator('[data-a="toggleset"]').first().click(); await shot('08-sesion-est-descanso');
  const hold=p.locator('[data-a="hold"]'); if(await hold.count()){ await p.locator('[data-a="goto"]').nth(2).click(); await p.locator('[data-a="hold"]').first().click(); await shot('09-sesion-mantener'); }
  await p.locator('[data-a="jump"][data-v="fue"]').click(); await shot('10-transicion');
  await p.waitForTimeout(1600); await shot('11-transicion-fin');
  await p.locator('[data-a="endtrans"]').click(); await shot('12-sesion-fuerza');
  await p.locator('[data-a="toggleset"]').first().click(); await shot('13-sesion-fuerza-descanso');
  await p.mouse.wheel(0,600); await shot('14-sesion-fuerza-abajo');
  await p.locator('.shead [data-a="finish"]').click(); await shot('15-terminar-confirmar');
  await p.locator('.confirm [data-a="finish"]').click();
  await shot('16-tarjeta');
  await p.locator('[data-a="cardimage"]').click(); await p.waitForTimeout(500); await shot('17-tarjeta-imagen');
  await p.locator('[data-a="closecard"]').click();
  // rutina
  await p.locator('[data-a="tab"][data-v="rutina"]').click(); await shot('20-rutina'); await p.mouse.wheel(0,1400); await shot('21-rutina-abajo'); await p.mouse.wheel(0,3000); await shot('22-rutina-ajustes'); await p.mouse.wheel(0,-6000);
  await p.locator('[data-a="editday"]').first().click(); await shot('23-editar-dia'); await p.locator('[data-a="closesheet"]').click();
  await p.locator('[data-a="editex"]').first().click(); await shot('24-editar-ejercicio'); await p.locator('[data-a="closesheet"]').click();
  await p.locator('[data-a="account"]').click(); await shot('25-cuenta'); await p.locator('[data-a="closesheet"]').click();
  // progreso
  await p.locator('[data-a="tab"][data-v="progreso"]').click(); await shot('30-progreso'); await p.mouse.wheel(0,800); await shot('31-progreso-medio'); await p.mouse.wheel(0,1200); await shot('32-progreso-abajo'); await p.mouse.wheel(0,-4000);
  await p.locator('.cta[data-a="measure"]').click(); await shot('33-medidas'); await p.locator('[data-a="closesheet"]').click();
  await p.locator('[data-a="sessinfo"]').first().click(); await shot('34-sesion-detalle'); await p.locator('[data-a="closesheet"]').click();
  // sesión olvidada de ayer
  await p.locator('[data-a="tab"][data-v="hoy"]').click(); await p.locator('[data-a="start"]').click(); await p.locator('[data-a="toggleset"]').first().click(); await p.locator('[data-a="exitsession"]').click();
  await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('trazo_v1'));S.draft.start-=86400000;S.draft.last=S.draft.start+600000;localStorage.setItem('trazo_v1',JSON.stringify(S))}); await p.reload(); await p.waitForTimeout(300);
  await shot('40-hoy-sesion-olvidada');
  await p.locator('[data-a="stalekeep"]').click(); await shot('41-guardada-ayer'); await p.locator('[data-a="closecard"]').click();
  await ctx.close();
 }
 console.log(errors.length?'ERRORES:\n'+errors.join('\n'):'Sin errores de JavaScript');
 await b.close(); server.close();
});
