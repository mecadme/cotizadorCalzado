/**
 * api.test.js — Pruebas del adaptador HTTP (js/api.js).
 *
 * No requieren DOM: se importa directamente el módulo y se intercepta
 * `fetch` con `vi.stubGlobal`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, generarCotizacion } from '../js/api.js';

const URL_COTIZACIONES = 'http://localhost:8080/api/cotizaciones';

function respuestaOk(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function respuestaError(status, body) {
  return {
    ok: false,
    status,
    json: async () => body,
  };
}

describe('generarCotizacion — serialización del body', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-06: serializa esUrgente: true como "urgente": true', async () => {
    const mockFetch = vi.fn().mockResolvedValue(respuestaOk(201, {}));
    vi.stubGlobal('fetch', mockFetch);

    await generarCotizacion({
      tipoCalzadoId: 'c1',
      tipoReparacionIds: ['r1'],
      esUrgente: true,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urgente).toBe(true);
    expect(body).not.toHaveProperty('esUrgente');
  });

  it('U-07: serializa esUrgente: false como "urgente": false', async () => {
    const mockFetch = vi.fn().mockResolvedValue(respuestaOk(201, {}));
    vi.stubGlobal('fetch', mockFetch);

    await generarCotizacion({
      tipoCalzadoId: 'c1',
      tipoReparacionIds: ['r1'],
      esUrgente: false,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.urgente).toBe(false);
    expect(body).not.toHaveProperty('esUrgente');
  });

  it('envía el POST a la URL correcta con método y encabezados esperados', async () => {
    const mockFetch = vi.fn().mockResolvedValue(respuestaOk(201, {}));
    vi.stubGlobal('fetch', mockFetch);

    await generarCotizacion({
      tipoCalzadoId: 'c1',
      tipoReparacionIds: ['r1'],
      esUrgente: true,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opciones] = mockFetch.mock.calls[0];
    expect(url).toBe(URL_COTIZACIONES);
    expect(opciones.method).toBe('POST');
    expect(opciones.headers['Content-Type']).toBe('application/json');
  });
});

describe('generarCotizacion — manejo de errores', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('un 400 con ProblemDetails lanza ApiError con statusCode 400 y el detail del body', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      respuestaError(400, { detail: 'El tipo de calzado no existe.', type: 'https://ejemplo.com/errores/validacion' })
    );
    vi.stubGlobal('fetch', mockFetch);

    let error;
    try {
      await generarCotizacion({ tipoCalzadoId: 'x', tipoReparacionIds: [], esUrgente: false });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.detail).toBe('El tipo de calzado no existe.');
  });

  it('un fallo de red (fetch rechaza) lanza ApiError con statusCode 0', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', mockFetch);

    let error;
    try {
      await generarCotizacion({ tipoCalzadoId: 'c1', tipoReparacionIds: ['r1'], esUrgente: false });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(0);
  });

  it('un 500 lanza ApiError con statusCode 500', async () => {
    const mockFetch = vi.fn().mockResolvedValue(respuestaError(500, {}));
    vi.stubGlobal('fetch', mockFetch);

    let error;
    try {
      await generarCotizacion({ tipoCalzadoId: 'c1', tipoReparacionIds: ['r1'], esUrgente: false });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(500);
  });
});
