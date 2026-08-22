/**
 * propiedades-reset.test.js — Pruebas basadas en propiedades (PBT) del Cotizador.
 *
 * PBT-06 (9.6): reset inmediato del panel de resultado y del error al
 *               modificar la selección (Req 7.5, 8.1, 8.2, 8.3).
 * PBT-07 (9.7): prevención de envíos duplicados en UI-E3 (Req 5.6, 6.2).
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import {
  montarDom,
  stubFetch,
  respuesta,
  cargarApp,
  importarState,
  flush,
  cambiar,
  seleccionarCalzado,
  marcarReparacion,
  CALZADO_DEMO,
  REPARACIONES_DEMO,
  COTIZACION_DEMO,
} from './helpers.js';

describe('PBT-06: reset inmediato del panel y del error al modificar la selección', () => {
  it('cualquier change en la selección oculta el panel de resultado y el mensaje de error en el mismo ciclo de evento', async () => {
    // Feature: cotizador-ui, Property 6: cualquier evento change en un control de selección oculta inmediatamente #resultado-cotizacion y #mensaje-error y devuelve la fase a idle, sin esperar ninguna promesa
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('resultado', 'error'),
        fc.oneof(
          fc.record({ tipo: fc.constant('calzado'), valor: fc.constantFrom('c1', 'c2') }),
          fc.record({ tipo: fc.constant('reparacion'), id: fc.constantFrom('r1', 'r2'), checked: fc.boolean() }),
          fc.record({ tipo: fc.constant('urgencia'), checked: fc.boolean() })
        ),
        async (faseInicial, accion) => {
          montarDom();
          stubFetch();

          try {
            const app = await cargarApp();
            const { setEstado } = await importarState();
            vi.unstubAllGlobals();

            const panel   = document.getElementById('resultado-cotizacion');
            const errorEl = document.getElementById('mensaje-error');

            // Forzar el escenario de partida: mostrar la salida correspondiente
            // y fijar la fase que la produce.
            if (faseInicial === 'resultado') {
              app.renderizarResultado(COTIZACION_DEMO);
            } else {
              app.mostrarError('Mensaje de error de prueba');
            }
            setEstado({ fase: faseInicial });

            // Precondición: la salida está efectivamente visible antes del cambio.
            expect(faseInicial === 'resultado' ? panel.hidden : errorEl.hidden).toBe(false);

            // Disparar el evento `change` correspondiente a la acción generada.
            if (accion.tipo === 'calzado') {
              seleccionarCalzado(accion.valor);
            } else if (accion.tipo === 'reparacion') {
              marcarReparacion(accion.id, accion.checked);
            } else {
              const chkUrgencia = document.getElementById('urgencia-checkbox');
              chkUrgencia.checked = accion.checked;
              cambiar(chkUrgencia);
            }

            // Invariante: sin `await` de por medio, ambos quedan ocultos en el mismo ciclo de evento.
            expect(panel.hidden).toBe(true);
            expect(errorEl.hidden).toBe(true);
          } finally {
            vi.unstubAllGlobals();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PBT-07: prevención de envíos duplicados en UI-E3', () => {
  it('el botón permanece deshabilitado durante "cotizando" y ni clics reales ni llamadas directas a handleCotizar generan un POST adicional', async () => {
    // Feature: cotizador-ui, Property 7: mientras la fase es cotizando, sincronizarBoton mantiene #btn-cotizar deshabilitado pese a una selección válida, y ningún clic adicional ni llamada a handleCotizar produce una nueva petición POST a /api/cotizaciones
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (n) => {
          montarDom();

          let resolverCotizacion;
          const cotizacionPendiente = new Promise((resolve) => { resolverCotizacion = resolve; });

          // Stub manual: catálogo resuelve normalmente, pero el POST de cotización
          // queda pendiente hasta que la propia prueba lo resuelva, de modo que la
          // fase permanezca en 'cotizando' mientras se disparan los clics extra.
          const mockFetch = vi.fn((url, opciones) => {
            const ruta = String(url);
            if (ruta.includes('/tipos-calzado'))    return Promise.resolve(respuesta(200, CALZADO_DEMO));
            if (ruta.includes('/tipos-reparacion')) return Promise.resolve(respuesta(200, REPARACIONES_DEMO));
            if (ruta.includes('/cotizaciones'))     return cotizacionPendiente;
            return Promise.reject(new TypeError(`URL no stubbeada: ${ruta}`));
          });
          vi.stubGlobal('fetch', mockFetch);

          const contarPost = () =>
            mockFetch.mock.calls.filter(
              ([url, opciones]) => String(url).includes('/cotizaciones') && opciones && opciones.method === 'POST'
            ).length;

          try {
            const app = await cargarApp();
            const { setEstado, getEstado } = await importarState();

            seleccionarCalzado('c1');
            marcarReparacion('r1', true);

            const btn = document.getElementById('btn-cotizar');
            expect(btn.disabled).toBe(false);

            // Invariante A: ni siquiera una selección válida habilita el botón durante 'cotizando'.
            setEstado({ fase: 'cotizando', tipoCalzadoId: 'c1', reparacionesIds: new Set(['r1']) });
            app.sincronizarBoton(getEstado());
            expect(btn.disabled).toBe(true);

            // Restaurar un estado realista (idle, selección válida) antes del clic real.
            setEstado({ fase: 'idle' });
            app.sincronizarBoton(getEstado());
            expect(btn.disabled).toBe(false);

            // Clic real: dispara handleCotizar(), que transiciona a 'cotizando' y
            // deja el POST en vuelo (no se resuelve).
            btn.click();
            await flush();

            expect(getEstado().fase).toBe('cotizando');
            expect(btn.disabled).toBe(true);

            const postsTrasElPrimerClic = contarPost();
            expect(postsTrasElPrimerClic).toBe(1);

            // Invariante B: N clics reales adicionales sobre el botón (deshabilitado
            // por la fase 'cotizando', por lo que jsdom ni siquiera despacha el evento)
            // no producen ningún POST nuevo.
            for (let i = 0; i < n; i++) {
              btn.click();
            }
            await flush();
            expect(contarPost()).toBe(postsTrasElPrimerClic);

            // Invariante B (refuerzo): N llamadas directas a handleCotizar(), que
            // ignoran el estado `disabled` del DOM, tampoco producen un POST nuevo
            // porque handleCotizar() se auto-protege comprobando fase === 'cotizando'.
            for (let i = 0; i < n; i++) {
              await app.handleCotizar();
            }
            expect(contarPost()).toBe(postsTrasElPrimerClic);
            expect(btn.disabled).toBe(true);

            // Liberar la petición pendiente para no dejar promesas colgando entre corridas.
            resolverCotizacion(respuesta(201, COTIZACION_DEMO));
            await flush();
          } finally {
            vi.unstubAllGlobals();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
