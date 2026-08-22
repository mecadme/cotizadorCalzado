# Implementation Plan: Cotizador UI

## Overview

Implementar el Cotizador de Calzado como una aplicación web de página única usando HTML5 semántico, CSS3 y JavaScript ES Modules vanilla, sin framework ni bundler. La arquitectura sigue tres módulos independientes: `api.js` (adaptador HTTP), `state.js` (estado en memoria con Observer), y `app.js` (coordinación DOM). Las pruebas se escriben con Vitest + jsdom + fast-check.

---

## Tasks

- [x] 1. Estructura base — `index.html` y `css/estilos.css`
  - [x] 1.1 Crear `index.html` con esqueleto semántico completo
    - Incluir `<div id="indicador-carga-catalogo" aria-live="polite" hidden>` para el estado UI-E1
    - `<form id="cotizador-form" novalidate>` con tres fieldsets: `#fs-calzado`, `#fs-reparaciones`, `#fs-urgencia`
    - `<select id="tipo-calzado-select" disabled required>` con opción placeholder `<option value="" disabled selected>Selecciona un tipo</option>`
    - `<button type="button" id="btn-cotizar" disabled>Cotizar</button>` con texto visible
    - `<div id="mensaje-error" role="alert" aria-live="assertive" hidden></div>`
    - `<section id="resultado-cotizacion" aria-live="polite" hidden>` con spans: `#resultado-subtotal`, `#resultado-recargo`, `#resultado-total`, `#resultado-tiempo`
    - `<label for="urgencia-checkbox">` asociado a `<input type="checkbox" id="urgencia-checkbox" disabled>`
    - Cargar `js/app.js` con `<script type="module" src="js/app.js"></script>` al final del body
    - Todos los controles inicialmente `disabled` para UI-E1
    - _Requirements: 1.2, 1.3, 2.2, 4.1, 5.1, 5.5, 6.5, 9.1, 9.2, 9.3, 9.4, 10.1–10.5_

  - [x] 1.2 Crear `css/estilos.css` con estilos visuales
    - Layout principal (flexbox o grid) para la pantalla única
    - Estilos del fieldset de reparaciones para lista de checkboxes
    - Estilos del `#btn-cotizar[disabled]`: `opacity: 0.4; cursor: not-allowed;`
    - Estilos del `#resultado-cotizacion` (oculto/visible, destacado visual del total)
    - Estilos del `#mensaje-error` (color de alerta, visible/oculto)
    - Estilos del `#indicador-carga-catalogo` (visible durante UI-E1)
    - _Requirements: 5.5, 6.3, 7.1_

- [x] 2. Módulo `js/api.js` — adaptador HTTP
  - [x] 2.1 Implementar `api.js` con las tres funciones exportadas y la clase `ApiError`
    - Declarar constante `API_BASE_URL = 'http://localhost:8080/api'`
    - Implementar `export async function obtenerTiposCalzado()`: GET a `/api/tipos-calzado`, devuelve `TipoCalzado[]`, lanza `ApiError` si no es 2xx o hay error de red
    - Implementar `export async function obtenerTiposReparacion()`: GET a `/api/tipos-reparacion`, devuelve `TipoReparacion[]`, lanza `ApiError` si no es 2xx o hay error de red
    - Implementar `export async function generarCotizacion(request)`: POST a `/api/cotizaciones` con body JSON; traduce `request.esUrgente` → campo `urgente` al serializar el body (contrato OpenAPI); lanza `ApiError` con `statusCode=400` y `detail=ProblemDetails.detail` para 400, `statusCode=0` para error de red sin respuesta, `statusCode=5xx` para otros errores del servidor
    - Clase `ApiError` con propiedades `statusCode`, `detail`, y opcionalmente `type`
    - Estrategia de propagación: todo error se encapsula como `ApiError`; `app.js` no interpreta HTTP directamente
    - _Requirements: 1.1, 6.1, 7.1, 7.3, 7.4_

  - [x]* 2.2 Escribir pruebas unitarias U-06 y U-07 para la serialización de `generarCotizacion`
    - U-06: verificar que `api.js` serializa `esUrgente: true` como `"urgente": true` en el body del POST
    - U-07: verificar que `api.js` serializa `esUrgente: false` como `"urgente": false` en el body del POST
    - Usar `vi.stubGlobal('fetch', ...)` o equivalente para interceptar el fetch sin red real
    - _Requirements: 6.1_

