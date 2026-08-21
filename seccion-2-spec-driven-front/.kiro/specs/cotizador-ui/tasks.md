# Implementation Plan: Cotizador UI

## Overview

Implementar el Cotizador de Calzado como una sola página (`index.html`) usando HTML5 semántico, CSS3 y JavaScript ES6+ vanilla, siguiendo el patrón MVC ligero definido en el diseño: módulo `CONFIG` como fuente de verdad, `calcEngine` con lógica pura testeable y `uiController` como capa de presentación. Las pruebas se escriben con Vitest + fast-check sobre módulos ES extraídos del script embebido.

---

## Tasks

- [x] 1. Configurar entorno de pruebas y estructura de archivos
  - Crear `package.json` con dependencias de desarrollo: `vitest` y `fast-check`
  - Crear `vitest.config.js` con entorno jsdom para pruebas de DOM
  - Crear `src/calcEngine.js` como módulo ES exportable (misma lógica que irá embebida en `index.html`)
  - Crear `tests/` con `calcEngine.test.js` y `ui.test.js` vacíos como placeholders
  - _Requirements: 7.1 (un solo archivo final), estrategia de pruebas del diseño_

- [x] 2. Implementar el módulo `CONFIG` y el esqueleto de `index.html`
  - [x] 2.1 Crear `index.html` con estructura HTML semántica completa
    - `<form id="cotizador-form" novalidate>` con los tres fieldsets: `#fs-calzado`, `#fs-reparaciones`, `#fs-urgencia`
    - `<button id="btn-cotizar" disabled>` con texto visible "Cotizar"
    - `<div id="mensaje-error" role="alert" aria-live="assertive" hidden>`
    - `<section id="desglose" aria-live="polite" hidden>` con `#indicador-stale`, `#desglose-lista`, `#desglose-subtotal`, `#desglose-recargo`, `#desglose-total`
    - Todos los controles asociados con `<label for="...">` correctos
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.6, 7.1, 7.3, 8.1, 8.2, 8.3, 8.4, 9.1–9.4_
  - [x] 2.2 Declarar `CONFIG` dentro del `<script>` de `index.html`
    - Objeto literal con `recargo_urgencia: 20`, `tipos_calzado` (≥4 entradas), `reparaciones` (5 entradas con `id`, `label`, `precio`)
    - _Requirements: 1.1, 2.1, 3.1, 3.4_
  - [x]* 2.3 Escribir pruebas unitarias de estado inicial del DOM (U-01, U-02, U-03, U-05, U-09, U-10, U-11)
    - Verificar: select tiene ≥4 opciones y placeholder `disabled`; todos los checkboxes desmarcados; botón `disabled`; sección desglose `hidden`; etiqueta urgencia muestra "20%"; opacidad/cursor del botón; `aria-live="polite"` presente desde carga; `for`/`id` correctos en controles
    - _Requirements: 1.1, 1.2, 3.1, 4.4, 8.1, 8.3, 8.4, 9.1–9.4_

