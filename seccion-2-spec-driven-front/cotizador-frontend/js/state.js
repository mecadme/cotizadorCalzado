/**
 * state.js — Estado en memoria con Observer ligero.
 *
 * Mantiene el estado de la aplicación en memoria.
 * No accede al DOM ni realiza peticiones de red.
 * Implementa el patrón Observer ligero mediante onCambio(callback).
 *
 * Dependencias: ninguna (no importa módulos del proyecto, no referencia DOM ni fetch).
 */

/**
 * @typedef {'idle'|'loading-catalogo'|'cotizando'|'resultado'|'error'} Fase
 *
 * @typedef {Object} AppState
 * @property {TipoCalzado[]}            catalogoCalzado      - Catálogo cargado desde la API
 * @property {TipoReparacion[]}         catalogoReparaciones - Catálogo cargado desde la API
 * @property {string}                   tipoCalzadoId        - ID seleccionado; "" si ninguno
 * @property {Set<string>}              reparacionesIds      - IDs de reparaciones activas
 * @property {boolean}                  esUrgente            - Estado del checkbox de urgencia
 * @property {CotizacionResponse|null}  ultimaCotizacion     - Última respuesta 201 del backend
 * @property {Fase}                     fase
 */

/** @type {AppState} */
let _estado = {
  catalogoCalzado:      [],
  catalogoReparaciones: [],
  tipoCalzadoId:        '',
  reparacionesIds:      new Set(),
  esUrgente:            false,
  ultimaCotizacion:     null,
  fase:                 'idle',
};

/** @type {Array<(estado: AppState) => void>} */
const _observadores = [];

/**
 * Devuelve una copia superficial del estado actual.
 * Mutar el objeto devuelto no afecta el estado interno.
 * @returns {AppState}
 */
export function getEstado() {
  return { ..._estado };
}

/**
 * Aplica los cambios al estado interno y notifica a todos los observadores.
 * @param {Partial<AppState>} cambios
 */
export function setEstado(cambios) {
  _estado = { ..._estado, ...cambios };
  const copia = getEstado();
  for (const cb of _observadores) {
    cb(copia);
  }
}

/**
 * Registra un callback invocado cada vez que el estado cambia.
 * Soporta múltiples suscriptores.
 * @param {(estado: AppState) => void} callback
 */
export function onCambio(callback) {
  _observadores.push(callback);
}