- [x] 3. Módulo `js/state.js` — estado en memoria con Observer
  - [x] 3.1 Implementar `state.js` con `getEstado()`, `setEstado(cambios)` y `onCambio(callback)`
    - Estado inicial: `{ catalogoCalzado: [], catalogoReparaciones: [], tipoCalzadoId: '', reparacionesIds: new Set(), esUrgente: false, ultimaCotizacion: null, fase: 'idle' }`
    - `export function getEstado()`: devuelve copia superficial del estado actual (no la referencia interna)
    - `export function setEstado(cambios)`: aplica los cambios al estado interno y notifica a todos los callbacks registrados con `onCambio`
    - `export function onCambio(callback)`: registra un callback invocado cada vez que el estado cambia; soporta múltiples suscriptores
    - Sin referencias a `document`, `window`, ni `fetch` — el módulo es puro en términos de efectos secundarios de red/DOM
    - _Requirements: estado interno — base para Req 1–10_

  - [x]* 3.2 Escribir pruebas unitarias de `state.js`
    - Verificar estado inicial completo (todos los campos con sus valores por defecto)
    - Verificar que `setEstado` notifica a todos los observadores registrados con `onCambio`
    - Verificar que `getEstado` devuelve copia y no la referencia interna (mutarla no afecta el estado)
    - _Requirements: 10.1–10.5_

- [x] 4. Módulo `js/app.js` — carga del catálogo y renderizado inicial
  - [x] 4.1 Implementar `init()` y `cargarCatalogo()` en `app.js`
    - `init()`: registrar el callback de `onCambio` con la función de renderizado, luego llamar `cargarCatalogo()`
    - `cargarCatalogo()`: transicionar `fase` a `'loading-catalogo'`, mostrar `#indicador-carga-catalogo`, deshabilitar todos los controles; usar `Promise.all([obtenerTiposCalzado(), obtenerTiposReparacion()])` para las dos peticiones simultáneas; si ambos arrays tienen al menos un elemento, llamar `renderizarCalzado` y `renderizarReparaciones` y transicionar a `fase: 'idle'` habilitando controles; si alguno falla o devuelve array vacío, transicionar a `fase: 'error'` y mostrar mensaje en `#mensaje-error`
    - Llamar `init()` al arrancar el módulo (nivel superior del script)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Implementar `renderizarCalzado(estado)` en `app.js`
    - Vaciar el select `#tipo-calzado-select` conservando solo la opción placeholder
    - Añadir un `<option value="{id}">{nombre}</option>` por cada elemento de `estado.catalogoCalzado`
    - Habilitar `#tipo-calzado-select` si la fase no es `'loading-catalogo'`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.3 Implementar `renderizarReparaciones(estado)` en `app.js`
    - Vaciar el fieldset `#fs-reparaciones`
    - Por cada elemento de `estado.catalogoReparaciones`, crear `<label for="rep-{id}">` con `<input type="checkbox" id="rep-{id}" value="{id}" disabled>` + texto `{nombre} — $ {precioBase.toFixed(2)}`
    - Registrar listener `change` en cada checkbox recién creado que actualice `reparacionesIds` en el estado
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Módulo `js/app.js` — habilitación del botón y reset inmediato
  - [x] 5.1 Implementar `sincronizarBoton(estado)` en `app.js`
    - Evaluar la regla UI-01: `habilitado = estado.tipoCalzadoId !== '' && estado.reparacionesIds.size >= 1`
    - Si `habilitado` y `fase` no bloquea (no es `'loading-catalogo'` ni `'cotizando'`): eliminar atributo `disabled` del botón; si no, añadir `disabled`
    - Llamar `sincronizarBoton` dentro del callback de `onCambio` para evaluación reactiva
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.3_

  - [x] 5.2 Registrar listeners de `change` para reset inmediato del panel y del error
    - `change` en `#tipo-calzado-select`: actualizar `tipoCalzadoId` en estado; si `fase === 'resultado'` u `fase === 'error'`, llamar `ocultarResultado()` y `limpiarError()` inmediatamente (mismo ciclo de evento)
    - `change` en cualquier checkbox de `#fs-reparaciones`: actualizar `reparacionesIds` en estado (añadir o eliminar según `checked`); si `fase === 'resultado'` u `fase === 'error'`, llamar `ocultarResultado()` y `limpiarError()` inmediatamente
    - `change` en `#urgencia-checkbox`: actualizar `esUrgente` en estado; si `fase === 'resultado'` u `fase === 'error'`, llamar `ocultarResultado()` y `limpiarError()` inmediatamente
    - _Requirements: 7.5, 8.1, 8.2, 8.3_

