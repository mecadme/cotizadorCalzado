/**
 * state.test.js — Pruebas del estado en memoria (js/state.js).
 *
 * `state.js` es un singleton de módulo: cada prueba resetea los módulos
 * e importa una instancia fresca para aislar el estado entre pruebas.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('state.js', () => {
  let state;

  beforeEach(async () => {
    vi.resetModules();
    state = await import('../js/state.js');
  });

  it('el estado inicial tiene la forma completa esperada', () => {
    const estado = state.getEstado();

    expect(estado.catalogoCalzado).toEqual([]);
    expect(estado.catalogoReparaciones).toEqual([]);
    expect(estado.tipoCalzadoId).toBe('');
    expect(estado.reparacionesIds).toEqual(new Set());
    expect(estado.reparacionesIds instanceof Set).toBe(true);
    expect(estado.esUrgente).toBe(false);
    expect(estado.ultimaCotizacion).toBeNull();
    expect(estado.fase).toBe('idle');
  });

  it('setEstado notifica a todos los observadores registrados con el estado nuevo', () => {
    const observador1 = vi.fn();
    const observador2 = vi.fn();

    state.onCambio(observador1);
    state.onCambio(observador2);

    state.setEstado({ tipoCalzadoId: 'c1', fase: 'cotizando' });

    expect(observador1).toHaveBeenCalledTimes(1);
    expect(observador2).toHaveBeenCalledTimes(1);

    const estadoRecibido1 = observador1.mock.calls[0][0];
    const estadoRecibido2 = observador2.mock.calls[0][0];

    expect(estadoRecibido1.tipoCalzadoId).toBe('c1');
    expect(estadoRecibido1.fase).toBe('cotizando');
    expect(estadoRecibido2.tipoCalzadoId).toBe('c1');
    expect(estadoRecibido2.fase).toBe('cotizando');
  });

  it('getEstado() devuelve una copia: mutarla no afecta el estado interno', () => {
    const copia = state.getEstado();

    copia.tipoCalzadoId = 'mutado';
    copia.fase = 'error';

    const estadoInterno = state.getEstado();

    expect(estadoInterno.tipoCalzadoId).toBe('');
    expect(estadoInterno.fase).toBe('idle');
  });
});
