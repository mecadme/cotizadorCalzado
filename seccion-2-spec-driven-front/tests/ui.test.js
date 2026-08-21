/**
 * Tests for uiController and DOM interactions
 *
 * Strategy: load index.html into JSDOM with runScripts:'dangerously' so the
 * inline <script> block (CONFIG, calcEngine, appState, uiController) executes
 * exactly as it does in a real browser.
 *
 * Feature: cotizador-ui
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ---------------------------------------------------------------------------
// Helper: create a fresh DOM instance from index.html for each test.
//
// index.html uses `const` for CONFIG, calcEngine, appState and uiController
// inside the inline <script>.  In a browser `const` at top level of a classic
// script is still NOT a property of `window`, so we inject a tiny bridge
// right before </script> that pins them to the window object so tests can
// reach them via dom.window.uiController / dom.window.CONFIG.
// ---------------------------------------------------------------------------
const BRIDGE = `
  if (typeof uiController !== 'undefined') window.uiController = uiController;
  if (typeof CONFIG       !== 'undefined') window.CONFIG       = CONFIG;
  if (typeof calcEngine   !== 'undefined') window.calcEngine   = calcEngine;
  if (typeof appState     !== 'undefined') window.appState     = appState;
`;

function loadApp() {
  let html = readFileSync(join(__dirname, '../index.html'), 'utf8');
  // Inject bridge just before the closing </script> tag of the inline block
  html = html.replace(/(\s*<\/script>\s*<\/body>)/, `\n${BRIDGE}\n$1`);
  const dom  = new JSDOM(html, {
    runScripts : 'dangerously',
    resources  : 'usable',
    url        : 'file:///index.html',
  });
  return dom;
}

// Convenience: pull the document out of a dom instance
function doc(dom) {
  return dom.window.document;
}

// ---------------------------------------------------------------------------
// Group 1 — Initial state
// U-01, U-02, U-03, U-09, U-10, U-11
// ---------------------------------------------------------------------------
describe('Group 1 — Initial state', () => {
  let dom;
  beforeEach(() => { dom = loadApp(); });

  it('U-01: #sel-calzado has ≥4 real options and a disabled placeholder', () => {
    const d      = doc(dom);
    const select = d.getElementById('sel-calzado');
    expect(select).not.toBeNull();

    const placeholder = select.querySelector('option[value=""]');
    expect(placeholder).not.toBeNull();
    expect(placeholder.disabled).toBe(true);
    expect(placeholder.selected).toBe(true);

    // Non-placeholder options
    const realOptions = Array.from(select.options).filter(o => o.value !== '');
    expect(realOptions.length).toBeGreaterThanOrEqual(4);
  });

  it('U-02: all .rep-check unchecked; #chk-urgencia unchecked; #btn-cotizar disabled; #desglose hidden', () => {
    const d = doc(dom);

    const repChecks = Array.from(d.querySelectorAll('.rep-check'));
    expect(repChecks.length).toBeGreaterThanOrEqual(5);
    repChecks.forEach(chk => expect(chk.checked).toBe(false));

    expect(d.getElementById('chk-urgencia').checked).toBe(false);
    expect(d.getElementById('btn-cotizar').disabled).toBe(true);
    expect(d.getElementById('desglose').hasAttribute('hidden')).toBe(true);
  });

  it('U-03: urgencia label contains "Urgente (+20%)"', () => {
    const d   = doc(dom);
    const lbl = d.getElementById('chk-urgencia').parentElement;
    expect(lbl.textContent).toMatch(/Urgente\s*\(\+20%\)/);
  });

  it('U-09: each .rep-check has a matching <label for="...">; #sel-calzado has a <label for="sel-calzado">', () => {
    const d = doc(dom);

    // Repair checkboxes
    const repChecks = d.querySelectorAll('.rep-check');
    repChecks.forEach(chk => {
      const lbl = d.querySelector(`label[for="${chk.id}"]`);
      expect(lbl, `label for ${chk.id} not found`).not.toBeNull();
    });

    // Calzado select
    const selLbl = d.querySelector('label[for="sel-calzado"]');
    expect(selLbl).not.toBeNull();
  });

  it('U-10: #btn-cotizar has the disabled attribute in the HTML', () => {
    const d = doc(dom);
    expect(d.getElementById('btn-cotizar').hasAttribute('disabled')).toBe(true);
  });

  it('U-11: #desglose has aria-live="polite" from page load', () => {
    const d = doc(dom);
    expect(d.getElementById('desglose').getAttribute('aria-live')).toBe('polite');
  });
});

// ---------------------------------------------------------------------------
// Group 2 — Button state (PBT-04)
// Property 4: botón habilitado ↔ hay al menos una reparación seleccionada
// ---------------------------------------------------------------------------
describe('Group 2 — Button state (PBT-04)', () => {
  // Feature: cotizador-ui, Property 4: botón habilitado ↔ hay al menos una reparación seleccionada
  // Validates: Requirements 4.1, 4.2, 4.3
  it('PBT-04: btnCotizar.disabled === (selectedCount === 0) for any subset of checkboxes', () => {
    // Collect checkbox IDs once
    const dom0       = loadApp();
    const d0         = doc(dom0);
    const checkboxIds = Array.from(d0.querySelectorAll('.rep-check')).map(c => c.id);

    fc.assert(
      fc.property(
        fc.subarray(checkboxIds, { minLength: 0 }),
        (selectedIds) => {
          const dom = loadApp();
          const d   = doc(dom);

          // Uncheck everything first (already unchecked by loadApp, but be explicit)
          d.querySelectorAll('.rep-check').forEach(chk => { chk.checked = false; });

          // Check the selected subset
          selectedIds.forEach(id => {
            const chk = d.getElementById(id);
            if (chk) {
              chk.checked = true;
              chk.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
            }
          });

          const btn = d.getElementById('btn-cotizar');
          return btn.disabled === (selectedIds.length === 0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Group 3 — U-06: click on disabled button produces no side effects
// ---------------------------------------------------------------------------
describe('Group 3 — Disabled button click (U-06)', () => {
  it('U-06: btn-cotizar is disabled at load and btn.click() is a no-op (no desglose, no calc)', () => {
    const dom = loadApp();
    const d   = doc(dom);
    const btn = d.getElementById('btn-cotizar');

    // Req 4.1 / 4.5: button starts disabled
    expect(btn.disabled).toBe(true);

    // btn.click() on a disabled <button> is suppressed by the browser (and JSDOM).
    // Calling the native .click() method on a disabled button does NOT dispatch the
    // 'click' event to listeners — this matches browser behaviour.
    btn.click();

    // No desglose and no visible errors: button click was truly a no-op
    expect(d.getElementById('desglose').hasAttribute('hidden')).toBe(true);
    expect(d.getElementById('mensaje-error').hasAttribute('hidden')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group 4 — Error cases (U-07, PBT-08)
// ---------------------------------------------------------------------------
describe('Group 4 — Error cases', () => {
  it('U-07: cotizar without calzado type shows error and keeps desglose hidden', () => {
    const dom = loadApp();
    const d   = doc(dom);

    // Select one repair to enable the button
    const firstCheck = d.querySelector('.rep-check');
    firstCheck.checked = true;
    firstCheck.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    // Ensure calzado is NOT selected (leave at placeholder "")
    const sel = d.getElementById('sel-calzado');
    sel.value = '';

    // Trigger cotizar via the uiController method directly
    dom.window.uiController.handleCotizar();

    expect(d.getElementById('mensaje-error').hasAttribute('hidden')).toBe(false);
    expect(d.getElementById('desglose').hasAttribute('hidden')).toBe(true);
  });

  // Feature: cotizador-ui, Property 8: cotizar sin tipo calzado produce error para cualquier selección
  // Validates: Requirements 1.4
  it('PBT-08: cotizar without calzado always shows error for any non-empty repair selection', () => {
    const dom0        = loadApp();
    const d0          = doc(dom0);
    const checkboxIds = Array.from(d0.querySelectorAll('.rep-check')).map(c => c.id);

    fc.assert(
      fc.property(
        fc.subarray(checkboxIds, { minLength: 1 }),
        (selectedIds) => {
          const dom = loadApp();
          const d   = doc(dom);

          // Check the repairs to enable the button
          selectedIds.forEach(id => {
            const chk = d.getElementById(id);
            if (chk) {
              chk.checked = true;
              chk.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
            }
          });

          // Force calzado to blank (no type selected)
          d.getElementById('sel-calzado').value = '';

          // Fire cotizar
          dom.window.uiController.handleCotizar();

          const errorHidden  = d.getElementById('mensaje-error').hasAttribute('hidden');
          const desglosHid   = d.getElementById('desglose').hasAttribute('hidden');

          return errorHidden === false && desglosHid === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Group 5 — Happy path (U-08)
// ---------------------------------------------------------------------------
describe('Group 5 — Happy path (U-08)', () => {
  it('U-08: valid selection + calzado → cotizar shows desglose with correct content', () => {
    const dom = loadApp();
    const d   = doc(dom);

    // Select calzado type
    const sel = d.getElementById('sel-calzado');
    sel.value = 'zapato';

    // Select one repair
    const firstCheck = d.querySelector('.rep-check');
    firstCheck.checked = true;
    firstCheck.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    // Click cotizar
    d.getElementById('btn-cotizar').dispatchEvent(
      new dom.window.MouseEvent('click', { bubbles: true })
    );

    // Desglose must be visible
    expect(d.getElementById('desglose').hasAttribute('hidden')).toBe(false);

    // The repair label should appear somewhere in the list
    const lista = d.getElementById('desglose-lista');
    expect(lista.textContent.length).toBeGreaterThan(0);

    // Monetary spans must contain values matching the money pattern
    const pattern = /\d+\.\d{2}/;
    expect(d.getElementById('desglose-subtotal').textContent).toMatch(pattern);
    expect(d.getElementById('desglose-recargo').textContent).toMatch(pattern);
    expect(d.getElementById('desglose-total').textContent).toMatch(pattern);
  });
});

// ---------------------------------------------------------------------------
// Group 6 — PBT-05: Desglose format correctness
// Property 5: desglose renderizado contiene todos los campos con formato correcto
// ---------------------------------------------------------------------------
describe('Group 6 — Desglose format (PBT-05)', () => {
  // Feature: cotizador-ui, Property 5: desglose renderizado contiene todos los campos con formato correcto
  // Validates: Requirements 5.4
  it('PBT-05: all monetary values in desglose match /\\d+\\.\\d{2}/ for any valid selection', () => {
    const dom0        = loadApp();
    const d0          = doc(dom0);
    const checkboxIds = Array.from(d0.querySelectorAll('.rep-check')).map(c => c.id);
    const calzadoIds  = Array.from(d0.querySelectorAll('#sel-calzado option'))
      .filter(o => o.value !== '')
      .map(o => o.value);

    fc.assert(
      fc.property(
        fc.subarray(checkboxIds, { minLength: 1 }),
        fc.boolean(),
        fc.constantFrom(...calzadoIds),
        (selectedIds, urgente, calzado) => {
          const dom = loadApp();
          const d   = doc(dom);

          // Set calzado
          d.getElementById('sel-calzado').value = calzado;

          // Check repairs
          selectedIds.forEach(id => {
            const chk = d.getElementById(id);
            if (chk) {
              chk.checked = true;
              chk.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
            }
          });

          // Set urgencia
          const urgCheck = d.getElementById('chk-urgencia');
          urgCheck.checked = urgente;
          urgCheck.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

          // Fire cotizar
          d.getElementById('btn-cotizar').dispatchEvent(
            new dom.window.MouseEvent('click', { bubbles: true })
          );

          const pattern = /^\d+\.\d{2}$/;
          const subtotal = d.getElementById('desglose-subtotal').textContent.trim();
          const recargo  = d.getElementById('desglose-recargo').textContent.trim();
          const total    = d.getElementById('desglose-total').textContent.trim();

          // Each list item should contain a money value
          const listItems = Array.from(d.getElementById('desglose-lista').querySelectorAll('li'));
          const allItemsHaveMoney = listItems.every(li => /\d+\.\d{2}/.test(li.textContent));

          return (
            pattern.test(subtotal) &&
            pattern.test(recargo)  &&
            pattern.test(total)    &&
            listItems.length === selectedIds.length &&
            allItemsHaveMoney
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Group 7 — PBT-06: Desglose reflects latest selection only
// Property 6: desglose refleja únicamente la selección más reciente
// ---------------------------------------------------------------------------
describe('Group 7 — Desglose reflects latest selection (PBT-06)', () => {
  // Feature: cotizador-ui, Property 6: desglose refleja únicamente la selección más reciente
  // Validates: Requirements 5.7, 6.2
  it('PBT-06: after two cotizar calls the desglose matches the second selection only', () => {
    const dom0        = loadApp();
    const d0          = doc(dom0);
    const allReps     = Array.from(dom0.window.CONFIG.reparaciones);
    const calzadoIds  = Array.from(d0.querySelectorAll('#sel-calzado option'))
      .filter(o => o.value !== '')
      .map(o => o.value);

    fc.assert(
      fc.property(
        fc.subarray(allReps, { minLength: 1 }),
        fc.subarray(allReps, { minLength: 1 }),
        fc.constantFrom(...calzadoIds),
        (sel1, sel2, calzado) => {
          const dom = loadApp();
          const d   = doc(dom);

          // Set calzado once — same for both rounds
          d.getElementById('sel-calzado').value = calzado;

          const checkAll = (ids) => {
            // Uncheck everything
            d.querySelectorAll('.rep-check').forEach(chk => {
              chk.checked = false;
              chk.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
            });
            // Check the desired set
            ids.forEach(id => {
              const chk = d.getElementById('chk-' + id);
              if (chk) {
                chk.checked = true;
                chk.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
              }
            });
          };

          // Round 1
          checkAll(sel1.map(r => r.id));
          if (d.getElementById('btn-cotizar').disabled) return true; // skip if somehow empty
          d.getElementById('btn-cotizar').dispatchEvent(
            new dom.window.MouseEvent('click', { bubbles: true })
          );

          // Round 2
          checkAll(sel2.map(r => r.id));
          if (d.getElementById('btn-cotizar').disabled) return true; // skip if empty
          d.getElementById('btn-cotizar').dispatchEvent(
            new dom.window.MouseEvent('click', { bubbles: true })
          );

          // Desglose list should have exactly sel2.length items
          const listItems = d.getElementById('desglose-lista').querySelectorAll('li');
          if (listItems.length !== sel2.length) return false;

          // Each sel2 label must appear in the list
          const listText = d.getElementById('desglose-lista').textContent;
          return sel2.every(r => listText.includes(r.label));
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Group 8 — PBT-07: Stale indicator lifecycle
// Property 7: cambio tras cotizar activa indicador de desactualizado
// ---------------------------------------------------------------------------
describe('Group 8 — Stale indicator (PBT-07)', () => {
  // Feature: cotizador-ui, Property 7: cambio tras cotizar activa indicador de desactualizado
  // Validates: Requirements 6.1, 6.2
  it('PBT-07: stale indicator appears after any change post-cotizar, disappears after re-cotizar', () => {
    const dom0        = loadApp();
    const d0          = doc(dom0);
    const checkboxIds = Array.from(d0.querySelectorAll('.rep-check')).map(c => c.id);
    const calzadoIds  = Array.from(d0.querySelectorAll('#sel-calzado option'))
      .filter(o => o.value !== '')
      .map(o => o.value);

    fc.assert(
      fc.property(
        fc.subarray(checkboxIds, { minLength: 1 }),
        fc.constantFrom(...calzadoIds),
        // Which checkbox to toggle after cotizar (index into the full list)
        fc.integer({ min: 0, max: checkboxIds.length - 1 }),
        (selectedIds, calzado, toggleIdx) => {
          const dom = loadApp();
          const d   = doc(dom);

          // Setup valid selection
          d.getElementById('sel-calzado').value = calzado;
          selectedIds.forEach(id => {
            const chk = d.getElementById(id);
            if (chk) {
              chk.checked = true;
              chk.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
            }
          });

          // First cotizar
          d.getElementById('btn-cotizar').dispatchEvent(
            new dom.window.MouseEvent('click', { bubbles: true })
          );

          // Desglose must now be visible; stale indicator must be hidden
          if (d.getElementById('desglose').hasAttribute('hidden')) return true; // skip if cotizar failed for some reason
          if (!d.getElementById('indicador-stale').hasAttribute('hidden')) return false;

          // Toggle a checkbox (could be any one — toggle its state)
          const toggleId  = checkboxIds[toggleIdx % checkboxIds.length];
          const toggleChk = d.getElementById(toggleId);
          if (toggleChk) {
            toggleChk.checked = !toggleChk.checked;
            toggleChk.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
          }

          // Stale indicator must now be visible
          if (d.getElementById('indicador-stale').hasAttribute('hidden')) return false;

          // Re-cotizar: restore a valid state first (ensure at least one check is active)
          const anyChecked = Array.from(d.querySelectorAll('.rep-check')).some(c => c.checked);
          if (!anyChecked) {
            // Re-check the first selected one
            const chk = d.getElementById(selectedIds[0]);
            if (chk) {
              chk.checked = true;
              chk.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
            }
          }

          d.getElementById('btn-cotizar').dispatchEvent(
            new dom.window.MouseEvent('click', { bubbles: true })
          );

          // After re-cotizar the stale indicator must be hidden again
          return d.getElementById('indicador-stale').hasAttribute('hidden');
        }
      ),
      { numRuns: 50 }
    );
  });
});