- [x] 3. Implementar `calcEngine` (lógica pura)
  - [x] 3.1 Implementar `calcEngine.calcularSubtotal` en `src/calcEngine.js`
    - Recibe `reparaciones[]` y `Set<string>` de IDs seleccionados; devuelve la suma de `precio` de los elementos cuyo `id` está en el Set
    - Retorna `0` si el Set está vacío
    - _Requirements: 2.2, 2.3, 5.1_
  - [x]* 3.2 Escribir propiedad PBT-01 — Subtotal es la suma exacta
    - **Property 1: Subtotal es la suma exacta de los precios seleccionados**
    - **Validates: Requirements 2.2, 2.3, 2.4, 5.1**
    - Generador: `fc.subarray(CONFIG.reparaciones, { minLength: 1 })`
    - Invariante: `calcularSubtotal(reparaciones, new Set(sel.map(r => r.id))) === sel.reduce((a, r) => a + r.precio, 0)`
  - [x] 3.3 Implementar `calcEngine.calcularTotal` en `src/calcEngine.js`
    - Recibe `subtotal`, `urgente: boolean`, `recargoPorc: number`
    - Si `urgente`: devuelve `subtotal * (1 + recargoPorc / 100)`; si no: devuelve `subtotal`
    - _Requirements: 3.2, 3.3, 5.2, 5.3_
  - [x]* 3.4 Escribir propiedad PBT-02 — Total con urgencia aplica el factor correctamente
    - **Property 2: Total con urgencia aplica el factor correctamente**
    - **Validates: Requirements 3.2, 5.2**
    - Generadores: `fc.subarray(..., {minLength:1})`, `fc.integer({min:1, max:100})`
    - Invariante: `Math.abs(calcularTotal(subtotal, true, recargo) - subtotal * (1 + recargo/100)) < 0.001`
  - [x]* 3.5 Escribir propiedad PBT-03 — Total sin urgencia es igual al Subtotal
    - **Property 3: Total sin urgencia es igual al Subtotal**
    - **Validates: Requirements 3.3, 5.3**
    - Generadores: `fc.subarray(..., {minLength:1})`, `fc.integer({min:1, max:100})`
    - Invariante: `calcularTotal(subtotal, false, recargo) === subtotal`
  - [x] 3.6 Implementar `calcEngine.formatearMoneda` en `src/calcEngine.js`
    - Recibe `number`; devuelve string con exactamente 2 decimales (p. ej. `"250.00"`)
    - _Requirements: 2.1, 5.4_

- [x] 4. Checkpoint — Pruebas de calcEngine
  - Ejecutar `npx vitest --run tests/calcEngine.test.js` y asegurarse de que todas las pruebas pasan. Consultar al usuario si hay dudas antes de continuar.

- [x] 5. Implementar `uiController` — inicialización y generación dinámica del DOM
  - [x] 5.1 Implementar `uiController.init` dentro del `<script>` de `index.html`
    - Cachear referencias a todos los elementos del DOM listados en el diseño
    - Generar `<option>` para cada entrada de `CONFIG.tipos_calzado` en `#sel-calzado`
    - Generar `<input type="checkbox" class="rep-check">` + `<label>` para cada entrada de `CONFIG.reparaciones`, mostrando `label` y `precio` con 2 decimales
    - Interpolar el valor de `CONFIG.recargo_urgencia` en la etiqueta del checkbox de urgencia
    - Registrar event listeners: `change` en cada `.rep-check` → `syncButtonState` + `markDesglosStale`; `change` en `#chk-urgencia` → `markDesglosStale`; `click` en `#btn-cotizar` → `handleCotizar`
    - Validar `CONFIG.recargo_urgencia`; si inválido, deshabilitar `#chk-urgencia` y mostrar mensaje informativo
    - Verificar APIs mínimas (`document.querySelector`, `addEventListener`, `Array.from`); mostrar banner de incompatibilidad si faltan
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.4, 3.5, 7.5, 9.1–9.4_
  - [x] 5.2 Implementar `uiController.syncButtonState`
    - Lee todos los `.rep-check` marcados; si hay ≥1, elimina `disabled` del botón; si no, lo añade
    - _Requirements: 4.1, 4.2, 4.3_
  - [x]* 5.3 Escribir propiedad PBT-04 — Estado del botón Cotizar
    - **Property 4: botón habilitado ↔ hay al menos una reparación seleccionada**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Generador: `fc.subarray(CONFIG.reparaciones, {minLength: 0})`
    - Invariante: `btnCotizar.disabled === (seleccionados.length === 0)`
  - [x]* 5.4 Escribir prueba unitaria U-06 — click en botón disabled no produce cambios
    - Verificar que invocar `handleCotizar` con el botón disabled no produce efectos secundarios visibles ni cálculos
    - _Requirements: 4.5_