- [x] 6. Módulo `js/app.js` — cotización, renderizado del resultado y errores
  - [x] 6.1 Implementar `handleCotizar()` en `app.js`
    - Obtener el estado actual con `getEstado()`
    - Llamar `construirRequestCotizacion(estado)` para obtener el body del POST
    - Transicionar `fase` a `'cotizando'` y deshabilitar `#btn-cotizar`
    - Llamar `generarCotizacion(request)` de `api.js`
    - Si 201: guardar `ultimaCotizacion` en estado, transicionar `fase` a `'resultado'`, llamar `renderizarResultado(cotizacion)`; si `renderizarResultado` lanza, capturar y transicionar a `fase: 'error'` con mensaje genérico
    - Si `ApiError` con `statusCode === 400`: transicionar `fase` a `'error'`, mostrar `error.detail` en `#mensaje-error`; preservar `tipoCalzadoId`, `reparacionesIds` y `esUrgente` intactos
    - Si `ApiError` con `statusCode === 0` (red): transicionar a `fase: 'error'`, mostrar mensaje genérico "No fue posible completar la solicitud"
    - Si `ApiError` con `statusCode >= 500`: transicionar a `fase: 'error'`, mostrar mensaje genérico de error de servidor sin detalles técnicos
    - Registrar listener `click` en `#btn-cotizar` → `handleCotizar` en `init()`
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_

  - [x] 6.2 Implementar `construirRequestCotizacion(estado)` en `app.js`
    - Función pura (sin efectos secundarios): recibe `AppState`, devuelve `{ tipoCalzadoId, tipoReparacionIds: Array.from(estado.reparacionesIds), esUrgente: estado.esUrgente }`
    - Exportar la función para que sea testeable directamente
    - _Requirements: 6.1_

  - [x] 6.3 Implementar `renderizarResultado(cotizacion)`, `mostrarError(mensaje)`, `limpiarError()` y `ocultarResultado()` en `app.js`
    - `renderizarResultado(cotizacion)`: escribir en `#resultado-subtotal` el valor `cotizacion.moneda + ' ' + cotizacion.subtotal.toFixed(2)`, en `#resultado-recargo` el `recargoUrgencia.toFixed(2)` con moneda, en `#resultado-total` el `total.toFixed(2)` con moneda, en `#resultado-tiempo` el `String(cotizacion.tiempoEstimadoDias)`; siempre mutar el contenido del DOM (incluso si el valor es idéntico al anterior) para forzar el anuncio `aria-live`; mostrar `#resultado-cotizacion` (eliminar `hidden`)
    - `mostrarError(mensaje)`: escribir `mensaje` en `#mensaje-error` y eliminar `hidden`
    - `limpiarError()`: vaciar `#mensaje-error` y añadir `hidden`
    - `ocultarResultado()`: añadir `hidden` a `#resultado-cotizacion`
    - _Requirements: 6.3, 6.4, 6.5, 9.4, 9.5_

- [x] 7. Checkpoint — Módulos completos
  - Ejecutar `npx vitest --run` y asegurarse de que todas las pruebas existentes pasan. Verificar manualmente en navegador que el catálogo carga y los controles se habilitan. Consultar al usuario si hay dudas antes de continuar.

- [x] 8. Pruebas unitarias (Vitest + jsdom)
  - [x] 8.1 Crear `package.json`, `vitest.config.js` y configurar el entorno de pruebas
    - `package.json` con `"type": "module"` y dependencias de desarrollo: `vitest`, `fast-check`, `jsdom`
    - `vitest.config.js` con `environment: 'jsdom'` para las pruebas de DOM
    - _Requirements: estrategia de pruebas del diseño_

  - [x]* 8.2 Escribir pruebas unitarias U-01 a U-05 — estado inicial del DOM
    - U-01: `#tipo-calzado-select` tiene `disabled` y opción placeholder presente con `value=""`
    - U-02: todos los checkboxes de reparación desmarcados, `#btn-cotizar` disabled, `#resultado-cotizacion` hidden al cargar
    - U-03: después de cargar el catálogo, el select contiene exactamente N+1 opciones (N ítems + placeholder)
    - U-04: cada checkbox de reparación muestra `nombre` y `precioBase.toFixed(2)` con símbolo de moneda
    - U-05: error de red al cargar catálogo: `#mensaje-error` visible, selector y checkboxes siguen deshabilitados
    - _Requirements: 1.2, 1.3, 1.5, 2.1, 2.2, 3.1, 10.1–10.5_

  - [x]* 8.3 Escribir pruebas unitarias U-08 a U-11 — accesibilidad estática
    - U-08: `#btn-cotizar` tiene `textContent` no vacío (no depende solo de ícono)
    - U-09: cada control de formulario tiene `<label>` vinculado con `for`/`id` correspondiente
    - U-10: `#resultado-cotizacion` tiene `aria-live="polite"` presente en el DOM desde la carga inicial
    - U-11: `#mensaje-error` tiene `role="alert"` y `aria-live="assertive"` en el HTML inicial
    - _Requirements: 9.1, 9.2, 9.4_

  - [x]* 8.4 Escribir pruebas unitarias U-12 a U-15 — manejo de errores y panel de resultado
    - U-12: error 400 — la selección de calzado, reparaciones y urgencia no cambia tras recibir el error
    - U-13: error de red — el botón se rehabilita si la selección sigue siendo válida (fase vuelve a `'error'`, no bloquea botón)
    - U-14: backend responde 5xx — `#mensaje-error` muestra mensaje genérico sin detalles técnicos
    - U-15: `#resultado-cotizacion` hidden en estado inicial y en UI-E2 (antes de la primera cotización exitosa)
    - _Requirements: 6.5, 7.2, 7.3, 7.4_

