/**
 * Tests for calcEngine module
 * Unit tests + Property-Based Tests (PBT) using fast-check
 *
 * Feature: cotizador-ui
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcEngine } from '../src/calcEngine.js';
import { CONFIG } from '../src/config.js';

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

describe('calcEngine.calcularSubtotal — unit tests', () => {
  it('returns 0 when seleccionados Set is empty', () => {
    expect(calcEngine.calcularSubtotal(CONFIG.reparaciones, new Set())).toBe(0);
  });

  it('returns 0 when seleccionados is null', () => {
    expect(calcEngine.calcularSubtotal(CONFIG.reparaciones, null)).toBe(0);
  });

  it('returns correct price for a single selected item', () => {
    // suela = 250.00
    const result = calcEngine.calcularSubtotal(CONFIG.reparaciones, new Set(['suela']));
    expect(result).toBe(250.00);
  });

  it('returns correct sum for multiple selected items', () => {
    // suela (250) + costura (120) + lustrado (80) = 450
    const result = calcEngine.calcularSubtotal(
      CONFIG.reparaciones,
      new Set(['suela', 'costura', 'lustrado'])
    );
    expect(result).toBe(450.00);
  });

  it('ignores IDs that do not exist in the catalogue', () => {
    const result = calcEngine.calcularSubtotal(
      CONFIG.reparaciones,
      new Set(['suela', 'no-existe'])
    );
    expect(result).toBe(250.00);
  });
});

describe('calcEngine.calcularTotal — unit tests', () => {
  it('returns subtotal unchanged when urgente=false', () => {
    expect(calcEngine.calcularTotal(300, false, 20)).toBe(300);
  });

  it('returns subtotal unchanged when urgente=false regardless of recargoPorc', () => {
    expect(calcEngine.calcularTotal(500, false, 50)).toBe(500);
  });

  it('applies formula subtotal * (1 + recargoPorc/100) when urgente=true', () => {
    // 300 * (1 + 20/100) = 300 * 1.2 = 360
    expect(calcEngine.calcularTotal(300, true, 20)).toBeCloseTo(360, 5);
  });

  it('applies formula correctly with different recargoPorc values', () => {
    // 200 * (1 + 50/100) = 200 * 1.5 = 300
    expect(calcEngine.calcularTotal(200, true, 50)).toBeCloseTo(300, 5);
  });

  it('returns 0 when subtotal is 0 and urgente=true', () => {
    expect(calcEngine.calcularTotal(0, true, 20)).toBe(0);
  });
});

describe('calcEngine.formatearMoneda — unit tests', () => {
  it('formats an integer with exactly 2 decimal places', () => {
    expect(calcEngine.formatearMoneda(250)).toBe('250.00');
  });

  it('returns "0.00" for 0', () => {
    expect(calcEngine.formatearMoneda(0)).toBe('0.00');
  });

  it('rounds correctly for values with more than 2 decimal places', () => {
    // Note: 1.005 has an IEEE 754 representation slightly below 1.005,
    // so toFixed(2) produces "1.00". Use a value that rounds unambiguously.
    expect(calcEngine.formatearMoneda(1.006)).toBe('1.01');
  });

  it('formats a number that already has 2 decimal places correctly', () => {
    expect(calcEngine.formatearMoneda(120.50)).toBe('120.50');
  });

  it('returns a string type', () => {
    expect(typeof calcEngine.formatearMoneda(100)).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

describe('PBT-01 — Property 1: Subtotal es la suma exacta de los precios seleccionados', () => {
  // Feature: cotizador-ui, Property 1: Subtotal es la suma exacta de los precios seleccionados
  // Validates: Requirements 2.2, 2.3, 2.4, 5.1
  it('calcularSubtotal equals the manual sum of selected prices for any non-empty subset', () => {
    fc.assert(
      fc.property(
        fc.subarray(CONFIG.reparaciones, { minLength: 1 }),
        (sel) => {
          const expectedSum = sel.reduce((a, r) => a + r.precio, 0);
          const result = calcEngine.calcularSubtotal(
            CONFIG.reparaciones,
            new Set(sel.map((r) => r.id))
          );
          return result === expectedSum;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PBT-02 — Property 2: Total con urgencia aplica el factor correctamente', () => {
  // Feature: cotizador-ui, Property 2: Total con urgencia aplica el factor correctamente
  // Validates: Requirements 3.2, 5.2
  it('calcularTotal(subtotal, true, recargo) ≈ subtotal * (1 + recargo/100) within 0.001', () => {
    fc.assert(
      fc.property(
        fc.subarray(CONFIG.reparaciones, { minLength: 1 }),
        fc.integer({ min: 1, max: 100 }),
        (sel, recargo) => {
          const subtotal = calcEngine.calcularSubtotal(
            CONFIG.reparaciones,
            new Set(sel.map((r) => r.id))
          );
          const expected = subtotal * (1 + recargo / 100);
          const result = calcEngine.calcularTotal(subtotal, true, recargo);
          return Math.abs(result - expected) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PBT-03 — Property 3: Total sin urgencia es igual al Subtotal', () => {
  // Feature: cotizador-ui, Property 3: Total sin urgencia es igual al Subtotal
  // Validates: Requirements 3.3, 5.3
  it('calcularTotal(subtotal, false, recargo) === subtotal for any non-empty subset and any recargo', () => {
    fc.assert(
      fc.property(
        fc.subarray(CONFIG.reparaciones, { minLength: 1 }),
        fc.integer({ min: 1, max: 100 }),
        (sel, recargo) => {
          const subtotal = calcEngine.calcularSubtotal(
            CONFIG.reparaciones,
            new Set(sel.map((r) => r.id))
          );
          const result = calcEngine.calcularTotal(subtotal, false, recargo);
          return result === subtotal;
        }
      ),
      { numRuns: 100 }
    );
  });
});
