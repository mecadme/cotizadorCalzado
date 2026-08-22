/**
 * helpers.js — Arnés compartido para las pruebas de la UI del Cotizador.
 *
 * Reglas del arnés:
 *  - `montarDom()` carga el `index.html` real en jsdom (nada de HTML duplicado en los tests).
 *  - `stubFetch()` intercepta `fetch` por ruta; ninguna prueba toca la red.
 *  - `cargarApp()` resetea los módulos (state.js es un singleton) e importa `app.js`,
 *    que ejecuta `init()` en su nivel superior; devuelve el namespace del módulo.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { vi } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const RUTA_INDEX = resolve(__dirname, '../index.html');
export const RUTA_APP   = resolve(__dirname, '../js/app.js');
export const RUTA_API   = resolve(__dirname, '../js/api.js');
export const RUTA_STATE = resolve(__dirname, '../js/state.js');

export const URL_CALZADO      = 'http://localhost:8080/api/tipos-calzado';
export const URL_REPARACIONES = 'http://localhost:8080/api/tipos-reparacion';
export const URL_COTIZACIONES = 'http://localhost:8080/api/cotizaciones';

/** Catálogos de ejemplo por defecto. */
export const CALZADO_DEMO = [
  { id: 'c1', nombre: 'Zapato de vestir' },
  { id: 'c2', nombre: 'Bota' },
];

export const REPARACIONES_DEMO = [
  { id: 'r1', nombre: 'Cambio de suela', precioBase: 25.5 },
  { id: 'r2', nombre: 'Tintado', precioBase: 10 },
];

export const COTIZACION_DEMO = {
  subtotal: 35.5,
  recargoUrgencia: 0,
  total: 35.5,
  moneda: 'USD',
  tiempoEstimadoDias: 3,
};

/** Carga el `index.html` real dentro del documento de jsdom. */
export function montarDom() {
  const html = readFileSync(RUTA_INDEX, 'utf-8');
  document.documentElement.innerHTML = html
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<\/?html[^>]*>/gi, '');
  // El <script type="module"> del HTML no se ejecuta en jsdom: `cargarApp()` importa el módulo.
  return document;
}

/**
 * Construye una respuesta tipo `fetch`.
 * @param {number} status
 * @param {any} body objeto que se serializa como JSON (o `null` para body vacío)
 */
export function respuesta(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => {
      if (body === null || body === undefined) throw new SyntaxError('sin body');
      return body;
    },
    text: async () => (body === null || body === undefined ? '' : JSON.stringify(body)),
  };
}

/**
 * Instala un stub de `fetch` resuelto por ruta.
 * @param {{calzado?: any, reparaciones?: any, cotizacion?: any}} opciones
 *   Cada valor puede ser: un array/objeto (→ 200/201 con ese body),
 *   una respuesta creada con `respuesta()`, o un `Error` (→ fallo de red).
 * @returns {import('vitest').Mock} el mock de fetch instalado
 */
export function stubFetch({ calzado = CALZADO_DEMO, reparaciones = REPARACIONES_DEMO, cotizacion = COTIZACION_DEMO } = {}) {
  const resolver = (valor, statusOk) => {
    if (valor instanceof Error) return Promise.reject(valor);
    if (valor && typeof valor === 'object' && 'ok' in valor && 'status' in valor) return Promise.resolve(valor);
    return Promise.resolve(respuesta(statusOk, valor));
  };

  const mock = vi.fn((url, opciones) => {
    const ruta = String(url);
    if (ruta.includes('/tipos-calzado'))     return resolver(calzado, 200);
    if (ruta.includes('/tipos-reparacion'))  return resolver(reparaciones, 200);
    if (ruta.includes('/cotizaciones'))      return resolver(cotizacion, 201);
    return Promise.reject(new TypeError(`URL no stubbeada: ${ruta}`));
  });

  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Cede el control al event loop para que se resuelvan las promesas pendientes. */
export function flush(vueltas = 4) {
  let p = Promise.resolve();
  for (let i = 0; i < vueltas; i++) p = p.then(() => new Promise((r) => setTimeout(r, 0)));
  return p;
}

/**
 * Importa `app.js` con los módulos reseteados (state.js es un singleton por módulo)
 * y espera a que termine la carga del catálogo lanzada por `init()`.
 * @returns {Promise<object>} namespace del módulo `app.js`
 */
export async function cargarApp() {
  vi.resetModules();
  const app = await import('../js/app.js');
  await flush();
  return app;
}

/** Importa `state.js` fresco, compartido con el `app.js` cargado en la misma vuelta. */
export async function importarState() {
  return import('../js/state.js');
}

/** Dispara un evento `change` (bubbles) sobre un elemento. */
export function cambiar(el) {
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}

/** Selecciona un tipo de calzado por value y notifica el cambio. */
export function seleccionarCalzado(id) {
  const select = document.getElementById('tipo-calzado-select');
  select.value = id;
  cambiar(select);
  return select;
}

/** Marca/desmarca un checkbox de reparación por id de catálogo. */
export function marcarReparacion(id, checked = true) {
  const chk = document.getElementById(`rep-${id}`);
  chk.checked = checked;
  cambiar(chk);
  return chk;
}
