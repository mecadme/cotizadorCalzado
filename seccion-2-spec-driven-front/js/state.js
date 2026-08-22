/**
 * js/state.js
 * Mantiene en memoria el estado de la aplicación.
 * No accede al DOM ni realiza peticiones de red.
 * Implementa el patrón Observer ligero mediante onCambio(callback).
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
