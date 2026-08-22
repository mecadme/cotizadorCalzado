/**
 * app.js — Coordinación de UI
 *
 * Único módulo que conoce el DOM y coordina api.js y state.js.
 * Escucha eventos del DOM, actualiza el estado y decide qué renderizar.
 *
 * Dependencias: ./api.js, ./state.js
 */

import { obtenerTiposCalzado, obtenerTiposReparacion, generarCotizacion, ApiError } from './api.js';
import { getEstado, setEstado, onCambio } from './state.js';

// ── Constantes ────────────────────────────────────────────────────────────────

const MSG_ERROR_CATALOGO = 'No fue posible cargar el catálogo. Por favor, recarga la página.';
const MSG_ERROR_RED      = 'No fue posible completar la solicitud';
const MSG_ERROR_SERVIDOR = 'Ocurrió un problema al procesar la cotización. Inténtalo de nuevo más tarde.';

// ── Arranque ──────────────────────────────────────────────────────────────────

/**
 * Punto de entrada.
 * Registra el callback de renderizado con onCambio y lanza la carga del catálogo.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
async function init() {
  // Registrar el observer único: reevalúa la habilitación del botón en cada cambio (Req 5.x)
  onCambio(function renderDispatch(estado) {
    sincronizarBoton(estado);
  });

  registrarListeners();

  await cargarCatalogo();
}

// ── Coordinación ──────────────────────────────────────────────────────────────

/**
 * Carga el catálogo llamando a ambos endpoints en paralelo (Promise.all).
 * Puebla los controles DURANTE la transición a UI-E2, antes de completarla.
 * Si algún endpoint falla o devuelve array vacío → transiciona a UI-E5 (fase 'error').
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export async function cargarCatalogo() {
  // Transicionar a UI-E1: deshabilitar controles y mostrar indicador de carga
  setEstado({ fase: 'loading-catalogo' });
  _deshabilitarTodosLosControles();
  document.getElementById('indicador-carga-catalogo').removeAttribute('hidden');

  try {
    // Req 1.1: dos peticiones GET simultáneas
    const [tiposCalzado, tiposReparacion] = await Promise.all([
      obtenerTiposCalzado(),
      obtenerTiposReparacion(),
    ]);

    // Req 1.4: solo proceder si ambos catálogos tienen al menos un elemento
    if (!Array.isArray(tiposCalzado) || tiposCalzado.length === 0 ||
        !Array.isArray(tiposReparacion) || tiposReparacion.length === 0) {
      throw new Error('El catálogo devuelto está vacío.');
    }

    // Guardar catálogos en estado
    setEstado({
      catalogoCalzado:      tiposCalzado,
      catalogoReparaciones: tiposReparacion,
    });

    // Poblar controles ANTES de habilitar (Req 2.1, 3.1)
    renderizarCalzado(getEstado());
    renderizarReparaciones(getEstado());

    // Ocultar indicador de carga y transicionar a UI-E2
    document.getElementById('indicador-carga-catalogo').setAttribute('hidden', '');
    setEstado({ fase: 'idle' });

    // Habilitar controles de selección (Req 1.4)
    _habilitarControlesCatalogo();

  } catch (_err) {
    // Req 1.5: cualquier fallo → UI-E5, controles permanecen deshabilitados
    document.getElementById('indicador-carga-catalogo').setAttribute('hidden', '');
    setEstado({ fase: 'error' });
    mostrarError(MSG_ERROR_CATALOGO);
  }
}

// ── Renderizado del catálogo ──────────────────────────────────────────────────

/**
 * Rellena el select de tipos de calzado a partir del catálogo en estado.
 * Conserva la opción placeholder y no selecciona ningún tipo por defecto.
 * Requirements: 2.1, 2.2, 2.3
 * @param {AppState} estado
 */
export function renderizarCalzado(estado) {
  const select = document.getElementById('tipo-calzado-select');

  // Eliminar opciones previas conservando solo el placeholder (primer hijo)
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Añadir una opción por cada tipo de calzado del catálogo
  for (const tipo of estado.catalogoCalzado) {
    const option = document.createElement('option');
    option.value = tipo.id;
    option.textContent = tipo.nombre;
    select.appendChild(option);
  }

  // Habilitar el select solo si la fase no bloquea
  if (estado.fase !== 'loading-catalogo') {
    select.removeAttribute('disabled');
  } else {
    select.setAttribute('disabled', '');
  }
}

/**
 * Rellena los checkboxes de reparación a partir del catálogo en estado.
 * Registra listeners de change que actualizan reparacionesIds en el estado.
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * @param {AppState} estado
 */
