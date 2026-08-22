/**
 * smoke.test.js — Smoke tests S-01 a S-05 (tarea 10.1).
 *
 * Verifica que la aplicación arranca sin errores de consola, que la carga
 * del catálogo hace exactamente las dos peticiones GET esperadas, y que se
 * respeta la arquitectura de módulos declarada en el spec:
 *   - state.js no importa módulos propios ni toca DOM/fetch.
 *   - api.js no importa módulos propios ni toca DOM.
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  montarDom,
  stubFetch,
  cargarApp,
  RUTA_API,
  RUTA_STATE,
  URL_CALZADO,
  URL_REPARACIONES,
} from './helpers.js';

/**
 * Elimina comentarios de bloque (`/* ... *\/`) y de línea (`// ...`) de una
 * fuente JS, para evitar falsos positivos al analizar el texto con regex
 * (p. ej. menciones a `document`/`window`/`fetch` dentro de JSDoc).
 * @param {string} codigoFuente
 * @returns {string}
 */
function quitarComentarios(codigoFuente) {
  return codigoFuente
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

/**
 * Devuelve las rutas de módulo local (`./algo` o `../algo`) importadas
 * mediante sentencias `import ... from '...'` en el código fuente dado.
 * @param {string} codigoFuente
 * @returns {string[]}
 */
function importsLocales(codigoFuente) {
  const coincidencias = [...codigoFuente.matchAll(/import\s+[^;]*?\bfrom\s+['"](\.[^'"]*)['"]/g)];
  return coincidencias.map((m) => m[1]);
}

describe('S-01: index.html carga en jsdom sin errores de consola', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('no registra ningún console.error y expone los nodos clave del contrato', async () => {
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});

    montarDom();
    stubFetch();
    await cargarApp();

    expect(spyError).not.toHaveBeenCalled();

    const idsEsperados = [
      'indicador-carga-catalogo',
      'cotizador-form',
      'fs-calzado',
      'fs-reparaciones',
      'fs-urgencia',
      'tipo-calzado-select',
      'urgencia-checkbox',
      'btn-cotizar',
      'mensaje-error',
      'resultado-cotizacion',
      'resultado-subtotal',
      'resultado-recargo',
      'resultado-total',
      'resultado-tiempo',
    ];

    idsEsperados.forEach((id) => {
      expect(document.getElementById(id), `#${id} debería existir`).toBeTruthy();
    });
  });
});

describe('S-02: la carga inicial del catálogo hace exactamente 2 peticiones GET', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('llama a fetch exactamente 2 veces, una a URL_CALZADO y otra a URL_REPARACIONES, sin duplicados ni POST', async () => {
    montarDom();
    const mockFetch = stubFetch();
    await cargarApp();

    expect(mockFetch).toHaveBeenCalledTimes(2);

    const urlsLlamadas = mockFetch.mock.calls.map(([url]) => String(url));
    expect(urlsLlamadas.sort()).toEqual([URL_CALZADO, URL_REPARACIONES].sort());

    mockFetch.mock.calls.forEach(([, opciones]) => {
      expect(opciones?.method ?? 'GET').toBe('GET');
    });
  });
});

describe('S-03: js/state.js no importa módulos propios del proyecto', () => {
  it('no contiene ninguna sentencia import a ./api.js, ./app.js ni ningún otro módulo local', () => {
    const fuente = quitarComentarios(readFileSync(RUTA_STATE, 'utf-8'));
    const locales = importsLocales(fuente);
    expect(locales).toEqual([]);
  });
});

describe('S-04: js/api.js no importa módulos propios y no referencia document ni window', () => {
  it('no contiene sentencias import a módulos locales', () => {
    const fuente = quitarComentarios(readFileSync(RUTA_API, 'utf-8'));
    const locales = importsLocales(fuente);
    expect(locales).toEqual([]);
  });

  it('no referencia document ni window en el código (fuera de comentarios)', () => {
    const fuente = quitarComentarios(readFileSync(RUTA_API, 'utf-8'));
    expect(fuente).not.toMatch(/\bdocument\b/);
    expect(fuente).not.toMatch(/\bwindow\b/);
  });
});

describe('S-05: js/state.js no referencia document, window ni fetch', () => {
  it('no contiene esas referencias en el código (fuera de comentarios)', () => {
    const fuente = quitarComentarios(readFileSync(RUTA_STATE, 'utf-8'));
    expect(fuente).not.toMatch(/\bdocument\b/);
    expect(fuente).not.toMatch(/\bwindow\b/);
    expect(fuente).not.toMatch(/\bfetch\b/);
  });
});
