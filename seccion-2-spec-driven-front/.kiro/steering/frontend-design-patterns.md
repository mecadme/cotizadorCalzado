# Patrones de Diseño — Frontend

Cuatro patrones livianos, expresables en JavaScript nativo sin librerías. Los patrones del backend (Strategy, Factory Method, Repository, DTO+Mapper, inyección de dependencias) no aplican aquí: el frontend no tiene reglas de negocio propias ni múltiples implementaciones intercambiables.

## Patrones aplicados

| Patrón | Dónde se aplica | Justificación |
|---|---|---|
| **Module pattern (ES Modules)** | `api.js` y `state.js` exportan únicamente funciones públicas con `export`; el resto de su contenido queda privado al archivo | Oculta detalles internos sin necesitar clases ni un framework |
| **Adapter** | `api.js` traduce el contrato OpenAPI del backend a funciones JavaScript simples (`obtenerTiposCalzado()`, `obtenerTiposReparacion()`, `generarCotizacion()`) | Si el contrato HTTP cambia, solo se ajusta este archivo; el resto de la app no lo nota |
| **Factory simple (función constructora)** | Una función `construirRequestCotizacion(estado)` arma el body de `POST /api/cotizaciones` a partir del estado actual | Evita construir ese objeto en más de un lugar si mañana se agrega otro punto de entrada |
| **Observer ligero (callback de suscripción)** | `state.js` expone una función `onCambio(callback)` que `app.js` usa para volver a pintar cuando el estado cambia | Evita que `app.js` tenga que acordarse de llamar a `render()` manualmente después de cada acción |

## Reglas de aplicación

- **Separación estricta de responsabilidades:** La manipulación de UI (`app.js`) no realiza peticiones HTTP directas; siempre consume `api.js`.
- **Estado centralizado:** Todo cambio de estado pasa por `state.js`; `app.js` nunca mutua variables de estado directamente.
- **Sin cálculos de negocio en el frontend:** El total, subtotal, recargo y tiempo estimado siempre vienen de la respuesta del backend. El frontend solo muestra lo que recibe.
