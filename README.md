# Trazo

App de gym de Leo: sesión guiada de calentamiento, estiramiento y fuerza, registro de series con descanso automático, sugerencia de peso, medidas de flexibilidad y cuerpo, y tarjeta del día.

- **La app** (este repositorio) se publica con GitHub Pages: https://leoporp.github.io/trazo/
- **Los datos** viven en Supabase (el mismo proyecto de Fibra), en la tabla `trazo_state`. Cada cuenta solo ve lo suyo.
- **Configuración:** `config.js` lleva la dirección del proyecto y la clave pública. Nunca la clave secreta.
- **Base de datos:** `supabase/setup.sql` crea la tabla y las reglas de privacidad.

Los cambios a la app no tocan los datos: una actualización solo reemplaza el código.
