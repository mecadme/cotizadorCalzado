/**
 * propiedades-resultado.test.js — Pruebas basadas en propiedades (PBT) del Cotizador.
 *
 * PBT-04 (9.4): visualización fiel de la respuesta del backend.
 * PBT-05 (9.5): el mensaje de error es el `detail` del ProblemDetails y la
 *               selección del usuario queda intacta.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
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

// Nota: se usa `fc.double` en lugar de `fc.float` para los montos monetarios.
// `fc.float` genera valores de precisión simple (Math.fround) cuyo `.toFixed(2)`
// puede diferir del `.toFixed(2)` calculado sobre un double corriente, lo que
// rompería la comparación de igualdad exacta que exige esta propiedad.
// `fc.double` evita ese desajuste de precisión.
const montoArbitrary = fc.double({ min: 0.01, max: 9999.99, noNaN: true });

describe('PBT-04: visualización fiel de la respuesta del backend', () => {
  let app;

  beforeEach(async () => {
    montarDom();
    stubFetch();
    app = await cargarApp();
    vi.unstubAllGlobals();
  });

  it('renderizarResultado escribe exactamente los valores recibidos, sin transformarlos, y siempre muta el DOM', () => {
    // Feature: cotizador-ui, Property 4: renderizarResultado muestra fielmente subtotal, recargoUrgencia, total y tiempoEstimadoDias tal como llegan del backend, sin recalcularlos, y fuerza el anuncio de aria-live en cada llamada
    fc.assert(
      fc.property(
        montoArbitrary,
        montoArbitrary,
        montoArbitrary,
        fc.integer({ min: 1, max: 365 }),
        fc.constant('USD'),
        (subtotal, recargoUrgencia, total, tiempoEstimadoDias, moneda) => {
          const cotizacion = { subtotal, recargoUrgencia, total, moneda, tiempoEstimadoDias };

          const subtotalEl = document.getElementById('resultado-subtotal');
          const recargoEl  = document.getElementById('resultado-recargo');
          const totalEl    = document.getElementById('resultado-total');
          const tiempoEl   = document.getElementById('resultado-tiempo');
          const panel      = document.getElementById('resultado-cotizacion');

          app.renderizarResultado(cotizacion);

          // Los valores mostrados deben ser exactamente los recibidos: no se
          // recalcula ninguna operación aritmética en el cliente (p. ej. el
          // total mostrado es el campo `total` recibido, no subtotal + recargo).
          expect(subtotalEl.textContent).toBe(moneda + ' ' + subtotal.toFixed(2));
          expect(recargoEl.textContent).toBe(moneda + ' ' + recargoUrgencia.toFixed(2));
          expect(totalEl.textContent).toBe(moneda + ' ' + total.toFixed(2));
          expect(tiempoEl.textContent).toBe(String(tiempoEstimadoDias));
          expect(panel.hasAttribute('hidden')).toBe(false);

          // Segunda llamada con los MISMOS valores: debe volver a mutar el DOM
          // (vaciamos los spans antes para comprobar que se rellenan de nuevo),
          // requisito necesario para forzar el anuncio de aria-live aunque el
          // contenido resultante sea idéntico al anterior.
          subtotalEl.textContent = '';
          recargoEl.textContent  = '';
          totalEl.textContent    = '';
          tiempoEl.textContent   = '';
          panel.setAttribute('hidden', '');

          app.renderizarResultado(cotizacion);

          expect(subtotalEl.textContent).toBe(moneda + ' ' + subtotal.toFixed(2));
          expect(recargoEl.textContent).toBe(moneda + ' ' + recargoUrgencia.toFixed(2));
          expect(totalEl.textContent).toBe(moneda + ' ' + total.toFixed(2));
          expect(tiempoEl.textContent).toBe(String(tiempoEstimadoDias));
          expect(panel.hasAttribute('hidden')).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PBT-05: el mensaje de error es el detail del ProblemDetails y la selección queda intacta', () => {
  it('#mensaje-error muestra exactamente el detail recibido y el estado conserva la selección del usuario', async () => {
    // Feature: cotizador-ui, Property 5: ante un 400 el mensaje mostrado es exactamente el detail del ProblemDetails y la selección del usuario (tipoCalzadoId, reparacionesIds, esUrgente) permanece intacta
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.constantFrom('c1', 'c2'),
        fc.uniqueArray(fc.constantFrom('r1', 'r2'), { minLength: 1 }),
        fc.boolean(),
        async (detail, tipoCalzadoId, reparaciones, esUrgente) => {
          montarDom();
          stubFetch({
            cotizacion: respuesta(400, {
              type: 'about:blank',
              title: 'Bad Request',
              status: 400,
              detail,
            }),
          });

          try {
            await cargarApp();

            seleccionarCalzado(tipoCalzadoId);
            for (const id of reparaciones) {
              marcarReparacion(id, true);
            }

            const chkUrgencia = document.getElementById('urgencia-checkbox');
            chkUrgencia.checked = esUrgente;
            chkUrgencia.dispatchEvent(new window.Event('change', { bubbles: true }));

            document.getElementById('btn-cotizar').click();
            await flush();

            const mensajeError = document.getElementById('mensaje-error');
            expect(mensajeError.textContent).toBe(detail);
            expect(mensajeError.hasAttribute('hidden')).toBe(false);

            const { getEstado } = await importarState();
            const estado = getEstado();
            expect(estado.tipoCalzadoId).toBe(tipoCalzadoId);
            expect(estado.reparacionesIds).toEqual(new Set(reparaciones));
            expect(estado.esUrgente).toBe(esUrgente);
          } finally {
            vi.unstubAllGlobals();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