- [x] 6. Implementar `uiController` — renderizado del desglose
  - [x] 6.1 Implementar `uiController.renderDesglose`
    - Limpia `#desglose-lista` y añade un `<li>` por cada ítem del desglose con nombre y precio formateado
    - Escribe en `#desglose-subtotal`, `#desglose-recargo`, `#desglose-total` usando `calcEngine.formatearMoneda`
    - Muestra la sección `#desglose` (elimina `hidden`) y oculta `#indicador-stale`
    - _Requirements: 5.4, 5.6, 5.7, 6.2, 8.4, 8.5_
  - [x]* 6.2 Escribir propiedad PBT-05 — Formato del desglose
    - **Property 5: desglose renderizado contiene todos los campos con formato correcto**
    - **Validates: Requirements 5.4**
    - Generadores: `fc.subarray(..., {minLength:1})`, `fc.boolean()`
    - Invariante: cada reparación aparece en el DOM; todos los valores monetarios coinciden con `/\d+\.\d{2}/`; el total es igual al calculado por `calcEngine`
  - [x]* 6.3 Escribir propiedad PBT-06 — Desglose refleja únicamente la selección más reciente
    - **Property 6: desglose refleja únicamente la selección más reciente**
    - **Validates: Requirements 5.7, 6.2**
    - Generadores: dos `fc.subarray` distintos no vacíos
    - Secuencia: cotizar con selección1 → cotizar con selección2 → verificar que solo aparecen ítems de selección2

- [x] 7. Implementar `uiController` — manejo de errores y estado stale
  - [x] 7.1 Implementar `uiController.handleCotizar`
    - Verifica `#sel-calzado` no vacío → si falla, llama `showError` y retorna sin calcular
    - Verifica que haya ≥1 checkbox activo → si falla, llama `showError` y retorna
    - Llama `clearError`, luego `calcEngine.calcularSubtotal` y `calcEngine.calcularTotal`
    - Construye objeto `DesgloseCotizacion` y llama `renderDesglose`
    - Envuelve en try/catch: si `calcEngine` lanza, conserva el desglose previo como stale y llama `showError`
    - _Requirements: 1.4, 2.5, 5.2, 5.3, 5.5, 6.3_
  - [x] 7.2 Implementar `uiController.markDesglosStale`
    - Si `desgloseMostrado === true`, muestra `#indicador-stale` (elimina `hidden`)
    - _Requirements: 6.1_
  - [x] 7.3 Implementar `uiController.showError` y `uiController.clearError`
    - `showError(msg)`: escribe texto en `#mensaje-error` y elimina `hidden`
    - `clearError()`: limpia texto y añade `hidden`
    - _Requirements: 1.4, 5.5, 6.3_
  - [x]* 7.4 Escribir prueba unitaria U-07 — Cotizar sin Tipo_de_Calzado produce error
    - _Requirements: 1.4_
  - [x]* 7.5 Escribir prueba unitaria U-08 — Cotizar con selección válida muestra desglose
    - _Requirements: 5.6, 5.7_
  - [x]* 7.6 Escribir propiedad PBT-08 — Cotizar sin tipo de calzado siempre produce error
    - **Property 8: cotizar sin tipo calzado produce error para cualquier selección**
    - **Validates: Requirements 1.4**
    - Generador: `fc.subarray(..., {minLength:1})` + `selectCalzado.value = ""`
    - Invariante: `mensajeError.hidden === false` y desglose no cambia
  - [x]* 7.7 Escribir prueba unitaria U-12 — Error de recálculo conserva desglose previo como stale
    - Simular excepción en `calcEngine`; verificar que el desglose anterior persiste con `#indicador-stale` visible
    - _Requirements: 6.3_

