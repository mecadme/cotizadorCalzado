# Convenciones del Frontend
- IDs en HTML con formato kebab-case (`tipo-calzado-select`, `btn-cotizar`).
- Nombres en JavaScript con formato camelCase.
- Petición POST de cotización debe enviar JSON: `{ "tipoCalzadoId": number, "reparacionIds": number[], "esUrgente": boolean }`.
- URL base de la API: `http://localhost:8080/api`.