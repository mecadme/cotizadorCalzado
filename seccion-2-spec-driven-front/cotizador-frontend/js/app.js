/**
 * app.js — Coordinación de UI
 *
 * Único módulo que conoce el DOM y coordina api.js y state.js.
 * Escucha eventos del DOM, actualiza el estado y decide qué renderizar.
 *
 * Dependencias: ./api.js, ./state.js
 */

import { obtenerTiposCalzado, obtenerTiposReparacion } from './api.js';
import { getEstado, setEstado, onCambio } from './state.js';

// ── Constantes ────────────────────────────────────────────────────────────────

const MSG_ERROR_CATALOGO = 'No fue posible cargar el catálogo. Por favor, recarga la página.';

// ── Arranque ──────────────────────────────────────────────────────────────────

/**
 * Punto de entrada.
 * Registra el callback de renderizado con onCambio y lanza la carga del catálogo.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
async function init() {
  // Registrar el observer único: despacha a la función de render correcta según la fase
  onCambio(function renderDispatch(estado) {
    // Tareas 5 y 6 extenderán este bloque con sincronizarBoton, renderizarResultado, etc.
    // Por ahora solo reacciona a cambios de catálogo y fase de carga.
    if (estado.fase === 'idle' || estado.fase === 'error') {
      // Render de catálogo ya fue invocado directamente en cargarCatalogo();
      // este callback queda listo para que las tareas siguientes lo extiendan.
    }
  });

  await cargarCatalogo();
}

// ── Coordinación ──────────────────────────────────────────────────────────────

/**
 * Carga el catálogo llamando a ambos endpoints en paralelo (Promise.all).
 * Puebla los controles DURANTE la transición a UI-E2, antes de completarla.
 * Si algún endpoint falla o devuelve array vacío → transiciona a UI-E5 (fase 'error').
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
async function cargarCatalogo() {
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
function renderizarCalzado(estado) {
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
function renderizarReparaciones(estado) {
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
      const nuevosIds = new Set(estadoActual.reparacionesIds);
      if (checkbox.checked) {
        nuevosIds.add(rep.id);
      } else {
        nuevosIds.delete(rep.id);
      }
      setEstado({ reparacionesIds: nuevosIds });
    });

    fieldset.appendChild(label);
  }
}

// ── Mensajes de error ─────────────────────────────────────────────────────────

/**
 * Muestra un mensaje de error en #mensaje-error (sin modal).
 * @param {string} mensaje
 */
function mostrarError(mensaje) {
  const el = document.getElementById('mensaje-error');
  el.textContent = mensaje;
  el.removeAttribute('hidden');
}

/**
 * Oculta y vacía el mensaje de error en #mensaje-error.
 */
function limpiarError() {
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
