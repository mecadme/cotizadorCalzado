/**
 * errores.test.js — Pruebas de manejo de errores en la cotización (Tarea 8.4).
 *
 * Cubre U-12 (400 con ProblemDetails, selección intacta), U-13 (error de red,
 * botón se rehabilita), U-14 (5xx sin fuga de detalles técnicos) y U-15
 * (panel de resultado oculto hasta la primera cotización exitosa).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  montarDom,
  stubFetch,
  respuesta,
  cargarApp,
  importarState,
  flush,
  seleccionarCalzado,
  marcarReparacion,
} from './helpers.js';

const MSG_ERROR_RED = 'No fue posible completar la solicitud';
const MSG_ERROR_SERVIDOR = 'Ocurrió un problema al procesar la cotización. Inténtalo de nuevo más tarde.';

describe('Manejo de errores al cotizar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-12: 400 con ProblemDetails muestra el detail exacto y no altera la selección del usuario', async () => {
    const detalle = 'Mensaje de validación';
    montarDom();
    stubFetch({
      cotizacion: respuesta(400, {
        type: 'https://ejemplo.com/errores/validacion',
        title: 'Solicitud inválida',
        status: 400,
        detail: detalle,
      }),
    });

    await cargarApp();

    const select = seleccionarCalzado('c1');
    const chkRep = marcarReparacion('r1', true);
    const chkUrgencia = document.getElementById('urgencia-checkbox');
    chkUrgencia.checked = true;
    chkUrgencia.dispatchEvent(new window.Event('change', { bubbles: true }));

    document.getElementById('btn-cotizar').click();
    await flush();

    const mensajeError = document.getElementById('mensaje-error');
    expect(mensajeError.hidden).toBe(false);
    expect(mensajeError.textContent).toBe(detalle);

    // La selección del usuario no cambia ante un 400
    expect(select.value).toBe('c1');
    expect(chkRep.checked).toBe(true);
    expect(chkUrgencia.checked).toBe(true);

    const { getEstado } = await importarState();
    const estado = getEstado();
    expect(estado.tipoCalzadoId).toBe('c1');
    expect(estado.reparacionesIds.has('r1')).toBe(true);
    expect(estado.esUrgente).toBe(true);
  });

  it('U-13: error de red al cotizar muestra el mensaje de red y rehabilita el botón si la selección sigue siendo válida', async () => {
    montarDom();
    stubFetch({ cotizacion: new TypeError('Failed to fetch') });

    await cargarApp();

    seleccionarCalzado('c1');
    marcarReparacion('r1', true);

    const btn = document.getElementById('btn-cotizar');
    expect(btn.disabled).toBe(false);

    btn.click();
    await flush();

    const mensajeError = document.getElementById('mensaje-error');
    expect(mensajeError.hidden).toBe(false);
    expect(mensajeError.textContent).toBe(MSG_ERROR_RED);

    // La fase queda en 'error', que no bloquea el botón: con selección válida se rehabilita
    expect(btn.disabled).toBe(false);

    const { getEstado } = await importarState();
    expect(getEstado().fase).toBe('error');
  });

  it('U-14: error 5xx muestra el mensaje genérico de servidor sin filtrar detalles técnicos', async () => {
    const detalleTecnico = 'NullPointerException at CotizacionService.java:87\n\tat com.cotizador.core.Handler.process(Handler.java:42)';
    montarDom();
    stubFetch({
      cotizacion: respuesta(500, {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        detail: detalleTecnico,
      }),
    });

    await cargarApp();

    seleccionarCalzado('c1');
    marcarReparacion('r1', true);

    document.getElementById('btn-cotizar').click();
    await flush();

    const mensajeError = document.getElementById('mensaje-error');
    expect(mensajeError.hidden).toBe(false);
    expect(mensajeError.textContent).toBe(MSG_ERROR_SERVIDOR);
    expect(mensajeError.textContent).not.toContain('NullPointerException');
    expect(mensajeError.textContent).not.toContain(detalleTecnico);
  });

  it('U-15: #resultado-cotizacion permanece oculto en el estado inicial y tras una selección válida en UI-E2', async () => {
    montarDom();

    // Estado inicial del DOM real, antes de cargar el módulo de la app.
    expect(document.getElementById('resultado-cotizacion').hidden).toBe(true);

    stubFetch();
    await cargarApp();

    seleccionarCalzado('c1');
    marcarReparacion('r1', true);
    await flush();

    // Selección válida (UI-E2) pero aún sin haber cotizado: el panel sigue oculto.
    expect(document.getElementById('resultado-cotizacion').hidden).toBe(true);
  });

  it('contraprueba: tras un 201 exitoso, el resultado se muestra y el mensaje de error permanece oculto', async () => {
    montarDom();
    stubFetch();

    await cargarApp();

    seleccionarCalzado('c1');
    marcarReparacion('r1', true);

    document.getElementById('btn-cotizar').click();
    await flush();

    expect(document.getElementById('resultado-cotizacion').hidden).toBe(false);
    expect(document.getElementById('mensaje-error').hidden).toBe(true);
  });
});
