/**
 * smoke_check.mjs — Smoke tests S-01, S-02, S-03, S-04
 *
 * Runs via: node tests/smoke_check.mjs  (from project root)
 *
 * Requirements: 7.1 (single file), 7.2 (works via file://), 7.4 (loads fast)
 * Verifies: S-01, S-02, S-03, S-04
 *
 * Note: JSDOM runs inline <script> in a sandboxed VM context; const/let
 * declarations inside that script are local to the VM context and are NOT
 * directly visible as properties of the window object from Node.js.
 * We use dom.window.eval() to reach into the VM scope and inspect them.
 */

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const htmlPath = join(projectRoot, 'index.html');

// ─── Read the file ────────────────────────────────────────────────────────────
const html = readFileSync(htmlPath, 'utf-8');

// ─── Assertion helper ─────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
    errors.push(message);
  }
}

// ─── Load index.html with JSDOM ───────────────────────────────────────────────
const consoleErrors = [];
const networkRequests = [];

// Use a file:// URL so the app behaves as it would when opened directly
const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: fileUrl,
  beforeParse(window) {
    // S-04: intercept any network requests
    window.fetch = function(...args) {
      networkRequests.push(String(args[0]));
      return Promise.reject(new Error('fetch blocked by smoke check'));
    };

    const OrigXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = class extends OrigXHR {
      open(method, url, ...rest) {
        networkRequests.push(String(url));
        super.open(method, url, ...rest);
      }
    };

    // S-01: capture console errors (but not warnings)
    const origError = window.console.error.bind(window.console);
    window.console.error = function(...args) {
      consoleErrors.push(args.map(String).join(' '));
      origError(...args);
    };
  },
});

// Helper: eval an expression inside the JSDOM window scope
function winEval(expr) {
  return dom.window.eval(expr);
}

const { document } = dom.window;

console.log('\n── Smoke Check ─────────────────────────────────────────────────────────────\n');

// ─── S-01: index.html loads without console errors ───────────────────────────
console.log('S-01 — index.html carga sin errores de consola:');
assert(consoleErrors.length === 0,
  `No hay errores de consola al cargar (encontrados: ${consoleErrors.length}${
    consoleErrors.length ? ': ' + consoleErrors[0] : ''
  })`);

// ─── Global objects must exist (checked via eval into the VM scope) ───────────
console.log('\nGlobales requeridos accesibles en el scope del script:');
const configType      = winEval('typeof CONFIG');
const calcEngineType  = winEval('typeof calcEngine');
const uiControllerType = winEval('typeof uiController');
const appStateType    = winEval('typeof appState');

assert(configType === 'object',    `CONFIG existe y es un objeto (typeof: ${configType})`);
assert(calcEngineType === 'object', `calcEngine existe y es un objeto (typeof: ${calcEngineType})`);
assert(uiControllerType === 'object', `uiController existe y es un objeto (typeof: ${uiControllerType})`);
assert(appStateType === 'object',   `appState existe y es un objeto (typeof: ${appStateType})`);

// Verify uiController.init was called (select should have ≥5 options after init)
const selectOptions = document.getElementById('sel-calzado')?.options?.length ?? 0;
assert(selectOptions >= 5, `uiController.init() fue invocado (sel-calzado tiene ${selectOptions} opciones; esperadas ≥5 con placeholder)`);

// ─── S-02: CONFIG.recargo_urgencia en rango [1,100] con valor 20 ─────────────
console.log('\nS-02 — CONFIG.recargo_urgencia:');
const recargo = winEval('CONFIG.recargo_urgencia');
assert(typeof recargo === 'number',     `recargo_urgencia es un número (${recargo})`);
assert(Number.isInteger(recargo),       `recargo_urgencia es entero (${recargo})`);
assert(recargo >= 1 && recargo <= 100, `recargo_urgencia está en rango [1, 100] (${recargo})`);
assert(recargo === 20,                  `recargo_urgencia tiene el valor predeterminado 20 (${recargo})`);

// ─── S-03: sección desglose oculta al cargar ─────────────────────────────────
console.log('\nS-03 — Estado inicial del DOM:');
const btnCotizar = document.getElementById('btn-cotizar');
const desglose   = document.getElementById('desglose');

assert(btnCotizar !== null,               'btn-cotizar existe en el DOM');
assert(btnCotizar?.disabled === true,     'btn-cotizar está deshabilitado al cargar');
assert(desglose !== null,                 'sección #desglose existe en el DOM');
assert(desglose?.hasAttribute('hidden'),  'sección #desglose está oculta (hidden) al cargar');

// ─── S-04: no se realizan peticiones de red ───────────────────────────────────
console.log('\nS-04 — Sin peticiones de red:');
assert(networkRequests.length === 0,
  `No se realizaron peticiones de red (detectadas: ${networkRequests.length}${
    networkRequests.length ? ': ' + networkRequests.join(', ') : ''
  })`);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────────────────────────────────');
if (failed === 0) {
  console.log(`\n✅  SMOKE CHECK PASSED  (${passed}/${passed + failed} assertions)\n`);
  process.exit(0);
} else {
  console.error(`\n❌  SMOKE CHECK FAILED  (${passed} passed, ${failed} failed)`);
  errors.forEach(e => console.error(`     • ${e}`));
  console.log('');
  process.exit(1);
}
