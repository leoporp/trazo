# Trazo: contexto para seguir trabajando

Trazo es la app de gym de Leo (hermana de Fibra, `leoporp/fibra`). La usa en un Android (Chrome, instalada en la pantalla de inicio). **Leo es el usuario final y el único usuario.** Se basó en la app de su amigo Duván (`duvangh27-oss/Rutina-Duvan`), pero adaptada a cómo entrena Leo.

Este archivo es el traspaso entre chats: léelo antes de tocar algo.

## Cómo trabajar con Leo

- Español, casual y directo. Honesto, sin condescendencia.
- Si no tienes más de 90 % de certeza de lo que quiere, hazle preguntas cerradas antes (con una opción recomendada).
- Nada de afirmaciones de salud como certezas; su fisio es Santiago (epicondilitis en los codos: por eso los ejercicios marcados "antebrazo").
- Después de cada cambio: correr `node tests/sync.test.js`, `node tests/copiar-claude.test.js` y `node tests/casos-borde.test.js` y `node tests/cambiar-ejercicio.test.js` y `node tests/fila-ejercicios.test.js` y `node tests/calendario.test.js`; si es visual, `node tests/pantallas.js nombre` (claro y oscuro; `VW=360 VH=740` para celular pequeño) y mirar `tests/shots/nombre/`. Luego commit con atribución, `git push origin main` y decirle que cierre y abra la app.
- Respuestas finales cortas, en lenguaje de usuario.

## Arquitectura

- `index.html`: toda la app (HTML, CSS y JS vanilla, sin build). Estado en `localStorage` (`trazo_v1`), modelo `v:5` con `migrate()` (4→5: `upgradeEx` pone dibujo y pasos nuevos solo si el ejercicio tenía el dibujo de fábrica / no tenía pasos; nunca pisa lo que Leo editó).
- `config.js`: URL y **publishable key** del mismo proyecto Supabase de Fibra. Nunca la secret.
- `supabase/setup.sql`: tabla `trazo_state` (un JSON por usuario, RLS "solo lo propio"). Idempotente.
- Sincronización: `save()` marca `S.updatedAt` y sube a los 700 ms. Al abrir o volver a la app (`pull`): si la nube es más nueva se adopta, si el celular es más nuevo se sube. Con una sesión de entrenamiento abierta nunca se reemplaza nada (gana el celular). Sesión de Supabase en `trazo-auth` (Fibra usa `fibra-auth`; mismo origen `leoporp.github.io`, por eso claves distintas).
- Inicio de sesión: solo "Entrar" con la cuenta de Fibra (la creación de cuentas puede estar apagada en Supabase).
- Primera sincronización de la cuenta en un celular (`trazo-synced-uid`): manda el más nuevo, pero se suman sesiones, medidas y la sesión en curso de los dos lados (`mergeLocal`), para que un celular recién instalado no pise la nube.
- Fuentes locales en `fonts/` (Oswald, Archivo, JetBrains Mono; licencia OFL): se ven igual sin señal y en la imagen de la tarjeta.
- Capas y botón atrás de Android: `stack` con 'tab' (Rutina/Progreso → atrás vuelve a Hoy), 'sheet', 'session', 'card'. `skipPop` evita que nuestro propio `history.back()` cierre otra capa. Para saber si hay algo encima de la vista usa `overlay()`, no `stack.length`.
- `sw.js`: network-first, sirve sin internet (también cachea Google Fonts). Si cambias `SHELL`, sube `CACHE`.
- Hosting: GitHub Pages desde `main` del repo público `leoporp/trazo` → https://leoporp.github.io/trazo/. No metas datos personales en el código.

## Decisiones ya tomadas

- **Dibujos** (`SIL`): figura articulada con largos fijos (`LEN`), ángulos absolutos (0 abajo, 90 adelante, 180 arriba) o cinemática inversa `{to,b}` (b=-1 rodilla hacia adelante/arriba). Uno por ejercicio con accesorios (banco, barra = disco azul, mancuerna, cable, máquina). Vista lateral mirando a la derecha; `front:1` para laterales, aperturas, abductores, mariposa. Extremidades del fondo en gris. Encuadre automático. Para revisar todos: hoja de contactos (inicio/final) antes de subir cambios. Los nombres viejos (`bisagra`, `core`…) se traducen con `silKey`.
- **¿Cómo se hace?**: botón en la sesión que abre los pasos (`e.how`, lista) y el error común (`e.ojo`); se queda abierto al pasar de ejercicio (`howOpen`). Editables en Rutina › ejercicio.
- **Jerarquía en la sesión** (pedida por Leo): arriba día y avance total; luego los bloques Calentar/Estirar/Fuerza como selector grande con su color (`BCOL`: seg1, seg2, accent) y barra de avance; debajo, los ejercicios del bloque como lista numerada más pequeña; luego etiqueta de color con el bloque y el título.

