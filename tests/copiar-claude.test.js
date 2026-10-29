// Prueba del botón "Copiar para Claude": arma una sesión y una medida, y revisa el texto.
// Uso: node tests/copiar-claude.test.js
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
fs.mkdirSync(__dirname+'/shots',{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/vendor/supabase.js'||u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
server.listen(8795,async()=>{
 const b=await chromium.launch(); const errors=[];
 try{
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('no'))}})});
  await p.goto('http://localhost:8795/'); await p.waitForTimeout(300);
  // sesión: marcar dos series de fuerza con peso
  await p.locator('[data-a="start"]').click(); await p.waitForTimeout(200);
  await p.locator('[data-a="jump"][data-v="fue"]').first().click().catch(()=>{});
  await p.waitForTimeout(300);
  if(await p.locator('[data-a="endtrans"]').count()) { await p.locator('[data-a="endtrans"]').click(); await p.waitForTimeout(200); }
  const kg=p.locator('input[data-in="kg"]').first(); await kg.fill('40');
  await p.locator('[data-a="toggleset"]').first().click(); await p.waitForTimeout(100);
  await p.locator('[data-a="finish"]').first().click().catch(async()=>{ await p.evaluate(()=>{}); });
  await p.waitForTimeout(400);
  if(await p.locator('[data-a="closecard"]').count()) await p.locator('[data-a="closecard"]').click();
  await p.waitForTimeout(200);
  // medida
  await p.locator('[data-a="tab"][data-v="progreso"]').click();
  await p.locator('.cta[data-a="measure"]').click(); await p.locator('#m_p1').fill('-8'); await p.locator('#m_peso').fill('70,5'); await p.locator('[data-a="savemeasure"]').click(); await p.waitForTimeout(200);
  await p.locator('[data-a="aicopy"]').click(); await p.waitForTimeout(300);
  const t=await p.locator('#aiout').inputValue();
  ok(t.startsWith('Datos de Trazo'),'el texto arranca bien');
  ok(t.includes('Torso A')&&t.includes('Pierna B'),'incluye la rutina');
  ok(/Fuerza · .+: 40×/.test(t),'incluye la serie con peso');
  ok(t.includes('Manos a los pies, espalda recta (cm) -8')&&t.includes('Peso (kg) 70,5'),'incluye las medidas');
  ok(t.includes('Semana del'),'incluye las semanas');
  ok(t.trim().endsWith('Analiza mi progreso con lo que dicen tus instrucciones.'),'termina con la instrucción');
  await p.screenshot({path:__dirname+'/shots/copiar-claude.png'});
  fs.writeFileSync(__dirname+'/shots/copiar-claude.txt',t);
  ok(errors.length===0,'sin errores de JavaScript'+(errors.length?': '+errors.join(' | '):''));
 }catch(e){ ok(false,'excepción: '+e.message); }
 await b.close(); server.close();
});
