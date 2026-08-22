/**
 * api.js — Adaptador HTTP
 *
 * Único módulo que conoce las URLs del backend.
 * Traduce respuestas HTTP a objetos JavaScript simples y encapsula
 * todos los errores como ApiError para que app.js no interprete HTTP.
 *
 * Dependencias: ninguna (no importa módulos del proyecto, no referencia DOM).
 */

// Ruta relativa: el navegador construye la URL desde el origen actual.
// En Docker, Nginx intercepta /api/* y lo reenvía al backend en la red interna.
// En desarrollo local (fuera de Docker), apunta a localhost:8080 si se cambia
// a 'http://localhost:8080/api'.
const API_BASE_URL = '/api';

// ── Error estructurado ────────────────────────────────────────────────────────

/**
 * Error estructurado para errores de la API.
 * @property {number} statusCode  - 0 para error de red, 400/5xx para errores del backend
 * @property {string} detail      - Mensaje legible; campo `detail` del ProblemDetails para 400
 * @property {string} [type]      - URI RFC 7807 (solo presente en errores 400)
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} detail
   * @param {string} [type]
   */
  constructor(statusCode, detail, type) {
    super(detail);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.detail = detail;
    if (type !== undefined) {
      this.type = type;
    }
  }
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Devuelve un mensaje genérico legible según el código HTTP.
 * @param {number} status
 * @returns {string}
 */
function mensajeGenericoSegunStatus(status) {
  if (status >= 500) {
    return 'Error en el servidor. Intenta de nuevo más tarde.';
  }
  return `Error inesperado (código ${status}).`;
}

/**
 * Ejecuta un fetch y encapsula cualquier error en ApiError.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 * @throws {ApiError}
 */
async function fetchJson(url, options) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));

      // Errores 400: se propaga el campo `detail` del ProblemDetails (RFC 7807)
      if (response.status === 400) {
        throw new ApiError(
          400,
          body.detail ?? 'La solicitud contiene datos inválidos.',
          body.type
        );
      }

      // Cualquier otro código no 2xx (5xx u otro)
      throw new ApiError(
        response.status,
        body.detail ?? mensajeGenericoSegunStatus(response.status)
      );
    }

    return await response.json();
  } catch (err) {
    // Re-lanzar ApiErrors sin envolver
    if (err instanceof ApiError) throw err;

    // Error de red: fetch rechazado, sin respuesta del servidor
    throw new ApiError(0, 'No fue posible completar la solicitud');
  }
}

// ── Funciones exportadas ──────────────────────────────────────────────────────

/**
 * Obtiene el catálogo de tipos de calzado.
 * @returns {Promise<TipoCalzado[]>}
 * @throws {ApiError}
 */
export async function obtenerTiposCalzado() {
  return fetchJson(`${API_BASE_URL}/tipos-calzado`);
}

/**
 * Obtiene el catálogo de tipos de reparación.
 * @returns {Promise<TipoReparacion[]>}
 * @throws {ApiError}
 */
export async function obtenerTiposReparacion() {
  return fetchJson(`${API_BASE_URL}/tipos-reparacion`);
}

/**
 * Envía la solicitud de cotización al backend.
 *
 * Serialización: el campo `esUrgente` del estado JS se traduce al campo
 * `urgente` que exige el contrato OpenAPI en el body del POST.
 *
 * @param {{ tipoCalzadoId: string, tipoReparacionIds: string[], esUrgente: boolean }} request
 * @returns {Promise<CotizacionResponse>}
 * @throws {ApiError} statusCode=400, detail=ProblemDetails.detail si el backend responde 400
 * @throws {ApiError} statusCode=0 si hay error de red sin respuesta del servidor
 * @throws {ApiError} statusCode=5xx si el backend responde con error de servidor
 */
export async function generarCotizacion(request) {
  const body = {
    tipoCalzadoId:     request.tipoCalzadoId,
    tipoReparacionIds: request.tipoReparacionIds,
    urgente:           request.esUrgente,   // esUrgente → urgente (contrato OpenAPI)
  };

  return fetchJson(`${API_BASE_URL}/cotizaciones`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}
