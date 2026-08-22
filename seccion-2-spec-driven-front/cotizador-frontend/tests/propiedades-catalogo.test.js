/**
 * propiedades-catalogo.test.js — Pruebas basadas en propiedades (PBT) del Cotizador.
 *
 * PBT-01 (9.1): carga del catálogo concurrente.
 * PBT-02 (9.2): habilitación del botón Cotizar (regla UI-01).
 * PBT-03 (9.3): construcción del request de cotización.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { montarDom, stubFetch, cargarApp, importarState } from './helpers.js';

const tipoCalzadoArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  nombre: fc.string({ minLength: 1 }),
});

const tipoReparacionArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  nombre: fc.string({ minLength: 1 }),
  precioBase: fc.double({ min: 0, max: 1000, noNaN: true }),
});

describe('PBT-01: carga del catálogo concurrente', () => {
  it('fetch se llama exactamente 2 veces y la fase/controles reflejan si ambos catálogos tienen elementos', async () => {
    // Feature: cotizador-ui, Property 1: la carga de catálogo dispara exactamente dos GET y transiciona a error solo cuando algún catálogo llega vacío
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(tipoCalzadoArbitrary, { minLength: 0, maxLength: 10, selector: (x) => x.id }),
        fc.uniqueArray(tipoReparacionArbitrary, { minLength: 0, maxLength: 10, selector: (x) => x.id }),
        async (calzado, reparaciones) => {
          montarDom();
          const mockFetch = stubFetch({ calzado, reparaciones });

          const app = await cargarApp();
          const state = await importarState();

          try {
            expect(mockFetch).toHaveBeenCalledTimes(2);

            const estado = state.getEstado();
            const select = document.getElementById('tipo-calzado-select');

            if (calzado.length > 0 && reparaciones.length > 0) {
              expect(estado.fase).not.toBe('error');
              expect(select.hasAttribute('disabled')).toBe(false);
            } else {
              expect(estado.fase).toBe('error');
              expect(select.hasAttribute('disabled')).toBe(true);
            }
          } finally {
            vi.unstubAllGlobals();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PBT-02: habilitación del botón Cotizar', () => {
  let app;
  let state;

  beforeEach(async () => {
    montarDom();
    stubFetch();
    app = await cargarApp();
    state = await importarState();
    vi.unstubAllGlobals();
  });

  it('el botón está deshabilitado sí y solo si no hay tipo de calzado o no hay reparaciones seleccionadas', () => {
    // Feature: cotizador-ui, Property 2: #btn-cotizar habilitado equivale a tipoCalzadoId no vacío y al menos una reparación seleccionada
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 })),
        fc.array(fc.string({ minLength: 1 }), { maxLength: 5 }),
        (tipoCalzadoId, ids) => {
          const btn = document.getElementById('btn-cotizar');

          state.setEstado({ tipoCalzadoId, reparacionesIds: new Set(ids), fase: 'idle' });
          app.sincronizarBoton(state.getEstado());

          expect(btn.disabled).toBe(!(tipoCalzadoId !== '' && new Set(ids).size > 0));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PBT-03: request bien formado', () => {
  it('construirRequestCotizacion refleja fielmente tipoCalzadoId, reparacionesIds y esUrgente del estado', async () => {
    // Feature: cotizador-ui, Property 3: construirRequestCotizacion es una proyección fiel y pura del estado
    const { construirRequestCotizacion } = await import('../js/app.js');

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        fc.boolean(),
        (tipoCalzadoId, reparacionesArray, esUrgente) => {
          const reparacionesIds = new Set(reparacionesArray);
          const estado = {
            catalogoCalzado: [],
            catalogoReparaciones: [],
            tipoCalzadoId,
            reparacionesIds,
            esUrgente,
            ultimaCotizacion: null,
            fase: 'idle',
          };

          const req = construirRequestCotizacion(estado);

          expect(typeof req.tipoCalzadoId).toBe('string');
          expect(req.tipoCalzadoId).not.toBe('');
          expect(req.tipoCalzadoId).toBe(tipoCalzadoId);

          expect(Array.isArray(req.tipoReparacionIds)).toBe(true);
          expect(req.tipoReparacionIds.length).toBeGreaterThanOrEqual(1);
          expect(new Set(req.tipoReparacionIds)).toEqual(reparacionesIds);

          expect(typeof req.esUrgente).toBe('boolean');
          expect(req.esUrgente).toBe(esUrgente);
        }
      ),
      { numRuns: 100 }
    );
  });
});
