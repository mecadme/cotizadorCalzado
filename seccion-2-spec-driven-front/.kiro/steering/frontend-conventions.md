# Convenciones del Frontend

## Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos JavaScript | camelCase, sustantivo que describe su responsabilidad | `api.js`, `app.js`, `state.js` |
| IDs de elementos HTML | kebab-case, descriptivo del control | `tipo-calzado-select`, `btn-cotizar`, `resultado-cotizacion` |
| Clases CSS | kebab-case, BEM ligero (`bloque__elemento--modificador`) solo donde aporte claridad | `cotizador__resultado`, `cotizador__resultado--urgente` |
| Funciones | camelCase, verbo que expresa intención | `obtenerTiposCalzado()`, `renderizarResultado()`, `construirRequestCotizacion()` |
| Variables de estado | camelCase, sustantivo | `cotizacionActual`, `tiposCalzadoDisponibles`, `servicioEsUrgente` |
| Constantes de configuración | MAYÚSCULAS_CON_GUION_BAJO | `API_BASE_URL` |
| Eventos personalizados (si se usan) | kebab-case con prefijo del módulo de origen | `cotizador:resultado-listo` |

## Contrato HTTP

- **URL base de la API:** `http://localhost:8080/api`
- **Petición POST de cotización** debe enviar JSON con exactamente estos campos:
  ```json
  { "tipoCalzadoId": "string", "tipoReparacionIds": ["string"], "urgente": boolean }
  ```
  - `tipoCalzadoId`: string (ID del tipo de calzado seleccionado)
  - `tipoReparacionIds`: array de strings (IDs de reparaciones seleccionadas, mínimo 1)
  - `urgente`: boolean (`true` si el servicio es urgente, `false` por defecto)

> Nota: el campo interno de estado JS puede llamarse `esUrgente` (camelCase), pero `api.js` lo serializa como `urgente` al construir el body del POST para cumplir el contrato OpenAPI.

## Restricciones

- No agregar rutas ni navegación adicional — pantalla única.
- No calcular precios ni tiempos en el frontend — el backend es la única fuente de verdad.
- No usar `localStorage` ni cookies — el estado se pierde al recargar (inicio limpio).