- [x] 9. Pruebas de propiedades (fast-check, mínimo 100 iteraciones cada una)
  - [x]* 9.1 Escribir PBT-01 — Carga del catálogo concurrente
    - **Property 1: cargarCatalogo() hace exactamente 2 GETs simultáneos; controles habilitados solo si ambos arrays son no vacíos**
    - **Validates: Requirements 1.1, 1.4**
    - Generadores: `fc.array(tipoCalzadoArbitrary, { minLength: 0, maxLength: 10 })` y `fc.array(tipoReparacionArbitrary, { minLength: 0, maxLength: 10 })`
    - Invariantes: `fetch` llamado exactamente 2 veces; si ambos arrays tienen `length > 0` → controles habilitados (`fase !== 'error'`); si alguno es `[]` → controles deshabilitados (`fase === 'error'`)

  - [x]* 9.2 Escribir PBT-02 — Habilitación del botón Cotizar
    - **Property 2: btn.disabled === !(tipoCalzadoId !== '' && reparacionesIds.size >= 1)**
    - **Validates: Requirements 5.2, 5.3, 5.4, 9.3**
    - Generadores: `fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 }))` para `tipoCalzadoId`; `fc.array(fc.string({ minLength: 1 }), { maxLength: 5 })` para IDs de reparaciones
    - Invariante: `setEstado({ tipoCalzadoId, reparacionesIds: new Set(ids) }); sincronizarBoton(getEstado()); expect(btn.disabled).toBe(!(tipoCalzadoId !== '' && ids.length > 0))`

  - [x]* 9.3 Escribir PBT-03 — Request bien formado
    - **Property 3: construirRequestCotizacion(estado) produce siempre un objeto con los campos requeridos correctos**
    - **Validates: Requirements 6.1, 3.2, 3.3, 4.2, 4.3**
    - Generadores: `fc.string({ minLength: 1, maxLength: 20 })` para `tipoCalzadoId`; `fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 })` para reparaciones; `fc.boolean()` para `esUrgente`
    - Invariantes: `req.tipoCalzadoId` es string no vacío idéntico al del estado; `req.tipoReparacionIds` es array con exactamente los IDs del Set (mínimo 1); `req.esUrgente` es boolean idéntico al del estado

  - [x]* 9.4 Escribir PBT-04 — Visualización fiel de la respuesta del backend
    - **Property 4: renderizarResultado() muestra exactamente los valores recibidos del backend sin transformaciones aritméticas**
    - **Validates: Requirements 6.3, 6.4, 9.5**
    - Generadores: `fc.float({ min: 0.01, max: 9999.99, noNaN: true })` para `subtotal`, `recargoUrgencia`, `total`; `fc.integer({ min: 1, max: 365 })` para `tiempoEstimadoDias`; `fc.constant('USD')` para `moneda`
    - Invariantes: `#resultado-subtotal` contiene `subtotal.toFixed(2)`; `#resultado-recargo` contiene `recargoUrgencia.toFixed(2)`; `#resultado-total` contiene `total.toFixed(2)`; `#resultado-tiempo` contiene `String(tiempoEstimadoDias)`; `#resultado-cotizacion` no está `hidden`; la función muta el DOM en cada llamada (incluso con valores idénticos)

  - [x]* 9.5 Escribir PBT-05 — Mensaje de error es el `detail` del ProblemDetails, selección intacta
    - **Property 5: error 400 muestra el campo detail del ProblemDetails y preserva la selección del usuario**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Generadores: `fc.string({ minLength: 1, maxLength: 200 })` para `detail`; `fc.string({ minLength: 1 })` para `tipoCalzadoId`; `fc.array(fc.string({ minLength: 1 }), { minLength: 1 })` para reparaciones; `fc.boolean()` para `esUrgente`
    - Invariantes: `#mensaje-error.textContent === detail`; `#mensaje-error` no está `hidden`; `getEstado().tipoCalzadoId === tipoCalzadoId`; `getEstado().reparacionesIds` contiene exactamente los mismos IDs; `getEstado().esUrgente === esUrgente`

  - [x]* 9.6 Escribir PBT-06 — Reset inmediato del panel y del error al modificar la selección
    - **Property 6: cualquier evento change en un control mientras fase==='resultado'|'error' oculta el panel y el error en el mismo ciclo de evento**
    - **Validates: Requirements 7.5, 8.1, 8.2, 8.3**
    - Generadores: `fc.constantFrom('resultado', 'error')` para `fase`; `fc.oneof(fc.record({ tipo: fc.constant('calzado'), valor: fc.string({ minLength: 1 }) }), fc.record({ tipo: fc.constant('reparacion'), id: fc.string({ minLength: 1 }), checked: fc.boolean() }), fc.record({ tipo: fc.constant('urgencia'), checked: fc.boolean() }))` para el tipo de cambio
    - Invariantes: tras disparar el evento `change`, `#resultado-cotizacion.hidden === true` y `#mensaje-error.hidden === true`

  - [x]* 9.7 Escribir PBT-07 — Prevención de envíos duplicados en UI-E3
    - **Property 7: cuando fase==='cotizando', btn.disabled===true y clicks adicionales no generan POSTs**
    - **Validates: Requirements 5.6, 6.2**
    - Invariantes: `setEstado({ fase: 'cotizando' }); sincronizarBoton(getEstado()); expect(btn.disabled).toBe(true)`; simular clicks en `#btn-cotizar`; verificar que `fetch` no es llamado con `POST /api/cotizaciones`