export function renderizarReparaciones(estado) {
  const fieldset = document.getElementById('fs-reparaciones');

  // Vaciar el fieldset (eliminar checkboxes previos, conservar la leyenda)
  const legend = fieldset.querySelector('legend');
  fieldset.innerHTML = '';
  if (legend) {
    fieldset.appendChild(legend);
  }

  // Crear un label+checkbox por cada tipo de reparación
  for (const rep of estado.catalogoReparaciones) {
    const label = document.createElement('label');
    label.htmlFor = `rep-${rep.id}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `rep-${rep.id}`;
    checkbox.value = rep.id;
    checkbox.disabled = true; // comienzan deshabilitados; se habilitan en _habilitarControlesCatalogo

    // Req 3.1: mostrar nombre y precioBase con 2 decimales y símbolo de moneda
    label.appendChild(checkbox);
    label.appendChild(
      document.createTextNode(` ${rep.nombre} — $ ${rep.precioBase.toFixed(2)}`)
    );

    // Req 3.2, 3.3: listener que mantiene reparacionesIds sincronizado con el estado
    checkbox.addEventListener('change', function () {
      const estadoActual = getEstado();
      const mostrabaSalida = _muestraSalida(estadoActual.fase);
      const nuevosIds = new Set(estadoActual.reparacionesIds);
      if (checkbox.checked) {
        nuevosIds.add(rep.id);
      } else {
        nuevosIds.delete(rep.id);
      }
      setEstado({ reparacionesIds: nuevosIds });

      // Req 8.2: cambiar la selección invalida el resultado/error mostrado
      if (mostrabaSalida) {
        _resetSalida();
      }
    });

    fieldset.appendChild(label);
  }
}

// ── Habilitación del botón (Tarea 5.1) ───────────────────────────────────────

/**
 * Aplica la regla UI-01 sobre `#btn-cotizar`.
 * habilitado = tipoCalzadoId !== '' && reparacionesIds.size >= 1
 * Las fases bloqueantes ('loading-catalogo', 'cotizando') fuerzan `disabled`
 * incluso con una selección válida (Req 5.6 — prevención de envíos duplicados).
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 9.3
 * @param {AppState} estado
 */
export function sincronizarBoton(estado) {
  const btn = document.getElementById('btn-cotizar');
  if (!btn) return;

  const seleccionValida = estado.tipoCalzadoId !== '' && estado.reparacionesIds.size >= 1;
  const faseBloquea     = estado.fase === 'loading-catalogo' || estado.fase === 'cotizando';

  if (seleccionValida && !faseBloquea) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', '');
  }
}

// ── Listeners de la selección (Tarea 5.2) ────────────────────────────────────

/**
 * ¿La fase actual muestra salida (resultado o error) que debe invalidarse
 * ante cualquier cambio de la selección?
 * @param {Fase} fase
 * @returns {boolean}
 */
function _muestraSalida(fase) {
  return fase === 'resultado' || fase === 'error';
}

/**
 * Oculta el panel de resultado y limpia el error en el mismo ciclo de evento,
 * devolviendo la aplicación a la fase 'idle'.
 * Requirements: 7.5, 8.1, 8.2, 8.3
 */
function _resetSalida() {
  ocultarResultado();
  limpiarError();
  setEstado({ fase: 'idle' });
}

/**
 * Registra los listeners de los controles estáticos del formulario.
 * Los checkboxes de reparación se enlazan en `renderizarReparaciones()`
 * porque se crean dinámicamente.
 * Requirements: 4.2, 4.3, 6.1, 7.5, 8.1, 8.2, 8.3
 */
function registrarListeners() {
  const select   = document.getElementById('tipo-calzado-select');
  const urgencia = document.getElementById('urgencia-checkbox');
  const btn      = document.getElementById('btn-cotizar');

  select.addEventListener('change', function () {
    const mostrabaSalida = _muestraSalida(getEstado().fase);
    setEstado({ tipoCalzadoId: select.value });
    if (mostrabaSalida) {
      _resetSalida();
    }
  });

  urgencia.addEventListener('change', function () {
    const mostrabaSalida = _muestraSalida(getEstado().fase);
    setEstado({ esUrgente: urgencia.checked });
    if (mostrabaSalida) {
      _resetSalida();
    }
  });

  btn.addEventListener('click', handleCotizar);
}

// ── Cotización (Tarea 6) ─────────────────────────────────────────────────────

/**
 * Construye el body del POST /api/cotizaciones a partir del estado.
 * Función pura: sin efectos secundarios ni acceso al DOM.
 * La traducción `esUrgente` → `urgente` ocurre en api.js, no aquí.
 * Requirements: 6.1
 * @param {AppState} estado
 * @returns {{tipoCalzadoId: string, tipoReparacionIds: string[], esUrgente: boolean}}
 */
export function construirRequestCotizacion(estado) {
  return {
    tipoCalzadoId:     estado.tipoCalzadoId,
    tipoReparacionIds: Array.from(estado.reparacionesIds),
    esUrgente:         estado.esUrgente,
  };
}

/**
 * Maneja el click en `#btn-cotizar`: envía la cotización y renderiza el
 * resultado o el error correspondiente. La selección del usuario nunca se
 * modifica ante un error (Req 7.2).
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4
 */
export async function handleCotizar() {
  const estado = getEstado();

  // Req 6.2 / 5.6: ignorar clicks mientras hay una cotización en vuelo
  if (estado.fase === 'cotizando') return;

  const request = construirRequestCotizacion(estado);

  limpiarError();
  ocultarResultado();

  // UI-E3: bloquear el botón durante la petición
  setEstado({ fase: 'cotizando' });

  try {
    const cotizacion = await generarCotizacion(request);

    // 201 Created → UI-E4
    setEstado({ ultimaCotizacion: cotizacion, fase: 'resultado' });
    try {
      renderizarResultado(cotizacion);
    } catch (_errRender) {
      setEstado({ fase: 'error' });
      mostrarError(MSG_ERROR_SERVIDOR);
    }
  } catch (err) {
    setEstado({ fase: 'error' });

    if (err instanceof ApiError && err.statusCode === 400) {
      // Req 7.1/7.2: mostrar el detail del ProblemDetails; la selección queda intacta
      mostrarError(err.detail);
    } else if (err instanceof ApiError && err.statusCode === 0) {
      // Req 7.3: error de red sin respuesta del servidor
      mostrarError(MSG_ERROR_RED);
    } else {
      // Req 7.4: 5xx u otro error → mensaje genérico sin detalles técnicos
      mostrarError(MSG_ERROR_SERVIDOR);
    }
  }
}

// ── Renderizado del resultado (Tarea 6.3) ────────────────────────────────────

/**
 * Escribe el desglose recibido del backend en el panel de resultado.
 * Los valores se muestran tal cual llegan: no se recalcula ninguna operación
 * aritmética en el cliente (Req 6.4, 9.5). El contenido se muta siempre,
 * incluso si es idéntico al anterior, para forzar el anuncio de `aria-live`.
 * Requirements: 6.3, 6.4, 9.4, 9.5
 * @param {CotizacionResponse} cotizacion
 */
export function renderizarResultado(cotizacion) {
  const moneda = cotizacion.moneda;

  document.getElementById('resultado-subtotal').textContent =
    moneda + ' ' + cotizacion.subtotal.toFixed(2);
  document.getElementById('resultado-recargo').textContent =
    moneda + ' ' + cotizacion.recargoUrgencia.toFixed(2);
  document.getElementById('resultado-total').textContent =
    moneda + ' ' + cotizacion.total.toFixed(2);
  document.getElementById('resultado-tiempo').textContent =
    String(cotizacion.tiempoEstimadoDias);

  document.getElementById('resultado-cotizacion').removeAttribute('hidden');
}

/**
 * Oculta el panel de resultado sin borrar su contenido.
 * Requirements: 6.5, 8.1, 8.2, 8.3
 */
export function ocultarResultado() {
  document.getElementById('resultado-cotizacion').setAttribute('hidden', '');
}

// ── Mensajes de error ─────────────────────────────────────────────────────────

/**
 * Muestra un mensaje de error en #mensaje-error (sin modal).
 * @param {string} mensaje
 */
export function mostrarError(mensaje) {
  const el = document.getElementById('mensaje-error');
  el.textContent = mensaje;
  el.removeAttribute('hidden');
}

/**
 * Oculta y vacía el mensaje de error en #mensaje-error.
 */
export function limpiarError() {
  const el = document.getElementById('mensaje-error');
  el.textContent = '';
  el.setAttribute('hidden', '');
}

// ── Helpers de control DOM ────────────────────────────────────────────────────

/**
 * Deshabilita todos los controles de usuario (select, checkboxes, botón).
 * Llamado durante UI-E1 (fase 'loading-catalogo').
 */
function _deshabilitarTodosLosControles() {
  document.getElementById('tipo-calzado-select').setAttribute('disabled', '');
  document.getElementById('urgencia-checkbox').setAttribute('disabled', '');
  document.getElementById('btn-cotizar').setAttribute('disabled', '');

  // Deshabilitar checkboxes de reparación existentes (si los hubiera)
  const checkboxes = document.querySelectorAll('#fs-reparaciones input[type="checkbox"]');
  checkboxes.forEach(function (chk) { chk.setAttribute('disabled', ''); });
}

/**
 * Habilita los controles de selección del catálogo tras una carga exitosa.
 * El #btn-cotizar permanece deshabilitado hasta que la selección sea válida
 * (lógica de tarea 5.1 — sincronizarBoton).
 * Req 1.4
 */
function _habilitarControlesCatalogo() {
  document.getElementById('tipo-calzado-select').removeAttribute('disabled');
  document.getElementById('urgencia-checkbox').removeAttribute('disabled');

  // Habilitar todos los checkboxes de reparación recién creados
  const checkboxes = document.querySelectorAll('#fs-reparaciones input[type="checkbox"]');
  checkboxes.forEach(function (chk) { chk.removeAttribute('disabled'); });

  // Nota: #btn-cotizar permanece disabled hasta que la tarea 5.1 evalúe la regla UI-01
}

// ── Inicio del módulo ─────────────────────────────────────────────────────────

init();