- [x] 8. Implementar indicador de desactualizado y su ciclo de vida
  - [x] 8.1 Conectar `markDesglosStale` a los listeners de cambio de checkboxes y urgencia (verificar que `init` los registra correctamente tras los pasos anteriores)
    - _Requirements: 6.1, 6.2_
  - [x]* 8.2 Escribir propiedad PBT-07 — Cambio tras cotizar activa indicador de desactualizado
    - **Property 7: cambio tras cotizar activa indicador de desactualizado**
    - **Validates: Requirements 6.1, 6.2**
    - Generadores: subconjunto no vacío inicial + al menos un toggle de checkbox o urgencia
    - Invariante: tras el cambio `indicadorStale.hidden === false`; tras recotizar `indicadorStale.hidden === true`

- [x] 9. Checkpoint — Pruebas de uiController
  - Ejecutar `npx vitest --run` y asegurarse de que todas las pruebas (unitarias y de propiedades) pasan. Consultar al usuario si hay dudas antes de continuar.

- [x] 10. Aplicar estilos CSS y restricciones visuales
  - [x] 10.1 Escribir el bloque `<style>` en `index.html`
    - Layout de una sola vista sin scroll vertical en 1024×768 px (grid o flexbox)
    - Estilos para `#btn-cotizar[disabled]`: `opacity: 0.4`, `cursor: not-allowed`
    - Estilos para `#indicador-stale` (visible/oculto)
    - Estilos para `#mensaje-error` (color de alerta, visible/oculto)
    - _Requirements: 4.4, 7.3_
  - [x]* 10.2 Escribir prueba unitaria U-05 — Estilos del botón disabled
    - Verificar `opacity ≤ 0.4` y `cursor: not-allowed` en el botón deshabilitado
    - _Requirements: 4.4_

- [x] 11. Integrar `calcEngine` embebido en `index.html` y smoke tests
  - [x] 11.1 Copiar/incrustar el contenido final de `src/calcEngine.js` dentro del `<script>` de `index.html` junto con `CONFIG` y `uiController`; llamar `uiController.init()` al final del script
    - Verificar que `index.html` se abre con `file://` sin errores de consola
    - _Requirements: 7.1, 7.2, 7.4_
  - [x]* 11.2 Escribir smoke tests S-01, S-02, S-03, S-04
    - S-01: `index.html` se carga sin errores de consola (JSDOM)
    - S-02: `CONFIG.recargo_urgencia` está en rango [1, 100] con valor default 20
    - S-03: sección desglose `hidden` al cargar
    - S-04: no se realizan peticiones de red (verificar con mock de `fetch`/`XMLHttpRequest`)
    - _Requirements: 7.2, 7.4, 3.4, 5.6_

- [x] 12. Checkpoint final — Verificación completa
  - Ejecutar `npx vitest --run` y confirmar que el 100 % de las pruebas pasan. Abrir `index.html` con protocolo `file://` y confirmar funcionamiento sin errores de consola. Consultar al usuario si hay dudas.

---

## Notes

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido, pero cubren las 8 propiedades de corrección del diseño y las pruebas unitarias de referencia.
- `src/calcEngine.js` es un artefacto de desarrollo temporal; el artefacto final entregable es únicamente `index.html`.
- Cada propiedad PBT se etiqueta en el código con `// Feature: cotizador-ui, Property N: ...` y ejecuta mínimo 100 iteraciones.
- Las pruebas de DOM usan JSDOM vía Vitest (`environment: 'jsdom'` en la configuración).
- Los checkpoints garantizan validación incremental antes de avanzar a la siguiente capa.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2"] },
    { "id": 1, "tasks": ["3.1", "3.3", "3.6", "2.3"] },
    { "id": 2, "tasks": ["3.2", "3.4", "3.5", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.4", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3", "7.1", "7.2", "7.3"] },
    { "id": 5, "tasks": ["7.4", "7.5", "7.6", "7.7", "8.1"] },
    { "id": 6, "tasks": ["8.2", "10.1"] },
    { "id": 7, "tasks": ["10.2", "11.1"] },
    { "id": 8, "tasks": ["11.2"] }
  ]
}
```