- [x] 10. Smoke tests
  - [x]* 10.1 Escribir smoke tests S-01 a S-05
    - S-01: `index.html` se carga en jsdom sin errores de consola JS
    - S-02: al arrancar, la aplicación realiza exactamente 2 peticiones GET (una a cada endpoint del catálogo)
    - S-03: `js/state.js` no importa módulos propios del proyecto (ni `api.js` ni `app.js`)
    - S-04: `js/api.js` no importa módulos propios del proyecto y no referencia `document` ni `window`
    - S-05: `js/state.js` no referencia `document`, `window` ni `fetch`
    - _Requirements: 1.1, arquitectura_

- [x] 11. Checkpoint final — Verificación completa
  - Ejecutar `npx vitest --run` y confirmar que el 100% de las pruebas pasan. Verificar en navegador que la aplicación funciona con el backend corriendo en `http://localhost:8080`. Consultar al usuario si hay dudas antes de dar por terminada la implementación.
  - ✅ `npx vitest --run`: 68/68 pruebas pasan (10 archivos).
  - ✅ Integración contra el backend real en `http://localhost:8080`: catálogo (3 tipos de calzado + 4 reparaciones), regla UI-01, cotización 201 con y sin urgencia, reset inmediato al cambiar la selección, y error 400 mostrando el `detail` del ProblemDetails con la selección intacta.
  - ✅ CORS verificado: preflight `OPTIONS /api/cotizaciones` responde 200 con `Access-Control-Allow-Origin: *`.

---

## Notes

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido, pero cubren las 7 propiedades de corrección del diseño y las pruebas unitarias de referencia.
- Cada propiedad PBT se etiqueta en el código con `// Feature: cotizador-ui, Property N: ...` y ejecuta mínimo 100 iteraciones (`numRuns: 100`).
- Las pruebas de DOM usan jsdom vía Vitest (`environment: 'jsdom'` en la configuración).
- `api.js` es el único módulo que conoce `http://localhost:8080/api`; `state.js` y `api.js` son completamente independientes entre sí.
- `construirRequestCotizacion` en `app.js` es una función pura exportada, directamente testeable.
- La serialización `esUrgente → urgente` ocurre dentro de `generarCotizacion()` en `api.js`, no en `construirRequestCotizacion`.
- Checkpoints en tarea 7 y tarea 11 garantizan validación incremental.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3"] },
    { "id": 4, "tasks": ["5.1", "5.2"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["8.2", "8.3", "8.4", "9.1", "9.2", "9.3"] },
    { "id": 7, "tasks": ["9.4", "9.5", "9.6", "9.7", "10.1"] }
  ]
}
```