- Diseño "Trazo": fondo hueso, acento azul acero, curvas orgánicas decorativas (nunca gráficas que parezcan datos y no se lean), tono de parcero con humor seco.
- Sesión: calentamiento → estiramiento → fuerza, con saltos libres entre bloques (no siempre entrena en el mismo orden).
- Plan propio Torso A / Pierna A / Torso B / Pierna B que rota; selector "Duván hace…" en Hoy para coincidir con él; "Hoy bailé" para que esa sesión no cuente para subir peso ni récords.
- Progresión: si completó el rango en todas las series, sugiere +2,5 kg (1 kg en laterales). Al marcar una serie sin escribir reps se asume el tope del rango (pendiente de confirmar con Leo).
- En la sesión: el peso escrito en una serie se sugiere en las siguientes; marcar una serie no mueve la pantalla; la fila de ejercicios del bloque conserva su desplazamiento lateral al cambiar de ejercicio y corre lo justo para mostrar el actual; el descanso se guarda en `draft.rest` y sigue si Android cierra la app; "Terminar" arriba pide confirmación si faltan ejercicios (el botón de abajo, cuando ya no queda nada, termina directo).
- Sesión olvidada de otro día: Hoy pregunta si guardarla con su fecha o descartarla; la duración se cuenta hasta la última serie marcada (`draft.last`), máximo 4 h.
- "Arrancar" va fijo abajo en Hoy, encima de la barra; los avisos salen arriba para no tapar botones.
- **Segunda opinión con IA** (Progreso → "Copiar para Claude", igual que en Fibra): copia un resumen en texto de las últimas 4 semanas (rutina, sin repetir calentamiento y estiramiento si son iguales en todos los días; semanas; sesiones con kg × reps; todas las medidas). Leo lo pega en un proyecto suyo de Claude con instrucciones de "entrenador". Esas instrucciones NO van en este repo (es público y tienen datos de salud). Solo copiar; si el portapapeles falla, se abre una hoja con el texto.

- **Cambiar ejercicio en la sesión** (máquina ocupada; pedido por Leo): botón bajo "¿Cómo se hace?" abre la lista de la biblioteca del mismo bloque o crea una variante con solo el nombre (copia series, reps, descanso, dibujo y marca de antebrazo del actual). Solo cambia el paso de esta sesión; la rutina del día no se toca. Cada variante es un ejercicio aparte → historial de peso, sugerencia y récords separados (Leo lo quiso así: el peso no es comparable). Si el original no tenía series marcadas, se descarta de la sesión; si tenía, se guarda igual. Test: `node tests/cambiar-ejercicio.test.js`.

- **Buscador al cambiar**: un solo campo filtra la biblioteca del bloque (sin tildes, por palabras) y, si no hay uno con ese nombre exacto, ofrece "+ Crear «…»".
- **Calentamiento libre** (pedido por Leo): en la sesión es un paso virtual `_cal` (`WARM`, `exOf('_cal')`) con un solo botón "Ya calenté"; se marca solo al ir a estirar/fuerza o al marcar cualquier serie (`autoWarm`). "Siguiente" nunca vuelve al calentamiento (`nextIdx`). `d.cal` sigue en los datos pero ya no se usa ni se muestra en Rutina; ~10 min fijos (`WARM_MIN`).
- **Fichas** (dibujo + ¿Cómo se hace? para ejercicios creados por Leo): un ejercicio sin `how` es "sin ficha" (`sinFicha`); Progreso muestra "Pedir fichas (N)" que copia la lista. Leo la pega en el chat; Claude agrega la entrada a `FICHAS` (por nombre normalizado, con alias en `n`) y, si hace falta, un dibujo nuevo en `SIL`. `migrate()` llama `applyFichas` al cargar y al traer de la nube; solo rellena si el ejercicio no tiene pasos (no pisa lo editado). Ya están: Press declinado (`SIL.declinado`), Seated dip = fondos sentado en máquina (`SIL.dipmaq`).
- `norm()` va antes de `FICHAS` porque `migrate` corre al cargar (TDZ: si se define después, la app no abre).

- **Rango mínimo en gráficas** (pedido por Leo: milímetros no deben verse como cambios grandes): `SPAN`/`minSpan`/`yRange`. Peso 10 kg, cintura/cadera/pecho 8 cm, muslo 6, brazo 4, otras en cm 6, flexibilidad en ° 20, kg de ejercicios 10. Si los datos superan el rango, se usa el rango real.

- **Calendario de actividad** (pedido por Leo, como el de Duván): arriba en Progreso, por mes (lunes primero, sin meses futuros). Gym = día relleno azul (hay sesión ese día); baile = borde `--dance` (malva); ambos = relleno + anillo. Tocar un día pasado abre una hoja con "Bailé este día" y las sesiones de ese día. Los días de baile viven en `S.danceDays` (fechas ISO), aparte de las sesiones: sirve para días que baila y no va al gym. `fillDance` (en `migrate`) lo arma la primera vez con las sesiones `danced` y `S.dance`. "Hoy bailé" y el calendario usan `setDance` (hoy también toca `S.dance` y `draft.danced`). `mergeLocal` une los días de los dos lados. "Copiar para Claude" incluye los días de baile y cuántos por semana. Un solo tipo de baile (Leo no quiso distinguir ballet/contemporáneo).
- **Tocar un punto en las gráficas** (`chartTip`): etiqueta con valor y fecha; fuerza muestra la mejor serie como kg × reps. Tocar el mismo punto la quita.

## Pendiente

- No se puede: avisar con el celular bloqueado cuando termina el descanso (es una web app sin servidor de notificaciones). Con la pantalla prendida suena y vibra.

- Leo todavía no la ha probado en el gym: después de la primera vez, preguntarle qué ajustar.
