# Trazo: contexto para seguir trabajando

Trazo es la app de gym de Leo (hermana de Fibra, `leoporp/fibra`). La usa en un Android (Chrome, instalada en la pantalla de inicio). **Leo es el usuario final y el único usuario.** Se basó en la app de su amigo Duván (`duvangh27-oss/Rutina-Duvan`), pero adaptada a cómo entrena Leo.

Este archivo es el traspaso entre chats: léelo antes de tocar algo.

## Cómo trabajar con Leo

- Español, casual y directo. Honesto, sin condescendencia.
- Si no tienes más de 90 % de certeza de lo que quiere, hazle preguntas cerradas antes (con una opción recomendada).
- Nada de afirmaciones de salud como certezas; su fisio es Santiago (epicondilitis en los codos: por eso los ejercicios marcados "antebrazo").
- Después de cada cambio: `node tests/sync.test.js`, commit con atribución, `git push origin main` y decirle que cierre y abra la app.
- Respuestas finales cortas, en lenguaje de usuario.

## Arquitectura

- `index.html`: toda la app (HTML, CSS y JS vanilla, sin build). Estado en `localStorage` (`trazo_v1`), modelo `v:4` con `migrate()`.
- `config.js`: URL y **publishable key** del mismo proyecto Supabase de Fibra. Nunca la secret.
- `supabase/setup.sql`: tabla `trazo_state` (un JSON por usuario, RLS "solo lo propio"). Idempotente.
- Sincronización: `save()` marca `S.updatedAt` y sube a los 700 ms. Al abrir o volver a la app (`pull`): si la nube es más nueva se adopta, si el celular es más nuevo se sube. Con una sesión de entrenamiento abierta nunca se reemplaza nada (gana el celular). Sesión de Supabase en `trazo-auth` (Fibra usa `fibra-auth`; mismo origen `leoporp.github.io`, por eso claves distintas).
- Inicio de sesión: solo "Entrar" con la cuenta de Fibra (la creación de cuentas puede estar apagada en Supabase).
- `sw.js`: network-first, sirve sin internet (también cachea Google Fonts). Si cambias `SHELL`, sube `CACHE`.
- Hosting: GitHub Pages desde `main` del repo público `leoporp/trazo` → https://leoporp.github.io/trazo/. No metas datos personales en el código.

## Decisiones ya tomadas

- Diseño "Trazo": fondo hueso, acento azul acero, curvas orgánicas decorativas (nunca gráficas que parezcan datos y no se lean), tono de parcero con humor seco.
- Sesión: calentamiento → estiramiento → fuerza, con saltos libres entre bloques (no siempre entrena en el mismo orden).
- Plan propio Torso A / Pierna A / Torso B / Pierna B que rota; selector "Duván hace…" en Hoy para coincidir con él; "Hoy bailé" para que esa sesión no cuente para subir peso ni récords.
- Progresión: si completó el rango en todas las series, sugiere +2,5 kg (1 kg en laterales).

## Pendiente

- Leo todavía no la ha probado en el gym: después de la primera vez, preguntarle qué ajustar.
